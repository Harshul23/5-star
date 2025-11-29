/**
 * Student Verification Processor
 * Main service that coordinates face matching, OCR, and auto-approval logic
 */

import { prisma } from "../db";
import { compareFaces, FaceMatchResult } from "./face-matching";
import { extractTextFromId, validateExtractedData, OcrResult } from "./ocr-extraction";
import { 
  getVerificationConfig, 
  isCollegeRecognized, 
  validateIdAppearance,
  VerificationConfig 
} from "./verification-config";
import { calculateTrustScore, getEarnedBadges } from "./trust-engine";

export interface VerificationProcessResult {
  verificationId: string;
  status: "AUTO_APPROVED" | "NEEDS_REVIEW" | "REJECTED";
  faceMatch: FaceMatchResult | null;
  ocr: OcrResult | null;
  autoApprovalReason?: string;
  reviewReasons?: string[];
  totalProcessingTimeMs: number;
}

export interface ProcessVerificationInput {
  userId: string;
  studentIdPhotoUrl: string;
  selfiePhotoUrl: string;
}

/**
 * Check if verification meets auto-approval criteria
 */
function checkAutoApproval(
  faceMatch: FaceMatchResult | null,
  ocr: OcrResult | null,
  config: VerificationConfig
): { approved: boolean; reason: string; issues: string[] } {
  const issues: string[] = [];
  
  // Check face matching
  if (config.enableFaceMatching) {
    if (!faceMatch || !faceMatch.success) {
      issues.push("Face matching failed");
    } else if (faceMatch.similarity < config.thresholds.autoApprovalFaceMatchMin) {
      issues.push(`Face match score (${faceMatch.similarity.toFixed(1)}%) below threshold (${config.thresholds.autoApprovalFaceMatchMin}%)`);
    }
  }
  
  // Check OCR
  if (config.enableOcr) {
    if (!ocr || !ocr.success) {
      issues.push("OCR extraction failed");
    } else {
      if (ocr.confidence < config.thresholds.autoApprovalOcrConfidenceMin) {
        issues.push(`OCR confidence (${ocr.confidence.toFixed(1)}%) below threshold (${config.thresholds.autoApprovalOcrConfidenceMin}%)`);
      }
      
      // Check college recognition
      if (!isCollegeRecognized(ocr.extractedCollege || "", config)) {
        issues.push("College not recognized in our database");
      }
      
      // Validate ID appearance
      const idValidation = validateIdAppearance(
        ocr.extractedText,
        ocr.extractedName,
        ocr.extractedCollege
      );
      
      if (!idValidation.isValid) {
        issues.push(...idValidation.issues);
      }
    }
  }
  
  // Auto-approve if no issues
  if (issues.length === 0 && config.enableAutoApproval) {
    return {
      approved: true,
      reason: "All verification criteria met",
      issues: [],
    };
  }
  
  return {
    approved: false,
    reason: "Verification requires manual review",
    issues,
  };
}

/**
 * Process a single verification request
 */
export async function processVerification(
  input: ProcessVerificationInput
): Promise<VerificationProcessResult> {
  const startTime = Date.now();
  const config = getVerificationConfig();
  
  // Create verification record
  const verification = await prisma.studentVerification.create({
    data: {
      userId: input.userId,
      studentIdPhotoUrl: input.studentIdPhotoUrl,
      selfiePhotoUrl: input.selfiePhotoUrl,
      status: "PROCESSING",
      processingStartedAt: new Date(),
    },
  });
  
  let faceMatch: FaceMatchResult | null = null;
  let ocr: OcrResult | null = null;
  
  try {
    // Run face matching and OCR in parallel for speed
    const [faceMatchResult, ocrResult] = await Promise.all([
      config.enableFaceMatching 
        ? compareFaces(input.studentIdPhotoUrl, input.selfiePhotoUrl)
        : null,
      config.enableOcr 
        ? extractTextFromId(input.studentIdPhotoUrl)
        : null,
    ]);
    
    faceMatch = faceMatchResult;
    ocr = ocrResult;
    
    // Get user for validation
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    });
    
    // Validate extracted data against user profile
    let dataValidation = { matches: true, issues: [] as string[] };
    if (ocr && user) {
      dataValidation = validateExtractedData(ocr, user.name, user.email);
    }
    
    // Check auto-approval criteria
    const autoApproval = checkAutoApproval(faceMatch, ocr, config);
    
    // Combine all issues
    const allIssues = [...autoApproval.issues, ...dataValidation.issues];
    
    // Determine final status
    let status: "AUTO_APPROVED" | "NEEDS_REVIEW" | "REJECTED" = "NEEDS_REVIEW";
    
    if (autoApproval.approved && dataValidation.matches) {
      status = "AUTO_APPROVED";
    } else if (allIssues.some(issue => 
      issue.includes("expired") || 
      issue.includes("fake") || 
      issue.includes("suspicious patterns")
    )) {
      // Auto-reject obvious issues
      status = "REJECTED";
    }
    
    const totalProcessingTimeMs = Date.now() - startTime;
    
    // Update verification record
    await prisma.studentVerification.update({
      where: { id: verification.id },
      data: {
        status,
        faceMatchScore: faceMatch?.similarity || null,
        faceMatchConfidence: faceMatch?.confidence || null,
        ocrExtractedName: ocr?.extractedName || null,
        ocrExtractedCollege: ocr?.extractedCollege || null,
        ocrExtractedStudentId: ocr?.extractedStudentId || null,
        ocrExtractedExpiry: ocr?.extractedExpiry || null,
        ocrConfidence: ocr?.confidence || null,
        ocrRawText: ocr?.extractedText || null,
        idLooksValid: validateIdAppearance(ocr?.extractedText || null, ocr?.extractedName || null, ocr?.extractedCollege || null).isValid,
        collegeRecognized: isCollegeRecognized(ocr?.extractedCollege || "", config),
        processingCompletedAt: new Date(),
        processingTimeMs: totalProcessingTimeMs,
        reviewNotes: allIssues.length > 0 ? allIssues.join("; ") : null,
        rejectionReason: status === "REJECTED" ? allIssues.join("; ") : null,
      },
    });
    
    // If auto-approved, update user status
    if (status === "AUTO_APPROVED") {
      const { score } = calculateTrustScore({
        verificationStatus: "VERIFIED",
        avgRating: 0,
        completedDeals: 0,
        cancellationRate: 0,
      });
      
      const badges = getEarnedBadges({
        completedDeals: 0,
        avgRating: 0,
        cancellationRate: 0,
      });
      
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          verificationStatus: "VERIFIED",
          studentIdPhoto: input.studentIdPhotoUrl,
          selfiePhoto: input.selfiePhotoUrl,
          college: ocr?.extractedCollege || undefined,
          trustScore: score,
          badges,
        },
      });
    } else if (status === "NEEDS_REVIEW") {
      // Mark user as pending
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          verificationStatus: "PENDING",
          studentIdPhoto: input.studentIdPhotoUrl,
          selfiePhoto: input.selfiePhotoUrl,
        },
      });
    } else if (status === "REJECTED") {
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          verificationStatus: "REJECTED",
          studentIdPhoto: input.studentIdPhotoUrl,
          selfiePhoto: input.selfiePhotoUrl,
        },
      });
    }
    
    return {
      verificationId: verification.id,
      status,
      faceMatch,
      ocr,
      autoApprovalReason: status === "AUTO_APPROVED" ? autoApproval.reason : undefined,
      reviewReasons: allIssues.length > 0 ? allIssues : undefined,
      totalProcessingTimeMs,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Update verification with error
    await prisma.studentVerification.update({
      where: { id: verification.id },
      data: {
        status: "NEEDS_REVIEW",
        errorMessage,
        processingCompletedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      },
    });
    
    // Update user status
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        verificationStatus: "PENDING",
        studentIdPhoto: input.studentIdPhotoUrl,
        selfiePhoto: input.selfiePhotoUrl,
      },
    });
    
    return {
      verificationId: verification.id,
      status: "NEEDS_REVIEW",
      faceMatch,
      ocr,
      reviewReasons: [`Processing error: ${errorMessage}`],
      totalProcessingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Get pending verifications for admin review
 */
export async function getPendingVerifications(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  
  const [verifications, total] = await Promise.all([
    prisma.studentVerification.findMany({
      where: { status: "NEEDS_REVIEW" },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.studentVerification.count({
      where: { status: "NEEDS_REVIEW" },
    }),
  ]);
  
  return {
    verifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Admin review action
 */
export async function reviewVerification(
  verificationId: string,
  adminUserId: string,
  action: "APPROVE" | "REJECT",
  notes?: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  const verification = await prisma.studentVerification.findUnique({
    where: { id: verificationId },
  });
  
  if (!verification) {
    return { success: false, message: "Verification not found" };
  }
  
  if (verification.status !== "NEEDS_REVIEW") {
    return { success: false, message: "Verification is not pending review" };
  }
  
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  
  // Update verification record
  await prisma.studentVerification.update({
    where: { id: verificationId },
    data: {
      status: newStatus,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
      reviewNotes: notes,
      rejectionReason: action === "REJECT" ? rejectionReason : null,
    },
  });
  
  // Update user status
  if (action === "APPROVE") {
    const { score } = calculateTrustScore({
      verificationStatus: "VERIFIED",
      avgRating: 0,
      completedDeals: 0,
      cancellationRate: 0,
    });
    
    const badges = getEarnedBadges({
      completedDeals: 0,
      avgRating: 0,
      cancellationRate: 0,
    });
    
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        verificationStatus: "VERIFIED",
        college: verification.ocrExtractedCollege || undefined,
        trustScore: score,
        badges,
      },
    });
    
    return { success: true, message: "User verified successfully" };
  } else {
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        verificationStatus: "REJECTED",
      },
    });
    
    return { success: true, message: "Verification rejected" };
  }
}

/**
 * Get verification status for a user
 */
export async function getVerificationStatus(userId: string) {
  const verification = await prisma.studentVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      verificationStatus: true,
      college: true,
    },
  });
  
  return {
    userStatus: user?.verificationStatus || "UNVERIFIED",
    latestVerification: verification,
  };
}

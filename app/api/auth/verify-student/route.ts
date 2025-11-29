import { NextRequest, NextResponse } from "next/server";
import { studentVerificationSchema, verificationStatusSchema } from "@/lib/validators";
import { processVerificationImmediate, queueVerification } from "@/lib/services/verification-worker";
import { getVerificationStatus } from "@/lib/services/verification-processor";
import { getVerificationConfig } from "@/lib/services/verification-config";

/**
 * POST /api/auth/verify-student
 * Submit student ID and selfie for verification
 * 
 * Request body:
 * - userId: string (UUID)
 * - studentIdPhotoUrl: string (URL to uploaded student ID image)
 * - selfiePhotoUrl: string (URL to uploaded selfie image)
 * - immediate: boolean (optional, default false - whether to process immediately)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = studentVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { userId, studentIdPhotoUrl, selfiePhotoUrl } = validationResult.data;
    const immediate = body.immediate === true;

    const config = getVerificationConfig();

    if (immediate) {
      // Process verification immediately (synchronous)
      // Expected processing time: 5-12 seconds
      const result = await processVerificationImmediate(
        userId,
        studentIdPhotoUrl,
        selfiePhotoUrl
      );

      return NextResponse.json({
        message: getStatusMessage(result.status),
        verification: {
          id: result.verificationId,
          status: result.status,
          processingTimeMs: result.totalProcessingTimeMs,
        },
        details: {
          faceMatch: result.faceMatch ? {
            similarity: result.faceMatch.similarity,
            confidence: result.faceMatch.confidence,
            success: result.faceMatch.success,
          } : null,
          ocr: result.ocr ? {
            extractedName: result.ocr.extractedName,
            extractedCollege: result.ocr.extractedCollege,
            confidence: result.ocr.confidence,
            success: result.ocr.success,
          } : null,
          autoApprovalReason: result.autoApprovalReason,
          reviewReasons: result.reviewReasons,
        },
        thresholds: {
          faceMatchMin: config.thresholds.autoApprovalFaceMatchMin,
          ocrConfidenceMin: config.thresholds.autoApprovalOcrConfidenceMin,
        },
      });
    } else {
      // Queue verification for background processing
      const { verificationId, position } = await queueVerification(
        userId,
        studentIdPhotoUrl,
        selfiePhotoUrl
      );

      return NextResponse.json({
        message: "Verification submitted successfully. You will be notified once processing is complete.",
        verification: {
          id: verificationId,
          status: "PENDING",
          queuePosition: position,
        },
      });
    }
  } catch (error) {
    console.error("Student verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/verify-student?userId=...
 * Get verification status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Validate input
    const validationResult = verificationStatusSchema.safeParse({ userId });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid user ID", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const status = await getVerificationStatus(validationResult.data.userId);

    return NextResponse.json({
      userStatus: status.userStatus,
      latestVerification: status.latestVerification ? {
        id: status.latestVerification.id,
        status: status.latestVerification.status,
        faceMatchScore: status.latestVerification.faceMatchScore,
        ocrConfidence: status.latestVerification.ocrConfidence,
        extractedCollege: status.latestVerification.ocrExtractedCollege,
        collegeRecognized: status.latestVerification.collegeRecognized,
        idLooksValid: status.latestVerification.idLooksValid,
        processingTimeMs: status.latestVerification.processingTimeMs,
        createdAt: status.latestVerification.createdAt,
        reviewNotes: status.latestVerification.reviewNotes,
        rejectionReason: status.latestVerification.rejectionReason,
      } : null,
    });
  } catch (error) {
    console.error("Get verification status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case "AUTO_APPROVED":
      return "Verification successful! Your student ID has been verified automatically.";
    case "NEEDS_REVIEW":
      return "Verification submitted. Our team will review your submission shortly.";
    case "REJECTED":
      return "Verification failed. Please try again with clearer photos.";
    default:
      return "Verification status unknown.";
  }
}

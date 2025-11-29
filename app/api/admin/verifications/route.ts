import { NextRequest, NextResponse } from "next/server";
import { adminReviewSchema, pendingVerificationsSchema } from "@/lib/validators";
import { 
  getPendingVerifications, 
  reviewVerification 
} from "@/lib/services/verification-processor";
import { getWorkerHealth } from "@/lib/services/verification-worker";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/admin/verifications
 * Get list of pending verifications for admin review
 * 
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication (in production, add proper admin check)
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate pagination params
    const validationResult = pendingVerificationsSchema.safeParse({ page, limit });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid pagination parameters", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const [pendingResult, health] = await Promise.all([
      getPendingVerifications(validationResult.data.page, validationResult.data.limit),
      getWorkerHealth(),
    ]);

    return NextResponse.json({
      verifications: pendingResult.verifications.map(v => ({
        id: v.id,
        userId: v.userId,
        studentIdPhotoUrl: v.studentIdPhotoUrl,
        selfiePhotoUrl: v.selfiePhotoUrl,
        status: v.status,
        faceMatchScore: v.faceMatchScore,
        faceMatchConfidence: v.faceMatchConfidence,
        ocrExtractedName: v.ocrExtractedName,
        ocrExtractedCollege: v.ocrExtractedCollege,
        ocrExtractedStudentId: v.ocrExtractedStudentId,
        ocrConfidence: v.ocrConfidence,
        idLooksValid: v.idLooksValid,
        collegeRecognized: v.collegeRecognized,
        reviewNotes: v.reviewNotes,
        processingTimeMs: v.processingTimeMs,
        createdAt: v.createdAt,
      })),
      pagination: pendingResult.pagination,
      workerHealth: health,
    });
  } catch (error) {
    console.error("Get pending verifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/verifications
 * Submit admin review decision for a verification
 * 
 * Request body:
 * - verificationId: string (UUID)
 * - action: "APPROVE" | "REJECT"
 * - notes: string (optional)
 * - rejectionReason: string (optional, required if action is REJECT)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUserId = await getUserFromRequest(request);
    if (!adminUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = adminReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { verificationId, action, notes, rejectionReason } = validationResult.data;

    // Require rejection reason if rejecting
    if (action === "REJECT" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting a verification" },
        { status: 400 }
      );
    }

    const result = await reviewVerification(
      verificationId,
      adminUserId,
      action,
      notes,
      rejectionReason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: result.message,
      action,
      verificationId,
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

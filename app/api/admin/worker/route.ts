import { NextRequest, NextResponse } from "next/server";
import { 
  getWorkerHealth, 
  processVerificationBatch 
} from "@/lib/services/verification-worker";
import { getVerificationConfig } from "@/lib/services/verification-config";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/admin/worker
 * Get worker health status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [health, config] = await Promise.all([
      getWorkerHealth(),
      Promise.resolve(getVerificationConfig()),
    ]);

    return NextResponse.json({
      health,
      config: {
        thresholds: config.thresholds,
        maxRetries: config.maxRetries,
        processingTimeoutMs: config.processingTimeoutMs,
        queueBatchSize: config.queueBatchSize,
        queuePollingIntervalMs: config.queuePollingIntervalMs,
        enableFaceMatching: config.enableFaceMatching,
        enableOcr: config.enableOcr,
        enableAutoApproval: config.enableAutoApproval,
      },
    });
  } catch (error) {
    console.error("Get worker health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/worker
 * Trigger manual batch processing
 * 
 * Request body:
 * - action: "process_batch"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (body.action !== "process_batch") {
      return NextResponse.json(
        { error: "Invalid action. Use 'process_batch'" },
        { status: 400 }
      );
    }

    const result = await processVerificationBatch();

    return NextResponse.json({
      message: `Processed ${result.stats.processed} verification(s)`,
      stats: result.stats,
      results: result.results.map(r => ({
        verificationId: r.verificationId,
        status: r.status,
        processingTimeMs: r.totalProcessingTimeMs,
      })),
    });
  } catch (error) {
    console.error("Process batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

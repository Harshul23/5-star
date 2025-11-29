/**
 * Background Verification Worker
 * Processes verification queue in the background
 * Can be run as a Cloud Function, serverless worker, or background process
 */

import { prisma } from "../db";
import { processVerification, VerificationProcessResult } from "./verification-processor";
import { getVerificationConfig } from "./verification-config";

export interface WorkerStats {
  processed: number;
  autoApproved: number;
  needsReview: number;
  rejected: number;
  errors: number;
  avgProcessingTimeMs: number;
}

/**
 * Process a batch of pending verifications
 */
export async function processVerificationBatch(): Promise<{
  results: VerificationProcessResult[];
  stats: WorkerStats;
}> {
  const config = getVerificationConfig();
  const stats: WorkerStats = {
    processed: 0,
    autoApproved: 0,
    needsReview: 0,
    rejected: 0,
    errors: 0,
    avgProcessingTimeMs: 0,
  };
  
  // Fetch pending verifications
  const pendingVerifications = await prisma.studentVerification.findMany({
    where: { 
      status: "PENDING",
      retryCount: { lt: config.maxRetries },
    },
    orderBy: { createdAt: "asc" },
    take: config.queueBatchSize,
  });
  
  if (pendingVerifications.length === 0) {
    console.log("No pending verifications to process");
    return { results: [], stats };
  }
  
  console.log(`Processing ${pendingVerifications.length} verification(s)`);
  
  const results: VerificationProcessResult[] = [];
  let totalProcessingTime = 0;
  
  // Process each verification
  for (const verification of pendingVerifications) {
    try {
      console.log(`Processing verification ${verification.id} for user ${verification.userId}`);
      
      const result = await processVerification({
        userId: verification.userId,
        studentIdPhotoUrl: verification.studentIdPhotoUrl,
        selfiePhotoUrl: verification.selfiePhotoUrl,
      });
      
      results.push(result);
      stats.processed++;
      totalProcessingTime += result.totalProcessingTimeMs;
      
      switch (result.status) {
        case "AUTO_APPROVED":
          stats.autoApproved++;
          break;
        case "NEEDS_REVIEW":
          stats.needsReview++;
          break;
        case "REJECTED":
          stats.rejected++;
          break;
      }
      
      console.log(`Verification ${verification.id} completed with status: ${result.status}`);
      
    } catch (error) {
      console.error(`Error processing verification ${verification.id}:`, error);
      stats.errors++;
      
      // Increment retry count
      await prisma.studentVerification.update({
        where: { id: verification.id },
        data: {
          retryCount: { increment: 1 },
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
  
  if (stats.processed > 0) {
    stats.avgProcessingTimeMs = Math.round(totalProcessingTime / stats.processed);
  }
  
  console.log("Batch processing complete:", stats);
  
  return { results, stats };
}

/**
 * Start the background worker loop
 * This would typically be run as a separate process or Cloud Function
 */
export async function startWorkerLoop(): Promise<void> {
  const config = getVerificationConfig();
  
  console.log("Starting verification background worker...");
  console.log(`Polling interval: ${config.queuePollingIntervalMs}ms`);
  console.log(`Batch size: ${config.queueBatchSize}`);
  
  const processLoop = async () => {
    try {
      const { stats } = await processVerificationBatch();
      
      if (stats.processed > 0) {
        console.log(`Processed ${stats.processed} verification(s) this cycle`);
      }
    } catch (error) {
      console.error("Worker loop error:", error);
    }
  };
  
  // Run initial batch
  await processLoop();
  
  // Set up recurring processing
  setInterval(processLoop, config.queuePollingIntervalMs);
}

/**
 * Queue a new verification for processing
 */
export async function queueVerification(
  userId: string,
  studentIdPhotoUrl: string,
  selfiePhotoUrl: string
): Promise<{ verificationId: string; position: number }> {
  // Create pending verification record
  const verification = await prisma.studentVerification.create({
    data: {
      userId,
      studentIdPhotoUrl,
      selfiePhotoUrl,
      status: "PENDING",
    },
  });
  
  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationStatus: "PENDING",
      studentIdPhoto: studentIdPhotoUrl,
      selfiePhoto: selfiePhotoUrl,
    },
  });
  
  // Get queue position
  const position = await prisma.studentVerification.count({
    where: {
      status: "PENDING",
      createdAt: { lte: verification.createdAt },
    },
  });
  
  return {
    verificationId: verification.id,
    position,
  };
}

/**
 * Process a verification immediately (synchronous)
 * Use this for immediate verification without queueing
 */
export async function processVerificationImmediate(
  userId: string,
  studentIdPhotoUrl: string,
  selfiePhotoUrl: string
): Promise<VerificationProcessResult> {
  return processVerification({
    userId,
    studentIdPhotoUrl,
    selfiePhotoUrl,
  });
}

/**
 * Get worker health status
 */
export async function getWorkerHealth(): Promise<{
  healthy: boolean;
  pendingCount: number;
  processingCount: number;
  avgProcessingTimeMs: number | null;
  oldestPendingAge: number | null;
}> {
  const [pendingCount, processingCount, avgProcessingTime, oldestPending] = await Promise.all([
    prisma.studentVerification.count({
      where: { status: "PENDING" },
    }),
    prisma.studentVerification.count({
      where: { status: "PROCESSING" },
    }),
    prisma.studentVerification.aggregate({
      where: { processingTimeMs: { not: null } },
      _avg: { processingTimeMs: true },
    }),
    prisma.studentVerification.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  
  const oldestPendingAge = oldestPending 
    ? Date.now() - oldestPending.createdAt.getTime()
    : null;
  
  // Consider unhealthy if oldest pending is more than 5 minutes old
  const healthy = !oldestPendingAge || oldestPendingAge < 300000;
  
  return {
    healthy,
    pendingCount,
    processingCount,
    avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs,
    oldestPendingAge,
  };
}

/**
 * Cleanup old completed/rejected verifications
 * Keep records for audit purposes but clean up after 90 days
 */
export async function cleanupOldVerifications(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await prisma.studentVerification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: ["AUTO_APPROVED", "APPROVED", "REJECTED"] },
    },
  });
  
  console.log(`Cleaned up ${result.count} old verification records`);
  
  return result.count;
}

/**
 * Student Verification Configuration
 * Configurable thresholds and settings for the verification system
 */

export interface VerificationThresholds {
  // Face matching thresholds
  faceMatchMinScore: number;         // Minimum similarity score (0-100)
  faceMatchConfidenceMin: number;    // Minimum confidence level (0-100)
  
  // OCR thresholds
  ocrConfidenceMin: number;          // Minimum OCR confidence (0-100)
  
  // Auto-approval requirements
  autoApprovalFaceMatchMin: number;  // Minimum face match for auto-approval
  autoApprovalOcrConfidenceMin: number; // Minimum OCR confidence for auto-approval
}

export interface VerificationConfig {
  thresholds: VerificationThresholds;
  
  // Processing settings
  maxRetries: number;                // Maximum retry attempts for failed verifications
  processingTimeoutMs: number;       // Max processing time before timeout
  
  // Queue settings
  queueBatchSize: number;            // Number of verifications to process per batch
  queuePollingIntervalMs: number;    // Polling interval for background worker
  
  // Feature flags
  enableFaceMatching: boolean;
  enableOcr: boolean;
  enableAutoApproval: boolean;
  
  // Recognized colleges (for validation)
  recognizedColleges: string[];
}

// Default configuration values
export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  thresholds: {
    // Face matching thresholds
    faceMatchMinScore: 75,           // 75% similarity required
    faceMatchConfidenceMin: 70,      // 70% confidence required
    
    // OCR thresholds
    ocrConfidenceMin: 60,            // 60% OCR confidence required
    
    // Auto-approval requirements
    autoApprovalFaceMatchMin: 75,    // 75% face match for auto-approval
    autoApprovalOcrConfidenceMin: 70, // 70% OCR confidence for auto-approval
  },
  
  // Processing settings
  maxRetries: 3,
  processingTimeoutMs: 15000,        // 15 seconds timeout
  
  // Queue settings
  queueBatchSize: 10,
  queuePollingIntervalMs: 5000,      // 5 seconds polling
  
  // Feature flags
  enableFaceMatching: true,
  enableOcr: true,
  enableAutoApproval: true,
  
  // Recognized colleges (sample list - should be extended)
  recognizedColleges: [
    "harvard",
    "stanford",
    "mit",
    "yale",
    "princeton",
    "columbia",
    "berkeley",
    "ucla",
    "nyu",
    "university of california",
    "california institute of technology",
    "cornell",
    "duke",
    "northwestern",
    "university of michigan",
    "university of texas",
    "georgia tech",
    "carnegie mellon",
    "university of washington",
    "university of illinois",
    "purdue",
    "penn state",
    "ohio state",
    "university of florida",
    "university of north carolina",
  ],
};

/**
 * Get verification configuration
 * Merges environment variables with default config
 */
export function getVerificationConfig(): VerificationConfig {
  const config = { ...DEFAULT_VERIFICATION_CONFIG };
  
  // Override from environment variables if available
  if (process.env.VERIFICATION_FACE_MATCH_MIN) {
    config.thresholds.faceMatchMinScore = parseFloat(process.env.VERIFICATION_FACE_MATCH_MIN);
  }
  
  if (process.env.VERIFICATION_OCR_CONFIDENCE_MIN) {
    config.thresholds.ocrConfidenceMin = parseFloat(process.env.VERIFICATION_OCR_CONFIDENCE_MIN);
  }
  
  if (process.env.VERIFICATION_AUTO_APPROVAL_FACE_MIN) {
    config.thresholds.autoApprovalFaceMatchMin = parseFloat(process.env.VERIFICATION_AUTO_APPROVAL_FACE_MIN);
  }
  
  if (process.env.VERIFICATION_AUTO_APPROVAL_OCR_MIN) {
    config.thresholds.autoApprovalOcrConfidenceMin = parseFloat(process.env.VERIFICATION_AUTO_APPROVAL_OCR_MIN);
  }
  
  if (process.env.VERIFICATION_MAX_RETRIES) {
    config.maxRetries = parseInt(process.env.VERIFICATION_MAX_RETRIES, 10);
  }
  
  if (process.env.VERIFICATION_TIMEOUT_MS) {
    config.processingTimeoutMs = parseInt(process.env.VERIFICATION_TIMEOUT_MS, 10);
  }
  
  if (process.env.VERIFICATION_ENABLE_FACE_MATCHING !== undefined) {
    config.enableFaceMatching = process.env.VERIFICATION_ENABLE_FACE_MATCHING === "true";
  }
  
  if (process.env.VERIFICATION_ENABLE_OCR !== undefined) {
    config.enableOcr = process.env.VERIFICATION_ENABLE_OCR === "true";
  }
  
  if (process.env.VERIFICATION_ENABLE_AUTO_APPROVAL !== undefined) {
    config.enableAutoApproval = process.env.VERIFICATION_ENABLE_AUTO_APPROVAL === "true";
  }
  
  return config;
}

/**
 * Check if a college name is recognized
 */
export function isCollegeRecognized(collegeName: string, config: VerificationConfig): boolean {
  if (!collegeName) return false;
  
  const normalizedName = collegeName.toLowerCase().trim();
  
  return config.recognizedColleges.some(college => 
    normalizedName.includes(college) || college.includes(normalizedName)
  );
}

/**
 * Validate ID appearance patterns
 * Checks for common fake/blank ID patterns
 */
export function validateIdAppearance(
  extractedText: string | null,
  extractedName: string | null,
  extractedCollege: string | null
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for blank ID (no text extracted)
  if (!extractedText || extractedText.trim().length < 20) {
    issues.push("ID appears blank or has insufficient text");
  }
  
  // Check for missing name
  if (!extractedName || extractedName.trim().length < 2) {
    issues.push("Could not extract valid name from ID");
  }
  
  // Check for missing college
  if (!extractedCollege || extractedCollege.trim().length < 3) {
    issues.push("Could not extract college name from ID");
  }
  
  // Check for suspicious patterns (common in fake IDs)
  const suspiciousPatterns = [
    /test\s*id/i,
    /sample\s*id/i,
    /fake\s*id/i,
    /specimen/i,
    /void/i,
    /not\s*valid/i,
    /example/i,
  ];
  
  if (extractedText) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(extractedText)) {
        issues.push("ID contains suspicious patterns");
        break;
      }
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

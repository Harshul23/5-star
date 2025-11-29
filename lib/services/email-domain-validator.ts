/**
 * Student Email Domain Validation Service
 * Validates that user emails belong to approved student domains
 */

// List of approved student email domains
export const APPROVED_STUDENT_DOMAINS = [
  // US .edu domains
  ".edu",
  
  // India academic domains
  ".ac.in",
  ".edu.in",
  ".iit.ac.in",
  ".iiit.ac.in",
  ".nit.ac.in",
  ".bits-pilani.ac.in",
  ".vit.ac.in",
  ".manipal.edu",
  ".amity.edu",
  ".srmuniv.ac.in",
  
  // UK academic domains
  ".ac.uk",
  
  // Australia academic domains
  ".edu.au",
  
  // Canada academic domains
  ".edu.ca",
  ".ca", // Some Canadian universities use .ca
  
  // European academic domains
  ".edu.es",
  ".edu.fr",
  ".edu.de",
  ".ac.at",
  ".edu.it",
  
  // Other common academic domains
  ".edu.cn",
  ".edu.sg",
  ".edu.hk",
  ".edu.my",
  ".edu.ph",
  ".edu.br",
  ".edu.mx",
];

// Specific allowed domains (for custom college domains)
export const SPECIFIC_ALLOWED_DOMAINS: string[] = [
  // Add specific college domains here
  // Example: "stanford.edu", "harvard.edu", etc.
];

export interface EmailValidationResult {
  isValid: boolean;
  domain: string;
  reason?: string;
}

/**
 * Validate if an email belongs to an approved student domain
 */
export function validateStudentEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== "string") {
    return {
      isValid: false,
      domain: "",
      reason: "Invalid email format",
    };
  }

  const emailLower = email.toLowerCase().trim();
  const atIndex = emailLower.lastIndexOf("@");
  
  if (atIndex === -1) {
    return {
      isValid: false,
      domain: "",
      reason: "Invalid email format - missing @ symbol",
    };
  }

  const domain = emailLower.substring(atIndex + 1);
  
  if (!domain || domain.length < 3) {
    return {
      isValid: false,
      domain,
      reason: "Invalid email domain",
    };
  }

  // Check specific allowed domains first
  if (SPECIFIC_ALLOWED_DOMAINS.length > 0) {
    if (SPECIFIC_ALLOWED_DOMAINS.includes(domain)) {
      return {
        isValid: true,
        domain,
      };
    }
  }

  // Check if domain ends with any approved suffix
  for (const approvedSuffix of APPROVED_STUDENT_DOMAINS) {
    if (domain.endsWith(approvedSuffix) || domain === approvedSuffix.substring(1)) {
      return {
        isValid: true,
        domain,
      };
    }
  }

  return {
    isValid: false,
    domain,
    reason: `Email domain "${domain}" is not a recognized student email. Please use your college/university email.`,
  };
}

/**
 * Check if email verification is enabled
 */
export function isEmailVerificationEnabled(): boolean {
  // Can be configured via environment variable
  return process.env.REQUIRE_STUDENT_EMAIL !== "false";
}

/**
 * Check if student domain validation is enabled
 */
export function isStudentDomainValidationEnabled(): boolean {
  // Can be configured via environment variable
  return process.env.REQUIRE_STUDENT_DOMAIN !== "false";
}

/**
 * Get college/university name from email domain
 */
export function getCollegeFromDomain(domain: string): string | null {
  if (!domain) return null;
  
  // Extract the main part of the domain (e.g., "stanford" from "stanford.edu")
  const parts = domain.toLowerCase().split(".");
  
  if (parts.length >= 2) {
    // Get the first significant part
    const collegeName = parts[0];
    
    // Capitalize first letter
    return collegeName.charAt(0).toUpperCase() + collegeName.slice(1);
  }
  
  return null;
}

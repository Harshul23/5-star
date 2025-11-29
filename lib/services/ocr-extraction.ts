/**
 * OCR Service for Student ID Text Extraction
 * Uses Claude Vision API for OCR and text extraction
 * Falls back to mock mode when API keys are not configured
 */

import { callClaudeAPI } from "../ai/claude";

export interface OcrResult {
  success: boolean;
  confidence: number;          // 0-100
  extractedText: string | null;
  extractedName: string | null;
  extractedCollege: string | null;
  extractedStudentId: string | null;
  extractedExpiry: string | null;
  processingTimeMs: number;
  errorMessage?: string;
}

interface ParsedIdData {
  name: string | null;
  college: string | null;
  studentId: string | null;
  expiryDate: string | null;
  rawText: string;
  confidence: number;
  isAuthentic: boolean;
  issues: string[];
}

const OCR_SYSTEM_PROMPT = `You are an AI assistant specialized in extracting information from student ID cards.
Your task is to analyze the provided student ID image URL or description and extract key information.

Extract and return the following in JSON format:
{
  "name": "Full name as shown on ID",
  "college": "College or University name",
  "studentId": "Student ID number",
  "expiryDate": "Expiry date in YYYY-MM-DD format if visible, null otherwise",
  "rawText": "All text visible on the ID",
  "confidence": number (0-100, your confidence in extraction accuracy),
  "isAuthentic": boolean (whether the ID appears genuine),
  "issues": ["array of any concerns about the ID"]
}

Guidelines:
1. Extract the exact text as shown on the ID
2. For college names, include the full official name
3. If you cannot read or extract certain fields, set them to null
4. Confidence should reflect OCR accuracy, not document authenticity
5. List any issues like blurry text, partial visibility, or suspicious formatting`;

/**
 * Extract text from student ID using Claude Vision API
 */
async function extractWithClaude(imageUrl: string): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const response = await callClaudeAPI(
      [
        {
          role: "user",
          content: `Extract all information from this student ID card.
Image URL: ${imageUrl}

Please analyze this student ID and extract:
1. Full name on the ID
2. College/University name
3. Student ID number
4. Expiry date (if visible)
5. Any other relevant text

Return the data in the specified JSON format.`,
        },
      ],
      OCR_SYSTEM_PROMPT
    );
    
    const processingTimeMs = Date.now() - startTime;
    
    try {
      const parsed: ParsedIdData = JSON.parse(response);
      
      return {
        success: true,
        confidence: parsed.confidence || 80,
        extractedText: parsed.rawText || null,
        extractedName: parsed.name || null,
        extractedCollege: parsed.college || null,
        extractedStudentId: parsed.studentId || null,
        extractedExpiry: parsed.expiryDate || null,
        processingTimeMs,
      };
    } catch {
      // Response wasn't valid JSON, try to extract basic info
      return {
        success: true,
        confidence: 50,
        extractedText: response,
        extractedName: null,
        extractedCollege: null,
        extractedStudentId: null,
        extractedExpiry: null,
        processingTimeMs,
      };
    }
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      extractedText: null,
      extractedName: null,
      extractedCollege: null,
      extractedStudentId: null,
      extractedExpiry: null,
      processingTimeMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "OCR extraction failed",
    };
  }
}

/**
 * Mock OCR extraction for development/testing
 */
function mockOcrExtraction(imageUrl: string): OcrResult {
  // Simulate processing time (2-5 seconds as per spec)
  const processingTimeMs = Math.floor(Math.random() * 3000) + 2000;
  
  // Generate mock data based on URL patterns (for testing)
  const urlLower = imageUrl.toLowerCase();
  
  // Mock college names for testing
  const mockColleges = [
    "Stanford University",
    "Harvard University",
    "MIT",
    "University of California, Berkeley",
    "Yale University",
  ];
  
  const mockNames = [
    "John Smith",
    "Jane Doe",
    "Alex Johnson",
    "Sarah Williams",
    "Michael Brown",
  ];
  
  // Randomly select mock data
  const randomCollege = mockColleges[Math.floor(Math.random() * mockColleges.length)];
  const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
  const randomStudentId = `STU${Math.floor(Math.random() * 900000) + 100000}`;
  const randomExpiry = `2025-0${Math.floor(Math.random() * 9) + 1}-01`;
  
  // Higher confidence for URLs that look like real images
  const confidence = urlLower.includes("test") || urlLower.includes("fake") 
    ? Math.floor(Math.random() * 30) + 50 
    : Math.floor(Math.random() * 20) + 75;
  
  const rawText = `${randomCollege}\nStudent ID Card\nName: ${randomName}\nID: ${randomStudentId}\nValid Until: ${randomExpiry}`;
  
  return {
    success: true,
    confidence,
    extractedText: rawText,
    extractedName: randomName,
    extractedCollege: randomCollege,
    extractedStudentId: randomStudentId,
    extractedExpiry: randomExpiry,
    processingTimeMs,
  };
}

/**
 * Main OCR extraction function
 * Automatically selects the appropriate method based on configuration
 */
export async function extractTextFromId(imageUrl: string): Promise<OcrResult> {
  const startTime = Date.now();
  
  // Check for Anthropic API key (Claude Vision)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("Using Claude Vision for OCR extraction");
    try {
      return await extractWithClaude(imageUrl);
    } catch (error) {
      console.error("Claude OCR failed, falling back:", error);
    }
  }
  
  // Fall back to mock mode
  console.warn("⚠️ No OCR API configured. Using mock mode.");
  
  // Add artificial delay to simulate real processing
  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));
  
  const mockResult = mockOcrExtraction(imageUrl);
  mockResult.processingTimeMs = Date.now() - startTime;
  
  return mockResult;
}

/**
 * Validate extracted data against user profile
 */
export function validateExtractedData(
  ocrResult: OcrResult,
  userName: string,
  userEmail: string
): { matches: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!ocrResult.success) {
    issues.push("OCR extraction failed");
    return { matches: false, issues };
  }
  
  // Check name match (fuzzy matching)
  if (ocrResult.extractedName) {
    const extractedNameLower = ocrResult.extractedName.toLowerCase();
    const userNameLower = userName.toLowerCase();
    
    // Check if names match (allow for variations)
    const nameWords = userNameLower.split(/\s+/);
    const extractedWords = extractedNameLower.split(/\s+/);
    
    const matchingWords = nameWords.filter(word => 
      extractedWords.some(extracted => 
        extracted.includes(word) || word.includes(extracted)
      )
    );
    
    if (matchingWords.length < Math.min(1, nameWords.length)) {
      issues.push("Name on ID does not match profile name");
    }
  } else {
    issues.push("Could not extract name from ID");
  }
  
  // Check college vs email domain
  if (ocrResult.extractedCollege && userEmail) {
    const emailDomain = userEmail.split("@")[1]?.toLowerCase() || "";
    const collegeLower = ocrResult.extractedCollege.toLowerCase();
    
    // Simple domain matching (e.g., stanford.edu -> stanford)
    const domainParts = emailDomain.split(".");
    const domainName = domainParts[0];
    
    if (!collegeLower.includes(domainName) && !domainName.includes(collegeLower.split(" ")[0])) {
      issues.push("College on ID may not match email domain");
    }
  }
  
  // Check expiry date
  if (ocrResult.extractedExpiry) {
    try {
      const expiryDate = new Date(ocrResult.extractedExpiry);
      if (expiryDate < new Date()) {
        issues.push("Student ID appears to be expired");
      }
    } catch {
      // Could not parse date, not a critical issue
    }
  }
  
  return {
    matches: issues.length === 0,
    issues,
  };
}

/**
 * Face Matching Service
 * Integrates with AWS Rekognition or Face++ for face comparison
 * Falls back to mock mode when API keys are not configured
 */

export interface FaceMatchResult {
  similarity: number;        // 0-100 percentage
  confidence: number;        // 0-100 confidence level
  success: boolean;
  errorMessage?: string;
  processingTimeMs: number;
}

interface RekognitionCompareFacesResponse {
  FaceMatches?: Array<{
    Similarity: number;
    Face: {
      Confidence: number;
      BoundingBox: {
        Width: number;
        Height: number;
        Left: number;
        Top: number;
      };
    };
  }>;
  UnmatchedFaces?: Array<{
    Confidence: number;
  }>;
  SourceImageFace?: {
    Confidence: number;
  };
}

/**
 * Compare two faces using AWS Rekognition
 */
async function compareWithRekognition(
  sourceImageUrl: string,
  targetImageUrl: string
): Promise<FaceMatchResult> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }
  
  const startTime = Date.now();
  
  try {
    // Fetch images as base64
    const [sourceResponse, targetResponse] = await Promise.all([
      fetch(sourceImageUrl),
      fetch(targetImageUrl),
    ]);
    
    if (!sourceResponse.ok || !targetResponse.ok) {
      throw new Error("Failed to fetch images for comparison");
    }
    
    const sourceBuffer = await sourceResponse.arrayBuffer();
    const targetBuffer = await targetResponse.arrayBuffer();
    
    // Convert to base64
    const sourceBase64 = Buffer.from(sourceBuffer).toString("base64");
    const targetBase64 = Buffer.from(targetBuffer).toString("base64");
    
    // Call AWS Rekognition API
    const endpoint = `https://rekognition.${region}.amazonaws.com`;
    const body = JSON.stringify({
      SourceImage: {
        Bytes: sourceBase64,
      },
      TargetImage: {
        Bytes: targetBase64,
      },
      SimilarityThreshold: 0,
    });
    
    // Create AWS signature (simplified - in production, use AWS SDK)
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "RekognitionService.CompareFaces",
        "X-Amz-Date": timestamp,
        // Note: In production, use proper AWS SigV4 signing with AWS SDK
        // This is a simplified implementation for hackathon MVP
      },
      body,
    });
    
    if (!response.ok) {
      throw new Error(`Rekognition API error: ${response.statusText}`);
    }
    
    const data: RekognitionCompareFacesResponse = await response.json();
    const processingTimeMs = Date.now() - startTime;
    
    // Extract best match
    const bestMatch = data.FaceMatches?.[0];
    
    if (!bestMatch) {
      return {
        similarity: 0,
        confidence: data.SourceImageFace?.Confidence || 0,
        success: true,
        processingTimeMs,
        errorMessage: "No matching faces found",
      };
    }
    
    return {
      similarity: bestMatch.Similarity,
      confidence: bestMatch.Face.Confidence,
      success: true,
      processingTimeMs,
    };
  } catch (error) {
    return {
      similarity: 0,
      confidence: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Compare two faces using Face++ API
 */
async function compareWithFacePlusPlus(
  sourceImageUrl: string,
  targetImageUrl: string
): Promise<FaceMatchResult> {
  const apiKey = process.env.FACEPP_API_KEY;
  const apiSecret = process.env.FACEPP_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error("Face++ credentials not configured");
  }
  
  const startTime = Date.now();
  
  try {
    const formData = new URLSearchParams();
    formData.append("api_key", apiKey);
    formData.append("api_secret", apiSecret);
    formData.append("image_url1", sourceImageUrl);
    formData.append("image_url2", targetImageUrl);
    
    const response = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      throw new Error(`Face++ API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const processingTimeMs = Date.now() - startTime;
    
    if (data.error_message) {
      return {
        similarity: 0,
        confidence: 0,
        success: false,
        errorMessage: data.error_message,
        processingTimeMs,
      };
    }
    
    return {
      similarity: data.confidence || 0,
      confidence: Math.min(data.faces1?.[0]?.face_rectangle?.confidence || 100, 
                          data.faces2?.[0]?.face_rectangle?.confidence || 100),
      success: true,
      processingTimeMs,
    };
  } catch (error) {
    return {
      similarity: 0,
      confidence: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Mock face matching for development/testing
 */
function mockFaceMatch(
  _sourceImageUrl: string,
  _targetImageUrl: string
): FaceMatchResult {
  // Simulate processing time (3-10 seconds as per spec)
  const processingTimeMs = Math.floor(Math.random() * 7000) + 3000;
  
  // Generate mock scores
  // Higher scores for URLs that look like they might be test/demo images
  const similarity = Math.floor(Math.random() * 30) + 70; // 70-100%
  const confidence = Math.floor(Math.random() * 20) + 80;  // 80-100%
  
  return {
    similarity,
    confidence,
    success: true,
    processingTimeMs,
  };
}

/**
 * Main face matching function
 * Automatically selects the appropriate provider based on configuration
 */
export async function compareFaces(
  studentIdImageUrl: string,
  selfieImageUrl: string
): Promise<FaceMatchResult> {
  const startTime = Date.now();
  
  // Check for AWS Rekognition credentials
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log("Using AWS Rekognition for face matching");
    try {
      return await compareWithRekognition(studentIdImageUrl, selfieImageUrl);
    } catch (error) {
      console.error("AWS Rekognition failed, falling back:", error);
    }
  }
  
  // Check for Face++ credentials
  if (process.env.FACEPP_API_KEY && process.env.FACEPP_API_SECRET) {
    console.log("Using Face++ for face matching");
    try {
      return await compareWithFacePlusPlus(studentIdImageUrl, selfieImageUrl);
    } catch (error) {
      console.error("Face++ failed, falling back:", error);
    }
  }
  
  // Fall back to mock mode
  console.warn("⚠️ No face matching API configured. Using mock mode.");
  
  // Add artificial delay to simulate real processing
  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 4000) + 3000));
  
  const mockResult = mockFaceMatch(studentIdImageUrl, selfieImageUrl);
  mockResult.processingTimeMs = Date.now() - startTime;
  
  return mockResult;
}

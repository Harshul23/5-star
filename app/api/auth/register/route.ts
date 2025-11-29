import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { generateOTP } from "@/lib/ai/verification";
import { 
  validateStudentEmail, 
  isStudentDomainValidationEnabled,
  getCollegeFromDomain 
} from "@/lib/services/email-domain-validator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, email, password, college } = validationResult.data;

    // Validate student email domain (if enabled)
    if (isStudentDomainValidationEnabled()) {
      const emailValidation = validateStudentEmail(email);
      
      if (!emailValidation.isValid) {
        return NextResponse.json(
          { 
            error: "Invalid student email", 
            message: emailValidation.reason || "Please use a valid student email from your college/university.",
            domain: emailValidation.domain,
          },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Extract college from email domain if not provided
    const emailDomain = email.split("@")[1];
    const inferredCollege = getCollegeFromDomain(emailDomain);
    const finalCollege = college || inferredCollege || null;

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        college: finalCollege,
        emailVerificationOtp: otp,
        otpExpiresAt,
        verificationStatus: "UNVERIFIED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    // In production, send OTP via email
    // For MVP, we'll return it (or log it)
    console.log(`Email verification OTP for ${email}: ${otp}`);

    return NextResponse.json(
      {
        message: "User registered successfully. Please verify your email.",
        user,
        // Only include OTP in development
        ...(process.env.NODE_ENV === "development" && { otp }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

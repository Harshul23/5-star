import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { generateOTP, OTP_EXPIRY_MS } from "@/lib/ai/verification";
import { sendOTPEmail, isEmailConfigured } from "@/lib/services/email";

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
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        college: college || null,
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

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, name);
    
    if (!emailResult.success && isEmailConfigured()) {
      console.error(`Failed to send OTP email to ${email}`);
      // Don't fail registration, but log the error
    }

    // Log message for development/debugging purposes (OTP not logged for security)
    if (!isEmailConfigured()) {
      console.log(`[DEV MODE] Email service not configured. OTP returned in API response for ${email}`);
    }

    return NextResponse.json(
      {
        message: "User registered successfully. Please verify your email.",
        user,
        emailSent: emailResult.success,
        // Only include OTP in development when email is not configured
        ...(process.env.NODE_ENV === "development" && !isEmailConfigured() && { otp }),
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

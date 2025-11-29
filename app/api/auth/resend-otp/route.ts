import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOTP, OTP_EXPIRY_MS, OTP_RESEND_COOLDOWN_MS } from "@/lib/ai/verification";
import { sendOTPEmail, isEmailConfigured } from "@/lib/services/email";

const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = resendOtpSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Check rate limiting - don't allow resend within cooldown period of last OTP
    if (user.otpExpiresAt) {
      const otpCreatedAt = new Date(user.otpExpiresAt.getTime() - OTP_EXPIRY_MS);
      const timeSinceLastOtp = Date.now() - otpCreatedAt.getTime();

      if (timeSinceLastOtp < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLastOtp) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new OTP` },
          { status: 429 }
        );
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Update user with new OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otp,
        otpExpiresAt,
      },
    });

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, user.name);
    
    if (!emailResult.success && isEmailConfigured()) {
      console.error(`Failed to resend OTP email to ${email}`);
    }

    // Log masked OTP for development/debugging purposes
    if (!isEmailConfigured()) {
      console.log(`[DEV MODE] Resent email verification OTP for ${email}`);
    }

    return NextResponse.json({
      message: "OTP sent successfully",
      emailSent: emailResult.success,
      // Only include OTP in development when email is not configured
      ...(process.env.NODE_ENV === "development" && !isEmailConfigured() && { otp }),
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

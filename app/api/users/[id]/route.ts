import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validators";

// UUID validation schema
const userIdSchema = z.string().uuid("Invalid user ID");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate user ID format
    const validationResult = userIdSchema.safeParse(id);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        photo: true,
        college: true,
        verificationStatus: true,
        trustScore: true,
        badges: true,
        avgRating: true,
        completedDeals: true,
        cancellationRate: true,
        createdAt: true,
        // Include ratings received
        ratingsReceived: {
          select: {
            id: true,
            stars: true,
            comment: true,
            createdAt: true,
            fromUser: {
              select: {
                id: true,
                name: true,
                photo: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        // Include items listed by user
        items: {
          where: {
            availabilityStatus: "AVAILABLE",
          },
          select: {
            id: true,
            name: true,
            price: true,
            photo: true,
            condition: true,
            availabilityStatus: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return user with embedded ratings and items (no redundant top-level fields)
    return NextResponse.json({ user });
  } catch {
    console.error("Error fetching user profile");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate user ID format
    const idValidation = userIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Authenticate user
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure user can only edit their own profile
    if (userId !== id) {
      return NextResponse.json(
        { error: "You can only edit your own profile" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, email, college, photo } = validationResult.data;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already taken by another user" },
          { status: 409 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: {
      name?: string;
      email?: string;
      college?: string | null;
      photo?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (college !== undefined) updateData.college = college;
    if (photo !== undefined) updateData.photo = photo;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        photo: true,
        college: true,
        verificationStatus: true,
        trustScore: true,
        badges: true,
        avgRating: true,
        completedDeals: true,
        cancellationRate: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

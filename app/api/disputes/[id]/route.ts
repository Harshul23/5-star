import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/disputes/[id] - Get a single dispute
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            buyer: {
              select: {
                id: true,
                name: true,
                photo: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                photo: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    // Only buyer or seller can view the dispute
    if (dispute.transaction.buyerId !== userId && dispute.transaction.sellerId !== userId) {
      return NextResponse.json(
        { error: "You are not part of this dispute" },
        { status: 403 }
      );
    }

    return NextResponse.json({ dispute });
  } catch (error) {
    console.error("Get dispute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

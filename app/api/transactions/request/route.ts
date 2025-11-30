import { NextRequest, NextResponse } from "next/server";
import { requestTransactionSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";




// POST /api/transactions/request - Request to buy an item
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = requestTransactionSchema.safeParse({
      ...body,
      buyerId: userId,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { itemId } = validationResult.data;

    // Get item details
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        seller: {
          select: { id: true, verificationStatus: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (item.availabilityStatus !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Item is no longer available" },
        { status: 400 }
      );
    }

    if (item.sellerId === userId) {
      return NextResponse.json(
        { error: "You cannot buy your own item" },
        { status: 400 }
      );
    }

    // Check for existing pending transaction - reuse if exists (no duplicates)
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        buyerId: userId,
        itemId,
        status: { in: ["REQUESTED", "ACCEPTED", "PAID", "MEETING"] },
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
          },
        },
        item: true,
      },
    });

    // If chat already exists, reopen the same chat (no duplicates)
    if (existingTransaction) {
      return NextResponse.json(
        {
          message: "Chat already exists with seller",
          transaction: existingTransaction,
        },
        { status: 200 }
      );
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        buyerId: userId,
        sellerId: item.sellerId,
        itemId,
        status: "REQUESTED",
        escrowAmount: item.price,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
          },
        },
        item: true,
      },
    });

    // Item remains AVAILABLE until seller accepts the transaction
    // Status will be updated to RESERVED when seller accepts

    // Create auto-message from buyer to seller
    const autoMessage = "Hi! I'm interested in this item. Is it still available?";
    await prisma.message.create({
      data: {
        transactionId: transaction.id,
        senderId: userId,
        content: autoMessage,
        isAI: false,
        isFlagged: false,
      },
    });

    // TODO: Send Socket.io notification to seller
    // socketClient.emit('request', { transactionId: transaction.id, ... })

    return NextResponse.json(
      {
        message: "Item request sent to seller",
        transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Request transaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

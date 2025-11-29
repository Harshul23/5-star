import { NextRequest, NextResponse } from "next/server";
import { updateItemSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { checkItemPrice } from "@/lib/ai/price-checker";
import { getUserFromRequest } from "@/lib/auth";


// GET /api/items/[id] - Get a single item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use stored price rating from database instead of making AI call for faster response
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
            avgRating: true,
            badges: true,
            college: true,
            isOnline: true,
            lastSeen: true,
            completedDeals: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Use stored values from database for fast response
    // Price analysis is computed when item is created/updated
    const response = NextResponse.json({
      item: {
        ...item,
        // Use stored values, fallback to defaults if not set
        aiPriceRating: item.aiPriceRating || "Fair",
        avgCampusPrice: item.avgCampusPrice || item.price,
        priceExplanation: item.aiPriceRating 
          ? `This item is rated as "${item.aiPriceRating}" based on campus market analysis.`
          : "Price analysis will be available shortly.",
      },
    });

    // Add cache headers for better performance
    // Cache for 60 seconds on client, allow stale-while-revalidate for 120 seconds
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    return response;
  } catch (error) {
    console.error("Get item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/items/[id] - Update an item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check ownership
    const existingItem = await prisma.item.findUnique({
      where: { id },
      select: { sellerId: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (existingItem.sellerId !== userId) {
      return NextResponse.json(
        { error: "You can only update your own listings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateItemSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // If price is updated, recalculate price rating
    if (updateData.price && updateData.name) {
      const priceCheck = await checkItemPrice(
        updateData.name,
        updateData.price,
        updateData.condition || "GOOD"
      );
      (updateData as Record<string, unknown>).aiPriceRating = priceCheck.rating;
      (updateData as Record<string, unknown>).avgCampusPrice = priceCheck.averagePrice;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            trustScore: true,
            avgRating: true,
            badges: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Item updated successfully",
      item,
    });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/items/[id] - Delete an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check ownership
    const existingItem = await prisma.item.findUnique({
      where: { id },
      select: { sellerId: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (existingItem.sellerId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own listings" },
        { status: 403 }
      );
    }

    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

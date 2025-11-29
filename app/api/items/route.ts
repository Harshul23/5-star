import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      take: 20, // LIMIT results (CRITICAL)
      orderBy: { createdAt: "desc" },

      select: {
        id: true,
        name: true,
        price: true,
        photo: true,
        condition: true,
        aiPriceRating: true,
        category: true,
        createdAt: true,

        seller: {
          select: {
            id: true,
            name: true,
            photo: true,
            verificationStatus: true,
            avgRating: true,
            isOnline: true,
            badges: true,
          }
        }
      }
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Items fetch failed:", err);
    return NextResponse.json({ items: [] });
  }
}

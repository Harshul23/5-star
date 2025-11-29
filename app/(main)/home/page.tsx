import { prisma } from "@/lib/db";
import HomeContent from "./HomeContent";

// Force dynamic rendering at request time (not build time)
export const dynamic = "force-dynamic";

// Revalidate every 5 seconds for fresh data with caching
export const revalidate = 5;

async function getItems() {
  const items = await prisma.item.findMany({
    where: {
      availabilityStatus: "AVAILABLE",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
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
          trustScore: true,
          avgRating: true,
          badges: true,
          isOnline: true,
        },
      },
    },
  });

  // Serialize the dates for client component
  return items.map(item => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));
}

export default async function HomePage() {
  const items = await getItems();
  
  return <HomeContent initialItems={items} />;
}

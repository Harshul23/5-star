import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/db";
import { Badge, Button, Avatar, AvatarFallback } from "@/components/ui";
import { Zap, Search, Filter, Mic, Star, Clock } from "lucide-react";

// Server Component
export default async function HomePage() {
  // Query runs on the server (FAST)
  const items = await prisma.item.findMany({
    take: 20,
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
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">QuickGrab</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/list-item">
              <Button>List Item</Button>
            </Link>
            <Link href="/signin">
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        {/* SEARCH BAR (Client Component) */}
        {/* We’ll isolate it into a client component soon */}
      </header>

      {/* ITEMS GRID */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <Link href={`/item/${item.id}`} key={item.id}>
              <div className="border bg-white rounded-lg shadow-sm hover:shadow-md transition p-3">
                
                {/* ITEM IMAGE */}
                <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100">
                  {item.photo ? (
                    <Image
                      src={item.photo}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {item.aiPriceRating && (
                    <Badge className="absolute top-2 right-2">
                      {item.aiPriceRating}
                    </Badge>
                  )}
                </div>

                {/* ITEM DETAILS */}
                <div className="mt-3 flex justify-between">
                  <h2 className="font-semibold line-clamp-2 text-gray-900">
                    {item.name}
                  </h2>
                  <p className="font-bold text-blue-600">₹{item.price}</p>
                </div>

                <div className="flex gap-2 my-2">
                  <Badge variant="outline">{item.condition}</Badge>
                  <Badge variant="outline">{item.category}</Badge>
                </div>

                {/* SELLER */}
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {item.seller.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-1">
                        {item.seller.name}
                        {item.seller.verificationStatus === "VERIFIED" && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </p>

                      <div className="flex items-center text-xs">
                        <Star className="h-3 w-3 mr-1 fill-yellow-400" />
                        {item.seller.avgRating.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* ONLINE STATUS */}
                  {item.seller.isOnline ? (
                    <span className="text-green-600 text-xs flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Offline
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

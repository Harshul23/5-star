"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  fallback?: React.ReactNode;
  quality?: number;
}

/**
 * OptimizedImage component that wraps Next.js Image with:
 * - Loading state with blur placeholder
 * - Error handling with fallback
 * - Lazy loading by default
 * - Proper sizing for responsive images
 */
export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  containerClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fallback,
  quality = 75,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle cases where src is null, undefined, or empty
  if (!src || hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400",
          containerClassName
        )}
      >
        No Image
      </div>
    );
  }

  // Check if the src is a data URL (base64)
  const isDataUrl = src.startsWith("data:");
  
  // For data URLs, use unoptimized as Next.js can't optimize them
  if (isDataUrl) {
    return (
      <div className={cn("relative", containerClassName)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(className)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(
          className,
          isLoading && "animate-pulse bg-gray-200",
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        priority={priority}
        sizes={sizes}
        quality={quality}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

export default OptimizedImage;

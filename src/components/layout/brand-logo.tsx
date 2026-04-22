"use client";

import { tr } from "@/lib/i18n/tr";
import { cn } from "@/lib/utils";
import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  /** Pixel height; width follows aspect ratio */
  height?: number;
  priority?: boolean;
};

export function BrandLogo({ className, height = 44, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/lift-kontrol-logo.png"
      alt={tr.brand.appName}
      width={1024}
      height={1024}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height, width: "auto", maxWidth: "100%" }}
    />
  );
}

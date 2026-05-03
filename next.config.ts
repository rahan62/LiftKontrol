import type { NextConfig } from "next";

/**
 * Use `process.cwd()` only (not `import.meta.url`): Next can evaluate this config from a compiled
 * path, and `dirname(import.meta.url)` may point at the wrong folder and break tailwind / swc resolution.
 * Run `npm run dev` / `npm run build` from this repo root so cwd is correct.
 */
const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  /** iyzipay dinamik `require` kullanır; paket sunucuda harici yüklenir (Turbopack derlemesi için gerekli). */
  serverExternalPackages: ["iyzipay"],
  /**
   * iyzipay açılışta `lib/resources` için fs ile klasör tarar; Vercel serverless/NFT bu dizini bazen
   * artefakta taşımaz → ENOENT scandir. Kütüphaneyi trace’a zorla (ör. önceki “çalışan” deploy’da
   * bundler sürümü veya serverExternalPackages farkı ile klasör yanlışlıkla dahil kalmış olabilirdi).
   */
  outputFileTracingIncludes: {
    "/*": ["./node_modules/iyzipay/**/*"],
  },
  async redirects() {
    return [{ source: "/hakkimizda", destination: "/hakkimda", permanent: true }];
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;

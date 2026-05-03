import type { NextConfig } from "next";

/**
 * Use `process.cwd()` only (not `import.meta.url`): Next can evaluate this config from a compiled
 * path, and `dirname(import.meta.url)` may point at the wrong folder and break tailwind / swc resolution.
 * Run `npm run dev` / `npm run build` from the repo root so cwd is correct.
 */
const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean) ?? [];

/**
 * iyzipay harici paket kalır; Vercel NFT alt bağımlılıkları taşımaz. postman-request ve transitif
 * hoisted paketleri trace’a ekliyoruz (npm ls ile doğrulanmış kapatım).
 * iyzipay paketlenemez (lib/resources dinamik require) — serverExternalPackages şart.
 */
const paymentGatewayTraceIncludes = [
  "./node_modules/@postman/form-data/**/*",
  "./node_modules/@postman/tough-cookie/**/*",
  "./node_modules/@postman/tunnel-agent/**/*",
  "./node_modules/agent-base/**/*",
  "./node_modules/asn1/**/*",
  "./node_modules/assert-plus/**/*",
  "./node_modules/asynckit/**/*",
  "./node_modules/aws-sign2/**/*",
  "./node_modules/aws4/**/*",
  "./node_modules/bcrypt-pbkdf/**/*",
  "./node_modules/bluebird/**/*",
  "./node_modules/call-bind-apply-helpers/**/*",
  "./node_modules/call-bound/**/*",
  "./node_modules/caseless/**/*",
  "./node_modules/combined-stream/**/*",
  "./node_modules/core-util-is/**/*",
  "./node_modules/dashdash/**/*",
  "./node_modules/debug/**/*",
  "./node_modules/delayed-stream/**/*",
  "./node_modules/dunder-proto/**/*",
  "./node_modules/ecc-jsbn/**/*",
  "./node_modules/es-define-property/**/*",
  "./node_modules/es-errors/**/*",
  "./node_modules/es-object-atoms/**/*",
  "./node_modules/extend/**/*",
  "./node_modules/extsprintf/**/*",
  "./node_modules/forever-agent/**/*",
  "./node_modules/function-bind/**/*",
  "./node_modules/get-intrinsic/**/*",
  "./node_modules/get-proto/**/*",
  "./node_modules/getpass/**/*",
  "./node_modules/gopd/**/*",
  "./node_modules/has-symbols/**/*",
  "./node_modules/hasown/**/*",
  "./node_modules/http-signature/**/*",
  "./node_modules/ip-address/**/*",
  "./node_modules/is-typedarray/**/*",
  "./node_modules/isstream/**/*",
  "./node_modules/iyzipay/**/*",
  "./node_modules/jsbn/**/*",
  "./node_modules/json-schema/**/*",
  "./node_modules/json-stringify-safe/**/*",
  "./node_modules/jsprim/**/*",
  "./node_modules/math-intrinsics/**/*",
  "./node_modules/mime-db/**/*",
  "./node_modules/mime-types/**/*",
  "./node_modules/ms/**/*",
  "./node_modules/oauth-sign/**/*",
  "./node_modules/object-inspect/**/*",
  "./node_modules/postman-request/**/*",
  "./node_modules/psl/**/*",
  "./node_modules/punycode/**/*",
  "./node_modules/qs/**/*",
  "./node_modules/querystringify/**/*",
  "./node_modules/requires-port/**/*",
  "./node_modules/safe-buffer/**/*",
  "./node_modules/safer-buffer/**/*",
  "./node_modules/side-channel-list/**/*",
  "./node_modules/side-channel-map/**/*",
  "./node_modules/side-channel-weakmap/**/*",
  "./node_modules/side-channel/**/*",
  "./node_modules/smart-buffer/**/*",
  "./node_modules/socks-proxy-agent/**/*",
  "./node_modules/socks/**/*",
  "./node_modules/sshpk/**/*",
  "./node_modules/stream-length/**/*",
  "./node_modules/tweetnacl/**/*",
  "./node_modules/universalify/**/*",
  "./node_modules/url-parse/**/*",
  "./node_modules/uuid/**/*",
  "./node_modules/verror/**/*",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["iyzipay"],
  outputFileTracingIncludes: {
    "/*": paymentGatewayTraceIncludes,
  },
  async redirects() {
    return [
      { source: "/hakkimizda", destination: "/hakkimda", permanent: true },
      { source: "/app/finances", destination: "/app/accounting/receivables", permanent: false },
      { source: "/app/finances/new", destination: "/app/accounting/entries/new", permanent: false },
      { source: "/odeme/demo", destination: "/odeme", permanent: false },
    ];
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;

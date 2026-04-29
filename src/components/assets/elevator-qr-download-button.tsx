"use client";

import QRCode from "qrcode";
import { tr } from "@/lib/i18n/tr";

export function ElevatorQrDownloadButton({ url, filename }: { url: string; filename: string }) {
  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
      onClick={async () => {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 512,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.rel = "noopener";
        a.click();
      }}
    >
      {tr.assets.qrDownload}
    </button>
  );
}

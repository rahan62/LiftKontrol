"use client";

import QRCode from "qrcode";
import { tr } from "@/lib/i18n/tr";

const TAG_W = 900;
const PAD_X = 56;
const PAD_TOP = 52;
const PAD_BOTTOM = 52;
const QR_SIZE = 400;
const GAP_QR_TO_ID = 30;
const GAP_ID_TO_SITE = 24;
const ID_FONT =
  '500 14px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const SITE_FONT = '600 19px system-ui, -apple-system, "Segoe UI", sans-serif';
const ID_LINE_HEIGHT = 20;
const SITE_LINE_HEIGHT = 28;

function displaySite(siteName: string | null | undefined): string {
  const s = siteName?.trim();
  return s && s.length ? s : tr.common.none;
}

function elevatorIdLines(id: string): string[] {
  const s = id.trim();
  if (!s.length) return [tr.common.none];
  const lines: string[] = [];
  const chunk = 30;
  for (let i = 0; i < s.length; i += chunk) {
    lines.push(s.slice(i, i + chunk));
  }
  return lines;
}

/** Word-wrap for site/building label; breaks very long tokens so they fit. */
function wrapSiteLabel(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const t = text.trim();
  if (!t.length) return [tr.common.none];
  const lines: string[] = [];
  const words = t.split(/\s+/).filter(Boolean);
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let rest = word;
    while (rest.length) {
      let n = rest.length;
      while (n > 1 && ctx.measureText(rest.slice(0, n)).width > maxWidth) n--;
      if (n === 0) n = 1;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [tr.common.none];
}

export function ElevatorPrintTagButton({
  qrUrl,
  elevatorId,
  siteName,
  filename,
}: {
  qrUrl: string;
  elevatorId: string;
  siteName: string | null | undefined;
  filename: string;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
      onClick={async () => {
        const maxTextWidth = TAG_W - PAD_X * 2;

        const measure = document.createElement("canvas").getContext("2d");
        if (!measure) return;
        measure.font = SITE_FONT;
        const siteLines = wrapSiteLabel(measure, displaySite(siteName), maxTextWidth);

        const idLines = elevatorIdLines(elevatorId);

        const height =
          PAD_TOP +
          QR_SIZE +
          GAP_QR_TO_ID +
          idLines.length * ID_LINE_HEIGHT +
          GAP_ID_TO_SITE +
          siteLines.length * SITE_LINE_HEIGHT +
          PAD_BOTTOM;

        const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(TAG_W * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, TAG_W, height);

        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, qrUrl, {
          width: QR_SIZE,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });

        const qrX = (TAG_W - QR_SIZE) / 2;
        const qrY = PAD_TOP;
        ctx.drawImage(qrCanvas, qrX, qrY);

        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        let y = qrY + QR_SIZE + GAP_QR_TO_ID;
        ctx.font = ID_FONT;
        for (const line of idLines) {
          ctx.fillText(line, TAG_W / 2, y);
          y += ID_LINE_HEIGHT;
        }

        y += GAP_ID_TO_SITE;
        ctx.font = SITE_FONT;
        for (const line of siteLines) {
          ctx.fillText(line, TAG_W / 2, y);
          y += SITE_LINE_HEIGHT;
        }

        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.rel = "noopener";
          a.click();
          URL.revokeObjectURL(url);
        }, "image/png", 1);
      }}
    >
      {tr.assets.qrPrintTag}
    </button>
  );
}

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";

export type RevisionOfferLine = {
  article_code: string;
  title: string;
  unit_price_try: number;
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(trial, size);
    if (width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Build a multi-page revision offer PDF (TRY, Turkish labels).
 */
export async function buildRevisionOfferPdf(opts: {
  companyName: string;
  /** Yerel dosya yolu (legacy). */
  logoAbsolutePath: string | null;
  /** S3 veya bellekten logo (logoAbsolutePath yerine). */
  logoBytes?: Uint8Array | null;
  unitCode: string;
  siteName: string | null;
  customerName: string | null;
  lines: RevisionOfferLine[];
  totalTry: number;
}): Promise<Uint8Array> {
  const fontPath = path.join(process.cwd(), "src/assets/fonts/NotoSans-Regular.ttf");
  const fontBytes = await fs.readFile(fontPath);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  let logoDims: { w: number; h: number } | null = null;
  let logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | Awaited<ReturnType<PDFDocument["embedJpg"]>> | null = null;
  let logoBuf: Buffer | null = null;
  if (opts.logoBytes && opts.logoBytes.byteLength > 0) {
    logoBuf = Buffer.from(opts.logoBytes);
  } else if (opts.logoAbsolutePath) {
    try {
      logoBuf = await fs.readFile(opts.logoAbsolutePath);
    } catch {
      logoBuf = null;
    }
  }
  if (logoBuf) {
    try {
      try {
        logoImage = await pdfDoc.embedPng(logoBuf);
      } catch {
        logoImage = await pdfDoc.embedJpg(logoBuf);
      }
      const maxW = 120;
      const scale = maxW / logoImage.width;
      logoDims = { w: maxW, h: logoImage.height * scale };
    } catch {
      logoImage = null;
    }
  }

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const contentW = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = () => {
    let x = margin;
    if (logoImage && logoDims) {
      page.drawImage(logoImage, {
        x,
        y: y - logoDims.h,
        width: logoDims.w,
        height: logoDims.h,
      });
      x += logoDims.w + 16;
    }
    const title = "Revizyon teklifi";
    page.drawText(title, { x, y, size: 16, font, color: rgb(0.1, 0.1, 0.12) });
    y -= logoDims ? Math.max(logoDims.h, 22) : 28;
    page.drawText(opts.companyName, { x: margin, y, size: 11, font, color: rgb(0.2, 0.2, 0.25) });
    y -= 16;
    page.drawText(`Ünite: ${opts.unitCode}`, { x: margin, y, size: 10, font });
    y -= 14;
    if (opts.siteName) {
      page.drawText(`Saha: ${opts.siteName}`, { x: margin, y, size: 10, font });
      y -= 14;
    }
    if (opts.customerName) {
      page.drawText(`Müşteri: ${opts.customerName}`, { x: margin, y, size: 10, font });
      y -= 14;
    }
    y -= 10;
    page.drawText("EN 81-20 maddeleri (özet)", { x: margin, y, size: 11, font, color: rgb(0.15, 0.15, 0.2) });
    y -= 20;
  };

  drawHeader();

  const colCode = margin;
  const colTitle = margin + 72;
  const colPrice = pageWidth - margin - 70;
  const rowH = 13;

  for (let i = 0; i < opts.lines.length; i++) {
    const line = opts.lines[i];
    const titleLines = wrapText(`${line.article_code} — ${line.title}`, font, 9, contentW - 160);
    const blockH = Math.max(rowH, titleLines.length * 11 + 4);
    if (y < margin + blockH + 80) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      page.drawText(`${opts.companyName} — devam`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.45) });
      y -= 24;
    }
    page.drawText(line.article_code, { x: colCode, y, size: 9, font });
    let ty = y;
    for (const tl of titleLines) {
      page.drawText(tl, { x: colTitle, y: ty, size: 9, font });
      ty -= 11;
    }
    const priceStr = `${line.unit_price_try.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
    page.drawText(priceStr, { x: colPrice, y, size: 9, font });
    y -= blockH;
  }

  y -= 8;
  if (y < margin + 40) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }
  const totalStr = `Toplam: ${opts.totalTry.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  page.drawText(totalStr, { x: margin, y, size: 12, font, color: rgb(0.05, 0.2, 0.1) });

  const bytes = await pdfDoc.save();
  return bytes;
}

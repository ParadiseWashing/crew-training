// ─── Handbook signing — PDF stamping ─────────────────────────────────────────
//
// Fetches a source handbook PDF (the one configured on the SIGNATURE step),
// stamps printed name + date + signature image into the bottom-of-page-17
// signature block, and returns the modified PDF as a Buffer.
//
// Coordinates were derived from the "Handbook v2 FR" layout (US Letter,
// 612x792 pt). They target the SIGNATURE / PRINT NAME / DATE lines on the
// final acknowledgement page. If the handbook layout changes, update the
// constants in HANDBOOK_STAMP_LAYOUT below.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Where each field should land on the last page (PDF point coordinates,
 * origin = bottom-left). Calibrated against Handbook v2 FR (May 27, 2026).
 */
export const HANDBOOK_STAMP_LAYOUT = {
  // Inline blank in "I, ___, certify that I have received..." (top of page)
  inlinePrintName: { x: 80, y: 590, fontSize: 11, maxWidth: 280 },
  // Bottom PRINT NAME line (left side)
  printNameLine: { x: 60, y: 340, fontSize: 11, maxWidth: 250 },
  // Bottom DATE line (right side)
  dateLine: { x: 425, y: 340, fontSize: 11, maxWidth: 130 },
  // Bottom SIGNATURE line (full width below PRINT NAME)
  signatureLine: { x: 60, y: 295, maxWidth: 480, maxHeight: 40 },
};

export interface StampHandbookInput {
  /** Public URL of the source handbook PDF (e.g. UploadThing CDN URL). */
  sourcePdfUrl: string;
  /** Trainee's printed name (auto-filled from User.name). */
  printedName: string;
  /** Date string "MM/DD/YYYY". */
  dateString: string;
  /**
   * Signature, either a PNG data URL (when drawn on canvas) or a plain
   * string to render in cursive font (typed signature).
   */
  signature:
    | { kind: "drawn"; pngDataUrl: string }
    | { kind: "typed"; text: string };
}

/**
 * Fetches the source PDF, stamps the fields, returns a Buffer of the
 * modified PDF (entire document, last page modified in place).
 */
export async function stampHandbookPdf(input: StampHandbookInput): Promise<Buffer> {
  // 1. Fetch source PDF
  const res = await fetch(input.sourcePdfUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch handbook PDF (${res.status}) from ${input.sourcePdfUrl}`);
  }
  const srcBytes = new Uint8Array(await res.arrayBuffer());

  // 2. Load + register fontkit (needed if we ever embed a custom font)
  const pdf = await PDFDocument.load(srcBytes);
  pdf.registerFontkit(fontkit);

  // 3. Standard Helvetica for printed name + date
  const helv = await pdf.embedFont(StandardFonts.Helvetica);

  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth, height: pageHeight } = lastPage.getSize();
  // Coordinates are page-relative from bottom-left
  void pageWidth;
  void pageHeight;

  // 4. Stamp inline PRINT NAME (top "I, ___, certify..." blank)
  const inline = HANDBOOK_STAMP_LAYOUT.inlinePrintName;
  lastPage.drawText(input.printedName, {
    x: inline.x,
    y: inline.y,
    size: inline.fontSize,
    font: helv,
    color: rgb(0, 0, 0),
    maxWidth: inline.maxWidth,
  });

  // 5. Stamp bottom PRINT NAME line
  const pn = HANDBOOK_STAMP_LAYOUT.printNameLine;
  lastPage.drawText(input.printedName, {
    x: pn.x,
    y: pn.y,
    size: pn.fontSize,
    font: helv,
    color: rgb(0, 0, 0),
    maxWidth: pn.maxWidth,
  });

  // 6. Stamp DATE
  const dt = HANDBOOK_STAMP_LAYOUT.dateLine;
  lastPage.drawText(input.dateString, {
    x: dt.x,
    y: dt.y,
    size: dt.fontSize,
    font: helv,
    color: rgb(0, 0, 0),
    maxWidth: dt.maxWidth,
  });

  // 7. Stamp signature (image OR typed cursive text)
  const sig = HANDBOOK_STAMP_LAYOUT.signatureLine;
  if (input.signature.kind === "drawn") {
    const base64 = input.signature.pngDataUrl.replace(
      /^data:image\/(png|jpe?g);base64,/,
      ""
    );
    const imgBytes = Buffer.from(base64, "base64");
    const img = await pdf.embedPng(imgBytes);
    // Scale image to fit within maxWidth/maxHeight while preserving aspect
    const scale = Math.min(sig.maxWidth / img.width, sig.maxHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    lastPage.drawImage(img, {
      x: sig.x,
      y: sig.y,
      width: w,
      height: h,
    });
  } else {
    // Typed signature — use a cursive font. Great Vibes is loaded server-side
    // from a known Google Fonts CDN URL at build/runtime (no font file ships).
    const fontUrl = "https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN9XLiaQ.ttf";
    let cursive;
    try {
      const fontRes = await fetch(fontUrl);
      if (fontRes.ok) {
        const fontBytes = await fontRes.arrayBuffer();
        cursive = await pdf.embedFont(fontBytes);
      }
    } catch {
      // Fall through to italic Helvetica if the CDN is unreachable.
    }
    const font = cursive ?? (await pdf.embedFont(StandardFonts.HelveticaOblique));
    const size = 24;
    lastPage.drawText(input.signature.text, {
      x: sig.x,
      y: sig.y + 4,
      size,
      font,
      color: rgb(0, 0, 0),
      maxWidth: sig.maxWidth,
    });
  }

  const outBytes = await pdf.save();
  return Buffer.from(outBytes);
}

/**
 * Produce a Drive filename matching the agreed format:
 *   `Handbook Signature - <Name> - YYYY-MM-DD.pdf`
 */
export function buildSignatureFilename(args: { userName: string; signedAt: Date }) {
  const safeName = args.userName.replace(/[\\/:*?"<>|]/g, "").trim();
  const iso = args.signedAt.toISOString().slice(0, 10);
  return `Handbook Signature - ${safeName} - ${iso}.pdf`;
}

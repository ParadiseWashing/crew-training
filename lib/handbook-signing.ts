// ─── Handbook signing — acknowledgment PDF generation ────────────────────────
//
// Generates a fresh, self-contained acknowledgment PDF from the agreement text
// configured on the SIGNATURE step (typically pasted from the handbook's last
// page). The document reproduces the agreement wording, then stamps a
// Printed Name / Date / Signature block at the bottom. The result is uploaded
// to Google Drive as the signed record.
//
// No coordinate calibration against any source PDF is required — the page is
// built from scratch, so it works for any handbook.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// US Letter, in PDF points (origin = bottom-left).
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;

const BODY_SIZE = 11;
const LINE_HEIGHT = 16;
// Vertical room the signature block needs; if less remains, start a new page.
const SIGNATURE_BLOCK_HEIGHT = 140;

const GREAT_VIBES_URL =
  "https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN9XLiaQ.ttf";

export interface AcknowledgmentPdfInput {
  /** The agreement wording — typically pasted from the handbook's last page. */
  agreementText: string;
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
 * Wrap a single paragraph into lines that fit within CONTENT_W at the given
 * font/size. Explicit newlines in the source are handled by the caller.
 */
function wrapParagraph(text: string, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > CONTENT_W && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Build a fresh acknowledgment PDF and return it as a Buffer.
 */
export async function generateAcknowledgmentPdf(
  input: AcknowledgmentPdfInput
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const helv = await pdf.embedFont(StandardFonts.Helvetica);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  // ── Agreement body ─────────────────────────────────────────────────────
  // Fill the trainee's name into any inline blank (a run of underscores),
  // then preserve the author's explicit line breaks and wrap long lines.
  const filledText = input.agreementText.replace(/_{3,}/g, input.printedName);
  const sourceLines = filledText.replace(/\r\n/g, "\n").split("\n");
  for (const sourceLine of sourceLines) {
    if (sourceLine.trim() === "") {
      y -= LINE_HEIGHT; // blank line = paragraph spacing
      if (y < MARGIN) newPage();
      continue;
    }
    const wrapped = wrapParagraph(sourceLine, helv, BODY_SIZE);
    for (const line of wrapped) {
      if (y < MARGIN + BODY_SIZE) newPage();
      page.drawText(line, {
        x: MARGIN,
        y: y - BODY_SIZE,
        size: BODY_SIZE,
        font: helv,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }
  }

  // ── Signature block ────────────────────────────────────────────────────
  // Ensure the whole block fits on the current page.
  if (y < MARGIN + SIGNATURE_BLOCK_HEIGHT) newPage();
  y -= 28;

  // Printed Name (left) + Date (right) on the same row.
  page.drawText(`Printed Name: ${input.printedName}`, {
    x: MARGIN,
    y: y - BODY_SIZE,
    size: BODY_SIZE,
    font: helv,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Date: ${input.dateString}`, {
    x: PAGE_W - MARGIN - 150,
    y: y - BODY_SIZE,
    size: BODY_SIZE,
    font: helv,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  // Signature label.
  const labelBaselineY = y - BODY_SIZE;
  page.drawText("Signature:", {
    x: MARGIN,
    y: labelBaselineY,
    size: BODY_SIZE,
    font: helv,
    color: rgb(0, 0, 0),
  });

  // Signature rendering area, well below the label. The underline is fixed and
  // the signature sits just above it; with sigMaxH bounded, even the tallest
  // signature stays clear of the "Signature:" label above it.
  const sigX = MARGIN;
  const sigMaxW = 300;
  const sigMaxH = 38;
  const underlineY = labelBaselineY - 52; // clear gap below the label
  const sigBottomY = underlineY + 4; // signature rests just above the line

  if (input.signature.kind === "drawn") {
    const base64 = input.signature.pngDataUrl.replace(
      /^data:image\/(png|jpe?g);base64,/,
      ""
    );
    const imgBytes = Buffer.from(base64, "base64");
    const img = await pdf.embedPng(imgBytes);
    const scale = Math.min(sigMaxW / img.width, sigMaxH / img.height);
    page.drawImage(img, {
      x: sigX,
      y: sigBottomY,
      width: img.width * scale,
      height: img.height * scale,
    });
  } else {
    // Typed signature — Great Vibes cursive, fetched at runtime (no font ships).
    let cursive: PDFFont | undefined;
    try {
      const fontRes = await fetch(GREAT_VIBES_URL);
      if (fontRes.ok) {
        cursive = await pdf.embedFont(await fontRes.arrayBuffer());
      }
    } catch {
      // Fall back to italic Helvetica if the CDN is unreachable.
    }
    const font = cursive ?? (await pdf.embedFont(StandardFonts.HelveticaOblique));
    page.drawText(input.signature.text, {
      x: sigX,
      y: sigBottomY + 2,
      size: 24,
      font,
      color: rgb(0, 0, 0),
      maxWidth: sigMaxW,
    });
  }

  // Underline beneath the signature.
  page.drawLine({
    start: { x: sigX, y: underlineY },
    end: { x: sigX + sigMaxW, y: underlineY },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });

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

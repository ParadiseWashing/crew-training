import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stampHandbookPdf, buildSignatureFilename } from "@/lib/handbook-signing";
import { uploadPdfToDrive } from "@/lib/google-drive";

// ─── POST /api/handbook-signatures ───────────────────────────────────────────
// Trainee submits a signature. Server:
//   1. Validates the step is a SIGNATURE step
//   2. Fetches the source handbook PDF + stamps the last page
//   3. Uploads the resulting PDF to the configured Google Drive folder
//   4. Records a HandbookSignature audit row (regardless of Drive success)
//   5. Returns Drive link + audit row id

interface Body {
  stepId: string;
  signature:
    | { kind: "drawn"; pngDataUrl: string }
    | { kind: "typed"; text: string };
  confirmAgreement: boolean;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.stepId) return NextResponse.json({ error: "stepId required" }, { status: 400 });
  if (!body.confirmAgreement) {
    return NextResponse.json(
      { error: "You must confirm agreement to the handbook." },
      { status: 400 }
    );
  }
  if (!body.signature) {
    return NextResponse.json({ error: "signature required" }, { status: 400 });
  }
  if (body.signature.kind === "drawn" && !body.signature.pngDataUrl) {
    return NextResponse.json({ error: "Drawn signature is blank" }, { status: 400 });
  }
  if (body.signature.kind === "typed" && !body.signature.text?.trim()) {
    return NextResponse.json({ error: "Typed signature is blank" }, { status: 400 });
  }

  // Load step + user
  const [step, user] = await Promise.all([
    prisma.step.findUnique({ where: { id: body.stepId } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });
  if (step.stepType !== "SIGNATURE") {
    return NextResponse.json(
      { error: "Step is not a SIGNATURE step" },
      { status: 400 }
    );
  }
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Step.content carries the source PDF URL (set when admin created the step).
  const content = (step.content ?? {}) as { pdfUrl?: string };
  const pdfUrl = content.pdfUrl;
  if (!pdfUrl) {
    return NextResponse.json(
      { error: "This signature step has no source PDF configured. Ask an admin to set the PDF URL." },
      { status: 400 }
    );
  }

  const signedAt = new Date();
  const dateString = `${String(signedAt.getMonth() + 1).padStart(2, "0")}/${String(signedAt.getDate()).padStart(2, "0")}/${signedAt.getFullYear()}`;

  // Stamp the PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await stampHandbookPdf({
      sourcePdfUrl: pdfUrl,
      printedName: user.name,
      dateString,
      signature: body.signature,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[handbook-signatures] stamp error:", msg);
    return NextResponse.json({ error: `Stamping failed: ${msg}` }, { status: 500 });
  }

  const filename = buildSignatureFilename({ userName: user.name, signedAt });

  // Upload to Drive
  const driveResult = await uploadPdfToDrive({ filename, pdfBuffer });
  const driveFileId = "fileId" in driveResult ? driveResult.fileId : null;
  const driveFileName = "fileName" in driveResult ? driveResult.fileName : null;
  const driveWebLink = "webViewLink" in driveResult ? driveResult.webViewLink : null;
  const driveError = "error" in driveResult ? driveResult.error : null;

  // Audit row — always recorded, even if Drive failed
  const audit = await prisma.handbookSignature.create({
    data: {
      userId: user.id,
      stepId: step.id,
      printedName: user.name,
      signedAt,
      signatureMethod: body.signature.kind === "drawn" ? "DRAWN" : "TYPED",
      typedSignatureText:
        body.signature.kind === "typed" ? body.signature.text : null,
      driveFileId,
      driveFileName,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      userAgent: req.headers.get("user-agent") ?? null,
      pdfSourceUrl: pdfUrl,
    },
  });

  // Also mark the step as completed so the trainee's progress reflects it
  await prisma.stepProgress.upsert({
    where: { userId_stepId: { userId: user.id, stepId: step.id } },
    create: {
      userId: user.id,
      stepId: step.id,
      scrolledToBottom: true,
    },
    update: {
      completedAt: signedAt,
      scrolledToBottom: true,
    },
  });

  return NextResponse.json({
    success: true,
    auditId: audit.id,
    driveFileId,
    driveWebLink,
    driveError,
  });
}

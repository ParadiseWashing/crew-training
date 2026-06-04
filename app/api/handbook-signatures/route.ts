import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAcknowledgmentPdf, buildSignatureFilename } from "@/lib/handbook-signing";

// ─── POST /api/handbook-signatures ───────────────────────────────────────────
// Trainee submits a signature. Server:
//   1. Validates the step is a SIGNATURE step
//   2. Generates a fresh acknowledgment PDF from the step's agreement text
//      + the trainee's name, date, and signature
//   3. Records a HandbookSignature audit row with the signed PDF retained
//      in-app (signedPdfData) for download
//   4. Returns the audit row id + a download URL

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

  // Step.content carries the agreement text (set when admin created the step).
  const content = (step.content ?? {}) as { agreementText?: string };
  const agreementText = content.agreementText?.trim();
  if (!agreementText) {
    return NextResponse.json(
      { error: "This signature step has no agreement text configured. Ask an admin to set it." },
      { status: 400 }
    );
  }

  const signedAt = new Date();
  const dateString = `${String(signedAt.getMonth() + 1).padStart(2, "0")}/${String(signedAt.getDate()).padStart(2, "0")}/${signedAt.getFullYear()}`;

  // Generate the acknowledgment PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateAcknowledgmentPdf({
      agreementText,
      printedName: user.name,
      dateString,
      signature: body.signature,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[handbook-signatures] pdf generation error:", msg);
    return NextResponse.json({ error: `PDF generation failed: ${msg}` }, { status: 500 });
  }

  const filename = buildSignatureFilename({ userName: user.name, signedAt });

  // Audit row — the signed PDF is retained in-app (signedPdfData) for download.
  const audit = await prisma.handbookSignature.create({
    data: {
      userId: user.id,
      stepId: step.id,
      printedName: user.name,
      signedAt,
      signatureMethod: body.signature.kind === "drawn" ? "DRAWN" : "TYPED",
      typedSignatureText:
        body.signature.kind === "typed" ? body.signature.text : null,
      signedPdfData: new Uint8Array(pdfBuffer),
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      userAgent: req.headers.get("user-agent") ?? null,
      pdfSourceUrl: null,
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
    downloadUrl: `/api/handbook-signatures/${audit.id}/pdf`,
    filename,
  });
}

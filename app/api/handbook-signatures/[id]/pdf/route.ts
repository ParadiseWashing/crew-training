import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSignatureFilename } from "@/lib/handbook-signing";

// ─── GET /api/handbook-signatures/[id]/pdf ───────────────────────────────────
// Streams the retained signed acknowledgment PDF. Accessible to the signer
// (the user who signed) or any admin.
//
// By default the PDF downloads (Content-Disposition: attachment). Pass
// ?view=1 to render it inline in the browser (for preview).

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const inline = req.nextUrl.searchParams.get("view") === "1";

  const sig = await prisma.handbookSignature.findUnique({
    where: { id },
    select: {
      userId: true,
      printedName: true,
      signedAt: true,
      signedPdfData: true,
    },
  });

  if (!sig) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorize: the signer themselves, or an admin.
  if (sig.userId !== session.user.id) {
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { systemRole: true },
    });
    if (requester?.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!sig.signedPdfData) {
    return NextResponse.json({ error: "No PDF stored for this signature" }, { status: 404 });
  }

  const filename = buildSignatureFilename({
    userName: sig.printedName,
    signedAt: sig.signedAt,
  });
  const bytes = Buffer.from(sig.signedPdfData);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}

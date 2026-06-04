"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PdfSaveMenu } from "@/components/ui/pdf-save-menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Eraser, Pen, Type as TypeIcon, CheckCircle2 } from "lucide-react";

interface SignatureStepViewProps {
  stepId: string;
  userName: string;
  agreementText: string;
  alreadySigned: boolean;
  signedAt: string | null;
  signedPdfDownloadUrl: string | null;
  onSigned?: () => void;
}

type Mode = "draw" | "type";

const DRAW_CANVAS_W = 600;
const DRAW_CANVAS_H = 200;

export function SignatureStepView({
  stepId,
  userName,
  agreementText,
  alreadySigned,
  signedAt,
  signedPdfDownloadUrl,
  onSigned,
}: SignatureStepViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);
  const hasDrawnRef = React.useRef(false);

  const [mode, setMode] = React.useState<Mode>("draw");
  const [typedText, setTypedText] = React.useState(userName);
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [hasDrawing, setHasDrawing] = React.useState(false);

  // ─── Canvas setup ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (mode !== "draw") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    // Set up retina-ish backing
    const dpr = window.devicePixelRatio || 1;
    cvs.width = DRAW_CANVAS_W * dpr;
    cvs.height = DRAW_CANVAS_H * dpr;
    cvs.style.width = "100%";
    cvs.style.maxWidth = `${DRAW_CANVAS_W}px`;
    cvs.style.height = `${DRAW_CANVAS_H}px`;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, DRAW_CANVAS_W, DRAW_CANVAS_H);
    hasDrawnRef.current = false;
    setHasDrawing(false);
  }, [mode]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const scaleX = DRAW_CANVAS_W / rect.width;
    const scaleY = DRAW_CANVAS_H / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.setPointerCapture(e.pointerId);
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawing(true);
    }
  }
  function onPointerUp() {
    isDrawingRef.current = false;
  }

  function clearCanvas() {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, DRAW_CANVAS_W, DRAW_CANVAS_H);
    hasDrawnRef.current = false;
    setHasDrawing(false);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function submit() {
    if (!agreed) {
      toast("Confirm you agree to the handbook first", "error");
      return;
    }

    let signature: { kind: "drawn"; pngDataUrl: string } | { kind: "typed"; text: string };
    if (mode === "draw") {
      if (!hasDrawing) {
        toast("Please draw your signature in the box", "error");
        return;
      }
      const cvs = canvasRef.current;
      if (!cvs) return;
      const pngDataUrl = cvs.toDataURL("image/png");
      signature = { kind: "drawn", pngDataUrl };
    } else {
      if (!typedText.trim()) {
        toast("Type your signature", "error");
        return;
      }
      signature = { kind: "typed", text: typedText.trim() };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/handbook-signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          signature,
          confirmAgreement: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit signature");
      }
      toast("Signature recorded", "success");
      onSigned?.();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Already signed view ──────────────────────────────────────────────────
  if (alreadySigned) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">
            You&apos;ve already signed this document
          </h3>
          {signedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Signed on {new Date(signedAt).toLocaleString()}
            </p>
          )}
          {signedPdfDownloadUrl && (
            <div className="mt-4 flex justify-center">
              <PdfSaveMenu downloadUrl={signedPdfDownloadUrl} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Active signing UI ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Agreement text */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Agreement</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {agreementText}
          </p>
          <label className="flex items-start gap-3 pt-2 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(Boolean(c))}
              id="confirm-handbook-agreement"
            />
            <span className="text-sm text-gray-900">
              I, <strong>{userName}</strong>, certify the above and agree to this
              acknowledgement.
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Signature pad */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Signature</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode("draw")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5",
                  mode === "draw"
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-gray-600 border-gray-300 hover:border-accent-soft"
                )}
              >
                <Pen className="h-3 w-3" />
                Draw
              </button>
              <button
                type="button"
                onClick={() => setMode("type")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5",
                  mode === "type"
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-gray-600 border-gray-300 hover:border-accent-soft"
                )}
              >
                <TypeIcon className="h-3 w-3" />
                Type
              </button>
            </div>
          </div>

          {mode === "draw" ? (
            <div className="space-y-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="block w-full touch-none cursor-crosshair"
                  style={{ aspectRatio: `${DRAW_CANVAS_W} / ${DRAW_CANVAS_H}` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Sign with finger or mouse above the line.
                </p>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-accent"
                >
                  <Eraser className="h-3 w-3" />
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full px-4 py-6 text-3xl border-2 border-gray-200 rounded-lg focus:outline-none focus:border-accent text-center"
                style={{ fontFamily: '"Great Vibes", "Allura", cursive' }}
              />
              <p className="text-xs text-gray-500 text-center">
                Your typed signature will be rendered in a cursive font on the signed PDF.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={submit}
          loading={submitting}
          disabled={mode === "draw" ? !hasDrawing : !typedText.trim()}
        >
          Submit Signature
        </Button>
      </div>
    </div>
  );
}

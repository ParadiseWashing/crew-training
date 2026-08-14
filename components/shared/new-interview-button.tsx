"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus } from "lucide-react";

interface NewInterviewButtonProps {
  /** Button copy — admins get a shorter label to fit the page header. */
  label?: string;
  size?: "sm" | "md";
}

/**
 * Starts a working interview and drops the user straight into the day-1 form.
 *
 * The evaluation form only exists under /trainee/leadership, so both crew leads
 * and admins land there — admins pass the same canAccessLeadership check.
 */
export function NewInterviewButton({
  label = "Start New Working Interview",
  size = "sm",
}: NewInterviewButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");

  // Reset on open rather than in an effect, which would trigger a cascading render.
  function handleOpenChange(next: boolean) {
    if (next) setName("");
    setOpen(next);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/working-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start interview");
      }
      const created = await res.json();
      toast("Working interview started", "success");
      setOpen(false);
      router.push(`/trainee/leadership/working-interview/${created.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New Working Interview</DialogTitle>
          <DialogDescription>
            Enter the candidate&rsquo;s name once. You&rsquo;ll fill out one form per day for the
            next 3 days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Candidate Name"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={loading} disabled={!name.trim()}>
              Start Day 1
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

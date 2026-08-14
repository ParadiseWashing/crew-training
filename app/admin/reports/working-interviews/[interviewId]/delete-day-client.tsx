"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Undo2 } from "lucide-react";

interface Props {
  interviewId: string;
  candidateName: string;
  day: number;
  /** True when this is the highest-numbered day — only that one can be removed. */
  isLastDay: boolean;
}

export function DeleteDayButton({ interviewId, candidateName, day, isLastDay }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/working-interviews/${interviewId}/days/${day}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast(`Day ${day} cleared — it can now be re-entered.`, "success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isLastDay) {
    return (
      <span
        className="text-[11px] text-gray-400"
        title="Days must be removed in reverse order — clear the later day first."
      >
        Locked by a later day
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Clear &amp; re-enter
        </button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Clear day {day}?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Remove day {day} of{" "}
                <span className="font-semibold text-gray-900">{candidateName}</span>&rsquo;s working
                interview so a crew lead can submit it again?
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                <li>The interview reopens if this day had closed it</li>
                <li>Ratings, flags and notes for this day are removed from the record</li>
                <li>A copy is kept in the admin audit log</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            <Undo2 className="h-3.5 w-3.5" />
            Clear Day {day}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Trash2 } from "lucide-react";

interface Props {
  interviewId: string;
  candidateName: string;
  dayCount: number;
  /**
   * When true, render a compact trash-icon-only button suitable for table rows.
   * On click it stops event propagation so the surrounding Link isn't triggered.
   */
  compact?: boolean;
  /** When false (after delete), stays on the current page and just refreshes. */
  redirectToList?: boolean;
}

export function DeleteInterviewButton({
  interviewId,
  candidateName,
  dayCount,
  compact = false,
  redirectToList = true,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/working-interviews/${interviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      toast(`Deleted ${candidateName}'s working interview`, "success");
      setOpen(false);
      if (redirectToList) {
        router.push("/admin/reports/working-interviews");
      }
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  // Prevent clicks on the trigger from bubbling up to a parent <Link> in the row.
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            onClick={handleTriggerClick}
            title={`Delete ${candidateName}'s working interview`}
            aria-label={`Delete ${candidateName}'s working interview`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
            Delete Working Interview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete working interview?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Permanently delete{" "}
                <span className="font-semibold text-gray-900">{candidateName}</span>&rsquo;s
                working interview record?
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                <li>
                  All {dayCount} day report{dayCount === 1 ? "" : "s"} will be removed
                </li>
                <li>The candidate row will disappear from Reports → Working Interviews</li>
                <li>Status (pass/DQ) and evaluator notes will be lost</li>
              </ul>
              <p className="text-xs text-red-600 font-medium">
                This cannot be undone.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

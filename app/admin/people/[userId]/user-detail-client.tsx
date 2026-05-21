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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { Plus, BookOpen, RotateCcw } from "lucide-react";

interface SubjectSummary {
  id: string;
  title: string;
}

interface AssignSubjectButtonProps {
  userId: string;
  alreadyAssignedIds: string[];
  subjects: SubjectSummary[];
}

export function AssignSubjectButton({
  userId,
  alreadyAssignedIds,
  subjects,
}: AssignSubjectButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);

  const unassigned = subjects.filter((s) => !alreadyAssignedIds.includes(s.id));

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  function toggleSubject(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleAssign() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selected.map((subjectId) =>
          fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, subjectId }),
          })
        )
      );

      const failures = results.filter((r) => r.status === "rejected").length;
      const successes = results.length - failures;

      if (failures > 0 && successes === 0) {
        throw new Error("Failed to assign subjects");
      } else if (failures > 0) {
        toast(
          `${successes} subject(s) assigned, ${failures} failed`,
          "warning"
        );
      } else {
        toast(
          `${successes} subject${successes !== 1 ? "s" : ""} assigned successfully`,
          "success"
        );
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Assign Subject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Subjects</DialogTitle>
          <DialogDescription>
            Select published subjects to assign to this employee. Already-assigned subjects are
            not shown.
          </DialogDescription>
        </DialogHeader>

        {unassigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              All subjects assigned
            </p>
            <p className="text-sm text-gray-500">
              This employee already has all published subjects assigned.
            </p>
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {unassigned.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    id={`assign-${subject.id}`}
                    checked={selected.includes(subject.id)}
                    onCheckedChange={() => toggleSubject(subject.id)}
                  />
                  <span className="text-sm text-gray-700">{subject.title}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selected.length} of {unassigned.length} selected
            </p>
          </>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {unassigned.length > 0 && (
            <Button
              onClick={handleAssign}
              loading={loading}
              disabled={selected.length === 0}
            >
              Assign {selected.length > 0 ? `(${selected.length})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Progress Button ────────────────────────────────────────────────────

interface ResetProgressButtonProps {
  userId: string;
  userName: string;
  subjectId: string;
  subjectTitle: string;
}

export function ResetProgressButton({
  userId,
  userName,
  subjectId,
  subjectTitle,
}: ResetProgressButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/subjects/${subjectId}/reset-progress`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to reset progress");
      }
      toast(`Progress reset for ${subjectTitle}`, "success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-gray-600 hover:text-red-600 hover:border-red-200">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Progress
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reset progress?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This will completely reset{" "}
                <span className="font-semibold text-gray-900">{userName}</span>&rsquo;s
                progress in{" "}
                <span className="font-semibold text-gray-900">{subjectTitle}</span>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                <li>All completed steps will be marked incomplete</li>
                <li>All quiz attempts for this subject will be erased</li>
                <li>Any sign-off for this subject will be removed</li>
                <li>The assignment will return to &ldquo;Not Started&rdquo;</li>
              </ul>
              <p className="text-xs text-red-600 font-medium">
                This cannot be undone.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

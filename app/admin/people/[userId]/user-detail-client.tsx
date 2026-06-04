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
import { Plus, BookOpen, RotateCcw, Trash2, X } from "lucide-react";

interface SubjectSummary {
  id: string;
  title: string;
  isPublished: boolean;
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

  const assignedSet = React.useMemo(
    () => new Set(alreadyAssignedIds),
    [alreadyAssignedIds]
  );

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
            Check the modules to assign to this employee. Modules already assigned
            are checked and locked.
          </DialogDescription>
        </DialogHeader>

        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              No modules exist yet
            </p>
            <p className="text-sm text-gray-500">
              Create modules in the Content section first.
            </p>
          </div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
              {subjects.map((subject) => {
                const isAssigned = assignedSet.has(subject.id);
                const isChecked = isAssigned || selected.includes(subject.id);
                return (
                  <label
                    key={subject.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isAssigned
                        ? "cursor-default opacity-60"
                        : "hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    <Checkbox
                      id={`assign-${subject.id}`}
                      checked={isChecked}
                      disabled={isAssigned}
                      onCheckedChange={() =>
                        !isAssigned && toggleSubject(subject.id)
                      }
                    />
                    <span className="text-sm text-gray-700 flex-1">
                      {subject.title}
                    </span>
                    {!subject.isPublished && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                        Draft
                      </span>
                    )}
                    {isAssigned && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        Assigned
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selected.length} selected
            </p>
          </>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {subjects.length > 0 && (
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

// ─── Unassign Subject Button ──────────────────────────────────────────────────

interface UnassignButtonProps {
  assignmentId: string;
  userName: string;
  subjectTitle: string;
}

export function UnassignButton({
  assignmentId,
  userName,
  subjectTitle,
}: UnassignButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleUnassign() {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove assignment");
      }
      toast(`Removed ${subjectTitle}`, "success");
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
        <Button
          size="sm"
          variant="outline"
          className="text-gray-600 hover:text-red-600 hover:border-red-200"
        >
          <X className="h-3.5 w-3.5" />
          Unassign
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Remove this assignment?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This removes{" "}
                <span className="font-semibold text-gray-900">{subjectTitle}</span>{" "}
                from{" "}
                <span className="font-semibold text-gray-900">{userName}</span>&rsquo;s
                assignments.
              </p>
              <p className="text-xs text-gray-500">
                Their progress is kept &mdash; if you assign this subject again later,
                their completed steps and quiz scores will still be there.
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
          <Button variant="destructive" loading={loading} onClick={handleUnassign}>
            <X className="h-3.5 w-3.5" />
            Unassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset / Delete Signature Button ──────────────────────────────────────────

interface ResetSignatureButtonProps {
  signatureId: string;
  userName: string;
  documentTitle: string;
}

export function ResetSignatureButton({
  signatureId,
  userName,
  documentTitle,
}: ResetSignatureButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/handbook-signatures/${signatureId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete signature");
      }
      toast("Signature deleted — step re-opened for signing", "success");
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
        <Button
          size="sm"
          variant="outline"
          className="text-gray-600 hover:text-red-600 hover:border-red-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete signature & reset?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This will delete{" "}
                <span className="font-semibold text-gray-900">{userName}</span>&rsquo;s
                signed{" "}
                <span className="font-semibold text-gray-900">{documentTitle}</span> and
                re-open that signature step so they can sign again.
              </p>
              <p className="text-xs text-red-600 font-medium">
                The signed PDF will be permanently removed. This cannot be undone.
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
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete & Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

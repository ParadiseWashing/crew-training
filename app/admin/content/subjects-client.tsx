"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

// ─── Create Subject Button ────────────────────────────────────────────────────

export function CreateSubjectButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<"COMPANY" | "POLICIES" | "PROCESSES">("PROCESSES");
  const [requiresSignOff, setRequiresSignOff] = React.useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("PROCESSES");
    setRequiresSignOff(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, category, requiresSignOff }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create subject");
      }

      toast("Subject created successfully", "success");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Subject
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Add a new training subject. You can add topics and content after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Safety Protocols"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description"
            placeholder="Brief overview of what this subject covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY">Company</SelectItem>
                <SelectItem value="POLICIES">Policies</SelectItem>
                <SelectItem value="PROCESSES">Processes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Requires Sign-Off</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Trainees must acknowledge completion with a signature
              </p>
            </div>
            <Switch
              checked={requiresSignOff}
              onCheckedChange={setRequiresSignOff}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading} disabled={!title.trim()}>
              Create Subject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Subject Button ────────────────────────────────────────────────────

interface DeleteSubjectButtonProps {
  subjectId: string;
  subjectTitle: string;
}

export function DeleteSubjectButton({ subjectId, subjectTitle }: DeleteSubjectButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete subject");
      }
      toast("Subject deleted", "success");
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
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Subject</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-gray-900">&ldquo;{subjectTitle}&rdquo;</span>?
            This will permanently remove all topics, steps, and quiz data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            Delete Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

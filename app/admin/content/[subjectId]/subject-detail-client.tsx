"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Globe, EyeOff } from "lucide-react";
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
import { cn } from "@/lib/utils";

// ─── Publish Toggle ───────────────────────────────────────────────────────────

interface PublishToggleProps {
  subjectId: string;
  isPublished: boolean;
}

export function PublishToggle({ subjectId, isPublished }: PublishToggleProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [published, setPublished] = React.useState(isPublished);

  async function toggle() {
    setLoading(true);
    const next = !published;
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setPublished(next);
      toast(next ? "Subject published" : "Subject unpublished", "success");
      router.refresh();
    } catch {
      toast("Failed to update publish status", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={published ? "success" : "outline"}
      size="sm"
      loading={loading}
      onClick={toggle}
      className={cn(!published && "text-gray-500")}
    >
      {published ? (
        <>
          <Globe className="h-3.5 w-3.5" />
          Published
        </>
      ) : (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Draft
        </>
      )}
    </Button>
  );
}

// ─── Add Topic Button ─────────────────────────────────────────────────────────

interface AddTopicButtonProps {
  subjectId: string;
}

export function AddTopicButton({ subjectId }: AddTopicButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  function reset() {
    setTitle("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, title: title.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create topic");
      }
      toast("Topic created", "success");
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
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Topic
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Topic</DialogTitle>
          <DialogDescription>
            Topics are chapters within a subject. Add steps and a quiz after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Topic Title"
            placeholder="e.g. Introduction to Safety"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="What will trainees learn in this topic?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading} disabled={!title.trim()}>
              Create Topic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Topic Button ──────────────────────────────────────────────────────

interface DeleteTopicButtonProps {
  topicId: string;
  topicTitle: string;
}

export function DeleteTopicButton({ topicId, topicTitle }: DeleteTopicButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete topic");
      toast("Topic deleted", "success");
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
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Topic</DialogTitle>
          <DialogDescription>
            Delete{" "}
            <span className="font-medium text-gray-900">&ldquo;{topicTitle}&rdquo;</span>?
            All steps and quiz data will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            Delete Topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Subject Form ────────────────────────────────────────────────────────

interface EditSubjectFormProps {
  subject: {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    category: string;
    requiresSignOff: boolean;
    jobRoleIds: string[];
  };
  allJobRoles: { id: string; title: string }[];
}

export function EditSubjectForm({ subject, allJobRoles }: EditSubjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const [title, setTitle] = React.useState(subject.title);
  const [description, setDescription] = React.useState(subject.description);
  const [coverImage, setCoverImage] = React.useState(subject.coverImage);
  const [category, setCategory] = React.useState(subject.category);
  const [requiresSignOff, setRequiresSignOff] = React.useState(subject.requiresSignOff);
  const [selectedJobRoles, setSelectedJobRoles] = React.useState<string[]>(subject.jobRoleIds);

  function markDirty() {
    setDirty(true);
  }

  function toggleJobRole(id: string) {
    setSelectedJobRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
    markDirty();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          coverImage: coverImage.trim() || null,
          category,
          requiresSignOff,
          jobRoleIds: selectedJobRoles,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save changes");
      }
      toast("Changes saved", "success");
      setDirty(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => { setTitle(e.target.value); markDirty(); }}
        required
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => { setDescription(e.target.value); markDirty(); }}
        rows={3}
        placeholder="Subject overview..."
      />

      <Input
        label="Cover Image URL"
        value={coverImage}
        onChange={(e) => { setCoverImage(e.target.value); markDirty(); }}
        placeholder="https://..."
        type="url"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Category</label>
        <Select value={category} onValueChange={(v) => { setCategory(v); markDirty(); }}>
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
          <p className="text-xs text-gray-500 mt-0.5">Trainee must sign upon completion</p>
        </div>
        <Switch
          checked={requiresSignOff}
          onCheckedChange={(v) => { setRequiresSignOff(v); markDirty(); }}
        />
      </div>

      {allJobRoles.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Assign to Job Roles</label>
          <div className="flex flex-wrap gap-2">
            {allJobRoles.map((role) => {
              const selected = selectedJobRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleJobRole(role.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    selected
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                  )}
                >
                  {role.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dirty && (
        <Button type="submit" loading={loading} className="w-full">
          Save Changes
        </Button>
      )}
    </form>
  );
}

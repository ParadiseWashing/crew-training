"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Globe,
  EyeOff,
  Upload,
  X,
  GripVertical,
  FileText,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { uploadFiles } from "@/lib/uploadthing-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

// ─── Cover Image Uploader ─────────────────────────────────────────────────────

function CoverImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFiles("imageUploader", { files: [file] });
      if (res?.[0]?.ufsUrl) onChange(res[0].ufsUrl);
    } catch {
      // fall through silently — user can retry
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">Cover Image</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-md hover:bg-black/80 transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-accent hover:text-accent hover:bg-accent-tint transition-colors disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload cover image"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
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

      <CoverImageUploader value={coverImage} onChange={(url) => { setCoverImage(url); markDirty(); }} />

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
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-gray-600 border-gray-300 hover:border-accent-soft"
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

// ─── Sortable Topic List ──────────────────────────────────────────────────────

export interface TopicListItem {
  id: string;
  title: string;
  weekNumber: number | null;
  dayNumber: number | null;
  stepCount: number;
  quiz: { id: string; passingScore: number } | null;
}

function SortableTopicRow({
  topic,
  idx,
  subjectId,
}: {
  topic: TopicListItem;
  idx: number;
  subjectId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging ? "z-50 opacity-60" : "")}
    >
      <Card
        className={cn(
          "group hover:shadow-sm transition-shadow",
          isDragging && "border-accent-soft shadow-lg"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
            {idx + 1}
          </span>

          <div className="flex-1 min-w-0">
            <Link
              href={`/admin/content/${subjectId}/topics/${topic.id}`}
              className="font-medium text-gray-900 group-hover:text-accent transition-colors text-sm"
            >
              {topic.title}
            </Link>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {topic.stepCount} {topic.stepCount === 1 ? "step" : "steps"}
              </span>
              {topic.quiz && (
                <span className="text-xs text-accent flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Quiz ({topic.quiz.passingScore}% passing)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteTopicButton topicId={topic.id} topicTitle={topic.title} />
            <Link href={`/admin/content/${subjectId}/topics/${topic.id}`}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-accent">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SortableTopicList({
  subjectId,
  topics: initialTopics,
}: {
  subjectId: string;
  topics: TopicListItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [topics, setTopics] = React.useState(initialTopics);

  React.useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = topics.findIndex((t) => t.id === active.id);
    const newIdx = topics.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // When dragging across day/week groups, adopt the target week + day.
    const target = topics[newIdx];
    const moved = { ...topics[oldIdx], weekNumber: target.weekNumber, dayNumber: target.dayNumber };
    const without = topics.filter((_, i) => i !== oldIdx);
    const reordered = [...without.slice(0, newIdx), moved, ...without.slice(newIdx)];

    setTopics(reordered); // optimistic

    try {
      const res = await fetch("/api/topics/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reordered.map((t, i) => ({
            id: t.id,
            orderIndex: i,
            weekNumber: t.weekNumber,
            dayNumber: t.dayNumber,
          }))
        ),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast("Failed to save order", "error");
      setTopics(initialTopics);
    }
  }

  // Build a Week -> Day -> Topics nested structure from the flat sorted list.
  type DayGroup = { day: number | null; items: TopicListItem[] };
  type WeekGroup = { week: number | null; days: DayGroup[] };
  const weeks: WeekGroup[] = [];
  for (const t of topics) {
    let week = weeks[weeks.length - 1];
    if (!week || week.week !== t.weekNumber) {
      week = { week: t.weekNumber, days: [] };
      weeks.push(week);
    }
    let day = week.days[week.days.length - 1];
    if (!day || day.day !== t.dayNumber) {
      day = { day: t.dayNumber, items: [] };
      week.days.push(day);
    }
    day.items.push(t);
  }

  const hasAnyWeek = topics.some((t) => t.weekNumber != null);
  const hasAnyDay = topics.some((t) => t.dayNumber != null);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {weeks.map((weekGroup, wi) => {
            const weekTopicCount = weekGroup.days.reduce((n, d) => n + d.items.length, 0);
            return (
              <div key={`w-${weekGroup.week ?? "none"}-${wi}`} className="space-y-3">
                {hasAnyWeek && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <h2 className="text-sm font-bold text-gray-900">
                      {weekGroup.week != null ? `Week ${weekGroup.week}` : "Unscheduled"}
                    </h2>
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-[11px] font-medium text-gray-500">
                      {weekTopicCount} {weekTopicCount === 1 ? "topic" : "topics"}
                    </span>
                  </div>
                )}
                <div className="space-y-4 pl-1">
                  {weekGroup.days.map((dayGroup, di) => {
                    const startIdx = topics.findIndex((t) => t.id === dayGroup.items[0].id);
                    return (
                      <div key={`d-${dayGroup.day ?? "none"}-${di}`} className="space-y-2">
                        {hasAnyDay && (
                          <div className="flex items-center gap-2 px-1">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {dayGroup.day != null ? `Day ${dayGroup.day}` : "Unscheduled"}
                            </h3>
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] text-gray-400">
                              {dayGroup.items.length}{" "}
                              {dayGroup.items.length === 1 ? "topic" : "topics"}
                            </span>
                          </div>
                        )}
                        {dayGroup.items.map((topic, i) => (
                          <SortableTopicRow
                            key={topic.id}
                            topic={topic}
                            idx={startIdx + i}
                            subjectId={subjectId}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

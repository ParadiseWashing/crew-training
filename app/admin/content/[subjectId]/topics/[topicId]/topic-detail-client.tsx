"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
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
import {
  Plus,
  Trash2,
  Save,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Code,
  Quote,
  CheckSquare,
  X,
  ImageIcon,
  Loader2,
  Video,
  Check,
  GripVertical,
  FileText as FileTextIcon,
  Upload,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/lib/uploadthing";

const { uploadFiles } = genUploader<OurFileRouter>();
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "WRITTEN_RESPONSE";

type StepType = "CONTENT" | "PDF";

interface PdfStepContent {
  type: "pdf";
  fileUrl: string | null;
  fileName: string | null;
}

interface StepData {
  id: string;
  title: string;
  stepType: StepType;
  content: object;
  orderIndex: number;
}

interface QuizData {
  id: string;
  passingScore: number;
  maxAttempts: number;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id?: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  correctAnswer: string | string[] | null;
  orderIndex: number;
}

// ─── Tiptap Toolbar ───────────────────────────────────────────────────────────

function EditorToolbar({
  editor,
  onImageUpload,
  uploading,
}: {
  editor: Editor | null;
  onImageUpload: () => void;
  uploading: boolean;
}) {
  const [youtubeInput, setYoutubeInput] = React.useState(false);
  const [youtubeUrl, setYoutubeUrl] = React.useState("");
  const youtubeInputRef = React.useRef<HTMLInputElement>(null);

  if (!editor) return null;

  function submitYoutube() {
    const url = youtubeUrl.trim();
    if (url && editor) editor.commands.setYoutubeVideo({ src: url });
    setYoutubeUrl("");
    setYoutubeInput(false);
  }

  const tools = [
    {
      icon: <Bold className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      title: "Bold",
    },
    {
      icon: <Italic className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      title: "Italic",
    },
    {
      icon: <Heading2 className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      title: "Heading 2",
    },
    {
      icon: <Heading3 className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      title: "Heading 3",
    },
    {
      icon: <List className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      title: "Bullet List",
    },
    {
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      title: "Ordered List",
    },
    {
      icon: <CheckSquare className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleTaskList().run(),
      active: editor.isActive("taskList"),
      title: "Task List",
    },
    {
      icon: <Quote className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      title: "Blockquote",
    },
    {
      icon: <Code className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive("codeBlock"),
      title: "Code Block",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {tools.map((tool, i) => (
        <button
          key={i}
          type="button"
          title={tool.title}
          onClick={tool.action}
          className={cn(
            "p-1.5 rounded transition-colors",
            tool.active
              ? "bg-accent-soft text-accent-hover"
              : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
          )}
        >
          {tool.icon}
        </button>
      ))}
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        title="Upload Image"
        onClick={onImageUpload}
        disabled={uploading}
        className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        title="Embed YouTube Video"
        onClick={() => {
          setYoutubeInput(true);
          setTimeout(() => youtubeInputRef.current?.focus(), 50);
        }}
        className={cn(
          "p-1.5 rounded transition-colors",
          youtubeInput
            ? "bg-accent-soft text-accent-hover"
            : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
        )}
      >
        <Video className="h-3.5 w-3.5" />
      </button>
      {youtubeInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={youtubeInputRef}
            type="url"
            placeholder="Paste YouTube URL…"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitYoutube(); }
              if (e.key === "Escape") { setYoutubeInput(false); setYoutubeUrl(""); }
            }}
            className="h-6 w-52 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={submitYoutube}
            className="p-1 rounded text-accent hover:bg-accent-tint transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setYoutubeInput(false); setYoutubeUrl(""); }}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step List (Sortable) ─────────────────────────────────────────────────────

function SortableStepItem({
  step,
  idx,
  onTitleChange,
}: {
  step: StepData;
  idx: number;
  onTitleChange: (id: string, title: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(step.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === step.title) {
      setDraft(step.title);
      setEditing(false);
      return;
    }
    try {
      const res = await fetch(`/api/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error();
      onTitleChange(step.id, trimmed);
      router.refresh();
    } catch {
      toast("Failed to rename step", "error");
      setDraft(step.title);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(step.title);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging ? "z-50 opacity-60" : "")}
    >
      <Card
        className={cn(
          "group hover:border-accent-soft hover:shadow-sm transition-all",
          isDragging && "border-accent-soft shadow-lg",
          editing && "border-accent-soft"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
            {idx + 1}
          </span>
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); }
                if (e.key === "Escape") { e.preventDefault(); cancel(); }
              }}
              className="flex-1 min-w-0 text-xs font-medium bg-transparent border-b border-accent text-gray-900 outline-none"
            />
          ) : (
            <p
              className="text-xs font-medium text-gray-700 flex-1 truncate group-hover:text-accent transition-colors cursor-text flex items-center gap-1.5"
              title="Click to rename"
              onClick={() => { setDraft(step.title); setEditing(true); }}
            >
              <span className="truncate">{step.title}</span>
              {step.stepType === "PDF" && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-soft text-accent-hover flex-shrink-0">
                  PDF
                </span>
              )}
            </p>
          )}
          <DeleteStepButton stepId={step.id} stepTitle={step.title} />
        </div>
      </Card>
    </div>
  );
}

export function StepList({ steps: initialSteps }: { steps: StepData[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [steps, setSteps] = React.useState(initialSteps);

  // Keep in sync when server refreshes
  React.useEffect(() => { setSteps(initialSteps); }, [initialSteps]);

  const handleTitleChange = React.useCallback((id: string, title: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = steps.findIndex((s) => s.id === active.id);
    const newIdx = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIdx, newIdx).map((s, i) => ({ ...s, orderIndex: i }));

    setSteps(reordered); // optimistic

    try {
      const res = await fetch("/api/steps/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reordered.map(({ id, orderIndex }) => ({ id, orderIndex }))),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast("Failed to save order", "error");
      setSteps(initialSteps);
    }
  }

  if (steps.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {steps.map((step, idx) => (
            <SortableStepItem key={step.id} step={step} idx={idx} onTitleChange={handleTitleChange} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─── Step Editor ──────────────────────────────────────────────────────────────

interface StepEditorProps {
  steps: StepData[];
}

export function StepEditor({ steps }: StepEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = React.useState<StepData>(steps[0]);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  // Keep activeStep in sync with parent's serialized snapshot (e.g., after router.refresh)
  React.useEffect(() => {
    const match = steps.find((s) => s.id === activeStep.id);
    if (match) setActiveStep(match);
    else setActiveStep(steps[0]);
  }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Youtube.configure({ controls: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing step content..." }),
    ],
    content: activeStep.stepType === "CONTENT" ? activeStep.content : { type: "doc", content: [] },
    onUpdate: () => setDirty(true),
  });

  // Switch step content when active step changes (CONTENT only)
  React.useEffect(() => {
    if (editor && activeStep && activeStep.stepType === "CONTENT") {
      editor.commands.setContent(activeStep.content);
      setDirty(false);
    } else {
      setDirty(false);
    }
  }, [activeStep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveContent() {
    if (!editor || !dirty || activeStep.stepType !== "CONTENT") return;
    setSaving(true);
    try {
      const res = await fetch(`/api/steps/${activeStep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getJSON() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Step saved", "success");
      setDirty(false);
      router.refresh();
    } catch {
      toast("Failed to save step content", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";

    setUploading(true);
    try {
      const [result] = await uploadFiles("imageUploader", { files: [file] });
      editor.chain().focus().setImage({ src: result.ufsUrl }).run();
      setDirty(true);
      toast("Image uploaded", "success");
    } catch {
      toast("Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type !== "application/pdf") {
      toast("Please upload a PDF file", "error");
      return;
    }

    setUploading(true);
    try {
      const [result] = await uploadFiles("sopUploader", { files: [file] });
      const newContent: PdfStepContent = {
        type: "pdf",
        fileUrl: result.ufsUrl,
        fileName: file.name,
      };
      const res = await fetch(`/api/steps/${activeStep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to save PDF");
      toast("PDF uploaded", "success");
      router.refresh();
    } catch {
      toast("Failed to upload PDF", "error");
    } finally {
      setUploading(false);
    }
  }

  const pdfContent = activeStep.stepType === "PDF" ? (activeStep.content as PdfStepContent) : null;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfSelected}
      />
      {/* Step selector tabs */}
      {steps.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (dirty) {
                  if (confirm("Save changes before switching?")) saveContent().then(() => setActiveStep(step));
                  else { setActiveStep(step); setDirty(false); }
                } else {
                  setActiveStep(step);
                }
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors inline-flex items-center gap-1.5",
                activeStep.id === step.id
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-gray-600 border-gray-300 hover:border-accent-soft"
              )}
            >
              <span>{idx + 1}. {step.title.length > 24 ? step.title.slice(0, 24) + "…" : step.title}</span>
              {step.stepType === "PDF" && (
                <span className={cn(
                  "text-[9px] font-semibold px-1 py-0.5 rounded",
                  activeStep.id === step.id ? "bg-white/25 text-white" : "bg-accent-soft text-accent-hover"
                )}>PDF</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Editor or PDF upload, based on step type */}
      {activeStep.stepType === "CONTENT" ? (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <EditorToolbar
              editor={editor}
              onImageUpload={() => fileInputRef.current?.click()}
              uploading={uploading}
            />
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none min-h-[300px] p-4 focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
            />
          </div>
          {dirty && (
            <Button size="sm" loading={saving} onClick={saveContent}>
              <Save className="h-3.5 w-3.5" />
              Save Content
            </Button>
          )}
        </>
      ) : (
        <PdfStepUploader
          fileUrl={pdfContent?.fileUrl ?? null}
          fileName={pdfContent?.fileName ?? null}
          uploading={uploading}
          onUploadClick={() => pdfInputRef.current?.click()}
        />
      )}
    </div>
  );
}

// ─── PDF Step Uploader ────────────────────────────────────────────────────────

function PdfStepUploader({
  fileUrl,
  fileName,
  uploading,
  onUploadClick,
}: {
  fileUrl: string | null;
  fileName: string | null;
  uploading: boolean;
  onUploadClick: () => void;
}) {
  const [overlayOpen, setOverlayOpen] = React.useState(false);

  if (!fileUrl) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50/50">
        <div className="h-12 w-12 mx-auto rounded-full bg-accent-tint flex items-center justify-center mb-3">
          <FileTextIcon className="h-6 w-6 text-accent" />
        </div>
        <p className="text-sm font-medium text-gray-700">No PDF uploaded yet</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">PDF SOP only — no other content shown to trainees.</p>
        <Button size="sm" loading={uploading} onClick={onUploadClick}>
          <Upload className="h-3.5 w-3.5" />
          Upload PDF
        </Button>
        <p className="text-[10px] text-gray-400 mt-3">Max 16 MB · application/pdf</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tappable preview card — matches the trainee experience. */}
      <button
        type="button"
        onClick={() => setOverlayOpen(true)}
        className="group w-full text-left rounded-2xl border border-gray-200 bg-white hover:border-accent-soft hover:shadow-md transition-all p-5 flex items-center gap-4"
      >
        <div className="h-14 w-14 rounded-xl bg-accent-tint flex items-center justify-center flex-shrink-0">
          <FileTextIcon className="h-7 w-7 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {fileName ?? "SOP.pdf"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Maximize2 className="h-3 w-3" />
            Tap to open SOP
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-accent transition-colors flex-shrink-0" />
      </button>

      {/* Admin-only Replace control — sits below the card. */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" loading={uploading} onClick={onUploadClick}>
          <Upload className="h-3.5 w-3.5" />
          Replace PDF
        </Button>
      </div>

      {overlayOpen && (
        <AdminPdfOverlay
          fileUrl={fileUrl}
          fileName={fileName}
          onClose={() => setOverlayOpen(false)}
        />
      )}
    </div>
  );
}

function AdminPdfOverlay({
  fileUrl,
  fileName,
  onClose,
}: {
  fileUrl: string;
  fileName: string | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fileName ?? "SOP PDF"}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <FileTextIcon className="h-4 w-4 text-white/70 flex-shrink-0" />
        <p className="text-sm font-medium truncate flex-1">
          {fileName ?? "SOP.pdf"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close PDF"
          className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 transition-colors flex items-center justify-center flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex-1 px-2 pb-2 sm:px-4 sm:pb-4 min-h-0"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={fileUrl}
          title={fileName ?? "SOP PDF"}
          className="w-full h-full rounded-lg bg-white shadow-2xl block"
        >
          <p className="p-4 text-sm text-gray-500">
            Your browser cannot display this PDF inline.
          </p>
        </iframe>
      </div>
    </div>
  );
}

// ─── Add Step Button ──────────────────────────────────────────────────────────

interface AddStepButtonProps {
  topicId: string;
}

export function AddStepButton({ topicId }: AddStepButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [stepType, setStepType] = React.useState<StepType>("CONTENT");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, title: title.trim(), stepType }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create step");
      }
      toast("Step created", "success");
      setOpen(false);
      setTitle("");
      setStepType("CONTENT");
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
        <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-accent hover:bg-accent-tint">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add Step</DialogTitle>
          <DialogDescription>Choose what kind of step this is, then give it a title.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Step Type</label>
            <Select value={stepType} onValueChange={(v) => setStepType(v as StepType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTENT">Content — rich text, video, images</SelectItem>
                <SelectItem value="PDF">PDF SOP — upload a PDF file</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-400">
              {stepType === "CONTENT"
                ? "Build the step with the rich-text editor (best for written SOPs and walkthroughs)."
                : "Just upload a PDF. Trainees view the PDF in-page; no other content is shown."}
            </p>
          </div>
          <Input
            label="Step Title"
            placeholder={stepType === "PDF" ? "e.g. Cabinet Cleaning SOP" : "e.g. Understanding PPE Requirements"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading} disabled={!title.trim()}>
              Add Step
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Step Button ───────────────────────────────────────────────────────

interface DeleteStepButtonProps {
  stepId: string;
  stepTitle: string;
}

export function DeleteStepButton({ stepId, stepTitle }: DeleteStepButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/steps/${stepId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete step");
      toast("Step deleted", "success");
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
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-400 rounded"
          title="Delete step"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Step</DialogTitle>
          <DialogDescription>
            Delete{" "}
            <span className="font-medium text-gray-900">&ldquo;{stepTitle}&rdquo;</span>?
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={handleDelete}>
            Delete Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Topic Form ──────────────────────────────────────────────────────────

interface EditTopicFormProps {
  topic: { id: string; title: string; description: string };
}

export function EditTopicForm({ topic }: EditTopicFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [title, setTitle] = React.useState(topic.title);
  const [description, setDescription] = React.useState(topic.description);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Topic updated", "success");
      setDirty(false);
      router.refresh();
    } catch {
      toast("Failed to save topic settings", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        required
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
        rows={3}
        placeholder="What this topic covers..."
      />
      {dirty && (
        <Button type="submit" size="sm" loading={loading} className="w-full">
          Save Changes
        </Button>
      )}
    </form>
  );
}

// ─── Create Quiz Button ───────────────────────────────────────────────────────

interface CreateQuizButtonProps {
  topicId: string;
}

export function CreateQuizButton({ topicId }: CreateQuizButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [passingScore, setPassingScore] = React.useState(80);
  const [maxAttempts, setMaxAttempts] = React.useState(3);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, passingScore, maxAttempts }),
      });
      if (!res.ok) throw new Error("Failed to create quiz");
      toast("Quiz created", "success");
      setOpen(false);
      router.refresh();
    } catch {
      toast("Failed to create quiz", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Add Quiz
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create Quiz</DialogTitle>
          <DialogDescription>Configure quiz settings. You can add questions after creation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Passing Score (%)"
            type="number"
            min={1}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
          />
          <Input
            label="Max Attempts"
            type="number"
            min={1}
            max={10}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading}>Create Quiz</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quiz Builder ─────────────────────────────────────────────────────────────

interface QuizBuilderProps {
  quiz: QuizData;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "MULTIPLE_SELECT", label: "Multiple Select" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "WRITTEN_RESPONSE", label: "Written Response" },
];

function defaultQuestion(orderIndex: number): QuizQuestion {
  return {
    text: "",
    type: "MULTIPLE_CHOICE",
    options: ["", ""],
    correctAnswer: null,
    orderIndex,
  };
}

export function QuizBuilder({ quiz }: QuizBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const [passingScore, setPassingScore] = React.useState(quiz.passingScore);
  const [maxAttempts, setMaxAttempts] = React.useState(quiz.maxAttempts);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(
    quiz.questions.length > 0 ? quiz.questions : []
  );

  function mark() { setDirty(true); }

  function addQuestion() {
    setQuestions((prev) => [...prev, defaultQuestion(prev.length)]);
    mark();
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderIndex: i })));
    mark();
  }

  function updateQuestion(idx: number, updates: Partial<QuizQuestion>) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
    mark();
  }

  function addOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...(q.options ?? []), ""] } : q
      )
    );
    mark();
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: (q.options ?? []).map((o, j) => (j === oIdx ? value : o)) }
          : q
      )
    );
    mark();
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: (q.options ?? []).filter((_, j) => j !== oIdx) } : q
      )
    );
    mark();
  }

  function handleTypeChange(qIdx: number, type: QuestionType) {
    const q = questions[qIdx];
    let options: string[] | null = q.options;
    let correctAnswer: string | string[] | null = null;

    if (type === "TRUE_FALSE") {
      options = ["True", "False"];
      correctAnswer = null;
    } else if (type === "MULTIPLE_CHOICE") {
      options = q.options?.length ? q.options : ["", ""];
      correctAnswer = null;
    } else if (type === "MULTIPLE_SELECT") {
      options = q.options?.length ? q.options : ["", ""];
      correctAnswer = [];
    } else if (type === "WRITTEN_RESPONSE") {
      options = null;
      correctAnswer = null;
    }

    updateQuestion(qIdx, { type, options, correctAnswer });
  }

  function toggleMultiSelectAnswer(qIdx: number, option: string) {
    const q = questions[qIdx];
    const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
    const updated = current.includes(option)
      ? current.filter((a) => a !== option)
      : [...current, option];
    updateQuestion(qIdx, { correctAnswer: updated });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) {
        toast(`Question ${i + 1} needs a question text`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passingScore, maxAttempts, questions }),
      });
      if (!res.ok) throw new Error("Failed to save quiz");
      toast("Quiz saved", "success");
      setDirty(false);
      router.refresh();
    } catch {
      toast("Failed to save quiz", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Quiz settings row */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Passing Score (%)"
          type="number"
          min={1}
          max={100}
          value={passingScore}
          onChange={(e) => { setPassingScore(Number(e.target.value)); mark(); }}
        />
        <Input
          label="Max Attempts"
          type="number"
          min={1}
          max={10}
          value={maxAttempts}
          onChange={(e) => { setMaxAttempts(Number(e.target.value)); mark(); }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Questions ({questions.length})
          </h3>
          <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="h-3.5 w-3.5" />
            Add Question
          </Button>
        </div>

        {questions.length === 0 && (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
            <p className="text-xs text-gray-400">No questions yet. Add one to get started.</p>
          </div>
        )}

        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50"
          >
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-hover flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                {qIdx + 1}
              </span>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Question text..."
                  value={q.text}
                  onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                  rows={2}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Question Type</label>
                  <Select
                    value={q.type}
                    onValueChange={(v) => handleTypeChange(qIdx, v as QuestionType)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Options for MC / MS / TF */}
                {(q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_SELECT" || q.type === "TRUE_FALSE") && q.options && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">
                      Options{q.type === "MULTIPLE_CHOICE" ? " (select correct answer)" : q.type === "MULTIPLE_SELECT" ? " (select all correct)" : ""}
                    </label>
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        {/* Correct answer selector */}
                        {q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE" ? (
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIdx, { correctAnswer: opt || String(oIdx) })}
                            className={cn(
                              "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
                              q.correctAnswer === opt || q.correctAnswer === String(oIdx)
                                ? "border-accent bg-accent"
                                : "border-gray-300"
                            )}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleMultiSelectAnswer(qIdx, opt || String(oIdx))}
                            className={cn(
                              "w-4 h-4 rounded border-2 flex-shrink-0 transition-colors",
                              Array.isArray(q.correctAnswer) && (q.correctAnswer.includes(opt) || q.correctAnswer.includes(String(oIdx)))
                                ? "border-accent bg-accent"
                                : "border-gray-300"
                            )}
                          />
                        )}

                        {q.type === "TRUE_FALSE" ? (
                          <span className="text-sm text-gray-700">{opt}</span>
                        ) : (
                          <input
                            className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder={`Option ${oIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          />
                        )}

                        {q.type !== "TRUE_FALSE" && q.options && q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(qIdx, oIdx)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.type !== "TRUE_FALSE" && (
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        className="text-xs text-accent hover:text-accent flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add option
                      </button>
                    )}
                  </div>
                )}

                {q.type === "WRITTEN_RESPONSE" && (
                  <p className="text-xs text-gray-400 italic">
                    Written responses are graded manually or auto-accepted.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {dirty && (
        <Button type="submit" loading={loading} className="w-full">
          <Save className="h-4 w-4" />
          Save Quiz
        </Button>
      )}
    </form>
  );
}

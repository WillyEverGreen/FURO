"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import FileUploader from "./FileUploader";
import type { Section, FileMeta } from "@/types";
import { formatBytes } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  section: Section;
  isEditMode: boolean;
  pageSlug: string;
  editToken: string;
  onUpdate: (updated: Section) => void;
  onDelete: (id: string) => void;
}

function CopyIcon({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={copy}
      title="Copy content"
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function SectionCard({
  section,
  isEditMode,
  pageSlug,
  editToken,
  onUpdate,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(section.title ?? "");
  const [content, setContent] = useState(section.content ?? "");
  const [files, setFiles] = useState<FileMeta[]>(section.files ?? []);
  const [preview, setPreview] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    onUpdate({ ...section, title: v, content, files });
  };

  const handleContentChange = (v: string) => {
    setContent(v);
    onUpdate({ ...section, title, content: v, files });
  };

  const handleFileUploaded = (file: FileMeta) => {
    const updated = [...files, file];
    setFiles(updated);
    onUpdate({ ...section, title, content, files: updated });
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFile(fileId);
    await fetch(`/api/file/${fileId}`, {
      method: "DELETE",
      headers: { "x-edit-token": editToken, "x-page-slug": pageSlug },
    });
    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    onUpdate({ ...section, title, content, files: updated });
    setDeletingFile(null);
  };

  return (
    <div className={`group animate-fade-in rounded-lg border border-border/40 bg-[#0f0f0f] p-8 space-y-6 focus-within:border-primary/30 transition-all`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        {isEditMode ? (
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="SECTION TITLE (OPTIONAL)"
            className="flex-1 bg-transparent border-b border-transparent focus:border-border/40 rounded-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 text-foreground text-[10px] font-bold uppercase tracking-[0.2em]"
          />
        ) : (
          <h2 className="flex-1 text-sm font-semibold text-foreground tracking-wide pb-2 border-b border-border">
            {title || "Untitled Section"}
          </h2>
        )}

        {content && !isEditMode && <CopyIcon text={content} />}

        {isEditMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreview((p) => !p)}
              className="text-xs text-muted-foreground h-7"
            >
              {preview ? "Edit" : "Preview"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(section.id)}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-7"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditMode && !preview ? (
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Type something..."
          className="min-h-[300px] resize-none bg-[#0a0a0a] border-border/40 px-4 py-4 focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground/90 font-mono text-[13px] leading-relaxed shadow-sm"
        />
      ) : (
        <div className="prose-rentry text-sm text-secondary-foreground font-mono">
          {content ? (
            <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm italic">No content.</p>
          )}
        </div>
      )}

      {/* Files */}
      {(files.length > 0 || isEditMode) && (
        <div className="mt-4 pt-4 border-t border-border">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="group/file flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-xs text-muted-foreground hover:bg-secondary/70 transition-colors"
                >
                  <a
                    href={f.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 flex-1 min-w-0"
                    title={`Download ${f.file_name}`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground/70">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span className="max-w-[160px] truncate text-foreground hover:underline decoration-white/30 underline-offset-2">{f.file_name}</span>
                    <span className="opacity-50 shrink-0">{formatBytes(f.file_size)}</span>
                  </a>

                  {isEditMode && (
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      disabled={deletingFile === f.id}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      title="Remove file"
                    >
                      {deletingFile === f.id ? (
                        <span className="spinner" style={{ width: 10, height: 10 }} />
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditMode && files.length < 5 && (
            <FileUploader
              sectionId={section.id}
              pageSlug={pageSlug}
              editToken={editToken}
              onUploaded={handleFileUploaded}
            />
          )}
          {isEditMode && files.length >= 5 && (
            <p className="text-xs text-muted-foreground py-2 tracking-wide">Max 5 files per section reached.</p>
          )}
        </div>
      )}
    </div>
  );
}

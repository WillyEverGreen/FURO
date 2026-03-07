"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import FileUploader from "./FileUploader";
import type { Section, FileMeta } from "@/types";

interface Props {
  section: Section;
  isEditMode: boolean;
  pageSlug: string;
  editToken: string;
  onUpdate: (updated: Section) => void;
  onDelete: (id: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function CopyIcon({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
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
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-md hover:bg-[#222] text-[#555] hover:text-white"
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
    <div className={`card group animate-fade-in ${isEditMode ? "card-edit" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {isEditMode ? (
          <input
            className="flex-1 bg-transparent text-white text-sm font-semibold outline-none border-b border-[#2a2a2a] focus:border-[#555] pb-1 transition-all duration-200 placeholder-[#444]"
            placeholder="Section title…"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
        ) : (
          <h2 className="flex-1 text-sm font-semibold text-white">{title || "Untitled Section"}</h2>
        )}

        {/* Copy icon – shown on hover in read mode, always shown in edit mode */}
        {content && <CopyIcon text={content} />}

        {isEditMode && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreview((p) => !p)}
              className="btn-ghost text-xs px-2 py-1"
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              onClick={() => onDelete(section.id)}
              className="btn-danger text-xs px-2 py-1"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditMode && !preview ? (
        <textarea
          className="input font-mono text-sm"
          placeholder="Write markdown here…"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={8}
        />
      ) : (
        <div className="prose-rentry">
          {content ? (
            <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-[#444] text-sm italic">No content yet.</p>
          )}
        </div>
      )}

      {/* Files – shown as name badges only, no URLs */}
      {(files.length > 0 || isEditMode) && (
        <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="group/file flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-xs text-[#888]"
                >
                  {/* File icon */}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#555]">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  <span className="max-w-[160px] truncate text-[#aaa]">{f.file_name}</span>
                  <span className="text-[#444] shrink-0">{formatBytes(f.file_size)}</span>

                  {isEditMode && (
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      disabled={deletingFile === f.id}
                      className="ml-1 text-[#444] hover:text-red-400 transition-colors"
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
            <p className="text-xs text-[#555] text-center py-2">Max 5 files per section reached.</p>
          )}
        </div>
      )}
    </div>
  );
}

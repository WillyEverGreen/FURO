"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Must be array-ified synchronously BEFORE state update, because
    // the source might be cleared (e.g. e.target.value = "") immediately after.
    const newFiles = Array.from(files);

    setSelectedFiles((prev) => {
      const merged = [...prev];
      for (const file of newFiles) {
        const exists = merged.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified,
        );
        if (!exists) merged.push(file);
      }
      return merged;
    });
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (target: File) => {
    setSelectedFiles((prev) =>
      prev.filter(
        (file) =>
          !(
            file.name === target.name &&
            file.size === target.size &&
            file.lastModified === target.lastModified
          ),
      ),
    );
  };

  const getFirstSectionId = async (
    createdSlug: string,
    pagePassword?: string,
  ) => {
    const headers: Record<string, string> = {};
    if (pagePassword) headers["x-page-password"] = pagePassword;

    const res = await fetch(`/api/page/${createdSlug}`, { headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch page sections for upload");
    }

    const firstSection = data.page?.sections?.[0];
    if (!firstSection?.id) {
      throw new Error("No section available for file uploads");
    }

    return firstSection.id as string;
  };

  const uploadSelectedFiles = async (
    sectionId: string,
    createdSlug: string,
    createdEditToken: string,
  ) => {
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File \"${file.name}\" is too large (max 50 MB)`);
      }

      const urlRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          page_slug: createdSlug,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        throw new Error(
          urlData.error || `Failed to prepare upload for ${file.name}`,
        );
      }

      const { file_path, token } = urlData;

      const { error: uploadErr } = await supabaseBrowser.storage
        .from("uploads")
        .uploadToSignedUrl(file_path, token, file);

      if (uploadErr) {
        throw new Error(`Upload failed for ${file.name}: ${uploadErr.message}`);
      }

      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          file_name: file.name,
          file_path,
          file_size: file.size,
          edit_token: createdEditToken,
          page_slug: createdSlug,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || `Failed to confirm ${file.name}`);
      }
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        slug: slug.trim() || undefined,
        password: password || undefined,
        content: content || "Empty page.",
        expiration,
      };

      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create page");
      }

      const createdSlug: string = data.slug;
      const createdEditToken: string = data.edit_token;

      if (selectedFiles.length > 0) {
        const firstSectionId = await getFirstSectionId(
          createdSlug,
          password || undefined,
        );
        await uploadSelectedFiles(
          firstSectionId,
          createdSlug,
          createdEditToken,
        );
      }

      router.push(`/${createdSlug}?edit=${createdEditToken}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">
        rentry
      </h1>
      <p className="text-muted-foreground text-sm mb-10">
        anonymous text and file sharing
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
            Custom URL (optional)
          </label>
          <Input
            suppressHydrationWarning
            autoComplete="off"
            spellCheck="false"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-page-slug"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
            Content (Markdown)
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your markdown here..."
            rows={12}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono text-sm resize-y"
            disabled={loading}
          />
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors group ${
            dragging
              ? "border-ring bg-muted/20"
              : "border-border hover:border-ring"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
          }}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInput}
            disabled={loading}
          />
          <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-foreground transition-colors" />
          <p className="text-xs text-muted-foreground group-hover:text-secondary-foreground transition-colors">
            Drop files here or click to attach
          </p>
          {selectedFiles.length > 0 && (
            <div className="mt-3 rounded-md border border-border/80 bg-muted/20 p-3 text-left">
              <p className="mb-2 text-xs font-medium text-foreground">
                Attached files ({selectedFiles.length})
              </p>
              <ul className="space-y-1.5">
                {selectedFiles.map((file) => (
                  <li
                    key={`${file.name}-${file.lastModified}-${file.size}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span
                      className="truncate text-foreground"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file);
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Password (optional)
            </label>
            <Input
              suppressHydrationWarning
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Edit password"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
              Expiration
            </label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
            >
              <option value="never">Never</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-card border border-border text-foreground hover:bg-accent active:scale-[0.98] transition-all"
        >
          {loading ? "Creating..." : "Create Page"}
        </Button>
      </div>
    </div>
  );
}

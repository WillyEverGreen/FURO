"use client";

import { useState, useCallback } from "react";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import type { FileMeta } from "@/types";

interface Props {
  sectionId: string;
  pageSlug: string;
  editToken: string;
  onUploaded: (file: FileMeta) => void;
}

export default function FileUploader({ sectionId, pageSlug, editToken, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File too large (max 50 MB).");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Step 1: Request signed upload URL
      const urlRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          page_slug: pageSlug,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) { setError(urlData.error ?? "Failed to get upload URL."); return; }

      const { signed_url, file_path } = urlData;

      // Step 2: Upload directly to Supabase Storage
      const uploadRes = await fetch(signed_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) { setError("Upload to storage failed."); return; }

      // Step 3: Confirm and record metadata
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          file_name: file.name,
          file_path,
          file_size: file.size,
          edit_token: editToken,
          page_slug: pageSlug,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) { setError(confirmData.error ?? "Failed to confirm upload."); return; }

      onUploaded(confirmData.file);
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [sectionId, pageSlug, editToken]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="mt-3">
      <label
        className={`drop-zone block ${dragging ? "active" : ""} ${uploading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="sr-only"
          onChange={onFileInput}
          disabled={uploading}
        />
        {uploading ? (
          <span className="flex items-center justify-center gap-2 text-[#888]">
            <span className="spinner" /> Uploading…
          </span>
        ) : (
          <>
            <p className="font-medium">Drop file here or click to upload</p>
            <p className="text-xs mt-1 text-[#444]">Any file type · Max 50 MB</p>
          </>
        )}
      </label>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

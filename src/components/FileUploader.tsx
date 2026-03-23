"use client";

import { useState, useCallback } from "react";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import type { FileMeta } from "@/types";
import { supabaseBrowser } from "@/lib/supabase-browser";

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
      console.log("[Upload] Step 1: Requesting signed URL...");
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
      console.log("[Upload] Step 1 Response:", urlRes.status, urlData);
      if (!urlRes.ok) { setError(urlData.error ?? "Failed to get upload URL."); return; }

      const { file_path, token } = urlData;

      console.log(`[Upload] Step 2: Uploading directly to Supabase storage (${file_path})...`);
      // Step 2: Upload directly to Supabase Storage using the JS client (handles headers correctly)
      const { data: uploadData, error: uploadErr } = await supabaseBrowser.storage
        .from("uploads")
        .uploadToSignedUrl(file_path, token, file);
        
      if (uploadErr) {
        console.error("[Upload] Supabase Upload Error:", uploadErr);
        setError(`Upload failed: ${uploadErr.message || "Unknown error"}`);
        return;
      }
      console.log("[Upload] Step 2 Success. Upload data:", uploadData);

      console.log("[Upload] Step 3: Confirming upload and saving metadata...");
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
      console.log("[Upload] Step 3 Response:", confirmRes.status, confirmData);
      if (!confirmRes.ok) { setError(confirmData.error ?? "Failed to confirm upload."); return; }

      console.log("[Upload] Finished successfully!");
      onUploaded(confirmData.file);
    } catch (err) {
      console.error("[Upload] Caught Exception:", err);
      setError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const inputId = `file-upload-${sectionId}`;

  return (
    <div className="mt-3">
      <label
        htmlFor={inputId}
        className={`block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-ring hover:bg-muted/10"
        } ${uploading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
      >
        <input
          id={inputId}
          type="file"
          className="sr-only"
          onChange={onFileInput}
          disabled={uploading}
        />
        {uploading ? (
          <span className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="spinner" /> Uploading…
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <p className="font-medium text-sm text-foreground">Drop file here or click to upload</p>
            <p className="text-xs text-muted-foreground">Any file type · Max 50 MB</p>
          </div>
        )}
      </label>
      {error && <p className="text-destructive text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

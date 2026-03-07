"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SLUG_REGEX } from "@/lib/constants";

export default function CreateForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editToken, setEditToken] = useState("");

  const validate = () => {
    if (!slug) return "Slug is required.";
    if (!SLUG_REGEX.test(slug))
      return "Slug must be 3-50 chars: letters, numbers, hyphens, underscores.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password, expiration, content }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }

      const { edit_token } = data;
      setEditToken(edit_token);

      // Set secure cookie via server
      await fetch("/api/auth/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, edit_token }),
      });

      // Redirect to page (token only used for cookie setup, not in URL permanently)
      router.push(`/${slug}?edit=${edit_token}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      {/* Slug */}
      <div>
        <label className="block text-xs text-[#888] mb-1.5 font-medium tracking-wide uppercase">
          Page URL
        </label>
        <div className="flex items-center gap-0 rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden focus-within:border-white transition-all duration-200">
          <span className="px-3 py-3 text-[#555] text-sm select-none shrink-0">mysite.com/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="project-notes"
            className="flex-1 bg-transparent outline-none py-3 pr-4 text-sm text-white placeholder-[#444]"
            required
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs text-[#888] mb-1.5 font-medium tracking-wide uppercase">
          Content (supports Markdown)
        </label>
        <textarea
          className="input"
          placeholder="# My Notes&#10;&#10;Start typing here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
        />
      </div>

      {/* Options row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#888] mb-1.5 font-medium tracking-wide uppercase">
            Password (optional)
          </label>
          <input
            type="password"
            className="input"
            placeholder="Leave empty for public"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1.5 font-medium tracking-wide uppercase">
            Expires
          </label>
          <select
            className="input appearance-none cursor-pointer"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
          >
            <option value="never">Never</option>
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
            <option value="1w">1 Week</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-900/50 rounded-lg px-4 py-2 bg-red-950/20">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
        {loading ? <><span className="spinner" /> Creating…</> : "Create Page →"}
      </button>
    </form>
  );
}

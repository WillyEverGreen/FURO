"use client";

import { useState } from "react";

interface Props {
  slug: string;
  onSuccess: (password: string) => void;
}

export default function PasswordPrompt({ slug, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/page/${slug}`, {
      headers: { "x-page-password": password },
    });

    if (res.ok) {
      onSuccess(password);
    } else {
      const data = await res.json();
      setError(data.error ?? "Incorrect password.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="text-lg font-semibold">Password Protected</h2>
          <p className="text-[#888] text-sm mt-1">Enter the password to view this page.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            className="input"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-center mt-2">
            <button type="submit" className="btn btn-primary px-6 py-2" disabled={loading}>
              {loading ? <><span className="spinner" /> Verifying…</> : "Unlock →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

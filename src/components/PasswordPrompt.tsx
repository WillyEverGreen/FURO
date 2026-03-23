"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  slug: string;
  onSuccess: (password: string) => void;
  mode?: "view" | "edit";
}

export default function PasswordPrompt({ slug, onSuccess, mode = "view" }: Props) {
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
    <div className="animate-fade-in min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground uppercase tracking-widest mb-1">
            Password Required
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This page is protected. Enter the password to {mode === "edit" ? "access the editor" : "view the content"}.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 block ml-1">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="bg-[#0f0f0f] border-border/40 text-foreground placeholder:text-muted-foreground/20 h-11"
            />
            {error && <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider pt-1">{error}</p>}
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#111] border border-border/60 text-foreground hover:bg-[#1a1a1a] h-12 text-xs font-bold uppercase tracking-[0.3em] transition-all shadow-sm"
          >
            {loading ? "Verifying..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}

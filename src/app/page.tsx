import CreateForm from "@/components/CreateForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rentry – Create a New Page",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Logo / Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-[#2a2a2a] bg-[#111] mb-6">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Rentry</h1>
        <p className="text-[#888] text-base max-w-sm mx-auto leading-relaxed">
          Anonymous clipboard for text, markdown, and files.
          <br />No account. No tracking.
        </p>
      </div>

      {/* Create Form */}
      <div className="w-full max-w-lg">
        <div className="card">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-widest mb-5">
            New Page
          </h2>
          <CreateForm />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-[#333]">
        Pages can be password-protected · Files up to 50 MB · Optional expiration
      </p>
    </main>
  );
}

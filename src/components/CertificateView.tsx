import { useState } from "react";

interface CertificateViewProps {
  title: string;
  terms: string;
  sealedAt: number;
  creatorName: string;
  guestName?: string;
  contractUrl: string;
}

export function CertificateView({
  title, terms, sealedAt, creatorName, guestName, contractUrl
}: CertificateViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displaySealedAt = new Date(sealedAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg border border-zinc-800 rounded-2xl overflow-hidden">

        {/* Header band */}
        <div
          className="px-10 py-9 text-center flex flex-col items-center gap-3 border-b border-indigo-900"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}
        >
          <div className="text-4xl">🎉</div>
          <h1 className="font-serif text-2xl font-bold text-zinc-50 leading-tight">{title}</h1>
          <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1 text-[11px] font-bold text-green-400 uppercase tracking-widest">
            ✓ Sealed
          </span>
        </div>

        {/* Body */}
        <div className="bg-zinc-950 px-10 py-8 flex flex-col gap-6">

          {/* Terms */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-2">
              Terms
            </p>
            <p className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed">{terms}</p>
          </div>

          <div className="h-px bg-zinc-900" />

          {/* Parties */}
          <div className="flex gap-4">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Creator</p>
              <p className="text-sm font-semibold text-zinc-50">{creatorName}</p>
              <p className="text-[11px] text-green-400 mt-0.5">✓ Signed</p>
            </div>
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Guest</p>
              <p className="text-sm font-semibold text-zinc-50">{guestName || "Guest"}</p>
              <p className="text-[11px] text-green-400 mt-0.5">✓ Signed</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-center text-xs text-zinc-700">{displaySealedAt}</p>

          <div className="h-px bg-zinc-900" />

          {/* Permalink */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-[11px] text-zinc-600 font-mono truncate">{contractUrl}</code>
            <button
              onClick={handleCopy}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition-colors"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function HomePage() {
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createContract = useMutation(api.contracts.createContract);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !terms.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const id = await createContract({ title: title.trim(), terms: terms.trim() });
      navigate(`/c/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-12 gap-10">

      {/* Hero */}
      <div className="text-center flex flex-col gap-3">
        <div className="text-5xl">🤝</div>
        <h1 className="font-serif text-5xl font-black tracking-tight text-zinc-50 leading-none">
          Handshake
        </h1>
        <p className="text-base text-zinc-500 max-w-xs mx-auto leading-relaxed">
          Create a micro-contract. Negotiate in real time. Seal it together.
        </p>
      </div>

      {/* Gradient rule */}
      <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <SignedOut>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-600">Sign in to create a contract</p>
          <SignInButton mode="modal">
            <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Contract title
            </label>
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Freelance Design Work — April 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Terms
            </label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Describe the agreement…"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={5}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !title.trim() || !terms.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors"
          >
            {loading ? "Creating…" : "Create & Get Link →"}
          </button>
        </form>
      </SignedIn>

      <p className="text-[11px] uppercase tracking-widest text-zinc-800">
        Sealed contracts are permanent &amp; immutable
      </p>
    </div>
  );
}

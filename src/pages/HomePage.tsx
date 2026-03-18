import { useState } from "react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function HomePage() {
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const createContract = useMutation(api.contracts.createContract);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !terms.trim()) return;
    setLoading(true);
    try {
      const id = await createContract({ title: title.trim(), terms: terms.trim() });
      navigate(`/c/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">🤝 Handshake</h1>
        <p className="text-muted-foreground mt-2">Create a micro-contract. Negotiate. Seal it together.</p>
      </div>

      <SignedOut>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Sign in to create a contract</p>
          <SignInButton mode="modal">
            <button className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg">
          <div>
            <label className="text-sm font-medium mb-1 block">Contract title</label>
            <input
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. Freelance Design Work — April 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Terms</label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Describe the agreement…"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !title.trim() || !terms.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create & Get Link →"}
          </button>
        </form>
      </SignedIn>
    </div>
  );
}

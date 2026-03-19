import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import type { HoldState } from "../hooks/useHoldToSeal";
import { PresenceDots } from "./PresenceDots";
import { HoldButton } from "./HoldButton";

interface TermsEditorProps {
  contractId: Id<"contracts">;
  title: string;
  terms: string;
  role: Role;
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
  holdState: HoldState;
  progress: number;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function TermsEditor({
  contractId, title, terms, role,
  creatorLastSeen, guestLastSeen,
  holdState, progress, onPressStart, onPressEnd,
}: TermsEditorProps) {
  const updateTerms = useMutation(api.contracts.updateTerms);
  const [localTitle, setLocalTitle] = useState(title);
  const [localTerms, setLocalTerms] = useState(terms);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);
  useEffect(() => { setLocalTerms(terms); }, [terms]);

  const isCreator = role === "creator";

  const save = useCallback((t: string, tm: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateTerms({ contractId, title: t, terms: tm });
    }, 500);
  }, [contractId, updateTerms]);

  return (
    <div className="flex flex-col gap-4 h-full p-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
          Contract
        </span>
        <PresenceDots creatorLastSeen={creatorLastSeen} guestLastSeen={guestLastSeen} />
      </div>

      {/* Title */}
      <div className="flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1.5">
          Title
        </div>
        <input
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors read-only:cursor-default"
          value={localTitle}
          onChange={(e) => { setLocalTitle(e.target.value); save(e.target.value, localTerms); }}
          readOnly={!isCreator}
          placeholder="Contract title"
        />
      </div>

      {/* Terms */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1.5 flex-shrink-0">
          Terms
        </div>
        <textarea
          className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-400 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed read-only:cursor-default"
          value={localTerms}
          onChange={(e) => { setLocalTerms(e.target.value); save(localTitle, e.target.value); }}
          readOnly={!isCreator}
          placeholder="Terms…"
        />
      </div>

      {/* Hold button */}
      {(role === "creator" || role === "guest") && (
        <div className="flex-shrink-0">
          <HoldButton
            holdState={holdState}
            progress={progress}
            onPressStart={onPressStart}
            onPressEnd={onPressEnd}
          />
        </div>
      )}
    </div>
  );
}

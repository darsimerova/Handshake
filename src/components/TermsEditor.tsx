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
  contractId,
  title,
  terms,
  role,
  creatorLastSeen,
  guestLastSeen,
  holdState,
  progress,
  onPressStart,
  onPressEnd,
}: TermsEditorProps) {
  const updateTerms = useMutation(api.contracts.updateTerms);
  const [localTitle, setLocalTitle] = useState(title);
  const [localTerms, setLocalTerms] = useState(terms);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when Convex pushes a remote update (other party's edit)
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
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contract
        </span>
        <PresenceDots creatorLastSeen={creatorLastSeen} guestLastSeen={guestLastSeen} />
      </div>

      <input
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
        value={localTitle}
        onChange={(e) => { setLocalTitle(e.target.value); save(e.target.value, localTerms); }}
        readOnly={!isCreator}
        placeholder="Contract title"
      />

      <textarea
        className="flex-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        value={localTerms}
        onChange={(e) => { setLocalTerms(e.target.value); save(localTitle, e.target.value); }}
        readOnly={!isCreator}
        placeholder="Terms…"
        rows={8}
      />

      {(role === "creator" || role === "guest") && (
        <HoldButton
          holdState={holdState}
          progress={progress}
          onPressStart={onPressStart}
          onPressEnd={onPressEnd}
        />
      )}
    </div>
  );
}

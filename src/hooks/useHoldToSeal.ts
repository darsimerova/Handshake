import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type HoldState = "idle" | "oneHolding" | "bothHolding" | "sealed";

interface UseHoldToSealOptions {
  contractId: Id<"contracts">;
  role: "creator" | "guest";
  creatorHoldStart: number | null;
  guestHoldStart: number | null;
  status: "negotiating" | "sealed";
}

export function useHoldToSeal({
  contractId,
  role,
  creatorHoldStart,
  guestHoldStart,
  status,
}: UseHoldToSealOptions) {
  const setHold = useMutation(api.contracts.setHold);
  const clearHold = useMutation(api.contracts.clearHold);
  const sealContract = useMutation(api.contracts.sealContract);

  // 0–1 progress for the countdown fill animation
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const sealCalledRef = useRef(false);

  const myHoldStart = role === "creator" ? creatorHoldStart : guestHoldStart;
  const otherHoldStart = role === "creator" ? guestHoldStart : creatorHoldStart;
  const bothHolding = myHoldStart !== null && otherHoldStart !== null;

  useEffect(() => {
    if (!bothHolding) {
      setProgress(0);
      sealCalledRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const overlapStart = Math.max(creatorHoldStart!, guestHoldStart!);

    const tick = () => {
      const elapsed = Date.now() - overlapStart;
      setProgress(Math.min(elapsed / 3000, 1));

      if (elapsed >= 3000 && !sealCalledRef.current) {
        sealCalledRef.current = true;
        sealContract({ contractId });
        return;
      }

      if (elapsed < 3000) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [bothHolding, creatorHoldStart, guestHoldStart]);

  const holdState: HoldState =
    status === "sealed" ? "sealed"
    : bothHolding ? "bothHolding"
    : myHoldStart !== null || otherHoldStart !== null ? "oneHolding"
    : "idle";

  const handlePressStart = useCallback(() => {
    if (status !== "negotiating") return;
    setHold({ contractId, role });
  }, [contractId, role, status]);

  const handlePressEnd = useCallback(() => {
    clearHold({ contractId, role });
  }, [contractId, role]);

  return { holdState, progress, handlePressStart, handlePressEnd };
}

import { useState, useEffect } from "react";

const ONLINE_MS = 30_000;

interface PresenceDotsProps {
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
}

export function PresenceDots({ creatorLastSeen, guestLastSeen }: PresenceDotsProps) {
  // Re-render every 10s so dots go stale accurately without waiting for a Convex update
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const creatorOnline = creatorLastSeen !== null && now - creatorLastSeen < ONLINE_MS;
  const guestOnline = guestLastSeen !== null && now - guestLastSeen < ONLINE_MS;

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${creatorOnline ? "bg-indigo-500" : "bg-muted"}`} />
        Creator
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${guestOnline ? "bg-green-500" : "bg-muted"}`} />
        Guest
      </span>
    </div>
  );
}

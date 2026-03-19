import { useParams } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { useContract } from "../hooks/useContract";
import { useIdentity } from "../hooks/useIdentity";
import { NegotiationView } from "../components/NegotiationView";
import { CertificateView } from "../components/CertificateView";
import { ObserverView } from "../components/ObserverView";

export function ContractPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const contract = useContract(contractId as Id<"contracts">);
  const { role, sessionId } = useIdentity(contractId as Id<"contracts">, contract ?? null);

  if (contract === undefined || role === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (contract === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Contract not found.</div>;
  }

  if (contract.status === "sealed") {
    return (
      <CertificateView
        title={contract.title}
        terms={contract.terms}
        sealedAt={contract.sealedAt!}
        creatorName={contract.creatorName}
        guestName={contract.guestName}
        contractUrl={window.location.href}
      />
    );
  }

  if (role === "observer") {
    return <ObserverView title={contract.title} terms={contract.terms} />;
  }

  return (
    <NegotiationView
      contractId={contract._id}
      title={contract.title}
      terms={contract.terms}
      role={role}
      sessionId={sessionId}
      creatorId={contract.creatorId}
      creatorName={contract.creatorName}
      creatorLastSeen={contract.creatorLastSeen}
      guestLastSeen={contract.guestLastSeen}
      creatorHoldStart={contract.creatorHoldStart}
      guestHoldStart={contract.guestHoldStart}
      status={contract.status}
    />
  );
}

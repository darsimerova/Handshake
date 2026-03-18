interface CertificateViewProps {
  title: string;
  terms: string;
  sealedAt: number;
  creatorName: string;
  contractUrl: string;
}

export function CertificateView({ title, terms, sealedAt, creatorName, contractUrl }: CertificateViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl border rounded-xl p-8 flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="inline-block mx-auto text-xs font-semibold uppercase tracking-wider text-green-500 border border-green-500/40 rounded-full px-3 py-1">
            ✅ Sealed
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Terms</p>
          <p className="whitespace-pre-wrap text-sm">{terms}</p>
        </div>

        <div className="border-t pt-4 text-sm text-muted-foreground text-center space-y-1">
          <p>Sealed by <strong>{creatorName}</strong> and <strong>Guest</strong></p>
          <p>{new Date(sealedAt).toLocaleString()}</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Permanent link</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">{contractUrl}</code>
        </div>
      </div>
    </div>
  );
}

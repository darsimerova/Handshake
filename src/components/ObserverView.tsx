interface ObserverViewProps {
  title: string;
  terms: string;
  message?: string;
}

export function ObserverView({ title, terms, message = "This contract is being negotiated." }: ObserverViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">{message}</p>
        <div className="border rounded-xl p-6 flex flex-col gap-4 opacity-60">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="whitespace-pre-wrap text-sm">{terms}</p>
        </div>
      </div>
    </div>
  );
}

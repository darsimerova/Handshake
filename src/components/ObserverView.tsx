interface ObserverViewProps {
  title: string;
  terms: string;
  message?: string;
}

export function ObserverView({
  title,
  terms,
  message = "This contract is being negotiated.",
}: ObserverViewProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg flex flex-col gap-5">
        <p className="text-center text-sm text-zinc-600">{message}</p>
        <div className="border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 opacity-50">
          <h2 className="font-serif text-xl font-bold text-zinc-50">{title}</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-500 leading-relaxed">{terms}</p>
        </div>
      </div>
    </div>
  );
}

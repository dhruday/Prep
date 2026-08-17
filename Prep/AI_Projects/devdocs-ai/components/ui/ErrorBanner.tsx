interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
      <span className="mt-0.5 shrink-0">⚠️</span>
      <p>{message}</p>
    </div>
  );
}

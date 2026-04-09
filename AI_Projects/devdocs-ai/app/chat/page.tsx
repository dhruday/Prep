import ChatWindow from "@/components/chat/ChatWindow";

export const metadata = {
  title: "Chat — DevDocs AI",
};

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            DevDocs <span className="text-sky-400">AI</span>
          </h1>
        </div>
        <a
          href="/upload"
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-slate-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Docs
        </a>
      </header>

      {/* Chat area — takes remaining height */}
      <main className="flex-1 overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}

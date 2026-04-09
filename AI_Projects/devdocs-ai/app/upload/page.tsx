import DropZone from "@/components/upload/DropZone";

export const metadata = {
  title: "Upload Docs — DevDocs AI",
};

export default function UploadPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-slate-800 px-6 py-3 shrink-0">
        <a href="/chat" className="text-slate-400 hover:text-slate-200 transition">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h1 className="text-lg font-semibold text-slate-100">
          Upload Documentation
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-1 text-sm font-medium text-slate-300">Supported Formats</h2>
            <p className="mb-4 text-xs text-slate-500">
              PDF documents, Markdown files (.md, .mdx), plain text (.txt), or web page URLs.
              Max file size: 10MB.
            </p>
            <DropZone />
          </div>
        </div>
      </main>
    </div>
  );
}

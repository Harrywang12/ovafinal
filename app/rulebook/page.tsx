export const metadata = {
  title: "Official Volleyball Rulebook | Volley Ref Lab",
};
export default function RulebookPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="prose prose-invert max-w-none mb-8">
        <h1>Official Volleyball Rulebook</h1>
        <p className="text-sm text-white/60">
          View the full official rulebook used by Volley Ref Lab. You can
          scroll through it below or open it in a new tab.
        </p>
        <a
          href="/rulebook-compressed.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary-foreground bg-primary px-4 py-2 rounded-lg text-sm font-medium mt-4"
        >
          Open Rulebook in New Tab
        </a>
      </div>

      <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-white/10 bg-black/40">
        <object
          data="/rulebook-compressed.pdf"
          type="application/pdf"
          className="w-full h-full"
        >
          <p className="p-4 text-sm text-white/70">
            Your browser does not support embedded PDFs. You can
            {" "}
            <a
              href="/rulebook-compressed.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              download the rulebook here
            </a>
            .
          </p>
        </object>
      </div>
    </main>
  );
}

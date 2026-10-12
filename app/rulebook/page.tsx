import { ArrowUpRight, BookOpen } from "lucide-react";
import { TrainingMasthead } from "../../components/training-masthead";

export const metadata = { title: "Official Volleyball Rulebook | Volley Ref Lab" };

export default function RulebookPage() {
  return <main className="max-w-6xl mx-auto px-6 pt-24 pb-16">
    <TrainingMasthead number="R" eyebrow="THE SOURCE BEHIND THE CALL" title="The official rulebook." description="Read the rules that underpin your training. Browse the full document below, or open it in a new tab for a closer look." image="/images/editorial/volleyball-court.jpg" />
    <div className="rulebook-toolbar"><span><BookOpen size={18} /> Official volleyball rules</span><a href="/rulebook-compressed.pdf" target="_blank" rel="noopener noreferrer" className="sport-button sport-button-small">Open rulebook <ArrowUpRight size={17} /></a></div>
    <div className="w-full h-[70vh] overflow-hidden border border-border bg-white"><object data="/rulebook-compressed.pdf" type="application/pdf" className="w-full h-full" aria-label="Official volleyball rulebook PDF"><p className="p-6 text-ink">Your browser does not support embedded PDFs. <a href="/rulebook-compressed.pdf" target="_blank" rel="noopener noreferrer" className="underline text-primary">Open or download the rulebook here.</a></p></object></div>
  </main>;
}

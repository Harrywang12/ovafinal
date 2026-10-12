"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play, BookOpen, Check } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { CourtLab } from "../components/court-lab";

const pathways = [
  { number: "01", title: "Know the rules.", description: "Build your knowledge with focused lessons, court diagrams, and the official rulebook.", href: "/learn", label: "Explore learning", image: "/images/editorial/volleyball-court.jpg", alt: "An indoor volleyball court viewed from above" },
  { number: "02", title: "Make the call.", description: "Put your understanding to the test with adaptive quizzes and rule-cited explanations.", href: "/quiz", label: "Take a quiz", image: "/images/editorial/referee-signal.jpg", alt: "A volleyball referee demonstrating a hand signal" },
  { number: "03", title: "Read the rally.", description: "Watch match footage, spot the decisive moment, and practise under time pressure.", href: "/practice", label: "Practise with video", image: "/images/editorial/referee-match.jpg", alt: "A referee watching an attack at the net during a volleyball match" },
];

export default function HomePage() {
  const { session } = useSupabaseAuth();
  const trainingHref = session ? "/dashboard" : "/login?next=/dashboard";
  const accessHref = (href: string) => session ? href : `/login?next=${encodeURIComponent(href)}`;

  return (
    <main className="editorial-home" id="main-content">
      <section className="match-hero" aria-labelledby="home-heading">
        <Image src="/images/editorial/referee-match.jpg" alt="A volleyball referee follows the action as an attacker meets a block at the net" fill loading="eager" unoptimized sizes="100vw" className="match-hero-photo" />
        <div className="match-hero-shade" />
        <div className="site-width match-hero-content">
          <p className="eyebrow hero-eyebrow"><span className="live-dot" /> Volleyball referee development</p>
          <h1 id="home-heading">SEE THE GAME.<br />OWN THE <span>CALL.</span></h1>
          <p className="hero-description">The game moves fast. Be ready.<br />Build the knowledge, judgement, and confidence<br className="desktop-break" /> to make every whistle count.</p>
          <div className="hero-actions"><Link href={trainingHref} className="sport-button">{session ? "Continue training" : "Start your training"}<ArrowUpRight size={19} /></Link><a href="#training" className="hero-explore"><span><Play size={13} fill="currentColor" /></span> Explore the lab</a></div>
        </div>
      </section>
      <div className="training-ribbon" aria-label="Training approach"><div className="site-width"><span>KNOW THE RULE.</span><span aria-hidden="true">+</span><span>READ THE PLAY.</span><span aria-hidden="true">+</span><span>MAKE THE CALL.</span></div></div>

      <section className="endorsement site-width" aria-labelledby="endorsement-heading">
        <div className="endorsement-copy"><p className="eyebrow">Endorsed by</p><h2 id="endorsement-heading">Ontario Volleyball<br />Association</h2></div>
        <a href="https://www.ontariovolleyball.org/" target="_blank" rel="noopener noreferrer" className="ova-mark" aria-label="Visit the Ontario Volleyball Association website"><Image src="/images/ova-logo.png" alt="Ontario Volleyball Association logo" width={72} height={101} /><ArrowUpRight size={19} /></a>
      </section>

      <section className="training-section site-width" id="training" aria-labelledby="training-heading">
        <div className="section-heading"><div><h2 id="training-heading">CONFIDENCE IS<br />BUILT BETWEEN MATCHES.</h2></div><p>From your first whistle to your next level.<br />Train the way you learn best.</p></div>
        <div className="pathway-grid">{pathways.map((path) => <article className="pathway" key={path.number}>
          <Link href={accessHref(path.href)} className="pathway-image-link" aria-label={path.label}><div className="pathway-image"><Image src={path.image} alt={path.alt} fill sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw" /><span className="pathway-number">{path.number}</span><span className="image-arrow"><ArrowUpRight size={24} /></span></div></Link>
          <h3>{path.title}</h3><p>{path.description}</p><Link href={accessHref(path.href)} className="text-link">{path.label}<ArrowRight size={17} /></Link>
        </article>)}</div>
      </section>

      <section className="visual-training" aria-labelledby="visual-heading"><div className="site-width visual-training-grid">
        <div className="visual-training-copy"><h2 id="visual-heading">DON’T JUST<br />MEMORISE IT.<br /><span>SEE IT.</span></h2><p>A rule makes more sense when you can picture the play. Explore court positions, follow rotations, and connect the rulebook to what happens on the floor.</p><ul><li><Check size={17} /> Court diagrams that bring the rules to life</li><li><Check size={17} /> Explanations with official rule references</li><li><Check size={17} /> Learning across indoor, beach, and rallyball</li></ul><Link href={accessHref("/learn")} className="sport-button sport-button-white">Find your starting point <ArrowUpRight size={19} /></Link></div>
        <CourtLab />
      </div></section>

      <section className="challenge-feature site-width" aria-labelledby="challenge-heading"><div className="challenge-image"><Image src="/images/editorial/referee-review.jpg" alt="Volleyball officials reviewing a match together" fill sizes="(min-width: 800px) 50vw, 100vw" /></div><div className="challenge-copy"><p className="eyebrow"><span className="red-rule" /> THE WEEKLY CHALLENGE</p><h2 id="challenge-heading">ONE RALLY.<br />YOUR RULING.</h2><p>Some calls stay with you. Take on a weekly video challenge, put your judgement to the test, and see how your decision stacks up.</p><div className="challenge-process"><span><b>01</b> Watch the play</span><ArrowRight size={15} /><span><b>02</b> Make your call</span><ArrowRight size={15} /><span><b>03</b> Review the ruling</span></div><Link href={accessHref("/challenge")} className="sport-button">Take the challenge <ArrowUpRight size={19} /></Link></div></section>

      <section className="rulebook-strip site-width"><div className="rulebook-strip-icon"><BookOpen size={29} /></div><div><h2>Grounded in the official rulebook.</h2><p>Go straight to the rules. Build your understanding on the source.</p></div><Link href="/rulebook" className="text-link">Open the rulebook <ArrowUpRight size={19} /></Link></section>
    </main>
  );
}

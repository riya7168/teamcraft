import Link from "next/link";
import JoinWithCode from "./JoinWithCode";
import DarkModeToggle from "../components/DarkModeToggle";

const features = [
  { number: "01", title: "Know what your team needs", text: "Turn project goals into a clear picture of the skills, interests, and time your team needs." },
  { number: "02", title: "Build a team that fits", text: "See how people’s strengths and schedules line up before roles and expectations are set." },
  { number: "03", title: "Make the work visible", text: "Keep a shared contribution log so progress and effort are easy for everyone to understand." },
];

export default function HomePage() {
  return <main className="public-page">
    <header className="public-nav"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><nav><a href="#how-it-works">How it works</a><a href="#why-teamcraft">Why Teamcraft</a></nav><div className="public-nav-actions"><Link href="/login" className="sign-in-link">Sign in</Link><Link href="/login?mode=signup" className="button button-dark">Create your workspace <span>→</span></Link><DarkModeToggle /></div></header>
    <section className="hero-section"><div className="hero-copy"><div className="hero-kicker"><span>✳</span> A better way to work together</div><h1>Build teams around<br /><em>what people bring.</em></h1><p>Great projects begin with the right mix of skills, interests, and time. Teamcraft helps you find that mix, then keeps the work clear for everyone.</p><div className="hero-actions"><Link href="/login?mode=signup" className="button button-dark hero-cta">Build your team <span>→</span></Link><a href="#how-it-works" className="hero-secondary">See how it works <span>↓</span></a></div><JoinWithCode /><div className="hero-proof"><div className="proof-avatars"><i>MP</i><i>EB</i><i>SC</i><i>NW</i></div><span>Made for teams that do good work together</span></div></div>
      <div className="hero-art" aria-label="Illustration of a balanced project team"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-center"><div className="art-spark">✳</div><b>Good work<br />is a team effort.</b><span>Skills · Interests · Time</span></div><div className="art-person art-person-one"><i>MP</i><b>Maya</b><small>Design</small></div><div className="art-person art-person-two"><i>EB</i><b>Ethan</b><small>Engineering</small></div><div className="art-person art-person-three"><i>SC</i><b>Sofia</b><small>Research</small></div><div className="art-person art-person-four"><i>NW</i><b>Noah</b><small>Data</small></div><div className="art-note"><span>↗</span> 31 hrs / week<br /><small>shared capacity</small></div></div>
    </section>
    <section className="trust-strip"><span>FROM FIRST IDEA TO FINISHED PROJECT</span><div><b>Clear roles</b><i>✳</i><b>Fair expectations</b><i>✳</i><b>Visible progress</b></div></section>
    <section className="steps-section" id="how-it-works"><div className="section-intro"><span className="section-eyebrow">HOW TEAMCRAFT WORKS</span><h2>Make teamwork work<br />for <em>everyone.</em></h2><p>Move beyond who happens to be available. Shape a team around what the project needs and what each person wants to contribute.</p></div><div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><span>{feature.number}</span><div className="feature-icon">{feature.number === "01" ? "⌘" : feature.number === "02" ? "◎" : "↗"}</div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div></section>
    <section className="home-cta" id="why-teamcraft"><div><span className="section-eyebrow">START WITH YOUR NEXT PROJECT</span><h2>Better teams don’t happen<br />by accident.</h2><p>Bring your people, plans, and progress into one shared space.</p></div><Link href="/login?mode=signup" className="button button-dark">Create your free workspace <span>→</span></Link></section>
    <footer className="public-footer"><Link href="/" className="brand public-brand"><span className="brand-mark"><span>t</span></span><span>teamcraft</span></Link><span>Teamwork, thoughtfully put together. © 2026 Teamcraft</span><Link href="/login">Sign in</Link></footer>
  </main>;
}

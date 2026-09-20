// src/pages/LandingPage.tsx
// -----------------------------------------------------------------------------
// Changes & Why
// - Import bg image from src/assets to ensure cache-busted, reliable path.
// - Use non-negative z-index within isolated stacking context so bg is visible.
// - Make hero and cards fully responsive with clamp(), fluid paddings, and
//   grid breakpoints.
// - Present a compact, animated explanation of the payment flow in the hero.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/** Import the hero background from src/assets (../ from /pages). */
import heroBg from '../assets/bg.png';
import payVerifyLogo from '../assets/payverify-logo.png';

export default function LandingPage() {
    /** Enable programmatic navigation for CTAs. */
    const navigate = useNavigate();

    /** Accessibility: focus the hero region on mount for screen readers. */
    const heroRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => { heroRef.current?.focus(); }, []);

    /** Smooth-scroll helper for in-page anchors. */
    const scrollToId = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <StyleBlock />

            {/* Sticky header with brand and CTAs */}
            <header className="pv-landing-head">
                <div className="pv-head-inner">
                    <div className="pv-brand" aria-label="PayVerify">
                        <img className="pv-brand-logo" src={payVerifyLogo} alt="PayVerify" />
                    </div>

                    {/* Simple, accessible nav */}
                    <nav className="pv-nav" aria-label="Primary">
                        <button className="pv-link" onClick={() => scrollToId('why-payverify')}>Why PayVerify?</button>
                        <button className="pv-link" onClick={() => scrollToId('solutions')}>Solutions</button>
                        <button className="pv-link" onClick={() => scrollToId('idv')}>IDV</button>
                        <button className="pv-link" onClick={() => scrollToId('qr')}>QR Payments</button>
                        <button className="pv-link" onClick={() => scrollToId('analytics')}>Analytics</button>
                        <a
                            href="/login"
                            className="pv-btn pv-btn-primary pv-login-btn"
                            onClick={(event) => {
                                // Use a full browser navigation so this still works
                                // when the landing page was served from a stale SPA bundle.
                                event.preventDefault();
                                event.stopPropagation();
                                window.location.assign('/login');
                            }}
                            aria-label="Go to merchant login"
                        >
                            Login
                        </a>
                    </nav>
                </div>
            </header>

            {/* Hero section with layered background + overlay + content */}
            <section className="pv-hero" ref={heroRef} tabIndex={-1} aria-labelledby="hero-title">
                {/* Background layer with imported asset */}
                <div
                    className="pv-hero-bg"
                    style={{
                        backgroundImage: `url(${heroBg})`,
                    }}
                    aria-hidden
                />

                {/* Soft overlay to improve text contrast */}
                <div className="pv-hero-overlay" aria-hidden />

                <div className="pv-hero-particles" aria-hidden>
                    {Array.from({ length: 18 }, (_, index) => (
                        <span key={index} style={{
                            left: `${5 + ((index * 17) % 90)}%`,
                            top: `${8 + ((index * 29) % 80)}%`,
                            animationDelay: `${index * -.37}s`,
                            animationDuration: `${7 + index * .31}s`,
                        }} />
                    ))}
                </div>

                <div className="pv-hero-visual" aria-hidden>
                    <div className="pv-orbit pv-orbit-one" />
                    <div className="pv-orbit pv-orbit-two" />
                    <div className="pv-live-card">
                        <div className="pv-live-card-head">
                            <span>Verified payment flow</span>
                            <b>LIVE</b>
                        </div>
                        <div className="pv-live-step pv-live-step-active"><i>✓</i><div><strong>Merchant verified</strong><small>Account match confirmed</small></div></div>
                        <div className="pv-live-step"><i>↗</i><div><strong>Secure checkout</strong><small>Paystack payment initialized</small></div></div>
                        <div className="pv-live-step"><i>₦</i><div><strong>Settlement tracked</strong><small>Dashboard updates automatically</small></div></div>
                        <div className="pv-live-scan" />
                    </div>
                </div>

                {/* Headline, subcopy, and CTAs */}
                <div className="pv-hero-content">
                    <h1 id="hero-title" className="pv-hero-title">
                        <span>Loved by users.</span><br />
                        <span className="pv-underline">Loathed by fraudsters.</span>
                    </h1>

                    <p className="pv-hero-sub">
                        Verify Merchant identity, generate secure QR codes for payments, and monitor risk with our
                        AI-driven tools—frictionless for customers, relentless on fraud.
                    </p>

                    <div className="pv-cta-row">
                        <button className="pv-btn pv-btn-dim" onClick={() => scrollToId('solutions')}>Explore Solutions</button>
                    </div>

                    {/* Animated, video-like explainer for the complete order-to-settlement flow */}
                    <div className="pv-flow-preview" aria-label="How PayVerify works">
                        <div className="pv-flow-preview-head">
                            <span className="pv-flow-kicker"><span className="pv-flow-pulse" /> How it works</span>
                            <span className="pv-flow-caption">One verified flow, end to end</span>
                        </div>
                        <div className="pv-flow-track">
                            <article className="pv-flow-step pv-flow-step-active">
                                <span className="pv-flow-number">01</span>
                                <div className="pv-flow-icon">✦</div>
                                <div><strong>Capture the order</strong><small>Items, customer and amount</small></div>
                            </article>
                            <span className="pv-flow-line" aria-hidden="true" />
                            <article className="pv-flow-step">
                                <span className="pv-flow-number">02</span>
                                <div className="pv-flow-icon">▣</div>
                                <div><strong>Share QR or link</strong><small>Customer pays securely</small></div>
                            </article>
                            <span className="pv-flow-line" aria-hidden="true" />
                            <article className="pv-flow-step">
                                <span className="pv-flow-number">03</span>
                                <div className="pv-flow-icon">✓</div>
                                <div><strong>Confirm &amp; settle</strong><small>Receipt and dashboard update</small></div>
                            </article>
                        </div>
                        <div className="pv-flow-progress" aria-hidden="true"><span /></div>
                    </div>
                </div>
            </section>

            <section id="why-payverify" className="pv-why" aria-labelledby="why-payverify-title">
                <div className="pv-why-inner">
                    <div className="pv-why-copy">
                        <span className="pv-section-label">Beyond collecting payment</span>
                        <h2 id="why-payverify-title">A reliable record from order to receipt.</h2>
                        <p className="pv-why-statement">
                            PayVerify doesn’t just help you collect payment—it helps you prove which order was paid,
                            confirm the payment with the processor, track settlement, and maintain one reliable record
                            from order to receipt.
                        </p>
                    </div>

                    <div className="pv-proof-flow" aria-label="PayVerify order-to-receipt flow">
                        <article>
                            <span>01</span>
                            <div><strong>Match the order</strong><small>Every payment begins with a unique order, invoice and reference.</small></div>
                        </article>
                        <article>
                            <span>02</span>
                            <div><strong>Verify the payment</strong><small>Paystack confirmation is checked by PayVerify before an order becomes paid.</small></div>
                        </article>
                        <article>
                            <span>03</span>
                            <div><strong>Track what follows</strong><small>Receipt, settlement, refund and dispute records remain connected.</small></div>
                        </article>
                    </div>
                </div>
            </section>

            {/* Solution cards grid */}
            <section id="solutions" className="pv-solutions" aria-label="Solutions">
                <div className="pv-sol-grid">
                    <article id="idv" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>🔎</div>
                        <h3>Instant ID Verification (IDV)</h3>
                        <p>Document + device + behavior signals stop impersonation and bots—without slowing good customers.</p>
                    </article>

                    <article id="qr" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>💳</div>
                        <h3>QR Payments</h3>
                        <p>Generate and accept QR codes in seconds. Track settlements, disputes, and refunds centrally.</p>
                    </article>

                    <article id="analytics" className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>📊</div>
                        <h3>Merchant Analytics</h3>
                        <p>Dashboards for GMV, success rate, and risk. Export anytime for finance &amp; ops.</p>
                    </article>

                    <article className="pv-card">
                        <div className="pv-card-kicker" aria-hidden>🛡️</div>
                        <h3>Transaction Screening</h3>
                        <p>Velocity checks, blacklists, and device risk auto-block suspicious activity in real time.</p>
                    </article>
                </div>
            </section>
        </>
    );
}

/** Local CSS (scoped to this page). */
const StyleBlock = () => (
    <style>{`
  /* Type & Theme ------------------------------------------------------------------------- */
  @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Outfit:wght@400;700;900&display=swap');

  :root{
    --pv-bg:#0a0f19;          /* Deep navy for app chrome */
    --pv-bg-2:#0f1b2f;        /* Secondary panel bg */
    --pv-border:rgba(255,255,255,0.15);
    --pv-text:#e8f1ff;        /* Primary text on dark */
    --pv-text-dim:rgba(232,241,255,.85);
    --pv-primary:#2a7bff;     /* Brand blue */
    --pv-success:#00c389;     /* Success green */
  }

  /* Header ------------------------------------------------------------------------------- */
  .pv-landing-head{
    position: sticky; top: 0; z-index: 1000; pointer-events:auto;
    backdrop-filter: blur(8px) saturate(140%);
    background: linear-gradient(180deg, rgba(10,15,25,.65), rgba(10,15,25,.35));
    border-bottom: 1px solid var(--pv-border);
    box-shadow: 0 10px 30px rgba(0,0,0,.16);
  }
  .pv-head-inner{
    width: min(calc(100% - 32px), 1180px);
    max-width: 1180px;
    margin: 0 auto;
    min-height: 70px;
    padding: 10px 0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px;
  }

  /* Official PayVerify wordmark ---------------------------------------------------------- */
  .pv-brand{
    display:flex;
    align-items:center;
    flex:0 0 auto;
    min-width:0;
  }
  .pv-brand-logo{
    display:block;
    width:clamp(150px, 16vw, 196px);
    height:auto;
    max-height:44px;
    object-fit:contain;
    filter:drop-shadow(0 8px 18px rgba(36,100,225,.30));
    animation:pvFloat 5.8s ease-in-out infinite;
  }
  @keyframes pvFloat{ 0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)} }

  .pv-nav{
    display:flex;
    flex:1 1 auto;
    min-width:0;
    justify-content:flex-end;
    gap:2px;
    align-items:center;
    flex-wrap:nowrap; pointer-events:auto;
  }
  .pv-link{
    background:transparent; border:0;
    color:var(--pv-text-dim); font-weight:700;
    padding:9px 9px; border-radius:10px; cursor:pointer;
    white-space:nowrap;
  }
  .pv-link:hover{ color:var(--pv-text); }

  .pv-btn{
    border-radius:12px; padding:10px 14px; font-weight:800; line-height:1;
    border:1px solid var(--pv-border); color:var(--pv-text); background:rgba(255,255,255,.04);
    white-space:nowrap; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;
  }
  .pv-btn:hover{ background:rgba(255,255,255,.08); }
  .pv-login-btn{ position:relative; z-index:1001; pointer-events:auto; }
  .pv-btn-primary{ background: linear-gradient(180deg,#3c89ff,#2a7bff); border-color:transparent; color:#fff; }
  .pv-btn-primary:hover{ filter: brightness(1.06); }
  .pv-btn-dim{ color:var(--pv-text); background:rgba(255,255,255,.08); }
  .pv-btn-success{ background: linear-gradient(180deg,#05d39b,#00c389); color:#072016; border-color:transparent; font-weight:900; }

  /* Hero --------------------------------------------------------------------------------- */
  .pv-hero{
    position: relative;
    isolation: isolate; /* Ensures predictable layer stacking inside */
    min-height: 70vh;
    display: grid; place-items: center;
    padding: clamp(40px, 7vw, 80px) 0;
    background:
      radial-gradient(1200px 500px at 60% -10%, rgba(73,126,255,.25), rgba(0,0,0,0) 60%),
      linear-gradient(180deg, var(--pv-bg), var(--pv-bg-2));
    overflow: hidden;
  }
  .pv-hero-bg{
    position:absolute; inset:0;
    background-position:center; background-repeat:no-repeat; background-size:cover;
    opacity:.42; transform: scale(1.02);
    z-index:0; /* Non-negative to render above parent's background */
  }
  .pv-hero-overlay{
    position:absolute; inset:0;
    background:
      radial-gradient(1000px 600px at 50% 0%, rgba(110,136,255,.25), rgba(0,0,0,0) 60%),
      linear-gradient(180deg, rgba(8,13,24,.55), rgba(8,13,24,.70));
    z-index:1; /* Sits above the bg image, below content */
  }
  .pv-hero-content{
    position:relative; z-index:2;
    width:100%; max-width:1180px;
    padding: 0 clamp(16px, 4vw, 28px);
    color:var(--pv-text);
    padding-right:min(44vw,520px);
  }
  .pv-hero-particles{ position:absolute; inset:0; z-index:1; overflow:hidden; pointer-events:none; }
  .pv-hero-particles span{ position:absolute; width:4px; height:4px; border-radius:50%; color:#55a3ff; background:currentColor; box-shadow:0 0 12px currentColor; opacity:.35; animation:pvDataDrift 8s ease-in-out infinite alternate; }
  .pv-hero-particles span:nth-child(3n){ color:#56e0ac; width:3px; height:3px; }
  .pv-hero-visual{ position:absolute; z-index:2; right:max(16px,calc((100vw - 1180px)/2)); top:50%; width:min(36vw,430px); transform:translateY(-50%); perspective:1200px; }
  .pv-live-card{ position:relative; padding:20px; border:1px solid rgba(166,198,255,.28); border-radius:22px; background:linear-gradient(145deg,rgba(20,42,78,.88),rgba(7,20,44,.92)); box-shadow:0 30px 80px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12); backdrop-filter:blur(15px) saturate(140%); animation:pvCardFloat 6s ease-in-out infinite; overflow:hidden; }
  .pv-live-card::before{ content:""; position:absolute; inset:-60% -30%; background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.09) 48%,transparent 56%); animation:pvCardSheen 7s ease-in-out infinite; }
  .pv-live-card-head{ position:relative; display:flex; justify-content:space-between; align-items:center; padding-bottom:14px; color:#dceaff; font-weight:800; }
  .pv-live-card-head b{ padding:5px 9px; border-radius:999px; color:#7ff0ba; background:rgba(0,195,137,.13); border:1px solid rgba(0,195,137,.28); font-size:.67rem; letter-spacing:.12em; }
  .pv-live-step{ position:relative; display:flex; align-items:center; gap:12px; margin-top:9px; padding:13px; border-radius:14px; color:#d6e4f8; background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.07); }
  .pv-live-step i{ width:32px; height:32px; display:grid; place-items:center; flex:0 0 32px; border-radius:10px; font-style:normal; color:#8ab7ff; background:rgba(47,111,237,.17); }
  .pv-live-step-active i{ color:#76e7ad; background:rgba(0,195,137,.15); }
  .pv-live-step strong,.pv-live-step small{ display:block; }.pv-live-step small{ margin-top:2px; color:#91a7c5; }
  .pv-live-scan{ position:absolute; left:14px; right:14px; height:1px; top:22%; background:linear-gradient(90deg,transparent,#55a3ff,transparent); box-shadow:0 0 16px #55a3ff; animation:pvScan 4.5s ease-in-out infinite; }
  .pv-orbit{ position:absolute; border:1px solid rgba(79,145,255,.16); border-radius:50%; animation:pvOrbitPulse 5s ease-in-out infinite; }.pv-orbit-one{ inset:-45px; }.pv-orbit-two{ inset:-82px; animation-delay:-2.5s; }
  @keyframes pvDataDrift{ from{transform:translate3d(-12px,9px,0) scale(.75);opacity:.18} to{transform:translate3d(18px,-14px,0) scale(1.4);opacity:.65} }
  @keyframes pvCardFloat{ 0%,100%{transform:rotateY(-2deg) translateY(0)} 50%{transform:rotateY(2deg) translateY(-10px)} }
  @keyframes pvCardSheen{ 0%,55%{transform:translateX(-60%)} 80%,100%{transform:translateX(60%)} }
  @keyframes pvScan{ 0%,100%{transform:translateY(0);opacity:0} 15%{opacity:.75} 50%{transform:translateY(230px);opacity:.45} 80%{opacity:0} }
  @keyframes pvOrbitPulse{ 0%,100%{transform:scale(.96);opacity:.4} 50%{transform:scale(1.04);opacity:.9} }
  .pv-hero-title{
    margin:0 0 12px;
    font-family:'Outfit',system-ui; font-weight:900; line-height:1.02;
    font-size: clamp(32px, 5vw, 56px);
    letter-spacing:.2px;
    text-shadow:0 6px 30px rgba(0,0,0,.45);
  }
  .pv-underline{ position:relative; display:inline-block; }
  .pv-underline::after{
    content:""; position:absolute; left:0; right:0; bottom:-6px; height:8px;
    background:linear-gradient(90deg,#7fb4ff,#2a7bff); border-radius:999px; opacity:.9;
  }
  .pv-hero-sub{
    max-width: 60ch;
    color:var(--pv-text-dim);
    font-weight:700;
    font-size: clamp(14px, 1.4vw, 18px);
    margin: 10px 0 20px;
  }
  .pv-cta-row{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }

  #why-payverify, #solutions, #idv, #qr, #analytics{ scroll-margin-top:88px; }

  /* Animated hero explainer -------------------------------------------------------------- */
  .pv-flow-preview{
    margin-top:34px;
    width:min(680px,100%);
    padding:15px 16px 13px;
    border:1px solid rgba(132,181,255,.25);
    border-radius:18px;
    background:linear-gradient(145deg,rgba(15,31,58,.82),rgba(10,20,39,.68));
    box-shadow:0 20px 48px rgba(0,0,0,.27), inset 0 1px rgba(255,255,255,.10);
    backdrop-filter:blur(12px) saturate(135%);
  }
  .pv-flow-preview-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:13px; }
  .pv-flow-kicker{ display:inline-flex; align-items:center; gap:8px; color:#dceaff; font-size:.78rem; font-weight:900; letter-spacing:.11em; text-transform:uppercase; }
  .pv-flow-caption{ color:#8ca8cb; font-size:.78rem; font-weight:700; }
  .pv-flow-pulse{ width:8px; height:8px; border-radius:50%; background:#39d6a2; box-shadow:0 0 0 0 rgba(57,214,162,.55); animation:pvFlowPulse 1.8s infinite; }
  .pv-flow-track{ display:flex; align-items:stretch; gap:9px; }
  .pv-flow-step{ position:relative; display:flex; align-items:center; gap:9px; flex:1; min-width:0; padding:11px 10px 10px; border:1px solid rgba(255,255,255,.10); border-radius:13px; background:rgba(255,255,255,.045); overflow:hidden; }
  .pv-flow-step::after{ content:""; position:absolute; inset:0; background:linear-gradient(105deg,transparent 25%,rgba(122,185,255,.16) 48%,transparent 70%); transform:translateX(-120%); animation:pvFlowSheen 5.2s ease-in-out infinite; }
  .pv-flow-step:nth-of-type(3)::after{ animation-delay:1.7s; }.pv-flow-step:nth-of-type(5)::after{ animation-delay:3.4s; }
  .pv-flow-step-active{ border-color:rgba(71,160,255,.55); background:linear-gradient(140deg,rgba(39,112,226,.23),rgba(255,255,255,.06)); }
  .pv-flow-number{ align-self:flex-start; color:#79b4ff; font-size:.67rem; font-weight:900; letter-spacing:.08em; }
  .pv-flow-icon{ display:grid; place-items:center; flex:0 0 29px; width:29px; height:29px; border-radius:9px; color:#b9d7ff; background:rgba(62,132,236,.22); font-size:1rem; font-weight:900; }
  .pv-flow-step strong,.pv-flow-step small{ display:block; position:relative; z-index:1; }.pv-flow-step strong{ color:#f0f6ff; font-size:.82rem; }.pv-flow-step small{ margin-top:3px; color:#8ca8cb; font-size:.69rem; font-weight:700; white-space:nowrap; }
  .pv-flow-line{ align-self:center; width:22px; height:1px; flex:0 0 22px; background:linear-gradient(90deg,rgba(83,160,255,.3),rgba(83,160,255,.9),rgba(83,160,255,.3)); box-shadow:0 0 10px rgba(83,160,255,.4); }
  .pv-flow-progress{ height:3px; margin:13px 2px 0; border-radius:99px; background:rgba(255,255,255,.10); overflow:hidden; }.pv-flow-progress span{ display:block; width:34%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#4c9aff,#64e4c2); box-shadow:0 0 12px rgba(76,154,255,.8); animation:pvFlowProgress 5.2s ease-in-out infinite; }
  @keyframes pvFlowPulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(57,214,162,.5) } 50%{ box-shadow:0 0 0 7px rgba(57,214,162,0) } }
  @keyframes pvFlowSheen{ 0%,25%{ transform:translateX(-120%) } 55%,100%{ transform:translateX(120%) } }
  @keyframes pvFlowProgress{ 0%{ transform:translateX(-110%); width:22% } 55%{ transform:translateX(130%); width:40% } 100%{ transform:translateX(300%); width:22% } }
  @media (max-width: 760px){
    .pv-flow-preview-head{ align-items:flex-start; flex-direction:column; gap:5px; }
    .pv-flow-track{ flex-direction:column; gap:7px; }
    .pv-flow-line{ width:1px; height:13px; flex-basis:13px; margin-left:24px; }
    .pv-flow-step small{ white-space:normal; }
    .pv-hero-content{ padding-right:clamp(16px,4vw,28px); }
    .pv-hero-visual{ position:relative; right:auto; top:auto; width:min(92%,430px); margin:34px auto 0; transform:none; }
    .pv-hero{ display:block; }
  }

  @media (max-width: 1080px){
    .pv-head-inner{ gap:12px; }
    .pv-link{ padding-inline:7px; font-size:.9rem; }
    .pv-btn{ padding-inline:11px; }
  }
  @media (max-width: 900px){
    .pv-nav{ justify-content:flex-start; overflow-x:auto; scrollbar-width:none; }
    .pv-nav::-webkit-scrollbar{ display:none; }
  }
  @media (max-width: 700px){
    .pv-head-inner{ width:min(calc(100% - 24px),1180px); min-height:58px; flex-wrap:wrap; padding:9px 0 8px; }
    .pv-brand-logo{ width:clamp(145px,48vw,178px); max-height:38px; }
    .pv-nav{ width:100%; order:2; justify-content:center; overflow:visible; flex-wrap:wrap; row-gap:4px; padding-top:5px; border-top:1px solid rgba(255,255,255,.08); }
    .pv-link{ padding:7px 6px; font-size:.82rem; }
    .pv-btn{ padding:9px 10px; }
  }
  /* Why PayVerify ------------------------------------------------------------------------ */
  .pv-why{
    position:relative;
    overflow:hidden;
    padding:clamp(52px,7vw,88px) clamp(14px,4vw,20px);
    color:var(--pv-text);
    background:
      radial-gradient(700px 320px at 14% 8%,rgba(42,123,255,.20),transparent 68%),
      linear-gradient(180deg,#0f1b2f,#0b1526);
    border-top:1px solid rgba(255,255,255,.08);
    border-bottom:1px solid rgba(255,255,255,.08);
  }
  .pv-why-inner{
    max-width:1180px;
    margin:0 auto;
    display:grid;
    grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);
    gap:clamp(28px,5vw,64px);
    align-items:center;
  }
  .pv-section-label{
    display:inline-block;
    margin-bottom:12px;
    color:#76b1ff;
    font-size:.78rem;
    font-weight:900;
    letter-spacing:.14em;
    text-transform:uppercase;
  }
  .pv-why h2{
    margin:0 0 16px;
    max-width:13ch;
    font-family:'Outfit',system-ui;
    font-size:clamp(30px,4vw,48px);
    line-height:1.02;
  }
  .pv-why-statement{
    margin:0;
    max-width:62ch;
    color:var(--pv-text-dim);
    font-size:clamp(16px,1.8vw,20px);
    font-weight:700;
    line-height:1.6;
  }
  .pv-proof-flow{
    position:relative;
    padding:14px;
    border:1px solid rgba(142,188,255,.23);
    border-radius:22px;
    background:linear-gradient(145deg,rgba(25,49,88,.78),rgba(7,20,42,.88));
    box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.10);
    backdrop-filter:blur(14px) saturate(130%);
  }
  .pv-proof-flow article{
    display:flex;
    gap:14px;
    align-items:flex-start;
    padding:16px;
    border-radius:15px;
  }
  .pv-proof-flow article+article{ border-top:1px solid rgba(255,255,255,.08); }
  .pv-proof-flow article>span{
    display:grid;
    place-items:center;
    width:38px;
    height:38px;
    flex:0 0 38px;
    border-radius:12px;
    color:#a9ceff;
    background:rgba(42,123,255,.17);
    box-shadow:inset 0 1px rgba(255,255,255,.12);
    font-weight:900;
  }
  .pv-proof-flow strong,.pv-proof-flow small{ display:block; }
  .pv-proof-flow strong{ margin-bottom:4px; font-size:1.02rem; }
  .pv-proof-flow small{ color:rgba(232,241,255,.67); line-height:1.45; font-weight:700; }
  @media (max-width:820px){
    .pv-why-inner{ grid-template-columns:1fr; }
    .pv-why h2{ max-width:none; }
  }

  /* Solutions Grid ----------------------------------------------------------------------- */
  .pv-solutions{
    background: linear-gradient(180deg, var(--pv-bg-2), #0b1322);
    padding: clamp(28px, 6vw, 56px) clamp(14px, 4vw, 20px) clamp(60px, 8vw, 90px);
    color:var(--pv-text);
  }
  .pv-sol-grid{
    max-width:1180px; margin:0 auto;
    display:grid; grid-template-columns:repeat(4,1fr); gap:16px;
  }
  @media (max-width:1100px){
    .pv-sol-grid{ grid-template-columns:repeat(2,1fr); }
  }
  @media (max-width:640px){
    .pv-sol-grid{ grid-template-columns:1fr; }
  }
  .pv-card{
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
    border:1px solid var(--pv-border);
    border-radius:16px; padding:16px;
    box-shadow:0 16px 40px rgba(0,0,0,.25);
    backdrop-filter: blur(8px) saturate(140%);
  }
  .pv-card h3{ margin:4px 0 6px; font-family:'Outfit',system-ui; font-weight:900; font-size: clamp(18px, 2vw, 22px); }
  .pv-card p{ color:var(--pv-text-dim); font-weight:700; }
  .pv-card-kicker{ font-size:20px; }

  /* Motion prefs ------------------------------------------------------------------------- */
  @media (prefers-reduced-motion: reduce){
    .pv-brand-logo, .pv-hero-particles span, .pv-live-card, .pv-live-card::before, .pv-live-scan, .pv-orbit{ animation:none !important; }
  }
  `}</style>
);

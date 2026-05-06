import React, { useState, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');

@keyframes fadeUp    { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes spin      { to{transform:rotate(360deg)} }
@keyframes spinSlow  { to{transform:rotate(360deg)} }
@keyframes spinRev   { to{transform:rotate(-360deg)} }
@keyframes fillBar   { from{width:0} to{width:var(--w)} }
@keyframes fillBarV  { from{height:0} to{height:var(--h)} }
@keyframes pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.95)} }
@keyframes glow      { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes scanH     { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
@keyframes scanV     { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
@keyframes flicker   { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.4} 94%{opacity:1} 96%{opacity:.6} 97%{opacity:1} }
@keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes hexPulse  { 0%,100%{opacity:.04} 50%{opacity:.12} }
@keyframes orbit     { from{transform:rotate(0deg) translateX(40px) rotate(0deg)} to{transform:rotate(360deg) translateX(40px) rotate(-360deg)} }
@keyframes countUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes borderAnim{
  0%  {border-color:rgba(0,255,200,.15)}
  50% {border-color:rgba(0,255,200,.4)}
  100%{border-color:rgba(0,255,200,.15)}
}
@keyframes gradient  {
  0%  {background-position:0% 50%}
  50% {background-position:100% 50%}
  100%{background-position:0% 50%}
}
@keyframes ripple    {
  0%  {transform:scale(0);opacity:1}
  100%{transform:scale(4);opacity:0}
}
@keyframes typing {
  from{width:0} to{width:100%}
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root {
  --bg:    #030508;
  --bg1:   #060c12;
  --bg2:   #091420;
  --bg3:   #0d1e30;
  --panel: rgba(6,12,20,.92);

  --c:     #00ffc8;   /* primary cyan-green */
  --c2:    #00d4a8;
  --c3:    rgba(0,255,200,.12);
  --c4:    rgba(0,255,200,.06);
  --c5:    rgba(0,255,200,.03);

  --blue:  #0088ff;
  --purple:#8844ff;
  --amber: #ffaa00;
  --red:   #ff4466;
  --green: #00ff88;

  --txt:   #c8e8e0;
  --txt2:  #6a9a90;
  --txt3:  #3a6060;
  --border:rgba(0,255,200,.08);
  --border2:rgba(0,255,200,.2);

  --r:12px;--r-sm:6px;
  --glow: 0 0 20px rgba(0,255,200,.15);
  --glow2:0 0 40px rgba(0,255,200,.25);
}

html,body{
  font-family:'Outfit',sans-serif;
  background:var(--bg);
  color:var(--txt);
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

/* ── BACKGROUND ─────────────────────────────────────────────────────────── */
.bg-layer{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(0,136,255,.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 100%, rgba(0,255,200,.05) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 50% 50%, rgba(136,68,255,.03) 0%, transparent 60%);
}
.bg-grid{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:
    linear-gradient(rgba(0,255,200,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,200,.025) 1px, transparent 1px);
  background-size:48px 48px;
}
.bg-hex{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpolygon points='30,2 58,16 58,36 30,50 2,36 2,16' fill='none' stroke='rgba(0,255,200,0.04)' stroke-width='1'/%3E%3C/svg%3E");
  background-size:60px 52px;
  animation:hexPulse 6s ease infinite;
}

/* ── NAV ────────────────────────────────────────────────────────────────── */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:200;
  height:60px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 2rem;
  background:rgba(3,5,8,.9);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
}
.nav::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--c),transparent);
  opacity:.3;
}
.nav-logo{
  display:flex;align-items:center;gap:12px;
  font-family:'Orbitron',monospace;
  font-size:16px;font-weight:900;
  letter-spacing:.12em;color:var(--c);
  text-shadow:0 0 20px rgba(0,255,200,.5);
  animation:flicker 8s infinite;
}
.nav-logo-icon{
  width:32px;height:32px;
  border:1.5px solid var(--c);
  border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;
  box-shadow:var(--glow);
  animation:float 4s ease-in-out infinite;
  position:relative;
  overflow:hidden;
}
.nav-logo-icon::after{
  content:'';position:absolute;
  top:-50%;left:-50%;width:200%;height:200%;
  background:linear-gradient(45deg,transparent 40%,rgba(0,255,200,.15) 50%,transparent 60%);
  animation:scanH 3s ease-in-out infinite;
}
.nav-center{display:flex;align-items:center;gap:10px}
.nav-live-dot{
  width:7px;height:7px;border-radius:50%;
  background:var(--green);
  box-shadow:0 0 8px var(--green);
  animation:glow 1.5s infinite;
}
.nav-live-txt{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.15em;color:var(--green);
}
.nav-tag{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.15em;
  color:var(--txt3);text-transform:uppercase;
}

/* ── HERO ────────────────────────────────────────────────────────────────── */
.hero{
  position:relative;z-index:1;
  max-width:960px;margin:0 auto;
  padding:100px 2rem 60px;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid var(--border2);
  padding:5px 16px;border-radius:99px;
  font-family:'JetBrains Mono',monospace;font-size:10px;
  letter-spacing:.14em;color:var(--c);
  background:var(--c4);margin-bottom:1.75rem;
  animation:fadeUp .5s ease both;
}
.hero-badge-dot{
  width:5px;height:5px;border-radius:50%;
  background:var(--c);animation:pulse 1.5s infinite;
  box-shadow:0 0 6px var(--c);
}
.hero h1{
  font-family:'Orbitron',monospace;
  font-size:clamp(32px,6vw,72px);
  font-weight:900;letter-spacing:.06em;line-height:1.05;
  margin-bottom:1.25rem;
  animation:fadeUp .5s .08s ease both;
}
.hero h1 .line1{color:var(--txt);display:block}
.hero h1 .line2{
  color:transparent;display:block;
  background:linear-gradient(90deg,var(--c),var(--blue),var(--purple));
  background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;
  animation:gradient 4s ease infinite, fadeUp .5s .08s ease both;
}
.hero-sub{
  font-size:16px;color:var(--txt2);line-height:1.75;
  max-width:500px;font-weight:300;margin-bottom:2.5rem;
  animation:fadeUp .5s .16s ease both;
}
.hero-stats{
  display:flex;gap:0;
  border:1px solid var(--border);border-radius:var(--r);
  overflow:hidden;
  animation:fadeUp .5s .24s ease both;
  width:fit-content;
}
.hstat{
  padding:1rem 1.75rem;text-align:center;
  border-right:1px solid var(--border);
  position:relative;
}
.hstat:last-child{border-right:none}
.hstat::before{
  content:'';position:absolute;
  inset:0;background:var(--c5);
}
.hstat-val{
  font-family:'Orbitron',monospace;
  font-size:24px;font-weight:700;
  color:var(--c);letter-spacing:.06em;
  text-shadow:0 0 15px rgba(0,255,200,.4);
}
.hstat-lbl{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;color:var(--txt3);
  text-transform:uppercase;letter-spacing:.14em;margin-top:4px;
}

/* ── MAIN ────────────────────────────────────────────────────────────────── */
.main{
  position:relative;z-index:1;
  max-width:960px;margin:0 auto;
  padding:0 2rem 8rem;
  display:flex;flex-direction:column;gap:1.25rem;
}

/* ── PANEL ───────────────────────────────────────────────────────────────── */
.panel{
  background:var(--panel);
  border:1px solid var(--border);
  border-radius:var(--r);
  padding:1.75rem;
  position:relative;overflow:hidden;
  animation:fadeUp .4s ease both;
  transition:border-color .3s;
  backdrop-filter:blur(12px);
}
.panel::before{
  content:'';position:absolute;
  top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--c3),transparent);
  opacity:0;transition:opacity .3s;
}
.panel:hover{border-color:rgba(0,255,200,.18)}
.panel:hover::before{opacity:1}

/* corner accents */
.panel::after{
  content:'';position:absolute;
  top:8px;right:8px;
  width:12px;height:12px;
  border-top:1px solid var(--border2);
  border-right:1px solid var(--border2);
  border-radius:0 3px 0 0;
  opacity:0;transition:opacity .3s;
}
.panel:hover::after{opacity:1}

.panel-label{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;text-transform:uppercase;
  letter-spacing:.2em;color:var(--txt3);
  margin-bottom:.6rem;
  display:flex;align-items:center;gap:8px;
}
.panel-label::before{content:'';width:12px;height:1px;background:var(--txt3)}
.panel-title{
  font-family:'Outfit',sans-serif;
  font-size:16px;font-weight:600;
  color:var(--txt);margin-bottom:4px;letter-spacing:-.01em;
}
.panel-sub{font-size:13px;color:var(--txt2);font-weight:300;margin-bottom:1.5rem}

/* ── TEXTAREA ────────────────────────────────────────────────────────────── */
.jd-area{
  width:100%;min-height:170px;
  background:rgba(0,0,0,.4);
  border:1px solid var(--border);
  border-radius:var(--r-sm);
  padding:1.1rem 1.25rem;
  font-family:'Outfit',sans-serif;
  font-size:14px;font-weight:300;line-height:1.75;
  color:var(--txt);resize:vertical;outline:none;
  transition:border-color .2s,box-shadow .2s;
}
.jd-area::placeholder{color:var(--txt3)}
.jd-area:focus{
  border-color:var(--border2);
  box-shadow:0 0 0 3px rgba(0,255,200,.05),var(--glow);
}
.jd-footer{display:flex;justify-content:space-between;align-items:center;margin-top:.6rem}
.jd-count{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--txt3);transition:color .2s;
}
.jd-count.ok{color:var(--c);text-shadow:0 0 8px rgba(0,255,200,.4)}

/* ── DROP ZONE ───────────────────────────────────────────────────────────── */
.drop{
  border:1px dashed var(--border2);
  border-radius:var(--r-sm);
  padding:2.5rem 2rem;
  text-align:center;cursor:pointer;
  background:rgba(0,0,0,.3);
  transition:all .25s;
  position:relative;overflow:hidden;
}
.drop-scan{
  position:absolute;top:0;left:0;right:0;
  height:2px;
  background:linear-gradient(90deg,transparent,var(--c),transparent);
  opacity:0;animation:scanH 3s ease-in-out infinite;
  transition:opacity .3s;
}
.drop:hover .drop-scan,.drop.over .drop-scan{opacity:1}
.drop:hover,.drop.over{
  border-color:var(--c);
  background:var(--c4);
  box-shadow:inset 0 0 40px rgba(0,255,200,.04);
}
.drop-ico{
  width:54px;height:54px;
  border:1px solid var(--border2);
  border-radius:12px;
  background:rgba(0,255,200,.06);
  display:flex;align-items:center;justify-content:center;
  font-size:22px;margin:0 auto .9rem;
  box-shadow:var(--glow);
}
.drop-title{
  font-family:'Outfit',sans-serif;
  font-size:15px;font-weight:600;
  color:var(--txt);margin-bottom:.35rem;
}
.drop-sub{font-size:13px;color:var(--txt2);font-weight:300}
.drop-limit{
  display:inline-block;margin-top:.75rem;
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--txt3);letter-spacing:.08em;
  background:rgba(0,0,0,.4);padding:4px 12px;
  border-radius:99px;border:1px solid var(--border);
}

/* ── FILE LIST ───────────────────────────────────────────────────────────── */
.file-badge{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(0,255,200,.08);
  border:1px solid var(--border2);
  color:var(--c);font-size:12px;font-weight:500;
  padding:5px 14px;border-radius:99px;
  margin-top:.8rem;letter-spacing:.02em;
}
.flist{display:flex;flex-direction:column;gap:.4rem;margin-top:.8rem}
.fitem{
  display:flex;align-items:center;gap:.75rem;
  background:rgba(0,0,0,.4);
  border:1px solid var(--border);
  border-radius:var(--r-sm);
  padding:.6rem 1rem;
  animation:fadeIn .2s ease;
  transition:border-color .2s;
}
.fitem:hover{border-color:var(--border2)}
.fitem-ico{
  width:26px;height:26px;
  background:var(--c3);border-radius:5px;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;flex-shrink:0;
}
.fitem-name{font-size:13px;font-weight:400;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--txt)}
.fitem-sz{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--txt3);flex-shrink:0;
}
.fitem-rm{
  background:none;border:none;cursor:pointer;
  color:var(--txt3);font-size:18px;line-height:1;
  transition:color .15s;flex-shrink:0;padding:0 2px;
}
.fitem-rm:hover{color:var(--red)}

/* ── BUTTON ──────────────────────────────────────────────────────────────── */
.btn-screen{
  width:100%;padding:1.1rem;
  background:transparent;
  border:1px solid var(--c);
  border-radius:var(--r-sm);
  font-family:'Orbitron',monospace;
  font-size:13px;font-weight:700;letter-spacing:.14em;
  color:var(--c);cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:.75rem;
  position:relative;overflow:hidden;
  transition:all .25s;
  text-transform:uppercase;
  box-shadow:var(--glow);
}
.btn-screen::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(0,255,200,.08),transparent);
  transform:translateX(-100%);transition:transform .6s;
}
.btn-screen:hover:not(:disabled)::before{transform:translateX(100%)}
.btn-screen:hover:not(:disabled){
  background:var(--c3);
  box-shadow:var(--glow2),inset 0 0 20px rgba(0,255,200,.05);
  transform:translateY(-1px);
}
.btn-screen:disabled{opacity:.25;cursor:not-allowed;box-shadow:none}
.spinner{
  width:18px;height:18px;
  border:2px solid rgba(0,255,200,.2);
  border-top-color:var(--c);
  border-radius:50%;
  animation:spin .7s linear infinite;
  flex-shrink:0;
}

.btn-sm{
  background:transparent;
  border:1px solid var(--border2);
  color:var(--c);
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  padding:6px 14px;border-radius:var(--r-sm);
  cursor:pointer;transition:all .15s;white-space:nowrap;
}
.btn-sm:hover{background:var(--c3);box-shadow:var(--glow)}

/* ── ERROR ───────────────────────────────────────────────────────────────── */
.err{
  background:rgba(255,68,102,.07);
  border:1px solid rgba(255,68,102,.25);
  border-radius:var(--r-sm);padding:.9rem 1.1rem;
  font-size:13px;color:var(--red);
  display:flex;gap:.6rem;align-items:flex-start;
  animation:fadeIn .2s;font-weight:300;
}

/* ── AI PROCESSING SCREEN ────────────────────────────────────────────────── */
.ai-screen{
  background:var(--panel);
  border:1px solid var(--border2);
  border-radius:var(--r);
  padding:3rem 2rem;
  text-align:center;
  animation:fadeIn .3s, borderAnim 3s ease infinite;
  position:relative;overflow:hidden;
  backdrop-filter:blur(20px);
}
.ai-screen-glow{
  position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(0,255,200,.06) 0%,transparent 55%);
  pointer-events:none;
}

/* AI RING ANIMATION */
.ai-rings{
  position:relative;width:120px;height:120px;
  margin:0 auto 2rem;
}
.ai-ring{
  position:absolute;inset:0;
  border-radius:50%;border:1px solid transparent;
}
.ai-ring-1{
  border-color:rgba(0,255,200,.4);
  animation:spinSlow 4s linear infinite;
  border-top-color:var(--c);
  box-shadow:0 0 15px rgba(0,255,200,.2);
}
.ai-ring-2{
  inset:12px;
  border-color:rgba(0,136,255,.3);
  animation:spinRev 3s linear infinite;
  border-bottom-color:var(--blue);
}
.ai-ring-3{
  inset:24px;
  border-color:rgba(136,68,255,.3);
  animation:spinSlow 5s linear infinite;
  border-left-color:var(--purple);
}
.ai-ring-core{
  position:absolute;
  inset:36px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,255,200,.2),rgba(0,136,255,.1),transparent);
  display:flex;align-items:center;justify-content:center;
  font-size:18px;
  animation:pulse 2s ease infinite;
}
.ai-dots{
  display:flex;justify-content:center;gap:5px;
  position:absolute;bottom:-24px;left:0;right:0;
}
.ai-dot{
  width:4px;height:4px;border-radius:50%;
  background:var(--c);
  animation:pulse 1.2s ease infinite;
}
.ai-dot:nth-child(2){animation-delay:.2s}
.ai-dot:nth-child(3){animation-delay:.4s}

.ai-title{
  font-family:'Orbitron',monospace;
  font-size:20px;font-weight:700;
  letter-spacing:.1em;color:var(--txt);
  margin-bottom:.4rem;
}
.ai-sub{
  font-size:13px;color:var(--txt2);
  font-weight:300;margin-bottom:2rem;
  font-family:'JetBrains Mono',monospace;
  letter-spacing:.04em;
}
.prog-track{
  height:2px;background:rgba(0,255,200,.1);
  border-radius:99px;overflow:hidden;
  margin-bottom:.5rem;position:relative;
}
.prog-fill{
  height:100%;
  background:linear-gradient(90deg,var(--c),var(--blue));
  border-radius:99px;transition:width .5s ease;
  position:relative;
}
.prog-fill::after{
  content:'';position:absolute;
  right:-2px;top:-4px;bottom:-4px;width:8px;
  background:var(--c);filter:blur(4px);
  border-radius:99px;
}
.prog-pct{
  font-family:'Orbitron',monospace;font-size:11px;
  color:var(--c);text-align:right;margin-bottom:1.75rem;
  letter-spacing:.08em;
  text-shadow:0 0 10px rgba(0,255,200,.5);
}
.prog-steps{
  display:flex;flex-direction:column;gap:.35rem;
  text-align:left;max-width:300px;margin:0 auto;
}
.prog-step{
  display:flex;align-items:center;gap:.75rem;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;color:var(--txt3);
  padding:.45rem .75rem;border-radius:var(--r-sm);
  transition:all .25s;letter-spacing:.04em;
}
.prog-step.active{
  background:var(--c4);color:var(--c);
  border:1px solid var(--border);
  box-shadow:var(--glow);
}
.prog-step.done{color:var(--txt2)}
.step-ico{font-size:12px;width:16px;text-align:center;flex-shrink:0}

/* ── RESULTS ─────────────────────────────────────────────────────────────── */
.res-hd{
  display:flex;align-items:flex-start;
  justify-content:space-between;gap:1rem;
  flex-wrap:wrap;margin-bottom:2rem;
}
.res-title{
  font-family:'Orbitron',monospace;
  font-size:20px;font-weight:700;
  letter-spacing:.08em;color:var(--c);
  text-shadow:0 0 15px rgba(0,255,200,.3);
}
.res-meta{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--txt3);
  margin-top:5px;letter-spacing:.08em;
}
.res-actions{display:flex;gap:.5rem;flex-wrap:wrap}

/* STATS GRID */
.sum-grid{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:1px;background:var(--border);
  border-radius:var(--r-sm);overflow:hidden;
  border:1px solid var(--border);
  margin-bottom:2rem;
}
.sum-card{
  background:var(--bg2);padding:1.1rem 1rem;
  text-align:center;position:relative;overflow:hidden;
}
.sum-card::before{
  content:'';position:absolute;
  bottom:0;left:0;right:0;height:2px;
  background:var(--c3);
}
.sum-val{
  font-family:'Orbitron',monospace;
  font-size:28px;font-weight:700;letter-spacing:.04em;
  animation:countUp .5s ease both;
  text-shadow:0 0 15px rgba(0,255,200,.3);
}
.sum-lbl{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;color:var(--txt3);
  margin-top:4px;text-transform:uppercase;letter-spacing:.14em;
}
.sum-val.vc{color:var(--c)}.sum-val.vg{color:var(--green)}
.sum-val.va{color:var(--amber)}.sum-val.vr{color:var(--red)}

/* FILTER TABS */
.filter-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem}
.fbtn{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  padding:5px 14px;border-radius:99px;cursor:pointer;
  background:transparent;border:1px solid var(--border);
  color:var(--txt3);transition:all .15s;
}
.fbtn:hover{color:var(--txt2);border-color:var(--border2)}
.fbtn.on{
  background:var(--c3);border-color:var(--border2);
  color:var(--c);box-shadow:var(--glow);
}

/* ── CANDIDATE CARD ──────────────────────────────────────────────────────── */
.cand{
  border:1px solid var(--border);
  border-radius:var(--r);
  background:rgba(6,12,20,.95);
  margin-bottom:.85rem;overflow:hidden;
  animation:fadeUp .4s ease both;
  transition:border-color .25s,box-shadow .25s;
  backdrop-filter:blur(8px);
}
.cand:hover{
  border-color:rgba(0,255,200,.2);
  box-shadow:0 4px 40px rgba(0,0,0,.5), var(--glow);
}
.cand.top1{
  border-color:rgba(0,255,200,.3);
  background:linear-gradient(135deg,rgba(6,12,20,.98),rgba(0,255,200,.03));
}

/* CARD HEADER */
.cand-hd{
  display:flex;align-items:flex-start;
  gap:1rem;padding:1.5rem;
}
.rank-box{
  flex-shrink:0;width:38px;height:38px;
  border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;font-weight:400;
  background:rgba(0,0,0,.5);
  border:1px solid var(--border);color:var(--txt3);
}
.rank-box.gold{
  background:var(--c3);border-color:var(--border2);
  color:var(--c);font-size:16px;
  box-shadow:var(--glow);
}
.cand-info{flex:1;min-width:0}
.cand-name{
  font-family:'Outfit',sans-serif;
  font-size:17px;font-weight:600;
  color:var(--txt);margin-bottom:.35rem;letter-spacing:-.01em;
}
.chips{display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.5rem}
.chip{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;padding:2px 8px;border-radius:4px;
  letter-spacing:.08em;text-transform:uppercase;
}
.ch-n{background:rgba(0,255,200,.05);color:var(--txt2);border:1px solid var(--border)}
.ch-c{background:var(--c3);color:var(--c);border:1px solid var(--border2)}
.ch-a{background:rgba(255,170,0,.08);color:var(--amber);border:1px solid rgba(255,170,0,.2)}
.ch-r{background:rgba(255,68,102,.06);color:var(--red);border:1px solid rgba(255,68,102,.18)}
.ch-g{background:rgba(0,255,136,.08);color:var(--green);border:1px solid rgba(0,255,136,.2)}
.cand-verdict{font-size:13px;color:var(--txt2);line-height:1.55;font-weight:300}

/* SCORE BLOCK */
.score-blk{text-align:right;flex-shrink:0}
.score-ring{
  position:relative;
  width:70px;height:70px;margin-left:auto;
}
.score-svg{width:70px;height:70px;transform:rotate(-90deg)}
.score-bg-circle{fill:none;stroke:rgba(0,255,200,.08);stroke-width:3}
.score-fg-circle{
  fill:none;stroke-width:3;stroke-linecap:round;
  transition:stroke-dashoffset .9s ease;
}
.score-inner{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.score-num{
  font-family:'Orbitron',monospace;
  font-size:16px;font-weight:700;line-height:1;
  animation:countUp .5s ease;
}
.score-den{font-size:8px;color:var(--txt3);margin-top:1px;font-family:'JetBrains Mono',monospace}

/* DIVIDER BAR */
.cand-divider{
  height:1px;
  background:linear-gradient(90deg,transparent,var(--border2),transparent);
  margin:0 1.5rem;
}

/* SKILL BARS */
.skills-wrap{padding:1.1rem 1.5rem}
.skills-label{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;text-transform:uppercase;
  letter-spacing:.16em;color:var(--txt3);margin-bottom:.8rem;
}
.sb-row{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
.sb-lbl{font-size:12px;color:var(--txt2);width:140px;flex-shrink:0;font-weight:300}
.sb-track{
  flex:1;height:3px;
  background:rgba(0,255,200,.06);
  border-radius:99px;overflow:hidden;
  position:relative;
}
.sb-fill{
  height:100%;--w:0%;width:var(--w);border-radius:99px;
  animation:fillBar .9s ease-out both;
  position:relative;
}
.sb-fill::after{
  content:'';position:absolute;
  right:0;top:-3px;bottom:-3px;width:6px;
  border-radius:99px;filter:blur(3px);
  background:inherit;opacity:.8;
}
.sb-val{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--txt2);
  width:26px;text-align:right;flex-shrink:0;
}

/* DETAILS */
.det-grid{
  display:grid;grid-template-columns:1fr 1fr;
  border-top:1px solid var(--border);
}
.det-col{padding:1.1rem 1.5rem}
.det-col:first-child{border-right:1px solid var(--border)}
.det-lbl{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;text-transform:uppercase;
  letter-spacing:.16em;margin-bottom:.6rem;
}
.det-col.str .det-lbl{color:var(--c)}
.det-col.gap .det-lbl{color:var(--amber)}
.det-item{
  display:flex;gap:8px;font-size:13px;
  color:var(--txt2);line-height:1.5;
  margin-bottom:.3rem;font-weight:300;
}
.det-item span{flex-shrink:0;font-size:10px;margin-top:3px}
.str .det-item span{color:var(--c)}
.gap .det-item span{color:var(--amber)}

/* WHY REJECTED */
.why-box{
  margin:0 1.5rem 1.25rem;
  background:rgba(255,68,102,.05);
  border:1px solid rgba(255,68,102,.15);
  border-radius:var(--r-sm);
  padding:.9rem 1.1rem;
  font-size:13px;color:rgba(255,100,120,.85);
  line-height:1.6;font-weight:300;
}
.why-lbl{
  font-family:'JetBrains Mono',monospace;
  font-size:9px;text-transform:uppercase;
  letter-spacing:.12em;color:var(--red);margin-bottom:.4rem;
}

/* EXPAND */
.expand-btn{
  width:100%;background:none;border:none;
  border-top:1px solid var(--border);
  padding:.65rem 1.5rem;
  display:flex;align-items:center;justify-content:center;gap:6px;
  font-family:'JetBrains Mono',monospace;
  font-size:9px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--txt3);cursor:pointer;transition:all .15s;
}
.expand-btn:hover{color:var(--c);background:var(--c5)}

/* INVALID */
.invalid-box{
  background:rgba(255,170,0,.05);
  border:1px solid rgba(255,170,0,.2);
  border-radius:var(--r-sm);padding:.8rem 1.1rem;
  font-size:13px;color:var(--amber);
  margin-bottom:1.25rem;font-weight:300;
}

/* FOOTER */
footer{
  position:relative;z-index:1;
  text-align:center;padding:2rem;
  font-family:'JetBrains Mono',monospace;
  font-size:10px;letter-spacing:.14em;
  color:var(--txt3);text-transform:uppercase;
  border-top:1px solid var(--border);
}

@media(max-width:640px){
  .nav{padding:0 1.25rem}
  .hero{padding:90px 1.25rem 50px}
  .main{padding:0 1.25rem 6rem}
  .panel{padding:1.25rem}
  .sum-grid{grid-template-columns:repeat(2,1fr)}
  .det-grid{grid-template-columns:1fr}
  .det-col:first-child{border-right:none;border-bottom:1px solid var(--border)}
  .hero h1{font-size:32px}
  .hero-stats{flex-direction:column;width:100%}
  .hstat{border-right:none;border-bottom:1px solid var(--border)}
  .hstat:last-child{border-bottom:none}
}
`;

// ── helpers ───────────────────────────────────────────────────────────────────
const sColor = s => s >= 80 ? "#00ffc8" : s >= 65 ? "#ffaa00" : "#ff4466";
const sLabel = s => s >= 80 ? "EXCELLENT" : s >= 65 ? "GOOD" : s >= 50 ? "FAIR" : "POOR";
const recChip = r => {
  const v = (r||"").toLowerCase();
  if (v.includes("interview")) return ["ch-c",  r];
  if (v.includes("phone"))     return ["ch-a",  r];
  if (v.includes("hold"))      return ["ch-n",  r];
  return ["ch-r", r];
};
const fmtSz = b => b<1048576 ? (b/1024).toFixed(1)+" KB" : (b/1048576).toFixed(1)+" MB";
const uid   = () => Math.random().toString(36).slice(2,9);

// ── export ────────────────────────────────────────────────────────────────────
function exportCSV(d) {
  const h = ["Rank","Name","Score","Verdict","Recommendation","Experience","Education","Strengths","Gaps","Notes"];
  const rows = d.rankings.map(r => [
    r.rank,`"${r.name}"`,r.score,
    `"${(r.verdict||"").replace(/"/g,'""')}"`,
    r.recommendation,r.yearsExperience||"",
    `"${(r.education||"").replace(/"/g,'""')}"`,
    `"${(r.strengths||[]).join("; ").replace(/"/g,'""')}"`,
    `"${(r.gaps||[]).join("; ").replace(/"/g,'""')}"`,
    `"${(r.whyRejected||"").replace(/"/g,'""')}"`,
  ]);
  const csv=[h,...rows].map(r=>r.join(",")).join("\n");
  Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),
    download:`hireiq-${Date.now()}.csv`
  }).click();
}
function exportTXT(d) {
  let t=`HIREIQ SCREENING REPORT\n${"═".repeat(50)}\n`;
  t+=`Role: ${d.jobTitle}\nDate: ${new Date(d.screenedAt).toLocaleString()}\n`;
  t+=`Screened: ${d.totalCandidates} | Avg: ${d.summary.avgScore} | Recommended: ${d.summary.recommended}\n\n`;
  d.rankings.forEach(r=>{
    t+=`#${r.rank} ${r.name} — ${r.score}/100 [${r.recommendation}]\n`;
    t+=`   ${r.verdict}\n`;
    t+=`   Strengths: ${(r.strengths||[]).join(", ")}\n`;
    t+=`   Gaps: ${(r.gaps||[]).join(", ")}\n`;
    if(r.whyRejected) t+=`   Note: ${r.whyRejected}\n`;
    t+="\n";
  });
  Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([t],{type:"text/plain"})),
    download:`hireiq-${Date.now()}.txt`
  }).click();
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const R    = 30;
  const circ = 2 * Math.PI * R;
  const fill = circ - (score / 100) * circ;
  const color = sColor(score);
  return (
    <div className="score-ring">
      <svg className="score-svg" viewBox="0 0 70 70">
        <circle className="score-bg-circle" cx="35" cy="35" r={R}/>
        <circle
          className="score-fg-circle"
          cx="35" cy="35" r={R}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={fill}
          style={{filter:`drop-shadow(0 0 4px ${color})`}}
        />
      </svg>
      <div className="score-inner">
        <div className="score-num" style={{color}}>{score}</div>
        <div className="score-den">/100</div>
      </div>
    </div>
  );
}

// ── SkillBar ──────────────────────────────────────────────────────────────────
function SkillBar({ label, value, delay }) {
  const c = value>=75 ? "#00ffc8" : value>=55 ? "#ffaa00" : "#ff4466";
  return (
    <div className="sb-row">
      <div className="sb-lbl">{label}</div>
      <div className="sb-track">
        <div className="sb-fill" style={{"--w":`${value}%`,background:c,animationDelay:`${delay}s`}}/>
      </div>
      <div className="sb-val">{value}</div>
    </div>
  );
}

// ── CandidateCard ─────────────────────────────────────────────────────────────
function CandidateCard({ c, idx }) {
  const [open, setOpen] = useState(idx < 2);
  const isTop  = c.rank === 1;
  const [chipCls, chipLbl] = recChip(c.recommendation);
  const skills = Object.entries(c.skillScores||{});

  return (
    <div className={`cand ${isTop?"top1":""}`} style={{animationDelay:`${idx*.07}s`}}>
      <div className="cand-hd">
        <div className={`rank-box ${isTop?"gold":""}`}>
          {isTop ? "★" : `#${String(c.rank).padStart(2,"0")}`}
        </div>
        <div className="cand-info">
          <div className="cand-name">{c.name}</div>
          <div className="chips">
            <span className={`chip ${chipCls}`}>{chipLbl}</span>
            {isTop && <span className="chip ch-g">Top Pick</span>}
            {c.yearsExperience && <span className="chip ch-n">{c.yearsExperience}</span>}
            <span className="chip ch-n" style={{color:sColor(c.score)}}>{sLabel(c.score)}</span>
          </div>
          <div className="cand-verdict">{c.verdict}</div>
        </div>
        <ScoreRing score={c.score} />
      </div>

      <div className="cand-divider"/>

      {skills.length > 0 && (
        <div className="skills-wrap">
          <div className="skills-label">Skill Assessment</div>
          {skills.map(([k,v],i) => <SkillBar key={k} label={k} value={v} delay={i*.07}/>)}
        </div>
      )}

      <button className="expand-btn" onClick={() => setOpen(!open)}>
        <span>{open?"▲":"▼"}</span>
        {open ? "Collapse Analysis" : "View Full Analysis"}
      </button>

      {open && (<>
        <div className="det-grid">
          <div className="det-col str">
            <div className="det-lbl">Strengths</div>
            {(c.strengths||[]).map((s,i)=>(
              <div className="det-item" key={i}><span>↑</span>{s}</div>
            ))}
          </div>
          <div className="det-col gap">
            <div className="det-lbl">Gaps & Concerns</div>
            {(c.gaps||[]).map((g,i)=>(
              <div className="det-item" key={i}><span>↓</span>{g}</div>
            ))}
          </div>
        </div>
        {c.whyRejected && (
          <div className="why-box">
            <div className="why-lbl">Assessment Note</div>
            {c.whyRejected}
          </div>
        )}
      </>)}
    </div>
  );
}

// ── AI Processing Screen ──────────────────────────────────────────────────────
function AIScreen({ p }) {
  const steps = [
    {key:"extract",   ico:"📄", lbl:"EXTRACTING CV CONTENT"},
    {key:"batch",     ico:"⚡", lbl:"PREPARING ANALYSIS BATCHES"},
    {key:"screening", ico:"🔍", lbl:"AI INTELLIGENCE SCREENING"},
    {key:"normalise", ico:"⚖️",  lbl:"CALIBRATING SCORES"},
    {key:"finalise",  ico:"✨", lbl:"GENERATING FINAL RANKINGS"},
  ];
  const order = steps.map(s=>s.key);
  const ci    = order.indexOf(p.step);

  return (
    <div className="ai-screen">
      <div className="ai-screen-glow"/>
      <div className="ai-rings">
        <div className="ai-ring ai-ring-1"/>
        <div className="ai-ring ai-ring-2"/>
        <div className="ai-ring ai-ring-3"/>
        <div className="ai-ring-core">🧠</div>
        <div className="ai-dots">
          <div className="ai-dot"/>
          <div className="ai-dot"/>
          <div className="ai-dot"/>
        </div>
      </div>
      <div className="ai-title">INTELLIGENCE ACTIVE</div>
      <div className="ai-sub">{p.message || "Initialising candidate analysis..."}</div>
      <div className="prog-track">
        <div className="prog-fill" style={{width:`${p.percent||0}%`}}/>
      </div>
      <div className="prog-pct">{p.percent||0}%</div>
      <div className="prog-steps">
        {steps.map((s,i) => {
          const done   = i < ci;
          const active = s.key === p.step;
          return (
            <div className={`prog-step ${active?"active":""} ${done?"done":""}`} key={s.key}>
              <span className="step-ico">{done?"✓":active?s.ico:"○"}</span>
              {s.lbl}
              {active && p.currentBatch &&
                <span style={{marginLeft:"auto",fontSize:9,opacity:.6}}>
                  {p.currentBatch}/{p.totalBatches}
                </span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [jd,      setJd]      = useState("");
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [prog,    setProg]    = useState({});
  const [results, setResults] = useState(null);
  const [error,   setError]   = useState("");
  const [drag,    setDrag]    = useState(false);
  const [filter,  setFilter]  = useState("all");
  const fileRef = useRef();

  const addFiles = useCallback(incoming => {
    const valid = Array.from(incoming).filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".pdf")||ext.endsWith(".docx")||
             ext.endsWith(".doc")||ext.endsWith(".txt");
    });
    setFiles(prev => [...prev,...valid].slice(0,30));
    setError("");
  },[]);

  const screen = async () => {
    setError("");
    if (!jd.trim()||jd.length<50) return setError("Please provide a more detailed job description (minimum 50 characters).");
    if (!files.length) return setError("Please upload at least one CV to screen.");
    setLoading(true);
    setProg({step:"extract",message:"Initialising...",percent:2});
    const sid = uid();
    const evtSrc = new EventSource(`/api/progress/${sid}`);
    evtSrc.onmessage = e => {
      try{const d=JSON.parse(e.data);setProg(d);if(d.done||d.error)evtSrc.close();}catch{}
    };
    try {
      const fd = new FormData();
      fd.append("jobDescription",jd);
      fd.append("sessionId",sid);
      files.forEach(f=>fd.append("cvs",f));
      const res  = await fetch("/api/screen",{method:"POST",body:fd});
      const data = await res.json();
      evtSrc.close();
      if (!res.ok) throw new Error(data.error||"Something went wrong.");
      setResults(data);
    } catch(err) {
      evtSrc.close();
      setError(err.message);
    } finally { setLoading(false); }
  };

  const reset = () => {
    setResults(null);setFiles([]);
    setJd("");setError("");setFilter("all");
  };

  const filtered = results ? results.rankings.filter(r => {
    if (filter==="interview") return r.recommendation==="Interview";
    if (filter==="phone")     return r.recommendation==="Phone Screen";
    if (filter==="reject")    return r.recommendation==="Reject";
    return true;
  }) : [];

  const showHero = !results && !loading;

  return (<>
    <style>{CSS}</style>
    <div className="bg-layer"/>
    <div className="bg-grid"/>
    <div className="bg-hex"/>

    {/* NAV */}
    <nav className="nav">
      <div className="nav-logo">
        <div className="nav-logo-icon">⚡</div>
        HIREIQ
      </div>
      {loading && (
        <div className="nav-center">
          <div className="nav-live-dot"/>
          <span className="nav-live-txt">PROCESSING</span>
        </div>
      )}
      <div className="nav-tag">Candidate Intelligence</div>
    </nav>

    {/* HERO */}
    {showHero && (
      <div className="hero">
        <div className="hero-badge">
          <div className="hero-badge-dot"/>
          AI-POWERED · UP TO 30 CVS · REAL-TIME ANALYSIS
        </div>
        <h1>
          <span className="line1">INTELLIGENT</span>
          <span className="line2">CANDIDATE SCREENING</span>
        </h1>
        <p className="hero-sub">
          Upload CVs, define the role, and receive a ranked shortlist
          with precision scores, skill intelligence, and hiring recommendations
          — powered by advanced AI analysis.
        </p>
        <div className="hero-stats">
          <div className="hstat">
            <div className="hstat-val">30</div>
            <div className="hstat-lbl">CVs / Session</div>
          </div>
          <div className="hstat">
            <div className="hstat-val">&lt;2M</div>
            <div className="hstat-lbl">Analysis Time</div>
          </div>
          <div className="hstat">
            <div className="hstat-val">100%</div>
            <div className="hstat-lbl">Objective</div>
          </div>
        </div>
      </div>
    )}

    <div className="main">
      {/* INPUT */}
      {showHero && (<>
        <div className="panel">
          <div className="panel-label">Step 01</div>
          <div className="panel-title">Job Description</div>
          <div className="panel-sub">More detail = more accurate intelligence. Include requirements, experience level, and key skills.</div>
          <textarea
            className="jd-area"
            placeholder="Paste the full job description here — role requirements, responsibilities, must-have skills, years of experience..."
            value={jd} onChange={e=>setJd(e.target.value)}
          />
          <div className="jd-footer">
            <div className={`jd-count ${jd.length>=50?"ok":""}`}>
              {jd.length>=50 ? "◉ READY" : `${jd.length}/50 MINIMUM`}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-label">Step 02</div>
          <div className="panel-title">Upload Candidate CVs</div>
          <div className="panel-sub">PDF, Word (.docx) or TXT — up to 30 candidates per session</div>
          <div
            className={`drop ${drag?"over":""}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
            onClick={()=>fileRef.current?.click()}
          >
            <div className="drop-scan"/>
            <input ref={fileRef} type="file" multiple
              accept=".pdf,.docx,.doc,.txt"
              onChange={e=>addFiles(e.target.files)}
              style={{display:"none"}}/>
            <div className="drop-ico">📂</div>
            <div className="drop-title">{drag?"DROP FILES NOW":"DRAG & DROP CVs HERE"}</div>
            <div className="drop-sub">or click to browse your files</div>
            <span className="drop-limit">PDF · DOCX · TXT · MAX 15MB · UP TO 30 CVs</span>
          </div>
          {files.length>0 && (<>
            <div className="file-badge">
              ◉ {files.length} CV{files.length!==1?"s":""} LOADED
              {files.length>8 && <span style={{opacity:.6,marginLeft:4}}>· WILL BATCH PROCESS</span>}
            </div>
            <div className="flist">
              {files.map((f,i)=>(
                <div className="fitem" key={i}>
                  <div className="fitem-ico">
                    {f.name.toLowerCase().endsWith(".pdf")?"📕":
                     f.name.toLowerCase().endsWith(".docx")||f.name.toLowerCase().endsWith(".doc")?"📘":"📝"}
                  </div>
                  <span className="fitem-name">{f.name}</span>
                  <span className="fitem-sz">{fmtSz(f.size)}</span>
                  <button className="fitem-rm" onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}>×</button>
                </div>
              ))}
            </div>
          </>)}
        </div>

        {error && <div className="err"><span>⚠</span><span>{error}</span></div>}

        <button className="btn-screen" onClick={screen} disabled={!jd.trim()||!files.length}>
          {loading
            ? <><div className="spinner"/>ANALYSING CANDIDATES...</>
            : <>⚡ INITIATE SCREENING — {files.length>0?`${files.length} CANDIDATE${files.length!==1?"S":""}`:""}</>
          }
        </button>
      </>)}

      {/* PROCESSING */}
      {loading && <AIScreen p={prog}/>}

      {/* RESULTS */}
      {results && !loading && (<>
        {/* FIX 2: Floating back button */}
        <button onClick={reset} style={{
          display:"flex", alignItems:"center", gap:"8px",
          background:"transparent", border:"1px solid var(--border2)",
          color:"var(--c)", padding:"8px 18px", borderRadius:"99px",
          fontFamily:"JetBrains Mono,monospace", fontSize:"10px",
          letterSpacing:".14em", cursor:"pointer",
          marginBottom:"1rem", transition:"all .2s",
          textTransform:"uppercase",
          boxShadow:"var(--glow)"
        }}
          onMouseOver={e=>e.currentTarget.style.background="var(--c3)"}
          onMouseOut={e=>e.currentTarget.style.background="transparent"}>
          ← BACK TO SCREENING
        </button>

        {/* FIX 1: paddingTop added to prevent title hiding behind nav */}
        <div className="panel" style={{animation:"fadeUp .5s ease", paddingTop:"2.5rem"}}>
          <div className="res-hd">
            <div>
              <div className="panel-label">Screening Complete</div>
              <div className="res-title">{results.jobTitle.toUpperCase()}</div>
              <div className="res-meta">
                {results.totalCandidates} CANDIDATES ANALYSED ·{" "}
                {results.batchesProcessed} BATCH{results.batchesProcessed>1?"ES":""} ·{" "}
                {new Date(results.screenedAt).toLocaleString().toUpperCase()}
              </div>
            </div>
            {/* FIX 2: Updated NEW SCREENING button styling */}
            <div className="res-actions">
              <button className="btn-sm" onClick={()=>exportCSV(results)}>↓ CSV</button>
              <button className="btn-sm" onClick={()=>exportTXT(results)}>↓ TXT</button>
              <button className="btn-sm" onClick={reset} style={{
                background:"var(--c3)",
                borderColor:"var(--border2)",
                color:"var(--c)",
                fontWeight:700,
                letterSpacing:".12em"
              }}>⚡ NEW SCREENING</button>
            </div>
          </div>

          <div className="sum-grid">
            <div className="sum-card">
              <div className="sum-val vc">{results.totalCandidates}</div>
              <div className="sum-lbl">Screened</div>
            </div>
            <div className="sum-card">
              <div className="sum-val" style={{color:sColor(results.summary.avgScore)}}>
                {results.summary.avgScore}
              </div>
              <div className="sum-lbl">Avg Score</div>
            </div>
            <div className="sum-card">
              <div className="sum-val vg">{results.summary.recommended}</div>
              <div className="sum-lbl">Recommended</div>
            </div>
            <div className="sum-card">
              <div className="sum-val vr">{results.summary.rejected}</div>
              <div className="sum-lbl">Rejected</div>
            </div>
          </div>

          {results.invalidFiles?.length>0 && (
            <div className="invalid-box">
              ⚠ Could not read: {results.invalidFiles.join(", ")} — please use text-based files
            </div>
          )}

          <div className="filter-row">
            {[
              ["all",       `ALL (${results.totalCandidates})`],
              ["interview", `INTERVIEW (${results.rankings.filter(r=>r.recommendation==="Interview").length})`],
              ["phone",     `PHONE SCREEN (${results.rankings.filter(r=>r.recommendation==="Phone Screen").length})`],
              ["reject",    `REJECTED (${results.summary.rejected})`],
            ].map(([key,lbl])=>(
              <button key={key} className={`fbtn ${filter===key?"on":""}`} onClick={()=>setFilter(key)}>
                {lbl}
              </button>
            ))}
          </div>

          {filtered.map((c,i)=><CandidateCard key={i} c={c} idx={i}/>)}

          {filtered.length===0 && (
            <div style={{textAlign:"center",padding:"3rem",
              fontFamily:"JetBrains Mono,monospace",fontSize:11,
              color:"var(--txt3)",letterSpacing:".14em"}}>
              NO CANDIDATES IN THIS CATEGORY
            </div>
          )}
        </div>
      </>)}
    </div>

    <footer>HIREIQ · CANDIDATE INTELLIGENCE PLATFORM · {new Date().getFullYear()}</footer>
  </>);
}

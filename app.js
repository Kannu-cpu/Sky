// =====================  EDIT THESE  =====================
// Your private ntfy topic URL for the "she said yes" alert, e.g. "https://ntfy.sh/sky-kannu-7x4m92q"
// Leave "" to skip the alert.
const NTFY_URL = "";

// The love letter. {to} and {from} are replaced by names from the link.
// One string per paragraph. Keep it short: she types nothing, but she reads every word.
const DEFAULT_LETTER = [
  "{to},",
  "Every time I look up, the stars somehow point back to you.",
  "I don't have perfect words, so I built you a sky instead.",
  "There's one question I've been carrying for a while...",
];
// ========================================================

// Link options:  /?to=Name&from=Name&q=Question+here%3F&letter=Line+one|Line+two
const params = new URLSearchParams(location.search);
const TO = params.get("to") || "";
const FROM = params.get("from") || "";
const QUESTION = params.get("q") || "Will you be my girlfriend?";
const LETTER = (params.get("letter") ? params.get("letter").split("|") : DEFAULT_LETTER).map((l) =>
  l.replaceAll("{to}", TO || "you").replaceAll("{from}", FROM)
);

const $ = (id) => document.getElementById(id);
const hint = $("hint"), ask = $("ask"), done = $("done");
const yesBtn = $("yes"), noBtn = $("no");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- extra UI (created here so only this one file needs changing) ----------
const style = document.createElement("style");
style.textContent = `
  #letter { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1rem; padding: 2rem 1.5rem; text-align: center; z-index: 4;
    background: radial-gradient(ellipse at center, rgba(14,16,48,.82) 30%, rgba(14,16,48,.55) 100%);
    transition: opacity .9s ease; cursor: pointer; }
  #letter[hidden] { display: none; }
  #letter.out { opacity: 0; }
  #letter p { margin: 0; max-width: 26ch; font-size: clamp(1.25rem, 5vw, 1.8rem); font-style: italic;
    font-weight: 300; line-height: 1.45; color: #f6e9c8; min-height: 1.45em; }
  #letter small { position: absolute; bottom: 6vh; opacity: .55; font-size: .9rem; }
  #mute { position: fixed; top: 14px; right: 14px; z-index: 6; width: 44px; height: 44px; padding: 0;
    border-radius: 50%; font-size: 1.2rem; display: none; align-items: center; justify-content: center;
    background: rgba(14,16,48,.6); }
  #done { align-items: flex-end; padding-bottom: 14vh; }
`;
document.head.appendChild(style);

const letterEl = document.createElement("div");
letterEl.id = "letter";
letterEl.hidden = true;
document.body.appendChild(letterEl);

const muteBtn = document.createElement("button");
muteBtn.id = "mute";
muteBtn.type = "button";
muteBtn.setAttribute("aria-label", "Toggle music");
muteBtn.textContent = "\u266A";
document.body.appendChild(muteBtn);

// ---------- canvas + state ----------
const canvas = $("sky");
const ctx = canvas.getContext("2d");
let W, H, dpr;
let bgStars = [], heart = [];
let step = 0, bloom = 0;
let celebrating = false;
let ringT = 0;
let heartFade = 1;
let particles = [], rockets = [];

function heartPoint(t) {
  return {
    x: 16 * Math.sin(t) ** 3,
    y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
  };
}

function layout() {
  dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  bgStars = Array.from({ length: Math.round((W * H) / 5000) }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.3 + 0.2, phase: Math.random() * TAU, speed: 0.5 + Math.random() * 1.5,
  }));

  const ts = [0, 0.65, 1.3, 1.95, 2.6, Math.PI, 3.68, 4.33, 4.98, 5.63];
  const scale = Math.min(W * 0.72, H * 0.46) / 34;
  const cx = W / 2, cy = H * 0.4;
  heart = ts.map((t) => {
    const p = heartPoint(t);
    return { x: cx + p.x * scale, y: cy + p.y * scale };
  });
}

// ---------- drawing ----------
function drawBackground(time) {
  ctx.clearRect(0, 0, W, H);
  for (const s of bgStars) {
    ctx.globalAlpha = reduceMotion ? 0.7 : 0.45 + 0.55 * Math.sin(time * 0.001 * s.speed + s.phase);
    ctx.fillStyle = "#e8eaff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function heartPath() {
  ctx.beginPath();
  const pts = [...heart, heart[0]];
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, (pts[i - 1].x + pts[i].x) / 2, (pts[i - 1].y + pts[i].y) / 2);
  }
  ctx.closePath();
}

function drawHeart(time) {
  ctx.globalAlpha = heartFade;
  if (bloom > 0) {
    heartPath();
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, Math.min(W, H) * 0.4);
    g.addColorStop(0, `rgba(232,117,143,${0.55 * bloom})`);
    g.addColorStop(1, `rgba(232,117,143,${0.05 * bloom})`);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.strokeStyle = "#f2d58a";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#f2d58a";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 1; i <= Math.min(step, heart.length); i++) {
    const a = heart[i - 1], b = heart[i % heart.length];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  heart.forEach((s, i) => {
    const lit = i < step;
    const isNext = i === step && step < heart.length;
    ctx.fillStyle = lit || isNext ? "#f2d58a" : "#8f94c9";
    ctx.beginPath();
    ctx.arc(s.x, s.y, lit ? 4 : 3, 0, TAU);
    ctx.fill();
    if (isNext) {
      const pulse = reduceMotion ? 0.5 : (Math.sin(time * 0.004) + 1) / 2;
      ctx.strokeStyle = `rgba(242,213,138,${0.9 - pulse * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 + pulse * 12, 0, TAU);
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
}

function sparkle(x, y, size, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fffbe8";
  ctx.shadowColor = "#fff2b8";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : size * 0.18;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRing(time) {
  if (ringT <= 0) return;
  const p = Math.min(ringT, 1);
  const ease = 1 - (1 - p) ** 3;
  const r = Math.min(W, H) * 0.13;
  ctx.save();
  ctx.translate(W / 2, H * 0.3 - (1 - ease) * H * 0.25);
  ctx.globalAlpha = ease;

  // golden band
  const band = ctx.createLinearGradient(-r, -r, r, r);
  band.addColorStop(0, "#fff0b8");
  band.addColorStop(0.5, "#d9a93f");
  band.addColorStop(1, "#fff0b8");
  ctx.strokeStyle = band;
  ctx.lineWidth = r * 0.2;
  ctx.shadowColor = "rgba(242,213,138,.8)";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r, r * 0.95, 0, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // diamond
  const dw = r * 0.5, top = -r * 0.9;
  const pts = [
    [-dw, top], [-dw * 0.55, top - dw * 0.7], [dw * 0.55, top - dw * 0.7], [dw, top], [0, top + dw * 1.1],
  ];
  const gem = ctx.createLinearGradient(-dw, top - dw, dw, top + dw);
  gem.addColorStop(0, "#ffffff");
  gem.addColorStop(0.5, "#bfe4ff");
  gem.addColorStop(1, "#f7d7ff");
  ctx.fillStyle = gem;
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#cfe9ff";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.beginPath(); // facets
  ctx.moveTo(-dw * 0.55, top - dw * 0.7); ctx.lineTo(-dw * 0.25, top); ctx.lineTo(0, top - dw * 0.7);
  ctx.lineTo(dw * 0.25, top); ctx.lineTo(dw * 0.55, top - dw * 0.7);
  ctx.moveTo(-dw, top); ctx.lineTo(dw, top);
  ctx.moveTo(-dw * 0.25, top); ctx.lineTo(0, top + dw * 1.1); ctx.lineTo(dw * 0.25, top);
  ctx.stroke();

  // twinkles
  const t = reduceMotion ? 0 : time * 0.002;
  sparkle(-dw * 0.3, top - dw * 0.4, r * 0.35 * (0.6 + 0.4 * Math.sin(t * 2)), t, ease);
  sparkle(dw * 0.7, top - dw * 0.1, r * 0.22 * (0.6 + 0.4 * Math.sin(t * 3 + 1)), -t, ease);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- fireworks ----------
const PALETTE = ["#f2d58a", "#e8758f", "#c9ccf0", "#ffffff", "#ffb3c7", "#9fd0ff"];

function launchRocket() {
  rockets.push({
    x: W * (0.12 + Math.random() * 0.76),
    y: H + 10,
    ty: H * (0.12 + Math.random() * 0.4),
    speed: H * (0.011 + Math.random() * 0.006),
    color: PALETTE[(Math.random() * PALETTE.length) | 0],
  });
}

function burst(x, y, n, shape) {
  const base = PALETTE[(Math.random() * PALETTE.length) | 0];
  const alt = PALETTE[(Math.random() * PALETTE.length) | 0];
  for (let i = 0; i < n; i++) {
    const a = shape === "ring" ? (i / n) * TAU : Math.random() * TAU;
    const sp = shape === "ring" ? 4.2 : 1.2 + Math.random() * 5;
    particles.push({
      x, y, px: x, py: y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: 1 + Math.random() * 1.6,
      life: 0.9 + Math.random() * 0.5,
      color: Math.random() < 0.7 ? base : alt,
    });
  }
}

function drawFireworks() {
  for (const r of rockets) {
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + 14);
    ctx.lineTo(r.x, r.y);
    ctx.stroke();
    r.y -= r.speed;
    if (r.y <= r.ty) {
      burst(r.x, r.y, reduceMotion ? 50 : 130, Math.random() < 0.4 ? "ring" : "round");
      r.dead = true;
    }
  }
  rockets = rockets.filter((r) => !r.dead);

  for (const p of particles) {
    p.px = p.x; p.py = p.y;
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.045;
    p.life -= 0.011;
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.min(p.life, 1);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  particles = particles.filter((p) => p.life > 0);
}

let lastLaunch = 0;
function frame(time) {
  drawBackground(time);
  drawHeart(time);
  if (step >= heart.length && bloom < 1) bloom = Math.min(1, bloom + 0.01);

  if (celebrating) {
    ringT += 0.012;
    heartFade = Math.max(0.3, heartFade - 0.01);
    if (time - lastLaunch > (reduceMotion ? 1600 : 450)) {
      launchRocket();
      lastLaunch = time;
    }
  }
  drawRing(time);
  drawFireworks();
  requestAnimationFrame(frame);
}

// ---------- music ----------
// Plays music.mp3 if you upload one next to index.html; otherwise a gentle music-box loop is synthesised.
let audioEl = null, actx = null, master = null, musicStarted = false, muted = false;

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  muteBtn.style.display = "flex";
  const a = new Audio("music.mp3");
  a.loop = true;
  a.volume = 0.7;
  a.addEventListener("error", startSynth, { once: true });
  a.play().then(() => { audioEl = a; }).catch(() => {});
}

function startSynth() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  master = actx.createGain();
  master.gain.value = muted ? 0 : 0.22;
  const delay = actx.createDelay();
  delay.delayTime.value = 0.32;
  const fb = actx.createGain();
  fb.gain.value = 0.35;
  delay.connect(fb);
  fb.connect(delay);
  master.connect(actx.destination);
  master.connect(delay);
  delay.connect(actx.destination);

  const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 1];
  const beat = 0.36;
  let next = actx.currentTime + 0.1, n = 0;

  const note = (midi, when) => {
    const f = 440 * 2 ** ((midi - 69) / 12);
    for (const [mult, vol, type] of [[1, 0.5, "triangle"], [2, 0.18, "sine"]]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 1.1);
      o.connect(g);
      g.connect(master);
      o.start(when);
      o.stop(when + 1.2);
    }
  };

  setInterval(() => {
    while (next < actx.currentTime + 0.6) {
      const chord = chords[Math.floor(n / pattern.length) % chords.length];
      note(chord[pattern[n % pattern.length]], next);
      if (n % pattern.length === 0) note(chord[0] - 12, next); // soft bass on each bar
      next += beat;
      n++;
    }
  }, 150);
}

muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.style.opacity = muted ? 0.45 : 1;
  if (audioEl) audioEl.muted = muted;
  if (master) master.gain.value = muted ? 0 : 0.22;
});

// ---------- the letter ----------
let skipTyping = false;
letterEl.addEventListener("pointerdown", () => { skipTyping = true; });

async function showLetter() {
  letterEl.hidden = false;
  letterEl.classList.remove("out");
  letterEl.replaceChildren();
  const tip = document.createElement("small");
  tip.textContent = "tap to skip";
  letterEl.appendChild(tip);

  for (const line of LETTER) {
    const p = document.createElement("p");
    letterEl.insertBefore(p, tip);
    for (const ch of line) {
      p.textContent += ch;
      if (!skipTyping) await sleep(/[,.!?]/.test(ch) ? 260 : 42);
    }
    if (!skipTyping) await sleep(550);
  }
  await sleep(skipTyping ? 300 : 1600);
  letterEl.classList.add("out");
  await sleep(900);
  letterEl.hidden = true;
  reveal();
}

function reveal() {
  $("question").textContent = QUESTION;
  $("signed").textContent = FROM ? `\u2014 ${FROM}` : "";
  ask.hidden = false;
  yesBtn.focus({ preventScroll: true });
}

// ---------- interaction ----------
canvas.addEventListener("pointerdown", (e) => {
  startMusic(); // browsers only allow sound after a tap
  if (step >= heart.length) return;
  const target = heart[step];
  if (Math.hypot(e.clientX - target.x, e.clientY - target.y) <= 40) {
    step++;
    hint.classList.add("gone");
    if (step >= heart.length) setTimeout(showLetter, 2200);
  }
});

let dodges = 0;
function dodge() {
  dodges++;
  noBtn.classList.add("dodging");
  const bw = noBtn.offsetWidth, bh = noBtn.offsetHeight;
  noBtn.style.left = Math.random() * (W - bw - 16) + 8 + "px";
  noBtn.style.top = Math.random() * (H - bh - 16) + 8 + "px";
  if (dodges > 6) noBtn.style.opacity = "0";
  if (dodges > 8) noBtn.style.pointerEvents = "none";
}
noBtn.addEventListener("pointerenter", dodge);
noBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); dodge(); });
noBtn.addEventListener("click", (e) => e.preventDefault());

yesBtn.addEventListener("click", async () => {
  ask.hidden = true;
  done.textContent = TO ? `${TO}, you made my whole sky.` : "You made my whole sky.";
  done.hidden = false;
  celebrating = true;
  burst(W / 2, H * 0.3, 160, "ring");
  burst(W / 2, H * 0.3, 160, "round");
  if (NTFY_URL) {
    try {
      await fetch(NTFY_URL, { method: "POST", body: "She said YES!" });
    } catch { /* the celebration doesn't depend on the network */ }
  }
});

// ---------- start ----------
hint.textContent = TO ? `${TO}, look up. Tap the glowing star.` : "Look up. Tap the glowing star.";
addEventListener("resize", layout);
layout();
requestAnimationFrame(frame);
function notifyMe() {
  fetch("https://ntfy.sh/formyeverything-k8x2q9m4", {
    method: "POST",
    body: "She said YES! 🎉"
  });
}

document.getElementById("yes").addEventListener("click", notifyMe);

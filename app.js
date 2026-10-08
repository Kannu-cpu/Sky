// Personalise via URL:  /?to=Priya&from=Sam&q=Will%20you%20marry%20me%3F
const params = new URLSearchParams(location.search);
const TO = params.get("to") || "";
const FROM = params.get("from") || "";
const QUESTION = params.get("q") || "Do You love me taleen?,try pressing no first pls 😊?";

const $ = (id) => document.getElementById(id);
const hint = $("hint"), ask = $("ask"), done = $("done");
const yesBtn = $("yes"), noBtn = $("no");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = $("sky");
const ctx = canvas.getContext("2d");
let W, H, dpr;

let bgStars = [];
let heart = [];        // the stars she connects
let step = 0;          // how many stars connected so far
let bloom = 0;         // 0 -> 1 once the heart is complete
let particles = [];    // fireworks
let celebrating = false;

// ---------- layout ----------
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

  const count = Math.round((W * H) / 5000);
  bgStars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.3 + 0.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.5,
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
    const tw = reduceMotion ? 0.7 : 0.45 + 0.55 * Math.sin(time * 0.001 * s.speed + s.phase);
    ctx.globalAlpha = tw;
    ctx.fillStyle = "#e8eaff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function heartPath() {
  ctx.beginPath();
  const pts = [...heart, heart[0]];
  // smooth curve through the stars
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
  }
  ctx.closePath();
}

function drawHeart(time) {
  // glowing fill once complete
  if (bloom > 0) {
    heartPath();
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, Math.min(W, H) * 0.4);
    g.addColorStop(0, `rgba(232,117,143,${0.55 * bloom})`);
    g.addColorStop(1, `rgba(232,117,143,${0.05 * bloom})`);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // connecting lines
  ctx.strokeStyle = "#f2d58a";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#f2d58a";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 1; i <= Math.min(step, heart.length); i++) {
    const a = heart[i - 1];
    const b = heart[i % heart.length];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // the stars themselves
  heart.forEach((s, i) => {
    const lit = i < step || (step >= heart.length);
    const isNext = i === step && step < heart.length;
    ctx.fillStyle = lit || isNext ? "#f2d58a" : "#8f94c9";
    ctx.beginPath();
    ctx.arc(s.x, s.y, lit ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();

    if (isNext) {
      const pulse = reduceMotion ? 0.5 : (Math.sin(time * 0.004) + 1) / 2;
      ctx.strokeStyle = `rgba(242,213,138,${0.9 - pulse * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 + pulse * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life -= 0.012;
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  particles = particles.filter((p) => p.life > 0);
}

function burst(x, y) {
  const colors = ["#f2d58a", "#e8758f", "#c9ccf0", "#ffffff"];
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 4.5;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      size: 1 + Math.random() * 2.2,
      life: 0.8 + Math.random() * 0.6,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }
}

function frame(time) {
  drawBackground(time);
  drawHeart(time);
  drawParticles();

  if (step >= heart.length && bloom < 1) bloom = Math.min(1, bloom + 0.01);

  if (celebrating && !reduceMotion && Math.random() < 0.06) {
    burst(W * (0.15 + Math.random() * 0.7), H * (0.15 + Math.random() * 0.5));
  }
  requestAnimationFrame(frame);
}

// ---------- interaction ----------
canvas.addEventListener("pointerdown", (e) => {
  if (step >= heart.length) return;
  const target = heart[step];
  if (Math.hypot(e.clientX - target.x, e.clientY - target.y) <= 40) {
    step++;
    hint.classList.add("gone");
    if (step >= heart.length) setTimeout(reveal, 2200);
  }
});

function reveal() {
  $("question").textContent = QUESTION;
  $("signed").textContent = FROM ? `— ${FROM}` : "";
  ask.hidden = false;
  yesBtn.focus({ preventScroll: true });
}

// "No" politely runs away
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
  burst(W / 2, H / 2);
  try {
    await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: "yes" }),
    });
  } catch { /* the celebration doesn't depend on the network */ }
});

// ---------- start ----------
hint.textContent = TO ? `${TO}, look up. Tap the glowing star.` : "Look up. Tap the glowing star.";
addEventListener("resize", layout);
layout();
requestAnimationFrame(frame);

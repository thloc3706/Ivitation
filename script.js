/* =====================================================
   1. EDITABLE CONTENT
   ===================================================== */
const invitationData = {
  title: "[EVENT TITLE]",
  description: "[DESCRIPTION]",
  details: [
    ["Date", "[DATE]"],
    ["Time", "[TIME]"],
    ["Location", "[LOCATION]"],
    ["Dress Code", "[DRESS CODE]"],
  ],
  extra: "[ADDITIONAL INFORMATION]",
  footer: "[FOOTER NOTE]",
  dateISO: "",                                  // e.g. "2026-12-31T18:00:00" -> enables the countdown
  program: [                                    // timeline rows (add / remove freely)
    { time: "[TIME]", title: "[ACTIVITY 1]", text: "[DESCRIPTION]" },
    { time: "[TIME]", title: "[ACTIVITY 2]", text: "[DESCRIPTION]" },
    { time: "[TIME]", title: "[ACTIVITY 3]", text: "[DESCRIPTION]" },
  ],
  venue: { name: "[LOCATION]", address: "[ADDRESS]" },
  rsvp: { label: "[RSVP BUTTON]", link: "#" },
};

// Logo: put your file in assets/ and set the path, e.g. "assets/logo.png". Empty = placeholder.
const LOGO_SRC = "";

/* =====================================================
   2. ANIMATION TIMING (milliseconds)
   ===================================================== */
const CONFIG = {
  speed: 1,            // 1 = normal, 0.5 = twice as slow, 2 = twice as fast
  maxParticles: 1300,
  // Fire intro (runs automatically)
  t: {
    smallFlame: 800,   // tiny flame appears
    ignite: 1600,      // flame starts growing fast
    burst: 1900,       // sudden burst: sparks + flash
    burn: 2500,        // full-size fire burning
    fadeStart: 4400,   // fire starts dying and flies around the envelope
    envelope: 3300,    // envelope starts burning into view
    burnStart: 3300,   // burn-in reveal begins at the fire's centre
    burnEnd: 6600,     // burn-in reveal finished
    orbitEnd: 6400,    // flame finishes its lap
    fireOut: 6800,     // fire completely gone
    ready: 6800,       // envelope can be clicked
  },
  // After clicking the envelope (ms after the click)
  open: { flap: 0, flapBack: 500, sheetOut: 900, letter: 2600, content: 3800, done: 4800 },
};

/* =====================================================
   3. SETUP
   ===================================================== */
const $ = (s) => document.querySelector(s);
const canvas = $("#fire"), ctx = canvas.getContext("2d");
const envelopeEl = $("#envelope"), letterEl = $("#letter");
const root = document.documentElement, body = document.body;
// If Windows/Edge has "animation effects" turned off, the browser reports "reduced motion".
// false = always play the fire intro. true = skip the fire for people who ask for reduced motion.
const RESPECT_REDUCED_MOTION = false;
const reduceMotion = RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 860px)").matches;

let W = 0, H = 0, dpr = 1, center = { x: 0, y: 0 }, env = { w: 300, h: 200 };

function renderContent() {
  document.querySelectorAll("[data-field]").forEach((el) => {
    const v = invitationData[el.dataset.field];
    if (v) el.textContent = v;
  });
  $("#details").innerHTML = invitationData.details.map(() => "<div><dt></dt><dd></dd></div>").join("");
  document.querySelectorAll("#details div").forEach((row, i) => {
    row.children[0].textContent = invitationData.details[i][0];
    row.children[1].textContent = invitationData.details[i][1];
  });
  if (LOGO_SRC) {
    $("#logoImg").src = LOGO_SRC;
    $("#logoImg").hidden = false;
    $("#logoPlaceholder").hidden = true;
  }
  root.style.setProperty("--k", 1 / (reduceMotion ? 3 : CONFIG.speed));
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  center = { x: W / 2, y: H / 2 };                       // envelope + fire share the screen centre
  env = { w: envelopeEl.offsetWidth, h: envelopeEl.offsetHeight };
}

/* =====================================================
   4. SPRITES (pre-rendered glows keep drawing cheap)
   ===================================================== */
function makeSprite(r, g, b) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},1)`);
  gr.addColorStop(0.3, `rgba(${r},${g},${b},.8)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return c;
}
const SPR = {
  hot: makeSprite(255, 100, 25), gold: makeSprite(255, 150, 45), orange: makeSprite(225, 40, 12),   // red-dominant fire
  red: makeSprite(150, 8, 8), smoke: makeSprite(60, 40, 36),
};

/* =====================================================
   5. PARTICLE SYSTEM
   ===================================================== */
const particles = [];
const rnd = (a, b) => a + Math.random() * (b - a);

function spawn(type, x, y, i = 1) {
  if (particles.length >= CONFIG.maxParticles) return;
  const p = { type, x, y, age: 0 };
  if (type === "flame") {
    Object.assign(p, { vx: rnd(-40, 40), vy: rnd(-260, -90) * (0.5 + i * 0.9), life: rnd(0.7, 1.4), size: rnd(40, 80) * (0.3 + i * 1.5) });
  } else if (type === "spark") {
    const a = rnd(0, Math.PI * 2), s = rnd(60, 380);
    Object.assign(p, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: rnd(1, 2.8), size: rnd(2, 5.5) });
  } else if (type === "smoke") {
    Object.assign(p, { vx: rnd(-14, 14), vy: rnd(-55, -20), life: rnd(1.8, 3), size: rnd(50, 100) });
  } else { // ambient ember
    Object.assign(p, { vx: rnd(-10, 10), vy: rnd(-45, -15), life: rnd(4, 8), size: rnd(1.5, 3.5), sway: rnd(0, 6.28) });
  }
  particles.push(p);
}

function updateParticles(dt) {
  for (let n = particles.length - 1; n >= 0; n--) {
    const p = particles[n];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(n, 1); continue; }
    if (p.type === "spark") { p.vy += 80 * dt; p.vx *= 1 - 0.8 * dt; }
    if (p.type === "ember") p.vx += Math.sin(p.age * 1.5 + p.sway) * 14 * dt;
    if (p.type === "flame") p.vx += rnd(-90, 90) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

function drawParticles() {
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    const f = p.age / p.life;
    let spr, a, s = p.size;
    if (p.type === "flame") {
      spr = f < 0.25 ? SPR.hot : f < 0.55 ? SPR.orange : SPR.red;
      a = (1 - f) * 0.9; s *= 1 - f * 0.6;
    } else if (p.type === "smoke") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.sin(f * Math.PI) * 0.12;
      ctx.drawImage(SPR.smoke, p.x - s / 2, p.y - s / 2, s * (1 + f), s * (1 + f));
      ctx.globalCompositeOperation = "lighter";
      continue;
    } else {
      spr = f < 0.5 ? SPR.gold : SPR.orange;
      a = Math.min(1, (1 - f) * 1.6) * (0.6 + 0.4 * Math.sin(p.age * 18 + p.x)); // twinkle
    }
    ctx.globalAlpha = Math.max(0, a);
    ctx.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}

/* =====================================================
   6. FLAME: intensity + path around the envelope
   ===================================================== */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => t * t * (3 - 2 * t);

function flameIntensity(e) {
  const T = CONFIG.t;
  if (e < T.smallFlame) return 0;
  if (e < T.burst) return lerp(0.08, 0.3, ease(clamp01((e - T.smallFlame) / (T.burst - T.smallFlame))));
  if (e < T.burn) return lerp(0.3, 1.2, 1 - Math.pow(1 - clamp01((e - T.burst) / (T.burn - T.burst)), 3));   // sudden swell
  if (e < T.fadeStart) return 1.1;
  if (e < T.fireOut) return 1.1 * (1 - ease(clamp01((e - T.fadeStart) / (T.fireOut - T.fadeStart))));
  return 0;
}

function flamePosition(e, t, i) {
  const T = CONFIG.t;
  if (e < T.fadeStart) return { x: center.x + Math.sin(t / 130) * 3 * i, y: center.y + 60 * i };
  const u = clamp01((e - T.fadeStart) / (T.orbitEnd - T.fadeStart));
  const angle = Math.PI / 2 - ease(u) * Math.PI * 2.2;           // leaves the centre and circles the envelope
  const spread = ease(clamp01(u * 2));
  const wob = Math.sin(t * 0.004) * 12 + Math.sin(t * 0.0093) * 6;
  const rx = (env.w * 0.72 + wob) * spread, ry = (env.h * 0.95 + wob) * spread;
  return { x: center.x + Math.cos(angle) * rx, y: center.y + 60 * (1 - spread) + Math.sin(angle) * ry - Math.max(0, e - T.orbitEnd) * 0.03 };
}

/* =====================================================
   7. TIMELINES + MAIN LOOP
   ===================================================== */
const addClass = (c) => () => body.classList.add(c);
const stages = [
  [CONFIG.t.envelope, addClass("is-envelope")],
  [CONFIG.t.ready, () => { body.classList.add("is-ready"); ready = true; }],
];
const ALL_CLASSES = ["is-envelope", "is-ready", "is-open", "flap-back", "is-out", "is-letter", "is-content", "is-done"];

let startTime = 0, last = 0, stageIdx = 0, burstDone = false, glow = 0, acc = 0, ambAcc = 0, bAcc = 0, burnVal = 0, bu = 0;
let running = false, ready = false, opened = false, timers = [];

/* Click on envelope: flap opens -> sheet slides out -> letter appears */
function openEnvelope() {
  if (!ready || opened) return;
  opened = true;
  const O = CONFIG.open, k = 1 / (reduceMotion ? 3 : CONFIG.speed);
  const seq = [[O.flap, "is-open"], [O.flapBack, "flap-back"], [O.sheetOut, "is-out"], [O.letter, "is-letter"], [O.content, "is-content"], [O.done, "is-done"]];
  seq.forEach(([ms, c]) => timers.push(setTimeout(() => {
    body.classList.add(c);
    if (c === "is-letter") glow = 1;                      // warm flash when the letter appears
  }, ms * k)));
}

function reset() {
  timers.forEach(clearTimeout); timers = [];
  body.classList.remove(...ALL_CLASSES, "scrolled");
  window.scrollTo(0, 0);
  particles.length = 0;
  burnVal = 0; bu = 0; envelopeEl.style.filter = ""; setBurn(1.2);
  document.querySelector("#burnImg").setAttribute("width", envelopeEl.offsetWidth); document.querySelector("#burnImg").setAttribute("height", envelopeEl.offsetHeight);
  stageIdx = 0; burstDone = false; glow = 0; acc = 0; ready = false; opened = false;
  root.style.setProperty("--glow", 0);
  resize();
  startTime = performance.now(); last = startTime;
  if (!running) { running = true; requestAnimationFrame(frame); }
}

const burnFn = ["#f1", "#f2", "#f3"].map((q) => document.querySelector(q)), burnOff = [0, 0.07, 0.025];
function setBurn(t) { burnFn.forEach((el, n) => el.setAttribute("intercept", (-30 * (t - burnOff[n])).toFixed(3))); }

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const e = reduceMotion ? 1e5 : Math.max(0, (now - startTime) * CONFIG.speed);
  ctx.clearRect(0, 0, W, H);
  const pul = 1 + 0.22 * Math.sin(now / 230) + 0.08 * Math.sin(now / 91);   // the flame "breathes" (phập phồng)

  while (stageIdx < stages.length && e >= stages[stageIdx][0]) stages[stageIdx++][1]();

  const i = flameIntensity(e);
  let target = 0;
  if (i > 0) {
    const pos = flamePosition(e, now, i);
    if (!burstDone && e >= CONFIG.t.burst) {             // the sudden burst
      burstDone = true;
      for (let n = 0; n < (isMobile ? 160 : 320); n++) spawn("spark", pos.x, pos.y);
      for (let n = 0; n < 16; n++) spawn("smoke", pos.x + rnd(-40, 40), pos.y);
    }
    acc += i * pul * (isMobile ? 9 : 16) * (dt * 60);          // emit around the flame head
    while (acc >= 1) {
      acc--; const r = 10 + i * 60, a = rnd(0, 6.28);
      spawn("flame", pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r * 0.35, i * pul);
      if (Math.random() < 0.12 * i) spawn("spark", pos.x, pos.y - 20);
      if (Math.random() < 0.05 * i) spawn("smoke", pos.x, pos.y - 60 * i);
    }
    ctx.globalCompositeOperation = "lighter";            // radial light + white-hot core
    const gs = (160 + i * 700) * pul;
    ctx.globalAlpha = i * 0.5;  ctx.drawImage(SPR.orange, pos.x - gs, pos.y - gs, gs * 2, gs * 2);
    ctx.globalAlpha = i * 0.7;  ctx.drawImage(SPR.hot, pos.x - gs * 0.25, pos.y - gs * 0.3, gs * 0.5, gs * 0.5);
    if (e >= CONFIG.t.burst && e < CONFIG.t.burst + 900) { // screen flash on ignition
      const f = 1 - (e - CONFIG.t.burst) / 900, fs = Math.max(W, H);
      ctx.globalAlpha = f * 0.5; ctx.drawImage(SPR.orange, center.x - fs, center.y - fs, fs * 2, fs * 2);
      const rf = 1 - f;                                   // expanding red shockwave
      ctx.globalAlpha = f * 0.7; ctx.lineWidth = 2 + 18 * f; ctx.strokeStyle = "#ff3a12";
      ctx.beginPath(); ctx.arc(pos.x, pos.y, rf * fs * 0.7, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const d = Math.hypot(pos.x - center.x, pos.y - center.y);   // envelope lighting by proximity
    target = i * clamp01(1 - d / (Math.max(env.w, env.h) * 1.3));
  }
  const TB = CONFIG.t;                                   // PAPER BURN: noise threshold (SVG filter #burn) reveals the envelope patch by patch
  if (e >= TB.burnStart && burnVal < 1) {
    burnVal = clamp01((e - TB.burnStart) / (TB.burnEnd - TB.burnStart));
    const t = lerp(1.08, -0.16, ease(burnVal));
    setBurn(t);
    if (burnVal >= 1) envelopeEl.style.filter = "none";
    const rr = clamp01(1 - (t - 0.225) / 0.55);          // approx. radius of the burning front
    bu += dt * (isMobile ? 60 : 130) * (burnVal < 0.97 ? 1 : 0);
    while (bu >= 1) {                                    // little flames + sparks crawling along the front
      bu--; const a = rnd(0, 6.2832), k = clamp01(rr + rnd(-0.14, 0.1));
      const px = center.x + Math.max(-env.w / 2, Math.min(env.w / 2, Math.cos(a) * env.w * 0.7071 * k));
      const py = center.y + Math.max(-env.h / 2, Math.min(env.h / 2, Math.sin(a) * env.h * 0.7071 * k));
      spawn("flame", px, py, 0.28);
      if (Math.random() < 0.3) spawn("spark", px, py);
    }
  }
  glow = lerp(glow, target, 0.08);
  root.style.setProperty("--glow", glow.toFixed(3));

  if (e > CONFIG.t.fadeStart) {                          // floating embers for the rest of the page
    ambAcc += dt * (isMobile ? 7 : 14);
    while (ambAcc >= 1) { ambAcc--; spawn("ember", rnd(0, W), H + 10); }
  }

  if (body.classList.contains("is-letter")) {           // a low wall of fire along the bottom edge
    bAcc += dt * (isMobile ? 25 : 55);
    while (bAcc >= 1) { bAcc--; spawn("flame", rnd(0, W), H + 8, 0.3); }
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35;
    ctx.drawImage(SPR.orange, -W * 0.1, H - 150, W * 1.2, 300);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  updateParticles(dt);
  drawParticles();
  requestAnimationFrame(frame);
}

/* =====================================================
   8. INTERACTION
   ===================================================== */
window.addEventListener("pointermove", (ev) => {
  root.style.setProperty("--mx", ev.clientX + "px");
  root.style.setProperty("--my", ev.clientY + "px");
  if (body.classList.contains("is-done") && ev.pointerType === "mouse") {
    if (Math.random() < 0.5) {                            // ember trail behind the cursor
      spawn("ember", ev.clientX, ev.clientY);
      const p = particles[particles.length - 1]; if (p) { p.life = 1.4; p.size = 2.6; }
    }
    letterEl.style.setProperty("--ry", ((ev.clientX / W - 0.5) * 8).toFixed(2) + "deg");   // 3D tilt
    letterEl.style.setProperty("--rx", (-(ev.clientY / H - 0.5) * 6).toFixed(2) + "deg");
  }
});
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(resize, 120); });
envelopeEl.addEventListener("click", openEnvelope);
$("#replay").addEventListener("click", reset);

renderContent();
reset();                                              // start immediately (never wait for fonts)
if (document.fonts) document.fonts.ready.then(resize);

/* =====================================================
   9. EXTRA SECTIONS: timeline, countdown, venue, scroll effects
   ===================================================== */
function renderExtras() {
  $("#timeline").innerHTML = invitationData.program.map(() => '<li class="tl-item reveal"><b></b><h3></h3><p></p></li>').join("");
  document.querySelectorAll(".tl-item").forEach((li, i) => {
    const p = invitationData.program[i];
    li.children[0].textContent = p.time; li.children[1].textContent = p.title; li.children[2].textContent = p.text;
  });
  $("#venueName").textContent = invitationData.venue.name;
  $("#venueAddr").textContent = invitationData.venue.address;
  $("#rsvp").textContent = invitationData.rsvp.label;
  $("#rsvp").href = invitationData.rsvp.link;
}

const cd = ["#cdD", "#cdH", "#cdM", "#cdS"].map($);
function tickCountdown() {
  const t = Date.parse(invitationData.dateISO);
  let v = ["--", "--", "--", "--"];
  if (!isNaN(t)) {
    const s = Math.floor(Math.max(0, t - Date.now()) / 1000);
    v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
  }
  cd.forEach((el, i) => {
    if (el.textContent !== v[i]) { el.textContent = v[i]; el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); }
  });
}

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  root.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
  body.classList.toggle("scrolled", scrollY > 80);
  const tl = $("#timeline"), r = tl.getBoundingClientRect();     // timeline line "burns" down as you scroll
  tl.style.setProperty("--tl", clamp01((innerHeight * 0.7 - r.top) / r.height).toFixed(3));
}

renderExtras();
setInterval(tickCountdown, 1000); tickCountdown();
const io = new IntersectionObserver((list) => list.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el, i) => { el.style.setProperty("--d", i % 4); io.observe(el); });
window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
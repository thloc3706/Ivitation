/* =====================================================
   1. EDITABLE CONTENT
   ===================================================== */
const invitationData = {
  guest: "THẠC SĨ HOÀNG THỊ THU",
  description: "Đến tham dự sự kiện biểu diễn văn hóa nghệ thuật",
  details: [
    ["THỜI GIAN", "18 giờ, ngày 28/11/2026"],
    ["ĐỊA ĐIỂM", "Hội trường A.01.01, Cơ sở 2, Trường Đại học Văn Lang"],
  ],
  dateISO: "2026-11-28T18:00:00",                // countdown target
  program: [                                    // timeline rows (add / remove freely)
    { time: "16h30", title: "Workshop trải nghiệm", text: "Workshop bên ngoài hội trường: trải nghiệm đàn đá và đàn T'rưng" },
    { time: "18h30", title: "Chương trình bắt đầu", text: "Khai mạc đêm Khúc Mộc Vân tại Hội trường A.01.01" },
    { time: "21h00", title: "Kết thúc chương trình", text: "Bế mạc đêm Khúc Mộc Vân" },
  ],

  venue: {
    name: "Hội trường A.01.01",
    address: "Cơ sở 2, Trường Đại học Văn Lang",
    mapLink: "https://maps.app.goo.gl/UQhcL1XutZu9Wa4w6",   // Google Maps link
    mapLabel: "Xem bản đồ chỉ đường",
  },
  rsvp: {
    label: "XÁC NHẬN THAM DỰ",
    doneLabel: "ĐÃ XÁC NHẬN ✓",
    // Popup after clicking. {guest} = guest name (auto), {time} / {place} = from details above.
    thanksTitle: "Xin chân thành cảm ơn!",
    thanksText: "Cảm ơn {guest} đã xác nhận tham dự. Sự hiện diện của bạn là niềm vinh dự của chúng tôi, và chúng tôi rất mong được đón bạn tại {place} vào lúc {time}.",
    thanksSign: "Hẹn gặp bạn trong đêm Khúc Mộc Vân ✦",
  },
};

// Logo: put your file in assets/ and set the path, e.g. "assets/logo.png". Empty = placeholder.
const LOGO_SRC = "assets/logo-khuc-moc-van.png";

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
  flameCanvas.width = Math.round(W * FSCALE); flameCanvas.height = Math.round(H * FSCALE);
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
   4b. REALISTIC FLAME: WebGL fragment shader
   Layered, upward-scrolling noise (fbm) shapes tongues of fire; a colour ramp
   goes dark red -> red -> orange -> hot core. Falls back to particles without WebGL.
   ===================================================== */
const flameCanvas = $("#flame"), FSCALE = isMobile ? 0.45 : 0.6, MAXF = 24;
const USE_SHADER_FLAME = false;   // false = classic particle fire (default). true = experimental WebGL shader flame
const gl = USE_SHADER_FLAME ? flameCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }) : null;
const flames = new Float32Array(MAXF * 4), bf = [];     // bf = little flames crawling along the paper-burn front
let nFlames = 0, useGL = false, uRes, uT, uN, uF;

function addFlame(x, y, size, power) {                   // base position (px), height (px), brightness
  if (nFlames >= MAXF) return;
  const o = nFlames++ * 4;
  flames[o] = x * FSCALE; flames[o + 1] = y * FSCALE; flames[o + 2] = size * FSCALE; flames[o + 3] = power;
}

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT; uniform int uN; uniform vec4 uF[${MAXF}];
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02+vec2(3.7,1.9); a*=0.5; } return v; }
vec3 ramp(float d){
  vec3 c=mix(vec3(0.0), vec3(0.42,0.01,0.01), smoothstep(0.02,0.22,d));
  c=mix(c, vec3(0.85,0.08,0.02), smoothstep(0.18,0.45,d));
  c=mix(c, vec3(1.0,0.38,0.05), smoothstep(0.4,0.7,d));
  c=mix(c, vec3(1.0,0.82,0.4), smoothstep(0.72,1.0,d));
  return c; }
void main(){
  vec2 frag=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  vec3 col=vec3(0.0); float alpha=0.0;
  for(int k=0;k<${MAXF};k++){
    if(k>=uN) break;
    vec4 f=uF[k];
    vec2 uv=vec2((frag.x-f.x)/(f.z*0.42), (f.y-frag.y)/f.z);   // x: flame width, y: 0 at base .. 1 at tip
    float h=uv.y;
    if(h<-0.1||h>1.35||abs(uv.x)>2.0) continue;
    float s=float(k)*7.31;                                      // each flame has its own noise
    float n=fbm(vec2(uv.x*1.6+s, h*1.2-uT*1.7));                // slow, large tongues rising
    float n2=fbm(vec2(uv.x*3.6+n*1.4+s, h*2.4-uT*2.6));         // fast, fine flicker (domain-warped)
    float hh=clamp(h,0.0,1.0);
    float w=mix(1.0,0.14,pow(hh,0.75));                         // narrows toward the tip
    float x=(uv.x+(n-0.5)*1.2*hh*hh)/w;                         // flame sways more at the top
    float d=(1.0-x*x)*(1.25-hh)+(n2-0.5)*0.8*(0.35+hh)-hh*0.12;
    d=clamp(d*f.w,0.0,1.0);
    float a=smoothstep(0.02,0.3,d)*smoothstep(-0.08,0.02,h);
    col+=ramp(d)*a; alpha=max(alpha,a);
  }
  gl_FragColor=vec4(min(col,vec3(alpha)),alpha);
}`;

(function initGL() {
  if (!gl) return;
  const sh = (type, src) => {
    const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; }
    return o;
  };
  const vs = sh(gl.VERTEX_SHADER, "attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }");
  const fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, "aP"); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  uRes = gl.getUniformLocation(prog, "uRes"); uT = gl.getUniformLocation(prog, "uT");
  uN = gl.getUniformLocation(prog, "uN"); uF = gl.getUniformLocation(prog, "uF[0]");
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  useGL = true;
})();

function renderFlames(now) {
  if (!useGL) return;
  gl.viewport(0, 0, flameCanvas.width, flameCanvas.height);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (!nFlames) return;
  gl.uniform2f(uRes, flameCanvas.width, flameCanvas.height); gl.uniform1f(uT, now / 1000);
  gl.uniform1i(uN, nFlames); gl.uniform4fv(uF, flames);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

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
  burnVal = 0; bu = 0; bf.length = 0; envelopeEl.style.filter = ""; setBurn(1.2);
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
  nFlames = 0;
  const pul = 1 + 0.22 * Math.sin(now / 230) + 0.08 * Math.sin(now / 91);   // the flame "breathes" (phập phồng)

  while (stageIdx < stages.length && e >= stages[stageIdx][0]) stages[stageIdx++][1]();

  const i = flameIntensity(e);
  let target = 0;
  if (i > 0) {
    const pos = flamePosition(e, now, i);
    const fh = Math.min(W, H) * 0.5 * Math.min(i, 1.2) * (0.92 + 0.1 * pul) + 24;      // flame height: swells + breathes
    addFlame(pos.x, pos.y + fh * 0.12, fh, 0.95 + 0.25 * Math.min(i, 1.2));
    if (!burstDone && e >= CONFIG.t.burst) {             // the sudden burst
      burstDone = true;
      for (let n = 0; n < (isMobile ? 160 : 320); n++) spawn("spark", pos.x, pos.y);
      for (let n = 0; n < 16; n++) spawn("smoke", pos.x + rnd(-40, 40), pos.y);
    }
    acc += i * pul * (isMobile ? 9 : 16) * (dt * 60);          // emit around the flame head
    while (acc >= 1) {
      acc--; const r = 10 + i * 60, a = rnd(0, 6.28);
      if (!useGL) spawn("flame", pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r * 0.35, i * pul);
      if (Math.random() < 0.12 * i) spawn("spark", pos.x, pos.y - 20);
      if (Math.random() < 0.05 * i) spawn("smoke", pos.x, pos.y - 60 * i);
    }
    ctx.globalCompositeOperation = "lighter";            // radial light + white-hot core
    const gs = (160 + i * 700) * pul;
    ctx.globalAlpha = i * 0.5;  ctx.drawImage(SPR.orange, pos.x - gs, pos.y - gs, gs * 2, gs * 2);
    ctx.globalAlpha = i * 0.7;  if (!useGL) ctx.drawImage(SPR.hot, pos.x - gs * 0.25, pos.y - gs * 0.3, gs * 0.5, gs * 0.5);
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
      if (useGL) { if (bf.length < 9 && Math.random() < 0.5) bf.push({ x: px, y: py, s: rnd(50, 110), born: now, life: rnd(500, 1100) }); }
      else spawn("flame", px, py, 0.28);
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
    if (useGL) {
      const cnt = 0;   // bottom fire wall off: the mountains now fill the bottom edge
      for (let n = 0; n < cnt; n++) {
        const k2 = 0.6 + 0.4 * Math.sin(now / 700 + n * 1.9);
        addFlame((n + 0.5) * W / cnt, H + 14, H * 0.13 * (0.8 + 0.3 * Math.sin(now / 530 + n * 2.7)), 0.55 * k2 + 0.25);
      }
    }
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35;
    ctx.drawImage(SPR.orange, -W * 0.1, H - 150, W * 1.2, 300);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  for (let n = bf.length - 1; n >= 0; n--) {              // small flames on the burning paper edge
    const b = bf[n], u = (now - b.born) / b.life;
    if (u >= 1) { bf.splice(n, 1); continue; }
    const k = Math.sin(u * Math.PI);
    addFlame(b.x, b.y, b.s * (0.6 + 0.4 * k), 0.2 + 0.8 * k);
  }
  updateParticles(dt);
  drawParticles();
  renderFlames(now);
  requestAnimationFrame(frame);
}

/* =====================================================
   8. INTERACTION
   ===================================================== */
window.addEventListener("pointermove", (ev) => {
  root.style.setProperty("--mx", ev.clientX + "px");
  root.style.setProperty("--my", ev.clientY + "px");
  root.style.setProperty("--px", ((ev.clientX / W - 0.5) * 2).toFixed(3));   // mountain parallax
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
  $("#timeline").innerHTML = invitationData.program.map(() => '<li class="tl-item"><b></b><h3></h3><p></p></li>').join("");
  document.querySelectorAll(".tl-item").forEach((li, i) => {
    const p = invitationData.program[i];
    li.children[0].textContent = p.time; li.children[1].textContent = p.title; li.children[2].textContent = p.text;
  });
  $("#venueName").textContent = invitationData.venue.name;
  $("#venueAddr").textContent = invitationData.venue.address;
  $("#rsvp").textContent = invitationData.rsvp.label;
  $("#mapLink").href = invitationData.venue.mapLink || "#";
  $("#mapLabel").textContent = invitationData.venue.mapLabel;
}

/* RSVP: click -> sparks + thank-you popup (no server needed) */
const niceName = (n) => n.toLocaleLowerCase("vi").replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("vi"));
(function setupRsvp() {
  const btn = $("#rsvp"), box = $("#thanks"), closeBtn = $("#thanksClose"), R = invitationData.rsvp;
  const detail = (key) => (invitationData.details.find((d) => d[0] === key) || ["", ""])[1];
  const fill = (t) => t.replace("{guest}", niceName(invitationData.guest)).replace("{time}", detail("THỜI GIAN")).replace("{place}", detail("ĐỊA ĐIỂM") || invitationData.venue.name);
  let timer = 0;

  function openThanks() {
    $("#thanksTitle").textContent = R.thanksTitle;
    $("#thanksText").textContent = fill(R.thanksText);
    $("#thanksSign").textContent = R.thanksSign;
    clearTimeout(timer);
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add("open"));
    closeBtn.focus({ preventScroll: true });
  }
  function closeThanks() {
    box.classList.remove("open");
    timer = setTimeout(() => { box.hidden = true; }, 400);
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener("click", () => {
    const r = btn.getBoundingClientRect();
    for (let n = 0; n < 60; n++) spawn("spark", r.left + r.width / 2, r.top + r.height / 2);   // sparks burst from the button
    for (let n = 0; n < 4; n++) spawn("flame", r.left + r.width / 2, r.top + r.height / 2, 0.6);
    btn.textContent = R.doneLabel;
    btn.classList.add("done");
    openThanks();
  });
  closeBtn.addEventListener("click", closeThanks);
  box.addEventListener("click", (e) => { if (e.target === box) closeThanks(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) closeThanks(); });
})();

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
  root.style.setProperty("--sy", scrollY);                       // parallax for section decorations
  const tl = $("#timeline"), r = tl.getBoundingClientRect();
  const p = clamp01((innerHeight * 0.7 - r.top) / r.height);     // how far the burning line has travelled
  tl.style.setProperty("--tl", p.toFixed(3));
  const fillY = p * tl.offsetHeight, items = tl.querySelectorAll(".tl-item");
  let act = -1;
  items.forEach((li, i) => {
    const hit = fillY >= li.offsetTop + 33;                      // line reached this dot?
    if (hit) act = i;
    if (hit !== li.classList.contains("reached")) {
      li.classList.toggle("reached", hit);                       // dot lights up
      if (hit) { const bb = li.getBoundingClientRect(); for (let n = 0; n < 10; n++) spawn("spark", bb.left - 40, bb.top + 33); }
    }
  });
  items.forEach((li, i) => li.classList.toggle("active", i === act));   // only the latest dot's card pops out
}

renderExtras();
setInterval(tickCountdown, 1000); tickCountdown();
const io = new IntersectionObserver((list) => list.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}), { threshold: 0.15 });
document.querySelectorAll(".reveal, .sd, .scl").forEach((el, i) => { el.style.setProperty("--d", i % 4); io.observe(el); });
window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
// pause cloud animations of sections that are off-screen
const ioVis = new IntersectionObserver((list) => list.forEach((en) => en.target.classList.toggle("is-vis", en.isIntersecting)), { rootMargin: "80px 0px" });
document.querySelectorAll(".sec").forEach((el) => ioVis.observe(el));

/* =====================================================
   10. HINT (rippling letters) + LITHOPHONE (đàn đá)
   ===================================================== */
(function splitHint() {
  const el = $("#hint"), txt = el.textContent.trim();
  let n = 0;
  el.setAttribute("aria-label", txt);
  el.innerHTML = txt.split(" ").map((w) => '<span class="w" aria-hidden="true">' + [...w].map((ch) => `<span class="c" style="--i:${n++}">${ch}</span>`).join("") + "</span>").join(" ");
})();

// Real đàn đá artwork: one invisible button per stone. [x, y] = centre of the stone's top face in the 394x232 image, column by column
// (big stones on the left = low pitch). Notes follow a Vietnamese pentatonic scale across ~4 octaves.
const PADS = [
  [60, 25, 22], [93, 57, 22], [117, 87, 22], [145, 120, 22], [168, 157, 22],
  [152, 37, 17], [175, 72, 17], [197, 100, 17], [222, 127, 17], [240, 158, 17],
  [217, 38, 15], [232, 68, 15], [252, 92, 15], [273, 113, 15], [277, 135, 15], [305, 162, 15],
  [273, 45, 14], [295, 73, 14], [317, 100, 14], [337, 127, 14], [358, 158, 14],
];
const PENTA = [0, 2, 5, 7, 9];
const padFreq = (k) => 130.81 * Math.pow(2, (12 * Math.floor(k / 5) + PENTA[k % 5]) / 12);
let audio = null;

function ping(freq) {                                    // bar-like tone: fundamental + inharmonic partials, long decay
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  const t = audio.currentTime, g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
  g.connect(audio.destination);
  [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([m, a], k) => {
    const o = audio.createOscillator(), og = audio.createGain();
    o.type = k ? "sine" : "triangle"; o.frequency.value = Math.min(freq * m, 6000); og.gain.value = a;
    o.connect(og); og.connect(g); o.start(t); o.stop(t + 2);
  });
}

function strike(btn, sound = true) {
  btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit");
  const ring = document.createElement("i"); ring.className = "ring"; btn.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove());
  const r = btn.getBoundingClientRect();
  for (let n = 0; n < 8; n++) spawn("spark", r.left + r.width / 2, r.top + r.height / 2);   // sparks fly off the stone
  if (sound) ping(padFreq(+btn.dataset.k));
}

(function buildLitho() {
  const box = $("#litho");
  PADS.forEach(([x, y, w], k) => {
    const b = document.createElement("button");
    b.className = "pad"; b.type = "button"; b.dataset.k = k; b.setAttribute("aria-label", "Thanh đá số " + (k + 1));
    b.style.left = (x / 394 * 100) + "%"; b.style.top = (y / 232 * 100) + "%"; b.style.width = w + "%";
    b.addEventListener("pointerdown", () => strike(b));
    b.addEventListener("pointerenter", (ev) => { if (ev.buttons === 1) strike(b); });        // drag across to play a run
    b.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); strike(b); } });
    box.appendChild(b);
  });
  const demo = new IntersectionObserver((list) => {       // silent visual demo the first time it scrolls into view
    if (!list[0].isIntersecting) return;
    demo.disconnect();
    PADS.forEach((_, k) => setTimeout(() => strike(box.querySelectorAll(".pad")[k], false), 500 + k * 120));
  }, { threshold: 0.6 });
  demo.observe(box);
})();

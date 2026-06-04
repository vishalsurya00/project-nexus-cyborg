/*
========================================================================
   PROJECT NEXUS: INTERACTIVE CYBERNETIC MOTOR ENGINE
========================================================================
*/

// --- SOUND SYNTHESIZER ENGINE (Web Audio API) ---
let audioCtx = null;
let isAudioEnabled = false;
let ambientOsc = null;
let ambientGain = null;

const audioToggleBtn = document.getElementById('audio-toggle');
const waveText = audioToggleBtn.querySelector('.wave-icon');

function initAudio() {
  if (audioCtx) return;
  
  // Create audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Start ambient hum
  startAmbientHum();
}

function startAmbientHum() {
  if (!audioCtx || !isAudioEnabled) return;
  
  try {
    // Low frequency drone
    ambientOsc = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    ambientOsc.type = 'triangle';
    ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // A1 note
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, audioCtx.currentTime);
    
    ambientGain.gain.setValueAtTime(0.015, audioCtx.currentTime); // very subtle background hum
    
    ambientOsc.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    
    ambientOsc.start();
  } catch (e) {
    console.warn("Ambient sound startup failed:", e);
  }
}

function stopAmbientHum() {
  if (ambientOsc) {
    try {
      ambientOsc.stop();
      ambientOsc.disconnect();
    } catch(e){}
    ambientOsc = null;
  }
}

// Synth beep creator
function synthBeep(freq, type, duration, volume = 0.05) {
  if (!audioCtx || !isAudioEnabled) return;
  
  // Resume context if suspended by browser security
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Synth beep failed:", e);
  }
}

// Audio presets
const sounds = {
  click: () => synthBeep(880, 'sine', 0.1, 0.04),
  hover: () => synthBeep(600, 'sine', 0.05, 0.02),
  toggleOn: () => {
    synthBeep(523.25, 'sine', 0.15, 0.05); // C5
    setTimeout(() => synthBeep(659.25, 'sine', 0.2, 0.05), 100); // E5
  },
  toggleOff: () => {
    synthBeep(659.25, 'sine', 0.15, 0.05);
    setTimeout(() => synthBeep(523.25, 'sine', 0.2, 0.05), 100);
  },
  installing: () => {
    // Pulse series
    let t = 0;
    for(let i=0; i<8; i++) {
      setTimeout(() => {
        synthBeep(400 + (i * 120), 'triangle', 0.08, 0.03);
      }, t);
      t += 100;
    }
  },
  installed: () => {
    synthBeep(523.25, 'sine', 0.1, 0.05);
    setTimeout(() => synthBeep(659.25, 'sine', 0.1, 0.05), 80);
    setTimeout(() => synthBeep(783.99, 'sine', 0.15, 0.05), 160);
    setTimeout(() => synthBeep(1046.50, 'sine', 0.3, 0.06), 240); // C6 chord resolution
  }
};

// Toggle audio handler
audioToggleBtn.addEventListener('click', () => {
  isAudioEnabled = !isAudioEnabled;
  audioToggleBtn.classList.toggle('active', isAudioEnabled);
  
  if (isAudioEnabled) {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    waveText.textContent = "SOUNDS: ON";
    sounds.toggleOn();
    startAmbientHum();
  } else {
    waveText.textContent = "SOUNDS: OFF";
    sounds.toggleOff();
    stopAmbientHum();
  }
});

// Sound listeners helper
function addSoundTrigger(element, triggerType, soundName) {
  if (!element) return;
  element.addEventListener(triggerType, () => {
    if (sounds[soundName]) {
      sounds[soundName]();
    }
  });
}


// --- FULLSCREEN NEURAL CANVAS GRID ---
const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let maxParticles = 60;
let mouse = { x: null, y: null, radius: 150 };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Track mouse positioning
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = (Math.random() - 0.5) * 0.6;
    this.size = Math.random() * 2 + 1;
    this.pulseSpeed = Math.random() * 0.02 + 0.01;
    this.pulseVal = 0;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Bounds wrapping
    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
    
    // Pulse sizes
    this.pulseVal += this.pulseSpeed;
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + Math.sin(this.pulseVal) * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.fill();
  }
}

// Initialize particles
for (let i = 0; i < maxParticles; i++) {
  particles.push(new Particle());
}

// Particle Loop
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
    
    // Draw links between nearby particles
    for (let j = i + 1; j < particles.length; j++) {
      let dx = particles[i].x - particles[j].x;
      let dy = particles[i].y - particles[j].y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 100) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        let alpha = (1 - (dist / 100)) * 0.08;
        ctx.strokeStyle = `rgba(0, 243, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    
    // Mouse hover neural pull
    if (mouse.x !== null) {
      let dx = particles[i].x - mouse.x;
      let dy = particles[i].y - mouse.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < mouse.radius) {
        // Bend connection line towards cursor
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        let alpha = (1 - (dist / mouse.radius)) * 0.15;
        ctx.strokeStyle = `rgba(255, 0, 85, ${alpha})`; // magenta link on cursor
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }
  
  requestAnimationFrame(animateParticles);
}
animateParticles();


// --- CYBORG AUGMENTATION CONTROLLER DATA ---
const nodeData = {
  brain: {
    title: "Neural Link Core",
    serial: "CLASS: SYNAPSE-NET / Q-NEUR",
    desc: "Establishes a quantum synapse bridge between biological tissue and system modules. Bypasses neuro-chemical latency, enhancing analytical processing speed and sync limits.",
    stats: { speed: 95, latency: 98, energy: 35, density: 10 },
    partId: "svg-part-brain"
  },
  eye: {
    title: "Retinal HUD Scanner",
    serial: "CLASS: SPECTRAL-HUD / OPT-V",
    desc: "Implements overlay mapping, thermal sensors, and real-time environment analytics directly onto the retina. Accelerates aiming profiles and situational awareness diagnostics.",
    stats: { speed: 80, latency: 90, energy: 45, density: 20 },
    partId: "svg-part-eye"
  },
  core: {
    title: "Quantum Bio-Battery",
    serial: "CLASS: FUSION-CELL / NANO-G",
    desc: "A sub-dermal biological battery harnessing core glucose reserves and beta-voltaic decay. Supplies endless current to mechanical modules with minimal thermal load.",
    stats: { speed: 60, latency: 70, energy: 96, density: 35 },
    partId: "svg-part-core"
  },
  arm: {
    title: "Nano-Actuator Arm",
    serial: "CLASS: LIMB-MECH / CARB-N",
    desc: "Carbon-nanotube weave actuators replace fragile organic arm muscle structures. Generates up to 750 Nm of immediate torque while preserving micro-tactile dexterity.",
    stats: { speed: 45, latency: 60, energy: 50, density: 85 },
    partId: "svg-part-arm"
  },
  legs: {
    title: "Subdermal Armor Plates",
    serial: "CLASS: SHIELD-MESH / CARB-T",
    desc: "Ultra-dense kinetic plating bonded to the subdermal skeletal framework. Offers protection against heavy impacts and disperses energy blasts seamlessly across the body frame.",
    stats: { speed: 20, latency: 45, energy: 30, density: 95 },
    partId: "svg-part-legs"
  }
};

let activeNode = 'brain';
const upgradeButtons = document.querySelectorAll('.upgrade-btn');
const hotspots = document.querySelectorAll('.hotspot');

// UI DOM References
const dSerial = document.getElementById('upgrade-serial');
const dTitle = document.getElementById('upgrade-title');
const dDesc = document.getElementById('upgrade-desc');

const statBars = {
  speed: document.getElementById('stat-bar-speed'),
  latency: document.getElementById('stat-bar-latency'),
  energy: document.getElementById('stat-bar-energy'),
  density: document.getElementById('stat-bar-density')
};
const statVals = {
  speed: document.getElementById('stat-val-speed'),
  latency: document.getElementById('stat-val-latency'),
  energy: document.getElementById('stat-val-energy'),
  density: document.getElementById('stat-val-density')
};

// Update active display helper
function selectNode(nodeKey) {
  if (!nodeData[nodeKey]) return;
  activeNode = nodeKey;
  
  // Update selection button styles
  upgradeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-node') === nodeKey);
  });
  
  // Update silhouette hotspots
  hotspots.forEach(hot => {
    hot.classList.toggle('active', hot.getAttribute('data-node') === nodeKey);
  });
  
  // Update description texts
  const data = nodeData[nodeKey];
  dSerial.textContent = data.serial;
  dTitle.textContent = data.title;
  dDesc.textContent = data.desc;
  
  // Update stats counters and fill-widths
  Object.keys(statBars).forEach(key => {
    const val = data.stats[key];
    statBars[key].style.width = `${val}%`;
    statVals[key].textContent = `${val}%`;
  });

  // Highlight corresponding SVG components in the model
  highlightSvgPart(data.partId);
  
  // Play sound effect
  sounds.click();
  
  // Log telemetry check to console
  appendLog(`Telemetry node synced: [${data.title}] - Monitoring values...`, 'cyan');
}

// Highlight svg parts
function highlightSvgPart(partId) {
  // Clear any existing active fills
  const paths = ['svg-part-brain', 'svg-part-eye', 'svg-part-core', 'svg-part-arm', 'svg-part-legs'];
  paths.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.stroke = '';
      element.style.filter = '';
    }
  });
  
  // Apply glowing magenta accent to selected
  const activeElement = document.getElementById(partId);
  if (activeElement) {
    activeElement.style.stroke = 'var(--bio-magenta)';
    activeElement.style.filter = 'drop-shadow(0 0 5px var(--bio-magenta))';
  }
}

// Bind button clicks
upgradeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectNode(btn.getAttribute('data-node'));
  });
  btn.addEventListener('mouseenter', sounds.hover);
});

// Bind hotspot clicks
hotspots.forEach(hot => {
  hot.addEventListener('click', () => {
    selectNode(hot.getAttribute('data-node'));
  });
  hot.addEventListener('mouseenter', sounds.hover);
});

// Install augmentations button simulation
const installBtn = document.getElementById('install-btn');
const installText = document.getElementById('install-btn-text');

installBtn.addEventListener('click', () => {
  if (installBtn.classList.contains('processing')) return;
  
  installBtn.classList.add('processing');
  installBtn.style.borderColor = 'var(--cyber-cyan)';
  installBtn.style.color = 'var(--cyber-cyan)';
  
  sounds.installing();
  appendLog(`INITIALIZING INSTALLATION: ${nodeData[activeNode].title.toUpperCase()}...`, 'cyan');
  
  let pct = 0;
  const interval = setInterval(() => {
    pct += 20;
    installText.textContent = `INSTALLING ${pct}%`;
    appendLog(`Installing subsystem modules... [${pct}%]`);
    
    if (pct >= 100) {
      clearInterval(interval);
      installText.textContent = "AUGMENT SYNC COMPLETE";
      installBtn.style.borderColor = 'var(--system-green)';
      installBtn.style.color = 'var(--system-green)';
      sounds.installed();
      
      appendLog(`UPGRADE COMPLETED: ${nodeData[activeNode].title.toUpperCase()} - Synaptic mesh verified!`, 'cyan');
      
      setTimeout(() => {
        installBtn.classList.remove('processing');
        installText.textContent = "INITIALIZE UPGRADE";
        installBtn.style.borderColor = '';
        installBtn.style.color = '';
      }, 3000);
    }
  }, 400);
});

// Hover audio additions for UI links
document.querySelectorAll('a, .btn-portal, .btn-primary, .btn-secondary, .btn-submit, .hud-slider').forEach(el => {
  el.addEventListener('mouseenter', sounds.hover);
});


// --- REAL-TIME DIAGNOSTICS HUD CONSOLE LOGS ---
const terminalFeed = document.getElementById('terminal-feed');

function appendLog(message, styleType = '') {
  const line = document.createElement('div');
  line.className = 'console-line';
  
  const time = new Date();
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
  
  let labelClass = '';
  if (styleType === 'critical') labelClass = 'class="critical"';
  if (styleType === 'cyan') labelClass = 'class="cyan"';
  
  line.innerHTML = `<span class="timestamp">[${timeStr}]</span> <span ${labelClass}>${message}</span>`;
  terminalFeed.appendChild(line);
  
  // Scroll down to show latest console line
  terminalFeed.scrollTop = terminalFeed.scrollHeight;
  
  // Cap at 30 items
  while (terminalFeed.childNodes.length > 30) {
    terminalFeed.removeChild(terminalFeed.firstChild);
  }
}

// Continuous log updates generator
const logPool = [
  "Sub-dermal kinetic shield mesh structural integrity: 99.4%",
  "Verifying neurotransmitter relay nodes... OK",
  "Checking beta-voltaic blood grid glucose absorption rate: 1.2 mol/h",
  "Adjusting quantum matrix calibration: feedback delay reduced.",
  "Warning: Thermal exhaust ventilation at 34°C. Normal operational parameters.",
  "System scan completed. 0 corrupted neural nodes found.",
  "Nano-filament core actuators syncing at 120Hz...",
  "Hologram HUD alignment profile loaded.",
  "Cloud firewall syncing with NEXUS mainframe... verified."
];

setInterval(() => {
  // Only inject random diagnostics logs occasionally if not currently upgrading
  if (!installBtn.classList.contains('processing')) {
    const isWarn = Math.random() > 0.85;
    const msg = logPool[Math.floor(Math.random() * logPool.length)];
    if (isWarn) {
      appendLog(`ALERT: ${msg}`, 'critical');
    } else {
      appendLog(msg);
    }
  }
}, 5000);


// --- RADIAL RADAR CANV SURVEY SCOPE ---
const rCanvas = document.getElementById('radar-canvas');
const rCtx = rCanvas.getContext('2d');

let angle = 0;
let radarBlips = [
  { distance: 80, angle: 45, size: 4, label: "SYS_UP", val: 1.0 },
  { distance: 50, angle: 160, size: 5, label: "SYN_NODE", val: 1.0 },
  { distance: 95, angle: 280, size: 3, label: "UNKNOWN_MOD", val: 0.8 }
];

function drawRadar() {
  const cx = rCanvas.width / 2;
  const cy = rCanvas.height / 2;
  const r = rCanvas.width / 2 - 10;
  
  rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
  
  // Draw base radar target design
  rCtx.beginPath();
  rCtx.arc(cx, cy, r, 0, Math.PI * 2);
  rCtx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
  rCtx.lineWidth = 1;
  rCtx.stroke();
  
  rCtx.beginPath();
  rCtx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
  rCtx.stroke();
  
  rCtx.beginPath();
  rCtx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
  rCtx.stroke();
  
  // Crosshairs
  rCtx.beginPath();
  rCtx.moveTo(cx - r, cy);
  rCtx.lineTo(cx + r, cy);
  rCtx.moveTo(cx, cy - r);
  rCtx.lineTo(cx, cy + r);
  rCtx.stroke();
  
  // Draw radar rotating sweep beam
  rCtx.save();
  rCtx.translate(cx, cy);
  rCtx.rotate(angle);
  
  // Sweep beam gradient
  let grad = rCtx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, 'rgba(0, 243, 255, 0.05)');
  grad.addColorStop(0.8, 'rgba(0, 243, 255, 0.1)');
  grad.addColorStop(1, 'rgba(0, 243, 255, 0.3)');
  
  rCtx.beginPath();
  rCtx.moveTo(0, 0);
  rCtx.arc(0, 0, r, -0.2, 0); // draw narrow sweep beam
  rCtx.closePath();
  rCtx.fillStyle = grad;
  rCtx.fill();
  rCtx.restore();
  
  // Update angle speed
  angle += 0.015;
  if (angle > Math.PI * 2) angle = 0;
  
  // Draw scan target blips
  radarBlips.forEach(blip => {
    // Convert polar angle values to canvas local Cartesian coordinates
    const theta = (blip.angle * Math.PI) / 180;
    const bx = cx + Math.cos(theta) * blip.distance;
    const by = cy + Math.sin(theta) * blip.distance;
    
    // Check if the sweep sweep angle overlaps with the blip
    const sweepDiff = Math.abs(angle - theta);
    if (sweepDiff < 0.05 || (angle < 0.05 && Math.PI * 2 - theta < 0.05)) {
      blip.val = 1.0; // Recharge blip glow strength
    } else {
      blip.val -= 0.005; // Fade over time
      if (blip.val < 0) blip.val = 0;
    }
    
    if (blip.val > 0) {
      rCtx.beginPath();
      rCtx.arc(bx, by, blip.size, 0, Math.PI * 2);
      rCtx.fillStyle = `rgba(255, 0, 85, ${blip.val})`;
      rCtx.shadowBlur = 8;
      rCtx.shadowColor = 'var(--bio-magenta)';
      rCtx.fill();
      rCtx.shadowBlur = 0; // reset shadow
      
      // Draw blip small ID tag
      rCtx.font = "8px 'Share Tech Mono'";
      rCtx.fillStyle = `rgba(0, 243, 255, ${blip.val * 0.8})`;
      rCtx.fillText(blip.label, bx + 8, by - 4);
    }
  });
  
  requestAnimationFrame(drawRadar);
}
drawRadar();


// --- RACK SYSTEM INTERACTION LOGIC ---
const sliders = {
  sync: document.getElementById('slider-sync'),
  overclock: document.getElementById('slider-overclock'),
  shield: document.getElementById('slider-shield')
};
const sliderVals = {
  sync: document.getElementById('val-sync'),
  overclock: document.getElementById('val-overclock'),
  shield: document.getElementById('val-shield')
};

// Synced updates triggers
sliders.sync.addEventListener('input', (e) => {
  const v = e.target.value;
  sliderVals.sync.textContent = `${v} Hz`;
  
  // Scale sound output frequency based on overclocking values dynamically
  if (isAudioEnabled) {
    synthBeep(300 + parseInt(v) * 2, 'sine', 0.03, 0.015);
  }
});

sliders.sync.addEventListener('change', (e) => {
  appendLog(`Sync frequency adjustment applied: ${e.target.value}Hz. Recalibrating.`, 'cyan');
});

sliders.overclock.addEventListener('input', (e) => {
  const v = e.target.value;
  sliderVals.overclock.textContent = `${v}%`;
  
  // Dynamically update diagnostic power reads
  const powerVal = 4.2 + (parseFloat(v) * 0.08);
  document.getElementById('telemetry-power').textContent = `${powerVal.toFixed(2)} kW/s`;
  
  if (v > 85) {
    document.getElementById('telemetry-bio-sync').textContent = "CRITICAL BIO OVERLOAD";
    document.getElementById('telemetry-bio-sync').className = "glow-magenta";
  } else {
    document.getElementById('telemetry-bio-sync').textContent = "98.7% SECURE";
    document.getElementById('telemetry-bio-sync').className = "glow-green";
  }
});

sliders.overclock.addEventListener('change', (e) => {
  const v = parseInt(e.target.value);
  if (v > 80) {
    appendLog(`WARNING: Overclocking thresholds reached: [${v}%] - Biothermal critical warning!`, 'critical');
    sounds.click();
  } else {
    appendLog(`System neural core overclock set to: ${v}%`, 'cyan');
  }
});

sliders.shield.addEventListener('input', (e) => {
  const v = e.target.value;
  sliderVals.shield.textContent = `${v}%`;
});

sliders.shield.addEventListener('change', (e) => {
  appendLog(`Atmospheric biome shield capacity: ${e.target.value}%`, 'cyan');
});

// Initialize default highlighted svg parts
highlightSvgPart(nodeData[activeNode].partId);
appendLog("NEXUS Core Systems online. Sync terminal diagnostics active.");


// ============================================================
//   CYBERNETIC CUSTOM CURSOR SYSTEM
//   Purple-blue targeting reticle with particle trail
// ============================================================
(function initCyberCursor() {
  // Bail on touch devices
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouchDevice) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const trailCanvas = document.getElementById('cursor-trail-canvas');
  if (!dot || !ring || !trailCanvas) return;

  const tCtx = trailCanvas.getContext('2d');

  // --- State ---
  let cursorX = -100, cursorY = -100;       // true mouse position
  let ringX = -100, ringY = -100;           // delayed ring position
  let isHovering = false;
  let isVisible = false;

  // --- Resize trail canvas ---
  function resizeTrailCanvas() {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
  }
  resizeTrailCanvas();
  window.addEventListener('resize', resizeTrailCanvas);

  // --- Trail particles (object pool) ---
  const MAX_TRAIL = 50;
  const trailPool = [];
  for (let i = 0; i < MAX_TRAIL; i++) {
    trailPool.push({ x: 0, y: 0, alpha: 0, size: 0, color: '', active: false });
  }
  let trailIdx = 0;
  let lastSpawnX = 0, lastSpawnY = 0;

  function spawnTrailParticle(x, y) {
    const p = trailPool[trailIdx];
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y + (Math.random() - 0.5) * 6;
    p.alpha = 0.7 + Math.random() * 0.3;
    p.size = 1.5 + Math.random() * 2;
    // Alternate purple / blue
    p.color = Math.random() > 0.5 ? '139,92,246' : '59,130,246';
    p.active = true;
    trailIdx = (trailIdx + 1) % MAX_TRAIL;
  }

  // --- Mouse tracking ---
  document.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }

    // Place dot instantly
    dot.style.left = cursorX + 'px';
    dot.style.top = cursorY + 'px';

    // Spawn trail particles if moved enough
    const dx = cursorX - lastSpawnX;
    const dy = cursorY - lastSpawnY;
    if (dx * dx + dy * dy > 36) {  // ~6px distance threshold
      spawnTrailParticle(cursorX, cursorY);
      lastSpawnX = cursorX;
      lastSpawnY = cursorY;
    }
  });

  document.addEventListener('mouseleave', () => {
    isVisible = false;
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });

  // --- Hover detection on interactive elements ---
  const interactiveSelector = 'a, button, input, select, textarea, .upgrade-btn, .hotspot, .specs-card, .cyber-card, .btn-portal, .btn-primary, .btn-secondary, .btn-submit, .install-system-btn, .hud-slider, .audio-toggle-btn, [role="button"], label[for]';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      if (!isHovering) {
        isHovering = true;
        ring.classList.add('cursor-hover');
        dot.classList.add('cursor-hover');
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      // Check if we're still inside an interactive element
      if (!e.relatedTarget || !e.relatedTarget.closest(interactiveSelector)) {
        isHovering = false;
        ring.classList.remove('cursor-hover');
        dot.classList.remove('cursor-hover');
      }
    }
  });

  // --- Animation loop (lerp ring + draw trail) ---
  const LERP_SPEED = 0.15;

  function cursorLoop() {
    // Lerp ring towards cursor
    ringX += (cursorX - ringX) * LERP_SPEED;
    ringY += (cursorY - ringY) * LERP_SPEED;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';

    // Draw & fade trail particles
    tCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    for (let i = 0; i < MAX_TRAIL; i++) {
      const p = trailPool[i];
      if (!p.active) continue;

      p.alpha -= 0.025;
      p.size *= 0.96;

      if (p.alpha <= 0 || p.size < 0.3) {
        p.active = false;
        continue;
      }

      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      tCtx.fillStyle = `rgba(${p.color},${p.alpha})`;
      tCtx.fill();
    }

    requestAnimationFrame(cursorLoop);
  }

  // Start hidden, show on first move
  dot.style.opacity = '0';
  ring.style.opacity = '0';
  cursorLoop();
})();

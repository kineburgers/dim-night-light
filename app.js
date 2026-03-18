const colors = [
  { name: "Warm", hex: "#ffc6a3" },
  { name: "Amber", hex: "#ffb154" },
  { name: "Sunset", hex: "#ff8a5b" },
  { name: "Rose", hex: "#ff6f91" },
  { name: "Red", hex: "#d64545" },
  { name: "Crimson", hex: "#b0001c" },
  { name: "Lavender", hex: "#bda6ff" },
  { name: "Purple", hex: "#7e5bef" },
  { name: "Indigo", hex: "#4656ff" },
  { name: "Blue", hex: "#3fa9f5" },
  { name: "Ocean", hex: "#3dd6d0" },
  { name: "Mint", hex: "#76f6b2" },
  { name: "Sage", hex: "#cfe8b0" },
  { name: "Soft Lime", hex: "#d8ff8e" },
  { name: "Gold", hex: "#ffd96a" },
  { name: "Apricot", hex: "#ffb480" },
  { name: "Mocha", hex: "#c09b7d" },
  { name: "Moonlight", hex: "#f6f4ef" },
];

const lamp = document.getElementById("lamp");
const palette = document.querySelector(".palette");
const brightness = document.getElementById("brightness");
const nightVisionButton = document.getElementById("nightVision");
const boostButton = document.getElementById("boost");
const galaxyButton = document.getElementById("galaxy");
const musicButton = document.getElementById("music");
const wakeLockButton = document.getElementById("wakeLock");
const installButton = document.getElementById("installApp");
const quickLightButton = document.getElementById("quickLight");
const status = document.getElementById("status");
const installModal = document.getElementById("installModal");
const installText = document.getElementById("installText");
const closeModal = document.getElementById("closeModal");
const controls = document.querySelector(".controls");
const tapHint = document.getElementById("tapHint");
const tapCatcher = document.getElementById("tapCatcher");
const soundOptions = document.getElementById("soundOptions");
const soundButtons = document.querySelectorAll(".sound-option");

let wakeLock = null;
let nightVision = false;
let deferredPrompt = null;
let quickMode = false;
let lampOnly = false;
let boostMode = false;
let autoHideTimer = null;
let musicOn = false;
let galaxyOn = false;
let audioCtx = null;
let masterGain = null;
let currentNodes = [];
let currentSound = "drift";

const setLampColor = (hex) => {
  lamp.style.setProperty("--lamp-color", hex);
  document
    .querySelectorAll(".color-swatch")
    .forEach((button) => button.classList.remove("active"));

  const active = document.querySelector(`[data-color='${hex}']`);
  if (active) active.classList.add("active");
  localStorage.setItem("dim-color", hex);
};

const updateBrightness = (value) => {
  const opacity = Math.min(1, Math.max(0.15, value / 100));
  lamp.style.setProperty("--lamp-opacity", opacity.toString());
  localStorage.setItem("dim-brightness", value.toString());
};

const setStatus = (message) => {
  status.textContent = message;
};

const setControlsHidden = (hidden) => {
  lamp.classList.toggle("controls-hidden", hidden);
  if (hidden) {
    tapHint.setAttribute("aria-hidden", "false");
  } else {
    tapHint.setAttribute("aria-hidden", "true");
  }
};

const scheduleAutoHide = () => {
  if (autoHideTimer) window.clearTimeout(autoHideTimer);
  autoHideTimer = window.setTimeout(() => {
    if (lampOnly || quickMode) setControlsHidden(true);
  }, 6000);
};

const setQuickMode = (enabled) => {
  quickMode = enabled;
  quickLightButton.classList.toggle("active", enabled);
  localStorage.setItem("dim-quick", enabled ? "1" : "0");
  setControlsHidden(enabled);
};

const setGalaxyMode = (enabled) => {
  galaxyOn = enabled;
  galaxyButton.classList.toggle("active", galaxyOn);
  lamp.classList.toggle("galaxy-on", galaxyOn);
  localStorage.setItem("dim-galaxy", galaxyOn ? "1" : "0");
  if (galaxyOn && nightVision) {
    nightVision = false;
    nightVisionButton.classList.remove("active");
    lamp.classList.remove("night-vision");
  }
};

const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state !== "running") {
    await audioCtx.resume();
  }
};

const stopCurrentSound = () => {
  currentNodes.forEach((node) => {
    try {
      node.stop?.(0);
    } catch (err) {
      // ignore
    }
    try {
      node.disconnect?.();
    } catch (err) {
      // ignore
    }
  });
  currentNodes = [];
};

const createNoise = () => {
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

const startSound = (preset) => {
  if (!audioCtx || !masterGain) return;
  stopCurrentSound();
  currentSound = preset;
  localStorage.setItem("dim-sound", preset);

  if (preset === "drift") {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = 55;
    osc2.type = "sine";
    osc2.frequency.value = 110;
    gain.gain.value = 0.25;
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.12;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start();
    osc2.start();
    lfo.start();
    currentNodes = [osc1, osc2, lfo, gain];
  } else if (preset === "rain") {
    const noise = createNoise();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    gain.gain.value = 0.18;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    currentNodes = [noise, filter, gain];
  } else if (preset === "breeze") {
    const noise = createNoise();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 420;
    gain.gain.value = 0.12;
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    lfo.start();
    currentNodes = [noise, filter, gain, lfo];
  } else if (preset === "cosmos") {
    const base = audioCtx.createOscillator();
    const shimmer = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const noise = createNoise();
    const noiseFilter = audioCtx.createBiquadFilter();
    const noiseGain = audioCtx.createGain();

    base.type = "sine";
    base.frequency.value = 46;
    shimmer.type = "triangle";
    shimmer.frequency.value = 92;
    gain.gain.value = 0.2;
    lfo.frequency.value = 0.04;
    lfoGain.gain.value = 0.18;

    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 1200;
    noiseGain.gain.value = 0.05;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    base.connect(gain);
    shimmer.connect(gain);
    gain.connect(masterGain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    base.start();
    shimmer.start();
    lfo.start();
    noise.start();
    currentNodes = [base, shimmer, lfo, gain, noise, noiseFilter, noiseGain];
  }

  soundButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.sound === preset);
  });
};

colors.forEach((color, index) => {
  const button = document.createElement("button");
  button.className = "color-swatch";
  button.style.background = color.hex;
  button.setAttribute("type", "button");
  button.setAttribute("aria-label", color.name);
  button.dataset.color = color.hex;

  button.addEventListener("click", () => {
    nightVision = false;
    lamp.classList.remove("night-vision");
    nightVisionButton.classList.remove("active");
    setLampColor(color.hex);
  });

  palette.appendChild(button);
  if (index === 0) button.classList.add("active");
});

brightness.addEventListener("input", (event) => {
  updateBrightness(Number(event.target.value));
  if (boostMode && Number(event.target.value) < 100) {
    boostMode = false;
    boostButton.classList.remove("active");
    lamp.classList.remove("boost");
    localStorage.setItem("dim-boost", "0");
  }
});

nightVisionButton.addEventListener("click", () => {
  nightVision = !nightVision;
  lamp.classList.toggle("night-vision", nightVision);
  nightVisionButton.classList.toggle("active", nightVision);
  if (nightVision) {
    setLampColor("#b0001c");
    setStatus("Night vision mode on. Reds only to preserve dark adaptation.");
  } else {
    setStatus("");
  }
});

const requestWakeLock = async () => {
  if (!("wakeLock" in navigator)) {
    setStatus("Screen lock not supported on this browser.");
    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLockButton.classList.add("active");
    setStatus("Screen will stay awake while this tab is open.");

    wakeLock.addEventListener("release", () => {
      wakeLockButton.classList.remove("active");
      if (!nightVision) setStatus("Screen lock released.");
    });
  } catch (error) {
    setStatus("Could not keep the screen awake. Try again.");
  }
};

wakeLockButton.addEventListener("click", async () => {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
    wakeLockButton.classList.remove("active");
    setStatus("Screen lock released.");
    return;
  }

  requestWakeLock();
});

boostButton.addEventListener("click", () => {
  boostMode = !boostMode;
  boostButton.classList.toggle("active", boostMode);
  lamp.classList.toggle("boost", boostMode);
  localStorage.setItem("dim-boost", boostMode ? "1" : "0");
  if (boostMode) {
    brightness.value = "100";
    updateBrightness(100);
    setStatus("Boost on. Maximum glow for dark rooms.");
  } else {
    setStatus("");
  }
});

galaxyButton.addEventListener("click", () => {
  setGalaxyMode(!galaxyOn);
  if (galaxyOn) {
    setStatus("Galaxy mode on. Slow-moving milky way.");
  } else {
    setStatus("");
  }
});

musicButton.addEventListener("click", async () => {
  musicOn = !musicOn;
  musicButton.classList.toggle("active", musicOn);
  soundOptions.classList.toggle("active", musicOn);
  localStorage.setItem("dim-music", musicOn ? "1" : "0");
  if (musicOn) {
    await initAudio();
    startSound(currentSound);
    setStatus("Sound on. Tap a preset to switch.");
  } else {
    stopCurrentSound();
    if (audioCtx) audioCtx.suspend().catch(() => {});
    setStatus("");
  }
});

soundButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    await initAudio();
    musicOn = true;
    musicButton.classList.add("active");
    soundOptions.classList.add("active");
    localStorage.setItem("dim-music", "1");
    startSound(button.dataset.sound);
    setStatus("Sound on.");
  });
});

const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const isInIosStandalone = window.navigator.standalone === true;

const showInstallHelp = () => {
  installText.textContent = isIos
    ? "On iPhone: tap Share, then \"Add to Home Screen\". On iPad: tap Share, then \"Add to Home Screen\"."
    : "On Android: tap the menu, then \"Add to Home screen\" for quick night access.";
  installModal.classList.add("open");
  installModal.setAttribute("aria-hidden", "false");
};

const hideInstallHelp = () => {
  installModal.classList.remove("open");
  installModal.setAttribute("aria-hidden", "true");
};

closeModal.addEventListener("click", hideInstallHelp);
installModal.addEventListener("click", (event) => {
  if (event.target === installModal) hideInstallHelp();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  if (!isStandalone) installButton.style.display = "inline-flex";
});

installButton.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.style.display = "none";
    setStatus("Added to your home screen.");
    return;
  }

  showInstallHelp();
});

const toggleControls = (event) => {
  if (controls.contains(event.target)) return;
  if (!quickMode && !lampOnly) return;
  const nextHidden = !lamp.classList.contains("controls-hidden");
  setControlsHidden(nextHidden);
  if (!nextHidden) scheduleAutoHide();
};

tapCatcher.addEventListener("click", toggleControls);
tapCatcher.addEventListener("touchstart", toggleControls, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (wakeLock && document.visibilityState === "visible") {
    requestWakeLock();
  }
  if (audioCtx) {
    if (document.visibilityState === "hidden") {
      audioCtx.suspend().catch(() => {});
    } else if (musicOn) {
      audioCtx.resume().catch(() => {});
    }
  }
});

const storedColor = localStorage.getItem("dim-color");
const storedBrightness = localStorage.getItem("dim-brightness");
const storedQuick = localStorage.getItem("dim-quick");
const storedQuickSet = storedQuick !== null;
const storedBoost = localStorage.getItem("dim-boost");
const storedGalaxy = localStorage.getItem("dim-galaxy");
const storedMusic = localStorage.getItem("dim-music");
const storedSound = localStorage.getItem("dim-sound");
const params = new URLSearchParams(window.location.search);
const mode = (params.get("mode") || "").toLowerCase();
lampOnly = params.has("light") || mode === "light" || mode === "lamp";

setLampColor(storedColor || colors[0].hex);
brightness.value = storedBrightness || brightness.value;
updateBrightness(Number(brightness.value));
setControlsHidden(false);

if (isStandalone || isInIosStandalone) {
  installButton.style.display = "none";
} else if (isIos) {
  installButton.style.display = "inline-flex";
}

if (lampOnly) {
  lamp.classList.add("lamp-only");
  setQuickMode(true);
  setControlsHidden(true);
  setStatus("");
} else if (storedQuick === "1") {
  setQuickMode(true);
} else if (!storedQuickSet && (isStandalone || isInIosStandalone)) {
  setQuickMode(true);
}

if (storedBoost === "1") {
  boostMode = true;
  boostButton.classList.add("active");
  lamp.classList.add("boost");
  brightness.value = "100";
  updateBrightness(100);
}

if (storedGalaxy === "1") {
  setGalaxyMode(true);
}

if (storedSound) {
  currentSound = storedSound;
}

if (storedMusic === "1") {
  musicOn = true;
  musicButton.classList.add("active");
  soundOptions.classList.add("active");
}

quickLightButton.addEventListener("click", () => {
  setQuickMode(!quickMode);
  if (quickMode) {
    setStatus("Quick Light on. Tap anywhere to reveal controls.");
  } else {
    setStatus("");
  }
});

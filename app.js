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
const wakeLockButton = document.getElementById("wakeLock");
const installButton = document.getElementById("installApp");
const quickLightButton = document.getElementById("quickLight");
const status = document.getElementById("status");
const installModal = document.getElementById("installModal");
const installText = document.getElementById("installText");
const closeModal = document.getElementById("closeModal");
const controls = document.querySelector(".controls");
const tapHint = document.getElementById("tapHint");

let wakeLock = null;
let nightVision = false;
let deferredPrompt = null;
let quickMode = false;

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

const setQuickMode = (enabled) => {
  quickMode = enabled;
  quickLightButton.classList.toggle("active", enabled);
  localStorage.setItem("dim-quick", enabled ? "1" : "0");
  setControlsHidden(enabled);
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

lamp.addEventListener("click", (event) => {
  if (!quickMode) return;
  if (controls.contains(event.target)) return;
  setControlsHidden(!lamp.classList.contains("controls-hidden"));
});

document.addEventListener("visibilitychange", () => {
  if (wakeLock && document.visibilityState === "visible") {
    requestWakeLock();
  }
});

const storedColor = localStorage.getItem("dim-color");
const storedBrightness = localStorage.getItem("dim-brightness");
const storedQuick = localStorage.getItem("dim-quick");
const storedQuickSet = storedQuick !== null;

setLampColor(storedColor || colors[0].hex);
brightness.value = storedBrightness || brightness.value;
updateBrightness(Number(brightness.value));
setControlsHidden(false);

if (isStandalone || isInIosStandalone) {
  installButton.style.display = "none";
} else if (isIos) {
  installButton.style.display = "inline-flex";
}

if (storedQuick === "1") {
  setQuickMode(true);
} else if (!storedQuickSet && (isStandalone || isInIosStandalone)) {
  setQuickMode(true);
}

quickLightButton.addEventListener("click", () => {
  setQuickMode(!quickMode);
  if (quickMode) {
    setStatus("Quick Light on. Tap anywhere to reveal controls.");
  } else {
    setStatus("");
  }
});

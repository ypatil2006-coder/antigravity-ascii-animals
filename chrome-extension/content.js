(() => {
  // Only target Google Homepage (not search results pages)
  const path = window.location.pathname;
  if (path !== "/" && path !== "/webhp") {
    return;
  }

  let engine = null;
  let canvas = null;
  let currentAnimal = "koi";
  let dropdownBtn = null;
  let dropdownMenu = null;
  let isMenuOpen = false;

  const SPECIES = window.SPECIES_CONFIG || [
    { key: "butterflies", label: "Butterfly", color: "#38bdf8", hotkey: "1" },
    { key: "koi",         label: "Koi",       color: "#fb923c", hotkey: "2" },
    { key: "jellyfish",   label: "Jellyfish", color: "#f472b6", hotkey: "3" },
    { key: "dragonflies", label: "Dragonfly", color: "#4ade80", hotkey: "4" },
    { key: "frogs",       label: "Frog",      color: "#84cc16", hotkey: "5" },
    { key: "cranes",      label: "Crane",     color: "#f8fafc", hotkey: "6" },
    { key: "crabs",       label: "Crab",      color: "#f87171", hotkey: "7" },
    { key: "manta",       label: "Manta",     color: "#818cf8", hotkey: "8" }
  ];

  function injectStyles() {
    if (document.getElementById("google-ascii-style")) return;
    const style = document.createElement("style");
    style.id = "google-ascii-style";
    style.textContent = `
      html, body {
        background-color: #07080c !important;
        background: #07080c !important;
        color-scheme: dark !important;
      }

      #google-ascii-canvas {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 0 !important;
        pointer-events: none !important;
        background-color: #07080c !important;
      }

      /* Google Shell & Search Box */
      body, #viewport, .o3j99, .L3eUgb, .qarstb {
        background: transparent !important;
        background-color: transparent !important;
      }

      /* Center Logo & Search elements */
      .RNNXgb, .a4bIc, .SDkEP {
        background-color: rgba(18, 21, 34, 0.75) !important;
        backdrop-filter: blur(18px) !important;
        -webkit-backdrop-filter: blur(18px) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important;
      }

      .gLFyf {
        color: #ffffff !important;
      }

      /* Buttons & Footer */
      .FPdoLc input[type="submit"], .gNO89b, .RNmpXc {
        background-color: rgba(255, 255, 255, 0.08) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: rgba(255, 255, 255, 0.85) !important;
        border-radius: 8px !important;
      }

      .FPdoLc input[type="submit"]:hover, .gNO89b:hover, .RNmpXc:hover {
        background-color: rgba(255, 255, 255, 0.14) !important;
        color: #ffffff !important;
        border-color: rgba(255, 255, 255, 0.22) !important;
      }

      /* Top navigation & text */
      .gb_d, .gb_e, .gb_f, .gb_q, .gb_H, a, span {
        color: rgba(255, 255, 255, 0.85) !important;
      }

      .fbar {
        background: rgba(7, 8, 12, 0.6) !important;
        backdrop-filter: blur(12px) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
      }

      /* Top Right Dropdown */
      #google-theme-dropdown-btn {
        position: fixed !important;
        top: 14px !important;
        right: 180px !important;
        z-index: 999999 !important;
        height: 32px !important;
        padding: 0 12px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.08) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 9999px !important;
        cursor: pointer !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      }

      #google-theme-dropdown-menu {
        position: fixed !important;
        top: 52px !important;
        right: 180px !important;
        width: 190px !important;
        background: rgba(12, 14, 22, 0.92) !important;
        backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 12px !important;
        padding: 6px !important;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        z-index: 1000000 !important;
      }

      #google-theme-dropdown-menu.hidden {
        display: none !important;
      }

      .google-species-item {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 7px 10px !important;
        border-radius: 6px !important;
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.85) !important;
        font-size: 12px !important;
        cursor: pointer !important;
        text-align: left !important;
        width: 100% !important;
      }

      .google-species-item:hover, .google-species-item.active {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function mountCanvas() {
    if (document.getElementById("google-ascii-canvas")) return;
    canvas = document.createElement("canvas");
    canvas.id = "google-ascii-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.prepend(canvas);

    if (window.AnimalEngine) {
      engine = new window.AnimalEngine(canvas, {
        animal: currentAnimal,
        theme: "dark"
      });

      window.addEventListener("resize", () => {
        if (canvas && engine) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          engine.resize();
        }
      });
    }
  }

  function mountDropdown() {
    if (document.getElementById("google-theme-dropdown-btn")) return;

    dropdownBtn = document.createElement("button");
    dropdownBtn.id = "google-theme-dropdown-btn";
    dropdownBtn.type = "button";

    const meta = SPECIES.find(s => s.key === currentAnimal) || SPECIES[1];
    dropdownBtn.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${meta.color}; box-shadow: 0 0 8px ${meta.color};"></span>
      <span id="google-dropdown-label">${meta.label}</span>
      <span style="font-size: 10px; opacity: 0.6;">▼</span>
    `;

    dropdownMenu = document.createElement("div");
    dropdownMenu.id = "google-theme-dropdown-menu";
    dropdownMenu.className = "hidden";

    SPECIES.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `google-species-item ${s.key === currentAnimal ? "active" : ""}`;
      btn.innerHTML = `
        <span style="width: 7px; height: 7px; border-radius: 50%; background-color: ${s.color};"></span>
        <span>${s.label}</span>
        <span style="margin-left: auto; font-size: 9px; opacity: 0.4;">${s.hotkey}</span>
      `;
      btn.addEventListener("click", () => {
        setAnimal(s.key);
        closeDropdown();
      });
      dropdownMenu.appendChild(btn);
    });

    dropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isMenuOpen = !isMenuOpen;
      dropdownMenu.classList.toggle("hidden", !isMenuOpen);
    });

    window.addEventListener("click", (e) => {
      if (isMenuOpen && !dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
        closeDropdown();
      }
    });

    document.body.appendChild(dropdownBtn);
    document.body.appendChild(dropdownMenu);
  }

  function closeDropdown() {
    isMenuOpen = false;
    dropdownMenu?.classList.add("hidden");
  }

  function setAnimal(animalKey) {
    if (!SPECIES.some(s => s.key === animalKey)) return;
    currentAnimal = animalKey;
    if (engine) engine.setAnimal(animalKey);

    const meta = SPECIES.find(s => s.key === animalKey) || SPECIES[1];
    if (dropdownBtn) {
      const dot = dropdownBtn.querySelector("span");
      const label = document.getElementById("google-dropdown-label");
      if (dot) {
        dot.style.backgroundColor = meta.color;
        dot.style.boxShadow = `0 0 8px ${meta.color}`;
      }
      if (label) label.textContent = meta.label;
    }

    if (chrome?.storage?.local) {
      chrome.storage.local.set({ "ascii_animal_theme": animalKey });
    }
  }

  // Keyboard shortcuts (1-8)
  window.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
      return;
    }
    const keyMap = { "1": "butterflies", "2": "koi", "3": "jellyfish", "4": "dragonflies", "5": "frogs", "6": "cranes", "7": "crabs", "8": "manta" };
    if (keyMap[e.key]) {
      setAnimal(keyMap[e.key]);
    }
  });

  // Init
  async function init() {
    let enabled = true;
    try {
      if (chrome?.storage?.local) {
        const data = await chrome.storage.local.get(["google_theme_enabled", "ascii_animal_theme"]);
        if (typeof data.google_theme_enabled === "boolean") {
          enabled = data.google_theme_enabled;
        }
        if (data.ascii_animal_theme) {
          currentAnimal = data.ascii_animal_theme;
        }
      }
    } catch (_) {}

    if (!enabled) return;

    injectStyles();
    if (document.body) {
      mountCanvas();
      mountDropdown();
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        mountCanvas();
        mountDropdown();
      });
    }
  }

  // Listen for storage changes
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.ascii_animal_theme) {
        const newAnimal = changes.ascii_animal_theme.newValue;
        if (newAnimal && newAnimal !== currentAnimal) {
          setAnimal(newAnimal);
        }
      }
    });
  }

  init();
})();

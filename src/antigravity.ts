import { AnimalEngine } from "./engine";
import { ANIMALS, ANIMAL_KEYS, type AnimalKey } from "./animals";

const SPECIES_CONFIG: { key: AnimalKey; label: string; color: string; hotkey: string }[] = [
  { key: "butterflies", label: "Butterfly", color: "#38bdf8", hotkey: "1" },
  { key: "koi",         label: "Koi",       color: "#fb923c", hotkey: "2" },
  { key: "jellyfish",   label: "Jellyfish", color: "#f472b6", hotkey: "3" },
  { key: "dragonflies", label: "Dragonfly", color: "#4ade80", hotkey: "4" },
  { key: "frogs",       label: "Frog",      color: "#84cc16", hotkey: "5" },
  { key: "cranes",      label: "Crane",     color: "#f8fafc", hotkey: "6" },
  { key: "crabs",       label: "Crab",      color: "#f87171", hotkey: "7" },
  { key: "manta",       label: "Manta",     color: "#818cf8", hotkey: "8" }
];

export class AntigravityBackground {
  engine: AnimalEngine | null = null;
  canvas: HTMLCanvasElement | null = null;
  currentAnimal: AnimalKey = "butterflies";
  style: HTMLStyleElement | null = null;
  dropdownBtn: HTMLElement | null = null;
  dropdownMenu: HTMLElement | null = null;
  observer: MutationObserver | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem("agy-ascii-selected-theme");
      if (saved && SPECIES_CONFIG.some((s) => s.key === saved)) {
        this.currentAnimal = saved as AnimalKey;
        window.dispatchEvent(new CustomEvent("agy-animal-changed", { detail: { animal: this.currentAnimal } }));
      }
    } catch (_) {}
    this.init();
  }

  init() {
    // 1. Remove old elements
    document.getElementById("agy-anim-canvas")?.remove();
    document.getElementById("agy-anim-style")?.remove();
    document.getElementById("agy-fullscreen-style")?.remove();
    document.getElementById("agy-modal-test")?.remove();
    document.getElementById("agy-modal-blur-tune")?.remove();
    document.getElementById("agy-perf-test")?.remove();
    document.getElementById("antigravity-ascii-nav")?.remove();
    document.getElementById("agy-theme-dropdown-btn")?.remove();
    document.getElementById("agy-theme-dropdown-menu")?.remove();

    // 2. Fullscreen Canvas mounted directly to document.body
    this.canvas = document.createElement("canvas");
    this.canvas.id = "agy-anim-canvas";
    this.canvas.style.cssText = `
      position: fixed !important;
      top: 0px !important;
      left: 0px !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 0 !important;
      pointer-events: none !important;
    `;
    document.body.prepend(this.canvas);

    // 3. Ultra-Optimized Translucency Styles
    this.style = document.createElement("style");
    this.style.id = "agy-anim-style";
    this.style.textContent = `
      :root, html, body, .theme-standalone, .dark, .theme-dark {
        --background: transparent !important;
        --color-background: transparent !important;
        --sidebar: transparent !important;
        --color-sidebar: transparent !important;
        --card: rgba(16, 18, 28, 0.45) !important;
        --color-card: rgba(16, 18, 28, 0.45) !important;
        --card-border: rgba(255, 255, 255, 0.12) !important;
        --color-card-border: rgba(255, 255, 255, 0.12) !important;
        --shell: transparent !important;
        --content: transparent !important;
        --onyx-frame: rgba(14, 16, 24, 0.38) !important;
        --onyx-raised: rgba(18, 20, 32, 0.50) !important;
        --border: rgba(255, 255, 255, 0.10) !important;
      }

      /* Root wrappers */
      html, body, #root, #root > div, .agy-shell, .agy-sheet {
        background-color: transparent !important;
        background: transparent !important;
      }

      body {
        background-color: #07080c !important;
      }

      #agy-anim-canvas {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 0 !important;
        pointer-events: none !important;
      }

      /* 1. Sidebar: exactly 1 blur on the outer container */
      .agy-shell .flex > .h-full.w-full > .bg-sidebar,
      .h-full.w-full.flex.flex-col.pb-2.bg-sidebar {
        background-color: rgba(12, 14, 22, 0.42) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
      }

      /* Strip all redundant nested blurs inside sidebar */
      .agy-shell .flex > .h-full.w-full > .bg-sidebar *,
      .h-full.w-full.flex.flex-col.pb-2.bg-sidebar * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background-color: transparent !important;
        background: transparent !important;
      }

      .agy-shell .flex > .h-full.w-full > .bg-sidebar .group\\/headerbtn:hover,
      .agy-shell .flex > .h-full.w-full > .bg-sidebar [class*="hover:"]:hover {
        background-color: rgba(255, 255, 255, 0.08) !important;
      }

      /* 2. Prompt Composer */
      .surface-composer,
      #antigravity\\.agentSidePanelInputBox {
        background-color: rgba(14, 16, 26, 0.55) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
      }

      .surface-composer-card {
        background-color: rgba(16, 18, 30, 0.45) !important;
        border-radius: inherit !important;
      }

      .surface-composer * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .surface-composer textarea,
      .surface-composer [contenteditable="true"] {
        background: transparent !important;
        color: #ffffff !important;
      }

      /* 3. Settings Modal: Backdrop diffuses the chat underneath; dialog has crisp zero-blur dark glass */
      .settings-modal-backdrop {
        background-color: rgba(0, 0, 0, 0.40) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
      }

      .settings-modal-container,
      .agy-dialog,
      [role="dialog"] {
        background-color: rgba(14, 16, 26, 0.88) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85) !important;
      }

      .settings-modal-container *,
      .agy-dialog * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .settings-modal-container .bg-background,
      .agy-dialog .bg-background {
        background-color: transparent !important;
        background: transparent !important;
      }

      .settings-modal-container .bg-card,
      .agy-dialog .bg-card {
        background-color: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }

      /* 4. Overview Panel & Skills Drawer */
      .animate-overview-panel {
        background-color: rgba(12, 14, 22, 0.45) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
      }
      .animate-overview-panel * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      #antigravity-skills-drawer {
        background-color: rgba(14, 16, 26, 0.50) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
      }

      /* 5. Chat Sheet and Bubbles: Pure alpha blend (ZERO GPU blur overhead) */
      .agy-sheet *,
      .monaco-editor,
      .monaco-editor * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .agy-user-bubble {
        background-color: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.10) !important;
      }

      .agy-agent-bubble,
      .agy-bubble {
        background-color: rgba(12, 14, 22, 0.40) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
      }

      /* 6. Theme Switcher Dropdown Button (Right side of Search) */
      #agy-theme-dropdown-btn {
        height: 28px !important;
        padding: 0 8px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        font-family: inherit !important;
        color: rgba(255, 255, 255, 0.85) !important;
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        -webkit-app-region: no-drag !important;
        pointer-events: auto !important;
        margin-left: 2px !important;
        user-select: none !important;
      }

      #agy-theme-dropdown-btn:hover,
      #agy-theme-dropdown-btn.open {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.12) !important;
        border-color: rgba(255, 255, 255, 0.22) !important;
      }

      #agy-theme-dropdown-menu {
        position: fixed !important;
        z-index: 9999999 !important;
        display: none !important;
        min-width: 170px !important;
        background: rgba(14, 16, 26, 0.94) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 10px !important;
        padding: 4px !important;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7) !important;
        -webkit-app-region: no-drag !important;
        pointer-events: auto !important;
      }

      #agy-theme-dropdown-menu.open {
        display: block !important;
        animation: agyDropdownIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      @keyframes agyDropdownIn {
        from { opacity: 0; transform: translateY(-3px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .agy-dropdown-item {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 6px 9px !important;
        border-radius: 6px !important;
        font-size: 11.5px !important;
        font-weight: 400 !important;
        color: rgba(255, 255, 255, 0.75) !important;
        background: transparent !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: background 0.1s ease !important;
        -webkit-app-region: no-drag !important;
        pointer-events: auto !important;
      }

      .agy-dropdown-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
      }

      .agy-dropdown-item.active {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
      }

      .agy-dropdown-badge {
        font-size: 9px !important;
        opacity: 0.45 !important;
        margin-left: auto !important;
        font-family: monospace !important;
        padding: 1px 4px !important;
        border-radius: 4px !important;
        background: rgba(255, 255, 255, 0.06) !important;
      }
    `;
    document.head.appendChild(this.style);

    // 4. Initialize Official AnimalEngine with dark theme
    this.engine = new AnimalEngine(this.canvas, {
      animal: this.currentAnimal,
      theme: "dark"
    });

    // 5. Mount Dropdown Theme Switcher
    this.mountDropdown();

    // 6. Connect global pointer clicks for startle / feed
    window.addEventListener("pointerdown", (e) => {
      if (!this.engine) return;
      if (e.target && (e.target as HTMLElement).closest("#agy-theme-dropdown-btn, #agy-theme-dropdown-menu")) return;
      
      const rect = this.canvas?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Startle flock or feed
      (this.engine as any).flock?.startle(x, y);
    });

    // 7. Global Keyboard Hotkeys (1-8 for instant species)
    window.addEventListener("keydown", (e) => {
      // Ignore if user is typing in code editor, chat textarea, or input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "Escape") {
        this.closeMenu();
        return;
      }

      const keys: Record<string, AnimalKey> = {
        "1": "butterflies",
        "2": "koi",
        "3": "jellyfish",
        "4": "dragonflies",
        "5": "frogs",
        "6": "cranes",
        "7": "crabs",
        "8": "manta"
      };

      if (keys[e.key]) {
        this.setAnimal(keys[e.key]);
      }
    });

    // 8. Watch for header DOM changes (e.g. route transitions) to re-attach button if needed
    this.observer = new MutationObserver(() => {
      if (!document.getElementById("agy-theme-dropdown-btn")) {
        this.mountDropdown();
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  mountDropdown() {
    // Locate the search button
    const btns = Array.from(document.querySelectorAll("button"));
    const searchBtn = btns.find((b) => {
      const t = b.getAttribute("title") || b.getAttribute("aria-label");
      return t && t.includes("Search");
    });
    if (!searchBtn) return;

    // Create trigger button
    if (!this.dropdownBtn) {
      this.dropdownBtn = document.createElement("button");
      this.dropdownBtn.id = "agy-theme-dropdown-btn";
      this.dropdownBtn.title = "Switch ASCII Animal Theme";
      this.dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleMenu();
      };
    }
    this.renderBtn();

    // Insert right after the search button
    searchBtn.insertAdjacentElement("afterend", this.dropdownBtn);

    // Create dropdown menu container
    if (!this.dropdownMenu) {
      this.dropdownMenu = document.createElement("div");
      this.dropdownMenu.id = "agy-theme-dropdown-menu";
      document.body.appendChild(this.dropdownMenu);

      // Close menu on outside click
      window.addEventListener("pointerdown", (e) => {
        if (!this.dropdownMenu || !this.dropdownBtn) return;
        const target = e.target as HTMLElement;
        if (!this.dropdownMenu.contains(target) && !this.dropdownBtn.contains(target)) {
          this.closeMenu();
        }
      });
    }
    this.renderMenu();
  }

  renderBtn() {
    if (!this.dropdownBtn) return;
    const current = SPECIES_CONFIG.find((s) => s.key === this.currentAnimal) || SPECIES_CONFIG[0];
    this.dropdownBtn.innerHTML = `
      <span style="width: 7px; height: 7px; border-radius: 50%; background: ${current.color}; box-shadow: 0 0 6px ${current.color}; display: inline-block;"></span>
      <span>${current.label}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6; margin-left: 1px;">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  }

  renderMenu() {
    if (!this.dropdownMenu) return;
    this.dropdownMenu.innerHTML = "";
    for (const sp of SPECIES_CONFIG) {
      const item = document.createElement("div");
      const isSelected = sp.key === this.currentAnimal;
      item.className = `agy-dropdown-item ${isSelected ? "active" : ""}`;
      item.innerHTML = `
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${sp.color}; box-shadow: 0 0 5px ${sp.color}; display: inline-block;"></span>
        <span>${sp.label}</span>
        <span class="agy-dropdown-badge">${sp.hotkey}</span>
        ${isSelected ? `<span style="margin-left: 4px; color: ${sp.color}; font-size: 11px;">✓</span>` : ""}
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        this.setAnimal(sp.key);
        this.closeMenu();
      };
      this.dropdownMenu.appendChild(item);
    }
  }

  toggleMenu() {
    if (!this.dropdownMenu) return;
    if (this.dropdownMenu.classList.contains("open")) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    if (!this.dropdownMenu || !this.dropdownBtn) return;
    this.renderMenu();
    const rect = this.dropdownBtn.getBoundingClientRect();
    this.dropdownMenu.style.top = `${Math.round(rect.bottom + 4)}px`;
    this.dropdownMenu.style.left = `${Math.round(rect.left)}px`;
    this.dropdownMenu.classList.add("open");
    this.dropdownBtn.classList.add("open");
  }

  closeMenu() {
    if (!this.dropdownMenu || !this.dropdownBtn) return;
    this.dropdownMenu.classList.remove("open");
    this.dropdownBtn.classList.remove("open");
  }

  setAnimal(key: AnimalKey) {
    if (!this.engine || this.currentAnimal === key) return;
    this.currentAnimal = key;
    try {
      localStorage.setItem("agy-ascii-selected-theme", key);
      window.dispatchEvent(new CustomEvent("agy-animal-changed", { detail: { animal: key } }));
    } catch (_) {}
    this.engine.setAnimal(key);
    this.renderBtn();
    this.renderMenu();
  }
}

// Attach to window
(window as any).AntigravityBackground = AntigravityBackground;
(window as any).AnimalEngine = AnimalEngine;

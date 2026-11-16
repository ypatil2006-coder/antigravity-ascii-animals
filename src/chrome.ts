import { AnimalEngine } from "./engine";
import { type AnimalKey } from "./animals";

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

export class ChromeAsciiBackground {
  engine: AnimalEngine | null = null;
  canvas: HTMLCanvasElement | null = null;
  currentAnimal: AnimalKey = "koi";
  dropdownBtn: HTMLElement | null = null;
  dropdownMenu: HTMLElement | null = null;
  isProfilePicker = false;
  isNewTabPage = false;

  constructor() {
    const href = window.location.href;
    this.isProfilePicker = href.includes("profile-picker") || document.querySelector("profile-picker-app") !== null;
    this.isNewTabPage = href.includes("new-tab-page") || href.includes("chrome://newtab") || document.querySelector("ntp-app") !== null;

    if (!this.isProfilePicker && !this.isNewTabPage) {
      return; // Scope safety guard: ONLY run on Profile Picker or New Tab Page!
    }

    if (!this.isProfilePicker) {
      try {
        const saved = localStorage.getItem("chrome-ascii-animal");
        if (saved && SPECIES_CONFIG.some((s) => s.key === saved)) {
          this.currentAnimal = saved as AnimalKey;
        }
      } catch (_) {}
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", () => this.init());
      return;
    }

    document.getElementById("chrome-ascii-canvas")?.remove();
    document.getElementById("chrome-ascii-style")?.remove();
    document.getElementById("chrome-ascii-dropdown-btn")?.remove();
    document.getElementById("chrome-ascii-dropdown-menu")?.remove();

    // 1. Create full-screen ASCII canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "chrome-ascii-canvas";
    this.canvas.width = window.innerWidth || document.documentElement.clientWidth || 1920;
    this.canvas.height = window.innerHeight || document.documentElement.clientHeight || 1080;
    this.canvas.style.cssText = `
      position: fixed !important;
      top: 0px !important;
      left: 0px !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 0 !important;
      pointer-events: none !important;
      background-color: #07080c !important;
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace !important;
    `;
    document.body.prepend(this.canvas);

    // 2. Inject global & deep shadow styles
    this.injectStyles();

    // 3. Initialize Animal Simulation Engine
    this.engine = new AnimalEngine(this.canvas, {
      animal: this.currentAnimal,
      theme: "dark"
    });

    window.addEventListener("resize", () => {
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
      this.engine?.resize();
      this.updateBtnPosition();
    });

    // 4. Mount theme dropdown switcher
    this.mountDropdown();

    // 5. Interactive pointer startle on canvas / background click
    window.addEventListener("pointerdown", (e) => {
      if (!this.engine) return;
      const target = e.target as HTMLElement;
      if (target && (target.closest("#chrome-ascii-dropdown-btn, #chrome-ascii-dropdown-menu, a, button, input, cr-button, cr-checkbox, .profile-item, [role='button']"))) {
        return;
      }
      const rect = this.canvas?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.engine.flock?.startle(x, y);
    });

    // 6. Keyboard Hotkeys 1-8 for rapid theme switching
    window.addEventListener("keydown", (e) => {
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

    // 7. Dynamic Shadow DOM observer to style web components continuously
    const observer = new MutationObserver(() => {
      if (!document.getElementById("chrome-ascii-dropdown-btn")) {
        this.mountDropdown();
      }
      this.injectShadowStyles(document.body);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    this.injectShadowStyles(document.body);

    // 8. OneGoogleBar Appearance Synchronizer
    const syncOgb = () => {
      const ogb = document.querySelector("#oneGoogleBar") as any;
      if (ogb && ogb.contentWindow) {
        try {
          ogb.contentWindow.postMessage({ type: "updateAppearance", applyLightTheme: false }, "*");
        } catch (_) {}
      }
    };
  }

  injectStyles() {
    const style = document.createElement("style");
    style.id = "chrome-ascii-style";
    style.textContent = `
      :root, html, body {
        background-color: #07080c !important;
        background: #07080c !important;
        color-scheme: dark !important;
        --md-background-color: transparent !important;
        --profile-item-background: rgba(18, 20, 32, 0.65) !important;
        --profile-card-hover-color: rgba(28, 34, 54, 0.85) !important;
        --color-new-tab-page-background: transparent !important;
        --color-searchbox-background: rgba(18, 21, 34, 0.80) !important;
        --color-searchbox-results-background: rgba(14, 16, 26, 0.95) !important;
        --color-searchbox-shadow: 0 12px 36px rgba(0, 0, 0, 0.65) !important;
        --cr-fallback-color-surface5: rgba(18, 20, 32, 0.65) !important;
        --google-grey-900: rgba(18, 20, 32, 0.65) !important;
        --google-grey-50: rgba(18, 20, 32, 0.65) !important;
      }

      /* Profile Picker Elements */
      profile-picker-app {
        background: transparent !important;
        position: relative !important;
        z-index: 1 !important;
      }

      /* New Tab Page Elements */
      ntp-app {
        background: transparent !important;
        position: relative !important;
        z-index: 1 !important;
      }

      #backgroundImage {
        display: none !important;
        visibility: hidden !important;
      }

      #logo {
        filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.75)) !important;
      }

      #oneGoogleBar,
      #oneGoogleBarStackingContext,
      #oneGoogleBarScrim,
      ntp-iframe {
        display: none !important;
        visibility: hidden !important;
      }

      /* Dropdown Menu Item Styling */
      .chrome-dropdown-item {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 7px 10px !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        font-weight: 450 !important;
        color: rgba(255, 255, 255, 0.80) !important;
        background: transparent !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: background 0.12s ease, color 0.12s ease !important;
      }

      .chrome-dropdown-item:hover {
        background: rgba(255, 255, 255, 0.10) !important;
        color: #ffffff !important;
      }

      .chrome-dropdown-item.active {
        background: rgba(255, 255, 255, 0.15) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
      }

      .chrome-dropdown-badge {
        font-size: 9.5px !important;
        opacity: 0.52 !important;
        margin-left: auto !important;
        font-family: monospace !important;
        padding: 1px 5px !important;
        border-radius: 4px !important;
        background: rgba(255, 255, 255, 0.08) !important;
      }
    `;
    document.head.appendChild(style);
  }

  injectShadowStyles(rootNode: Node) {
    if (!rootNode) return;
    const shadowCss = `
      :host {
        color: #f1f5f9 !important;
        --cr-primary-text-color: #f8fafc !important;
        --cr-secondary-text-color: #94a3b8 !important;
        --profile-item-background: rgba(18, 20, 32, 0.65) !important;
        --profile-card-hover-color: rgba(28, 34, 54, 0.85) !important;
        --cr-fallback-color-surface5: rgba(18, 20, 32, 0.65) !important;
        --google-grey-900: rgba(18, 20, 32, 0.65) !important;
        --google-grey-50: rgba(18, 20, 32, 0.65) !important;
      }

      .profile-item {
        background-color: rgba(18, 20, 32, 0.65) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease !important;
      }

      .profile-item:hover, .profile-item:focus-within {
        background-color: rgba(28, 34, 54, 0.85) !important;
        border-color: rgba(255, 255, 255, 0.28) !important;
        transform: translateY(-2px) scale(1.02) !important;
      }

      #addProfile.profile-item {
        background-color: rgba(18, 20, 32, 0.35) !important;
        border: 1.5px dashed rgba(255, 255, 255, 0.25) !important;
      }

      #banner-left, #banner-right {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }

      #browseAsGuestButton {
        background: rgba(255, 255, 255, 0.06) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 8px !important;
      }

      /* NTP Searchbox & Shortcuts inside shadow DOM */
      #searchboxContainer, cr-searchbox, #inputInnerContainer {
        --color-searchbox-background: rgba(18, 21, 34, 0.80) !important;
        --color-searchbox-results-background: rgba(14, 16, 26, 0.95) !important;
        --color-searchbox-shadow: 0 12px 36px rgba(0, 0, 0, 0.65) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border-radius: 24px !important;
      }

      .tile-icon, .icon-container {
        background-color: rgba(255, 255, 255, 0.08) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255, 255, 255, 0.10) !important;
      }

      #oneGoogleBar,
      #oneGoogleBarStackingContext,
      #oneGoogleBarScrim,
      ntp-iframe {
        display: none !important;
        visibility: hidden !important;
      }
    `;

    const walker = (node: Node) => {
      if ((node as any).shadowRoot) {
        const sr = (node as any).shadowRoot as ShadowRoot;
        if (!sr.getElementById("chrome-ascii-shadow-style")) {
          const s = document.createElement("style");
          s.id = "chrome-ascii-shadow-style";
          s.textContent = shadowCss;
          sr.appendChild(s);
        }
        walker(sr);
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        walker(node.childNodes[i]);
      }
    };
    walker(rootNode);
  }

  mountDropdown() {
    if (!this.dropdownBtn) {
      this.dropdownBtn = document.createElement("button");
      this.dropdownBtn.id = "chrome-ascii-dropdown-btn";
      this.dropdownBtn.title = "Switch ASCII Animal Theme (Keys 1-8)";
      this.dropdownBtn.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        height: 32px !important;
        padding: 0 12px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 7px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        color: rgba(255, 255, 255, 0.92) !important;
        background: rgba(18, 21, 34, 0.88) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
        border-radius: 16px !important;
        cursor: pointer !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
        pointer-events: auto !important;
        user-select: none !important;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
      `;
      this.dropdownBtn.onmouseenter = () => {
        if (this.dropdownBtn) {
          this.dropdownBtn.style.background = "rgba(28, 34, 54, 0.95)";
          this.dropdownBtn.style.borderColor = "rgba(255, 255, 255, 0.35)";
          this.dropdownBtn.style.transform = "translateY(-1px)";
        }
      };
      this.dropdownBtn.onmouseleave = () => {
        if (this.dropdownBtn && !this.dropdownMenu?.style.display.includes("block")) {
          this.dropdownBtn.style.background = "rgba(18, 21, 34, 0.88)";
          this.dropdownBtn.style.borderColor = "rgba(255, 255, 255, 0.22)";
          this.dropdownBtn.style.transform = "none";
        }
      };
      this.dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleMenu();
      };
    }

    this.updateBtnPosition();
    this.renderBtn();
    document.body.appendChild(this.dropdownBtn);

    // On New Tab Page: render sleek dark quicklinks for Gmail & Images next to dropdown
    if (this.isNewTabPage && !document.getElementById("chrome-ascii-quicklinks")) {
      const ql = document.createElement("div");
      ql.id = "chrome-ascii-quicklinks";
      ql.style.cssText = `
        position: fixed !important;
        top: 24px !important;
        right: 140px !important;
        z-index: 2147483646 !important;
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 450 !important;
        user-select: none !important;
      `;
      const gm = document.createElement("a");
      gm.href = "https://mail.google.com";
      gm.textContent = "Gmail";
      gm.style.cssText = "color: rgba(255,255,255,0.75) !important; text-decoration: none !important; transition: color 0.15s ease !important;";
      gm.onmouseenter = () => { gm.style.color = "#ffffff"; };
      gm.onmouseleave = () => { gm.style.color = "rgba(255,255,255,0.75)"; };

      const im = document.createElement("a");
      im.href = "https://www.google.com/imghp";
      im.textContent = "Images";
      im.style.cssText = "color: rgba(255,255,255,0.75) !important; text-decoration: none !important; transition: color 0.15s ease !important;";
      im.onmouseenter = () => { im.style.color = "#ffffff"; };
      im.onmouseleave = () => { im.style.color = "rgba(255,255,255,0.75)"; };

      ql.appendChild(gm);
      ql.appendChild(im);
      document.body.appendChild(ql);
    }

    if (!this.dropdownMenu) {
      this.dropdownMenu = document.createElement("div");
      this.dropdownMenu.id = "chrome-ascii-dropdown-menu";
      this.dropdownMenu.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        min-width: 175px !important;
        background: rgba(14, 16, 26, 0.97) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        border-radius: 12px !important;
        padding: 6px !important;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.88) !important;
        pointer-events: auto !important;
        user-select: none !important;
        display: none;
      `;
      document.body.appendChild(this.dropdownMenu);

      window.addEventListener("pointerdown", (e) => {
        if (!this.dropdownMenu || !this.dropdownBtn) return;
        const target = e.target as Node;
        if (!this.dropdownMenu.contains(target) && !this.dropdownBtn.contains(target)) {
          this.closeMenu();
        }
      });
    }
  }

  updateBtnPosition() {
    if (!this.dropdownBtn) return;
    this.dropdownBtn.style.top = "18px";
    this.dropdownBtn.style.right = "24px";
    this.dropdownBtn.style.left = "auto";
  }

  renderBtn() {
    if (!this.dropdownBtn) return;
    const current = SPECIES_CONFIG.find((s) => s.key === this.currentAnimal) || SPECIES_CONFIG[1];

    const dot = document.createElement("span");
    dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${current.color};box-shadow:0 0 6px ${current.color};`;

    const label = document.createElement("span");
    label.textContent = current.label;

    const arrow = document.createElement("span");
    arrow.style.cssText = "opacity:0.5;font-size:10px;margin-left:2px;";
    arrow.textContent = "▾";

    this.dropdownBtn.replaceChildren(dot, label, arrow);
  }

  renderMenu() {
    if (!this.dropdownMenu) return;
    this.dropdownMenu.replaceChildren();

    for (const s of SPECIES_CONFIG) {
      const item = document.createElement("div");
      item.className = "chrome-dropdown-item" + (s.key === this.currentAnimal ? " active" : "");
      item.dataset.key = s.key;

      const dot = document.createElement("span");
      dot.style.cssText = `display:inline-block;width:6px;height:6px;border-radius:50%;background:${s.color};box-shadow:0 0 4px ${s.color};`;

      const label = document.createElement("span");
      label.textContent = s.label;

      const badge = document.createElement("span");
      badge.className = "chrome-dropdown-badge";
      badge.textContent = s.hotkey;

      item.appendChild(dot);
      item.appendChild(label);
      item.appendChild(badge);

      item.onclick = (e) => {
        e.stopPropagation();
        this.setAnimal(s.key);
        this.closeMenu();
      };

      this.dropdownMenu.appendChild(item);
    }
  }

  toggleMenu() {
    if (!this.dropdownMenu || !this.dropdownBtn) return;
    if (this.dropdownMenu.style.display === "block") {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    if (!this.dropdownMenu || !this.dropdownBtn) return;
    this.renderMenu();
    const rect = this.dropdownBtn.getBoundingClientRect();
    this.dropdownMenu.style.top = `${Math.round(rect.bottom + 6)}px`;
    const menuWidth = 180;
    if (rect.left + menuWidth > window.innerWidth) {
      this.dropdownMenu.style.left = "auto";
      this.dropdownMenu.style.right = `${Math.max(12, Math.round(window.innerWidth - rect.right))}px`;
    } else {
      this.dropdownMenu.style.left = `${Math.round(rect.left)}px`;
      this.dropdownMenu.style.right = "auto";
    }
    this.dropdownMenu.style.display = "block";
  }

  closeMenu() {
    if (!this.dropdownMenu || !this.dropdownBtn) return;
    this.dropdownMenu.style.display = "none";
    if (this.dropdownBtn) {
      this.dropdownBtn.style.background = "rgba(18, 21, 34, 0.88)";
      this.dropdownBtn.style.borderColor = "rgba(255, 255, 255, 0.22)";
      this.dropdownBtn.style.transform = "none";
    }
  }

  setAnimal(key: AnimalKey) {
    if (!this.engine || this.currentAnimal === key) return;
    this.currentAnimal = key;
    if (!this.isProfilePicker) {
      try {
        localStorage.setItem("chrome-ascii-animal", key);
      } catch (_) {}
    }
    this.engine.setAnimal(key);
    this.renderBtn();
    this.renderMenu();
  }
}

// Auto-instantiate when loaded
if (typeof window !== "undefined") {
  (window as any).ChromeAsciiBackground = ChromeAsciiBackground;
  new ChromeAsciiBackground();
}

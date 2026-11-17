"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachLoadingOverlay = attachLoadingOverlay;
const electron_1 = require("electron");
const fs = require("fs");
const path = require("path");

const ANIMAL_META = {
    butterflies: { name: "Butterfly", color: "#38bdf8" },
    koi:         { name: "Koi",       color: "#fb923c" },
    jellyfish:   { name: "Jellyfish", color: "#f472b6" },
    dragonflies: { name: "Dragonfly", color: "#4ade80" },
    frogs:       { name: "Frog",      color: "#84cc16" },
    cranes:      { name: "Crane",     color: "#f8fafc" },
    crabs:       { name: "Crab",      color: "#f87171" },
    manta:       { name: "Manta",     color: "#818cf8" }
};

function getLastSelectedAnimal() {
    try {
        const themePath = "/home/yash/.config/Antigravity-Profiles/ascii_animal_theme.json";
        if (fs.existsSync(themePath)) {
            const data = JSON.parse(fs.readFileSync(themePath, "utf8"));
            if (data && data.animal && ANIMAL_META[data.animal]) {
                return data.animal;
            }
        }
    } catch (_) {}
    return "koi";
}

function getIifeCode() {
    const candidates = [
        path.join(__dirname, "antigravity_iife.js"),
        "/home/yash/.config/Antigravity-Profiles/antigravity_iife.js",
        "/home/yash/Projects/ascii-animals-browser/dist/antigravity_iife.js"
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, "utf8");
            }
        } catch (_) {}
    }
    return "";
}

/**
 * Generates the HTML content for the Antigravity 2.0 loading screen overlay
 * featuring the animated ASCII animal background with the last selected theme.
 */
function getLoadingHtml() {
    const animalKey = getLastSelectedAnimal();
    const meta = ANIMAL_META[animalKey] || ANIMAL_META.koi;
    const accentColor = meta.color;
    const animalName = meta.name;
    const iifeCode = getIifeCode();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #07080c !important;
    background-color: #07080c !important;
    color: #f3f2f2 !important;
    font-family: "JetBrainsMono Nerd Font", "JetBrains Mono", system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    -webkit-app-region: drag;
    -webkit-user-select: none;
    transition: opacity 0.3s ease-out;
    opacity: 1;
  }
  #loading-canvas {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 0 !important;
    pointer-events: none !important;
  }
  .loader-center {
    position: relative !important;
    z-index: 10 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    pointer-events: none !important;
  }
  .loader-dots {
    display: flex !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .loader-dots div {
    width: 8px !important;
    height: 8px !important;
    border-radius: 50% !important;
    background-color: ${accentColor} !important;
    box-shadow: 0 0 12px ${accentColor} !important;
    opacity: 0.35;
    animation: dotPulse 1.4s infinite ease-in-out !important;
  }
  .loader-dots div:nth-child(1) { animation-delay: 0s; }
  .loader-dots div:nth-child(2) { animation-delay: 0.25s; }
  .loader-dots div:nth-child(3) { animation-delay: 0.5s; }
  .loader-text {
    font-size: 14px !important;
    font-weight: 500 !important;
    letter-spacing: 0.06em !important;
    color: #ffffff !important;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.8) !important;
    user-select: none !important;
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 0.25; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.2); }
  }
</style>
</head>
<body>
  <canvas id="loading-canvas"></canvas>
  <div class="loader-center">
    <div class="loader-dots">
      <div></div><div></div><div></div>
    </div>
    <div class="loader-text">Loading Antigravity</div>
  </div>
  <script>
${iifeCode}
  </script>
  <script>
    (function() {
      try {
        var canvas = document.getElementById("loading-canvas");
        if (typeof AnimalEngine !== "undefined" && canvas) {
          window.__loadingEngine = new AnimalEngine(canvas, {
            animal: "${animalKey}",
            theme: "dark"
          });
        }
      } catch (err) {
        console.error("[LoadingOverlay] AnimalEngine init error:", err);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Attaches a temporary WebContentsView overlay that shows the Animated ASCII Loading Antigravity screen.
 * Stays visible throughout startup (covering the language server and bundle compile time)
 * and only dismisses once React has mounted components into #root.
 */
function attachLoadingOverlay(win, foregroundColor, backgroundColor) {
    const view = new electron_1.WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (typeof view.setBackgroundColor === 'function') {
        view.setBackgroundColor('#07080c');
    }
    const html = getLoadingHtml();
    void view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.contentView.addChildView(view);
    console.log('[LoadingOverlay] Attached Antigravity 2.0 Loading Overlay view with ASCII animal theme');

    const updateBounds = () => {
        try {
            if (!win.isDestroyed()) {
                const [width, height] = win.getContentSize();
                const bounds = win.getBounds();
                const w = width > 0 ? width : (bounds.width || 1200);
                const h = height > 0 ? height : (bounds.height || 800);
                view.setBounds({ x: 0, y: 0, width: w, height: h });
            }
        } catch (_) {}
    };
    updateBounds();
    win.on('resize', updateBounds);
    win.on('ready-to-show', updateBounds);
    win.on('show', updateBounds);
    setTimeout(updateBounds, 100);
    setTimeout(updateBounds, 300);
    setTimeout(updateBounds, 800);

    let isDismissed = false;
    const dismissOverlay = () => {
        if (isDismissed) return;
        isDismissed = true;
        console.log('[LoadingOverlay] React ready! Fading out loading overlay smoothly...');
        try {
            view.webContents.executeJavaScript(`
                if (window.__loadingEngine) {
                    try { window.__loadingEngine.destroy(); } catch(_) {}
                }
                document.body.style.opacity = "0";
            `).catch(() => {});
            setTimeout(() => {
                try {
                    if (!win.isDestroyed()) {
                        win.contentView.removeChildView(view);
                        win.off('resize', updateBounds);
                    }
                } catch (_) {}
                try {
                    view.webContents.close();
                } catch (_) {}
                console.log('[LoadingOverlay] Overlay view cleanly closed.');
            }, 300);
        } catch (_) {
            try {
                if (!win.isDestroyed()) {
                    win.contentView.removeChildView(view);
                }
                view.webContents.close();
            } catch (_) {}
        }
    };

    const checkReady = async () => {
        if (isDismissed) return;
        try {
            if (win.isDestroyed() || win.webContents.isDestroyed()) return;
            const isReady = await win.webContents.executeJavaScript(
                'Boolean(window.__antigravityBg && document.getElementById("agy-anim-canvas"))'
            );
            if (isReady) {
                dismissOverlay();
                return;
            }
        } catch (_) {}
        if (!isDismissed) {
            setTimeout(checkReady, 60);
        }
    };

    // When the HTML shell arrives, start polling for React mount
    win.webContents.on('did-finish-load', () => {
        checkReady();
    });

    // Also poll after 500ms in case did-finish-load already fired
    setTimeout(checkReady, 500);

    // Guaranteed fallback after 25s so the user is never permanently stuck
    setTimeout(dismissOverlay, 25000);
}

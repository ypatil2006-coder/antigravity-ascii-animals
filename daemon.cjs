/**
 * Antigravity ASCII Animated Background Daemon
 * Automatically maintains the official ASCII animal engine across reloads
 * and persists the selected theme to disk for the loading screen overlay.
 * Scans all Antigravity profile directories (Account-1, Account-2, etc.).
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = globalThis.WebSocket;

const PROFILES_DIR = path.join(
  process.env.HOME,
  '.config/Antigravity-Profiles'
);

const THEME_FILE = path.join(
  PROFILES_DIR,
  'ascii_animal_theme.json'
);

const IIFE_BUNDLE_PATH = path.join(__dirname, 'dist', 'antigravity_iife.js');

function saveThemeToDisk(animal) {
  if (!animal) return;
  try {
    const current = fs.existsSync(THEME_FILE) ? JSON.parse(fs.readFileSync(THEME_FILE, 'utf8')) : {};
    if (current.animal !== animal) {
      fs.writeFileSync(THEME_FILE, JSON.stringify({ animal, updatedAt: Date.now() }, null, 2));
      console.log(`[Antigravity ASCII Daemon] Persisted active theme '${animal}' to ${THEME_FILE}`);
    }
  } catch (_) {}
}

function getDevToolsPorts() {
  const ports = [];
  try {
    if (fs.existsSync(PROFILES_DIR)) {
      const entries = fs.readdirSync(PROFILES_DIR, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory() && ent.name.startsWith('Account-')) {
          const portFile = path.join(PROFILES_DIR, ent.name, 'DevToolsActivePort');
          if (fs.existsSync(portFile)) {
            try {
              const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
              if (lines.length > 0) {
                const p = parseInt(lines[0], 10);
                if (p > 0 && !ports.includes(p)) {
                  ports.push(p);
                }
              }
            } catch (_) {}
          }
        }
      }
    }
  } catch (_) {}
  return ports;
}

function getTargets(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve([]);
    });
  });
}

const CHECK_AND_INJECT_PAYLOAD = (iifeCode) => `
(() => {
  let animal = null;
  if (window.__antigravityBg) {
    animal = window.__antigravityBg.currentAnimal;
  } else {
    try { animal = localStorage.getItem('agy-ascii-selected-theme'); } catch(_) {}
  }
  if (!animal) animal = 'butterflies';

  if (window.__antigravityBg && document.getElementById('agy-anim-canvas')) {
    return { status: 'active', animal };
  }

  // Load bundle
  ${iifeCode}

  if (typeof AntigravityBackground !== 'undefined') {
    window.__antigravityBg = new AntigravityBackground();
    return { status: 'injected_new_instance', animal: window.__antigravityBg.currentAnimal };
  }
  return { status: 'failed_to_load', animal };
})();
`;

async function checkAndInject() {
  const ports = getDevToolsPorts();
  for (const port of ports) {
    try {
      const targets = await getTargets(port);
      const mainTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
      if (!mainTarget || !mainTarget.webSocketDebuggerUrl) continue;

      const ws = new WebSocket(mainTarget.webSocketDebuggerUrl);

      ws.addEventListener('open', () => {
        if (!fs.existsSync(IIFE_BUNDLE_PATH)) {
          ws.close();
          return;
        }
        const iife = fs.readFileSync(IIFE_BUNDLE_PATH, 'utf8');
        const payload = CHECK_AND_INJECT_PAYLOAD(iife);
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression: payload, returnByValue: true }
        }));
      });

      ws.addEventListener('message', (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.id === 1 && res.result && res.result.result && res.result.result.value) {
            const val = res.result.result.value;
            if (val.animal) {
              saveThemeToDisk(val.animal);
            }
            ws.close();
          }
        } catch {
          ws.close();
        }
      });

      ws.addEventListener('error', () => {
        try { ws.close(); } catch {}
      });
    } catch (_) {}
  }
}

console.log('[Antigravity ASCII Daemon] Started with multi-profile discovery and theme persistence.');
setInterval(checkAndInject, 2000);
checkAndInject();

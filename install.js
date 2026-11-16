#!/usr/bin/env node
/**
 * Antigravity ASCII Animals Background — Universal Cross-Platform Installer
 * 
 * Works out-of-the-box on macOS, Windows, and Linux.
 * Injects the living ASCII creature simulation, top-bar dropdown switcher,
 * and custom startup loading screen into Google Antigravity Desktop.
 * 
 * Credits: Original ASCII simulation algorithms and assets by Stephen (DesignerStephen1/ascii-animals).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const IIFE_BUNDLE_SRC = path.join(SCRIPT_DIR, 'dist', 'antigravity_iife.js');
const OVERLAY_SRC = path.join(SCRIPT_DIR, 'loadingOverlay_custom.js');

// ── 1. OS & PATH RESOLUTION ──────────────────────────────────────────────────

function getPlatformPaths() {
  const platform = os.platform();
  const home = os.homedir();
  let asarCandidates = [];
  let userDataDir = '';

  if (platform === 'darwin') {
    // macOS
    asarCandidates = [
      '/Applications/Antigravity.app/Contents/Resources/app.asar',
      path.join(home, 'Applications/Antigravity.app/Contents/Resources/app.asar'),
      '/Applications/Google Antigravity.app/Contents/Resources/app.asar',
      path.join(home, 'Applications/Google Antigravity.app/Contents/Resources/app.asar')
    ];
    userDataDir = path.join(home, 'Library/Application Support/Antigravity');
  } else if (platform === 'win32') {
    // Windows
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

    asarCandidates = [
      path.join(localAppData, 'Programs', 'Antigravity', 'resources', 'app.asar'),
      path.join(programFiles, 'Antigravity', 'resources', 'app.asar'),
      path.join(programFilesX86, 'Antigravity', 'resources', 'app.asar'),
      path.join(appData, 'Antigravity', 'resources', 'app.asar')
    ];
    userDataDir = path.join(appData, 'Antigravity');
  } else {
    // Linux
    asarCandidates = [
      path.join(home, '.config', 'Antigravity-Profiles', 'app.asar'),
      '/opt/Antigravity/resources/app.asar',
      '/usr/lib/antigravity/resources/app.asar',
      path.join(home, '.local', 'share', 'antigravity', 'resources', 'app.asar'),
      '/var/lib/flatpak/app/com.google.antigravity/current/active/files/antigravity/resources/app.asar'
    ];
    userDataDir = path.join(home, '.config', 'Antigravity');
  }

  return { platform, asarCandidates, userDataDir };
}

function findAsarPath(customPath) {
  if (customPath) {
    if (fs.existsSync(customPath)) return path.resolve(customPath);
    console.error(`[✗] Specified path does not exist: ${customPath}`);
    process.exit(1);
  }

  const { asarCandidates } = getPlatformPaths();
  for (const candidate of asarCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// ── 2. PRELOAD HOOK CODE ─────────────────────────────────────────────────────

function getPreloadInjection() {
  const { userDataDir } = getPlatformPaths();
  const themeFileNormalized = path.join(userDataDir, 'ascii_animal_theme.json').replace(/\\/g, '/');

  return `
// === ANTIGRAVITY ASCII ANIMALS THEME INJECTION ===
(function() {
    try {
        const fs = require("fs");
        const path = require("path");
        const THEME_FILE = "${themeFileNormalized}";

        // 1. Instant theme persistence on species change
        window.addEventListener("agy-animal-changed", function(e) {
            try {
                if (e && e.detail && e.detail.animal) {
                    const dir = path.dirname(THEME_FILE);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(THEME_FILE, JSON.stringify({ animal: e.detail.animal, updatedAt: Date.now() }, null, 2));
                }
            } catch (_) {}
        });

        // 2. Preload script injection so the main window starts the ASCII animals immediately
        const injectAscii = function() {
            try {
                if (!document.head || !document.body) {
                    setTimeout(injectAscii, 40);
                    return;
                }
                if (window.__antigravityBg || document.getElementById("agy-anim-canvas")) {
                    return;
                }
                const iifePath = path.join(__dirname, "antigravity_iife.js");
                let code = "";
                if (fs.existsSync(iifePath)) {
                    code = fs.readFileSync(iifePath, "utf8");
                }
                if (code) {
                    const s = document.createElement("script");
                    s.id = "antigravity-ascii-bundle";
                    s.textContent = code;
                    document.head.appendChild(s);

                    const initScript = document.createElement("script");
                    initScript.textContent = \`
                        (function() {
                            try {
                                if (typeof AntigravityBackground !== "undefined" && !window.__antigravityBg) {
                                    window.__antigravityBg = new AntigravityBackground();
                                }
                            } catch(_) {}
                        })();
                    \`;
                    document.head.appendChild(initScript);
                }
            } catch (_) {}
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", injectAscii);
        } else {
            injectAscii();
        }
    } catch (_) {}
})();
`;
}

// ── 3. INSTALLATION ROUTINE ──────────────────────────────────────────────────

function installMod(targetAsar) {
  console.log(`\n======================================================`);
  console.log(`  Antigravity ASCII Animals Background — Installer`);
  console.log(`======================================================\n`);
  console.log(`[i] Target OS: ${os.type()} (${os.platform()} ${os.arch()})`);
  console.log(`[i] Target app.asar: ${targetAsar}`);

  const backupPath = `${targetAsar}.bak`;
  if (!fs.existsSync(backupPath)) {
    console.log(`[+] Creating original backup at: ${backupPath}`);
    fs.copyFileSync(targetAsar, backupPath);
  } else {
    console.log(`[✓] Existing backup found at: ${backupPath}`);
  }

  const tmpExtractDir = path.join(os.tmpdir(), `agy_asar_extracted_${Date.now()}`);
  console.log(`[+] Extracting app.asar...`);

  try {
    execSync(`npx -y @electron/asar extract "${targetAsar}" "${tmpExtractDir}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`[✗] Failed to extract asar archive using @electron/asar.`);
    console.error(`    Ensure Node.js and npx are installed.`);
    process.exit(1);
  }

  // 1. Copy IIFE Bundle
  const destIife = path.join(tmpExtractDir, 'dist', 'antigravity_iife.js');
  if (fs.existsSync(IIFE_BUNDLE_SRC)) {
    fs.copyFileSync(IIFE_BUNDLE_SRC, destIife);
    console.log(`[✓] Copied antigravity_iife.js into asar dist/`);
  } else {
    console.warn(`[!] Warning: dist/antigravity_iife.js not found in installer root.`);
  }

  // 2. Patch loadingOverlay.js
  const destOverlay = path.join(tmpExtractDir, 'dist', 'loadingOverlay.js');
  if (fs.existsSync(OVERLAY_SRC)) {
    fs.copyFileSync(OVERLAY_SRC, destOverlay);
    console.log(`[✓] Replaced dist/loadingOverlay.js with ASCII creature swarm loading screen`);
  } else {
    console.warn(`[!] Warning: loadingOverlay_custom.js not found.`);
  }

  // 3. Patch preload.js
  const destPreload = path.join(tmpExtractDir, 'dist', 'preload.js');
  if (fs.existsSync(destPreload)) {
    let preloadContent = fs.readFileSync(destPreload, 'utf8');
    if (!preloadContent.includes('ANTIGRAVITY ASCII ANIMALS THEME INJECTION')) {
      preloadContent += '\n' + getPreloadInjection();
      fs.writeFileSync(destPreload, preloadContent, 'utf8');
      console.log(`[✓] Injected autostart hook & theme persistence into dist/preload.js`);
    } else {
      console.log(`[✓] dist/preload.js already contains ASCII animal hooks`);
    }
  }

  // 4. Patch utils.js (dark background to eliminate startup flash)
  const destUtils = path.join(tmpExtractDir, 'dist', 'utils.js');
  if (fs.existsSync(destUtils)) {
    let utilsContent = fs.readFileSync(destUtils, 'utf8');
    const targetPattern = "const backgroundColor = isLight ? '#FAFAFA' : '#131313';";
    if (utilsContent.includes(targetPattern)) {
      utilsContent = utilsContent.replace(targetPattern, "const backgroundColor = '#07080c';");
      fs.writeFileSync(destUtils, utilsContent, 'utf8');
      console.log(`[✓] Patched dist/utils.js with dark canvas base color`);
    }
  }

  // 5. Pack asar
  console.log(`[+] Repacking app.asar...`);
  try {
    execSync(`npx -y @electron/asar pack "${tmpExtractDir}" "${targetAsar}"`, { stdio: 'inherit' });
    console.log(`[✓] Successfully packed custom app.asar!`);
  } catch (err) {
    console.error(`[✗] Failed to repack asar archive.`);
    process.exit(1);
  } finally {
    try {
      fs.rmSync(tmpExtractDir, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log(`\n✨ Installation Complete!`);
  console.log(`- Launch Google Antigravity to enjoy your animated ASCII background.`);
  console.log(`- Use the dropdown next to the Search button (🔍) to switch between 8 species.`);
  console.log(`- Press number keys 1 through 8 to switch instant species via hotkeys.`);
  console.log(`- To uninstall at any time, run: node install.js --uninstall\n`);
}

// ── 4. UNINSTALL ROUTINE ────────────────────────────────────────────────────

function uninstallMod(targetAsar) {
  console.log(`\n======================================================`);
  console.log(`  Antigravity ASCII Animals Background — Uninstaller`);
  console.log(`======================================================\n`);

  const backupPath = `${targetAsar}.bak`;
  if (fs.existsSync(backupPath)) {
    console.log(`[+] Restoring original backup from: ${backupPath}`);
    fs.copyFileSync(backupPath, targetAsar);
    fs.unlinkSync(backupPath);
    console.log(`[✓] Successfully restored pristine app.asar!`);
  } else {
    console.error(`[!] No backup file found at: ${backupPath}`);
    console.error(`    If Antigravity is corrupted, reinstall the app from Google.`);
  }
}

// ── 5. CLI ENTRYPOINT ──────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let customPath = null;
  let isUninstall = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--uninstall' || args[i] === '-u') {
      isUninstall = true;
    } else if (args[i] === '--path' || args[i] === '-p') {
      customPath = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: node install.js [options]

Options:
  --install, -i          Install the ASCII Animals background mod (default)
  --uninstall, -u        Restore original Antigravity app.asar from backup
  --path, -p <path>      Specify custom path to app.asar
  --help, -h             Show this help message

Supported Operating Systems:
  - macOS (Apple Silicon / Intel)
  - Windows 10 / 11
  - Linux (Arch, Ubuntu, Debian, Fedora, Flatpak)
`);
      process.exit(0);
    }
  }

  const asarPath = findAsarPath(customPath);
  if (!asarPath) {
    const { platform, asarCandidates } = getPlatformPaths();
    console.error(`\n[✗] Could not automatically locate Antigravity app.asar on ${platform}.`);
    console.error(`Searched locations:`);
    asarCandidates.forEach(c => console.error(`  - ${c}`));
    console.error(`\nPlease specify the path manually:`);
    console.error(`  node install.js --path /path/to/Antigravity/resources/app.asar\n`);
    process.exit(1);
  }

  if (isUninstall) {
    uninstallMod(asarPath);
  } else {
    installMod(asarPath);
  }
}

main();

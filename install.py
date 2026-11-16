#!/usr/bin/env python3
"""
Antigravity ASCII Animals Background — Universal Cross-Platform Installer (Python Edition)

Works seamlessly on macOS, Windows, and Linux.
Injects the living ASCII creature simulation, top-bar dropdown switcher,
and custom startup loading screen into Google Antigravity Desktop.

Credits: Original ASCII simulation algorithms and assets by Stephen (DesignerStephen1/ascii-animals).
"""

import os
import sys
import shutil
import platform
import subprocess
import argparse
import json
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
IIFE_BUNDLE_SRC = SCRIPT_DIR / "dist" / "antigravity_iife.js"
OVERLAY_SRC = SCRIPT_DIR / "loadingOverlay_custom.js"

def get_platform_paths():
    plat = sys.platform
    home = Path.home()
    candidates = []
    user_data = None

    if plat == "darwin":
        candidates = [
            Path("/Applications/Antigravity.app/Contents/Resources/app.asar"),
            home / "Applications/Antigravity.app/Contents/Resources/app.asar",
            Path("/Applications/Google Antigravity.app/Contents/Resources/app.asar"),
            home / "Applications/Google Antigravity.app/Contents/Resources/app.asar",
        ]
        user_data = home / "Library/Application Support/Antigravity"
    elif plat == "win32":
        local_app_data = Path(os.environ.get("LOCALAPPDATA", str(home / "AppData/Local")))
        prog_files = Path(os.environ.get("ProgramFiles", "C:\\Program Files"))
        prog_files_x86 = Path(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"))
        app_data = Path(os.environ.get("APPDATA", str(home / "AppData/Roaming")))

        candidates = [
            local_app_data / "Programs/Antigravity/resources/app.asar",
            prog_files / "Antigravity/resources/app.asar",
            prog_files_x86 / "Antigravity/resources/app.asar",
            app_data / "Antigravity/resources/app.asar",
        ]
        user_data = app_data / "Antigravity"
    else:
        # Linux
        candidates = [
            home / ".config/Antigravity-Profiles/app.asar",
            Path("/opt/Antigravity/resources/app.asar"),
            Path("/usr/lib/antigravity/resources/app.asar"),
            home / ".local/share/antigravity/resources/app.asar",
            Path("/var/lib/flatpak/app/com.google.antigravity/current/active/files/antigravity/resources/app.asar"),
        ]
        user_data = home / ".config/Antigravity"

    return plat, candidates, user_data

def find_asar_path(custom_path=None):
    if custom_path:
        p = Path(custom_path).resolve()
        if p.exists():
            return p
        print(f"[✗] Specified path does not exist: {custom_path}", file=sys.stderr)
        sys.exit(1)

    plat, candidates, _ = get_platform_paths()
    for c in candidates:
        if c.exists():
            return c
    return None

def get_preload_injection(user_data_dir):
    theme_file = (user_data_dir / "ascii_animal_theme.json").as_posix()
    return f"""
// === ANTIGRAVITY ASCII ANIMALS THEME INJECTION ===
(function() {{
    try {{
        const fs = require("fs");
        const path = require("path");
        const THEME_FILE = "{theme_file}";

        // 1. Instant theme persistence on species change
        window.addEventListener("agy-animal-changed", function(e) {{
            try {{
                if (e && e.detail && e.detail.animal) {{
                    const dir = path.dirname(THEME_FILE);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {{ recursive: true }});
                    fs.writeFileSync(THEME_FILE, JSON.stringify({{ animal: e.detail.animal, updatedAt: Date.now() }}, null, 2));
                }}
            }} catch (_) {{}}
        }});

        // 2. Preload script injection so the main window starts the ASCII animals immediately
        const injectAscii = function() {{
            try {{
                if (!document.head || !document.body) {{
                    setTimeout(injectAscii, 40);
                    return;
                }}
                if (window.__antigravityBg || document.getElementById("agy-anim-canvas")) {{
                    return;
                }}
                const iifePath = path.join(__dirname, "antigravity_iife.js");
                let code = "";
                if (fs.existsSync(iifePath)) {{
                    code = fs.readFileSync(iifePath, "utf8");
                }}
                if (code) {{
                    const s = document.createElement("script");
                    s.id = "antigravity-ascii-bundle";
                    s.textContent = code;
                    document.head.appendChild(s);

                    const initScript = document.createElement("script");
                    initScript.textContent = `
                        (function() {{
                            try {{
                                if (typeof AntigravityBackground !== "undefined" && !window.__antigravityBg) {{
                                    window.__antigravityBg = new AntigravityBackground();
                                }}
                            }} catch(_) {{}}
                        }})();
                    `;
                    document.head.appendChild(initScript);
                }}
            }} catch (_) {{}}
        }};

        if (document.readyState === "loading") {{
            document.addEventListener("DOMContentLoaded", injectAscii);
        }} else {{
            injectAscii();
        }}
    }} catch (_) {{}}
}})();
"""

def install_mod(target_asar):
    print("\n======================================================")
    print("  Antigravity ASCII Animals Background — Installer")
    print("======================================================\n")
    print(f"[i] Host System: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"[i] Target app.asar: {target_asar}")

    backup_asar = target_asar.with_name(f"{target_asar.name}.bak")
    if not backup_asar.exists():
        print(f"[+] Creating original backup at: {backup_asar}")
        shutil.copy2(target_asar, backup_asar)
    else:
        print(f"[✓] Existing backup found at: {backup_asar}")

    tmp_extract = Path(os.environ.get("TMPDIR", "/tmp")) / f"agy_extract_{int(time.time())}"
    if tmp_extract.exists():
        shutil.rmtree(tmp_extract)
    tmp_extract.mkdir(parents=True, exist_ok=True)

    print("[+] Extracting app.asar...")
    res = subprocess.run(["npx", "-y", "@electron/asar", "extract", str(target_asar), str(tmp_extract)], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[✗] Failed to extract asar archive:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    # 1. Copy IIFE Bundle
    dest_iife = tmp_extract / "dist" / "antigravity_iife.js"
    if IIFE_BUNDLE_SRC.exists():
        shutil.copy2(IIFE_BUNDLE_SRC, dest_iife)
        print("[✓] Bundled antigravity_iife.js into asar dist/")
    else:
        print("[!] Warning: antigravity_iife.js not found in installer root.", file=sys.stderr)

    # 2. Patch loadingOverlay.js
    dest_overlay = tmp_extract / "dist" / "loadingOverlay.js"
    if OVERLAY_SRC.exists():
        shutil.copy2(OVERLAY_SRC, dest_overlay)
        print("[✓] Replaced dist/loadingOverlay.js with ASCII creature swarm loading screen")
    else:
        print("[!] Warning: loadingOverlay_custom.js not found.", file=sys.stderr)

    # 3. Patch preload.js
    dest_preload = tmp_extract / "dist" / "preload.js"
    if dest_preload.exists():
        content = dest_preload.read_text(encoding="utf-8")
        if "ANTIGRAVITY ASCII ANIMALS THEME INJECTION" not in content:
            _, _, user_data = get_platform_paths()
            content += "\n" + get_preload_injection(user_data)
            dest_preload.write_text(content, encoding="utf-8")
            print("[✓] Injected autostart hook & theme persistence into dist/preload.js")
        else:
            print("[✓] dist/preload.js already contains hooks")

    # 4. Patch utils.js
    dest_utils = tmp_extract / "dist" / "utils.js"
    if dest_utils.exists():
        content = dest_utils.read_text(encoding="utf-8")
        pattern = "const backgroundColor = isLight ? '#FAFAFA' : '#131313';"
        if pattern in content:
            content = content.replace(pattern, "const backgroundColor = '#07080c';")
            dest_utils.write_text(content, encoding="utf-8")
            print("[✓] Patched dist/utils.js with dark canvas base color")

    # 5. Pack asar
    print("[+] Repacking app.asar...")
    res = subprocess.run(["npx", "-y", "@electron/asar", "pack", str(tmp_extract), str(target_asar)], capture_output=True, text=True)
    if res.returncode == 0:
        print(f"[✓] Successfully packed custom app.asar ({target_asar.stat().st_size} bytes)")
    else:
        print(f"[✗] Failed to repack asar:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    try:
        shutil.rmtree(tmp_extract)
    except Exception:
        pass

    print("\n✨ Installation Complete!")
    print("- Launch Google Antigravity to enjoy your animated ASCII background.")
    print("- Use the dropdown next to Search (🔍) to switch between all 8 species.")
    print("- Press number keys 1 through 8 for instant species hotkeys.")
    print("- To uninstall at any time, run: python3 install.py --uninstall\n")

def uninstall_mod(target_asar):
    print("\n======================================================")
    print("  Antigravity ASCII Animals Background — Uninstaller")
    print("======================================================\n")

    backup_asar = target_asar.with_name(f"{target_asar.name}.bak")
    if backup_asar.exists():
        print(f"[+] Restoring original backup from: {backup_asar}")
        shutil.copy2(backup_asar, target_asar)
        backup_asar.unlink()
        print("[✓] Successfully restored pristine app.asar!")
    else:
        print(f"[!] No backup file found at: {backup_asar}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Antigravity ASCII Animals Background Installer")
    parser.add_argument("--install", "-i", action="store_true", default=True, help="Install the ASCII Animals background mod (default)")
    parser.add_argument("--uninstall", "-u", action="store_true", help="Restore original Antigravity app.asar from backup")
    parser.add_argument("--path", "-p", help="Specify custom path to app.asar")
    args = parser.parse_args()

    asar_path = find_asar_path(args.path)
    if not asar_path:
        plat, candidates, _ = get_platform_paths()
        print(f"\n[✗] Could not automatically locate Antigravity app.asar on {plat}.", file=sys.stderr)
        print("Searched locations:", file=sys.stderr)
        for c in candidates:
            print(f"  - {c}", file=sys.stderr)
        print("\nPlease specify the path manually:", file=sys.stderr)
        print("  python3 install.py --path /path/to/Antigravity/resources/app.asar\n", file=sys.stderr)
        sys.exit(1)

    if args.uninstall:
        uninstall_mod(asar_path)
    else:
        install_mod(asar_path)

if __name__ == "__main__":
    main()

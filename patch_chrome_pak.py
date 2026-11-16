#!/usr/bin/env python3
"""
Chrome resources.pak Patcher for ASCII Animal Backgrounds
Injects the procedural ASCII simulation engine and dropdown switcher into:
  - RID 23720: Profile Picker HTML
  - RID 23721: Profile Picker JS (profile_picker.js)
  - RID 20572: New Tab Page HTML
  - RID 20574: New Tab Page JS (new_tab_page.js)
  - RID 20770: Third-Party New Tab Page HTML
  - RID 20772: Third-Party New Tab Page JS (new_tab_page_third_party.js)
"""

import os
import sys
import struct
import zlib
import gzip

def patch_pak():
    orig_pak_path = "/opt/google/chrome/resources.pak"
    real_home = "/home/yash" if os.path.exists("/home/yash") else os.path.expanduser("~")
    out_dir = os.path.join(real_home, ".config/google-chrome/patched")
    os.makedirs(out_dir, exist_ok=True)
    out_pak_path = os.path.join(out_dir, "resources.pak")

    js_payload_path = "/home/yash/Projects/antigravity-ascii-animals/dist/chrome_ascii.js"
    if not os.path.exists(js_payload_path):
        print(f"Error: {js_payload_path} not found.")
        sys.exit(1)

    with open(js_payload_path, "rb") as f:
        js_payload = f.read()

    print(f"Reading original resources.pak ({orig_pak_path})...")
    with open(orig_pak_path, "rb") as f:
        orig_bytes = f.read()

    # Parse pak v5 header
    header = orig_bytes[:12]
    version, encoding, res_count, alias_count = struct.unpack("<IB3xHH", header)
    if version != 5:
        print(f"Unsupported pak version: {version}")
        sys.exit(1)

    print(f"Pak v5: {res_count} resources, {alias_count} aliases.")

    entries_offset = 12
    entries = []
    for i in range(res_count + 1):
        rid, off = struct.unpack("<HI", orig_bytes[entries_offset + i*6 : entries_offset + (i+1)*6])
        entries.append((rid, off))

    aliases_offset = entries_offset + (res_count + 1) * 6
    aliases = []
    for i in range(alias_count):
        rid, target = struct.unpack("<HH", orig_bytes[aliases_offset + i*4 : aliases_offset + (i+1)*4])
        aliases.append((rid, target))

    expected_data_offset = aliases_offset + alias_count * 4

    # Extract & modify payloads
    payloads = []
    modified_count = 0

    for i in range(res_count):
        rid, off = entries[i]
        next_off = entries[i+1][1]
        data = orig_bytes[off:next_off]

        if rid in [23720, 23721, 20572, 20574, 20770, 20772]:
            is_gzip = data[:2] == b"\x1f\x8b"
            if is_gzip:
                decomp = zlib.decompress(data, 16 + zlib.MAX_WBITS)
            else:
                decomp = data

            # Apply patches per RID
            if rid == 23720: # Profile picker HTML
                decomp = decomp.replace(
                    b"--md-background-color: rgba(41, 42, 45, 1);",
                    b"--md-background-color: #07080c !important;"
                ).replace(
                    b"background: var(--md-background-color);",
                    b"background: #07080c !important;"
                ).replace(
                    b"body {",
                    b"html, body { background: #07080c !important; background-color: #07080c !important; }\nbody {"
                )
                print("Patched RID 23720 (Profile Picker HTML)")
            elif rid == 20572: # NTP HTML
                decomp = decomp.replace(
                    b"background: $i18n{backgroundColor};",
                    b"background: #07080c !important;"
                )
                print("Patched RID 20572 (New Tab Page HTML)")
            elif rid == 20770: # 3P NTP HTML
                decomp = decomp.replace(
                    b"background-color: $i18n{colorBackground};",
                    b"background-color: #07080c !important;"
                )
                print("Patched RID 20770 (Third-Party NTP HTML)")
            elif rid in [23721, 20574, 20772]: # JS modules
                if rid == 20574:
                    decomp = decomp.replace(
                        b"isNtpDarkTheme=this.theme_&&(!!this.theme_.backgroundImage||this.theme_.isDark)",
                        b"isNtpDarkTheme=false"
                    ).replace(
                        b"isThemeDark_(){return!!this.theme_&&this.theme_.isDark}",
                        b"isThemeDark_(){return true}"
                    )
                    print("Patched isNtpDarkTheme=false & isThemeDark_=true in RID 20574")
                # Append JS payload
                decomp = decomp + b"\n;\n" + js_payload
                print(f"Patched RID {rid} (Injected ASCII Engine into JS module)")

            # Re-compress with gzip
            new_data = gzip.compress(decomp, mtime=0)
            payloads.append((rid, new_data))
            modified_count += 1
        else:
            payloads.append((rid, data))

    print(f"Modified {modified_count} resources. Reassembling pak...")

    repack_header = struct.pack("<IB3xHH", version, encoding, res_count, alias_count)
    repack_entries = bytearray()
    repack_data = bytearray()

    current_offset = expected_data_offset
    for rid, data in payloads:
        repack_entries += struct.pack("<HI", rid, current_offset)
        repack_data += data
        current_offset += len(data)

    repack_entries += struct.pack("<HI", 0, current_offset)

    repack_aliases = bytearray()
    for rid, target in aliases:
        repack_aliases += struct.pack("<HH", rid, target)

    repacked_bytes = bytes(repack_header + repack_entries + repack_aliases + repack_data)

    with open(out_pak_path, "wb") as f:
        f.write(repacked_bytes)

    print(f"Saved patched resources.pak to {out_pak_path} (size: {len(repacked_bytes):,} bytes)")

if __name__ == "__main__":
    patch_pak()

#!/usr/bin/env python3
"""Stamp local stylesheet links with a content hash so cache layers cannot serve
a stale file. Run against the deploy artifact, not the working tree."""

import hashlib
import re
import sys
from pathlib import Path

LINK = re.compile(r'href="([^"]+\.css)(\?[^"]*)?"')
HASH_LEN = 8


def content_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:HASH_LEN]


def stamp(root):
    hashes = {}
    stamped = skipped = 0

    for html in sorted(root.rglob("*.html")):
        if any(part in {".git", ".venv", "node_modules"} for part in html.parts):
            continue

        original = html.read_text(encoding="utf-8")

        def replace(match):
            nonlocal stamped, skipped
            href = match.group(1)
            if href.startswith(("http://", "https://", "//", "data:")):
                skipped += 1
                return match.group(0)

            target = (html.parent / href).resolve()
            if not target.is_file():
                print(f"WARN  unresolved {href} in {html.relative_to(root)}")
                skipped += 1
                return match.group(0)

            if target not in hashes:
                hashes[target] = content_hash(target)
            stamped += 1
            return f'href="{href}?v={hashes[target]}"'

        updated = LINK.sub(replace, original)
        if updated != original:
            html.write_text(updated, encoding="utf-8")

    for target, digest in sorted(hashes.items()):
        print(f"HASH  {digest}  {target.relative_to(root)}")
    print(f"STAMPED {stamped} link(s), SKIPPED {skipped}")
    return stamped


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if stamp(root) == 0:
        print("ERROR no stylesheet links stamped", file=sys.stderr)
        sys.exit(1)

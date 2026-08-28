#!/usr/bin/env python3
"""
Check that every `bibkey` in _data/publications.yml exists in bibliography.bib.

There is no generated file and nothing to regenerate. bibliography.bib is the
only place bibliographic data lives: the site serves it verbatim at
/bibliography.bib, and assets/js/bibtex.js fetches it at click time to fill the
"Bib" buttons and the /bibliography/ viewer. Jekyll never parses it, so editing
the .bib needs no build step at all — commit it and the site is up to date.

The one thing that can go wrong is a `bibkey` that does not match any entry, in
which case the button silently says "Not found". That is what this catches.
It runs in CI on every push that touches either file; you should never need to
run it by hand.

    python3 scripts/check-bibliography.py

Exit status is 1 if a bibkey does not resolve, 0 otherwise. Entries in the .bib
that no publication points at are reported but are not an error — a paper can
legitimately sit in the bibliography before it has a figure on the site.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIB = os.path.join(ROOT, "bibliography.bib")
PUBS = os.path.join(ROOT, "_data", "publications.yml")

SKIP = {"preamble", "string", "comment"}


def bib_keys(path):
    """Every entry key in a .bib, without needing a YAML/BibTeX library."""
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    keys = []
    for m in re.finditer(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", text):
        if m.group(1).lower() in SKIP:
            continue
        keys.append(m.group(2))
    return keys


def used_keys(path):
    """bibkey: and also: [...] values from publications.yml, read as text so
    this script has no third-party dependencies."""
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    used = set(re.findall(r"^\s*bibkey:\s*(\S+)\s*$", text, re.M))
    for group in re.findall(r"^\s*also:\s*\[([^\]]*)\]", text, re.M):
        used |= {k.strip() for k in group.split(",") if k.strip()}
    return used


def main():
    for path in (BIB, PUBS):
        if not os.path.exists(path):
            sys.stderr.write("missing %s\n" % os.path.relpath(path, ROOT))
            return 1

    keys = bib_keys(BIB)
    known = set(keys)
    if len(keys) != len(known):
        dupes = sorted({k for k in keys if keys.count(k) > 1})
        sys.stderr.write("duplicate keys in bibliography.bib: %s\n" % ", ".join(dupes))
        return 1

    used = used_keys(PUBS)
    missing = sorted(used - known)
    if missing:
        sys.stderr.write(
            "publications.yml references bibkeys that are not in "
            "bibliography.bib:\n  %s\n" % "\n  ".join(missing))
        return 1

    print("OK: %d entries in bibliography.bib, %d referenced by the site."
          % (len(known), len(used)))

    unused = sorted(known - used)
    if unused:
        print("note: %d entr%s not shown on the site: %s"
              % (len(unused), "y is" if len(unused) == 1 else "ies are",
                 ", ".join(unused)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

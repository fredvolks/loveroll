#!/usr/bin/env python3
"""Audit statique, lecture seule, des commandes HTML LoveRoll.

python3 tools/audit_html_controls.py [chemin]
N'analyse ni DOM créé par JavaScript ni interactions, tailles ou responsive.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
import sys

SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".next", "vendor"}
HTML_EXTENSIONS = {".html", ".htm"}
INPUT_BUTTON_TYPES = {"button", "submit", "reset", "image"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
             "meta", "param", "source", "track", "wbr"}


def has_aria_name(attrs: dict[str, str]) -> bool:
    return bool(attrs.get("aria-label", "").strip() or attrs.get("aria-labelledby", "").strip())


class ControlsAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: dict[str, int] = {}
        self.issues: list[tuple[int, str]] = []
        self.button_stack: list[dict] = []
        self.link_stack: list[dict] = []
        self.hidden_depth = 0
        self.element_stack: list[tuple[str, bool]] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attributes}
        line = self.getpos()[0]
        element_id = attrs.get("id", "").strip()
        if element_id:
            if element_id in self.ids:
                self.issues.append((line, f"id HTML en double: {element_id!r} (premier: ligne {self.ids[element_id]})"))
            else:
                self.ids[element_id] = line

        hidden = self.hidden_depth > 0 or attrs.get("aria-hidden", "").lower() == "true" or "hidden" in attrs
        if tag not in VOID_TAGS:
            self.element_stack.append((tag, hidden))
            if hidden:
                self.hidden_depth += 1

        if tag == "a" and "href" in attrs and not hidden:
            self.link_stack.append({"line": line, "attrs": attrs, "text": [], "has_image_alt": False})
        if tag == "button":
            self.button_stack.append({"line": line, "attrs": attrs, "text": [], "has_image_alt": False, "hidden": hidden})
        elif tag == "img" and not hidden and attrs.get("alt", "").strip():
            if self.button_stack:
                self.button_stack[-1]["has_image_alt"] = True
            if self.link_stack:
                self.link_stack[-1]["has_image_alt"] = True

        if tag == "input" and attrs.get("type", "text").lower() in INPUT_BUTTON_TYPES:
            if not hidden and not has_aria_name(attrs) and not attrs.get("title", "").strip() and not attrs.get("value", "").strip() and not attrs.get("alt", "").strip():
                self.issues.append((line, "commande input sans nom accessible statique"))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self.hidden_depth == 0:
            if self.button_stack:
                self.button_stack[-1]["text"].append(data)
            if self.link_stack:
                self.link_stack[-1]["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.link_stack:
            link = self.link_stack.pop()
            if not has_aria_name(link["attrs"]) and not link["attrs"].get("title", "").strip() and not "".join(link["text"]).strip() and not link["has_image_alt"]:
                self.issues.append((link["line"], "lien sans nom accessible statique"))
        if tag == "button" and self.button_stack:
            button = self.button_stack.pop()
            if not button["hidden"] and not has_aria_name(button["attrs"]) and not "".join(button["text"]).strip() and not button["has_image_alt"]:
                self.issues.append((button["line"], "bouton sans nom accessible statique"))
        if tag not in VOID_TAGS:
            # Fermer le bon ancêtre, même si des balises sont mal imbriquées.
            match = next((i for i in range(len(self.element_stack) - 1, -1, -1)
                          if self.element_stack[i][0] == tag), None)
            if match is not None:
                popped = self.element_stack[match:]
                del self.element_stack[match:]
                self.hidden_depth = max(0, self.hidden_depth - sum(hidden for _, hidden in popped))



def discover(root: Path):
    if root.is_file():
        if root.suffix.lower() in HTML_EXTENSIONS:
            yield root
        return
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() in HTML_EXTENSIONS and not any(p in SKIP_DIRS for p in path.parts):
            yield path


def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("path", nargs="?", default=".")
    args = cli.parse_args()
    root = Path(args.path)
    if not root.exists():
        print(f"Chemin introuvable: {root}", file=sys.stderr)
        return 2
    files = list(discover(root))
    if not files:
        print(f"Aucun fichier HTML trouvé sous {root}; audit non exécuté.", file=sys.stderr)
        return 2
    errors = 0
    for path in files:
        parser = ControlsAudit()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
            parser.close()
        except (UnicodeError, OSError, ValueError) as exc:
            print(f"{path}: impossible d'analyser: {exc}", file=sys.stderr)
            errors += 1
            continue
        for line, problem in parser.issues:
            print(f"{path}:{line}: {problem}")
            errors += 1
    print(f"Audit HTML statique : {len(files)} fichier(s), {errors} anomalie(s).")
    print("DOM JS/WebGL, dimensions tactiles et responsive : recette navigateur requise.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

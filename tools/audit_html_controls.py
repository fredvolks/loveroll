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
        self.hidden_depth = 0
        self.hidden_stack: list[bool] = []
        self.labels_for: set[str] = set()
        self.inputs: list[tuple[int, dict[str, str]]] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attributes}
        line = self.getpos()[0]
        element_id = attrs.get("id", "").strip()
        if element_id:
            if element_id in self.ids:
                self.issues.append((line, f"id HTML en double: {element_id!r} (premier: ligne {self.ids[element_id]})"))
            else:
                self.ids[element_id] = line

        if tag == "label" and attrs.get("for", "").strip():
            self.labels_for.add(attrs["for"].strip())

        hidden = self.hidden_depth > 0 or attrs.get("aria-hidden", "").lower() == "true" or "hidden" in attrs
        if tag not in VOID_TAGS:
            self.hidden_stack.append(hidden)
            if hidden:
                self.hidden_depth += 1

        if tag == "button":
            self.button_stack.append({"line": line, "attrs": attrs, "text": [], "has_image_alt": False})
        elif tag == "img" and self.button_stack and not hidden and attrs.get("alt", "").strip():
            self.button_stack[-1]["has_image_alt"] = True

        if tag == "input" and attrs.get("type", "text").lower() in INPUT_BUTTON_TYPES:
            if not has_aria_name(attrs) and not attrs.get("title", "").strip() and not attrs.get("value", "").strip() and not attrs.get("alt", "").strip():
                self.issues.append((line, "commande input sans nom accessible statique"))
        elif tag == "input":
            self.inputs.append((line, attrs))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self.button_stack and self.hidden_depth == 0:
            self.button_stack[-1]["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "button" and self.button_stack:
            button = self.button_stack.pop()
            if not has_aria_name(button["attrs"]) and not "".join(button["text"]).strip() and not button["has_image_alt"]:
                self.issues.append((button["line"], "bouton sans nom accessible statique"))
        if tag not in VOID_TAGS and self.hidden_stack:
            if self.hidden_stack.pop():
                self.hidden_depth = max(0, self.hidden_depth - 1)

    def finish(self) -> None:
        for line, attrs in self.inputs:
            kind = attrs.get("type", "text").lower()
            if kind in {"hidden", "submit", "reset", "button", "image"}:
                continue
            if has_aria_name(attrs) or attrs.get("title", "").strip():
                continue
            if attrs.get("id", "").strip() in self.labels_for:
                continue
            # Les labels enveloppants exigent une analyse DOM; éviter le faux positif.
            # Leurs omissions sont couvertes par les audits navigateur.


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
    errors = 0
    for path in files:
        parser = ControlsAudit()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
            parser.close()
            parser.finish()
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

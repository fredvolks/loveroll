#!/usr/bin/env python3
"""Audit statique en lecture seule des commandes HTML de LoveRoll.

Usage: python3 tools/audit_html_controls.py [repertoire]
Par défaut, inspecte le dépôt. Ne modifie aucun fichier.
Les contrôles injectés à l'exécution nécessitent toujours la recette navigateur.
"""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
import sys

SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".next", "vendor"}
HTML_EXTENSIONS = {".html", ".htm"}


def accessible_name(tag: str, attrs: dict[str, str]) -> bool:
    """Une indication statique de nom, pas une simulation de l'arbre accessible."""
    if attrs.get("aria-label", "").strip() or attrs.get("aria-labelledby", "").strip():
        return True
    if tag == "input":
        return bool(attrs.get("title", "").strip() or attrs.get("value", "").strip())
    return False


class ControlsAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: dict[str, int] = {}
        self.issues: list[tuple[int, str]] = []
        self.buttons: list[dict] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attributes}
        line = self.getpos()[0]
        element_id = attrs.get("id", "").strip()
        if element_id:
            if element_id in self.ids:
                self.issues.append((line, f"id HTML en double: {element_id!r} (premier: ligne {self.ids[element_id]})"))
            else:
                self.ids[element_id] = line

        if tag == "button":
            self.buttons.append({"line": line, "attrs": attrs, "text": [], "depth": 1})
        elif self.buttons:
            self.buttons[-1]["depth"] += 1

        if tag == "input" and attrs.get("type", "text").lower() in {"button", "submit", "reset", "image"}:
            if not accessible_name(tag, attrs) and not attrs.get("alt", "").strip():
                self.issues.append((line, "commande input sans nom accessible statique"))

    def handle_data(self, data: str) -> None:
        if self.buttons:
            self.buttons[-1]["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self.buttons:
            return
        if tag == "button":
            button = self.buttons.pop()
            if not accessible_name("button", button["attrs"]) and not "".join(button["text"]).strip():
                self.issues.append((button["line"], "bouton sans texte ni aria-label/aria-labelledby"))
        else:
            # Ne pas confondre la fermeture d'un élément enfant avec celle du bouton.
            self.buttons[-1]["depth"] = max(1, self.buttons[-1]["depth"] - 1)


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
        except (UnicodeError, OSError, ValueError) as exc:
            print(f"{path}: impossible d'analyser: {exc}", file=sys.stderr)
            errors += 1
            continue
        for line, problem in parser.issues:
            print(f"{path}:{line}: {problem}")
            errors += 1
    print(f"Audit HTML statique : {len(files)} fichier(s), {errors} anomalie(s).")
    print("Note: les contrôles JS/WebGL, la taille des cibles et le responsive exigent des tests navigateur.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

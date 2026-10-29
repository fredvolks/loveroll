"""Tests unitaires du contrôle statique HTML LoveRoll.

python3 -m unittest discover -s tools -p 'test_audit_html_controls.py'
"""
import unittest
import contextlib
import io
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

from audit_html_controls import ControlsAudit, main


def analyze(html):
    parser = ControlsAudit()
    parser.feed(html)
    parser.close()
    return [issue for _, issue in parser.issues]


class ControlsAuditTests(unittest.TestCase):
    def test_empty_button_detected(self):
        self.assertEqual(len(analyze("<button><svg aria-hidden='true'></svg></button>")), 1)

    def test_button_with_text(self):
        self.assertEqual(analyze("<button><span>Continuer</span></button>"), [])

    def test_aria_label(self):
        self.assertEqual(analyze("<button aria-label='Fermer'><svg></svg></button>"), [])

    def test_hidden_text_is_not_accessible_name(self):
        self.assertEqual(len(analyze("<button><span aria-hidden='true'>X</span></button>")), 1)

    def test_image_alt_is_name(self):
        self.assertEqual(analyze("<button><img alt='Retour' src='back.png'></button>"), [])

    def test_empty_image_not_name(self):
        self.assertEqual(len(analyze("<button><img alt='' src='back.png'></button>")), 1)

    def test_duplicate_id(self):
        self.assertEqual(len(analyze("<div id='same'></div><p id='same'></p>")), 1)

    def test_input_buttons(self):
        self.assertEqual(len(analyze("<input type='button'>")), 1)
        self.assertEqual(analyze("<input type='button' value='Confirmer'>"), [])

    def test_hidden_icon_followed_by_visible_label(self):
        self.assertEqual(analyze("<button><span aria-hidden='true'>★</span><span>Choisir</span></button>"), [])

    def test_hidden_icon_only_nested(self):
        self.assertEqual(len(analyze("<button><span aria-hidden='true'><b>★</b></span></button>")), 1)

    def test_unclosed_nested_tag_does_not_hide_next_button(self):
        self.assertEqual(analyze("<div aria-hidden='true'><span>secret</div><button>OK</button>"), [])

    def test_control_inside_hidden_section_is_ignored(self):
        self.assertEqual(analyze("<section hidden><button><svg></svg></button><input type='button'></section>"), [])

    def test_control_inside_aria_hidden_section_is_ignored(self):
        self.assertEqual(analyze("<div aria-hidden='true'><button></button></div>"), [])

    def test_visible_button_after_hidden_section_is_reported(self):
        self.assertEqual(len(analyze("<div hidden><button></button></div><button></button>")), 1)

    def test_empty_directory_cannot_pass_audit(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(sys, "argv", ["audit", directory]):
                with contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(main(), 2)

    def test_html_directory_can_be_scanned(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "screen.html").write_text("<button>Jouer</button>", encoding="utf-8")
            with patch.object(sys, "argv", ["audit", directory]):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(main(), 0)

    def test_empty_anchor_is_reported(self):
        self.assertEqual(len(analyze("<a href='/home'><svg aria-hidden='true'></svg></a>")), 1)

    def test_anchor_with_visible_label_is_valid(self):
        self.assertEqual(analyze("<a href='/home'><span>Accueil</span></a>"), [])

    def test_anchor_with_image_alt_is_valid(self):
        self.assertEqual(analyze("<a href='/home'><img alt='Accueil' src='home.png'></a>"), [])

    def test_anchor_with_aria_label_is_valid(self):
        self.assertEqual(analyze("<a href='/home' aria-label='Accueil'><svg></svg></a>"), [])

    def test_anchor_without_href_is_not_interactive(self):
        self.assertEqual(analyze("<a id='marker'></a>"), [])

    def test_no_false_positive_on_void_elements(self):
        self.assertEqual(analyze("<button><img src='icon.png'><span>Oui</span></button>"), [])


if __name__ == "__main__":
    unittest.main()

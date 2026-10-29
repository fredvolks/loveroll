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

    def test_hidden_link_does_not_hide_visible_link(self):
        self.assertEqual(len(analyze("<div hidden><a href='/hidden'></a></div><a href='/visible'></a>")), 1)

    def test_hidden_link_followed_by_named_link(self):
        self.assertEqual(analyze("<div aria-hidden='true'><a href='/hidden'></a></div><a href='/home'>Accueil</a>"), [])

    def test_native_submit_and_reset_inputs_have_names(self):
        self.assertEqual(analyze("<input type='submit'><input type='reset'>"), [])

    def test_image_input_without_alt_is_reported(self):
        self.assertEqual(len(analyze("<input type='image' src='play.png'>")), 1)

    def test_image_input_with_alt_has_name(self):
        self.assertEqual(analyze("<input type='image' alt='Jouer' src='play.png'>"), [])

    def test_image_map_area_missing_label(self):
        self.assertEqual(len(analyze("<map><area href='/go' shape='rect' coords='0,0,2,2'></map>")), 1)

    def test_image_map_area_with_alt(self):
        self.assertEqual(analyze("<area href='/go' alt='Aller au jeu'>"), [])

    def test_image_map_area_without_href(self):
        self.assertEqual(analyze("<area alt='Décoration'>"), [])

    def test_button_with_title_fallback_is_named(self):
        self.assertEqual(analyze("<button title='Fermer'><svg aria-hidden='true'></svg></button>"), [])

    def test_empty_title_does_not_name_button(self):
        self.assertEqual(len(analyze("<button title=' '><svg aria-hidden='true'></svg></button>")), 1)

    def test_image_input_value_is_not_accessible_name(self):
        self.assertEqual(len(analyze("<input type='image' value='Jouer' src='play.png'>")), 1)

    def test_image_input_aria_label_is_accessible(self):
        self.assertEqual(analyze("<input type='image' aria-label='Jouer' src='play.png'>"), [])

    def test_existing_labelledby_target_not_missing(self):
        parser = ControlsAudit()
        parser.feed("<button aria-labelledby='label'></button><span id='label'>Jouer</span>")
        self.assertEqual([name for _, _, refs in parser.pending_references for name in refs.split() if name not in parser.ids], [])

    def test_missing_labelledby_target_is_detected(self):
        parser = ControlsAudit()
        parser.feed("<button aria-labelledby='missing'></button>")
        missing = [name for _, _, refs in parser.pending_references for name in refs.split() if name not in parser.ids]
        self.assertEqual(missing, ["missing"])

    def test_cli_missing_labelledby_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "screen.html").write_text(
                "<button aria-labelledby='absent'></button>", encoding="utf-8")
            with patch.object(sys, "argv", ["audit", directory]):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(main(), 1)
                self.assertIn("aria-labelledby cible absente", output.getvalue())

    def test_cli_forward_reference_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "screen.html").write_text(
                "<button aria-labelledby='label'></button><span id='label'>Jouer</span>",
                encoding="utf-8")
            with patch.object(sys, "argv", ["audit", directory]):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(main(), 0)

    def test_hidden_control_missing_reference_ignored(self):
        parser = ControlsAudit()
        parser.feed("<div hidden><button aria-labelledby='absent'></button></div>")
        parser.check_references()
        self.assertEqual(parser.issues, [])

    def test_role_button_without_name_is_reported(self):
        self.assertEqual(len(analyze("<div role='button' tabindex='0'><svg aria-hidden='true'></svg></div>")), 1)

    def test_role_button_with_label_passes(self):
        self.assertEqual(analyze("<span role='button' tabindex='0' aria-label='Ouvrir'></span>"), [])

    def test_role_button_with_text_passes(self):
        self.assertEqual(analyze("<div role='button' tabindex='0'>Continuer</div>"), [])

    def test_void_role_button_does_not_capture_later_text(self):
        self.assertEqual(analyze("<input role='button' type='button'><button></button>"),
                         ["commande input sans nom accessible statique",
                          "bouton sans nom accessible statique"])

    def test_custom_role_button_checks_missing_label_reference(self):
        parser = ControlsAudit()
        parser.feed("<div role='button' tabindex='0' aria-labelledby='missing'></div>")
        parser.check_references()
        self.assertTrue(any("cible absente" in issue for _, issue in parser.issues))

    def test_custom_role_button_accepts_forward_label_reference(self):
        parser = ControlsAudit()
        parser.feed("<div role='button' tabindex='0' aria-labelledby='help'></div><span id='help'>Aide</span>")
        parser.check_references()
        self.assertEqual(parser.issues, [])

    def test_presentational_image_alt_cannot_name_button(self):
        self.assertEqual(len(analyze("<button><img role='presentation' alt='Décoration'></button>")), 1)

    def test_presentational_image_alt_cannot_name_link(self):
        self.assertEqual(len(analyze("<a href='/next'><img role='none' alt='Suivant'></a>")), 1)

    def test_custom_button_without_keyboard_focus_is_detected(self):
        self.assertEqual(analyze("<div role='button' aria-label='Jouer'></div>"),
                         ["bouton personnalisé sans tabindex accessible"])

    def test_custom_button_with_tabindex_is_valid(self):
        self.assertEqual(analyze("<div role='button' tabindex='0' aria-label='Jouer'></div>"), [])

    def test_custom_button_with_negative_tabindex_is_detected(self):
        self.assertEqual(analyze("<span role='button' tabindex='-1' aria-label='Jouer'></span>"),
                         ["bouton personnalisé sans tabindex accessible"])

    def test_inline_display_none_controls_ignored(self):
        self.assertEqual(analyze("<div style='display: none'><button></button></div>"), [])

    def test_inline_visibility_hidden_controls_ignored(self):
        self.assertEqual(analyze("<div style='visibility: hidden'><a href='/x'></a></div>"), [])

    def test_inline_css_hidden_does_not_mask_next_button(self):
        self.assertEqual(len(analyze("<div style='display:none'><button></button></div><button></button>")), 1)

    def test_anchor_role_button_reports_only_once(self):
        self.assertEqual(analyze("<a href='/go' role='button'></a>"),
                         ["bouton sans nom accessible statique"])

    def test_anchor_role_button_with_name_passes(self):
        self.assertEqual(analyze("<a href='/go' role='button' aria-label='Jouer'></a>"), [])

    def test_anchor_role_button_with_negative_tabindex_is_reported(self):
        self.assertEqual(
            analyze("<a role='button' href='/play' tabindex='-1' aria-label='Jouer'></a>"),
            ["bouton personnalisé sans tabindex accessible"],
        )

    def test_anchor_role_button_native_focus_is_valid(self):
        self.assertEqual(
            analyze("<a role='button' href='/play' aria-label='Jouer'></a>"),
            [],
        )

    def test_no_false_positive_on_void_elements(self):
        self.assertEqual(analyze("<button><img src='icon.png'><span>Oui</span></button>"), [])


if __name__ == "__main__":
    unittest.main()

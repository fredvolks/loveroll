"""Tests unitaires du contrôle statique HTML LoveRoll.

python3 -m unittest discover -s tools -p 'test_audit_html_controls.py'
"""
import unittest

from audit_html_controls import ControlsAudit


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

    def test_no_false_positive_on_void_elements(self):
        self.assertEqual(analyze("<button><img src='icon.png'><span>Oui</span></button>"), [])


if __name__ == "__main__":
    unittest.main()

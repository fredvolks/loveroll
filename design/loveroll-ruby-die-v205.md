# Ruby Home die, v205

Visual reference: the user's `93127.jpg`, showing polished ruby glass, rounded corners and recessed white pips. The Home model uses the existing Three.js die engine, with a closed rounded cube, volumetric ruby absorption, internal ruby facets, narrower studio reflections and opaque enamel inlays.

The flat faces meet the rounded body's actual 0.72 tangent boundary. The previous 0.60 face boundary left gaps around the faces. Home pips have a 0.16 radius and genuine concave recesses; opposite faces remain 1/6, 2/5 and 3/4.

The raised camera views a die resting on a horizontal support plane. Finger movement changes only its world Y rotation. Vertical movement cannot tip it, and releasing does not snap it back. Inspection does not modify the official face or contact the server.

Home retains the same WebGL canvas and model while waiting for the server, tumbling to the returned face and refreshing the final title/statistics. The existing 4.5-second roll trajectory and server probabilities remain authoritative. Finger rotation is available again after the throw.

Validation: 148 regression tests; 188 JavaScript files checked; Android layout and all six poses at 412 × 824, 412 × 915 and 360 × 740; real simulated touch before and after the production roll action; canvas/model identity unchanged; one official draw; D6, D20, D35 and D100 optical probes still respond to background changes while white engravings remain opaque.

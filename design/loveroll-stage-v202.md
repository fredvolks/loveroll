# Android portrait stage, v202

Asset: `couple-web/assets/loveroll-home-portrait-v202.webp` (941 × 1672).
Created with the built-in image-generation tool from the user's `93129.png` reference.

## Generation prompt

Use case: precise-object-edit. Create a new high-definition portrait 9:16 background asset for the existing LoveRoll Android app using the attached romantic scene as the reference. Faithfully retain the rich photorealistic ruby red velvet, roses, warm wax candles on antique holders, right ornate lantern, and polished black marble cylindrical plinth with fine copper veins. CRITICAL COMPOSITION CHANGE: move the entire stage ensemble UP substantially. In the final whole image, the marble plinth should span x=12% to88%, its TOP elliptical marble surface should be between y=25% and31%, and its BOTTOM front edge at exactly y=36%. It is a thick solid low cylinder, not a bowl, no tall gold rim. The pedestal is physically RESTING ON soft rumpled red velvet already starting behind it at y=28%, with velvet softly overlapping the base edges and a natural contact shadow. Move candles, rose bouquets and lantern UP to frame this raised plinth: lantern at far right around y=21-34%, candles mostly around y=6-29%; their bases rest on same velvet stage. Upper center y=0-25% remains uncluttered dark burgundy curtain for real app logo, heading, and real 3D die to be overlaid later. Below y=37% all the way to bottom, extend a continuous luxurious RED VELVET foreground with realistic soft folds and a few rose petals at outer corners. No candles or lantern in this lower area. Keep center of lower velvet relatively calm for overlaid app cards. The transition from stage to lower velvet must look like one physical scene, no collage seam, no black gap, no floating pedestal. No die, no UI, no buttons, no words, no logo, no watermark. Render sharp realistic material detail in high resolution, portrait 9:16, ideally2160x3840. Preserve the plinth's elegant photographed solid marble appearance and the source lighting.

## Actual image and placement

The generated image places the marble base at 43.8% of its height, rather than the requested 36%. The integration therefore fits the upper 46% of the photograph above the actual odds row. The remaining 54% supplies the lower velvet foreground, with the two crops meeting at exactly the same source row. The live WebGL die rests at 34.2% of the source image. Its refraction texture uses the same crop.

`fitHomeLayout` recalculates the crop and contact coordinates for each viewport. The marble base remains 12–17px above the odds row on the tested Android sizes. The die, text, controls and statistics are live DOM/WebGL content.

## Verification

136 regression tests passed; 187 shipped JavaScript files passed syntax checks. Chromium checked 412 × 824, 412 × 915 and 360 × 740: no scrolling, bottom navigation at the bottom, six server-driven die faces, button press effects, image split alignment, marble base above odds, die contact within one pixel of the photographed surface, and navigation to Settings and back.

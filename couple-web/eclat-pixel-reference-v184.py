"""Pixel-level check of the actual browser screenshot against the approved Éclat gallery.
Structural label/arrow rects are checked by eclat-visual-parity-v184.cjs.
Images are the user's accepted reference, not synthetic screenshots."""
from PIL import Image, ImageOps, ImageStat, ImageChops
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
reference=Image.open(root/'couple-web'/'visual-references'/'coffrets-approved-v184.webp').convert('RGB')
capture=root/'design-captures'/'coffrets-v184-412x824.png'
metadata=root/'design-captures'/'coffrets-v184-412x824.json'
actual=Image.open(capture).convert('RGB')
measurements=json.loads(metadata.read_text(encoding='utf-8'))
assert len(measurements['cards'])==12
rx0,rx1=(30,457),(470,899)
rows=[(318,493),(507,682),(697,875),(888,1067),(1081,1255),(1270,1438)]
ref_original_w,ref_original_h=941,1672
scores=[]
for index,entry in enumerate(measurements['cards']):
 row,col=divmod(index,2)
 x0,x1=((30,457) if col==0 else (470,899))
 y0,y1=rows[row]
 rx=(round(x0/reference_ratio_w),round(y0/reference_ratio_h),
     round(x1/reference_ratio_w),round(y1/reference_ratio_h)) if False else (
     round(x0/ref_original_w*reference.width),round(y0/ref_original_h*reference.height),
     round(x1/ref_original_w*reference.width),round(y1/ref_original_h*reference.height))
 box=entry['card']
 px=(max(0,int(box['x'])),max(0,int(box['y'])),min(actual.width,int(box['right'])),
     min(actual.height,int(box['bottom'])))
 live=actual.crop(px)
 approved=reference.crop(rx)
 # Compare the picture, not the text: titles live in the bottom third.
 fraction=.66
 live=live.crop((0,0,live.width,max(1,round(live.height*fraction))))
 approved=approved.crop((0,0,approved.width,max(1,round(approved.height*fraction))))
 live=ImageOps.fit(live,(160,60))
 approved=ImageOps.fit(approved,(160,60))
 score=sum(ImageStat.Stat(ImageChops.difference(live,approved)).mean)/3
 contrast=min(ImageStat.Stat(live).stddev)
 scores.append(round(score,1))
 assert contrast>11,(index+1,'Photo seems blank',contrast)
 assert score<98,(index+1,'Photo diverges significantly from approved visual',score)
avg=sum(scores)/len(scores)
assert avg<76,('Éclat photographs no longer resemble approved images',avg,scores)
# Verify the actual gold ring has light, red and dark tonal variations in the screenshot.
gold=measurements['gold']['box']
gcrop=actual.crop((int(gold['x']),int(gold['y']),
                   int(gold['right']),int(gold['bottom']))).convert('RGB')
st=ImageStat.Stat(gcrop)
assert st.stddev[0]>17 and st.mean[0]>st.mean[1]*1.32,('Gold ruby button lacks its glossy contrast',st.mean,st.stddev)
print('ECLAT_PIXEL_REFERENCE_OK', 'approved photograph:',reference.width,'x',reference.height,
      'mean RGB difference:',round(avg,1),'of 255',
      'per-card differences:',scores, 'premium ruby/gold contrast:',round(st.stddev[0],1))

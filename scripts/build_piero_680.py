from PIL import Image, ImageFilter
from pathlib import Path
import json
root=Path("assets/piero")
src=Image.open(root/"spin-22.webp").convert("RGBA")
alpha=src.getchannel("A")
bbox=alpha.getbbox()
if not bbox: raise RuntimeError("Piero source missing alpha silhouette")
# This image depicts a small hat above the head. Top of body (hairline) is
# annotated at 5.0% of visible silhouette height under the highest hat point.
# Do not use CSS scaling. The resulting actual body height is 680 output px.
x0,y0,x1,y1=bbox
visible_h=y1-y0
hat_h=round(visible_h*0.05)
body_h=visible_h-hat_h
factor=680/body_h
new_w=round(src.width*factor);new_h=round(src.height*factor)
resized=src.resize((new_w,new_h),Image.Resampling.LANCZOS)
a=resized.getchannel("A")
bb=a.getbbox()
if not bb: raise RuntimeError("Output is fully transparent")
# Keep a narrow, symmetric vertical cushion, preserving the full silhouette.
margin=25
figure=resized.crop((bb[0],bb[1],bb[2],bb[3]))
pad=18
canvas=Image.new("RGBA",(figure.width+pad*2,figure.height+2*margin),(0,0,0,0))
canvas.alpha_composite(figure,(pad,margin))
if canvas.getchannel("A").getextrema()!=(0,255): raise RuntimeError("Alpha not preserved")
dest=root/"studio-home-680.webp"
canvas.save(dest,"WEBP",quality=82,method=6,exact=True)
audit={"source":str(root/"spin-22.webp"),"input_size":list(src.size),"body_top":y0+hat_h,"body_bottom":y1,"scale":factor,"target_body_px":680,"output_body_px":round(body_h*factor),"output_image_size":list(canvas.size),"output_alpha_bbox":list(canvas.getchannel("A").getbbox())}
(root/"studio-home-680-audit.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n")
print(audit)

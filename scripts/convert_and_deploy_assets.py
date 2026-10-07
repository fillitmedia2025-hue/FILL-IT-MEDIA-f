import os
import glob
from PIL import Image, ImageDraw, ImageFont

brain_dir = r"C:\Users\skhar\.gemini\antigravity-ide\brain\9b36bdb8-1d00-4791-902e-97db987f1d0e"
project_dir = r"c:\Users\skhar\Downloads\fill-it-media 2"

targets = [
    os.path.join(project_dir, "client", "public", "manus-storage"),
    os.path.join(project_dir, "dist", "public", "manus-storage")
]

for t in targets:
    os.makedirs(t, exist_ok=True)

# Mapping of file names to generated images
mapping = {
    # Hero & Branding
    "hero-light_6c87f210.png": ("hero_workspace_1789698883255.jpg", "PNG"),
    "hero-light_a9147d12.png": ("hero_workspace_1789698883255.jpg", "PNG"),
    "images.jpg": ("brand_growth_chart_1789698916242.jpg", "PNG"),
    "works-collage-light.png": ("media_management_1789698975070.jpg", "PNG"),
    "final-cta-light_8bc858d3.png": ("ai_technology_1789698996020.jpg", "PNG"),
    
    # Pillars (Services)
    "creative-media_f22ccb36.webp": ("creative_media_1789698934963.jpg", "WEBP"),
    "branding-marketing_ceadad08.webp": ("branding_marketing_1789698955032.jpg", "WEBP"),
    "media-management_a8620c66.webp": ("media_management_1789698975070.jpg", "WEBP"),
    "images.jpg": ("ai_technology_1789698996020.jpg", "WEBP"),
    
    # Portfolio works
    "portfolio-lifestyle-gateway_0705bbb5.webp": ("portfolio_lifestyle_1789699341491.jpg", "WEBP"),
    "portfolio-motors_900a41c0.webp": ("portfolio_motors_1789699024103.jpg", "WEBP"),
    "portfolio-am-retail_a4376f7e.webp": ("portfolio_retail_1789699371207.jpg", "WEBP"),
    "portfolio-realestate_23653ff7.webp": ("portfolio_realestate_1789699275382.jpg", "WEBP"),
    "portfolio-bridal_89d576e2.webp": ("portfolio_bridal_1789699245090.jpg", "WEBP"),
    "portfolio-events_9f04d2af.webp": ("portfolio_events_1789699305887.jpg", "WEBP"),
    "portfolio-footwear_5c2e928a.webp": ("portfolio_footwear_1789699397745.jpg", "WEBP"),
}

for filename, (src_name, fmt) in mapping.items():
    src_path = os.path.join(brain_dir, src_name)
    if not os.path.exists(src_path):
        print(f"Warning: {src_path} not found")
        continue
    
    img = Image.open(src_path).convert("RGB")
    
    for t in targets:
        out_path = os.path.join(t, filename)
        if fmt == "WEBP":
            img.save(out_path, format="WEBP", quality=92, method=6)
        else:
            img.save(out_path, format="PNG", optimize=True)
        print(f"Saved {filename} [{fmt}] ({os.path.getsize(out_path)} bytes) -> {t}")

# Generate clean brand logo (128x128)
logo_img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
draw = ImageDraw.Draw(logo_img)
# Rounded rectangle dark card
draw.rounded_rectangle([4, 4, 124, 124], radius=28, fill=(18, 18, 20, 255))
# Brand yellow slash and white slash
# Polygon 1 (white slash)
draw.polygon([(40, 75), (55, 38), (68, 38), (53, 75)], fill=(255, 255, 255, 255))
# Polygon 2 (amber yellow slash)
draw.polygon([(62, 75), (77, 38), (90, 38), (75, 75)], fill=(245, 168, 0, 255))
# Accent dot
draw.ellipse([88, 36, 98, 46], fill=(255, 107, 0, 255))

for t in targets:
    logo_path = os.path.join(t, "logo_265052a1.png")
    logo_img.save(logo_path, format="PNG")
    print(f"Saved logo_265052a1.png -> {logo_path}")

# Also copy to favicon locations
for fav in ["favicon.ico", "favicon.png"]:
    p1 = os.path.join(project_dir, "client", "public", fav)
    p2 = os.path.join(project_dir, "dist", "public", fav)
    logo_img.save(p1, format="PNG")
    logo_img.save(p2, format="PNG")

print("Asset conversion and deployment complete!")

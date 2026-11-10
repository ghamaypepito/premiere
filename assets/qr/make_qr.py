"""Generate LUVEP QR codes with the logo in the centre.

Run: python3 assets/qr/make_qr.py   (needs `pip install qrcode pillow`)
"""
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).parent
LUVEP_LOGO = HERE / "luvep-logo.png"
IMMIGRATION_LOGO = HERE / "luvep-immigration-logo.jpg"
GREEN = (15, 97, 6)       # sampled from the LUVEP logo's "e"
TEAL = (0, 149, 153)      # sampled from the immigration logo's swoosh
CHARCOAL = (38, 38, 38)   # the LUVEP logo's white "p" is recoloured so it shows on white
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# (file name, url, card title, card caption, logo, brand colour)
# Each code is written in its brand colour and again with a "-black" suffix.
CODES = [
    ("luvep-qr-register", "https://luvep.com/education/register", "REGISTER", "luvep.com/education/register", LUVEP_LOGO, GREEN),
    ("luvep-qr-rsvp", "https://luvep.com/education/rsvp", "RSVP  ·  Clark / Davao / Digos", "luvep.com/education/rsvp", LUVEP_LOGO, GREEN),
    ("luvep-qr-website", "https://luvep.com", "VISIT OUR WEBSITE", "luvep.com", LUVEP_LOGO, GREEN),
    ("luvep-qr-immigration", "https://luvep.com/immigration", "IMMIGRATION", "luvep.com/immigration", IMMIGRATION_LOGO, TEAL),
    ("luvep-qr-bhutanese-association-nz", "https://luvep.com/register/bhutanese-association-of-new-zealand-fz35m",
     "BHUTANESE ASSOCIATION OF NEW ZEALAND", "luvep.com/register/bhutanese-association-of-new-zealand-fz35m",
     LUVEP_LOGO, GREEN),
]

FONT_DIR = Path("/usr/share/fonts/opentype/inter")


def font(name, size):
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default()


def fitted_font(draw, text, name, size, max_width):
    """Largest font up to `size` whose rendering of `text` fits in `max_width`."""
    f = font(name, size)
    while size > 20 and draw.textlength(text, font=f) > max_width:
        size -= 2
        f = font(name, size)
    return f


def prepared_logo(path):
    logo = Image.open(path).convert("RGBA")
    if path == LUVEP_LOGO:
        logo = logo.crop(logo.getchannel("A").getbbox())
        px = logo.load()
        for y in range(logo.height):
            for x in range(logo.width):
                r, g, b, a = px[x, y]
                if a and r > 200 and g > 200 and b > 200:  # the near-white "p"
                    px[x, y] = (*CHARCOAL, a)
    else:
        # Opaque logo on a white background: crop to the artwork.
        ink = ImageOps.invert(logo.convert("RGB")).point(lambda v: 255 if v > 30 else 0)
        logo = logo.crop(ink.getbbox())
    return logo


def make_qr(url, logo, colour, size=1200):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=colour, back_color=WHITE).convert("RGB")
    img = img.resize((size, size), Image.NEAREST)

    # White rounded badge covering ~5% of the code — well within level-H's 30% recovery.
    # Wide logos get a wide badge, squarish ones a square badge.
    if logo.width / logo.height >= 1.3:
        badge_w = int(size * 0.26)
        badge_h = int(badge_w * 0.72)
    else:
        badge_w = badge_h = int(size * 0.21)
    bx, by = (size - badge_w) // 2, (size - badge_h) // 2
    ImageDraw.Draw(img).rounded_rectangle(
        (bx, by, bx + badge_w, by + badge_h), radius=badge_h // 5, fill=WHITE
    )
    lw = int(badge_w * 0.86)
    lh = int(logo.height * lw / logo.width)
    if lh > badge_h * 0.86:
        lh = int(badge_h * 0.86)
        lw = int(logo.width * lh / logo.height)
    lg = logo.resize((lw, lh), Image.LANCZOS)
    img.paste(lg, ((size - lw) // 2, (size - lh) // 2), lg)
    return img


def make_card(qr_img, title, caption, colour):
    pad, top, bottom = 60, 140, 140
    w = qr_img.width + pad * 2
    card = Image.new("RGB", (w, qr_img.height + top + bottom), WHITE)
    card.paste(qr_img, (pad, top))
    d = ImageDraw.Draw(card)
    f_title = fitted_font(d, title, "Inter-Bold.otf", 64, w - pad * 2)
    f_cap = fitted_font(d, caption, "Inter-Medium.otf", 44, w - pad * 2)
    d.text((w // 2, top // 2 + 10), title, font=f_title, fill=colour, anchor="mm")
    d.text((w // 2, top + qr_img.height + bottom // 2 - 10), caption, font=f_cap, fill=CHARCOAL, anchor="mm")
    return card


def main():
    logos = {}
    for name, url, title, caption, logo_path, brand in CODES:
        logo = logos.setdefault(logo_path, prepared_logo(logo_path))
        for suffix, colour in (("", brand), ("-black", BLACK)):
            qr_img = make_qr(url, logo, colour)
            qr_img.save(HERE / f"{name}{suffix}.png")
            make_card(qr_img, title, caption, colour).save(HERE / f"{name}{suffix}-card.png")
            print("wrote", name + suffix)


if __name__ == "__main__":
    main()

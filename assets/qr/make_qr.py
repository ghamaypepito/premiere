"""Generate LUVEP QR codes with the logo in the centre.

Run: python3 assets/qr/make_qr.py   (needs `pip install qrcode pillow`)
"""
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
LOGO = HERE / "luvep-logo.png"
GREEN = (15, 97, 6)       # sampled from the logo's "e"
CHARCOAL = (38, 38, 38)   # the logo's white "p" is recoloured so it shows on white
WHITE = (255, 255, 255)

CODES = [
    ("luvep-qr-register", "https://luvep.com/education/register", "REGISTER", "luvep.com/education/register"),
    ("luvep-qr-rsvp", "https://luvep.com/education/rsvp", "RSVP  ·  Clark / Davao / Digos", "luvep.com/education/rsvp"),
    ("luvep-qr-website", "https://luvep.com", "VISIT OUR WEBSITE", "luvep.com"),
]

FONT_DIR = Path("/usr/share/fonts/opentype/inter")


def font(name, size):
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default()


def prepared_logo():
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    px = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            r, g, b, a = px[x, y]
            if a and r > 200 and g > 200 and b > 200:  # the near-white "p"
                px[x, y] = (*CHARCOAL, a)
    return logo


def make_qr(url, logo, size=1200):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=GREEN, back_color=WHITE).convert("RGB")
    img = img.resize((size, size), Image.NEAREST)

    # White rounded badge, ~24% of the code width — well within level-H's 30% recovery.
    badge_w = int(size * 0.26)
    badge_h = int(badge_w * 0.72)
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


def make_card(qr_img, title, caption):
    pad, top, bottom = 60, 140, 140
    w = qr_img.width + pad * 2
    card = Image.new("RGB", (w, qr_img.height + top + bottom), WHITE)
    card.paste(qr_img, (pad, top))
    d = ImageDraw.Draw(card)
    f_title = font("Inter-Bold.otf", 64)
    f_cap = font("Inter-Medium.otf", 44)
    d.text((w // 2, top // 2 + 10), title, font=f_title, fill=GREEN, anchor="mm")
    d.text((w // 2, top + qr_img.height + bottom // 2 - 10), caption, font=f_cap, fill=CHARCOAL, anchor="mm")
    return card


def main():
    logo = prepared_logo()
    for name, url, title, caption in CODES:
        qr_img = make_qr(url, logo)
        qr_img.save(HERE / f"{name}.png")
        make_card(qr_img, title, caption).save(HERE / f"{name}-card.png")
        print("wrote", name)


if __name__ == "__main__":
    main()

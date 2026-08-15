# -*- coding: utf-8 -*-
"""
天鉴数链 · 演示二维码生成脚本
用法：
    python generate_qr.py "https://你的真实链接/verify?batch=DEMO-001"
不带参数时使用占位生产域名 demo.tianjian.cn。
生成 300dpi、25mm、纠错级别 M、白底、中央含平台印章 Logo 的 PNG。
依赖：pip install qrcode[pil]
"""
import sys
import os

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("缺少依赖，请先执行：pip install qrcode[pil]")
    sys.exit(1)

DEFAULT_URL = "https://demo.tianjian.cn/verify?batch=DEMO-001"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qrcode-demo.png")

# 目标尺寸：25mm @ 300dpi ≈ 295px
MM = 25
DPI = 300
TARGET_PX = int(round(MM / 25.4 * DPI))  # ~295


def find_cjk_font():
    """在常见系统中寻找一个可渲染中文的字体文件。"""
    candidates = [
        r"C:\Windows\Fonts\msyh.ttc",      # 微软雅黑
        r"C:\Windows\Fonts\simsun.ttc",    # 宋体
        r"C:\Windows\Fonts\simhei.ttf",    # 黑体
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def make_logo(px):
    """绘制中央印章 Logo：深绿圆 + 金色双环 + 「鉴」字。"""
    size = int(px * 0.24)  # 占二维码约 24% 的中央 logo
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.06
    c = (size - 2 * pad) / 2
    r = c
    # 白底圆（隔离区，保证可扫）
    d.ellipse([pad, pad, size - pad, size - pad], fill=(255, 255, 255, 255))
    # 深绿圆
    d.ellipse([pad * 1.9, pad * 1.9, size - pad * 1.9, size - pad * 1.9], fill=(19, 80, 59, 255))
    # 金色双环
    d.ellipse([pad * 2.6, pad * 2.6, size - pad * 2.6, size - pad * 2.6], outline=(201, 162, 39, 255), width=max(1, int(size * 0.02)))
    # 「鉴」字
    font_path = find_cjk_font()
    if font_path:
        try:
            font = ImageFont.truetype(font_path, int(size * 0.42))
        except Exception:
            font = ImageFont.load_default()
    else:
        font = ImageFont.load_default()
    text = "鉴"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((size / 2 - tw / 2 - bbox[0], size / 2 - th / 2 - bbox[1]), text, font=font, fill=(246, 244, 238, 255))
    return img


def main():
    url = sys.argv[1].strip() if len(sys.argv) > 1 else DEFAULT_URL
    print("二维码内容：", url)

    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=4, box_size=1)
    qr.add_data(url)
    qr.make(fit=True)

    modules = qr.modules_count
    matrix = qr.get_matrix()

    # 逐模块绘制，得到整像素级控制（后续可精确缩放）
    base = Image.new("RGB", (modules, modules), "white")
    px = base.load()
    for y in range(modules):
        for x in range(modules):
            if matrix[y][x]:
                px[x, y] = (0, 0, 0)

    # 缩放到目标尺寸（最近邻，保持模块锐利）
    base = base.resize((TARGET_PX, TARGET_PX), Image.NEAREST)

    # 叠加中央 Logo
    logo = make_logo(TARGET_PX)
    base = base.convert("RGBA")
    pos = ((TARGET_PX - logo.size[0]) // 2, (TARGET_PX - logo.size[1]) // 2)
    base.paste(logo, pos, logo)

    base.convert("RGB").save(OUT, dpi=(DPI, DPI))
    print("已生成：", OUT)
    print("尺寸：%dpx × %dpx @ %ddpi ≈ %.0fmm" % (TARGET_PX, TARGET_PX, DPI, MM))


if __name__ == "__main__":
    main()

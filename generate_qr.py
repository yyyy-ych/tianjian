# -*- coding: utf-8 -*-
"""
天鉴数链 演示二维码生成脚本
用法：
    python generate_qr.py "https://你的真实链接"
不带参数默认使用域名 https://www.tianjianshulian.xyz/
生成300dpi、25mm、高纠错等级H、白底，带中央印章Logo的PNG二维码。
每次生成新二维码的同时，自动将 data.json 中的扫码访问次数重置归零。
依赖：pip install qrcode[pil]
"""
import sys
import os
import json

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("缺少依赖，请先执行：pip install qrcode[pil]")
    sys.exit(1)

DEFAULT_URL = "https://www.tianjianshulian.xyz/"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE_DIR, "qrcode-demo.png")
DATA_FILE = os.path.join(BASE_DIR, "data.json")

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
    size = int(px * 0.18)  # 占二维码约 18% 的中央 logo
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


def reset_scan_count():
    # 1. 重置本地 data.json
    if not os.path.exists(DATA_FILE):
        print("警告：data.json 不存在，跳过扫码次数重置")
        return
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['scan_count'] = 0
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("已重置 data.json 扫码次数 → 0")
    except Exception as e:
        print("重置本地扫码次数失败：", e)
    
    # 2. 重置云端计数（countapi.xyz）
    try:
        import urllib.request
        url = "https://api.countapi.xyz/set/tianjianshulian/demo-001-scans?value=0"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode())
            print("已重置云端扫码次数 →", result.get('value', '?'))
    except Exception as e:
        print("重置云端计数失败（不影响本地演示）：", e)


def main():
    url = sys.argv[1].strip() if len(sys.argv) > 1 else DEFAULT_URL
    print("二维码内容：", url)

    reset_scan_count()

    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=4, box_size=10)
    qr.add_data(url)
    qr.make(fit=True)
    base = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    base = base.resize((TARGET_PX, TARGET_PX), Image.NEAREST)

    logo = make_logo(TARGET_PX)
    pos = ((TARGET_PX - logo.size[0]) // 2, (TARGET_PX - logo.size[1]) // 2)
    base.paste(logo, pos, logo)

    base.convert("RGB").save(OUT, dpi=(DPI, DPI))
    print("已生成：", OUT)
    print("尺寸：%dpx × %dpx @ %ddpi ≈ %.0fmm" % (TARGET_PX, TARGET_PX, DPI, MM))


if __name__ == "__main__":
    main()
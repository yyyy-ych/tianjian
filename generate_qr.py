# -*- coding: utf-8 -*-
"""
天鉴数链 演示二维码生成脚本
用法：
    python generate_qr.py "https://你的真实链接"
    python generate_qr.py --reset-only          # 仅重置扫码计数（不生成二维码）
    python generate_qr.py --api-url https://xxx.vercel.app/api/scan  # 指定远程API地址
不带参数默认使用域名 https://www.tianjianshulian.xyz/
生成300dpi、25mm、高纠错等级H、白底，带中央印章Logo的PNG二维码。
同时自动调用服务端接口将全局扫码计数重置为 0。
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

try:
    import urllib.request
    import urllib.error
except ImportError:
    urllib = None

DEFAULT_URL = "https://www.tianjianshulian.xyz/"
DEFAULT_API_URL = "https://www.tianjianshulian.xyz/api/scan"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE_DIR, "qrcode-demo.png")
DATA_FILE = os.path.join(BASE_DIR, "data.json")

MM = 25
DPI = 300
TARGET_PX = int(round(MM / 25.4 * DPI))


def find_cjk_font():
    candidates = [
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simsun.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def make_logo(px):
    size = int(px * 0.18)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.06
    c = (size - 2 * pad) / 2
    r = c
    d.ellipse([pad, pad, size - pad, size - pad], fill=(255, 255, 255, 255))
    d.ellipse([pad * 1.9, pad * 1.9, size - pad * 1.9, size - pad * 1.9], fill=(19, 80, 59, 255))
    d.ellipse([pad * 2.6, pad * 2.6, size - pad * 2.6, size - pad * 2.6], outline=(201, 162, 39, 255), width=max(1, int(size * 0.02)))
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


def _get_json(url, timeout=8):
    req = urllib.request.Request(
        url,
        headers={"Cache-Control": "no-store"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def reset_scan_count(remote_url=None):
    """重置本地 data.json 扫码计数，并调用远程 Vercel API 重置全局计数。"""
    if os.path.exists(DATA_FILE):
        old = 0
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            old = data.get("scan_count", 0)
            data["scan_count"] = 0
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"[本地重置] data.json 扫码计数已从 {old} 重置为 0")
        except Exception as e:
            print(f"[错误] 重置 data.json 失败：{e}")
    else:
        print("[警告] data.json 不存在，跳过本地重置")

    if not remote_url:
        return True
    if urllib is None:
        print("[错误] urllib 不可用，跳过远程重置")
        return False

    reset_url = remote_url + ("&" if "?" in remote_url else "?") + "reset=true"

    for attempt in range(1, 4):
        print(f"[远程重置] 第 {attempt}/3 次 GET {reset_url} ...")
        try:
            result = _get_json(reset_url, timeout=10)
            new_count = result.get("scan_count", "?")
            print(f"[远程重置] 成功！服务端扫码计数已归零，当前值: {new_count}")

            try:
                verify = _get_json(remote_url, timeout=8)
                v = verify.get("scan_count", "?")
                if v == 0:
                    print(f"[远程验证] 确认 scan_count = 0，重置生效")
                else:
                    print(f"[远程验证] 警告：当前 scan_count = {v}，非预期")
            except Exception:
                pass

            return True
        except Exception as e:
            print(f"[远程重置] 第 {attempt} 次失败: {e}")
            if attempt < 3:
                import time
                time.sleep(2)

    print("[远程重置] 3 次均失败，可能是网络问题。你可以稍后在浏览器打开:")
    print(f"  {reset_url}")
    return False


def parse_args():
    args = sys.argv[1:]
    url = None
    reset_only = False
    remote_url = None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--reset-only":
            reset_only = True
        elif a == "--api-url" and i + 1 < len(args):
            remote_url = args[i + 1]
            i += 1
        elif not a.startswith("--"):
            url = a
        i += 1
    return url, reset_only, remote_url


def main():
    url, reset_only, remote_url = parse_args()

    if remote_url is None:
        env_url = os.environ.get("API_RESET_URL")
        if env_url:
            remote_url = env_url
        else:
            remote_url = DEFAULT_API_URL

    reset_scan_count(remote_url)

    if reset_only:
        print("[完成] 扫码计数已重置，未生成二维码（--reset-only 模式）")
        return

    target_url = url if url else DEFAULT_URL
    print("二维码内容：", target_url)

    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=4, box_size=10)
    qr.add_data(target_url)
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
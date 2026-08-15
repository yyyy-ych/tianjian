# 天鉴数链 · 本草兴乡 — 演示 Demo

道地药材溯源与数字赋能平台的**纯静态演示切片**，含「扫码溯源 H5 页」与「后台数据大屏」两页。
零后端、零数据库、零外部依赖，双击即可打开，评委扫码即见溯源闭环。

> 依据《天鉴数链_演示Demo_技术设计文档》第 5 节结构实现；品牌与数据来自项目 PPT。
> 当前为**纯 mock 数据**（单批次 `DEMO-001`，铁皮石斛），哈希/链上交易哈希为预置占位值。

---

## 文件结构

```
demo/
  index.html        溯源 H5 页（消费者扫码页，移动端 375px 优先）
  dashboard.html    后台数据大屏（桌面端，含指标卡/趋势/饼图/告警/批次表）
  data.json         mock 单批次溯源数据（字段对齐完整版 trace_detail_view）
  assets/logo.svg   平台印章 Logo
  generate_qr.py    二维码生成脚本
  qrcode-demo.png   演示二维码（占位域名，部署后重跑覆盖）
```

## 本地打开

- **双击** `index.html` 即可在浏览器看到溯源页（数据内嵌，`file://` 直开）。
- 或起本地服务预览两页：`python -m http.server 8000` 后访问 `http://localhost:8000/`。

## 让评委扫码看到网页（免费静态托管）

1. **上传**：把整个 `demo/` 文件夹上传到任意免费静态托管平台，任选其一：
   - **Cloudflare Pages**：新建项目 → 拖拽上传 `demo/` → 得到 `https://你的项目.pages.dev`。
   - **Vercel**：`vercel deploy demo`（或网页端拖拽）→ 得到 `https://xxx.vercel.app`。
   - **腾讯云 COS 静态网站**：创建存储桶 → 开启「静态网站」→ 上传文件 → 得到默认域名。
2. **拿真实链接**：溯源页的访问地址形如 `https://你的域名/verify?batch=DEMO-001`（`/verify` 会落到 `index.html`；若平台不支持该路径，直接用 `https://你的域名/index.html` 亦可）。
3. **重生成二维码**：
   ```bash
   python generate_qr.py "https://你的真实链接/index.html"
   ```
   脚本会覆盖 `qrcode-demo.png`（300dpi、25mm、含中央 Logo），把这张图插入 PPT。
4. **实测**：务必用**手机流量**（非公司 WiFi）扫一次，确认 iOS 相机/微信/Android 都能秒开。

> 说明：Demo 阶段不依赖任何第三方短链/图床；页面本身是纯静态 HTML，托管平台只要不删除项目就长期有效。

## 与完整版的关系

- 现在（Demo）：静态自托管 + mock 单批次 + 离线二维码，保证演示稳、观感完整。
- 之后（完整版）：接入 PostgreSQL + 长安链 + 国密 SM2/SM3 真实签名 + JWT 鉴权。
- **迁移路径**：`data.json` 字段已与完整版 `trace_detail_view` 对齐，前端溯源页结构完全复用，仅需把「内嵌 `TRACE_DATA`」换成真实 `/api/qrcode/verify` 返回即可，页面渲染逻辑无需重写。

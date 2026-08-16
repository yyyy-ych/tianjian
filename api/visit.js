// api/visit.js
const fetch = require('node-fetch');

const NAMESPACE = 'tianjianshulian';
const KEY = 'demo-001-scans';

export default async function handler(req, res) {
  try {
    // 调用 countapi.xyz 公共计数 API（免费、无需注册）
    const hitRes = await fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/${KEY}`);
    const hitData = await hitRes.json();
    
    // 读取 data.json 返回完整数据
    const dataRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/data.json`);
    const data = await dataRes.json();
    
    // 用云端计数覆盖本地 scan_count
    data.scan_count = hitData.value;
    
    // 缓存控制
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(data);
  } catch (err) {
    // 失败时回退：直接返回 data.json
    try {
      const dataRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/data.json`);
      const data = await dataRes.json();
      data.scan_count = (data.scan_count || 0) + 1;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'server error' });
    }
  }
}
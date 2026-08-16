// api/data.js
const fetch = require('node-fetch');

const NAMESPACE = 'tianjianshulian';
const KEY = 'demo-001-scans';

export default async function handler(req, res) {
  try {
    // 读取当前计数（不增加）
    const countRes = await fetch(`https://api.countapi.xyz/get/${NAMESPACE}/${KEY}`);
    const countData = await countRes.json();
    
    // 读取 data.json
    const dataRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/data.json`);
    const data = await dataRes.json();
    
    data.scan_count = countData.value || 0;
    
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(data);
  } catch (err) {
    try {
      const dataRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/data.json`);
      const data = await dataRes.json();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: 'server error' });
    }
  }
}
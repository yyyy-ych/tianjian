import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const BLOB_KEY = 'demo1-data.json';

function getTemplateData(){
  const filePath = path.join(process.cwd(),'data.json');
  const raw = fs.readFileSync(filePath,'utf-8');
  return JSON.parse(raw);
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');

  if(req.method === 'OPTIONS'){
    return res.status(200).end();
  }

  if(req.method !== 'POST'){
    return res.status(405).json({error:"仅支持POST"});
  }

  const body = req.body || await new Promise((resolve)=>{
      let buf='';
      req.on('data',c=>buf+=c);
      req.on('end',()=>resolve(JSON.parse(buf||'{}')));
  });

  if(body.reset !== true){
    return res.status(400).json({error:"需要reset:true参数"});
  }

  try{
    let data;
    try{
      const r = await fetch(`https://blob.vercel-storage.com/${BLOB_KEY}`);
      if(r.ok){
        data = await r.json();
      }else{
        data = getTemplateData();
      }
    }catch(e){
      data = getTemplateData();
    }
    data.scan_count = 0;

    await put(BLOB_KEY,JSON.stringify(data,null,2),{
      access:'public',
      contentType:'application/json'
    });

    return res.status(200).json({scan_count:data.scan_count,msg:"计数已重置为0"});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:err.message});
  }
}
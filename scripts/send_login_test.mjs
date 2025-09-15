#!/usr/bin/env node
import fetch from 'node-fetch';
function parseArgs(){const a=process.argv.slice(2);const out={};for(let i=0;i<a.length;i++){const k=a[i];if(k.startsWith('--')){const name=k.replace(/^--/,'');const val=a[i+1]&&!a[i+1].startsWith('--')?a[++i]:'true';out[name]=val;}}return out;}
(async()=>{
  const argv=parseArgs();
  const url=argv.url||'http://localhost:8888/.netlify/functions/login';
  const username=argv.username||'testowner1_ejno';
  const password=argv.password||'OwnerPass123';
  console.log('POST',url,'{username,password}');
  try{
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const text=await res.text();
    let body;
    try{body=JSON.parse(text);}catch(e){body=text}
    console.log('status',res.status);
    console.log('body',body);
    process.exit(0);
  }catch(e){
    console.error('error',String(e));
    process.exit(2);
  }
})();

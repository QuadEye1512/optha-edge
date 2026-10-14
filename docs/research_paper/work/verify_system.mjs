import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';

const base = new URL('.', import.meta.url);
const rgb = await sharp({create:{width:512,height:512,channels:3,background:{r:96,g:64,b:48}}}).png().toBuffer();
const cases = [
  {name:'Missing image',mode:'binary',status:400,code:'MISSING_IMAGE'},
  {name:'Unsupported mode',mode:'unknown',bytes:rgb,mime:'image/png',status:400,code:'INVALID_MODE'},
  {name:'Empty file',mode:'binary',bytes:Buffer.alloc(0),mime:'image/png',status:400,code:'EMPTY_FILE'},
  {name:'Non-image content',mode:'binary',bytes:Buffer.from('not an image'),mime:'image/png',status:415,code:'UNSUPPORTED_IMAGE_CONTENT'},
  {name:'MIME mismatch',mode:'binary',bytes:rgb,mime:'image/jpeg',status:400,code:'MIME_CONTENT_MISMATCH'},
  {name:'Corrupt PNG',mode:'binary',bytes:Buffer.from([137,80,78,71,13,10,26,10]),mime:'image/png',status:400,code:'CORRUPT_IMAGE'},
  {name:'Oversize file',mode:'binary',bytes:Buffer.alloc(10*1024*1024+1),mime:'image/png',status:413,code:'FILE_TOO_LARGE'},
  {name:'RGB synthetic binary smoke test',mode:'binary',bytes:rgb,mime:'image/png',status:200},
  {name:'RGB synthetic severity smoke test',mode:'severity',bytes:rgb,mime:'image/png',status:200},
];
let results=[];
for(const c of cases){
 const data=new FormData(); data.append('mode',c.mode);
 if(c.bytes!==undefined)data.append('image',new Blob([c.bytes],{type:c.mime}),'synthetic.png');
 const response=await fetch('http://localhost:3000/api/predict',{method:'POST',body:data});
 const body=await response.json();
 const pass=response.status===c.status && (c.code ? body.success===false&&body.error?.code===c.code : body.success===true&&body.result?.mode===c.mode);
 results.push({name:c.name,status:response.status,expectedStatus:c.status,pass,body});
}
let report={date:new Date().toISOString(),node:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,logicalProcessors:os.cpus().length,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input:'One constant-color 512x512 RGB PNG; no fundus photograph or patient information',results};
fs.writeFileSync(new URL('system_verification.json',base),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:results.filter(r=>r.pass).length,total:results.length,results:results.map(({name,status,pass})=>({name,status,pass}))},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;

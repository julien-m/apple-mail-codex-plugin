import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,writeFile,mkdir,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {test} from 'node:test';

async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'apple-mail-plugin-'));const service=join(dir,'service with spaces');await mkdir(join(service,'dist/transports'),{recursive:true});
 const config=join(dir,'config.json'),envFile=join(dir,'mcp.env'),creds=join(dir,'creds-fixture');
 await writeFile(envFile,`MAIL_API_URL=http://127.0.0.1:1\nMAIL_API_TOKEN=creds:test/local/${randomUUID()}\n`,{mode:0o600});
 await writeFile(creds,`#!${process.execPath}\nimport {spawn} from 'node:child_process';const i=process.argv.indexOf('--');if(i<0)process.exit(3);const c=spawn(process.argv[i+1],process.argv.slice(i+2),{stdio:'inherit'});c.once('exit',code=>process.exit(code??0));`,{mode:0o700});
 await writeFile(join(service,'dist/transports/stdio.js'),`const readline=require('node:readline');readline.createInterface({input:process.stdin}).on('line',line=>console.log(JSON.stringify({echo:JSON.parse(line),pid:process.pid,unrelated:process.env.UNRELATED_SECRET??null})));process.on('SIGTERM',()=>process.exit(0));`);
 const data={version:1,serviceRoot:service,envFile,credsCommand:creds};await writeFile(config,JSON.stringify(data),{mode:0o600});return{dir,config,envFile,service,data};
}
const launch=resolve('scripts/launch.mjs');
function start(config,extra={}){return spawn(process.execPath,[launch],{env:{...process.env,APPLE_MAIL_CONFIG:config,...extra},stdio:['pipe','pipe','pipe']});}
async function collect(child){let out='',err='';child.stdout.on('data',x=>out+=String(x));child.stderr.on('data',x=>err+=String(x));const [code]=await once(child,'exit');return{code,out,err};}

test('plaintext or permissive credential files are rejected before a child is launched and values never appear in diagnostics',{timeout:2000},async()=>{
 const f=await fixture();try{
  const privateValue=randomUUID();await writeFile(f.envFile,`MAIL_API_URL=http://127.0.0.1:1\nMAIL_API_TOKEN=${privateValue}\n`);
  const result=await collect(start(f.config));assert.equal(result.code,1);assert.equal(result.out,'');assert.ok(!result.err.includes(privateValue));assert.match(result.err,/Apple Mail/);
  await writeFile(f.envFile,`MAIL_API_URL=http://127.0.0.1:1\nMAIL_API_TOKEN=creds:test/local/${randomUUID()}\n`);await import('node:fs/promises').then(m=>m.chmod(f.envFile,0o644));
  assert.equal((await collect(start(f.config))).code,1);
 }finally{await rm(f.dir,{recursive:true,force:true});}
});

test('stdio passes arbitrary JSON intact through paths with spaces, excludes unrelated secrets and terminates owned child processes',{timeout:2000},async()=>{
 const f=await fixture();let child;try{
  child=start(f.config,{UNRELATED_SECRET:randomUUID()});let errors='';child.stderr.on('data',x=>errors+=String(x));const request={id:randomUUID(),text:`${randomUUID()} émail`};child.stdin.write(JSON.stringify(request)+'\n');
  const [bytes]=await once(child.stdout,'data');const result=JSON.parse(String(bytes));assert.deepEqual(result.echo,request);assert.equal(result.unrelated,null);assert.equal(errors,'');
  const exited=once(child,'exit');child.kill('SIGTERM');const [code]=await exited;assert.equal(code,0);
  const deadline=Date.now()+500;let alive=true;while(Date.now()<deadline){try{process.kill(result.pid,0);}catch(e){if(e.code==='ESRCH'){alive=false;break;}throw e;}await new Promise(r=>setTimeout(r,20));}assert.equal(alive,false,'the bridge child must exit with its launcher');
 }finally{if(child&&child.exitCode===null)child.kill('SIGKILL');await rm(f.dir,{recursive:true,force:true});}
});


test('a bridge ignoring SIGTERM cannot outlive its terminating creds parent',{timeout:2000},async()=>{
 const f=await fixture();let child,pid;try{
 await writeFile(join(f.service,'dist/transports/stdio.js'),`console.log(JSON.stringify({pid:process.pid}));process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
 child=start(f.config);child.stderr.resume();const [bytes]=await once(child.stdout,'data');pid=JSON.parse(String(bytes)).pid;const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;
 const deadline=Date.now()+500;let alive=true;while(Date.now()<deadline){try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH'){alive=false;break;}throw e;}await new Promise(r=>setTimeout(r,20));}assert.equal(alive,false,'a stubborn descendant must be terminated too');
 }finally{if(pid){try{process.kill(pid,'SIGKILL');}catch{}}if(child&&child.exitCode===null)child.kill('SIGKILL');await rm(f.dir,{recursive:true,force:true});}
});

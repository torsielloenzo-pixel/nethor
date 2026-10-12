'use strict';
// End-to-end-ish release rehearsal: unchanged candidate handler logic running
// in an actual Deno process, local GoTrue/Auth + PostgREST + Postgres, and a
// mock Resend server bound to localhost. NO production endpoint or real mail.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {spawn,execFileSync}=require('node:child_process');
const {randomUUID,createHash}=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');

const base=process.env.API_URL||'',dbUrl=process.env.DB_URL||'';
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY||'';
const service=process.env.SERVICE_ROLE_KEY||'';
function local(u){try{return ['localhost','127.0.0.1','[::1]'].includes(new URL(u).hostname)}catch{return false}}
assert.equal(process.env.STAGE22_LOCAL_AUTH,'1','Local Auth staging marker required');
assert.ok(local(base)&&local(dbUrl),'Refusing non-local Supabase service');
assert.ok(anon&&service,'Only locally generated Supabase keys may be used');
const edgeOrigin='http://127.0.0.1:8767',resendOrigin='http://127.0.0.1:8768';
const inbox=[],failures=[];
let deno=null,inboxServer=null,tmp='';
const redacted=(value)=>String(value||'unknown').replace(/Bearer\s+[^\s]+/gi,'Bearer [redacted]').slice(0,220);

function sql(q){return execFileSync('psql',[dbUrl,'-X','-v','ON_ERROR_STOP=1','-A','-t','-c',q],{
 encoding:'utf8',env:process.env,stdio:['ignore','pipe','pipe']}).trim()}
async function api(url,{method='POST',key=anon,token=key,body}={}){
 const r=await fetch(base+url,{
  method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const raw=await r.text();let value;try{value=JSON.parse(raw)}catch{value={message:raw.slice(0,120)}}
 return {ok:r.ok,status:r.status,value}
}
async function required(url,options){
 const r=await api(url,options);
 assert.ok(r.ok,redacted('Local Auth '+url+' status='+r.status+' code='+r.value?.error_code));
 return r.value
}
async function edge(body,{token='',auth=true}={}){
 const headers={'Content-Type':'application/json',apikey:anon};
 if(auth)headers.Authorization='Bearer '+(token||anon);
 const r=await fetch(edgeOrigin+'/',{method:'POST',headers,body:JSON.stringify(body)});
 const data=await r.json();
 return{status:r.status,data}
}
async function register(){
 const email='stage27-'+randomUUID()+'@example.test',password='Synthetic-Stage27-Before!'+randomUUID();
 const user=await required('/auth/v1/admin/users',{key:service,body:{email,password,email_confirm:true}});
 assert.match(String(user.id),/^[0-9a-f-]{36}$/i);
 sql(`INSERT INTO public.profiles(id,display_name,role,planning_name,email)
 VALUES ('${user.id}'::uuid,'Local Synthetic Tester','employe','SYNTHETIC NAME','${email}')`);
 sql(`INSERT INTO public.user_recovery_emails(user_id,email)
 VALUES ('${user.id}'::uuid,'${email}')`);
 const auth=await required('/auth/v1/token?grant_type=password',{body:{email,password}});
 return{email,password,id:user.id,token:auth.access_token};
}
async function start(){
 tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nethor-stage27-'));
 const candidate=path.resolve('docs/security/edge-functions/password-recovery-email/index.ts');
 let source=fs.readFileSync(candidate,'utf8');
 // Only the TEMPORARY IN-MEMORY test copy is changed: production candidate
 // continues to target Resend. Deny all non-local outbound network in Deno.
 const originalMail='https://api.resend.com/emails';
 const originalServe='Deno.serve(async (req) => {';
 assert.equal(source.split(originalMail).length,2,'Expected one Resend outbound URL');
 assert.equal(source.split(originalServe).length,2,'Expected one Deno entrypoint');
 source=source.replace(originalMail,resendOrigin+'/emails').replace(originalServe,
   'Deno.serve({hostname:"127.0.0.1",port:8767},async (req) => {');
 const index=path.join(tmp,'password-recovery-email.ts');
 fs.writeFileSync(index,source,{mode:0o600});
 // Download imports before locking Deno to loopback-only network access.
 execFileSync('deno',['cache',index],{encoding:'utf8',env:process.env,
  stdio:['ignore','pipe','pipe'],timeout:140000});
 const env={...process.env,
  SUPABASE_URL:base,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service,
  RESEND_API_KEY:'local-only-fake-mail-secret',
  PASSWORD_RESET_FROM_EMAIL:'Nethor Staging <noreply@example.test>',
  DENO_NO_UPDATE_CHECK:'1'};
 deno=spawn('deno',['run','--cached-only','--allow-env',
  '--allow-net=127.0.0.1,localhost',index],{env,stdio:['ignore','pipe','pipe']});
 let errorText='';
 deno.stderr.on('data',buf=>{errorText+=String(buf).slice(0,2000);});
 deno.on('error',e=>{failures.push(redacted(e.message))});
 for(let i=0;i<70;i++){
  if(deno.exitCode!==null)break;
  try{
   const response=await fetch(edgeOrigin+'/',{method:'OPTIONS'});
   if(response.ok)return;
  }catch{}
  await delay(160);
 }
 throw Error('Local Deno candidate did not start: '+redacted(errorText));
}
async function launchInbox(){
 inboxServer=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/emails'){
   res.writeHead(404);res.end();return;
  }
  let body='';
  for await(const part of req){body+=part.toString();if(body.length>100000){res.writeHead(413);res.end();return;}}
  try{
   const payload=JSON.parse(body);
   inbox.push(payload);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({id:'local-synthetic-message-'+inbox.length}));
  }catch{res.writeHead(400);res.end()}
 });
 await new Promise((resolve,reject)=>{
  inboxServer.once('error',reject);
  inboxServer.listen(8768,'127.0.0.1',resolve);
 });
}
async function cleanup(){
 if(deno&&deno.exitCode===null)deno.kill('SIGTERM');
 if(inboxServer)await new Promise(resolve=>inboxServer.close(resolve));
 if(tmp)fs.rmSync(tmp,{recursive:true,force:true});
}
async function main(){
 await launchInbox();
 await start();
 const account=await register();
 const outsider=await register();
 const unknown=await edge({identifier:'absent-'+randomUUID()+'@example.test'});
 assert.equal(unknown.status,200);
 assert.equal(inbox.length,0,'Unknown account revealed by email transmission');
 const requested=await edge({action:'request',identifier:account.email});
 assert.equal(requested.status,200);
 assert.equal(inbox.length,1,'No synthetic recovery email sent');
 const mailText=inbox[0].text||'';
 const link=mailText.match(/https?:\/\/[^\s]+/)?.[0];
 assert.ok(link,'Local email has no recovery URL');
 const recoveryUrl=new URL(link);
 const requestId=recoveryUrl.searchParams.get('request_id');
 const tokenHash=recoveryUrl.searchParams.get('token_hash');
 assert.match(requestId||'',/^[0-9a-f-]{36}$/i);
 assert.ok(tokenHash?.length>=20,'Missing real GoTrue recovery token');
 const digest=createHash('sha256').update(tokenHash).digest('hex');
 const database=sql(`SELECT CASE WHEN recovery_proof_digest='${digest}' AND
  email_status='sent' AND resolved_at IS NULL THEN 'sent_pending' ELSE 'invalid' END
  FROM public.password_reset_requests WHERE id='${requestId}'::uuid`);
 assert.equal(database,'sent_pending','Real Edge request did not track a matching sent link');
 console.log('stage27-deno-request-mock-inbox-linked-PASS');

 const accountSession=account.token;
 let result=await edge({action:'resolved',request_id:requestId,token_hash:tokenHash},{token:accountSession});
 assert.equal(result.status,409,'Unchanged password permitted recovery confirmation');
 result=await edge({action:'resolved',request_id:requestId,token_hash:tokenHash},{token:outsider.token});
 assert.equal(result.status,409,'Another user may not close recovery');
 result=await edge({action:'resolved',request_id:requestId,token_hash:'wrong-proof-'+randomUUID()},{token:accountSession});
 assert.equal(result.status,409,'Incorrect recovery proof accepted');
 console.log('stage27-deno-prechange-and-impostor-denied-PASS');

 const verified=await required('/auth/v1/verify',{body:{type:'recovery',token_hash:tokenHash}});
 assert.equal(verified.user?.id,account.id);
 assert.ok(verified.access_token);
 const reused=await api('/auth/v1/verify',{body:{type:'recovery',token_hash:tokenHash}});
 assert.equal(reused.ok,false,'Recovery token was reusable');
 const after='Synthetic-Stage27-After!'+randomUUID();
 await required('/auth/v1/user',{method:'PUT',token:verified.access_token,body:{password:after}});
 assert.equal(sql(`SELECT CASE WHEN password_changed_verified_at IS NOT NULL AND
  resolved_at IS NULL THEN 'auth_notified' ELSE 'invalid' END
  FROM public.password_reset_requests WHERE id='${requestId}'::uuid`),'auth_notified');
 console.log('stage27-deno-real-gotrue-verify-update-PASS');

 result=await edge({action:'resolved',request_id:requestId,token_hash:tokenHash},
  {token:verified.access_token});
 assert.equal(result.status,200,redacted('Edge finalization '+result.status));
 assert.equal(result.data?.verified,true);
 assert.equal(result.data?.notification_status,'sent');
 assert.equal(inbox.length,2,'Expected one completion notification');
 assert.equal(sql(`SELECT CASE WHEN resolved_at IS NOT NULL AND
  confirmation_notification_status='sent' THEN 'confirmed' ELSE 'invalid' END
  FROM public.password_reset_requests WHERE id='${requestId}'::uuid`),'confirmed');
 result=await edge({action:'resolved',request_id:requestId,token_hash:tokenHash},
  {token:verified.access_token});
 assert.equal(result.status,200);
 assert.equal(result.data?.already_acknowledged,true);
 assert.equal(inbox.length,2,'Duplicate confirmation email');
 console.log('stage27-deno-real-resolution-single-notification-PASS');

 const oldLogin=await api('/auth/v1/token?grant_type=password',
  {body:{email:account.email,password:account.password}});
 assert.equal(oldLogin.ok,false);
 const newLogin=await required('/auth/v1/token?grant_type=password',
  {body:{email:account.email,password:after}});
 assert.equal(newLogin.user?.id,account.id);
 sql(`UPDATE public.profiles SET account_enabled=false WHERE id='${account.id}'::uuid`);
 result=await edge({action:'resolved',request_id:requestId,token_hash:tokenHash},
  {token:newLogin.access_token});
 assert.equal(result.status,401,'Inactive account accepted a completed operation');
 console.log('stage27-deno-fresh-login-and-revoked-denied-PASS');

 assert.deepEqual(failures,[]);
 console.log('stage27-deno-real-handler-local-auth-complete');
}
main().catch(e=>{console.error('stage27 Deno integration failed:',redacted(e.message));process.exitCode=1;})
 .finally(cleanup);

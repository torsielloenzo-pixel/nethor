'use strict';
// Stage 22 - actual locally issued Supabase Auth JWTs.
// CI isolation guard: NEVER connect this test to a non-loopback Supabase instance.
// No environment variables or tokens are printed.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');

const base=process.env.API_URL||'';
const dbUrl=process.env.DB_URL||'';
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY||'';
const service=process.env.SERVICE_ROLE_KEY||'';
function isLocal(raw){
 try{
  const u=new URL(raw);
  return ['127.0.0.1','localhost','[::1]'].includes(u.hostname);
 }catch{return false}
}
assert.equal(process.env.STAGE22_LOCAL_AUTH,'1','Missing explicit isolation marker');
assert.ok(isLocal(base)&&isLocal(dbUrl),'Refusing to access a non-loopback Supabase instance');
assert.ok(anon&&service,'Local Supabase keys missing');

function sql(text){
 if(!/^[\s\S]*$/.test(text))throw Error('Invalid SQL');
 return execFileSync('psql',[dbUrl,'-X','-v','ON_ERROR_STOP=1','-A','-t','-c',text],{
  encoding:'utf8',env:process.env,stdio:['ignore','pipe','pipe']
 }).trim();
}
function uuid(value){
 assert.match(String(value||''),/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 return value;
}
async function call(url,{method='POST',key=anon,token=key,body={}}={}){
 const response=await fetch(base+url,{
  method,
  headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:method==='GET'?undefined:JSON.stringify(body)
 });
 const text=await response.text();
 let result;
 try{result=JSON.parse(text)}catch{result={message:text.slice(0,180)}}
 if(!response.ok)throw Error('Local Supabase '+method+' '+url+' HTTP '+response.status+': '+String(result.msg||result.message||result.error||'unknown').slice(0,180));
 return result;
}
function sessionId(accessToken){
 const segments=accessToken.split('.');
 assert.equal(segments.length,3,'Expected real signed access JWT');
 const claims=JSON.parse(Buffer.from(segments[1],'base64url').toString('utf8'));
 return uuid(claims.session_id);
}
async function register(role,password){
 const email='nethor-stage22-'+randomUUID()+'@example.test';
 const user=await call('/auth/v1/admin/users',{key:service,body:{email,password,email_confirm:true}});
 const id=uuid(user.id);
 sql(`INSERT INTO public.profiles(id,display_name,role,planning_name)
      VALUES ('${id}'::uuid,'Compte fictif ${role}','${role}',${role==='admin'?'NULL':"'EMPLOYE TEST'"});`);
 const logged=await call('/auth/v1/token?grant_type=password',{body:{email,password}});
 assert.equal(uuid(logged.user?.id),id,'Supabase Auth login returned the wrong user');
 return {id,email,accessToken:logged.access_token,sessionId:sessionId(logged.access_token)};
}
async function probe(token){
 const reply=await call('/rest/v1/rpc/stage22_auth_probe',{token});
 assert.equal(typeof reply?.session_active,'boolean','Unexpected RPC gate response');
 return reply;
}
async function main(){
 const employee=await register('employe','Nethor_Stage22!_Example123');
 const manager=await register('admin','Nethor_Stage22!_Example456');
 sql(`INSERT INTO public.user_subroles(user_id,subrole_key) VALUES ('${employee.id}','reader');`);
 const initial=await probe(employee.accessToken);
 assert.equal(initial.session_active,true,'Authentic local Auth session rejected');
 assert.equal(initial.visible_team,1,'Published operational member missing');
 assert.equal(initial.subrole_keys,1,'Staged subrole RPC not exposed');
 console.log('stage22-auth-real-jwt-active-PASS');

 const adminAccess=await probe(manager.accessToken);
 assert.equal(adminAccess.session_active,true,'Admin session rejected');
 assert.equal(adminAccess.visible_team,1,'No unnamed admin should appear in operational team');
 console.log('stage22-auth-real-jwt-admin-PASS');

 sql(`UPDATE public.profiles SET account_enabled=false WHERE id='${employee.id}'::uuid;`);
 let r=await probe(employee.accessToken);
 assert.equal(r.session_active,false,'Disabled account retained active session');
 assert.equal(r.visible_team,0,'Disabled account sees team via staged SECURITY DEFINER function');
 assert.equal(r.subrole_keys,0,'Disabled account sees subroles');
 sql(`UPDATE public.profiles SET account_enabled=true WHERE id='${employee.id}'::uuid;`);
 assert.equal((await probe(employee.accessToken)).session_active,true);
 console.log('stage22-auth-real-jwt-disabled-PASS');

 sql(`UPDATE public.profiles SET sessions_valid_after=now()+interval '1 minute' WHERE id='${employee.id}'::uuid;`);
 r=await probe(employee.accessToken);
 assert.equal(r.session_active,false,'Revocation cutoff ignored for real JWT');
 sql(`UPDATE public.profiles SET sessions_valid_after='2025-01-01 00:00:00+00' WHERE id='${employee.id}'::uuid;`);
 assert.equal((await probe(employee.accessToken)).session_active,true);
 console.log('stage22-auth-real-jwt-cutoff-PASS');

 sql(`DELETE FROM auth.sessions WHERE id='${employee.sessionId}'::uuid;`);
 r=await probe(employee.accessToken);
 assert.equal(r.session_active,false,'Signed JWT still authorized after removal of session');
 assert.equal(r.visible_team,0,'Revoked JWT sees operational profiles');
 assert.equal(r.subrole_keys,0,'Revoked JWT sees assigned privileges');
 console.log('stage22-auth-real-jwt-revoked-PASS');

 // The admin has a separate still-active Auth session and must remain unaffected.
 assert.equal((await probe(manager.accessToken)).session_active,true);
 const resetId=uuid(randomUUID());
 sql(`INSERT INTO public.password_reset_requests(id,user_id,requested_at,email_status,reset_channel)
  VALUES ('${resetId}'::uuid,'${manager.id}'::uuid,now(),'sent','email');`);
 await call('/auth/v1/user',{method:'PUT',token:manager.accessToken,body:{password:'Nethor_Stage22!_Changed789'}});
 const outcome=sql(`SELECT CASE WHEN password_changed_verified_at IS NOT NULL
     AND resolved_at=password_changed_verified_at THEN 'verified' ELSE 'missing' END
     FROM public.password_reset_requests WHERE id='${resetId}'::uuid;`);
 assert.equal(outcome,'verified','Real GoTrue password update did not trigger Nethor password-change evidence');
 console.log('stage22-auth-real-password-change-PASS');

 console.log('stage22-isolated-supabase-auth-complete');
}
main().catch(error=>{console.error('stage22 local Auth integration failed:',error.message);process.exitCode=1});

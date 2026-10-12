'use strict';
// Stage23: five signed GoTrue users, real PostgREST calls and synthetic planning.
// NEVER connect to a hosted Supabase project or import production employee data.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');

const api=process.env.API_URL||'';
const dbUrl=process.env.DB_URL||'';
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY||'';
const service=process.env.SERVICE_ROLE_KEY||'';
function loopback(value){
 try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(value).hostname)}catch{return false}
}
assert.equal(process.env.STAGE22_LOCAL_AUTH,'1','Stage23 must run inside isolated Supabase');
assert.ok(loopback(api)&&loopback(dbUrl),'Refusing remote Supabase URL');
assert.ok(anon&&service,'Only local generated keys are allowed');
const roles=[
 {role:'admin',rank:500,managePlanning:true,manageChat:true},
 {role:'role_point-de-vente',rank:400,managePlanning:true,manageChat:false},
 {role:'responsable',rank:300,managePlanning:false,manageChat:false},
 {role:'employe',rank:200,managePlanning:false,manageChat:false},
 {role:'lecture',rank:100,managePlanning:false,manageChat:false}
];
function uuid(value){
 assert.match(String(value||''),/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);return value;
}
function sql(query){
 return execFileSync('psql',[dbUrl,'-X','-v','ON_ERROR_STOP=1','-A','-t','-c',query],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
async function request(endpoint,{method='POST',key=anon,token=key,body,headers={}}={}){
 const response=await fetch(api+endpoint,{
  method,
  headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',...headers},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const raw=await response.text();
 let data;try{data=JSON.parse(raw)}catch{data={message:raw.slice(0,200)}}
 return{ok:response.ok,status:response.status,data};
}
async function success(endpoint,options){
 const r=await request(endpoint,options);
 assert.ok(r.ok,'Local Auth/PostgREST '+endpoint+' HTTP '+r.status+': '+String(r.data?.message||r.data?.error||'unknown').slice(0,130));
 return r.data;
}
async function register(def){
 const password='Synthetic-Stage23-Test!'+randomUUID().slice(0,12);
 const email='stage23-'+randomUUID()+'@example.test';
 const user=await success('/auth/v1/admin/users',{key:service,body:{email,password,email_confirm:true}});
 const uid=uuid(user.id);
 sql(`INSERT INTO public.profiles(id,display_name,role,planning_name)
      VALUES('${uid}'::uuid,'Synthetic ${def.role}','${def.role}',${def.role==='admin'?'NULL':"'SYNTHETIC NAME'"});`);
 const session=await success('/auth/v1/token?grant_type=password',{body:{email,password}});
 assert.equal(uuid(session.user.id),uid);
 return{...def,uid,token:session.access_token};
}
const weekStart='2026-10-12';
function weekData(label){return{version:4,weekStart,employees:[{name:'SYNTHETIC NAME'}],days:{'2026-10-12':[]},fixture:label}}
async function saveWeek(user,label,revision=null){
 return success('/rest/v1/rpc/planning_save_week_if_revision',{
  token:user.token,
  body:{p_week_start:weekStart,p_expected_revision:revision,
   p_data:weekData(label),p_employee_order:['SYNTHETIC NAME'],
   p_week_label:'TEST ISOLÉ',p_source_file:'synthetic-no-file',
   p_source_path:null,p_imported_at:null}
 });
}
async function readWeek(user){
 const rows=await success('/rest/v1/planning_weeks?select=week_start,data,updated_at&week_start=eq.'+weekStart,{method:'GET',token:user.token});
 assert.ok(Array.isArray(rows));
 return rows;
}
async function main(){
 const users=[];
 for(const role of roles)users.push(await register(role));
 console.log('stage23-five-real-go-true-roles-PASS');
 const teamCounts=[];
 for(const user of users){
  const p=await success('/rest/v1/rpc/stage23_role_probe',{token:user.token});
  assert.equal(p.session_active,true,'Session missing: '+user.role);
  assert.equal(p.role,user.role,'Mismatch server-side role');
  assert.equal(p.role_rank,user.rank,'Role ranking mismatch');
  assert.equal(p.planning_view,true,'Role denied planning view '+user.role);
  assert.equal(p.planning_manage,user.managePlanning,'Wrong planning management '+user.role);
  assert.equal(p.chat_view,true,'Role denied chat view '+user.role);
  assert.equal(p.chat_manage,user.manageChat,'Wrong chat management '+user.role);
  assert.ok(Number.isInteger(p.team_count)&&p.team_count>=4,'Missing shared team');
  teamCounts.push(p.team_count);
 }
 assert.equal(new Set(teamCounts).size,1,'Different visible operational team across enabled roles');
 console.log('stage23-role-permission-matrix-PASS');

 const [admin,pdv,responsable,employee,reader]=users;
 const created=await saveWeek(admin,'PLANNING_V1');
 assert.equal(created.status,'ok','Administrator did not save synthetic schedule');
 const original=await readWeek(pdv);
 assert.equal(original.length,1,'Point de vente cannot read synthetic week');
 assert.equal(original[0].data.fixture,'PLANNING_V1');
 const updated=await saveWeek(pdv,'PLANNING_V2',original[0].updated_at);
 assert.equal(updated.status,'ok','Point de vente cannot modify synthetic schedule');
 const snapshots=[];
 for(const user of users){
  const rows=await readWeek(user);
  assert.equal(rows.length,1,'Role cannot read the same week: '+user.role);
  assert.equal(rows[0].data.fixture,'PLANNING_V2','Inconsistent week by role '+user.role);
  snapshots.push(JSON.stringify(rows[0].data));
 }
 assert.equal(new Set(snapshots).size,1,'Desktop/mobile-equivalent API planning payload diverges');
 console.log('stage23-shared-synthetic-week-five-roles-PASS');

 for(const user of [responsable,employee,reader]){
  const denied=await saveWeek(user,'UNAUTHORIZED_'+user.role,original[0].updated_at);
  assert.equal(denied.status,'forbidden','Role modified planning week: '+user.role);
  const raw=await request('/rest/v1/planning_weeks',{
   token:user.token,body:{week_start:'2026-10-19',data:weekData('DIRECT_BYPASS')},
   headers:{Prefer:'return=representation'}
  });
  assert.equal(raw.ok,false,'Unauthorized direct table write was accepted');
 }
 assert.equal((await readWeek(admin))[0].data.fixture,'PLANNING_V2','Unauthorized write changed schedule');
 console.log('stage23-write-permissions-five-roles-PASS');

 sql(`UPDATE public.profiles SET account_enabled=false WHERE id='${reader.uid}'::uuid;`);
 const blocked=await success('/rest/v1/rpc/stage23_role_probe',{token:reader.token});
 assert.equal(blocked.session_active,false);
 assert.equal(blocked.planning_view,false);
 assert.equal(blocked.planning_manage,false);
 assert.equal(blocked.team_count,0);
 assert.equal((await readWeek(reader)).length,0,'Disabled account can read a week through RLS');
 assert.equal((await saveWeek(reader,'DISABLED')).status,'forbidden');
 assert.equal((await readWeek(admin))[0].data.fixture,'PLANNING_V2');
 console.log('stage23-disabled-role-rls-and-rpc-PASS');
 console.log('stage23-local-five-role-planning-complete');
}
main().catch(e=>{console.error('stage23 local role integration failed:',e.message);process.exitCode=1});

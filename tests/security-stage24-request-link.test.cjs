'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const source=fs.readFileSync(path.join(__dirname,'..','docs/security/edge-functions/password-recovery-email/index.ts'),'utf8');
const start=source.indexOf('    if (action !== "request") return json(');
const end=source.indexOf('\n  } catch (e) {',start);
assert.ok(start>=0&&end>start,'Expected staged request branch');
const branch=source.slice(start,end);
const runRequest=new AsyncFunction('body','admin','Deno','crypto','findProfile','validBaseUrl','sendMail','safe','genericOk','fetch','url','json',`
 const action="request";
 ${branch}
`);
const requestId='123e4567-e89b-42d3-a456-426614174000';
const token='synthetic-hashed-recovery-token-for-email-only';
const digest=createHash('sha256').update(token).digest('hex');
function harness({pendingCreated=true,mailOk=true,updateFails=false}={}){
 const calls=[],inserted=[],updates=[],sent=[];
 const profile={id:'fake-account',display_name:'Employé Fictif',email:'fake@stock-fl.local'};
 let mode='lookup';
 const admin={
  from(table){
   const filters=[];
   calls.push('from:'+table);
   mode='lookup';
   const chain={
    select(){return this},
    eq(col,value){filters.push([col,value]);return this},
    gte(){return this},order(){return this},limit(){return this},
    insert(row){
     calls.push('insert:'+table);
     if(table==='password_reset_requests'){
      inserted.push(row);
      mode='created';
     }else mode='audit';
     return this;
    },
    update(patch){calls.push('update:'+table);updates.push({table,patch});mode='update';return this},
    maybeSingle(){
     if(table==='password_reset_requests')return Promise.resolve({data:null});
     if(table==='user_recovery_emails')return Promise.resolve({data:{email:'fake@example.test'}});
     if(table==='app_settings')return Promise.resolve({data:{value:{url:'https://nethor.example.test/'}}});
     return Promise.resolve({data:null});
    },
    single(){
     if(table==='password_reset_requests'&&mode==='created')
      return Promise.resolve({data:pendingCreated?{id:requestId}:null,error:pendingCreated?null:{message:'insert failed'}});
     return Promise.resolve({data:null,error:null});
    },
    then(resolve,reject){
     return Promise.resolve({data:null,error:mode==='update'&&updateFails?{message:'update failed'}:null}).then(resolve,reject)
    }
   };return chain;
  },
  auth:{admin:{generateLink:async()=>{
   calls.push('generateLink');
   return{data:{properties:{hashed_token:token}},error:null};
  }}}
 };
 const Deno={env:{get:key=>key==='RESEND_API_KEY'?'synthetic-key':null}};
 const findProfile=async()=>({profile,username:'fake'});
 const validBaseUrl=value=>value;
 const sendMail=async(...args)=>{calls.push('sendMail');sent.push(args);return{ok:mailOk,id:'fake-mail',reason:'synthetic failure'}};
 const safe=s=>String(s);
 const genericOk=()=>({status:200,body:{success:true}});
 const fetch=async()=>{calls.push('fallback');return{ok:true}};
 const json=(body,status=200)=>({body,status});
 return{calls,inserted,updates,sent,run:()=>runRequest({action:'request',identifier:'fake'},admin,Deno,webcrypto,findProfile,validBaseUrl,sendMail,safe,genericOk,fetch,'http://127.0.0.1',json)}
}
test('stage24: emailed recovery link contains request id and Auth token, but DB stores digest only',async()=>{
 const h=harness();const response=await h.run();
 assert.equal(response.status,200);
 assert.equal(h.inserted.length,1);
 assert.equal(h.inserted[0].email_status,'pending');
 assert.equal(h.inserted[0].recovery_proof_digest,digest);
 assert.equal(JSON.stringify(h.inserted).includes(token),false,'Never store raw token');
 assert.equal(h.sent.length,1);
 const linkText=h.sent[0][3];
 assert.ok(linkText.includes('request_id='+requestId));
 assert.ok(linkText.includes('token_hash='+token));
 assert.ok(h.calls.indexOf('insert:password_reset_requests')<h.calls.indexOf('sendMail'));
 assert.ok(h.updates.some(x=>x.patch.email_status==='sent'));
});
test('stage24: failed request tracking never sends an untracked recovery link',async()=>{
 const h=harness({pendingCreated:false});const result=await h.run();
 assert.equal(result.status,200);
 assert.equal(h.sent.length,0);
 assert.equal(h.calls.includes('fallback'),true);
});
test('stage24: failed delivery is marked failed, not sent',async()=>{
 const h=harness({mailOk:false});const result=await h.run();
 assert.equal(result.status,200);
 assert.equal(h.updates.some(x=>x.patch.email_status==='sent'),false);
 assert.ok(h.updates.some(x=>x.patch.email_status==='failed'));
 assert.ok(h.calls.includes('fallback'));
});

'use strict';
// Phase 6 — smoke de préproduction des modules refondus.
// Tous les appels externes sont bloqués. Supabase est remplacé par un client synthétique.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');

const engine=process.env.STAGE23_BROWSER||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'Unsupported browser');
const origin='http://127.0.0.1:8765';
const output=path.resolve(process.env.STAGE23_SCREENSHOT_DIR||'stage23-screenshots');
fs.mkdirSync(output,{recursive:true});

const fakeSupabase=`
(()=>{
 const user={id:'qa-user-0001',email:'qa@nethor.test'};
 const session={access_token:'qa-token',user};
 const profile={id:user.id,display_name:'Utilisateur QA',planning_name:'QA',role:'admin',
  avatar_path:null,avatar_frame:null,profile_color:'#315f97',ui_preferences:{theme:'light'},account_enabled:true};
 const members=[
  {...profile},
  {id:'qa-user-0002',display_name:'Responsable QA',planning_name:'RESP QA',role:'responsable',avatar_path:null,avatar_frame:null,account_enabled:true},
  {id:'qa-user-0003',display_name:'Employé QA',planning_name:'EMP QA',role:'employe',avatar_path:null,avatar_frame:null,account_enabled:true}
 ];
 function tableData(table){
  if(table==='profiles')return[profile];
  if(table==='app_settings')return[{key:'site_config',value:{}}];
  return[];
 }
 function singleData(table){
  if(table==='profiles')return profile;
  if(table==='app_settings')return{key:'site_config',value:{}};
  return null;
 }
 function query(table){
  let q;
  q=new Proxy({},{
   get(_target,prop){
    if(prop==='then')return(resolve,reject)=>Promise.resolve({data:tableData(table),error:null,count:tableData(table).length}).then(resolve,reject);
    if(prop==='catch')return reject=>Promise.resolve({data:tableData(table),error:null}).catch(reject);
    if(prop==='maybeSingle'||prop==='single')return async()=>({data:singleData(table),error:null});
    return()=>q;
   }
  });
  return q;
 }
 function rpc(name){
  if(name==='nethor_security_context')return Promise.resolve({data:{session_active:true,role:'admin',account_enabled:true},error:null});
  if(name==='list_team_members')return Promise.resolve({data:members,error:null});
  if(name==='my_subrole_permissions'||name==='my_subrole_keys')return Promise.resolve({data:[],error:null});
  return Promise.resolve({data:[],error:null});
 }
 window.supabase={createClient(){
  return{
   auth:{
    getSession:async()=>({data:{session},error:null}),
    getUser:async()=>({data:{user},error:null}),
    onAuthStateChange:cb=>{setTimeout(()=>cb('INITIAL_SESSION',session),0);return{data:{subscription:{unsubscribe(){}}}}},
    signOut:async()=>({error:null}),updateUser:async()=>({data:{user},error:null})
   },
   rpc,from:table=>query(table),
   storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:null},error:null})})},
   functions:{invoke:async()=>({data:{verified:true},error:null})},
   channel:()=>({on(){return this},subscribe(){return this}}),
   removeChannel:()=>{}
  };
 }};
})();
`;

const targets=[
 {file:'team.html',selector:'.teamShell'},
 {file:'promotions.html',selector:'.promoPage'},
 {file:'articles.html',selector:'main'},
 {file:'report-problem.html',selector:'main'}
];
const viewports=[
 {key:'mobile-390',width:390,height:844,platform:'mobile',mobile:true},
 {key:'desktop-1024',width:1024,height:768,platform:'desktop',mobile:false},
 {key:'desktop-1440',width:1440,height:900,platform:'desktop',mobile:false}
];

async function main(){
 const browser=await playwright[engine].launch(engine==='chromium'?{headless:true,args:['--no-sandbox']}:{headless:true});
 try{
  for(const v of viewports){
   const context=await browser.newContext({
    viewport:{width:v.width,height:v.height},isMobile:v.mobile,hasTouch:v.mobile,deviceScaleFactor:1,
    userAgent:v.mobile?
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1':
      (engine==='webkit'?'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15':
       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')
   });
   await context.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin+'/'))return route.continue();
    if(/\/supabase\.min\.js(?:\?|$)/.test(url))return route.fulfill({status:200,contentType:'application/javascript',body:fakeSupabase});
    return route.abort('blockedbyclient');
   });
   for(const target of targets){
    const page=await context.newPage();
    const url=origin+'/'+target.file+'?nethor_platform='+v.platform;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator(target.selector).first().waitFor({state:'visible',timeout:12000});
    await page.waitForFunction(expected=>document.documentElement.dataset.nethorPageLayout===expected,v.platform,{timeout:3500}).catch(()=>{});
    const state=await page.evaluate(selector=>{
      const node=document.querySelector(selector);
      const r=node?.getBoundingClientRect();
      return{
       url:location.pathname+location.search,
       layout:document.documentElement.dataset.nethorPageLayout||'',
       platform:document.documentElement.dataset.nethorPlatform||'',
       pageId:document.documentElement.dataset.nethorPageId||'',
       shellReady:!!(window.NethorDesktopShell||window.NethorMobileShell),
       layoutApiReady:!!window.NethorPageLayout,
       scrollWidth:document.documentElement.scrollWidth,
       viewport:innerWidth,
       found:!!node,
       visible:!!r&&r.width>0&&r.height>0,
       left:r?.left??0,right:r?.right??0
      };
    },target.selector);
    assert.equal(state.found,true,'Module absent '+target.file+' '+v.key);
    assert.equal(state.visible,true,'Module invisible '+target.file+' '+v.key);
    assert.equal(state.layout,v.platform,'Mauvais layout '+target.file+' '+v.key+' '+JSON.stringify(state));
    assert.ok(state.scrollWidth<=v.width+5,'Débordement horizontal '+target.file+' '+v.key+' '+state.scrollWidth+'/'+v.width);
    assert.ok(state.left>=-5,'Module coupé à gauche '+target.file+' '+v.key);
    await page.screenshot({
      path:path.join(output,'phase6-'+engine+'-'+v.key+'-'+target.file.replace('.html','')+'.png'),
      fullPage:true,animations:'disabled'
    });
    console.log('phase6-'+engine+'-'+v.key+'-'+target.file+'-PASS');
    await page.close();
   }
   await context.close();
  }
 }finally{await browser.close()}
 console.log('phase6-'+engine+'-professional-smoke-complete');
}
main().catch(e=>{console.error('phase6 professional smoke failed:',e.message);process.exitCode=1});

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
 {file:'report-problem.html',selector:'main',mobilePath:'mobile.html?view=report-problem&nethor_platform=mobile',mobileSelector:'.nethorReportView',mobileView:'report-problem'},
 {file:'profile.html',selector:'.profileDesktopLayout',mobilePath:'mobile.html?view=profile&nethor_platform=mobile',mobileSelector:'.nethorProfileView',mobileView:'profile'},
 {file:'settings.html',selector:'.settingsDesktopLayout',mobilePath:'mobile.html?view=settings&nethor_platform=mobile',mobileSelector:'.nethorSettingsView',mobileView:'settings'},
 {file:'notifications.html',selector:'.notificationsPageMain',mobilePath:'mobile.html?view=notifications&nethor_platform=mobile',mobileSelector:'.nethorNotificationsView',mobileView:'notifications'},
 {file:'notification-settings.html',selector:'.notificationSettingsDesktopLayout',mobilePath:'mobile.html?view=notification-settings&nethor_platform=mobile',mobileSelector:'.nethorNotificationSettingsView',mobileView:'notification-settings'}
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
    viewport:{width:v.width,height:v.height},isMobile:v.mobile,hasTouch:v.mobile,deviceScaleFactor:1,serviceWorkers:'block',
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
    await page.addInitScript(()=>{try{localStorage.clear();sessionStorage.clear()}catch(_){}});
    const spaMobile=!!(v.mobile&&target.mobilePath);
    const url=spaMobile?origin+'/'+target.mobilePath:origin+'/'+target.file+'?nethor_platform='+v.platform;
    const selector=spaMobile?(target.mobileSelector||target.selector):target.selector;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator(selector).first().waitFor({state:'visible',timeout:12000});
    if(spaMobile){
      await page.waitForFunction(expected=>document.querySelector('[data-mobile-view-host]')?.getAttribute('data-mobile-view')===expected,target.mobileView,{timeout:5000});
    }else{
      await page.waitForFunction(expected=>document.documentElement.dataset.nethorPageLayout===expected,v.platform,{timeout:3500}).catch(()=>{});
    }
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
       mobileView:document.querySelector('[data-mobile-view-host]')?.getAttribute('data-mobile-view')||'',
       mobileShell:!!document.querySelector('[data-mobile-app-shell]'),
       overflowing:[...document.querySelectorAll('body *')].map(el=>{
        const x=el.getBoundingClientRect(),cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||x.width<=0||x.height<=0)return null;
        if(x.right<=innerWidth+2&&x.left>=-2)return null;
        return{tag:el.tagName,id:el.id||'',cls:String(el.className||'').slice(0,120),left:Math.round(x.left),right:Math.round(x.right),width:Math.round(x.width),position:cs.position,overflowX:cs.overflowX}
       }).filter(Boolean).slice(0,12),
       scrollWidth:document.documentElement.scrollWidth,
       viewport:innerWidth,
       found:!!node,
       visible:!!r&&r.width>0&&r.height>0,
       left:r?.left??0,right:r?.right??0
      };
    },selector);
    assert.equal(state.found,true,'Module absent '+target.file+' '+v.key);
    assert.equal(state.visible,true,'Module invisible '+target.file+' '+v.key);
    if(spaMobile){
      assert.equal(state.platform,'mobile','Plateforme SPA incorrecte '+target.file+' '+v.key+' '+JSON.stringify(state));
      assert.equal(state.mobileShell,true,'Shell mobile absent '+target.file+' '+v.key+' '+JSON.stringify(state));
      assert.equal(state.mobileView,target.mobileView,'Vue SPA incorrecte '+target.file+' '+v.key+' '+JSON.stringify(state));
      assert.ok(state.url.startsWith('/mobile.html?')&&new URL(origin+state.url).searchParams.get('view')===target.mobileView,'Route SPA incorrecte '+JSON.stringify(state));
    }else{
      assert.equal(state.layout,v.platform,'Mauvais layout '+target.file+' '+v.key+' '+JSON.stringify(state));
    }
    assert.ok(state.scrollWidth<=v.width+5,'Débordement horizontal '+target.file+' '+v.key+' '+state.scrollWidth+'/'+v.width+' '+JSON.stringify(state.overflowing));
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

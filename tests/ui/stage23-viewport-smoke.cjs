'use strict';
// Browser viewport smoke test (Chromium only): mobile-shaped and desktop-sized
// viewports. Does NOT claim to be a physical iPhone, Safari or an installed PWA.
// All external requests are mocked or blocked; real Supabase is NEVER called.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');

const origin='http://127.0.0.1:8765';
const output=path.resolve(process.env.STAGE23_SCREENSHOT_DIR||'stage23-screenshots');
fs.mkdirSync(output,{recursive:true});

const fakeSupabase=`
window.supabase={createClient(){
 const query={select(){return this},eq(){return this},gte(){return this},
   order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),
   single:async()=>({data:null,error:null})};
 return{
  auth:{
    getSession:async()=>({data:{session:null},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    verifyOtp:async()=>({data:{session:{user:{id:'fake-test-user'}}},error:null}),
    signOut:async()=>({error:null}),
    updateUser:async()=>({error:null})
  },
  functions:{invoke:async()=>({data:{verified:true},error:null})},
  rpc:async()=>({data:{},error:null}),
  from:()=>query,channel:()=>({on(){return this},subscribe(){return this}}),
  removeChannel:()=>{}
 };
}};
`;

async function main(){
 const browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox']});
 const viewports=[
  {key:'mobile-375',width:375,height:812,platform:'mobile',mobile:true},
  {key:'mobile-390',width:390,height:844,platform:'mobile',mobile:true},
  {key:'desktop-1024',width:1024,height:768,platform:'desktop',mobile:false},
  {key:'desktop-1440',width:1440,height:900,platform:'desktop',mobile:false}
 ];
 try{
  for(const v of viewports){
   const context=await browser.newContext({
    viewport:{width:v.width,height:v.height},
    isMobile:v.mobile,
    hasTouch:v.mobile,
    deviceScaleFactor:1,
    userAgent:v.mobile?
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
   });
   await context.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin+'/'))return route.continue();
    if(/\/supabase\.min\.js(?:\?|$)/.test(url)){
      return route.fulfill({status:200,contentType:'application/javascript',body:fakeSupabase});
    }
    // No production API, third-party CDN, analytics, or external requests.
    return route.abort('blockedbyclient');
   });
   const page=await context.newPage();
   await page.goto(origin+'/index.html?nethor_platform='+v.platform,{waitUntil:'domcontentloaded'});
   await page.locator('#login').waitFor({state:'visible',timeout:15000});
   const login=await page.evaluate(()=>{
    const form=document.querySelector('#login form.loginCard');
    if(!form)return{found:false};
    const r=form.getBoundingClientRect();
    return{found:true,platform:document.documentElement.dataset.nethorLoginLayout,
      formWidth:r.width,formX:r.x,scrollWidth:document.documentElement.scrollWidth,
      viewport:innerWidth,visible:r.width>0&&r.height>0};
   });
   assert.equal(login.found,true,'Login form absent '+v.key);
   assert.equal(login.platform,v.platform,'Wrong platform layout '+v.key);
   assert.equal(login.visible,true,'Login hidden '+v.key);
   assert.ok(login.formWidth<=v.width+2,'Login form wider than viewport '+v.key);
   assert.ok(login.formX>=-2,'Login form cut off at left '+v.key);
   assert.ok(login.formX+login.formWidth<=v.width+2,'Login form cut off at right '+v.key);
   assert.ok(login.scrollWidth<=v.width+3,'Horizontal overflow on login '+v.key);
   await page.screenshot({path:path.join(output,v.key+'-login.png'),fullPage:true,animations:'disabled'});
   console.log('stage23-viewport-login-'+v.key+'-PASS');

   await page.goto(origin+'/reset-password.html?token_hash=synthetic-only&type=recovery',{waitUntil:'domcontentloaded'});
   await page.locator('#resetForm').waitFor({state:'visible',timeout:12000});
   const reset=await page.evaluate(()=>{
    const form=document.querySelector('#resetForm'),r=form.getBoundingClientRect();
    return{width:r.width,x:r.x,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.ok(reset.width>0&&reset.width<=v.width+2,'Reset form width invalid '+v.key);
   assert.ok(reset.x>=-2&&reset.x+reset.width<=v.width+2,'Reset form clipped '+v.key);
   assert.ok(reset.scrollWidth<=v.width+3,'Horizontal overflow on reset '+v.key);
   await page.locator('#newPassword').fill('synthetic-good-password');
   await page.locator('#confirmPassword').fill('synthetic-mismatch');
   await page.locator('#saveBtn').click();
   await page.locator('#state.err').waitFor({state:'visible'});
   assert.match(await page.locator('#state').innerText(),/confirmation ne correspond pas/i);
   await page.screenshot({path:path.join(output,v.key+'-reset.png'),fullPage:true,animations:'disabled'});
   console.log('stage23-viewport-recovery-'+v.key+'-PASS');
   await context.close();
  }
 }finally{await browser.close()}
 console.log('stage23-chromium-viewport-smoke-complete');
}
main().catch(e=>{console.error('stage23 viewport smoke failed:',e.message);process.exitCode=1});

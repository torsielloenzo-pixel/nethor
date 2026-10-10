'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
const mobile=read('ui/mobile/mobile-app.js');
const html=read('mobile.html');
const auth=read('auth/auth-login.js');

function store(){
 const contents=new Map();
 return {getItem:key=>contents.get(key)||null,setItem:(key,value)=>contents.set(key,String(value)),removeItem:key=>contents.delete(key),contains:key=>contents.has(key)};
}
function snippet(source,name){
 const match=source.match(new RegExp('function '+name+'\\(\\)\\{[\\s\\S]*?\\n\\}'));
 assert.ok(match,'Fonction introuvable : '+name);
 return match[0]
}
test('Mobile : aucun splash ni média d’ouverture avant la vérification de la session',()=>{
 assert.match(html,/<section class="nethorMobileLaunchWelcome" data-mobile-launch-welcome aria-live="polite" aria-hidden="true">/);
 assert.match(html,/document\.documentElement\.dataset\.nethorLaunchSplash='skip'/);
 assert.doesNotMatch(html,/var raw=JSON\.parse\(localStorage\.getItem\('nethorMobileLaunchBrandV1'/);
 assert.doesNotMatch(html,/welcome-animation-host\.html\?v=5/);
 const boot=mobile.slice(mobile.indexOf('async function boot(){'),mobile.indexOf('window.NethorMobileApp='));
 const serviceAt=boot.indexOf('const serviceState=await bootServices()');
 const prepareAt=boot.indexOf('prepareMobileLaunchWelcome()');
 assert.ok(serviceAt>0&&prepareAt>serviceAt,'L’animation ne doit démarrer qu’après la session');
 assert.match(boot,/if\(services\(\)\?\.status==='signed-out'\)\{\s*skipMobileLaunchWelcome\(\);\s*return/);
 assert.match(boot,/const verifiedSession=Boolean\(services\(\)\?\.session\?\.user\?\.id/);
 assert.match(boot,/verifiedSession&&!skipOpeningAfterLogin\?prepareMobileLaunchWelcome\(\):null/);
 assert.match(boot,/if\(launchStarted!==null\)renderMobileLaunchWelcome/);
});
test('Mobile : après connexion, consigne ignorée une seule fois puis lancement normal',()=>{
 const st=store(),now=Date.now();
 st.setItem('nethorMobileSkipOpeningOnceV1',now);
 st.setItem('nethorMobileLaunchShownV1','1');
 const ctx={sessionStorage:st,MOBILE_LOGIN_HANDOFF_KEY:'nethorMobileSkipOpeningOnceV1',MOBILE_LOGIN_HANDOFF_MAX_AGE_MS:600000,Date};
 const run=()=>vm.runInNewContext(snippet(mobile,'consumeMobileLoginHandoff')+';consumeMobileLoginHandoff()',ctx);
 assert.equal(run(),true);
 assert.equal(st.contains('nethorMobileLaunchShownV1'),false);
 assert.equal(run(),false,'Le prochain lancement ne doit pas être bloqué');
 st.setItem('nethorMobileSkipOpeningOnceV1',now-700000);
 assert.equal(run(),false,'Le marqueur périmé ne doit pas masquer une ouverture future');
});
test('Connexion : le marqueur est créé uniquement après l’animation réussie sur mobile',()=>{
 const local=store();
 const ctx={sessionStorage:local,authPlatformKind:()=> 'mobile',Date};
 vm.runInNewContext(snippet(auth,'markMobileLoginAnimationComplete')+';markMobileLoginAnimationComplete()',ctx);
 assert.ok(Number(local.getItem('nethorMobileSkipOpeningOnceV1'))>0);
 assert.equal(local.contains('nethorMobileLaunchShownV1'),false);
 const desktop=store();
 vm.runInNewContext(snippet(auth,'markMobileLoginAnimationComplete')+';markMobileLoginAnimationComplete()',{sessionStorage:desktop,authPlatformKind:()=> 'desktop',Date});
 assert.equal(desktop.contains('nethorMobileSkipOpeningOnceV1'),false);
 const login=auth.slice(auth.indexOf('async function login(e){'),auth.indexOf('async function logout(){'));
 assert.ok(login.indexOf('await showWelcome();')<login.indexOf('markMobileLoginAnimationComplete();'));
 assert.ok(login.indexOf("if(error)return loginDenied")<login.indexOf('await showWelcome();'));
 assert.match(login,/if\(!mobileLogin\)showProfileLoader/);
 assert.match(login,/if\(!mobileLogin\)await hideProfileLoader\(380\)/);
});
test('Versions des fichiers et du cache PWA synchronisées',()=>{
 const index=read('index.html');
 const sw=read('sw.js');
 assert.match(index,/auth\/auth-login\.js\?v=5/);
 assert.match(html,/ui\/mobile\/mobile-app\.js\?v=42/);
 for(const file of ['auth/auth-login.js?v=5','ui/mobile/mobile-app.js?v=42']){
  assert.ok(sw.includes('./'+file),'Non précaché : '+file);
 }
 const version=JSON.parse(read('app-version.json')).version;
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),version);
});

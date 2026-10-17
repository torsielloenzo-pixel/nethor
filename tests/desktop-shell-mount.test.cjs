'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

function loadDesktopShell(){
 const mockElement=()=>({style:{setProperty(){},removeProperty(){}},classList:{contains(){return false}},
  setAttribute(){},remove(){},querySelector(){return null}});
 const document={
  documentElement:{dataset:{nethorPlatform:'desktop'},style:{setProperty(){},removeProperty(){}},classList:{contains(){return false}}},
  head:{appendChild(){}},readyState:'loading',
  getElementById(){return null},querySelector(){return null},createElement:mockElement,addEventListener(){}
 };
 const window={addEventListener(){},NettoProfileUI:null};
 const context={window,document,console,setTimeout:()=>0,clearTimeout(){},
  setInterval:()=>0,clearInterval(){},requestAnimationFrame(){},
  localStorage:{getItem(){return null}},MutationObserver:class{observe(){}},
  Element:class{},HTMLElement:class{},location:{href:'https://nethor.fr/home.html'}};
 vm.runInNewContext(read('ui/desktop/desktop-shell.js'),context,{timeout:3000});
 assert.ok(window.NethorDesktopShell);
 return window.NethorDesktopShell
}

test('Les menus sont réellement construits pour toutes les pages desktop',()=>{
 const shell=loadDesktopShell();
 const allKeys=['home','planning','team','promotions','articles','chat','management','settings'];
 for(const page of ['home','planning','team','admin-portal','settings']){
  const rendered=shell.buildPageLayout(page);
  assert.equal(rendered.platform,'desktop');
  assert.match(rendered.header,/data-nethor-page-chrome="desktop"/);
  assert.match(rendered.header,/class="nethorDesktopSidebar"/);
  for(const key of allKeys){
   assert.ok(rendered.header.includes('data-sidebar-key="'+key+'"'),page+': entrée manquante '+key);
  }
  assert.ok(!rendered.header.includes('undefined'),page+': valeur non définie dans le menu');
 }
});

test('Les modules protégés ne sont pas proposés avant contrôle du profil',()=>{
 const html=loadDesktopShell().buildPageLayout('home').header;
 for(const key of ['articles','management','promotions','chat']){
  assert.ok(html.includes('class="nethorSidebarItem hidden" data-sidebar-key="'+key+'"'),
   'Entrée initialement masquée : '+key);
 }
});

test('Le chargeur de page résiste aux exceptions du shell',()=>{
 const loader=read('platform-page-layout.js');
 assert.ok(loader.includes('try{mounted=mount()}'));
 assert.ok(loader.includes("if(mounted){delete ROOT.dataset.nethorLayoutError;return true}"));
});

test('Les pages desktop et la PWA ont la même version corrigée',()=>{
 const worker=read('sw.js');
 assert.ok(worker.includes('./ui/desktop/desktop-shell.js?v=41'));
 assert.ok(worker.includes('./platform-page-layout.js?v=14'));
 for(const page of ['home.html','planning.html','admin-portal.html','accounts.html','team.html','chat.html']){
  const html=read(page);
  assert.ok(html.includes('ui/desktop/desktop-shell.js?v=41'),page+': vieux shell');
  assert.ok(html.includes('platform-page-layout.js?v=14'),page+': vieux chargeur');
 }
});

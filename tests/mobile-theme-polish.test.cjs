'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('ui/mobile/mobile-themes.css');
const marker='Finition chromatique Mobile — 6 ambiances, un langage visuel.';
const section=css.slice(css.indexOf(marker));
test('Finitions limitées au Mobile et six palettes prises en charge',()=>{
 assert.ok(section.length>5000,'Les finitions CSS sont absentes');
 for(const name of ['mineral','sage','plum','halloween']){
  assert.ok(section.includes('[data-nethor-mobile-theme="'+name+'"]'),'Thème absent : '+name)
 }
 assert.match(section,/\[data-theme="dark"\]:not\(\[data-nethor-mobile-theme\]\)/);
 assert.match(section,/:root\[data-nethor-mobile-app="1"\]\{/);
 assert.ok(section.includes('html[data-nethor-mobile-app="1"]'));
 assert.ok(section.includes('--nmt-polish-muted'));
 assert.ok(section.includes('--nmt-polish-line'));
 assert.ok(section.includes('--nmt-polish-surface'));
});
test('Lisibilité des notifications et du profil sur tous les thèmes',()=>{
 for(const name of ['.npGroup','.npSentence b','.npRow.unread .npAge','.npSearch:focus','.npvEmailFields input','.npvFrameChoice.active','.npvEmailFields label>span','.nsvThemes .nsvThemeLabel small']){
  assert.ok(section.includes(name),'Sélecteur de cohérence absent : '+name)
 }
 assert.match(section,/\.npvFrameChoice\.active\{[\s\S]*?background:var\(--nmt-polish-soft\)!important/);
 assert.match(section,/\.npvEmailFields input:focus\{[\s\S]*?border-color:var\(--nmt-polish-accent\)!important/);
});
test('Navigation et chat harmonisés sans changer les états du planning',()=>{
 for(const name of ['.nethorMobileAppNav','.nethorChatViewLoading span','.nethorChatViewError button','.mhdHero h1']){
  assert.ok(section.includes(name),'Selector absent : '+name);
 }
 for(const unsafe of ['.nthWeekSlot[data-status=','.nthWeekShift[data-shift=','.agendaDayShift[data-status=','.nethorThemeAvatarFrameOverlay','.nethorMobileAppTop::after']){
  assert.ok(!section.includes(unsafe),'La finition touche une couleur métier ou un décor conservé : '+unsafe);
 }
 assert.ok(css.includes('html[data-nethor-mobile-app="1"] body.agendaLayout .agendaHeader'),'Le titre de semaine transparent reste présent');
 assert.ok(css.includes('assets/halloween-rooftop-cat.webp'),'Le chat et le toit Halloween restent présents');
 assert.ok(css.includes('assets/halloween-pumpkin.svg'),'La citrouille Halloween reste présente');
});
test('Accent prune lisible dans les sondages, boutons existants inchangés',()=>{
 assert.match(section,/data-nethor-mobile-theme="plum"\] \.nethorWeeklyPollView\{\s*--nwp-accent-on:#231b33/);
 assert.ok(!section.includes('.npvPrimary{'),'Ne pas recolorer les boutons principaux métier');
 assert.ok(!section.includes('.nrvSend{'),'Conserver l’envoi des signalements');
});
test('Styles et Service Worker synchronisés',()=>{
 const html=read('mobile.html'),sw=read('sw.js'),meta=JSON.parse(read('app-version.json'));
 const path=html.match(/ui\/mobile\/mobile-themes\.css\?v=\d+/)?.[0];
 assert.ok(path&&sw.includes('./'+path));
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),meta.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),meta.version);
});

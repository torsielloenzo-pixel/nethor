'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const dashboard=read('runtime/desktop-home-dashboard.js');
const report=read('report-problem.html');
const css=read('ui/desktop/home-dashboard-v3.css');

test('Le raccourci signalement ouvre une fenêtre plutôt que changer de page',()=>{
 assert.match(dashboard,/data-desktop-home-action/);
 assert.match(dashboard,/desktopHomeAction==='incident'\)\{openQuickReport\(\);return\}/);
 assert.match(dashboard,/dialog\.showModal\(\)/);
 assert.match(dashboard,/report-problem\.html\?from=home\.html/);
 assert.match(dashboard,/embedded=desktop-home/);
 assert.match(css,/\.ndReportDialog::backdrop/);
 assert.match(css,/\.ndReportFrame/);
 assert.match(css,/html\[data-theme="dark"\] \.ndReportDialog/);
});

test('Le dialogue et sa fermeture par message ne prennent pas la main sur la navigation',()=>{
 const fn=dashboard.match(/function openQuickReport\(\)\{[\s\S]*?\n\}\nfunction activate\(result\)\{/);
 assert.ok(fn,'Fonction openQuickReport introuvable');
 const events={};const iframe={src:'',contentWindow:{},removeAttribute(name){if(name==='src')this.src=''}};
 const closeButton={addEventListener(name,fn){events['button-'+name]=fn}};
 const dialog={open:false,innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector(selector){return selector==='iframe'?iframe:closeButton;},addEventListener(name,fn){events['dialog-'+name]=fn;},showModal(){this.open=true;},close(){this.open=false;events['dialog-close']?.();}};
 const doc={getElementById(){return null},createElement(){return dialog},body:{appendChild(){}}};
 const windowStub={addEventListener(name,fn){events['window-'+name]=fn}};
 const loc={origin:'https://nethor.fr',href:'https://nethor.fr/home.html'};
 vm.runInNewContext(fn[0].replace(/\nfunction activate\(result\)\{$/, '')+'\nopenQuickReport()',{
  document:doc,window:windowStub,location:loc,HTMLDialogElement:function(){}
 });
 assert.ok(dialog.open,'Fenêtre non ouverte');
 assert.equal(iframe.src,'report-problem.html?from=home.html&embedded=desktop-home');
 events['window-message']({origin:loc.origin,source:{},data:{type:'nethor:quick-report-close'}});
 assert.ok(dialog.open,'Un autre contexte ne doit pas pouvoir fermer la fenêtre');
 events['window-message']({origin:loc.origin,source:iframe.contentWindow,data:{type:'nethor:quick-report-close'}});
 assert.equal(dialog.open,false);
 assert.equal(iframe.src,'');
});

test('Fenêtre naturelle : un seul en-tête, formulaire sans éléments de page dupliqués',()=>{
 assert.match(dashboard,/id="ndReportDialogTitle">Signaler un problème/);
 assert.doesNotMatch(dashboard,/ndReportFooter/);
 assert.doesNotMatch(dashboard,/ndReportHeaderIcon/);
 assert.match(css,/width:min\(500px,calc\(100vw - 32px\)\)/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\)/);
 assert.match(report,/html\.rpEmbedded \.rpIntro\{display:none!important\}/);
 assert.match(report,/html\.rpEmbedded \.rpContextPicker>small\{display:none!important\}/);
 assert.match(report,/overflow-y:auto!important/);
 assert.match(report,/html\.rpEmbedded \.rpText/);
 assert.match(report,/if\(help\)help\.textContent=/);
 assert.match(report,/if\(close\)close\.textContent='Fermer'/);
});

test('La page embarquée conserve l’enregistrement officiel des problèmes et ses permissions',()=>{
 assert.match(report,/NETHOR_QUICK_REPORT_EMBEDDED/);
 assert.match(report,/window\.parent\.location\.origin===location\.origin/);
 assert.match(report,/window\.parent\.postMessage\(\{type:'nethor:quick-report-close'\},location\.origin\)/);
 assert.match(report,/problemPageAllowed\(profile\.role\)/);
 assert.match(report,/db\.from\('reported_problems'\)\.insert\(payload\)/);
 for(const field of ['reporter_id','reporter_role','source_path','source_title','description','diagnostics']){
  assert.ok(report.includes(field),'Champ historique manquant : '+field)
 }
 assert.match(report,/capturedWindow=NETHOR_QUICK_REPORT_EMBEDDED\?window\.parent:window/);
 assert.match(report,/viewport_width:capturedWindow\.innerWidth/);
 assert.match(report,/viewport_height:capturedWindow\.innerHeight/);
});

test('Ressources et version PWA synchronisées',()=>{
 const home=read('home.html'),sw=read('sw.js'),ver=JSON.parse(read('app-version.json'));
 for(const asset of ['runtime/desktop-home-dashboard.js?v=6','ui/desktop/home-dashboard-v3.css?v=8']){
  assert.ok(home.includes(asset),'Absent du HTML : '+asset);
  assert.ok(sw.includes('./'+asset),'Absent du cache : '+asset);
 }
 assert.equal(Number(sw.match(/const APP_VERSION=(\d+);/)[1]),ver.version);
 assert.equal(Number(sw.match(/const CACHE='netto-tools-v(\d+)';/)[1]),ver.version);
});

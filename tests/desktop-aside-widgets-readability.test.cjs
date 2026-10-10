'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const get=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const css=get('ui/desktop/home-dashboard-v3.css');
const updated=css.slice(css.indexOf('/* Desktop Accueil — Messages prioritaires et Actions rapides.'));
const home=get('home.html'),sw=get('sw.js');
const script=get('runtime/desktop-home-dashboard.js');
test('Widgets de messages et actions : typographies et contrôles plus lisibles',()=>{
 assert.ok(updated.length>2000,'Bloc de styles desktop manquant');
 assert.match(updated,/\.ndSectionTitle strong\{\s*font-size:16px/);
 assert.match(updated,/\.ndMessageRow strong\{[\s\S]*?font-size:12\.5px/);
 assert.match(updated,/\.ndMessageRow small\{[\s\S]*?font-size:11\.5px/);
 assert.match(updated,/\.ndMessageRow time\{[\s\S]*?font-size:10\.5px/);
 assert.match(updated,/\.ndMessageRow \.ndAvatar\.small\{\s*width:42px;height:42px/);
 assert.match(updated,/\.ndActionGrid button\{\s*min-width:0;min-height:100px/);
 assert.match(updated,/\.ndActionGrid button strong\{\s*color:var\(--nd-text\);font-size:12px/);
 assert.match(updated,/\.ndActionGrid button > span\{\s*width:42px;height:42px/);
});
test('Lisibilité adaptée aux fenêtres réduites et aux thèmes desktop',()=>{
 assert.match(updated,/html\[data-nethor-page-layout="desktop"\]\[data-nethor-page-id="home"\]/);
 assert.match(updated,/@container \(max-width:560px\)/);
 assert.match(updated,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(updated,/\.ndMessageRow small\{[\s\S]*?-webkit-line-clamp:2/);
 assert.match(updated,/\.ndActionGrid button:focus-visible\{/);
 assert.match(updated,/\.ndMessageRow:focus-visible\{/);
 assert.match(updated,/background:color-mix\(in srgb,var\(--nd-text\)/);
});
test('Logique des messages et destinations des actions conservées',()=>{
 assert.match(script,/function renderMessages\(/);
 assert.match(script,/data-desktop-home-url="chat\.html"/);
 assert.match(script,/function renderQuickActions\(/);
 assert.match(script,/data-desktop-home-action/);
 assert.match(script,/desktopHomeAction==='incident'\)\{openQuickReport\(\);return\}/);
 assert.match(script,/desktopHomeAction==='planning'/);
});
test('Feuille CSS actualisée et Service Worker cohérent',()=>{
 const asset=home.match(/ui\/desktop\/home-dashboard-v3\.css\?v=\d+/)?.[0];
 assert.ok(asset);
 assert.ok(sw.includes('./'+asset));
 const release=JSON.parse(get('app-version.json'));
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),release.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),release.version);
});

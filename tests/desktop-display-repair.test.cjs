'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('Le resolver desktop conserve les media queries responsive',()=>{
 const resolver=read('platform-resolver.js');
 assert.doesNotMatch(resolver,/media\.mediaText\s*=\s*['"]not all/);
 assert.doesNotMatch(resolver,/disableDesktopMobileMediaRules\(/);
 assert.match(resolver,/syncPlatformShellStyles\(state\.kind\)/);
});
test('La sidebar desktop compacte réellement les fenêtres inférieures à 1000px',()=>{
 const css=read('ui/desktop/desktop-sidebar.css');
 assert.match(css,/@media\(max-width:1000px\)\{[\s\S]*?--nethor-sidebar-w:76px!important/);
 assert.match(css,/\[data-nethor-sidebar-mode="full"\] \.nethorSidebarBrand \.nethorDesktopHeaderIdentity\{display:none!important/);
 assert.match(css,/\[data-nethor-page-id="admin-portal"\] \.builder\{grid-template-columns:minmax\(0,1fr\)!important/);
});
test('L’accueil garde une sortie utilisable même si le dashboard manque',()=>{
 const css=read('ui/desktop/home-dashboard-v3.css'),home=read('home.html');
 assert.match(css,/:not\(:has\(\.nethorDesktopReferenceDashboard\)\) #homePages\{display:grid!important/);
 assert.match(home,/if\(dashboard\|\|cards\|\|mobileContent\)return/);
});
test('La mise à l’échelle regroupe les nouvelles zones par frame',()=>{
 const shell=read('ui/desktop/desktop-shell.js');
 assert.match(shell,/const pending=new Set\(\)/);
 assert.match(shell,/requestAnimationFrame\(flush\)/);
 assert.match(shell,/other\.contains\(node\)/);
});
test('Les pages desktop et le SW chargent les ressources corrigées',()=>{
 const home=read('home.html'),admin=read('admin-portal.html'),worker=read('sw.js');
 for(const page of [home,admin]){
  assert.match(page,/platform-resolver\.js\?v=4/);
  assert.match(page,/ui\/desktop\/desktop-shell\.js\?v=41/);
 }
 assert.match(worker,/\.\/ui\/desktop\/desktop-sidebar\.css\?v=19/);
 assert.match(worker,/\.\/ui\/desktop\/home-dashboard-v3\.css\?v=12/);
 assert.equal(Number(worker.match(/APP_VERSION=(\d+)/)[1]),JSON.parse(read('app-version.json')).version);
});

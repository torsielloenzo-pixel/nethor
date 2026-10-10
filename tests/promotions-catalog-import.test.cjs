'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const parser=read('runtime/promotions-parser.js'),page=read('runtime/promotions-page.js');
const shell=read('ui/desktop/desktop-shell.js'),html=read('promotions.html');
function engine(){const ctx={window:{}};vm.runInNewContext(parser,ctx);return ctx.window.NethorPromotionParser}

test('Référence simple : nom, poids, prix au kilo et prix unité conservés séparément',()=>{
 const e=engine(),lines=[
 {text:'LASAGNES A LA BOLOGNAISE NETTO',x:20,y:12},
 {text:'350g',x:20,y:25},
 {text:'7,94 le kg',x:20,y:38},
 {text:'2,78€',x:20,y:53}
 ];
 const out=e.parsePages([{number:2,lines}]);
 assert.equal(out.products.length,1);
 assert.equal(out.products[0].product_name,'LASAGNES A LA BOLOGNAISE NETTO');
 assert.match(out.products[0].technical_details,/350g/);
 assert.match(out.products[0].technical_details,/7,94 le kg/);
 assert.equal(out.products[0].price_or_benefit,'2,78€');
 assert.equal(out.products[0].source_page,2);
});
test('Avantage carte : prix caisse et remise restent sur la même référence',()=>{
 const e=engine(),lines=[
 {text:'JAMBON DE PARIS -25% DE SEL',x:220,y:14},
 {text:'2 achetés',x:220,y:32},
 {text:'2,90€ les 2 unités payé en caisse',x:220,y:56},
 {text:'0,88€ sur ma carte',x:220,y:77},
 {text:'2,02€ les 2 unités avantage carte',x:220,y:98}
 ];
 const out=e.parsePages([{number:1,lines}]);
 assert.equal(out.products.length,1);
 assert.match(out.products[0].product_name,/JAMBON DE PARIS/);
 assert.match(out.products[0].price_or_benefit,/2,90€/);
 assert.match(out.products[0].price_or_benefit,/0,88€/);
 assert.match(out.products[0].price_or_benefit,/2,02€/);
});
test('Traçabilité par page, passages restant à relire et scans non déclarés comme complets',()=>{
 const e=engine(),r=e.parsePages([{number:1,lines:[{text:'Produit sans prix retrouvé',x:20,y:12}]},{number:2,lines:[]}]);
 assert.equal(r.reports.length,2);
 assert.equal(r.reports[0].review.length,1);
 assert.equal(r.reports[1].hasText,false);
 assert.match(page,/state\.reports\.every\(p=>p\.checked&&p\.hasText\)/);
 assert.match(page,/PDF semble être un scan ou une image/);
 assert.match(page,/aucune référence n’a été inventée/i);
 assert.match(page,/p_reviewed_pages:state\.reports\.map\(r=>r\.number\)/);
});
test('La page rejoint la barre latérale Desktop et propose les trois champs dans le bon ordre',()=>{
 assert.match(shell,/promotions:\{label:'Promotions',url:'promotions\.html',icon:'promotions'/);
 assert.match(shell,/mainKeys=\['home','planning','promotions','chat','management'\]/);
 assert.match(shell,/if\(id==='promotions'\)return'promotions'/);
 assert.match(shell,/promotions:'<svg /);
 assert.match(html,/data-nethor-platform-header/);
 assert.ok(html.includes('1. Référence')===false,'Les champs dynamiques appartiennent au contrôleur');
 const i=page.indexOf('1. Référence'),j=page.indexOf('2. Informations techniques'),k=page.indexOf('3. Prix ou avantage');
 assert.ok(i>0&&j>i&&k>j);
});
test('Contrôles côté serveur et stockage privé ; aucune écriture directe sur les tables',()=>{
 const sql=read('database/2026-10-10-promotion-catalogs.sql');
 assert.match(sql,/alter table public\.promotion_catalogs enable row level security/);
 assert.match(sql,/alter table public\.promotion_products enable row level security/);
 assert.match(sql,/revoke all on public\.promotion_catalogs, public\.promotion_products from public,anon,authenticated/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/private\.session_is_active\(\)/);
 assert.match(sql,/p\.role in \('admin','role_point-de-vente'\)/);
 assert.match(sql,/jsonb_array_length\(p_reviewed_pages\)<>p_pages/);
 assert.match(sql,/file_size_limit,allowed_mime_types/);
 assert.match(sql,/false,31457280/);
 assert.match(page,/db\.rpc\('import_promotion_catalog'/);
 assert.match(page,/\.storage\.from\('promotion-pdfs'\)\.upload\(/);
 assert.match(page,/\.createSignedUrl\(/);
});
test('Versions et ressources PWA cohérentes',()=>{
 const sw=read('sw.js'),v=JSON.parse(read('app-version.json'));
 for(const asset of ['./promotions.html','./runtime/promotions-parser.js?v=1','./runtime/promotions-page.js?v=1','./runtime/promotions-page.css?v=1','./ui/desktop/desktop-shell.js?v=33']){
  assert.ok(sw.includes(asset),'Ressource absente : '+asset)
 }
 assert.match(sw,/STRICT_NAVIGATION_FILES=new Set\(\[[^\]]*'promotions.html'/);
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),v.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),v.version);
});

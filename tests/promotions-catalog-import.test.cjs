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

test('Référence simple : poids, prix au kilo et prix unité extraits automatiquement',()=>{
 const p=engine(),out=p.parsePages([{number:2,lines:[
  {text:'LASAGNES A LA BOLOGNAISE NETTO',x:20,y:12},
  {text:'350g',x:20,y:25},{text:'7,94 le kg',x:20,y:38},{text:'2,78€',x:20,y:53}
 ]}]);
 assert.equal(out.products.length,1);
 assert.equal(out.products[0].product_name,'LASAGNES A LA BOLOGNAISE NETTO');
 assert.match(out.products[0].technical_details,/350g/);
 assert.match(out.products[0].technical_details,/7,94 le kg/);
 assert.equal(out.products[0].price_or_benefit,'2,78€');
 assert.equal(out.products[0].source_page,2);
 assert.equal(out.products[0].category,'Épicerie salée');
 assert.equal(out.products[0].auto_uncertain,false);
});
test('Avantage carte : prix caisse, avantage et prix final restent sur une fiche',()=>{
 const p=engine(),out=p.parsePages([{number:1,lines:[
  {text:'JAMBON DE PARIS -25% DE SEL',x:220,y:14},
  {text:'2 achetés',x:220,y:32},
  {text:'2,90€ les 2 unités payé en caisse',x:220,y:56},
  {text:'0,88€ sur ma carte',x:220,y:77},
  {text:'2,02€ les 2 unités avantage carte',x:220,y:98}
 ]}]);
 assert.equal(out.products.length,1);
 assert.match(out.products[0].price_or_benefit,/2,90€/);
 assert.match(out.products[0].price_or_benefit,/0,88€/);
 assert.match(out.products[0].price_or_benefit,/2,02€/);
 assert.equal(out.products[0].category,'Frais et crémerie');
});
test('Le catalogue 6-12 octobre 2026 se rattache au lundi 5 et à la semaine 41',()=>{
 const p=engine();
 for(const s of ['Promotions du 6/10 au 12/10/2026','Du mardi 6 octobre au lundi 12 octobre 2026',
  'Du 6 au 12 octobre 2026','Du 6 oct au 12 oct 2026']){
  const d=p.suggestDates(s);
  assert.ok(d,'Dates absentes : '+s);
  assert.equal(d.from,'2026-10-06');
  assert.equal(d.until,'2026-10-12');
  const w=p.weekFor(d.from);
  assert.equal(w.week_start,'2026-10-05');
  assert.equal(w.week_end,'2026-10-11');
  assert.equal(w.iso_week,41);
  assert.equal(w.iso_year,2026);
  assert.equal(w.title,'Promotions Netto - Semaine 41');
 }
});
test('Les années ISO suivent le jeudi, même lorsque la semaine passe le Nouvel An',()=>{
 const p=engine(),m=p.extractMetadata([{number:1,lines:[{text:'Du 28 décembre 2026 au 3 janvier 2027'}]}]);
 assert.equal(m.from,'2026-12-28');
 assert.equal(m.until,'2027-01-03');
 assert.equal(m.iso_year,2026);
 assert.equal(m.iso_week,53);
 assert.equal(m.week_end,'2027-01-03');
 const jan=p.weekFor('2027-01-01');
 assert.equal(jan.iso_year,2026);
 assert.equal(jan.iso_week,53);
});
test('Aucune année donnée dans le catalogue : Nethor ne suppose pas l’année en cours',()=>{
 const p=engine();
 assert.equal(p.suggestDates('Promotions du 6 au 12 octobre'),null);
 assert.equal(p.extractMetadata([{number:1,lines:[{text:'Valable du 06/10 au 12/10'}]}]),null);
 assert.equal(p.suggestDates('du 32 octobre au 50 octobre 2026'),null);
});
test('Produits sans prix, pages sans texte et passages non reconnus restent diagnostiqués',()=>{
 const p=engine(),r=p.parsePages([
  {number:1,lines:[{text:'SHAMPOOING NETTO',x:10,y:20},{text:'Texte publicitaire sans prix',x:180,y:30}]},
  {number:2,lines:[]}
 ]);
 assert.equal(r.products.length,1);
 assert.equal(r.products[0].price_or_benefit,'Prix non détecté');
 assert.equal(r.products[0].category,'Hygiène et entretien');
 assert.equal(r.products[0].auto_uncertain,true);
 assert.equal(r.reports[1].hasText,false);
 assert.ok(r.reports[0].unmatched>0);
 assert.match(page,/NethorPromotionVision\.analyze/);
 assert.match(page,/Clé OPENAI_API_KEY/);
});
test('Dépôt PDF : aucune validation, aucun formulaire date et aucun clic pour publier',()=>{
 assert.match(html,/Importer un catalogue PDF|Import automatique du catalogue/);
 assert.doesNotMatch(html,/id="promoSave"|id="promoStart"|id="promoEnd"|id="promoTitle"|id="promoReview"/);
 assert.match(page,/async function importAutomatic\(file\)/);
 assert.match(page,/addEventListener\('change',e=>\{if\(!state.busy\)importAutomatic\(e.target.files\?\.\[0\]\)\}/);
 assert.match(page,/db\.rpc\('import_promotion_catalog_auto'/);
 assert.ok(!page.slice(page.indexOf('async function importAutomatic('),page.indexOf('function collapseCatalog(')).includes('window.confirm('),'L’import ne doit exiger aucune confirmation');
 assert.doesNotMatch(page,/reviewed_pages/);
 assert.match(page,/NethorPromotionVision\.analyze/);
 assert.match(page,/const \{meta,reports,diagnostics\}=analysis/);
 assert.match(page,/\.upload\(storagePath,file/);
});
test('Catégories, années ISO et contrôles côté serveur',()=>{
 const sql=read('database/2026-10-10-promotions-automatic-weekly.sql');
 for(const item of ['week_start','week_end','iso_year','iso_week','category','auto_uncertain','file_sha256']){
  assert.ok(sql.includes(item),'Donnée absente : '+item);
 }
 assert.match(sql,/v_monday:=p_valid_from-\(extract\(isodow from p_valid_from\)::integer-1\)/);
 assert.match(sql,/v_iso_week:=extract\(week from p_valid_from\)::integer/);
 assert.match(sql,/v_title:='Promotions Netto - Semaine '/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/private\.session_is_active\(\)/);
 assert.match(sql,/p\.role in \('admin','role_point-de-vente'\)/);
 assert.match(sql,/grant execute on function public\.import_promotion_catalog_auto/);
 assert.match(page,/file_sha256',hash/);
 assert.match(page,/createSignedUrl\(/);
 assert.match(page,/promoCategoryFilter/);
 assert.match(shell,/promotions:\{label:'Promotions',url:'promotions\.html',icon:'promotions'/);
});
test('Cache PWA et scripts de promotions actualisés',()=>{
 const sw=read('sw.js'),v=JSON.parse(read('app-version.json'));
 const html=read('promotions.html');
 const assets=['./promotions.html',...['promotions-parser.js','promotions-page.js','promotions-page.css']
  .map(name=>html.match(new RegExp('runtime/'+name.replace('.','\\.')+'\\?v=\\d+'))?.[0]).filter(Boolean).map(x=>'./'+x)];
 for(const asset of assets){
  assert.ok(sw.includes(asset),'Ressource PWA absente : '+asset)
 }
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),v.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),v.version);
});

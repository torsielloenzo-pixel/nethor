'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const js=read('runtime/promotions-page.js');
const sql=read('database/2026-10-11-promotions-review-feedback.sql');
const context={window:{}};
vm.runInNewContext(read('runtime/promotions-feedback.js'),context);
const feedback=context.window.NethorPromotionsFeedback;
const sample={product_name:'CHOUQUETTE AUX PÉPITES DE SUCRE X20',
 category:'Épicerie sucrée',price_or_benefit:'2,29 €',
 technical_details:'240g - 9,54 € le kg',price_unit:'La boîte de 20',
 source_excerpt:'CHOUQUETTE AUX PÉPITES DE SUCRE X20 | 240g | 2,29 €'};

test('Plier et déplier un catalogue sans perdre la possibilité de le rouvrir',()=>{
 assert.match(js,/function collapseCatalog\(\)/);
 assert.match(js,/state\.selectedCatalogId=null/);
 assert.match(js,/function toggleCatalog\(id\)/);
 assert.match(js,/if\(state\.selectedCatalogId===id\)\{collapseCatalog\(\);return\}/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/data-promo-catalog/);
 assert.match(js,/promoCatalogCaret/);
 assert.match(js,/data-promo-delete-catalog/);
 assert.match(js,/promoCatalogList'\)\.addEventListener\('click'/);
});
test('Valider / Retravailler / Refuser depuis chaque référence',()=>{
 for(const action of ['validated','reworked','rejected'])
  assert.ok(js.includes("data-promo-action=\""+action+"\"")||js.includes("action==='"+action+"'"));
 for(const field of ['product_name','category','technical_details','price_or_benefit','price_unit','additional_info'])
  assert.ok(js.includes('name="'+field+'"'),'Champ absent : '+field);
 assert.match(js,/db\.rpc\('review_promotion_product'/);
 assert.match(js,/promoShowRejected/);
 assert.match(js,/p\.review_status!=='rejected'\|\|showRejected/);
 assert.match(js,/reviewProduct\(product\.id,'reworked',fields\)/);
 assert.match(js,/data-promo-action="edit"/);
});
test('Effacement catalogue avec confirmation et nettoyage du PDF privé',()=>{
 assert.match(js,/window\.confirm\('Supprimer définitivement/);
 assert.match(js,/db\.rpc\('delete_promotion_catalog'/);
 assert.match(js,/db\.storage\.from\('promotion-pdfs'\)\.remove\(\[path\]\)/);
 assert.match(js,/if\(state\.selectedCatalogId===id\)collapseCatalog\(\)/);
 assert.match(sql,/delete from public\.promotion_catalogs where id=p_catalog_id/);
 assert.match(sql,/promotion pdf delete managers/);
});
test('Règles apprises : nom et catégorie corrigés, prix de la nouvelle semaine conservé',()=>{
 const prior=[{id:17,source_key:sample.product_name.toLowerCase(),
  source_excerpt:'Ancien catalogue, 1,79 €',action:'reworked',
  corrected_name:'CHOUQUETTES AUX PÉPITES DE SUCRE X20',
  corrected_category:'Boulangerie',created_at:'2026-10-11T00:00:00Z'}];
 const result=feedback.useRules([sample],prior);
 assert.equal(result.products.length,1);
 assert.equal(result.products[0].product_name,'CHOUQUETTES AUX PÉPITES DE SUCRE X20');
 assert.equal(result.products[0].category,'Boulangerie');
 assert.equal(result.products[0].price_or_benefit,'2,29 €');
 assert.equal(result.products[0].technical_details,'240g - 9,54 € le kg');
 assert.equal(result.stats.renamed,1);
});
test('Rejet appris : seulement si nom ET extrait source correspondent',()=>{
 const rule=[{id:8,source_key:'publicité sans produit',source_excerpt:'PUBLICITÉ SANS PRODUIT | 1,79 €',
  action:'rejected',created_at:'2026-10-11T00:00:00Z'}];
 const source={product_name:'PUBLICITÉ SANS PRODUIT',source_excerpt:'PUBLICITÉ SANS PRODUIT | 1,79 €'};
 const exact=feedback.useRules([source],rule);
 assert.equal(exact.products.length,0);
 assert.equal(exact.stats.excluded,1);
 assert.equal(feedback.useRules([{...source,source_excerpt:'PUBLICITÉ SANS PRODUIT | 2,19 €'}],rule).products.length,1);
 assert.equal(feedback.useRules([{...source,product_name:'AUTRE ARTICLE'}],rule).products.length,1);
});
test('Dernière décision enregistrée est prioritaire à nom source égal',()=>{
 const rows=[
 {id:5,source_key:'poireau',action:'validated',corrected_category:'Fruits et légumes',created_at:'2026-10-10T20:00:00Z'},
 {id:6,source_key:'poireau',action:'reworked',corrected_name:'POIREAUX',corrected_category:'Fruits et légumes',
  created_at:'2026-10-11T00:00:00Z'}
 ];
 const result=feedback.useRules([{product_name:'POIREAU',category:'À classer',price_or_benefit:'1,69 €'}],rows);
 assert.equal(result.products[0].product_name,'POIREAUX');
 assert.equal(result.products[0].price_or_benefit,'1,69 €');
});
test('Protection côté serveur : rôles actifs, session, aucune écriture directe accordée',()=>{
 assert.match(sql,/alter table public\.promotion_analysis_feedback enable row level security/);
 assert.match(sql,/revoke all on public\.promotion_analysis_feedback from public,anon,authenticated/);
 assert.match(sql,/private\.session_is_active\(\)/);
 assert.match(sql,/p\.role in \('admin','role_point-de-vente'\)/);
 assert.match(sql,/source_catalog_id uuid not null/);
 assert.match(sql,/source_product_id uuid not null/);
 assert.match(sql,/source_excerpt/);
 assert.match(sql,/source_key/);
 assert.match(sql,/grant execute on function public\.review_promotion_product/);
 assert.match(sql,/grant execute on function public\.delete_promotion_catalog/);
 assert.match(sql,/v_product\.product_name,v_product\.source_excerpt/);
});
test('Cache, feuille CSS et compteur des versions identiques',()=>{
 const html=read('promotions.html'),sw=read('sw.js'),meta=JSON.parse(read('app-version.json'));
 for(const asset of ['promotions-feedback.js','promotions-page.js','promotions-page.css']){
  const pattern=new RegExp('runtime/'+asset.replaceAll('.','\\.')+'\\?v=\\d+');
  const match=html.match(pattern);
  assert.ok(match,'Asset absent du HTML : '+asset);
  assert.ok(sw.includes('./'+match[0]),'Absent du worker : '+match[0])
 }
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),meta.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),meta.version);
});

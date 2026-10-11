'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const ctx={window:{}};
vm.runInNewContext(read('runtime/promotions-review-workshop.js'),ctx);
const review=ctx.window.NethorPromotionsReview;
const rows=[
 {id:'one',position:1,product_name:'POIREAU',category:'Fruits et légumes',technical_details:'Calibre 20/40',price_or_benefit:'1,69 €',price_unit:'le kg',source_page:2,review_status:'pending'},
 {id:'two',position:2,product_name:'LESSIVE LIQUIDE',category:'Hygiène et entretien',technical_details:'Bidon 2 litres',price_or_benefit:'5,99 €',source_page:4,review_status:'validated'},
 {id:'three',position:3,product_name:'CHOUQUETTES',category:'Boulangerie',technical_details:'20 pièces',price_or_benefit:'1,79 €',source_page:3,review_status:'reworked'},
 {id:'four',position:4,product_name:'PUBLICITÉ',category:'À classer',technical_details:'',price_or_benefit:'Prix non détecté',source_page:1,review_status:'rejected'}
];
test('Statistiques de contrôle : refusés séparés des validés',()=>{
 const result=review.counts(rows);
 assert.equal(result.pending,1);
 assert.equal(result.validated,1);
 assert.equal(result.reworked,1);
 assert.equal(result.rejected,1);
 assert.equal(result.validated+result.reworked,2);
});
test('Filtrer les produits par statut, nom sans accents et catégorie',()=>{
 assert.equal(review.filterProducts(rows,{status:'pending'}).length,1);
 assert.equal(review.filterProducts(rows,{status:'rejected'})[0].id,'four');
 assert.equal(review.filterProducts(rows,{status:'all',query:'POIREAU'})[0].id,'one');
 assert.equal(review.filterProducts(rows,{status:'all',query:'liquide'}).length,1);
 assert.equal(review.filterProducts(rows,{status:'all',category:'Boulangerie'})[0].id,'three');
 assert.equal(review.filterProducts(rows,{status:'all',query:'calibre'}).length,1);
});
test('Le surlignage cible la géométrie réelle issue du PDF sans inventer de coordonnées',()=>{
 const local=review.regionPercent({x:100,y:200,width:200,height:300,page_width:600,page_height:1000});
 assert.ok(Math.abs(local.left-16.666666666)<.01);
 assert.equal(local.top,20);
 assert.equal(local.width,200/600*100);
 assert.equal(local.height,30);
 const vision=review.regionPercent({engine:'vision-v1',x:120,y:220,w:340,h:440});
 assert.equal(vision.left,12);
 assert.equal(vision.top,22);
 assert.equal(vision.width,34);
 assert.equal(vision.height,44);
 for(const invalid of [{},{x:-1,y:10,width:20,height:20,page_width:100,page_height:100},
  {x:900,y:20,w:150,h:30,engine:'vision-v1'},
  {x:1,y:2,width:20,height:15,page_width:0,page_height:300}]){
  assert.equal(review.regionPercent(invalid),null);
 }
});
test('Le traitement nécessite une décision serveur, sans écriture directe de produits',()=>{
 const script=read('runtime/promotions-review-workshop.js');
 assert.match(script,/db\.rpc\('review_promotion_product'/);
 assert.match(script,/canManage/);
 assert.doesNotMatch(script,/db\.from\('promotion_products'\)\.(?:update|delete|insert)\(/);
 assert.match(script,/data-review-open-pdf/);
 assert.match(script,/createSignedUrl\(cat\.storage_path/);
 assert.match(script,/p\.source_excerpt/);
 assert.match(script,/source_page/);
 assert.match(script,/aucun.*checklist|ne publie pas la promotion/i);
});
test('Le module n’utilise ni code EAN, ni Mercalys, ni API payante',()=>{
 const script=read('runtime/promotions-review-workshop.js');
 assert.doesNotMatch(script,/\bEAN13\b|\bMercalys\b|OPENAI_API_KEY|promotions-vision/);
});

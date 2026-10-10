'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const sandbox={window:{}};
vm.runInNewContext(read('runtime/promotions-parser.js'),sandbox);
vm.runInNewContext(read('runtime/promotions-block-analyzer.js'),sandbox);
vm.runInNewContext(read('runtime/promotions-ocr.js'),sandbox);
const engine=sandbox.window.NethorPromotionsBlocks;
const core=sandbox.window.NethorPromotionParser;
let id=0;
const token=(text,x,y,height=10)=>({
 id:++id,text,x,y,height,width:Math.max(20,text.length*5),
 pageWidth:610,pageHeight:920
});
function fixture(){
 id=0;
 return {number:4,width:610,height:920,lines:[
  token('Origine France',18,24),token('POIREAU',98,260),token('Calibre : 20/40',98,276),
  token('Catégorie : 1',98,290),token('1€',18,255,25),token('69',31,274,18),token('Le kg',19,297),
  token('FILET DE 5 KG',395,20),token('OIGNON JAUNE',398,258),token('Calibre : 40/60mm',398,275),
  token('Catégorie : 1',398,290),token('5 kg - 0,50 € le kg',398,305),
  token('2€',319,256,25),token('49',336,277,18),token('Le filet de 5 kg',318,298),
  token('RAISIN ROSE',99,544),token('Variété : Red Globe',99,560),token('Catégorie : 1',99,578),
  token('1€',18,533,22),token('89',35,552,16),token('Le kg',19,578),
  token('AVOCAT AFFINÉ',399,545),token('Variété : Hass',399,560),
  token('Calibre : 165/196g',399,573),token('Catégorie : 1',399,585),
  token('Soit 0,75 € la pièce au lot',399,599),
  token('1€',318,531,25),token('50',336,550,15),token('Le lot de 2',319,575),
  token('VIENNOISERIES ET PÂTISSERIES',20,620,16),
  token('Transformé en France',18,660),
  token('CHOUQUETTE AUX PÉPITES DE SUCRE X20',98,850),
  token('240 g - 7,46 € le kg',98,865),
  token("Offre valable sur d'autres produits*",98,881),
  token('1€',18,832,25),token('79',34,851,19),token('La boîte de 20',18,877),
  token('Transformé au Royaume-Uni',316,658),
  token('DÉLICES AU CARAMEL X22',396,848),token('320 g - 11,84 € le kg',396,866),
  token("Offre valable sur d'autres produits*",396,878),
  token('3€',318,833,25),token('79',332,853,20),token('La boîte de 22',317,882)
 ]}
}
function get(){
 const result=engine.parsePages([fixture()],core);
 return result
}
test('Six encadrés géométriques, deux colonnes et trois rangées',()=>{
 const {products,reports}=get();
 assert.equal(products.length,6);
 assert.equal(reports[0].analysis_mode,'spatial-blocks');
 assert.equal(reports[0].blocks_detected,6);
 assert.deepEqual(products.map(p=>p.source_block.row+'-'+p.source_block.column),
   ['0-0','0-1','1-0','1-1','2-0','2-1']);
 assert.ok(products.every(p=>p.source_page===4));
});
test('Poireau : prix entier + centimes OCR, nom, calibre, catégorie et origine',()=>{
 const {products}=get(),p=products[0];
 assert.equal(p.product_name,'POIREAU');
 assert.equal(p.price_or_benefit,'1,69 €');
 assert.equal(p.price_unit,'Le kg');
 assert.match(p.technical_details,/Calibre\s*:\s*20\/40/i);
 assert.match(p.technical_details,/Catégorie\s*:\s*1/i);
 assert.match(p.additional_info,/Origine France/);
 assert.equal(p.category,'Fruits et légumes');
 assert.equal(p.auto_uncertain,false);
});
test('La fiche oignon ne récupère pas les données du poireau',()=>{
 const {products}=get(),o=products[1],p=products[0];
 assert.equal(o.product_name,'OIGNON JAUNE');
 assert.equal(o.price_or_benefit,'2,49 €');
 assert.equal(o.price_unit,'Le filet de 5 kg');
 assert.match(o.technical_details,/5 kg - 0,50 € le kg/);
 assert.doesNotMatch(p.technical_details,/5 kg - 0,50/);
});
test('Chouquettes : boîte, grammage, prix au kilo et mention complémentaire',()=>{
 const {products}=get(),p=products[4];
 assert.equal(p.product_name,'CHOUQUETTE AUX PÉPITES DE SUCRE X20');
 assert.equal(p.price_or_benefit,'1,79 €');
 assert.equal(p.price_unit,'La boîte de 20');
 assert.match(p.technical_details,/240 g - 7,46 € le kg/);
 assert.match(p.additional_info,/Offre valable sur d'autres produits/);
 assert.match(p.additional_info,/Transformé en France/);
 assert.equal(p.category,'Boulangerie');
 assert.equal(p.auto_uncertain,false);
 assert.doesNotMatch(products[2].additional_info||'',/Transformé en France/);
});
test('Prix au kg secondaire pas confondu avec prix affiché du bloc pâtisserie',()=>{
 const {products}=get(),p=products[5];
 assert.equal(p.price_or_benefit,'3,79 €');
 assert.equal(p.price_unit,'La boîte de 22');
 assert.match(p.technical_details,/320 g - 11,84 € le kg/);
 assert.doesNotMatch(p.price_or_benefit,/11,84/);
 assert.match(p.additional_info,/Transformé au Royaume-Uni/);
});
test('Si la géométrie du PDF manque, conserver une extraction prudente de secours',()=>{
 const old=core.parsePages([{number:1,lines:[
  {text:'LASAGNES A LA BOLOGNAISE NETTO',x:20,y:12},
  {text:'350g',x:20,y:25},
  {text:'7,94 le kg',x:20,y:38},
  {text:'2,78€',x:20,y:53}
 ]}]);
 const result=engine.parsePages([{number:1,lines:[
  {text:'LASAGNES A LA BOLOGNAISE NETTO',x:20,y:12},
  {text:'350g',x:20,y:25},
  {text:'7,94 le kg',x:20,y:38},
  {text:'2,78€',x:20,y:53}
 ]}],core);
 assert.equal(result.products.length,old.products.length);
 assert.equal(result.products[0].auto_uncertain,true);
 assert.equal(result.reports[0].analysis_mode,'legacy');
});
test('OCR local convertit les coordonnées TSV en positions utilisées par le moteur PDF',()=>{
 const header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
 const tsv=[header,'5\t1\t1\t1\t1\t1\t200\t100\t60\t20\t90\tPOIREAU',
  '5\t1\t1\t1\t2\t1\t50\t500\t40\t30\t95\t1€'].join('\n');
 const ocr=sandbox.window.NethorPromotionsOCR;
 const words=ocr.wordsFromTSV(tsv);
 assert.equal(words.length,2);
 const items=ocr.toPdfItems(words,2,460);
 assert.equal(items[0].transform[4],100);
 assert.equal(items[0].transform[5],400);
 assert.equal(items[1].str,'1€');
});
test('PDF et base : inclure les champs séparés et la géométrie source',()=>{
 const src=read('runtime/promotions-page.js');
 const sql=read('database/2026-10-10-promotions-product-blocks.sql');
 const html=read('promotions.html'),sw=read('sw.js');
 assert.match(src,/NethorPromotionsBlocks\.parsePages\(pages,window\.NethorPromotionParser\)/);
 assert.match(src,/p\.price_unit\|\|''/);
 assert.match(src,/p\.additional_info\|\|''/);
 assert.match(src,/p\.source_block\|\|\{\}/);
 assert.match(src,/NethorPromotionsOCR\.scanPage/);
 assert.match(src,/source_mode/);
 assert.match(sql,/add column if not exists price_unit/);
 assert.match(sql,/add column if not exists additional_info/);
 assert.match(sql,/add column if not exists source_block jsonb/);
 assert.match(sql,/private\.session_is_active\(\)/);
 assert.match(sql,/p\.role in \('admin','role_point-de-vente'\)/);
 for(const asset of ['runtime/promotions-parser.js?v=3','runtime/promotions-page.js?v=3',
  'runtime/promotions-block-analyzer.js?v=1','runtime/promotions-ocr.js?v=1']){
  assert.ok(html.includes(asset),'HTML sans '+asset);
  assert.ok(sw.includes('./'+asset),'PWA sans '+asset);
 }
});

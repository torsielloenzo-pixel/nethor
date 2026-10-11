'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const ctx={window:{}};
vm.runInNewContext(read('runtime/promotions-parser.js'),ctx);
vm.runInNewContext(read('runtime/promotions-offer-intelligence.js'),ctx);
const core=ctx.window.NethorPromotionParser,service=ctx.window.NethorPromotionsIntelligence;
const meta={from:'2026-10-06',until:'2026-10-12'};
const text=(text,y=10,x=20)=>({text,y,x,width:text.length*4,height:10});
const bbox=(y,height,column=0)=>({x:column*250,y,width:250,height,page_width:500,page_height:800,row:Math.floor(y/200),column});
test('S41 p.4 : la rubrique Fruits et légumes se termine le 10 octobre et non le 12',()=>{
 const lines=[
  text('FRUITS ET LÉGUMES',67),
  text('DU MARDI 6 AU SAMEDI 10 OCTOBRE 2026',72,292),
  text('POIREAU',250,90),text('1€',250,30),text('69',270,38),
  text('Calibre : 20/40',270,90),text('Catégorie : 1',289,90),
  text('VIENNOISERIES ET PÂTISSERIES',528),
  text('CHOUQUETTE AUX PÉPITES DE SUCRE X20',665,95)
 ];
 const products=[
  {product_name:'POIREAU',technical_details:'Calibre : 20/40 · Catégorie : 1',
   price_or_benefit:'1,69 €',price_unit:'Le kg',category:'Fruits et légumes',
   source_excerpt:'POIREAU | Calibre : 20/40 | 1,69 €',source_block:bbox(85,295),auto_uncertain:false},
  {product_name:'CHOUQUETTE AUX PÉPITES DE SUCRE X20',
   technical_details:'240 g - 7,46 € le kg',price_or_benefit:'1,79 €',price_unit:'La boîte de 20',
   category:'Boulangerie',source_excerpt:'CHOUQUETTE | 1,79 €',
   source_block:bbox(590,195),auto_uncertain:false}
 ];
 const result=service.enhancePage({products,lines,page:4,core,meta});
 assert.equal(result.section_date_rules.length,1);
 const leek=result.products[0].source_block.display,pastry=result.products[1].source_block.display;
 assert.equal(leek.valid_from,'2026-10-06');
 assert.equal(leek.valid_until,'2026-10-10');
 assert.equal(leek.date_source,'section');
 assert.equal(leek.section,'Fruits et légumes');
 assert.ok(Array.from(leek.quality_flags).includes('special_validity'));
 assert.equal(pastry.valid_until,'2026-10-12');
 assert.equal(pastry.section,'Boulangerie');
});
test('S41 p.9 : opération de marque entière, pas une référence produit fictive',()=>{
 const lines=[text('-60% sur tout KÜHNE',150),text('SAUCE KETCHUP HEINZ',350)];
 const result=service.enhancePage({products:[
  {product_name:'SUR TOUT KÜHNE',source_excerpt:'-60 % sur tout KÜHNE',
   price_or_benefit:'Prix non détecté',source_block:bbox(120,220),auto_uncertain:true},
  {product_name:'SAUCE KETCHUP HEINZ',technical_details:'650 g',price_or_benefit:'2,42 €',
   price_unit:"L'unité",category:'Épicerie salée',source_excerpt:'SAUCE KETCHUP HEINZ 650 g',
   source_block:bbox(300,210),auto_uncertain:false}
 ],lines,page:9,core,meta});
 assert.equal(result.products.length,1);
 assert.equal(result.products[0].product_name,'SAUCE KETCHUP HEINZ');
 assert.ok(Array.from(result.general_offers).some(o=>/Kühne|KÜHNE/i.test(o.title)));
});
test('S41 p.6 et p.8 : conditions complexes distinctes du prix affiché',()=>{
 assert.equal(service.promotionType('-68 % sur le 2ème produit'),'second_product');
 assert.equal(service.promotionType('LE 3ÈME PRODUIT 2 +1 OFFERT'),'multi_buy');
 assert.equal(service.promotionType('34 % DE REMISE IMMÉDIATE'),'immediate_discount');
 assert.equal(service.promotionType('Prix payé en caisse · sur ma carte'),'loyalty');
 assert.equal(service.promotionType('+ 25% offert'),'bonus_quantity');
 assert.equal(service.formatOf('2 x 75 g + 25% offert - soit 187 g'),'2 x 75 g');
 assert.equal(service.formatOf('Calibre : 20/40 · 5 kg - 0,50 € le kg'),'5 kg');
});
test('Les zones visuelles restent liées au PDF, sans photo extérieure ni EAN',()=>{
 const p=service.normalizeProduct({
  product_name:'OIGNON JAUNE',price_or_benefit:'2,49 €',
  technical_details:'Calibre 40/60mm · 5 kg',
  price_unit:'Le filet de 5 kg',category:'Fruits et légumes',
  source_excerpt:'OIGNON JAUNE',source_block:bbox(110,230,1),auto_uncertain:false
 },{lines:[],core,sections:[],dates:[],meta});
 assert.equal(p.source_block.page_width,500);
 assert.equal(p.source_block.display.original_pdf_crop,true);
 assert.equal(p.source_block.display.format,'5 kg');
 assert.equal(p.review_status,undefined);
 assert.doesNotMatch(read('runtime/promotions-offer-intelligence.js'),/EAN13|Mercalys|OPENAI_API_KEY/);
});
test('Le flux demeure non validé jusqu’à une décision humaine enregistrée',()=>{
 const local=read('runtime/promotions-local-engine.js');
 const page=read('runtime/promotions-page.js');
 assert.match(local,/NethorPromotionsIntelligence/);
 assert.match(page,/p\.auto_uncertain/);
 assert.match(page,/p\.source_block\|\|\{\}/);
 assert.match(page,/p_products:analysis\.products\.map/);
 assert.doesNotMatch(local,/review_status\s*:\s*'validated'/);
 const html=read('promotions.html');
 assert.match(html,/promotions-offer-intelligence\.js\?v=1/);
 assert.match(html,/promoDraftOfferOverview/);
});

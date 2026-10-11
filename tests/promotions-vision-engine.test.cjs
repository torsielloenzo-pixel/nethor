'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const script=read('runtime/promotions-visual-engine.js');
function engine(extra={}){
 const box={window:{},...extra};
 vm.runInNewContext(script,box,{timeout:4000});
 return box.window.NethorPromotionVision
}
test('Semaine ISO du lundi : catalogue valable 6–12 oct 2026 classé 5–11',()=>{
 const e=engine(),d=e.parseDates([{date_start:'2026-10-06',date_end:'2026-10-12'}]);
 assert.equal(d.from,'2026-10-06');
 assert.equal(d.until,'2026-10-12');
 assert.equal(d.week_start,'2026-10-05');
 assert.equal(d.week_end,'2026-10-11');
 assert.equal(d.iso_week,41);
 assert.equal(d.iso_year,2026);
 assert.equal(d.title,'Promotions Netto - Semaine 41');
});
test('Dates absentes ou contradictoires = aucun calendrier inventé',()=>{
 const e=engine();
 assert.equal(e.parseDates([{date_start:'',date_end:''}]),null);
 assert.throws(()=>e.parseDates([{date_start:'2026-10-06',date_end:'2026-10-12'},
  {date_start:'2026-10-13',date_end:'2026-10-19'}]),/contradictoires/);
 assert.equal(e.parseDates([{date_start:'2026-02-30',date_end:'2026-03-06'}]),null);
});
test('Prix en caisse et carte, qualité et origine enregistrés séparément',()=>{
 const e=engine();
 const data=e.toProduct({id:'a',is_product:true,product_name:'JAMBON DE PARIS -25% DE SEL',
  category:'Frais et crémerie',quality_grade:'',grammage:'2 × 120 g',
  prix_kg:'',calibre:'',prix:'2,90 €',price_unit:'les 2 unités',
  price_type:'prix caisse',price_caisse:'2,90 € payé en caisse',
  card_advantage:'0,88 € sur ma carte',price_after_card:'2,02 € après carte',
  quantity_condition:'2 achetés',origine:'Transformé en France',additional_info:'Offre valable*',
  technical_details:'',confidence:.93,evidence:'JAMBON, 2,90 € et avantage carte'},
  {x:50,y:100,w:400,h:300},1,false);
 assert.equal(data.product_name,'JAMBON DE PARIS -25% DE SEL');
 assert.match(data.price_or_benefit,/0,88/);
 assert.match(data.price_or_benefit,/2,02/);
 assert.match(data.technical_details,/120 g/);
 assert.match(data.additional_info,/Transformé en France/);
 assert.equal(data.source_block.price_type,'prix caisse');
 assert.equal(data.auto_uncertain,false);
});
test('Rectangles et chevauchements empêchent de compter deux fois la même fiche',()=>{
 const e=engine();
 assert.equal(e.bounds({x:-10,y:0,w:10,h:80}),null);
 assert.ok(e.overlap({x:20,y:20,w:300,h:300},{x:30,y:30,w:290,h:290})>.8);
 assert.equal(e.overlap({x:20,y:20,w:300,h:300},{x:520,y:30,w:300,h:300}),0);
});
test('Chaîne complète : détection, lecture encadré, audit et produit manquant récupéré',async()=>{
 let calls=[];
 const canvas=()=>({width:0,height:0,getContext:()=>({drawImage(){}}),
  toDataURL:()=> 'data:image/jpeg;base64,'+'AA'.repeat(50)});
 const product=(id,name)=>({id,is_product:true,product_name:name,
  category:name==='POIREAU'?'Fruits et légumes':'Boulangerie',
  quality_grade:'Catégorie 1',grammage:name==='POIREAU'?'':'240 g',
  prix_kg:name==='POIREAU'?'':'7,46 €/kg',calibre:'20/40',
  prix:name==='POIREAU'?'1,69 €':'1,79 €',price_unit:name==='POIREAU'?'Le kg':'Boîte de 20',
  price_type:'prix unitaire',price_caisse:'',card_advantage:'',price_after_card:'',
  quantity_condition:'',origine:'France',additional_info:'',technical_details:'',
  confidence:.95,evidence:name});
 const db={functions:{invoke:async(_name,{body})=>{
  calls.push(body.action);
  if(body.action==='detect')return{data:{ok:true,result:{
    date_start:'2026-10-06',date_end:'2026-10-12',
    blocks:[{id:'p1',x:10,y:10,w:450,h:450,label:'Poireau',confidence:.9}],warnings:[]}}};
  if(body.action==='read')return{data:{ok:true,result:{
    products:body.crops.map(x=>product(x.id,x.id.endsWith('m0')?'CHOUQUETTES X20':'POIREAU')),
    warnings:[]}}};
  return{data:{ok:true,result:{date_start:'',date_end:'',
    missing_blocks:[{id:'missing',x:530,y:10,w:450,h:450,label:'Chouquettes',confidence:.9}],
    suspicious_ids:[],warnings:[]}}};
 }}};
 const pg={getViewport:()=>({width:600,height:850}),
  render:()=>({promise:Promise.resolve()}),cleanup(){}};
 const pdfjs={getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>pg}),
  destroy:async()=>{}})};
 const e=engine({document:{createElement:()=>canvas()}});
 const result=await e.analyze({db,pdfjs,filename:'netto.pdf',bytes:new Uint8Array([37,80,68,70]).buffer});
 assert.equal(result.products.length,2);
 assert.equal(result.products[0].product_name,'POIREAU');
 assert.equal(result.products[1].product_name,'CHOUQUETTES X20');
 assert.equal(result.reports[0].missing_found,1);
 assert.equal(result.meta.week_start,'2026-10-05');
 assert.equal(calls.join(','),'detect,read,verify,read');
});
test('Le nouvel import local n’a besoin d’aucune API visuelle payante',()=>{
 const page=read('runtime/promotions-page.js'),html=read('promotions.html');
 assert.match(page,/NethorPromotionsLocal\.analyze/);
 assert.doesNotMatch(page,/functions\.invoke\('promotions-vision'/);
 assert.doesNotMatch(page,/OPENAI_API_KEY|NethorPromotionVision/);
 for(const name of ['promotions-parser','promotions-block-analyzer','promotions-ocr','promotions-local-engine'])
  assert.ok(html.includes('src="runtime/'+name+'.js?v='),'Moteur absent : '+name);
 assert.doesNotMatch(page,/sk-[A-Za-z0-9]{12}/);
});

test('Serveur autorisé, quota SQL, clé uniquement en secret, aucune donnée IA vendue au navigateur',()=>{
 const edge=read('supabase/functions/promotions-vision/index.ts');
 const sql=read('database/2026-10-11-promotions-vision-usage.sql');
 assert.match(edge,/Deno\.env\.get\("OPENAI_API_KEY"\)/);
 assert.match(edge,/auth\.getUser\(token\)/);
 assert.match(edge,/role_point-de-vente/);
 assert.match(edge,/store:false/);
 assert.match(edge,/json_schema/);
 assert.match(edge,/reserve_promotion_vision_call/);
 assert.match(sql,/alter table public\.promotion_vision_usage enable row level security/);
 assert.match(sql,/private\.session_is_active\(\)/);
 assert.match(sql,/300 analyses IA/);
});
test('PWA : nouvelle feuille de route et cache synchronisé',()=>{
 const sw=read('sw.js'),meta=JSON.parse(read('app-version.json'));
 assert.match(sw,/\.\/runtime\/promotions-local-engine\.js\?v=1/);
 assert.match(sw,/\.\/runtime\/promotions-page\.js\?v=7/);
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),meta.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),meta.version);
});

test('Score IA entre 0 et 100 normalisé, résultat invalide jamais traité comme fiable',()=>{
 const e=engine();
 const product=(confidence)=>e.toProduct({id:'p',is_product:true,product_name:'POIREAU',category:'Fruits et légumes',
  quality_grade:'Catégorie 1',grammage:'',prix_kg:'',calibre:'20/40',prix:'1,69 €',
  price_unit:'Le kg',price_type:'prix direct',price_caisse:'',card_advantage:'',price_after_card:'',
  quantity_condition:'',origine:'France',additional_info:'',technical_details:'',confidence,evidence:'POIREAU 1,69 €'},
  {x:10,y:10,w:400,h:300},1,false);
 assert.equal(product(93).source_block.confidence,.93);
 assert.equal(product(93).auto_uncertain,false);
 assert.equal(product(64).source_block.confidence,.64);
 assert.equal(product(64).auto_uncertain,true);
 assert.equal(product(155).source_block.confidence,0);
 assert.equal(product(155).auto_uncertain,true);
});
test('Contrôle multimodal relit les blocs douteux, conserve un signalement de prudence',async()=>{
 let reads=0;
 const model=(id,confidence)=>({id,is_product:true,product_name:'POIREAU',category:'Fruits et légumes',
  quality_grade:'1',grammage:'',prix_kg:'',calibre:'20/40',prix:'1,69 €',
  price_unit:'Le kg',price_type:'prix direct',price_caisse:'',card_advantage:'',
  price_after_card:'',quantity_condition:'',origine:'France',additional_info:'',
  technical_details:'',confidence,evidence:'POIREAU 1,69 €'});
 const db={functions:{invoke:async(_,{body})=>{
  if(body.action==='detect')return {data:{ok:true,result:{date_start:'2026-10-06',
   date_end:'2026-10-12',blocks:[{id:'a',x:10,y:10,w:450,h:450,label:'Poireau',confidence:.9}],warnings:[]}}};
  if(body.action==='verify')return{data:{ok:true,result:{date_start:'',date_end:'',
   missing_blocks:[],suspicious_ids:['p1b0'],warnings:[]}}};
  reads++;
  return{data:{ok:true,result:{products:body.crops.map(c=>model(c.id,reads===1?64:94)),warnings:[]}}}
 }}};
 const canvas=()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,'+'AA'.repeat(50)});
 const page={getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve()}),cleanup(){}};
 const pdfjs={getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>page}),destroy:async()=>{}})};
 const e=engine({document:{createElement:()=>canvas()}});
 const result=await e.analyze({db,pdfjs,filename:'catalogue.pdf',bytes:new ArrayBuffer(10)});
 assert.equal(reads,2);
 assert.equal(result.products[0].source_block.confidence,.94);
 assert.equal(result.products[0].auto_uncertain,true);
 assert.equal(result.reports[0].rechecked,1);
 assert.equal(result.reports[0].recheck_failures,0);
 assert.equal(result.diagnostics.review_passes,3);
});
test('Sécurité : le nouveau contrôle valide le payload avant le quota payant',()=>{
 const s=read('supabase/functions/promotions-vision/index.ts');
 assert.ok(s.indexOf('img(body?.image)')<s.indexOf('const quota=await db.rpc'));
 assert.match(s,/rawLength>23500000/);
 assert.match(s,/vision-multimodal-v2/);
 assert.match(s,/Confidence entre 0 et 1/);
 const page=read('runtime/promotions-page.js'),html=read('promotions.html');
 assert.match(page,/promoVisionRetry/);
 assert.match(html,/promoVisionUnavailable/);
 assert.match(html,/promotions-visual-engine.js\?v=2/);
 assert.match(page,/NethorPromotionVision\.analyze/);
 assert.doesNotMatch(html,/src="runtime\/promotions-ocr\.js/);
});

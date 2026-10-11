'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function engine(){
 const ctx={window:{}};
 for(const name of ['promotions-parser','promotions-block-analyzer','promotions-offer-intelligence','promotions-local-engine'])
  vm.runInNewContext(read('runtime/'+name+'.js'),ctx);
 return ctx.window;
}
const sample=[
 ['Du 6 au 12 octobre 2026',20,32],
 ['POIREAU',98,260],['Calibre : 20/40',98,277],['Catégorie : 1',98,293],
 ['1€',18,256,25],['69',31,276,17],['Le kg',18,299],
 ['OIGNON JAUNE',398,259],['Calibre : 40/60',398,277],
 ['2€',318,256,25],['49',334,276,17],['Le filet de 5 kg',318,299]
];
function tokens(rows){
 return rows.map(([str,x,y,height=10])=>({
  str,width:Math.max(20,str.length*5),height,transform:[1,0,0,1,x,920-y]
 }));
}
function mockPdf(items){
 const page={getViewport:()=>({width:610,height:920}),
  getTextContent:async()=>({items}),cleanup(){}};
 return{getDocument:()=>({promise:Promise.resolve({
  numPages:1,getPage:async()=>page
 }),destroy:async()=>{}})};
}
test('Le PDF natif extrait les blocs et les dates sans aucune API externe',async()=>{
 const e=engine();
 let ocrCalls=0;
 const output=await e.NethorPromotionsLocal.analyze({
  pdfjs:mockPdf(tokens(sample)),bytes:new ArrayBuffer(10),filename:'netto.pdf',
  ocr:{scanPage:async()=>{ocrCalls++;return[]},close:async()=>{}}
 });
 assert.equal(output.meta.from,'2026-10-06');
 assert.equal(output.meta.until,'2026-10-12');
 assert.equal(output.meta.iso_week,41);
 assert.equal(output.products.length,2);
 assert.equal(output.products[0].product_name,'POIREAU');
 assert.equal(output.products[0].price_or_benefit,'1,69 €');
 assert.match(output.products[0].technical_details,/20\/40/);
 assert.equal(output.products[1].product_name,'OIGNON JAUNE');
 assert.ok(output.products.every(p=>p.source_block?.display?.original_pdf_crop));
 assert.ok(output.products.every(p=>p.review_status===undefined));
 assert.equal(output.diagnostics.paid_api,false);
 assert.equal(output.diagnostics.requires_human_review,true);
 assert.ok(ocrCalls<=1);
});
test('PDF scanné : OCR de secours utilisé lorsque le texte natif manque',async()=>{
 const e=engine();
 let calls=0,closed=0;
 const lines=e.NethorPromotionParser.linesForPage(tokens(sample),610,920);
 const output=await e.NethorPromotionsLocal.analyze({
  pdfjs:mockPdf([]),bytes:new ArrayBuffer(10),filename:'prospectus.pdf',
  ocr:{scanPage:async()=>{calls++;return lines},close:async()=>{closed++}}
 });
 assert.equal(calls,1);
 assert.equal(closed,1);
 assert.equal(output.products.length,2);
 assert.equal(output.reports[0].ocr_used,true);
 assert.equal(output.diagnostics.textless_pages,0);
});
test('Échec OCR + page vide : refus d’inventer des produits',async()=>{
 const e=engine();
 await assert.rejects(()=>e.NethorPromotionsLocal.analyze({
  pdfjs:mockPdf([]),bytes:new ArrayBuffer(10),filename:'scan.pdf',
  ocr:{scanPage:async()=>{throw Error('OCR indisponible')},close:async()=>{}}
 }),/Aucun produit exploitable/);
});
test('Les dates doivent être réelles et vérifiées avant sauvegarde',()=>{
 const v=engine().NethorPromotionsLocal.validateDates;
 assert.equal(v('2026-10-06','2026-10-12').from,'2026-10-06');
 assert.throws(()=>v('2026-02-30','2026-03-06'),/dates réelles/);
 assert.throws(()=>v('2026-10-12','2026-10-06'),/doit suivre/);
 assert.throws(()=>v('2026-10-06','2027-05-06'),/100 jours/);
});
test('UI et services gratuits, produits toujours proposés pour validation',()=>{
 const page=read('runtime/promotions-page.js'),html=read('promotions.html');
 assert.match(page,/NethorPromotionsLocal\.analyze/);
 assert.match(page,/async function saveDraft/);
 assert.match(page,/extraction_confidence:p.extraction_confidence/);
 assert.match(page,/auto_uncertain:!!p.auto_uncertain/);
 assert.match(html,/Aucun appel OpenAI facturé/);
 assert.doesNotMatch(page,/promotions-vision|OPENAI_API_KEY/);
});

test('Le sélecteur PDF ignore son propre clic propagé',()=>{
 const page=read('runtime/promotions-page.js');
 assert.match(page,/event\.target!==\$\('promoFile'\)/);
});

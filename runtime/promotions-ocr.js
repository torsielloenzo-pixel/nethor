/* OCR complémentaire de catalogues PDF dont les prix ou textes sont des images.
   Tesseract.js est téléchargé uniquement si une page manque de texte sélectionnable.
   Le traitement du contenu et des coordonnées reste local dans le navigateur.
*/
(function(root){
'use strict';
let workerPromise=null,dependencyPromise=null;
async function dependency(){
 if(root.Tesseract)return root.Tesseract;
 if(!dependencyPromise)dependencyPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  script.crossOrigin='anonymous';
  script.onload=()=>root.Tesseract?resolve(root.Tesseract):reject(new Error('Moteur OCR non chargé'));
  script.onerror=()=>reject(new Error('Impossible de charger le moteur OCR français'));
  document.head.appendChild(script)
 }).catch(e=>{dependencyPromise=null;throw e});
 return dependencyPromise
}
async function worker(){
 if(!workerPromise)workerPromise=dependency().then(t=>t.createWorker('fra+eng',1,{
  logger:()=>{}
 })).catch(e=>{workerPromise=null;throw e});
 return workerPromise
}
function wordsFromTSV(tsv){
 if(typeof tsv!=='string'||!tsv.includes('left'))return[];
 const lines=tsv.split(/\r?\n/),header=lines.shift().split('\t');
 const ix=Object.fromEntries(header.map((h,i)=>[h,i]));
 return lines.map(row=>{
  const x=row.split('\t');
  if(x[ix.level]!=='5')return null;
  return{text:x.slice(ix.text).join('\t'),confidence:Number(x[ix.conf]),
   x:Number(x[ix.left]),y:Number(x[ix.top]),
   w:Number(x[ix.width]),h:Number(x[ix.height])}
 }).filter(x=>x&&x.text.trim()&&x.confidence>=25&&x.w>0&&x.h>0)
}
function wordsFromResult(data){
 if(typeof data?.tsv==='string'&&data.tsv)return wordsFromTSV(data.tsv);
 const words=data?.words;
 if(!Array.isArray(words))return[];
 return words.map(w=>({text:String(w.text||''),confidence:Number(w.confidence??w.conf??100),
  x:Number(w.bbox?.x0)||0,y:Number(w.bbox?.y0)||0,
  w:Number(w.bbox?.x1)-Number(w.bbox?.x0),h:Number(w.bbox?.y1)-Number(w.bbox?.y0)}))
  .filter(w=>w.text.trim()&&w.confidence>=25&&w.w>0&&w.h>0)
}
function toPdfItems(words,scale,pageHeight){
 return words.map(w=>({
  str:w.text,transform:[scale,0,0,scale,w.x/scale,pageHeight-(w.y+w.h)/scale],
  width:w.w/scale,height:w.h/scale
 }))
}
async function scanPage(page,originalViewport,parser,progress){
 const raster=page.getViewport({scale:2.2});
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(raster.width);canvas.height=Math.ceil(raster.height);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw new Error('Impossible de préparer le rendu OCR');
 try{
  if(progress)progress('Lecture des textes intégrés aux images (OCR)…');
  await page.render({canvasContext:ctx,viewport:raster}).promise;
  const t=await worker();
  const {data}=await t.recognize(canvas,{}, {tsv:true,text:true});
  const words=wordsFromResult(data);
  if(!words.length)return [];
  const items=toPdfItems(words,2.2,originalViewport.height);
  return parser.linesForPage(items,originalViewport.width,originalViewport.height)
 }finally{
  canvas.width=0;canvas.height=0
 }
}
async function close(){
 if(!workerPromise)return;
 const p=workerPromise;workerPromise=null;
 try{const instance=await p;await instance.terminate()}catch(_){}
}
root.NethorPromotionsOCR=Object.freeze({scanPage,close,wordsFromTSV,toPdfItems});
})(window);
/* Nethor Promotions Vision — rendu PDF -> encadrés visuels -> lecture -> vérification.
   Le modèle est UNIQUEMENT appelé depuis la fonction Supabase sécurisée. */
(function(root){
'use strict';
const CATS=['Fruits et légumes','Boulangerie','Frais et crémerie','Surgelés','Boissons','Animaux','Hygiène et entretien','Épicerie sucrée','Épicerie salée','Maison','À classer'];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const unique=arr=>[...new Set(arr.map(clean).filter(Boolean))];
function weekFor(s){
 if(!/^\d{4}-\d\d-\d\d$/.test(s))return null;
 const date=new Date(s+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s)return null;
 const monday=new Date(date.getTime()-((date.getUTCDay()+6)%7)*864e5);
 const sunday=new Date(monday.getTime()+6*864e5);
 const thursday=new Date(monday.getTime()+3*864e5);
 const year=thursday.getUTCFullYear(),jan4=new Date(Date.UTC(year,0,4));
 const firstMonday=Date.UTC(year,0,4)-((jan4.getUTCDay()+6)%7)*864e5;
 const n=1+Math.round((monday.getTime()-firstMonday)/(7*864e5));
 return{week_start:monday.toISOString().slice(0,10),week_end:sunday.toISOString().slice(0,10),
  iso_week:n,iso_year:year,title:'Promotions Netto - Semaine '+String(n).padStart(2,'0')}
}
function parseDates(candidates){
 const valid=candidates.filter(v=>v&&weekFor(v.date_start)&&weekFor(v.date_end)&&v.date_end>=v.date_start)
  .filter(v=>(Date.parse(v.date_end)-Date.parse(v.date_start))/864e5<=100);
 if(!valid.length)return null;
 const grouped=new Map();
 for(const item of valid){
  const key=item.date_start+'|'+item.date_end,record=grouped.get(key)||{...item,count:0};
  record.count++;grouped.set(key,record)
 }
 const choices=[...grouped.values()].sort((a,b)=>b.count-a.count);
 if(choices.length>1&&choices[0].count===choices[1].count&&choices[0].date_start!==choices[1].date_start)
  throw Error('Dates contradictoires dans le catalogue : période non enregistrée automatiquement.');
 const from=choices[0].date_start,until=choices[0].date_end;
 return{from,until,...weekFor(from)}
}
function bounds(box){
 if(!box)return null;
 const x=Number(box.x),y=Number(box.y),w=Number(box.w),h=Number(box.h);
 if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>1003||y+h>1003)return null;
 return{x:Math.max(0,x),y:Math.max(0,y),w:Math.min(1000-x,w),h:Math.min(1000-y,h)}
}
function overlap(a,b){
 const ax=Math.max(a.x,b.x),ay=Math.max(a.y,b.y),right=Math.min(a.x+a.w,b.x+b.w),bottom=Math.min(a.y+a.h,b.y+b.h);
 const intersection=Math.max(0,right-ax)*Math.max(0,bottom-ay);
 return intersection/(a.w*a.h+b.w*b.h-intersection||1)
}
function crop(canvas,rect){
 const b=bounds(rect);if(!b)throw Error('Encadré visuel invalide');
 const margin=9,sx=Math.max(0,Math.floor(b.x/1000*canvas.width-margin)),
  sy=Math.max(0,Math.floor(b.y/1000*canvas.height-margin));
 const width=Math.min(canvas.width-sx,Math.ceil(b.w/1000*canvas.width+2*margin)),
  height=Math.min(canvas.height-sy,Math.ceil(b.h/1000*canvas.height+2*margin));
 if(width<12||height<12)throw Error('Encadré trop petit pour lecture');
 const ratio=Math.min(2.1,Math.max(1,570/Math.min(width,height)));
 const out=document.createElement('canvas');
 out.width=Math.min(1250,Math.round(width*ratio));
 out.height=Math.min(1250,Math.round(height*ratio));
 const ctx=out.getContext('2d');if(!ctx)throw Error('Extraction graphique indisponible');
 ctx.drawImage(canvas,sx,sy,width,height,0,0,out.width,out.height);
 const image=out.toDataURL('image/jpeg',.83);
 out.width=0;out.height=0;
 return image
}
function imageOf(canvas){
 let q=.79,scale=1,data='';
 do{
  const target=document.createElement('canvas');
  target.width=Math.round(canvas.width*scale);target.height=Math.round(canvas.height*scale);
  target.getContext('2d').drawImage(canvas,0,0,target.width,target.height);
  data=target.toDataURL('image/jpeg',q);
  target.width=0;target.height=0;
  scale*=.83;q=Math.max(.53,q-.06)
 }while(data.length>3800000&&scale>.4);
 if(data.length>3800000)throw Error('Cette page est trop volumineuse pour le service de vision');
 return data
}
async function call(db,body){
 const {data,error}=await db.functions.invoke('promotions-vision',{body});
 if(error)throw Error(String(error?.context?.error||error.message||'Analyse IA indisponible').slice(0,220));
 if(data?.error)throw Error(data.error);
 if(!data?.ok)throw Error('Le serveur n’a pas confirmé cette analyse');
 return data.result
}
function toProduct(item,box,page,flag){
 const name=clean(item.product_name),price=clean(item.prix);
 if(!item.is_product||name.length<2)return null;
 const technical=unique([item.grammage,item.prix_kg,item.calibre,item.quality_grade,item.technical_details]).join(' · ').slice(0,1200);
 const conditions=unique([item.price_caisse,item.quantity_condition,item.card_advantage,item.price_after_card]);
 const offer=unique([price,...conditions]).join(' · ').slice(0,1200);
 const details=unique([item.origine,item.additional_info]).join(' · ').slice(0,1200);
 const cat=CATS.includes(item.category)?item.category:'À classer';
 const confidence=Math.max(0,Math.min(1,Number(item.confidence)||0));
 const uncertain=Boolean(flag||confidence<.83||!price||cat==='À classer'||clean(item.price_unit)==='');
 const bbox=bounds(box);
 return{product_name:name.slice(0,500),technical_details:technical,
  price_or_benefit:offer||'Prix non détecté',price_unit:clean(item.price_unit).slice(0,120),
  additional_info:details,category:cat,auto_uncertain:uncertain,
  source_page:page,source_excerpt:clean(item.evidence||[name,technical,offer].join(' | ')).slice(0,1500),
  extraction_confidence:uncertain?'review':'high',
  source_block:{...bbox,engine:'vision-v1',quality_grade:clean(item.quality_grade),
   price_type:clean(item.price_type),confidence,origin:clean(item.origine)}}
}
async function analyze({db,bytes,filename,pdfjs,onProgress}){
 if(!pdfjs)throw Error('Lecteur PDF indisponible');
 const task=pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))});
 const results=[],reports=[],candidates=[],knownIds=new Set();
 try{
  const documentPDF=await task.promise,total=documentPDF.numPages;
  if(total<1||total>60)throw Error('Ce moteur multimodal prend en charge les catalogues de 1 à 60 pages afin de limiter les coûts d’analyse.');
  let allSeen=0;
  for(let n=1;n<=total;n++){
   const page=await documentPDF.getPage(n);
   let canvas=document.createElement('canvas');
   try{
    const viewport=page.getViewport({scale:1.65});
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Impossible de dessiner la page PDF');
    await page.render({canvasContext:ctx,viewport}).promise;
    const image=imageOf(canvas);
    onProgress?.({step:'détection',page:n,total,products:allSeen});
    const detection=await call(db,{action:'detect',image});
    if(detection.date_start&&detection.date_end)candidates.push(detection);
    const detected=(detection.blocks||[]).filter(b=>bounds(b)).slice(0,70);
    const boxes=detected.map((b,i)=>({...b,id:'p'+n+'b'+i}));
    const products=[];
    async function readBlocks(parts,missing=false){
     for(let start=0;start<parts.length;start+=6){
      const slice=parts.slice(start,start+6);
      onProgress?.({step:missing?'rattrapage':'lecture',page:n,total,products:allSeen+products.length});
      const crops=slice.map(b=>({id:b.id,image:crop(canvas,b)}));
      const reading=await call(db,{action:'read',crops});
      for(const b of slice){
       const row=(reading.products||[]).find(p=>p.id===b.id);
       if(!row)throw Error('Un encadré page '+n+' n’a pas été interprété : import interrompu.');
       if(!row.is_product)continue;
       const product=toProduct(row,b,n,missing);
       if(product)products.push({...product,_id:b.id});
      }
     }
    }
    await readBlocks(boxes);
    onProgress?.({step:'contrôle des omissions',page:n,total,products:allSeen+products.length});
    const audit=await call(db,{action:'verify',image,products:boxes.map(b=>({
     id:b.id,x:b.x,y:b.y,w:b.w,h:b.h,
     name:products.find(p=>p._id===b.id)?.product_name||''
    }))});
    if(audit.date_start&&audit.date_end)candidates.push(audit);
    const missing=(audit.missing_blocks||[]).filter(b=>bounds(b)&&
      !boxes.some(x=>overlap(x,b)>.43)).slice(0,35)
      .map((b,i)=>({...b,id:'p'+n+'m'+i}));
    await readBlocks(missing,true);
    if(products.some(p=>audit.suspicious_ids?.includes(p._id)))
     products.forEach(p=>{if(audit.suspicious_ids.includes(p._id)){
      p.auto_uncertain=true;p.extraction_confidence='review'
     }});
    const warnings=unique([...(detection.warnings||[]),...(audit.warnings||[])]);
    const dedup=[];
    for(const p of products){
     const key=p.product_name.toLowerCase()+'|'+p.price_or_benefit;
     if(dedup.some(x=>x.key===key&&overlap(x.box,p.source_block)>.55))continue;
     dedup.push({key,box:p.source_block});
     const {_id,...record}=p;results.push(record)
    }
    const count=dedup.length;allSeen+=count;
    reports.push({number:n,detected:count,hasText:true,uncertain:products.filter(p=>p.auto_uncertain).length,
     unmatched:missing.length,analysis_mode:'multimodal-vision',
     blocks_detected:boxes.length,missing_found:missing.length,warnings});
   }finally{canvas.width=0;canvas.height=0;page.cleanup()}
  }
  if(!results.length)throw Error('Aucune référence promotionnelle exploitable détectée.');
  if(results.length>2000)throw Error('Plus de 2 000 références : limite d’import atteinte.');
  const dates=parseDates(candidates);
  if(!dates)throw Error('Dates de validité introuvables dans les pages : aucun calendrier inventé.');
  return{products:results,meta:dates,reports,diagnostics:{
   engine:'nethor-multimodal-vision-v1',total_pages:reports.length,model:'gpt-4.1',
   pages:reports,uncertain_count:results.filter(p=>p.auto_uncertain).length,
   visual_coverage_checked:true,review_passes:2,
   textless_pages:0,unmatched_passage_count:reports.reduce((s,r)=>s+r.unmatched,0)
  }}
 }finally{await task.destroy().catch(()=>{})}
}
root.NethorPromotionVision=Object.freeze({analyze,weekFor,parseDates,bounds,overlap,toProduct});
})(window);
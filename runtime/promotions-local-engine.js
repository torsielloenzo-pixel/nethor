/* Nethor Promotions — free, local-first PDF import.
   Uses selectable PDF text, spatial offer blocks and browser OCR only where needed.
   All extracted products require human review before installation.
   No external vision API or EAN integration. */
(function(root){
'use strict';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
function validIsoDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
 const d=new Date(value+'T00:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function validateDates(from,until){
 if(!validIsoDate(from)||!validIsoDate(until))throw Error('Saisis deux dates réelles au format jour/mois/année.');
 const days=(Date.parse(until+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000;
 if(days<0||days>100)throw Error('La fin de la promotion doit suivre le début, avec un maximum de 100 jours.');
 return{from,until};
}
function documentNeedsOcr(lines){
 const text=(lines||[]).map(x=>clean(x.text)).join(' ');
 return text.length<120;
}
function safeReport(report,ocrUsed,ocrFailure){
 return{
  number:report.number,
  detected:report.detected||0,
  blocks_detected:report.blocks_detected||0,
  analysis_mode:ocrUsed?'browser-ocr-'+(report.analysis_mode||'text'):report.analysis_mode||'pdf-text',
  lines:report.lines||0,
  hasText:!!report.hasText,
  uncertain:report.uncertain||0,
  unmatched:report.unmatched||0,
  ocr_used:ocrUsed,
  ocr_failure:clean(ocrFailure).slice(0,150)
 };
}
async function analyze({bytes,filename,pdfjs,onProgress,parser=root.NethorPromotionParser,
  blocks=root.NethorPromotionsBlocks,ocr=root.NethorPromotionsOCR}){
 if(!pdfjs?.getDocument||!parser?.linesForPage||!parser?.extractMetadata||!blocks?.parsePages)
  throw Error('Lecture PDF locale indisponible : recharge Nethor et réessaie.');
 const task=pdfjs.getDocument({data:new Uint8Array(bytes.slice(0))});
 const products=[],reports=[],metadataPages=[];
 let ocrPages=0,failedOcrPages=0;
 try{
  const pdf=await task.promise;
  const total=pdf.numPages;
  if(total<1||total>60)throw Error('Le catalogue doit contenir entre 1 et 60 pages.');
  for(let n=1;n<=total;n++){
   const page=await pdf.getPage(n);
   let ocrUsed=false,ocrFailure='';
   try{
    onProgress?.({step:'Lecture du texte et des encadrés',page:n,total,products:products.length});
    const viewport=page.getViewport({scale:1});
    let lines=[];
    try{
     const text=await page.getTextContent();
     lines=parser.linesForPage(text.items||[],viewport.width,viewport.height);
    }catch(_){lines=[]}
    if(documentNeedsOcr(lines)&&ocr?.scanPage){
     onProgress?.({step:'Reconnaissance locale des textes en image',page:n,total,products:products.length});
     try{
      const found=await ocr.scanPage(page,viewport,parser);
      if(found.length>lines.length){lines=found;ocrUsed=true}
      ocrPages++;
     }catch(e){failedOcrPages++;ocrFailure=String(e?.message||e)}
    }
    metadataPages.push({number:n,lines});
    const parsed=blocks.parsePages([{number:n,width:viewport.width,
      height:viewport.height,lines}],parser);
    const pageProducts=(parsed.products||[]).filter(p=>clean(p.product_name).length>=2)
      .map(p=>({
       product_name:clean(p.product_name).slice(0,500),
       technical_details:clean(p.technical_details).slice(0,1200),
       price_or_benefit:clean(p.price_or_benefit)||'Prix non détecté',
       price_unit:clean(p.price_unit).slice(0,120),
       additional_info:clean(p.additional_info).slice(0,1200),
       category:clean(p.category)||'À classer',
       source_page:n,
       source_excerpt:clean(p.source_excerpt).slice(0,1500),
       source_block:p.source_block&&typeof p.source_block==='object'?p.source_block:{},
       auto_uncertain:true,
       extraction_confidence:'review'
      }));
    products.push(...pageProducts);
    reports.push(safeReport((parsed.reports||[])[0]||{number:n,detected:pageProducts.length,
      lines:lines.length,hasText:lines.length>0},ocrUsed,ocrFailure));
    onProgress?.({step:'Produits provisoires détectés',page:n,total,products:products.length});
   }finally{page.cleanup?.()}
  }
  if(!products.length)throw Error('Aucun produit exploitable trouvé. Le prospectus peut nécessiter une saisie manuelle.');
  if(products.length>2000)throw Error('Plus de 2 000 produits détectés : découpe le catalogue en plusieurs PDF.');
  const meta=parser.extractMetadata(metadataPages,filename)||null;
  const unreadable=reports.filter(p=>!p.hasText).map(p=>p.number);
  const empty=reports.filter(p=>p.detected===0).map(p=>p.number);
  return{products,meta,reports,diagnostics:{
   engine:'nethor-pdf-text-blocks-browser-ocr-v1',
   paid_api:false,requires_human_review:true,
   total_pages:reports.length,
   uncertain_count:products.length,
   textless_pages:unreadable.length,
   unreadable_pages:unreadable,
   pages_without_detected_products:empty,
   ocr_pages:ocrPages,
   ocr_failures:failedOcrPages,
   pages:reports
  }};
 }finally{
  try{await task.destroy()}catch(_){}
  try{await ocr?.close?.()}catch(_){}
 }
}
root.NethorPromotionsLocal=Object.freeze({analyze,validIsoDate,validateDates,documentNeedsOcr});
})(window);

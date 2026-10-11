/* Nethor Promotions — lecture ciblée des catalogues, sans modèle payant.
 * But : conserver l'identification visuelle de chaque encadré, distinguer
 * les offres générales et préserver les conditions propres au produit.
 * Un indice technique n'est JAMAIS une validation commerciale automatique.
 */
(function(root){
'use strict';
const clean=x=>String(x??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const dayRX=/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi;
const sectionMatchers=[
 ['Fruits et légumes',/^(?:FRUITS?\s+ET\s+L[EÉ]GUMES?)$/i],
 ['Boulangerie',/^(?:VIENNOISERIES?\s+ET\s+P[AÂ]TISSERIES?|BOULANGERIE)$/i],
 ['Boucherie',/^(?:BOUCHERIE|VOLAILLE)$/i],
 ['Marée',/^(?:MAR[EÉ]E|POISSONNERIE)$/i],
 ['Charcuterie',/^CHARCUTERIE$/i],
 ['Traiteur',/^TRAITEUR$/i],
 ['Frais et crémerie',/^CR[EÈ]MERIE$/i],
 ['Surgelés',/^SURGEL[EÉ]S?$/i],
 ['Épicerie salée',/^(?:[EÉ]PICERIE|[EÉ]PICERIE SAL[EÉ]E)$/i],
 ['Boissons',/^BOISSONS?$/i],
 ['Hygiène et entretien',/^(?:ENTRETIEN|HYGI[EÈ]NE|PARFUMERIE)$/i]
];
function sectionOf(text){
 const t=clean(text).replace(/[\u2000-\u206f]+/g,' ');
 for(const [name,re] of sectionMatchers)if(re.test(t))return name;
 return null;
}
function pageSections(lines){
 const out=[];
 for(const l of lines||[]){
  const name=sectionOf(l.text);
  if(name)out.push({name,y:Number(l.y)||0});
 }
 return out.sort((a,b)=>a.y-b.y);
}
function findLocalDates(text,core){
 // La page 4 du S41 dit « DU MARDI 6 AU SAMEDI 10 OCTOBRE 2026 ».
 // Le parseur central attend normalement « du 6 au 10 octobre 2026 ».
 const stripped=clean(text).replace(dayRX,' ').replace(/\s+/g,' ');
 return core?.suggestDates?.(stripped)||null;
}
function pageDateRules(lines,core){
 const out=[];
 for(const l of lines||[]){
  const s=clean(l.text);
  if(s.length>150||!/\b(?:du|au|jusqu['’]au)\b/i.test(s))continue;
  const d=findLocalDates(s,core);
  if(d)out.push({...d,y:Number(l.y)||0,source:s.slice(0,170)});
 }
 return out;
}
function sectionAt(centerY,sections){
 let result=null;
 for(const s of sections)if(s.y<=centerY+12)result=s;
 return result;
}
function promotionType(text){
 const s=clean(text);
 if(/(?:sur\s+le\s+2\s*[eè]me|sur\s+le\s+second|2\s*[eè]me\s+produit)/i.test(s))
  return 'second_product';
 if(/(?:\b2\s*\+\s*1\b|3\s*[eè]me\s+produit|3[eè]me\s+produit\s+offert)/i.test(s))
  return 'multi_buy';
 if(/(?:avantage\s+carte|sur\s+ma\s+carte|prix\s+pay[eé]\s+en\s+caisse)/i.test(s))
  return 'loyalty';
 if(/remise\s+imm[eé]diate/i.test(s))return 'immediate_discount';
 if(/(?:\+\s*\d+\s*%?\s*offerts?|\b\d+\s+(?:bouteilles?|briques?)\s+offertes?)/i.test(s))
  return 'bonus_quantity';
 if(/(?:\blot\s+de\s+\d+|pack\s+de\s+\d+)/i.test(s))return 'bundle';
 return 'standard';
}
function offerLabel(type){
 return ({
  second_product:'Remise sur le 2e produit',multi_buy:'Offre multi-achat',
  loyalty:'Avantage carte',immediate_discount:'Remise immédiate',
  bonus_quantity:'Quantité offerte',bundle:'Lot / pack',standard:'Prix affiché'
 })[type]||'Prix affiché';
}
function formatOf(text){
 const s=clean(text);
 const patterns=[
  /\b\d+\s*(?:[x×]\s*)\d+\s*(?:kg|g|ml|cl|l)\b/i,
  /\b(?:pack|lot|filet|bo[iî]te)\s+de\s+\d+\s*(?:kg|g|unit[eé]s?|pi[eè]ces?|bouteilles?)?\b/i,
  /\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|l)\b/i,
  /\bx\s?\d+\b/i
 ];
 for(const re of patterns){const m=s.match(re);if(m)return clean(m[0]).slice(0,100)}
 return '';
}
function isGeneralText(text){
 return /\b(?:sur\s+tous?\s+(?:les?\s+)?(?:produits?|rayons?)|sur\s+tout\s+[A-ZÀ-Ÿ]{2,}|sur\s+(?:l['’]ensemble|l['’]int[eé]gralit[eé])|tous\s+les\s+(?:mercredis|jours)|programme\s+de\s+fid[eé]lit[eé]|nouveau\s+programme|sur\s+les\s+go[uû]ters)\b/i.test(clean(text));
}
function detectGeneralOffers(lines,page){
 const out=[],seen=new Set();
 const sequences=(lines||[]).map(l=>clean(l.text)).filter(Boolean);
 const joined=sequences.join(' ');
 const direct=[
  {pattern:/sur\s+tout\s+K[ÜU]HNE/i,title:'Offre sur la marque Kühne',scope:'brand'},
  {pattern:/sur\s+tous?\s+les?\s+produits?\s+d['’]entretien\s+NETTO/i,title:'Offre sur les produits d’entretien Netto',scope:'department'},
  {pattern:/programme\s+de\s+fid[eé]lit[eé]/i,title:'Programme de fidélité Netto',scope:'loyalty'},
  {pattern:/sur\s+tous?\s+les?\s+go[uû]ters/i,title:'Avantage sur les goûters Netto',scope:'department'}
 ];
 for(const d of direct){
  if(!d.pattern.test(joined))continue;
  out.push({title:d.title,scope:d.scope,page,requires_scope_check:true});
  seen.add(d.title);
 }
 for(const line of lines||[]){
  const s=clean(line.text);
  if(s.length<9||s.length>130||!isGeneralText(s))continue;
  if(!/(?:\d+\s*%|2\s*\+\s*1|offert|carte|remise)/i.test(joined))continue;
  if(out.length>=6)break;
  const title=s.slice(0,110);
  if(seen.has(title))continue;
  seen.add(title);
  out.push({title,scope:'general',page,requires_scope_check:true});
 }
 return out;
}
function withinRect(line,rect){
 if(!rect||!Number(rect.page_width)||!Number(rect.page_height))return false;
 return(Number(line.x)||0)>=Number(rect.x)-5
  &&(Number(line.x)||0)<Number(rect.x)+Number(rect.width)+5
  &&(Number(line.y)||0)>=Number(rect.y)-6
  &&(Number(line.y)||0)<Number(rect.y)+Number(rect.height)+6;
}
function normalizeProduct(product,{lines,core,sections,dates,meta}){
 const p={...product},rect=p.source_block&&typeof p.source_block==='object'?p.source_block:{};
 const context=(lines||[]).filter(l=>withinRect(l,rect)).map(x=>clean(x.text)).join(' ');
 const blockText=clean(context+' '+p.source_excerpt);
 const center=Number(rect.y)+Number(rect.height)/2;
 const section=sectionAt(Number.isFinite(center)?center:0,sections);
 const type=promotionType(blockText);
 const format=formatOf(p.technical_details+' '+p.product_name);
 const general=isGeneralText(p.product_name)||(/(?:programme\s+de\s+fid[eé]lit[eé]|sur\s+tout\s+\w+)/i.test(p.product_name));
 let category=p.category||'À classer';
 if(section&&category==='À classer')category=section.name;
 const localRule=dates.find(d=>section&&Math.abs(d.y-section.y)<36);
 const from=localRule?.from||meta?.from||'',until=localRule?.until||meta?.until||'';
 const price=clean(p.price_or_benefit);
 const flags=[];
 if(!price||/prix non d[eé]tect[eé]/i.test(price))flags.push('price_missing');
 if(!rect.page_width||!rect.width)flags.push('image_region_missing');
 if(!format&&!p.price_unit)flags.push('format_or_unit_missing');
 if(price.match(/\d+[,.]\d{2}\s*€/g)?.length>1)flags.push('multiple_prices');
 if(type!=='standard'&&type!=='bundle'&&type!=='bonus_quantity')flags.push('offer_terms');
 if(general)flags.push('general_offer_not_product');
 if(localRule)flags.push('special_validity');
 if((p.product_name||'').trim().length<5)flags.push('name_uncertain');
 if(!from||!until)flags.push('date_unknown');
 if(p.auto_uncertain&&flags.length===0)flags.push('extraction_uncertain');
 const uncertain=flags.length>0;
 const source={...rect,source_kind:general?'general_candidate':'product',
  display:{format,offer_type:type,offer_label:offerLabel(type),
   section:section?.name||category,valid_from:from,valid_until:until,
   date_source:localRule?'section':meta?'catalog':'unknown',
   quality_flags:flags,requires_human_review:uncertain,
   original_pdf_crop:true}};
 return{...p,category,source_block:source,auto_uncertain:uncertain,
  extraction_confidence:uncertain?'review':'high'};
}
function enhancePage({products,lines,page,core,meta}){
 const sections=pageSections(lines),dates=pageDateRules(lines,core);
 const mapped=(products||[]).map(p=>normalizeProduct(p,{lines,core,sections,dates,meta}));
 return{
  products:mapped,
  general_offers:detectGeneralOffers(lines,page),
  section_date_rules:dates,
  section_names:sections.map(s=>s.name),
  page_warnings:dates.length?['Dates spécifiques relevées sur la page '+page]:[]
 };
}
root.NethorPromotionsIntelligence=Object.freeze({
 enhancePage,normalizeProduct,pageDateRules,pageSections,findLocalDates,
 promotionType,offerLabel,formatOf,detectGeneralOffers,isGeneralText
});
})(window);

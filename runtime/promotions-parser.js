/* Nethor Promotions — extraction PDF texte. Ne jamais prétendre analyser un PDF scanné sans OCR. */
(function(root){
'use strict';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const euro=/\b\d{1,4}(?:[.,]\d{2})\s*€|€\s*\d{1,4}(?:[.,]\d{2})/i;
const unit=/\b(?:le\s*kg|au\s*kg|\/\s*kg|100\s*g|le\s*l(?:itre)?|\/\s*l\b|prix\s*(?:au|du)\s*kg)\b/i;
const tech=/\b(?:\d+(?:[,.]\d+)?\s*(?:g|kg|ml|cl|l|litres?|pi[eè]ces?|tranches?|unit[eé]s?)\b|\d+[x×]\s*\d+|le\s*kg|le\s*litre|\/\s*kg|\/\s*l\b)/i;
const benefits=/\b(?:carte|caisse|achet[eé]s?|offert|gratuits?|r[eé]duction|remise|avantage|rembours[eé]|lot|prix|pay[eé]s?|\d\s*pour\s*\d)\b/i;
const banned=/\b(?:PROMOTIONS|CATALOGUE|NOTRE S[EÉ]LECTION|D[EÉ]COUVREZ|VALABLE|DU\s+\d{1,2}\s+AU|OFFRES|CONDITIONS|RENDEZ.VOUS)\b/i;
const money=s=>euro.test(s)||(/\b\d+[,.]\d{2}\b/.test(s)&&benefits.test(s));
const uppercaseRatio=s=>{
 const letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
 const upp=(s.match(/[A-ZÀ-Þ]/g)||[]).length;
 return letters?upp/letters:0;
};
const likelyName=s=>clean(s).length>=8&&/[a-zà-ÿ]/i.test(s)&&
 (uppercaseRatio(s)>.53||/\b(?:NETTO|JAMBON|LASAGNE|YAOURT|FROMAGE|PIZZA|CAF[EÉ]|CHOCOLAT|BISCUIT|SAUMON|POULET|RIZ|PÂTES)\b/i.test(s)) &&
 !banned.test(s)&&!/^\d[.,\d\s€%]+$/.test(s);
function linesForPage(items,pageWidth,pageHeight){
 const tokens=(items||[]).filter(t=>clean(t.str)).map(t=>({
  text:clean(t.str),x:Number(t.transform?.[4])||0,
  y:Math.round(pageHeight-(Number(t.transform?.[5])||0)),
  width:Number(t.width)||Math.max(8,clean(t.str).length*5),
  height:Math.max(6,Number(t.height)||9)
 })).sort((a,b)=>a.y-b.y||a.x-b.x);
 const rows=[];
 for(const token of tokens){
  let row=rows.find(r=>Math.abs(r.y-token.y)<=Math.max(3,Math.min(5,token.height*.43)));
  if(!row){row={y:token.y,tokens:[]};rows.push(row)}
  row.tokens.push(token);
 }
 const lines=[];
 for(const row of rows){
  row.tokens.sort((a,b)=>a.x-b.x);
  let current=null;
  for(const token of row.tokens){
   if(!current||token.x-current.right>Math.max(28,token.height*3)){
    if(current)lines.push(current);
    current={text:token.text,x:token.x,y:row.y,right:token.x+token.width}
   }else{
    current.text+=((token.x-current.right>2)?' ':'')+token.text;
    current.right=Math.max(current.right,token.x+token.width)
   }
  }
  if(current)lines.push(current)
 }
 return lines.sort((a,b)=>a.y-b.y||a.x-b.x)
  .map((r,i)=>({...r,id:i+1,pageWidth,selected:false}))
}
function offerAt(lines,i){
 const a=lines[i],t=clean(a.text);
 if(!money(t)|| (unit.test(t)&&!benefits.test(t)&&!(/\bprix\s*[:=]/i).test(t)))return false;
 return true
}
function candidateFrom(lines,index,pageNo){
 const anchor=lines[index];
 // Ne pas croiser les différentes colonnes d'un dépliant.
 const close=lines.map((v,i)=>({...v,i,d:Math.abs(v.y-anchor.y),dx:Math.abs(v.x-anchor.x)}))
  .filter(v=>v.d<=95&&v.dx<=135)
  .sort((a,b)=>a.d-b.d||a.dx-b.dx);
 const names=close.filter(v=>likelyName(v.text)&&v.i!==index&&v.y<=anchor.y+25)
  .sort((a,b)=>(Math.abs(a.y-anchor.y)*.75+Math.abs(a.x-anchor.x)*.25)-
                 (Math.abs(b.y-anchor.y)*.75+Math.abs(b.x-anchor.x)*.25));
 let name=names[0]?.text||'';
 if(!name&&likelyName(anchor.text))name=anchor.text.replace(euro,'').trim();
 const others=close.filter(v=>v.i!==index&&v.text!==name);
 const technical=others.filter(v=>tech.test(v.text)&&!(benefits.test(v.text)&&money(v.text)))
  .slice(0,4).sort((a,b)=>a.y-b.y).map(v=>v.text);
 const offers=[anchor.text];
 for(const nearby of others.filter(v=>v.y>=anchor.y-22&&v.y<=anchor.y+65&&(benefits.test(v.text)||money(v.text))&&(!unit.test(v.text)||benefits.test(v.text))).slice(0,4)){
  if(!offers.includes(nearby.text))offers.push(nearby.text)
 }
 // L'utilisateur devra confirmer ou corriger la correspondance nom/prix.
 return {product_name:clean(name)||'Référence à compléter',
  technical_details:clean([...new Set(technical)].join(' · ')),
  price_or_benefit:clean([...new Set(offers)].join(' · ')),
  source_page:pageNo,source_excerpt:clean([name,...technical,...offers].join(' | ')).slice(0,1500),
  extraction_confidence:name?'review':'manual',
  source_y:anchor.y,
  source_ids:[index,...names.slice(0,1).map(n=>n.i),...others.filter(x=>technical.includes(x.text)||offers.includes(x.text)).map(x=>x.i)]}
}
function parsePages(pages){
 const found=[],reports=[];
 for(const page of pages){
  const lines=page.lines||[];
  const anchors=lines.flatMap((v,i)=>offerAt(lines,i)?[i]:[]);
  const used=new Set();
  const items=[];
  for(const i of anchors){
   if(used.has(i))continue;
   const cand=candidateFrom(lines,i,page.number);
   for(const j of cand.source_ids)used.add(j);
   items.push(cand)
  }
  const review=lines.filter((x,i)=>!used.has(i)&&x.text.length>5)
   .map(x=>({text:x.text,page:page.number,x:x.x,y:x.y}));
  found.push(...items);
  reports.push({number:page.number,lines:lines.length,detected:items.length,review,
   hasText:lines.length>0,checked:false})
 }
 return {products:found,reports}
}
function suggestDates(text){
 const s=clean(text).toLowerCase(),fr={janvier:1,janv:1,février:2,fevrier:2,févr:2,mars:3,avril:4,avr:4,mai:5,juin:6,juillet:7,août:8,aout:8,septembre:9,sept:9,octobre:10,oct:10,novembre:11,nov:11,décembre:12,decembre:12,déc:12};
 const pattern=/(?:du\s*)?(\d{1,2})\s*(janvier|janv|f[eé]vrier|f[eé]vr|mars|avril|avr|mai|juin|juillet|ao[uû]t|septembre|sept|octobre|oct|novembre|d[eé]cembre|d[eé]c)\s*(\d{4})?\s*(?:au|jusqu.au|-)\s*(\d{1,2})\s*(janvier|janv|f[eé]vrier|f[eé]vr|mars|avril|avr|mai|juin|juillet|ao[uû]t|septembre|sept|octobre|oct|novembre|d[eé]cembre|d[eé]c)\s*(\d{4})?/i;
 const m=s.match(pattern);if(!m)return null;
 const year=Number(m[6]||m[3]||new Date().getFullYear()),month1=fr[m[2]],month2=fr[m[5]];
 if(!month1||!month2)return null;
 const make=(y,mo,d)=>{const dt=new Date(Date.UTC(y,mo-1,Number(d)));return dt.getUTCMonth()===mo-1&&dt.getUTCDate()===Number(d)?dt.toISOString().slice(0,10):null};
 const from=make(Number(m[3]||year),month1,m[1]),until=make(year,month2,m[4]);
 return from&&until&&until>=from?{from,until}:null
}
root.NethorPromotionParser=Object.freeze({linesForPage,parsePages,suggestDates,likelyName,money})
})(window);

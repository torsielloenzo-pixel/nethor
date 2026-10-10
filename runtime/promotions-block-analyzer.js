/* Nethor Promotions · Analyse géométrique de blocs produits PDF.
   Conserve les limites des cartouches : un prix ne récupère plus le nom du bloc voisin.
   Travaille sur les positions PDF.js (ou OCR converties en positions PDF).
   Sans coordonnées fiables, revient au moteur texte existant plutôt que d'inventer.
*/
(function(root){
'use strict';
const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const safe=s=>clean(s).slice(0,1500);
const monetary=/(\d{1,4})\s*[.,]\s*(\d{2})\s*€|(\d{1,4})\s*€\s*(\d{2})?|€\s*(\d{1,4})\s*[.,]\s*(\d{2})/i;
const priceUnitRE=/(?:\b(?:le|la|les|l['’])\s*(?:kg|kilo|litre|l|lot|bo[iî]te|barquette|pi[eè]ce|unit[eé]|filet|sachet|paquet)\b|au\s*kg|\/\s*(?:kg|l)\b)/i;
const technicalRE=/(?:\b(?:calibre|cat[eé]gorie|vari[eé]t[eé]|poids|grammage|contenance|taux|quantit[eé])\s*:|\b\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|litres?)\b|\b\d+\s*[x×]\s*\d+|[€]\s*(?:le\s+)?kg|[€]\s*\/\s*(?:kg|l)|[0-9][,.][0-9]{2}\s*€\s*(?:le|au|\/)\s*(?:kg|l)\b)/i;
const extraRE=/(?:offre valable|autres produits|selon magasins|origine\s*:?\s*|transform[eé] (?:en|au)|fabriqu[eé] (?:en|au)|limit[eé]e? \s+[aà]|\*.+)/i;
const benefitRE=/\b(?:carte|caisse|achet[eé]s?|offerts?|gratuits?|r[eé]duction|remise|avantage|rembours[eé]|pay[eé]s?|lot\s+de)\b/i;
const noiseRE=/^(?:origine|transform[eé] (?:en|au)|france|italie|p[eé]rou|kenya|filet de|lot de|fruits et l[eé]gumes|viennoiseries et p[aâ]tisseries|boucherie|sur place|promotions?|prix au kilo|prix de vente|le kg|la bo[iî]te|le lot|l['’]unit[eé]|cat[eé]gorie \d+)$/i;
const headingRE=/^(?:viennoiseries?|p[aâ]tisseries?|fruits? et l[eé]gumes?|boissons?|boucherie|traiteur|produits? frais|poissonnerie|cr[eé]merie|surgel[eé]s?)(?:\s+(?:et|&)\s+\S+)*$/i;
function isNoise(value){
 const t=clean(value);
 return !t||noiseRE.test(t)||headingRE.test(t)||/^origine(?:\s+[a-zà-ÿ ]{1,25})?$/i.test(t)||
   /^(?:filet|lot)\s+de\s+\d+\s*(?:kg|pi[eè]ces?)?$/i.test(t)||
   /^(?:transform[eé]|origine|fabrication)\s+(?:en|au|du|de)\s+[a-zà-ÿ -]{1,38}$/i.test(t)
}
function lineScore(line){
 const s=clean(line.text),m=s.match(monetary);
 if(!m)return -100;
 const size=Number(line.height)||10;
 let score=4+(s.length<=16?3:0)+(size>=14?3:size>=11?1:0);
 if(/\b(?:prix\s*(?:au|du)\s*kg|prix\s*kil[oé]m[eè]trique|€\s*\/\s*kg)\b/i.test(s))score-=7;
 if(/(?:\d+\s*(?:g|kg|ml|cl)\s*[-–,:])|[0-9][,.]\d{2}\s*€\s*(?:le\s*kg|\/\s*kg)/i.test(s)&&s.length>14)score-=6;
 if(benefitRE.test(s)&&s.length>16)score-=3;
 if(s.length>42)score-=2;
 return score
}
function printedPrice(line,lines){
 const s=clean(line.text);
 let m=s.match(/(\d{1,4})\s*[.,]\s*(\d{2})\s*€/);
 if(m)return{price:m[1]+','+m[2]+' €',used:[line.id]};
 m=s.match(/(\d{1,4})\s*€\s*(\d{2})(?!\d)/);
 if(m)return{price:m[1]+','+m[2]+' €',used:[line.id]};
 m=s.match(/€\s*(\d{1,4})\s*[.,]\s*(\d{2})/);
 if(m)return{price:m[1]+','+m[2]+' €',used:[line.id]};
 m=s.match(/(?:^|\s)(\d{1,4})\s*€(?!\s*\d{2})/);
 if(!m)return null;
 const nearby=lines.filter(other=>other.id!==line.id&&/^\d{2}$/.test(clean(other.text))&&
  Math.abs(other.y-line.y)<=Math.max(23,(line.height||10)*2.5)&&
  other.x>=line.x-12&&other.x<=line.x+Math.max(63,(line.width||0)+20))
  .sort((a,b)=>Math.abs(a.y-line.y)-Math.abs(b.y-line.y))[0];
 return nearby?{price:m[1]+','+clean(nearby.text)+' €',used:[line.id,nearby.id]}
              :{price:m[1]+' €',used:[line.id],uncertain:true}
}
function prepareLines(lines){
 return (lines||[]).filter(x=>clean(x.text)).map((line,i)=>({
   ...line,id:Number.isFinite(Number(line.id))?Number(line.id):i+1,
   text:clean(line.text),x:Number(line.x)||0,y:Number(line.y)||0,
   width:Math.max(1,Number(line.width)||clean(line.text).length*4),
   height:Math.max(5,Number(line.height)||10)
 }))
}
function estimateColumns(anchors,pageWidth){
 if(anchors.length<2)return 1;
 const threshold=pageWidth*.17,distinct=[];
 for(const a of [...anchors].sort((a,b)=>a.x-b.x)){
  const match=distinct.find(v=>Math.abs(v.x-a.x)<threshold);
  if(match){match.x=(match.x*match.n+a.x)/(match.n+1);match.n++}
  else distinct.push({x:a.x,n:1})
 }
 if(distinct.length<=1)return 1;
 if(distinct.length>=4&&pageWidth>850)return Math.min(4,distinct.length);
 if(distinct.length>=3&&pageWidth>430&&
   distinct[distinct.length-1].x-distinct[0].x>pageWidth*.57)return 3;
 return 2
}
function regionsForPage(lines,pageWidth,pageHeight){
 const candidate=lines.filter(l=>lineScore(l)>=4);
 if(candidate.length<2)return [];
 const columns=estimateColumns(candidate,pageWidth);
 if(columns<2&&!candidate.some(l=>l.y>pageHeight*.65)&&candidate.length<3)return [];
 const rowAnchors=[...candidate].sort((a,b)=>a.y-b.y);
 const rowClusters=[];
 const tolerance=Math.max(48,Math.min(105,pageHeight*.092));
 for(const line of rowAnchors){
  let cluster=rowClusters.find(a=>Math.abs(a.y-line.y)<tolerance);
  if(!cluster){cluster={y:line.y,n:1};rowClusters.push(cluster)}
  else{cluster.y=(cluster.y*cluster.n+line.y)/(cluster.n+1);cluster.n++}
 }
 rowClusters.sort((a,b)=>a.y-b.y);
 const rowBounds=[0,...rowClusters.slice(1).map((r,i)=>(r.y+rowClusters[i].y)/2),pageHeight+3];
 if(!rowClusters.length)return [];
 const width=pageWidth/columns,regions=[];
 for(let ri=0;ri<rowClusters.length;ri++){
  for(let ci=0;ci<columns;ci++){
   const x0=ci*width,x1=(ci+1)*width,y0=rowBounds[ri],y1=rowBounds[ri+1];
   const inRegion=lines.filter(l=>{
    const mid=l.x+Math.min(l.width,35)*.5;
    return mid>=x0-2&&mid<x1+2&&l.y>=y0&&l.y<y1
   });
   if(!inRegion.length)continue;
   const prices=inRegion.filter(x=>lineScore(x)>=4);
   if(!prices.length)continue;
   regions.push({x:x0,y:y0,width,height:y1-y0,
    pageWidth,pageHeight,lines:inRegion,anchors:prices,row:ri,column:ci})
  }
 }
 return regions
}
function isName(value,core){
 const s=clean(value);
 if(s.length<5||s.length>250||isNoise(s)||monetary.test(s)||technicalRE.test(s)||
  extraRE.test(s)||priceUnitRE.test(s))return false;
 if(/^(?:calibre|cat[eé]gorie|vari[eé]t[eé])\s*:/i.test(s))return false;
 if(core.likelyName(s))return true;
 // Les petits noms sur étiquettes produits ne sont pas forcément des mots de dictionnaire.
 const uppercase=(s.match(/[A-ZÀ-Þ]/g)||[]).length,letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
 return letters>=5&&uppercase/letters>=.64
}
function uniqueStrings(arr){
 return [...new Set(arr.map(clean).filter(Boolean))]
}
function pickMainPrice(block){
 const ranked=block.anchors.map(line=>{
  const parsed=printedPrice(line,block.lines);
  return{line,parsed,score:lineScore(line)+(parsed&&!parsed.uncertain?2:0)-
   (line.x-block.x)/Math.max(1,block.width)*1.5}
 }).filter(x=>x.parsed).sort((a,b)=>b.score-a.score);
 return ranked[0]||null
}
function nameInBlock(block,anchor,core){
 const names=block.lines.filter(l=>isName(l.text,core)&&l.id!==anchor.id)
  .map(l=>({line:l,dist:Math.abs(l.y-anchor.y)+Math.abs(l.x-anchor.x)*.27,
   score:(core.likelyName(l.text)?12:5)-
     Math.abs(l.y-anchor.y)*.085-Math.abs(l.x-anchor.x)*.038+
     (l.x>anchor.x?2:0)+(l.text.length>=9&&l.text.length<=65?2:0)}))
  .sort((a,b)=>b.score-a.score);
 if(!names.length){
  // Dernier recours : nom et prix réunis dans la même ligne.
  const same=anchor.text.replace(monetary,'').replace(/^prix\s*[:=]?\s*/i,'').trim();
  return isName(same,core)?{name:same,ids:[anchor.id]}:null
 }
 let line=names[0].line,name=line.text,ids=[line.id];
 const continuations=block.lines.filter(x=>x.id!==line.id&&
   Math.abs(x.x-line.x)<=24&&x.y>line.y&&x.y-line.y<=22&&
   isName(x.text,core)&&x.text.length<85)
  .sort((a,b)=>a.y-b.y).slice(0,2);
 for(const next of continuations){
  if(name.length+next.text.length>280)break;
  name+=' '+next.text;ids.push(next.id)
 }
 return{name:clean(name).slice(0,500),ids}
}
function priceUnitInBlock(block,price){
 const center=price.line;
 const other=block.lines.filter(l=>l.id!==center.id&&priceUnitRE.test(l.text)&&
  l.text.length<=42&&Math.abs(l.y-center.y)<=36&&
  l.x<=center.x+Math.max(115,block.width*.40))
  .sort((a,b)=>Math.abs(a.y-center.y)-Math.abs(b.y-center.y));
 const raw=other[0]?.text||center.text;
 const matched=raw.match(/(?:la\s+bo[iî]te\s+de\s+\d+|le\s+filet\s+de\s+\d+\s*kg|le\s+lot\s+de\s+\d+|l['’]unit[eé]|le\s+kg|au\s+kg|le\s+litre|la\s+pi[eè]ce|le\s+sachet|la\s+barquette)/i);
 return{value:matched?clean(matched[0]):'',used:matched&&other[0]?[other[0].id]:[]}
}
function itemFromBlock(block,core,page){
 const primary=pickMainPrice(block);if(!primary)return null;
 const named=nameInBlock(block,primary.line,core);if(!named)return null;
 const excluded=new Set([...primary.parsed.used,...named.ids]);
 const {value:priceUnit,used:unitIds}=priceUnitInBlock(block,primary);
 unitIds.forEach(id=>excluded.add(id));
 const technical=[],extras=[],benefits=[];
 for(const l of [...block.lines].sort((a,b)=>a.y-b.y||a.x-b.x)){
  if(excluded.has(l.id))continue;
  if(isNoise(l.text)&&!extraRE.test(l.text))continue;
  if(extraRE.test(l.text)){extras.push(l.text);excluded.add(l.id);continue}
  if(technicalRE.test(l.text)&&(!monetary.test(l.text)||/kg|g|l\b|calibre|vari[eé]t[eé]|cat[eé]gorie/i.test(l.text))){
   technical.push(l.text);excluded.add(l.id);continue
  }
  if((benefitRE.test(l.text)||monetary.test(l.text))&&
     (l.y>=primary.line.y-38&&l.y<=primary.line.y+90)&&!/^prix\s*au\s*kg/i.test(l.text)){
   benefits.push(l.text);excluded.add(l.id)
  }
 }
 const tech=uniqueStrings(technical).join(' · ').slice(0,1200);
 const info=uniqueStrings(extras).join(' · ').slice(0,1200);
 const offer=[primary.parsed.price,...uniqueStrings(benefits)].join(' · ').slice(0,1200);
 const category=core.categoryOf(named.name);
 const auto_uncertain=Boolean(primary.parsed.uncertain||category==='À classer'||
   !named.name||!priceUnit&&primary.parsed.price.endsWith(' €')&&primary.line.text.length<=4);
 const bbox={x:Math.round(block.x),y:Math.round(block.y),width:Math.round(block.width),
   height:Math.round(block.height),page_width:Math.round(block.pageWidth),
   page_height:Math.round(block.pageHeight),row:block.row,column:block.column};
 return{product_name:named.name,technical_details:tech,price_or_benefit:offer,
  price_unit:priceUnit,additional_info:info,category,source_page:page,
  source_excerpt:safe([named.name,tech,offer,info].filter(Boolean).join(' | ')),
  source_block:bbox,extraction_confidence:auto_uncertain?'review':'high',auto_uncertain,
  source_ids:[...excluded],source_y:primary.line.y}
}
function parsePages(pages,core){
 if(!core||typeof core.parsePages!=='function')throw new Error('Moteur de base Promotions absent');
 const products=[],reports=[];
 for(const page of pages||[]){
  const lines=prepareLines(page.lines),pageWidth=Number(page.width||lines[0]?.pageWidth)||0;
  const pageHeight=Number(page.height||lines[0]?.pageHeight)||0;
  const blocks=pageWidth&&pageHeight?regionsForPage(lines,pageWidth,pageHeight):[];
  const detected=blocks.map(b=>itemFromBlock(b,core,page.number)).filter(Boolean);
  if(!detected.length){
   // Les pages en 1 seule colonne ou sans prix géométrique restent analysées.
   const legacy=core.parsePages([{number:page.number,lines}]);
   products.push(...legacy.products.map(p=>({
    ...p,price_unit:'',additional_info:'',source_block:{},
    auto_uncertain:true,extraction_confidence:'review'
   })));
   reports.push(...legacy.reports.map(r=>({...r,blocks_detected:0,analysis_mode:'legacy'})));
   continue
  }
  const used=new Set(detected.flatMap(x=>x.source_ids));
  const leftovers=lines.filter(x=>!used.has(x.id)&&x.text.length>5)
    .map(x=>({text:x.text,page:page.number,x:x.x,y:x.y}));
  const sorted=detected.sort((a,b)=>a.source_block.row-b.source_block.row||
      a.source_block.column-b.source_block.column);
  products.push(...sorted.map(({source_ids,source_y,...item})=>item));
  reports.push({number:page.number,lines:lines.length,detected:sorted.length,
   blocks_detected:blocks.length,analysis_mode:'spatial-blocks',
   hasText:lines.some(x=>x.text.length>=4),
   uncertain:sorted.filter(x=>x.auto_uncertain).length,
   unmatched:leftovers.length,review:leftovers})
 }
 return{products,reports}
}
root.NethorPromotionsBlocks=Object.freeze({
 parsePages,regionsForPage,printedPrice,priceUnitInBlock,itemFromBlock
})
})(window);
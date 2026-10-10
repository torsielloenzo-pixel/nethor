/* Nethor Promotions : analyse automatique (sans validation humaine).
   Algorithme prudent : date introuvable => refus ; candidat incertain => tracé,
   jamais d'invention de prix.  Les scans sans texte restent non exploitables. */
(function(root){
'use strict';
const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const moneyPattern=/(?:\d{1,4}[.,]\d{2}\s*€|€\s*\d{1,4}[.,]\d{2}|\d{1,4}\s*€)/i;
const money=s=>moneyPattern.test(s)||(/\b\d{1,3}[.,]\d{2}\b/.test(s)&&/\b(?:carte|caisse|pay[eé]|prix|avantage|offre)\b/i.test(s));
const technical=/\b(?:\d+(?:[,.]\d+)?\s*(?:g|kg|ml|cl|l|litres?|pi[eè]ces?|tranches?|unit[eé]s?)\b|\d+\s*[x×]\s*\d+|le\s*kg|au\s*kg|le\s*litre|\/\s*kg|\/\s*l\b|kg\s*\^?\s*[-.]?1)\b/i;
const perUnit=/(?:\b(?:le|au|par)\s*(?:kg|kilo|litre)\b|\/\s*(?:kg|l)\b|100\s*g)/i;
const benefits=/\b(?:carte|caisse|achet[eé]s?|offert|gratuits?|r[eé]duction|remise|avantage|rembours[eé]|lot|prix|pay[eé]s?|\d\s*pour\s*\d)\b/i;
const blacklist=/\b(?:promotions?|catalogue|d[eé]couvrez|s[eé]lection|valable|conditions|magasin|profitez|bons plans|économisez|sous r[eé]serve|fid[eé]lit[eé]|intermarch[eé]|netto\.fr|mentions l[eé]gales)\b/i;
const productWords=/\b(?:LASAGNES?|JAMBON|LARDONS?|POULET|BOEUF|SAUMON|THON|FROMAGES?|EMMENTAL|BEURRE|LAIT|YAOURTS?|FROMAGE|CREME|CR[EÈ]ME|PIZZA|PAIN|CROISSANTS?|PATES?|PÂTES?|RIZ|BISCUITS?|CHOCOLAT|CAF[EÉ]|BONBONS?|C[EÉ]R[EÉ]ALES|EAU|JUS|SODA|BI[EÈ]RE|SHAMPOOING|DENTIFRICE|LESSIVE|CROQUETTES?|FRAISES?|POMMES?|BANANES?|SALADES?|TOMATES?|POMMES\s+DE\s+TERRE|OEUFS?|OEUF|ŒUFS?|ŒUF|FARINE|SUCRE|HUILE|CONFITURE|VIENNOISERIES?|NUGGETS?|GLACES?|SORBET|FILETS?|STEAK|SAVON|GEL\s+DOUCHE)\b/i;
function uppercaseRatio(s){
 const a=(s.match(/[A-Za-zÀ-ÿ]/g)||[]),b=(s.match(/[A-ZÀ-Þ]/g)||[]);
 return a.length?b.length/a.length:0
}
function likelyName(s){
 const t=clean(s);
 return t.length>=7&&t.length<=300&&/[a-zà-ÿ]/i.test(t)&&!blacklist.test(t)
 && !/^\d[.,\d\s€%]+$/.test(t)&&!(money(t)&&!productWords.test(t))
 && (uppercaseRatio(t)>.50||productWords.test(t))
}
const categories=[
 ['Fruits et légumes',/\b(?:POMME|POIRE|BANANE|TOMATE|CAROTTE|SALADE|FRAISE|OIGNON|POMMES?\s+DE\s+TERRE|CONCOMBRE|COURGETTE|CITRON|ORANGE|RAISIN|KIWI|AVOCAT|CHOU|L[EÉ]GUME|FRUIT)S?\b/i],
 ['Surgelés',/\b(?:SURGEL[EÉ]|CONGEL[EÉ]|GLACE|SORBET|ESQUIMAU|NUGGET|FRITES?\s+SURGEL[EÉ])S?\b/i],
 ['Frais et crémerie',/\b(?:JAMBON|LARDON|POULET|SAUMON|BEURRE|LAIT|YAOURT|FROMAGE|CR[EÈ]ME\s+FRA[IÎ]CHE|EMMENTAL|MOZZARELLA|RACLETTE|ŒUFS?|OEUFS?|CHARCUTERIE|STEAK|DESSERT\s+LACT[EÉ])S?\b/i],
 ['Boissons',/\b(?:SODA|COLA|JUS|NECTAR|LIMONADE|SIROP|BI[EÈ]RE|EAU\s+(?:MIN[EÉ]RALE|GAZEUSE|DE\s+SOURCE)|BOISSON|TH[EÉ]\s+GLAC[EÉ])S?\b/i],
 ['Animaux',/\b(?:CROQUETTE|CHAT|CHIEN|LITI[EÈ]RE|PÂT[EÉ]E\s+ANIMALE|ANIMAUX)S?\b/i],
 ['Hygiène et entretien',/\b(?:SHAMPOOING|SAVON|DENTIFRICE|GEL\s+DOUCHE|LESSIVE|ASSOUPLISSANT|D[EÉ]ODORANT|D[EÉ]TERGENT|NETTOYANT|D[EÉ]SINFECTANT|PAPIER\s+TOILETTE|ESSUIE.TOUT|COUCHES?)\b/i],
 ['Épicerie sucrée',/\b(?:BISCUIT|CHOCOLAT|BONBON|CONFITURE|C[EÉ]R[EÉ]ALE|GÂTEAU|GATEAU|MADELEINE|SUCRE|MIEL|PÂTE\s+[AÀ]\s+TARTINER)S?\b/i],
 ['Épicerie salée',/\b(?:LASAGNE|PIZZA|PÂTE|PATE|RIZ|THON|HUILE|VINAIGRE|SAUCE|SOUPE|FARINE|CONSERVE|CHIPS|AP[EÉ]RITIF|QUICHE|RAVIOLI)S?\b/i],
 ['Boulangerie',/\b(?:PAIN|CROISSANT|BRIOCHE|BAGUETTE|VIENNOISERIE)S?\b/i],
 ['Maison',/\b(?:PO[EÊ]LE|VERRE|ASSIETTE|COUVERT|BO[IÎ]TE\s+DE\s+RANGEMENT|PILE|BOUGIE|CUISINE|TEXTILE)S?\b/i]
];
function categoryOf(text){
 for(const [category,rx] of categories){if(rx.test(text))return category}
 return 'À classer'
}
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
  row.tokens.push(token)
 }
 const lines=[];
 for(const row of rows){
  row.tokens.sort((a,b)=>a.x-b.x);let current=null;
  for(const token of row.tokens){
   if(!current||token.x-current.right>Math.max(28,token.height*3)){
    if(current)lines.push(current);
    current={text:token.text,x:token.x,y:row.y,right:token.x+token.width,height:token.height}
   }else{
    current.text+=((token.x-current.right>2)?' ':'')+token.text;
    current.right=Math.max(current.right,token.x+token.width);
    current.height=Math.max(current.height,token.height)
   }
  }
  if(current)lines.push(current)
 }
 return lines.sort((a,b)=>a.y-b.y||a.x-b.x).map((r,i)=>({...r,id:i+1,pageWidth,pageHeight}))
}
function isOffer(s){
 const t=clean(s);
 return money(t)&&!(perUnit.test(t)&&!benefits.test(t)&&!/(?:prix\s*[:=]|l['’]unit[eé])/i.test(t))
}
function offerParts(value){
 const text=clean(value);
 if(!text)return{price:'',details:''};
 const m=text.match(/\b(?:prix\s*[:=]?|l['’]unit[eé])\s*(\d+[,.]\d{2}\s*€)/i);
 if(m)return{price:m[0],details:clean(text.replace(m[0],''))};
 const last=[...text.matchAll(/\d{1,4}[.,]\d{2}\s*€/g)];
 if(last.length&&technical.test(text)&&perUnit.test(text)&&last.length>1){
  const p=last[last.length-1];return{price:p[0],details:clean(text.replace(p[0],''))}
 }
 return{price:text,details:''}
}
function candidateFrom(lines,index,pageNo){
 const a=lines[index],dist=lines.map((v,i)=>({...v,i,dy:Math.abs(v.y-a.y),dx:Math.abs(v.x-a.x)}))
 .filter(v=>v.dy<=110&&v.dx<=150).sort((x,y)=>x.dy-y.dy||x.dx-y.dx);
 const names=dist.filter(v=>v.i!==index&&likelyName(v.text)&&v.y<=a.y+18
  &&(!isOffer(v.text)||productWords.test(v.text)))
 .sort((x,y)=>(x.dy+x.dx*.18)-(y.dy+y.dx*.18));
 const raw=a.text,split=offerParts(raw);
 const ownName=likelyName(raw)&&productWords.test(raw)?clean(raw.split(/(?:prix\s*[:=]|\d+[,.]\d{2}\s*€)/i)[0]):'';
 const name=clean(names[0]?.text||ownName);
 const other=dist.filter(v=>v.i!==index&&v.text!==name);
 const details=other.filter(v=>technical.test(v.text)&&!(isOffer(v.text)&&!perUnit.test(v.text)))
 .slice(0,4).sort((x,y)=>x.y-y.y).map(v=>v.text);
 if(split.details)details.push(split.details);
 const offers=[split.price];
 for(const v of other.filter(v=>v.y>=a.y-24&&v.y<=a.y+70&&
  (benefits.test(v.text)||isOffer(v.text))&&(!perUnit.test(v.text)||benefits.test(v.text))).slice(0,4)){
  if(!offers.includes(v.text))offers.push(v.text)
 }
 const tech=[...new Set(details.map(clean).filter(Boolean))].join(' · ');
 const price=[...new Set(offers.map(clean).filter(Boolean))].join(' · ');
 return {product_name:name,technical_details:tech,price_or_benefit:price,
  category:categoryOf(name),source_page:pageNo,
  source_excerpt:clean([name,tech,price].filter(Boolean).join(' | ')).slice(0,1500),
  extraction_confidence:'review',auto_uncertain:(!name||name.length<8||price.length<4),
  source_y:a.y,source_ids:[index,...names.slice(0,1).map(x=>x.i),
   ...other.filter(x=>details.includes(x.text)||offers.includes(x.text)).map(x=>x.i)]}
}
function parsePages(pages){
 const found=[],reports=[];
 for(const page of pages){
  const lines=page.lines||[],used=new Set(),byPage=[];
  const anchors=lines.flatMap((l,i)=>isOffer(l.text)?[i]:[]);
  for(const i of anchors){
   if(used.has(i))continue;
   const c=candidateFrom(lines,i,page.number);
   if(!c.product_name)continue; // prix sans produit identifiable : diagnostic, pas d'invention.
   for(const id of c.source_ids)used.add(id);
   const duplicate=byPage.find(p=>p.product_name===c.product_name&&
       Math.abs(p.source_y-c.source_y)<120);
   if(duplicate){
    const parts=[...new Set([duplicate.price_or_benefit,c.price_or_benefit].filter(Boolean))];
    duplicate.price_or_benefit=parts.join(' · ');duplicate.auto_uncertain=true;
   }else byPage.push(c)
  }
  // Les noms de produits visibles sans prix détectable restent répertoriés
  // plutôt que supprimés. Le prix inconnu est explicitement signalé.
  for(let i=0;i<lines.length;i++){
   const l=lines[i],label=clean(l.text);
   if(used.has(i)||!likelyName(label))continue;
   if(byPage.some(p=>p.product_name===label&&Math.abs(p.source_y-l.y)<100))continue;
   const neighbors=lines.map((v,j)=>({...v,j})).filter(x=>x.j!==i&&
    Math.abs(x.x-l.x)<=105&&Math.abs(x.y-l.y)<=52&&technical.test(x.text)&&!isOffer(x.text));
   const mention=productWords.test(label)||neighbors.length>0;
   if(!mention)continue;
   byPage.push({product_name:label.slice(0,500),
    technical_details:neighbors.slice(0,3).map(x=>x.text).join(' · ').slice(0,1200),
    price_or_benefit:'Prix non détecté',category:categoryOf(label),source_page:page.number,
    source_excerpt:label.slice(0,1500),extraction_confidence:'review',auto_uncertain:true,
    source_y:l.y,source_ids:[i]});
   used.add(i)
  }
  const unresolved=lines.filter((l,i)=>!used.has(i)&&l.text.length>5)
   .map(l=>({text:l.text,page:page.number,x:l.x,y:l.y}));
  for(const p of byPage){
   const {source_y,source_ids,...save}=p;found.push(save)
  }
  reports.push({number:page.number,lines:lines.length,detected:byPage.length,
   hasText:lines.some(l=>l.text.length>=4),
   uncertain:byPage.filter(x=>x.auto_uncertain).length,
   unmatched:unresolved.length,review:unresolved})
 }
 return{products:found,reports}
}

const months={janvier:1,janv:1,jan:1,février:2,fevrier:2,févr:2,fevr:2,fév:2,fev:2,mars:3,avril:4,avr:4,mai:5,juin:6,juillet:7,juil:7,août:8,aout:8,septembre:9,sept:9,octobre:10,oct:10,novembre:11,nov:11,décembre:12,decembre:12,déc:12,dec:12};
const monthRX='janvier|janv\\.?|jan\\.?|f[eé]vrier|f[eé]vr\\.?|f[eé]v\\.?|mars|avril|avr\\.?|mai|juin|juillet|juil\\.?|ao[uû]t|septembre|sept\\.?|octobre|oct\\.?|novembre|nov\\.?|d[eé]cembre|d[eé]c\\.?';
const normalizeMonth=s=>months[String(s||'').toLowerCase().replace(/\.$/,'')];
function dateUTC(y,mon,day){
 if(!Number.isInteger(y)||y<2020||y>2100)return null;
 const d=new Date(Date.UTC(y,mon-1,day));
 return d.getUTCFullYear()===y&&d.getUTCMonth()===mon-1&&d.getUTCDate()===day?
  d.toISOString().slice(0,10):null
}
function weekFor(dateISO){
 const d=new Date(dateISO+'T00:00:00Z');
 if(Number.isNaN(d.getTime()))return null;
 const dow=(d.getUTCDay()+6)%7;
 const monday=new Date(d.getTime()-dow*86400000),sunday=new Date(monday.getTime()+6*86400000);
 const thursday=new Date(monday.getTime()+3*86400000),isoYear=thursday.getUTCFullYear();
 const yearFirst=new Date(Date.UTC(isoYear,0,4));
 const firstMonday=new Date(yearFirst.getTime()-((yearFirst.getUTCDay()+6)%7)*86400000);
 const isoWeek=1+Math.round((monday.getTime()-firstMonday.getTime())/(7*86400000));
 const str=d=>d.toISOString().slice(0,10);
 return{week_start:str(monday),week_end:str(sunday),iso_week:isoWeek,iso_year:isoYear,
  title:'Promotions Netto - Semaine '+String(isoWeek).padStart(2,'0')}
}
function suggestDates(text,filename=''){
 const s=clean(text).toLowerCase().replace(/[–—]/g,'-'),
  hints=clean(filename+' '+s).match(/\b20\d{2}\b/g)||[],
  yearHint=hints.length?Number(hints[0]):null;
 const candidates=[];
 function push(y1,m1,d1,y2,m2,d2,confidence,at){
  if(!y1||!y2)return;
  const a=dateUTC(Number(y1),Number(m1),Number(d1)),
        b=dateUTC(Number(y2),Number(m2),Number(d2));
  if(!a||!b)return;
  const duration=(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
  if(duration<0||duration>45)return;
  candidates.push({from:a,until:b,score:confidence+Math.max(0,20-at/1000)-duration*.02});
 }
 // "du 6/10 au 12/10/2026", "06.10.2026 - 12.10.2026"
 const numeric=/(?:du\s*)?(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(20\d{2}))?\s*(?:au|jusqu['’]au|[-–])\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(20\d{2}))?/gi;
 for(const m of s.matchAll(numeric)){
  const y2=m[6]?Number(m[6]):m[3]?Number(m[3]):yearHint;
  const y1=m[3]?Number(m[3]):y2;
  push(y1,+m[2],+m[1],y2,+m[5],+m[4],85,m.index)
 }
 // "du mardi 6 octobre au lundi 12 octobre 2026", "6 oct - 12 oct 2026"
 const textTwo=new RegExp('(?:du\\s*)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\\s*(\\d{1,2})\\s*('+monthRX+')\\s*(20\\d{2})?\\s*(?:au|jusqu[’\\x27]au|[-–])\\s*(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\\s*(\\d{1,2})\\s*('+monthRX+')\\s*(20\\d{2})?','gi');
 for(const m of s.matchAll(textTwo)){
  const m1=normalizeMonth(m[2]),m2=normalizeMonth(m[5]);
  const y2=m[6]?+m[6]:m[3]?+m[3]:yearHint;
  let y1=m[3]?+m[3]:y2;
  if(!m[3]&&m1===12&&m2===1)y1=y2-1;
  push(y1,m1,+m[1],y2,m2,+m[4],100,m.index)
 }
 // "du 6 au 12 octobre 2026" (même mois).
 const textSingle=new RegExp('(?:du\\s*)?(\\d{1,2})\\s*(?:au|jusqu[’\\x27]au|[-–])\\s*(\\d{1,2})\\s*('+monthRX+')\\s*(20\\d{2})?','gi');
 for(const m of s.matchAll(textSingle)){
  const y=m[4]?+m[4]:yearHint,mon=normalizeMonth(m[3]);
  push(y,mon,+m[1],y,mon,+m[2],90,m.index)
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates.length?{from:candidates[0].from,until:candidates[0].until}:null
}
function extractMetadata(pages,filename=''){
 // Les mentions de couverture sont privilégiées et le reste du catalogue
 // sert de filet de sécurité, sans extrapoler à partir de la date actuelle.
 const first=pages.slice(0,3).map(p=>p.lines.map(x=>x.text).join(' ')).join(' ');
 const rest=pages.slice(3).map(p=>p.lines.map(x=>x.text).join(' ')).join(' ');
 const dates=suggestDates(first,filename)||suggestDates(rest,filename);
 return dates?{...dates,...weekFor(dates.from)}:null
}
root.NethorPromotionParser=Object.freeze({
 linesForPage,parsePages,suggestDates,extractMetadata,weekFor,categoryOf,likelyName,money
})
})(window);

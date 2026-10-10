/* Nethor — calendrier des livraisons récurrentes.
   Source principale: public.store_delivery_schedule (Supabase, RLS).
   Les règles ci-dessous ne servent que de secours en cas d'indisponibilité réseau.
   Un flux régulier = une catégorie habituelle, PAS un nombre de camions confirmés. */
(function(){
'use strict';
if(window.NethorDeliverySchedule)return;
const DEFAULT_RULES=Object.freeze([
 {code:'frais_traiteur_ppi',label:'Traiteur & PPI',category:'frais',weekdays:[2,4,6],certainty:'habituel',period:'nuit',note:'Livraison de nuit, hors compteur.',sort_order:10},
 {code:'frais_cremerie',label:'Crémerie',category:'frais',weekdays:[1,3,5],certainty:'habituel',period:'nuit',note:'Livraison de nuit, hors compteur.',sort_order:20},
 {code:'frais_fruits_legumes',label:'Fruits & Légumes',category:'frais',weekdays:[1,2,3,4,5,6],certainty:'habituel',period:'nuit',note:'Livraison de nuit, hors compteur.',sort_order:30},
 {code:'gel_habituel',label:'Gel',category:'gel',weekdays:[2,5],certainty:'habituel',period:'non_precise',note:'Horaire non précisé.',sort_order:40},
 {code:'gel_mercredi_possible',label:'Gel',category:'gel',weekdays:[3],certainty:'possible',period:'non_precise',note:'Passage occasionnel du mercredi, à confirmer.',sort_order:50},
 {code:'sec_habituel',label:'Sec',category:'sec',weekdays:[2,4,5],certainty:'habituel',period:'journee',window_start:'12:00',window_end:'20:30',note:'Entre 12 h et 20 h 30.',sort_order:60}
]);
function validDate(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
 if(!m)return null;
 const date=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return date.toISOString().slice(0,10)===value?date:null;
}
function addDays(iso,delta){
 const date=validDate(iso);
 if(!date)return'';
 date.setUTCDate(date.getUTCDate()+delta);
 return date.toISOString().slice(0,10)
}
function weekday(iso){
 const date=validDate(iso);
 if(!date)return null;
 return date.getUTCDay()||7; // ISO days: Monday=1, Sunday=7
}
function normalizeRule(raw){
 if(!raw||typeof raw!=='object')return null;
 const category=['frais','gel','sec'].includes(raw.category)?raw.category:null;
 const code=String(raw.code||'').trim().slice(0,100),label=String(raw.label||'').trim().slice(0,110);
 const days=[...new Set((Array.isArray(raw.weekdays)?raw.weekdays:[]).map(Number).filter(x=>Number.isInteger(x)&&x>=1&&x<=7))];
 if(!category||!code||!label||!days.length||raw.active===false)return null;
 const period=['nuit','journee','non_precise'].includes(raw.period)?raw.period:'non_precise';
 const clock=v=>{const m=/^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/.exec(String(v||''));return m?m[1]+':'+m[2]:null};
 return{
  code,label,category,weekdays:days,certainty:raw.certainty==='possible'?'possible':'habituel',period,
  window_start:clock(raw.window_start),window_end:clock(raw.window_end),
  note:String(raw.note||'').slice(0,250),
  sort_order:Number.isFinite(Number(raw.sort_order))?Number(raw.sort_order):100
 };
}
function normalizeRules(rows){return (Array.isArray(rows)?rows:[]).map(normalizeRule).filter(Boolean).sort((a,b)=>a.sort_order-b.sort_order||a.label.localeCompare(b.label,'fr'))}
function classify(date,rows){
 const day=weekday(date);
 const result={date,weekday:day,expected:[],possible:[],overnight:[],expectedCount:0,possibleCount:0,overnightCount:0};
 if(day===null)return result;
 for(const rule of rows){
  if(!rule.weekdays.includes(day))continue;
  // All nighttime deliveries are informational, never included in the KPI.
  if(rule.period==='nuit')result.overnight.push(rule);
  else if(rule.certainty==='possible')result.possible.push(rule);
  else result.expected.push(rule)
 }
 result.expectedCount=result.expected.length;
 result.possibleCount=result.possible.length;
 result.overnightCount=result.overnight.length;
 return result
}
function analyze(weekStart,rows,source='database'){
 const rules=normalizeRules(rows),days=Array.from({length:7},(_,i)=>classify(addDays(weekStart,i),rules));
 return{
  source:source==='database'?'database':'secours',weekStart,rules,days,
  weekExpected:days.reduce((n,d)=>n+d.expectedCount,0),
  weekPossible:days.reduce((n,d)=>n+d.possibleCount,0),
  weekOvernight:days.reduce((n,d)=>n+d.overnightCount,0)
 }
}
function resolve(response){
 const valid=!!response&&!response.error&&Array.isArray(response.data);
 const source=valid?'database':'secours';
 // An empty DB schedule is intentional. Never silently restore deleted rules.
 return{rows:valid?response.data:DEFAULT_RULES,source}
}
async function load(db){
 if(!db?.from)return resolve(null);
 try{
  const result=await db.from('store_delivery_schedule')
   .select('code,label,category,weekdays,certainty,period,window_start,window_end,note,active,sort_order')
   .eq('active',true).order('sort_order',{ascending:true});
  return resolve(result)
 }catch(e){console.warn('[Nethor] Calendrier des livraisons temporairement indisponible',e);return resolve(null)}
}
window.NethorDeliverySchedule=Object.freeze({DEFAULT_RULES,load,resolve,analyze,normalizeRules,weekday,addDays,classify});
})();
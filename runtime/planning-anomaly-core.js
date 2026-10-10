/* Nethor - calcul unique des anomalies, partagé par Planning et Accueil desktop.
   Les règles sont les mêmes : journées longues, créneaux courts, coupures,
   absences qui se chevauchent, couverture à une personne, différence au contrat. */
(function(){
'use strict';
if(window.NethorPlanningAnomalyCore)return;
const DAY_MS=86400000;
function norm(value){return String(value??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function numberOrNull(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
function plusDays(iso,count){
 const p=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
 if(!p)return '';
 const stamp=Date.UTC(+p[1],+p[2]-1,+p[3])+count*DAY_MS;
 return new Date(stamp).toISOString().slice(0,10)
}
function weekKeys(start){return Array.from({length:7},(_,i)=>plusDays(start,i))}
function profileFor(name,profiles=[]){
 const n=norm(name),base=n.replace(/\s+[a-z]$/,'');
 for(const field of ['planning_name','display_name']){
  const item=(profiles||[]).find(p=>{const candidate=norm(p?.[field]);return candidate&&(candidate===n||candidate===base)});
  if(item)return item;
 }
 return null
}
function workRanges(row=[],model={}){
 const output=[];let start=null;
 for(let i=0;i<=row.length;i++){
  const work=i<row.length&&(row[i]==='g'||row[i]==='b');
  if(work&&start===null)start=i;
  if(!work&&start!==null){output.push({a:(model.startTime??6)+start*.25,b:(model.startTime??6)+i*.25});start=null}
 }
 return output
}
function time(t){const h=Math.floor(t),minutes=Math.round((t-h)*60);return h+(minutes?':'+String(minutes).padStart(2,'0'):'')}
function shortDate(date){
 const p=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date||''));
 if(!p)return date||'—';
 return p[3]+'/'+p[2]
}
function typeLabel(v){return v==='leave'?'Congé':'Indisponibilité'}
function statusLabel(v){return({pending:'En attente',approved:'Validée',rejected:'Refusée',cancelled:'Annulée'})[v]||v}
function absencesFor(name,date,profiles,absences){
 const p=profileFor(name,profiles),id=p?.id,normal=norm(p?.display_name||name);
 return (absences||[]).filter(a=>{
  if(!['approved','pending'].includes(String(a?.status||'')))return false;
  if(!a?.start_date||!a?.end_date||date<a.start_date||date>a.end_date)return false;
  return id?String(a.user_id)===String(id):norm(a.display_name)===normal
 })
}
function contractItems(model,profiles=[]){
 if(!model)return[];
 const output=[];
 for(const emp of model.employees||[]){
  const total=numberOrNull(emp.excelWeekTotalHours),excelContract=numberOrNull(emp.excelContractHours),excelDifference=numberOrNull(emp.excelContractDifference),profile=profileFor(emp.name,profiles),profileContract=numberOrNull(profile?.contract_hours);
  const contract=excelContract??profileContract;
  const difference=excelDifference??(total!==null&&contract!==null?Math.round((total-contract)*100)/100:null);
  if(difference===null||Math.abs(difference)<.005)continue;
  output.push({
   level:'warn',kind:'contract-hours',icon:'≠',title:profile?.display_name||emp.name,
   detail:'Différence heures contrat',totalHours:total,contractHours:contract,contractDifference:difference
  })
 }
 return output.sort((a,b)=>Math.abs(b.contractDifference)-Math.abs(a.contractDifference))
}
function dayItems(model,date,profiles=[],absences=[]){
 const day=model?.days?.[date];if(!model||!day)return null;
 const output=[],rows=day.cells||[],employees=model.employees||[];
 employees.forEach((emp,index)=>{
  const row=rows[index]||[],total=row.reduce((n,v)=>n+(v==='g'||v==='b'?1:0),0)*.25,work=workRanges(row,model);
  const profile=profileFor(emp.name,profiles),label=profile?.display_name||emp.name;
  if(total>10)output.push({level:'warn',icon:'↗',title:label+' • journée longue',detail:String(total).replace('.',',')+' h planifiées — à vérifier selon votre organisation.'});
  for(const slot of work)if(slot.b-slot.a<=.5)output.push({level:'warn',icon:'⌁',title:label+' • créneau très court',detail:time(slot.a)+' à '+time(slot.b)+' ('+String((slot.b-slot.a)*60)+' min).'});
  for(let i=1;i<work.length;i++){const gap=work[i].a-work[i-1].b;if(gap>=2)output.push({level:'warn',icon:'Ⅱ',title:label+' • longue coupure',detail:String(Math.round(gap*100)/100).replace('.',',')+' h entre deux périodes de travail.'})}
  for(const absence of absencesFor(emp.name,date,profiles,absences))if(total>0)output.push({
   level:absence.status==='approved'?'alert':'warn',
   icon:absence.status==='approved'?'!':'?',
   title:label+' • '+statusLabel(absence.status).toLowerCase()+' mais horaires présents',
   detail:typeLabel(absence.type)+' du '+shortDate(absence.start_date)+' au '+shortDate(absence.end_date)+'.'
  })
 });
 const count=model.slotCount||58,start=model.startTime??6;
 const occupancy=Array.from({length:count},(_,i)=>({
  time:start+i*.25,count:rows.reduce((n,row)=>n+(row?.[i]==='g'||row?.[i]==='b'?1:0),0)
 }));
 const first=occupancy.findIndex(x=>x.count>0),last=occupancy.length-1-[...occupancy].reverse().findIndex(x=>x.count>0);
 if(first>=0&&last>=first){
  const covered=occupancy.slice(first,last+1),low=covered.filter(x=>x.count===1);
  if(low.length){
   const spans=[];let a=null;
   for(let i=0;i<=covered.length;i++){
    const solo=i<covered.length&&covered[i].count===1;
    if(solo&&a===null)a=i;
    if(!solo&&a!==null){spans.push({start:covered[a].time,end:covered[i-1].time+.25});a=null}
   }
   const summary=spans.map(x=>'de '+time(x.start)+' à '+time(x.end)).join(', puis ');
   output.push({level:'warn',icon:'1',title:'Couverture réduite',detail:'Une seule personne planifiée '+summary+' ('+low.length+' créneau'+(low.length>1?'x':'')+' de 15 min).'})
  }
 }
 return output
}
function analyze(model,weekStart,profiles=[],absences=[]){
 const start=weekStart||model?.weekStart;
 const dates=weekKeys(start),days=dates.map(date=>{const items=dayItems(model,date,profiles,absences);return{date,available:items!==null,items:items||[],count:items===null?null:items.length}});
 const weekItems=contractItems(model,profiles),dayTotal=days.reduce((sum,day)=>sum+(day.count??0),0),available=!!model&&days.some(day=>day.available);
 return{weekStart:start||'',available,days,weekItems,weekTotal:available?dayTotal+weekItems.length:null,dayTotal,contractTotal:weekItems.length}
}
window.NethorPlanningAnomalyCore=Object.freeze({analyze,dayItems,contractItems,weekKeys,plusDays});
})();

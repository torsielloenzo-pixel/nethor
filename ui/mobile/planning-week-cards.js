/* Nethor: weekly cards for the mobile planning reader. No data writes. */
(function(){
'use strict';
let filter='all';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const numeric=value=>value==null||String(value).trim()===''?null:(Number.isFinite(Number(String(value).replace(',','.')))?Number(String(value).replace(',','.')):null);
const time=value=>String(Math.floor(value)).padStart(2,'0')+':'+String(Math.round((value-Math.floor(value))*60)).padStart(2,'0');
const hours=value=>String(Math.round(value*100)/100).replace('.',',')+' h';
function numberOfWeek(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));return Math.ceil((((x-new Date(Date.UTC(x.getUTCFullYear(),0,1)))/86400000)+1)/7)}
function render(start,ctx){
 const {model,addDays,isoDate,rowRanges,avatarFor,isCurrentAgendaEmployee,dayShort,dayFull}=ctx;
 const selected=Math.min(6,Math.max(0,Number(ctx.currentDay)||0));
 const dates=Array.from({length:7},(_,i)=>{const date=addDays(start,i);return {date,key:isoDate(date),label:dayShort(date),number:date.getDate()}});
 const employees=(model?.employees||[]).map((employee,index)=>{
  const info=avatarFor(employee);
  const days=dates.map(d=>{
   const cells=model.days?.[d.key]?.cells?.[index]||[];
   const ranges=rowRanges(cells).filter(r=>r.c==='g'||r.c==='b');
   const status=ranges.length?'work':cells.includes('y')?'leave':cells.includes('w')?'unavailable':'off';
   return {ranges,status,total:ranges.reduce((sum,r)=>sum+r.b-r.a,0)}
  });
  const totalFromExcel=numeric(employee.excelWeekTotalHours),contract=numeric(employee.excelContractHours),diff=numeric(employee.excelContractDifference);
  return {info,days,contract,diff,total:totalFromExcel??days.reduce((sum,d)=>sum+d.total,0),isMe:isCurrentAgendaEmployee(employee)};
 });
 const selectedDate=dates[selected].date;
 const present=employees.filter(e=>e.days[selected].status==='work').length;
 const onLeave=employees.filter(e=>e.days[selected].status==='leave').length;
 const showMe=employees.some(e=>e.isMe);
 if(filter==='mine'&&!showMe)filter='all';
 let visible=employees.filter(e=>filter==='all'||filter==='working'&&e.days[selected].status==='work'||filter==='off'&&e.days[selected].status!=='work'||filter==='mine'&&e.isMe);
 visible=[...visible].sort((a,b)=>Number(b.isMe)-Number(a.isMe));
 let out='<div class="nthWeekDays" role="group" aria-label="Sélectionner un jour">';
 const today=isoDate(new Date());
 for(let i=0;i<7;i++){
  const d=dates[i],active=i===selected;
  out+='<button type="button" class="nthWeekDay'+(active?' selected':'')+(d.key===today?' today':'')+'" data-nth-day="'+i+'" aria-pressed="'+active+'" aria-label="'+escapeHtml(dayFull(d.date))+'"><span>'+escapeHtml(d.label)+'</span><strong>'+d.number+'</strong></button>';
 }
 out+='</div><div class="nthWeekSummary" aria-label="Équipe le '+escapeHtml(dayFull(selectedDate))+'"><div><small>Équipe</small><strong>'+employees.length+'</strong></div><div><small>En poste</small><strong>'+present+'</strong></div><div><small>Congés</small><strong>'+onLeave+'</strong></div></div>';
 out+='<div class="nthWeekFilters" role="group" aria-label="Afficher les collaborateurs">';
 for(const [id,label] of [['all','Tous'],['working','En poste'],['off','Autres'],['mine','Moi']]){
  if(id==='mine'&&!showMe)continue;
  out+='<button type="button" data-nth-filter="'+id+'" aria-pressed="'+(filter===id)+'" class="'+(filter===id?'selected':'')+'">'+label+'</button>';
 }
 out+='</div><div class="nthWeekList">';
 if(!visible.length)out+='<div class="nthWeekEmpty">Aucun collaborateur dans cette sélection.</div>';
 for(const employee of visible){
  const {info,days,total,contract,diff,isMe}=employee,withContract=contract!==null&&contract>0,over=withContract&&diff!==null&&diff>.01;
  out+='<article class="nthWeekCard'+(isMe?' mine':'')+'"><div class="nthWeekCardHeader"><div class="nthWeekPerson">'+info.avatar+'<div class="nthWeekName"><strong>'+escapeHtml(info.label)+'</strong>'+(isMe?'<small>Mon planning</small>':'')+'</div></div><div class="nthWeekTotal'+(over?' over':'')+'"><strong>'+hours(total)+(withContract?'<span> / '+hours(contract)+'</span>':'')+'</strong>'+(over?'<small>+'+hours(diff)+' / contrat</small>':'')+(withContract?'<i class="nthWeekProgress"><i style="width:'+Math.min(100,Math.max(0,100*total/contract))+'%"></i></i>':'')+'</div></div>';
  out+='<div class="nthWeekSlots" aria-label="Horaires de '+escapeHtml(info.label)+'">';
  for(let i=0;i<7;i++){
   const d=days[i],c=d.status==='work'?(d.ranges[0]?.c||'g'):d.status;
   const label=d.status==='leave'?'Congé':d.status==='unavailable'?'Indispo.':'Repos';
   const tooltip=dates[i].label+' '+dates[i].number+' : '+(d.ranges.length?d.ranges.map(r=>time(r.a)+'–'+time(r.b)).join(', '):label);
   out+='<div class="nthWeekSlot'+(i===selected?' active':'')+'" data-status="'+c+'" title="'+escapeHtml(tooltip)+'">';
   if(d.ranges.length){for(const r of d.ranges)out+='<span class="nthWeekShift" data-shift="'+r.c+'"><strong>'+time(r.a)+'</strong><strong>'+time(r.b)+'</strong></span>'}
   else out+='<span class="nthWeekOff">'+escapeHtml(label)+'</span>';
   out+='</div>';
  }
  out+='</div></article>';
 }
 out+='</div><div class="nthWeekLegend"><span><i class="g"></i>Vert</span><span><i class="b"></i>Bleu</span><span><i class="y"></i>Congé</span><span><i class="n"></i>Repos</span><span><i class="r"></i>Indisponibilité</span></div>';
 return out;
}
window.NethorMobileWeekCards=Object.freeze({render,setFilter(value){filter=['all','working','off','mine'].includes(value)?value:'all'},reset(){filter='all'},numberOfWeek});
})();
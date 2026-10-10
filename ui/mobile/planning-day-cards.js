/* Nethor — mobile day planning, presentation only: uses the authoritative planning model. */
(function(){
'use strict';
let selectedFilter='all',awayExpanded=false,previousSignature='';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=value=>String(Math.floor(value)).padStart(2,'0')+':'+String(Math.round((value-Math.floor(value))*60)).padStart(2,'0');
const duration=value=>String(Math.round(value*100)/100).replace('.',',')+' h';
function parisClock(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=key=>parts.find(x=>x.type===key)?.value||'';
 return {key:p('year')+'-'+p('month')+'-'+p('day'),hours:Number(p('hour'))+Number(p('minute'))/60}
}
function scheduleState(ranges,isToday,clock){
 if(!ranges.length)return'none';
 if(!isToday)return'planned';
 if(ranges.some(x=>x.a<=clock&&clock<x.b))return'ongoing';
 if(ranges.some(x=>x.a>clock))return'upcoming';
 return'finished'
}
function getItems(start,ctx,now=new Date()){
 const {model,addDays,isoDate,rowRanges,avatarFor,isCurrentAgendaEmployee}=ctx;
 const selected=Math.max(0,Math.min(6,Number(ctx.currentDay)||0));
 const date=addDays(start,selected),key=isoDate(date),clock=parisClock(now),isToday=key===clock.key;
 const employees=model?.employees||[],rows=model?.days?.[key]?.cells||[];
 const items=employees.map((emp,index)=>{
  if(ctx.isAccountHidden?.(emp.name))return null;
  const cells=rows[index]||[],ranges=rowRanges(cells).filter(x=>x.c==='g'||x.c==='b');
  const nonWork=ranges.length?'':cells.includes('y')?'leave':cells.includes('r')||cells.includes('o')?'rest':cells.includes('w')?'unavailable':'empty';
  return {emp,index,info:avatarFor(emp),ranges,nonWork,state:scheduleState(ranges,isToday,clock.hours),isMe:isCurrentAgendaEmployee(emp)}
 });
 return {items:items.filter(Boolean),date,key,isToday,clock,selected}
}
function signature(start,ctx,now=new Date()){
 const {items,key,isToday,clock}=getItems(start,ctx,now);
 const mine=items.find(x=>x.isMe);
 const elapsed=mine&&isToday&&mine.ranges.length?mine.ranges.reduce((n,r)=>n+Math.min(r.b-r.a,Math.max(0,clock.hours-r.a)),0):0;
 const total=mine?.ranges.reduce((n,r)=>n+r.b-r.a,0)||0;
 const progress=total?Math.floor(elapsed/total*20):0;
 return key+'|'+isToday+'|'+items.map(x=>x.state).join(',')+'|'+progress
}
function shiftHtml(ranges){
 return '<div class="nthDayShiftList">'+ranges.map(r=>
  '<div class="nthDayShift" data-shift="'+escape(r.c)+'"><i></i><strong>'+time(r.a)+' – '+time(r.b)+'</strong><small>'+duration(r.b-r.a)+'</small></div>'
 ).join('')+'</div>'
}
function nonWorkLabel(code){return ({leave:'Congé',rest:'Repos',unavailable:'Indisponibilité',empty:'Aucun horaire renseigné'})[code]||'Sans horaire'}
function statusInfo(state,isToday){
 if(!isToday)return{label:'Planifié',type:'planned'};
 return {ongoing:{label:'Créneau en cours',type:'ongoing'},upcoming:{label:'À venir',type:'upcoming'},finished:{label:'Créneau terminé',type:'finished'}}[state]||{label:'Planifié',type:'planned'}
}
function render(start,ctx){
 const data=getItems(start,ctx),{items,date,key,selected,isToday,clock}=data;
 previousSignature=signature(start,ctx);
 if(!isToday&&['ongoing','upcoming','finished'].includes(selectedFilter))selectedFilter='all';
 const mine=items.find(x=>x.isMe),workers=items.filter(x=>x.ranges.length&&!x.isMe),away=items.filter(x=>!x.ranges.length&&!x.isMe);
 const counts={planned:items.filter(x=>x.ranges.length).length,ongoing:items.filter(x=>x.state==='ongoing').length,leave:items.filter(x=>x.nonWork==='leave').length,shifts:items.reduce((n,item)=>n+item.ranges.length,0)};
 const days=Array.from({length:7},(_,i)=>{const d=ctx.addDays(start,i);return {date:d,key:ctx.isoDate(d),label:ctx.dayShort(d),num:d.getDate()}});
 const todayKey=parisClock().key,focus=(()=>{try{return new URLSearchParams(location.search).get('focus')||''}catch(_){return''}})();
 if(focus==='rest'||focus==='leave')awayExpanded=true;
 let html='<div class="nthDayWeekStrip" role="group" aria-label="Choisir une journée">';
 days.forEach((d,i)=>{const active=i===selected;html+='<button type="button" data-nthday-index="'+i+'" class="nthDayWeekPill'+(active?' selected':'')+(d.key===todayKey?' today':'')+'" aria-pressed="'+active+'" aria-label="'+escape(ctx.dayFull(d.date))+'"><span>'+escape(d.label)+'</span><strong>'+d.num+'</strong></button>'});
 html+='</div><div class="nthDaySummary"><div><span>Planifiés</span><strong>'+counts.planned+'</strong></div><div><span>'+(isToday?'En cours':'Créneaux')+'</span><strong>'+(isToday?counts.ongoing:counts.shifts)+'</strong></div><div><span>Congés</span><strong>'+counts.leave+'</strong></div></div>';
 if(mine){
  const s=mine.ranges.length?statusInfo(mine.state,isToday):{label:nonWorkLabel(mine.nonWork),type:mine.nonWork||'empty'};
  const elapsed=isToday?mine.ranges.reduce((n,r)=>n+Math.min(r.b-r.a,Math.max(0,clock.hours-r.a)),0):0;
  const total=mine.ranges.reduce((n,r)=>n+(r.b-r.a),0),pct=total?Math.min(100,Math.max(0,elapsed/total*100)):0;
  html+='<section class="nthDayMine'+(focus==='rest'&&!mine.ranges.length?' agendaRestFocusBlock':'')+'" aria-label="Mon planning"><div class="nthDayBlockTop"><strong>Mon planning</strong><span class="nthDayBadge" data-state="'+s.type+'">'+escape(s.label)+'</span></div>';
  html+='<div class="nthDayMineProfile">'+mine.info.avatar+'<div><strong>'+escape(mine.info.label)+'</strong><small>Horaires prévus</small></div></div>';
  html+=mine.ranges.length?shiftHtml(mine.ranges):'<div class="nthDayNoShift">'+escape(nonWorkLabel(mine.nonWork))+'</div>';
  if(isToday&&total>0)html+='<div class="nthDayProgressLabel"><span>Avancement des créneaux prévus</span><strong>'+Math.round(pct)+' %</strong></div><div class="nthDayProgress"><i style="width:'+pct+'%"></i></div>';
  html+='</section>'
 }
 const options=isToday?[['all','Tous'],['ongoing','En cours'],['upcoming','À venir'],['finished','Terminés']]:[['all','Tous'],['morning','Matin'],['afternoon','Après-midi']];
 const visible=workers.filter(x=>selectedFilter==='all'||selectedFilter===x.state||selectedFilter==='morning'&&x.ranges.some(r=>r.a<12)||selectedFilter==='afternoon'&&x.ranges.some(r=>r.b>12));
 const rank={ongoing:0,upcoming:1,planned:1,finished:2};
 visible.sort((a,b)=>(rank[a.state]??2)-(rank[b.state]??2)||((a.state==='finished'?-(a.ranges.at(-1)?.b||0):a.ranges[0]?.a||0)-(b.state==='finished'?-(b.ranges.at(-1)?.b||0):b.ranges[0]?.a||0))||a.info.label.localeCompare(b.info.label,'fr'));
 html+='<section class="nthDayTeam" aria-label="Équipe planifiée"><div class="nthDaySectionTitle"><strong>Équipe du jour</strong><span>'+workers.length+' collaborateur'+(workers.length>1?'s':'')+'</span></div>';
 html+='<div class="nthDayFilters" role="group" aria-label="Filtrer les créneaux">';
 options.forEach(([id,label])=>{html+='<button type="button" data-nthday-filter="'+id+'" class="'+(selectedFilter===id?'selected':'')+'" aria-pressed="'+(selectedFilter===id)+'">'+label+'</button>'});
 html+='</div><div class="nthDayTeamList">';
 if(!visible.length)html+='<div class="nthDayEmpty">Aucun créneau correspondant à ce filtre.</div>';
 visible.forEach(item=>{
  const status=statusInfo(item.state,isToday);
  html+='<article class="nthDayTeamCard"><div class="nthDayTeamHead"><div class="nthDayPerson">'+item.info.avatar+'<strong>'+escape(item.info.label)+'</strong></div><span class="nthDayBadge" data-state="'+status.type+'">'+escape(status.label)+'</span></div>'+shiftHtml(item.ranges)+'</article>'
 });
 html+='</div></section>';
 const allAway=items.filter(x=>!x.ranges.length);
 html+='<details class="nthDayAway" data-nthday-away'+(awayExpanded?' open':'')+'><summary><span>Repos, congés et sans horaire</span><small>'+allAway.length+' personne'+(allAway.length>1?'s':'')+'</small><i aria-hidden="true">⌄</i></summary><div class="nthDayAwayList">';
 if(!allAway.length)html+='<p>Aucun collaborateur dans cette catégorie.</p>';
 allAway.forEach(item=>{html+='<div class="nthDayAwayPerson">'+item.info.avatar+'<strong>'+escape(item.info.label)+'</strong><span data-off="'+item.nonWork+'">'+escape(nonWorkLabel(item.nonWork))+'</span></div>'});
 html+='</div></details>';
 if(isToday)html+='<p class="nthDayFootnote">Les statuts suivent les créneaux planifiés, sans confirmer la présence effective.</p>';
 return html
}
window.NethorMobileDayCards=Object.freeze({render,signature,get previousSignature(){return previousSignature},setFilter(v){selectedFilter=['all','ongoing','upcoming','finished','morning','afternoon'].includes(v)?v:'all'},setAwayExpanded(v){awayExpanded=Boolean(v)},reset(){selectedFilter='all';awayExpanded=false;previousSignature=''}});
})();
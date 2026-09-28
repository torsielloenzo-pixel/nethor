(function(){
'use strict';
let layout='classic',mobileMode='day',booted=false,restFocusRevealed=false;
const mq=window.matchMedia('(max-width:760px)');
const escLocal=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function isMobile(){return document.documentElement.classList.contains('nethorPhoneDevice')||mq.matches}
function normalize(v){return v==='agenda'?'agenda':'classic'}
function restFocusActive(){try{return new URLSearchParams(location.search).get('focus')==='rest'}catch(_){return false}}
function agendaRanges(row){return rowRanges(row).filter(r=>!['r','y','o'].includes(r.c))}
function colorLabel(c){return({g:'Matin',b:'Après-midi',w:'Indisponibilité'})[c]||'Poste'}
function shiftHours(ranges){return ranges.reduce((sum,r)=>sum+(r.b-r.a),0)}
function hoursLabel(n){return String(Math.round(n*100)/100).replace('.',',')+' h'}
function dayShort(d){return d.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}
function dayFull(d){return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function avatarFor(emp){
 const prof=typeof planningProfileFor==='function'?planningProfileFor(emp.name):null,label=prof?.display_name||emp.name;
 const avatar=typeof identityAvatarHtml==='function'?identityAvatarHtml(prof,label):'<span class="planningIdentityAvatar">'+escLocal((label||'?')[0])+'</span>';
 return {prof,label,avatar};
}
function inject(){
 if(document.getElementById('planningLayoutBar'))return;
 const toolbar=document.getElementById('planningToolbar');if(!toolbar)return;
 const bar=document.createElement('div');bar.id='planningLayoutBar';bar.className='planningLayoutBar';
 bar.innerHTML='<div class="planningLayoutIntro"><span>Affichage</span><strong id="planningLayoutLabel">Classique</strong></div><div class="planningLayoutSwitch" role="group" aria-label="Mode d\'affichage"><button id="layoutClassicBtn" class="planningLayoutBtn active" type="button"><span aria-hidden="true">▦</span> Classique</button><button id="layoutAgendaBtn" class="planningLayoutBtn" type="button"><span aria-hidden="true">☷</span> Agenda</button></div>';
 toolbar.prepend(bar);
 const dock=document.getElementById('mobilePlanningActionsDock')||document.getElementById('emptyState');
 const view=document.createElement('section');view.id='agendaView';view.className='agendaView hidden';view.setAttribute('aria-label','Agenda de la semaine');
 view.innerHTML='<div id="mobileAgendaModeBar" class="mobileAgendaModeBar mobilePlanningPrimaryNav"><button id="mobileAgendaDayBtn" class="mobileAgendaModeBtn active" type="button">Jour</button><button id="mobileAgendaWeekBtn" class="mobileAgendaModeBtn" type="button">Semaine</button><button id="mobileAgendaCalendarBtn" class="mobileAgendaModeBtn" type="button">Calendrier</button></div><div id="mobileAgendaDays" class="mobileAgendaDays mobilePlanningSelector"></div><div class="agendaHeader"><div><span class="agendaEyebrow">VUE ÉQUIPE</span><h2 id="agendaTitle">Agenda de la semaine</h2><p id="agendaSubtitle">Horaires calculés depuis le même import Excel.</p></div><button class="btn light agendaTodayBtn" type="button" id="agendaTodayBtn">Aujourd’hui</button></div><div id="mobileAgendaContentTitle" class="mobileAgendaContentTitle">Agenda</div><div id="agendaStats" class="agendaStats"></div><div id="agendaMount" class="agendaMount"></div>';
 if(dock&&dock.parentNode)dock.parentNode.insertBefore(view,dock.nextSibling);
 document.getElementById('layoutClassicBtn').onclick=()=>setLayout('classic',true);
 document.getElementById('layoutAgendaBtn').onclick=()=>setLayout('agenda',true);
 document.getElementById('mobileAgendaDayBtn').onclick=()=>setMobileMode('day',true);
 document.getElementById('mobileAgendaWeekBtn').onclick=()=>setMobileMode('week',true);
 document.getElementById('mobileAgendaCalendarBtn').onclick=()=>openMobilePlanningCalendar();
 document.getElementById('agendaTodayBtn').onclick=goToday;
}
function setLayout(v,sound){

 if(isMobile())v='agenda';layout=normalize(v);
 document.body.classList.toggle('agendaLayout',layout==='agenda');
 document.body.classList.toggle('mobileAgendaForced',isMobile());
 document.getElementById('agendaView')?.classList.toggle('hidden',layout!=='agenda');
 document.getElementById('layoutClassicBtn')?.classList.toggle('active',layout==='classic');
 document.getElementById('layoutAgendaBtn')?.classList.toggle('active',layout==='agenda');
 const label=document.getElementById('planningLayoutLabel');if(label)label.textContent=layout==='agenda'?'Agenda':'Classique';
 if(layout==='agenda')renderAgenda();
 if(sound&&!isMobile())try{window.NettoSounds?.play?.('switch')}catch(_){}
}
function clearRestFocus(){
 if(!restFocusActive())return;
 try{const u=new URL(location.href);u.searchParams.delete('focus');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch(_){}
 restFocusRevealed=false
}
function isoWeekNumber(d){
 const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
 const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);
 const yearStart=new Date(Date.UTC(x.getUTCFullYear(),0,1));
 return Math.ceil((((x-yearStart)/86400000)+1)/7)
}
function mobileWeekRangeLabel(a){
 const b=addDays(a,6);
 const left=a.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}).replace('.','');
 const right=b.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}).replace('.','');
 return 'Du '+left+' au '+right
}
function openMobilePlanningCalendar(){
 clearRestFocus();
 document.getElementById('mobileAgendaCalendarBtn')?.classList.add('active');
 document.getElementById('mobileAgendaDayBtn')?.classList.remove('active');
 document.getElementById('mobileAgendaWeekBtn')?.classList.remove('active');
 if(typeof setPlanningView==='function')setPlanningView('year')
}
function setMobileMode(v,sound){
 if(sound)clearRestFocus();
 mobileMode=v==='week'?'week':'day';
 try{localStorage.setItem('nettoAgendaMobileMode',mobileMode)}catch(_){}
 document.getElementById('mobileAgendaDayBtn')?.classList.toggle('active',mobileMode==='day');
 document.getElementById('mobileAgendaWeekBtn')?.classList.toggle('active',mobileMode==='week');
 document.getElementById('mobileAgendaCalendarBtn')?.classList.remove('active');
 if(sound)try{window.NettoSounds?.play?.('switch')}catch(_){}
 renderAgenda();
}
function goToday(){
 try{
  const w=startOfWeek(new Date());
  if(typeof currentDay!=='undefined')currentDay=(new Date().getDay()+6)%7;
  if(isoDate(w)!==isoDate(currentWeekStart))loadWeek(w);else renderAgenda();
 }catch(e){console.warn('Agenda today',e)}
}
function renderDayPicker(a){
 const host=document.getElementById('mobileAgendaDays');if(!host)return;
 if(!isMobile()){host.innerHTML='';return}
 const active=Math.max(0,Math.min(6,typeof currentDay==='number'?currentDay:0));
 const selected=addDays(a,active),isDay=mobileMode==='day';
 document.getElementById('mobileAgendaDayBtn')?.classList.toggle('active',isDay);
 document.getElementById('mobileAgendaWeekBtn')?.classList.toggle('active',!isDay);
 document.getElementById('mobileAgendaCalendarBtn')?.classList.remove('active');
 host.innerHTML='<button class="agendaDayArrow mobilePlanningSelectorArrow" type="button" data-move="-1" aria-label="'+(isDay?'Jour précédent':'Semaine précédente')+'">‹</button><button class="mobilePlanningSelectBtn" type="button" id="mobilePlanningSelectBtn"><span class="mobilePlanningSelectIcon" aria-hidden="true">▣</span><span>'+(isDay?'Sélection date':'Sélection semaine')+'</span></button><button class="agendaDayArrow mobilePlanningSelectorArrow" type="button" data-move="1" aria-label="'+(isDay?'Jour suivant':'Semaine suivante')+'">›</button><input id="mobilePlanningDateInput" class="mobilePlanningDateInput" type="date" value="'+isoDate(isDay?selected:a)+'" aria-label="'+(isDay?'Choisir une date':'Choisir une semaine à partir d’une date')+'">';
 const input=document.getElementById('mobilePlanningDateInput');
 document.getElementById('mobilePlanningSelectBtn').onclick=()=>{try{if(typeof input?.showPicker==='function')input.showPicker();else input?.click?.()}catch(_){input?.click?.()}};
 if(input)input.onchange=async()=>{
  const value=input.value;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;
  clearRestFocus();
  const d=new Date(value+'T12:00:00'),ws=startOfWeek(d);
  currentWeekStart=ws;currentDay=isDay?Math.max(0,Math.min(6,(d.getDay()+6)%7)):0;
  await loadWeek(ws)
 };
 host.querySelectorAll('[data-move]').forEach(btn=>btn.onclick=async()=>{
  clearRestFocus();
  const step=Number(btn.dataset.move)||0;
  if(isDay){
   const next=active+step;
   if(next<0){currentDay=6;await loadWeek(addDays(currentWeekStart,-7))}
   else if(next>6){currentDay=0;await loadWeek(addDays(currentWeekStart,7))}
   else{currentDay=next;renderAgenda()}
  }else{
   currentDay=0;await loadWeek(addDays(currentWeekStart,step*7))
  }
 })
}
function isCurrentAgendaEmployee(emp){
 try{
  const p=planningProfileFor(emp?.name||'');
  if(currentUser?.id&&p?.id)return String(p.id)===String(currentUser.id);
  const mine=norm(currentUser?.name||''),label=norm(p?.display_name||emp?.name||'');
  return !!mine&&mine===label
 }catch(_){return false}
}
function rangesOverlapHours(a,b){
 let total=0;
 for(const x of a||[])for(const y of b||[])total+=Math.max(0,Math.min(x.b,y.b)-Math.max(x.a,y.a));
 return total
}
function rangeDistanceHours(a,b){
 if(!a?.length||!b?.length)return Number.POSITIVE_INFINITY;
 let best=Number.POSITIVE_INFINITY;
 for(const x of a)for(const y of b){
  if(Math.min(x.b,y.b)>Math.max(x.a,y.a))return 0;
  best=Math.min(best,Math.abs(x.a-y.b),Math.abs(y.a-x.b))
 }
 return best
}
function sortAgendaEmployeesForCurrentUser(items){
 const mine=items.find(x=>x.isMe);
 if(!mine)return items;
 return [...items].sort((a,b)=>{
  if(a.isMe!==b.isMe)return a.isMe?-1:1;
  const ao=rangesOverlapHours(mine.ranges,a.ranges),bo=rangesOverlapHours(mine.ranges,b.ranges);
  if(bo!==ao)return bo-ao;
  const ad=rangeDistanceHours(mine.ranges,a.ranges),bd=rangeDistanceHours(mine.ranges,b.ranges);
  if(ad!==bd)return ad-bd;
  const as=a.ranges?.[0]?.a??99,bs=b.ranges?.[0]?.a??99;
  if(as!==bs)return as-bs;
  return String(a.label||'').localeCompare(String(b.label||''),'fr',{sensitivity:'base'})
 })
}
function renderDayAgenda(a){
 const di=typeof currentDay==='number'?currentDay:0,dt=addDays(a,di),key=isoDate(dt),day=model.days?.[key],employees=model.employees||[],rows=day?.cells||[],focusRest=restFocusActive(),currentIdx=typeof currentUserEmployeeIndex==='function'?currentUserEmployeeIndex(model):-1;
 const title=document.getElementById('agendaTitle'),sub=document.getElementById('agendaSubtitle');
 if(title)title.textContent=dayFull(dt).replace(/^./,c=>c.toUpperCase());
 if(sub)sub.textContent=focusRest?'Jour ciblé depuis « Prochain repos »':'Vue détaillée de la journée';
 const items=[];
 employees.forEach((emp,ri)=>{
  const row=rows[ri]||[],ranges=rowRanges(row).filter(r=>r.c==='g'||r.c==='b'),isMe=isCurrentAgendaEmployee(emp)||ri===currentIdx,hasLeave=!ranges.length&&row.some(v=>v==='y');
  if(!ranges.length&&!isMe)return;
  const info=avatarFor(emp);
  items.push({emp,ri,ranges,info,label:info.label,isMe,isLeave:isMe&&hasLeave,isRest:isMe&&!ranges.length&&!hasLeave})
 });
 const sorted=sortAgendaEmployeesForCurrentUser(items);
 if(!sorted.length)return '<div class="agendaDayList"><div class="agendaDayEmpty"><strong>Aucun horaire de travail</strong><span>Personne n’est planifié sur cette journée.</span></div></div>';

 const mine=sorted.find(x=>x.isMe)||null;
 const globalItems=mine?sorted.filter(x=>!x.isMe):sorted;
 const makeCard=item=>{
  const overlapWithMe=mine&&!item.isMe?rangesOverlapHours(mine.ranges,item.ranges):0;
  const cls='agendaDayCard'+(item.isMe?' agendaDayCardMe':'')+(item.isLeave?' agendaDayCardLeave':'')+(item.isRest?' agendaDayCardRest':'')+(overlapWithMe>0?' agendaDayCardCoworker':'');
  const content=item.isLeave
   ?'<div class="agendaDayStatus agendaDayStatusLeave"><strong>Congés</strong></div>'
   :item.isRest
    ?'<div class="agendaDayStatus agendaDayStatusRest"><strong>Repos</strong></div>'
    :item.ranges.map(r=>'<div class="agendaDayShift" data-color="'+escLocal(r.c)+'"><div><strong>'+fmtTime(r.a)+' → '+fmtTime(r.b)+'</strong><small>'+escLocal(colorLabel(r.c))+' · '+hoursLabel(r.b-r.a)+'</small></div><span>›</span></div>').join('');
  return '<article class="'+cls+'"><div class="agendaDayPerson">'+item.info.avatar+'<strong>'+escLocal(item.info.label)+'</strong></div><div class="agendaDayShifts">'+content+'</div></article>'
 };

 if(isMobile()&&mine){
  const stateLabel=mine.isLeave?'Mes congés':mine.isRest?'Mon jour de repos':'Mon horaire';
  const personal='<section class="agendaPersonalBlock '+(mine.isRest&&focusRest?'agendaRestFocusBlock':'')+'" aria-label="'+stateLabel+'">'+makeCard(mine)+'</section>';
  const global=globalItems.length?'<section class="agendaGlobalBlock" aria-label="Planning de l’équipe">'+globalItems.map(makeCard).join('')+'</section>':'';
  return '<div class="agendaDayList hasCurrentUser agendaSeparated">'+personal+(global?'<div class="agendaSectionGap" aria-hidden="true"></div>'+global:'')+'</div>'
 }
 return '<div class="agendaDayList'+(mine?' hasCurrentUser':'')+'">'+sorted.map(makeCard).join('')+'</div>';
}
function renderWeekAgenda(a){
 const b=addDays(a,6),todayKey=isoDate(new Date()),employees=model.employees||[],desktop=!isMobile();
 const title=document.getElementById('agendaTitle'),sub=document.getElementById('agendaSubtitle'),stats=document.getElementById('agendaStats');
 if(title)title.textContent=isMobile()?'Semaine '+isoWeekNumber(a):'Semaine du '+a.getDate()+' au '+b.getDate()+' '+b.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 if(sub)sub.textContent=isMobile()?mobileWeekRangeLabel(a):'Vue équipe simplifiée • mêmes données et calculs que la vue classique';
 let html='<div class="agendaGrid'+(desktop?' agendaGridDesktop':'')+'"><div class="agendaCorner">Équipe</div>',weekHours=0;
 for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt),active=di===(typeof currentDay==='number'?currentDay:0);html+='<div class="agendaDayHead '+(key===todayKey?'today ':'')+(active?'activeDay':'')+'"><strong>'+escLocal(dayShort(dt))+'</strong><span>'+dt.getDate()+'</span></div>'}
 if(desktop)html+='<div class="agendaWeekTotalHead"><strong>Total</strong><span>Semaine</span></div>';
 employees.forEach((emp,ri)=>{
  let employeeTotal=0;for(let di=0;di<7;di++){const row=model.days?.[isoDate(addDays(a,di))]?.cells?.[ri]||[];employeeTotal+=shiftHours(agendaRanges(row))}weekHours+=employeeTotal;
  const info=avatarFor(emp);html+='<div class="agendaEmployee">'+info.avatar+'<div class="planningIdentityText"><strong>'+escLocal(info.label)+'</strong>'+(desktop?'':'<span class="agendaEmployeeTotal">'+hoursLabel(employeeTotal)+'</span>')+'</div></div>';
  for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt),active=di===(typeof currentDay==='number'?currentDay:0),row=model.days?.[key]?.cells?.[ri]||[],ranges=agendaRanges(row);html+='<div class="agendaCell '+(key===todayKey?'today ':'')+(active?'activeDay ':'')+(ranges.length?'':'empty')+'">';
   if(ranges.length)ranges.forEach(r=>{html+='<div class="agendaShift" data-color="'+escLocal(r.c)+'"><strong>'+fmtTime(r.a)+'–'+fmtTime(r.b)+'</strong><small>'+hoursLabel(r.b-r.a)+'</small></div>'});else html+='<span class="agendaWeekDash">–</span>';
   html+='</div>';
  }
  if(desktop)html+='<div class="agendaWeekTotalCell"><strong>'+hoursLabel(employeeTotal)+'</strong><span>semaine</span></div>';
 });
 html+='</div>';
 if(stats)stats.innerHTML='<div class="agendaStat"><span class="agendaStatIcon">♟</span><div><strong>'+employees.length+'</strong><small>équipe</small></div></div><div class="agendaStat"><span class="agendaStatIcon">◷</span><div><strong>'+hoursLabel(weekHours)+'</strong><small>semaine</small></div></div>';
 return html;
}
function renderAgenda(){
 const host=document.getElementById('agendaMount');if(!host)return;
 host.classList.toggle('agendaMountWeekScroll',isMobile()&&mobileMode==='week');
 try{
  if(typeof model==='undefined'||(!document.body.classList.contains('planningReady')&&model==null)){
   host.innerHTML='<div class="agendaLoading"><span class="agendaLoadingSpinner" aria-hidden="true"></span><div><strong>Chargement du planning</strong><small>Préparation de la semaine…</small></div></div>';return
  }
  if(!model){host.innerHTML='<div class="agendaDayEmpty"><strong>Aucun planning importé</strong><span>Aucun planning n’est disponible pour cette semaine.</span></div>';return}
  const a=currentWeekStart;renderDayPicker(a);
  document.getElementById('mobileAgendaModeBar')?.classList.toggle('hidden',!isMobile());
  document.getElementById('agendaStats')?.classList.toggle('hidden',isMobile());
  if(isMobile()){
   host.innerHTML=mobileMode==='day'?renderDayAgenda(a):renderWeekAgenda(a);
   if(restFocusActive()&&!restFocusRevealed){
    const target=host.querySelector('.agendaRestFocusBlock,.agendaDayCardRest');
    if(target){restFocusRevealed=true;requestAnimationFrame(()=>target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'}))}
   }
  }else{document.getElementById('agendaTitle').textContent='Agenda de la semaine';document.getElementById('agendaSubtitle').textContent='Du '+frDate(a)+' au '+frDate(addDays(a,6))+' • mêmes données et calculs que la vue classique';host.innerHTML=renderWeekAgenda(a)}
 }catch(e){console.error('Agenda render',e);host.innerHTML='<div class="agendaDayEmpty"><strong>Agenda indisponible</strong><span>Recharge la page pour réessayer.</span></div>'}
}
function hookRender(){
 try{if(typeof renderAll==='function'&&!renderAll.__agendaHooked){const base=renderAll;const wrapped=function(){const r=base.apply(this,arguments);if(layout==='agenda')renderAgenda();return r};wrapped.__agendaHooked=true;renderAll=wrapped}}catch(e){console.warn('Agenda render hook',e)}
}
function arrangeMobilePlanningWidgets(){
 const bar=document.querySelector('.planningViewBar'),week=document.getElementById('weekView'),agenda=document.getElementById('agendaView'),main=document.getElementById('planningApp');
 if(!bar||!week||!agenda||!main)return;
 if(isMobile()){
  /* Sur mobile, l'Agenda reste prioritaire : Semaine / Calendrier vient juste dessous. */
  if(bar.parentElement!==week||agenda.nextElementSibling!==bar)week.insertBefore(bar,agenda.nextElementSibling)
 }else if(bar.parentElement!==main){
  main.insertBefore(bar,week)
 }
}
function handleViewport(){arrangeMobilePlanningWidgets();document.body.classList.toggle('mobileAgendaForced',isMobile());setLayout(isMobile()?'agenda':'classic',false)}
function boot(){
 if(booted)return;inject();arrangeMobilePlanningWidgets();hookRender();booted=true;mq.addEventListener?.('change',handleViewport);
 if(isMobile()){
  try{mobileMode=localStorage.getItem('nettoAgendaMobileMode')==='week'?'week':'day'}catch(_){}
  if(restFocusActive())mobileMode='day';
  setLayout('agenda',false);
  return
 }
 setLayout('classic',false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.NethorPlanningAgenda={setLayout,setMobileMode,render:renderAgenda,get layout(){return layout},get mobileMode(){return mobileMode}};
})();
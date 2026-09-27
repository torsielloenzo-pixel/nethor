(function(){
'use strict';
let layout='classic',mobileMode='day',booted=false,saveTimer=null,profileLayout='classic';
const mq=window.matchMedia('(max-width:760px)');
const escLocal=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function isMobile(){return mq.matches}
function normalize(v){return v==='agenda'?'agenda':'classic'}
function agendaRanges(row){return rowRanges(row).filter(r=>!['r','y','o'].includes(r.c))}
function colorLabel(c){return({g:'Matin',b:'Après-midi',w:'Indisponibilité'})[c]||'Service'}
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
 view.innerHTML='<div id="mobileAgendaModeBar" class="mobileAgendaModeBar"><button id="mobileAgendaDayBtn" class="mobileAgendaModeBtn active" type="button">Jour</button><button id="mobileAgendaWeekBtn" class="mobileAgendaModeBtn" type="button">Semaine</button></div><div id="mobileAgendaDays" class="mobileAgendaDays"></div><div class="agendaHeader"><div><span class="agendaEyebrow">VUE ÉQUIPE</span><h2 id="agendaTitle">Agenda de la semaine</h2><p id="agendaSubtitle">Horaires calculés depuis le même import Excel.</p></div><button class="btn light agendaTodayBtn" type="button" id="agendaTodayBtn">Aujourd’hui</button></div><div id="agendaStats" class="agendaStats"></div><div id="agendaMount" class="agendaMount"></div>';
 if(dock&&dock.parentNode)dock.parentNode.insertBefore(view,dock.nextSibling);
 document.getElementById('layoutClassicBtn').onclick=()=>setLayout('classic',true);
 document.getElementById('layoutAgendaBtn').onclick=()=>setLayout('agenda',true);
 document.getElementById('mobileAgendaDayBtn').onclick=()=>setMobileMode('day',true);
 document.getElementById('mobileAgendaWeekBtn').onclick=()=>setMobileMode('week',true);
 document.getElementById('agendaTodayBtn').onclick=goToday;
}
async function loadPreference(){
 try{
  const client=(typeof db!=='undefined'&&db)||null;if(!client)return;
  const s=(await client.auth.getSession()).data?.session;if(!s)return;
  const {data}=await client.from('profiles').select('ui_preferences').eq('id',s.user.id).maybeSingle();
  profileLayout=normalize(data?.ui_preferences?.planning_view);
  try{mobileMode=localStorage.getItem('nettoAgendaMobileMode')==='week'?'week':'day'}catch(_){}
  setLayout(isMobile()?'agenda':profileLayout,false);
 }catch(e){console.warn('Préférence agenda',e);setLayout(isMobile()?'agenda':'classic',false)}
}
async function persistPreference(v){
 clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{
  try{
   const client=(typeof db!=='undefined'&&db)||null;if(!client)return;
   const s=(await client.auth.getSession()).data?.session;if(!s)return;
   const {data:p}=await client.from('profiles').select('ui_preferences').eq('id',s.user.id).maybeSingle();
   const prefs={...(p?.ui_preferences&&typeof p.ui_preferences==='object'?p.ui_preferences:{}),planning_view:v};
   const {error}=await client.from('profiles').update({ui_preferences:prefs}).eq('id',s.user.id);if(error)throw error;
   profileLayout=v;
  }catch(e){console.warn('Enregistrement préférence agenda',e)}
 },180);
}
function setLayout(v,persist){
 if(isMobile())v='agenda';layout=normalize(v);
 document.body.classList.toggle('agendaLayout',layout==='agenda');
 document.body.classList.toggle('mobileAgendaForced',isMobile());
 document.getElementById('agendaView')?.classList.toggle('hidden',layout!=='agenda');
 document.getElementById('layoutClassicBtn')?.classList.toggle('active',layout==='classic');
 document.getElementById('layoutAgendaBtn')?.classList.toggle('active',layout==='agenda');
 const label=document.getElementById('planningLayoutLabel');if(label)label.textContent=layout==='agenda'?'Agenda':'Classique';
 if(layout==='agenda')renderAgenda();
 if(persist&&!isMobile()){persistPreference(layout);try{window.NettoSounds?.play?.('switch')}catch(_){}}
}
function setMobileMode(v,sound){
 mobileMode=v==='week'?'week':'day';
 try{localStorage.setItem('nettoAgendaMobileMode',mobileMode)}catch(_){}
 document.getElementById('mobileAgendaDayBtn')?.classList.toggle('active',mobileMode==='day');
 document.getElementById('mobileAgendaWeekBtn')?.classList.toggle('active',mobileMode==='week');
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
 if(!isMobile()||mobileMode!=='day'){host.innerHTML='';return}
 const active=typeof currentDay==='number'?currentDay:0;
 let html='<button class="agendaDayArrow" type="button" data-move="-1" aria-label="Jour précédent">‹</button>';
 for(let di=0;di<7;di++){const dt=addDays(a,di);html+='<button class="mobileAgendaDay '+(di===active?'active':'')+'" type="button" data-day="'+di+'"><span>'+escLocal(dayShort(dt))+'</span><strong>'+dt.getDate()+'</strong></button>'}
 html+='<button class="agendaDayArrow" type="button" data-move="1" aria-label="Jour suivant">›</button>';host.innerHTML=html;
 host.querySelectorAll('[data-day]').forEach(btn=>btn.onclick=()=>{currentDay=Number(btn.dataset.day);renderAgenda()});
 host.querySelectorAll('[data-move]').forEach(btn=>btn.onclick=()=>{const step=Number(btn.dataset.move),next=(typeof currentDay==='number'?currentDay:0)+step;if(next<0){loadWeek(addDays(currentWeekStart,-7)).then(()=>{currentDay=6;renderAgenda()})}else if(next>6){loadWeek(addDays(currentWeekStart,7)).then(()=>{currentDay=0;renderAgenda()})}else{currentDay=next;renderAgenda()}});
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
 const di=typeof currentDay==='number'?currentDay:0,dt=addDays(a,di),key=isoDate(dt),day=model.days?.[key],employees=model.employees||[],rows=day?.cells||[];
 const title=document.getElementById('agendaTitle'),sub=document.getElementById('agendaSubtitle');
 if(title)title.textContent=dayFull(dt).replace(/^./,c=>c.toUpperCase());
 if(sub)sub.textContent='Planning du jour • horaires de travail uniquement';
 const items=[];
 employees.forEach((emp,ri)=>{
  const ranges=agendaRanges(rows[ri]||[]);if(!ranges.length)return;
  const info=avatarFor(emp);
  items.push({emp,ri,ranges,info,label:info.label,isMe:isCurrentAgendaEmployee(emp)})
 });
 const sorted=sortAgendaEmployeesForCurrentUser(items);
 if(!sorted.length)return '<div class="agendaDayList"><div class="agendaDayEmpty"><strong>Aucun horaire de travail</strong><span>Personne n’est planifié sur cette journée.</span></div></div>';

 const mine=sorted.find(x=>x.isMe)||null;
 const globalItems=mine?sorted.filter(x=>!x.isMe):sorted;
 const makeCard=item=>{
  const overlapWithMe=mine&&!item.isMe?rangesOverlapHours(mine.ranges,item.ranges):0;
  const cls='agendaDayCard'+(item.isMe?' agendaDayCardMe':'')+(overlapWithMe>0?' agendaDayCardCoworker':'');
  return '<article class="'+cls+'"><div class="agendaDayPerson">'+item.info.avatar+'<strong>'+escLocal(item.info.label)+'</strong></div><div class="agendaDayShifts">'+item.ranges.map(r=>'<div class="agendaDayShift" data-color="'+escLocal(r.c)+'"><div><strong>'+fmtTime(r.a)+' → '+fmtTime(r.b)+'</strong><small>'+escLocal(colorLabel(r.c))+' · '+hoursLabel(r.b-r.a)+'</small></div><span>›</span></div>').join('')+'</div></article>'
 };

 if(isMobile()&&mine){
  const personal='<section class="agendaPersonalBlock" aria-label="Mon horaire">'+makeCard(mine)+'</section>';
  const global=globalItems.length?'<section class="agendaGlobalBlock" aria-label="Planning de l’équipe">'+globalItems.map(makeCard).join('')+'</section>':'';
  return '<div class="agendaDayList hasCurrentUser agendaSeparated">'+personal+(global?'<div class="agendaSectionGap" aria-hidden="true"></div>'+global:'')+'</div>'
 }
 return '<div class="agendaDayList'+(mine?' hasCurrentUser':'')+'">'+sorted.map(makeCard).join('')+'</div>';
}
function renderWeekAgenda(a){
 const b=addDays(a,6),todayKey=isoDate(new Date()),employees=model.employees||[];
 const title=document.getElementById('agendaTitle'),sub=document.getElementById('agendaSubtitle'),stats=document.getElementById('agendaStats');
 if(title)title.textContent='Semaine du '+a.getDate()+' au '+b.getDate()+' '+b.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 if(sub)sub.textContent='Vue équipe simplifiée • glisse horizontalement pour voir la semaine';
 let html='<div class="agendaGrid"><div class="agendaCorner">Équipe</div>',weekHours=0;
 for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt);html+='<div class="agendaDayHead '+(key===todayKey?'today':'')+'"><strong>'+escLocal(dayShort(dt))+'</strong><span>'+dt.getDate()+'</span></div>'}
 employees.forEach((emp,ri)=>{
  let employeeTotal=0;for(let di=0;di<7;di++){const row=model.days?.[isoDate(addDays(a,di))]?.cells?.[ri]||[];employeeTotal+=shiftHours(agendaRanges(row))}weekHours+=employeeTotal;
  const info=avatarFor(emp);html+='<div class="agendaEmployee">'+info.avatar+'<div class="planningIdentityText"><strong>'+escLocal(info.label)+'</strong><span class="agendaEmployeeTotal">'+hoursLabel(employeeTotal)+'</span></div></div>';
  for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt),row=model.days?.[key]?.cells?.[ri]||[],ranges=agendaRanges(row);html+='<div class="agendaCell '+(key===todayKey?'today ':'')+(ranges.length?'':'empty')+'">';
   if(ranges.length)ranges.forEach(r=>{html+='<div class="agendaShift" data-color="'+escLocal(r.c)+'"><strong>'+fmtTime(r.a)+'–'+fmtTime(r.b)+'</strong><small>'+hoursLabel(r.b-r.a)+'</small></div>'});else html+='<span class="agendaWeekDash">–</span>';
   html+='</div>';
  }
 });
 html+='</div>';
 if(stats)stats.innerHTML='<div class="agendaStat"><span class="agendaStatIcon">♟</span><div><strong>'+employees.length+'</strong><small>équipe</small></div></div><div class="agendaStat"><span class="agendaStatIcon">◷</span><div><strong>'+hoursLabel(weekHours)+'</strong><small>semaine</small></div></div>';
 return html;
}
function renderAgenda(){
 const host=document.getElementById('agendaMount');if(!host)return;
 try{
  if(typeof model==='undefined'||(!document.body.classList.contains('planningReady')&&model==null)){
   host.innerHTML='<div class="agendaLoading"><span class="agendaLoadingSpinner" aria-hidden="true"></span><div><strong>Chargement du planning</strong><small>Préparation de la semaine…</small></div></div>';return
  }
  if(!model){host.innerHTML='<div class="agendaDayEmpty"><strong>Aucun planning importé</strong><span>Aucun planning n’est disponible pour cette semaine.</span></div>';return}
  const a=currentWeekStart;renderDayPicker(a);
  document.getElementById('mobileAgendaModeBar')?.classList.toggle('hidden',!isMobile());
  document.getElementById('agendaStats')?.classList.toggle('hidden',isMobile());
  if(isMobile())host.innerHTML=mobileMode==='day'?renderDayAgenda(a):renderWeekAgenda(a);
  else{document.getElementById('agendaTitle').textContent='Agenda de la semaine';document.getElementById('agendaSubtitle').textContent='Du '+frDate(a)+' au '+frDate(addDays(a,6))+' • mêmes données et calculs que la vue classique';host.innerHTML=renderWeekAgenda(a)}
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
function handleViewport(){arrangeMobilePlanningWidgets();document.body.classList.toggle('mobileAgendaForced',isMobile());setLayout(isMobile()?'agenda':profileLayout,false)}
function boot(){
 if(booted)return;inject();arrangeMobilePlanningWidgets();hookRender();booted=true;mq.addEventListener?.('change',handleViewport);
 if(isMobile()){
  try{mobileMode=localStorage.getItem('nettoAgendaMobileMode')==='week'?'week':'day'}catch(_){}
  setLayout('agenda',false);
  return
 }
 const wait=()=>{if(typeof db!=='undefined'&&db){loadPreference()}else setTimeout(wait,120)};wait();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.NethorPlanningAgenda={setLayout,setMobileMode,render:renderAgenda,get layout(){return layout},get mobileMode(){return mobileMode}};
})();
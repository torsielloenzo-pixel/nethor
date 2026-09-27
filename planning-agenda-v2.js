(function(){
'use strict';
let layout='classic',booted=false,saveTimer=null;
const escLocal=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function normalize(v){return v==='agenda'?'agenda':'classic'}
function inject(){
 if(document.getElementById('planningLayoutBar'))return;
 const toolbar=document.getElementById('planningToolbar');
 if(!toolbar)return;
 const bar=document.createElement('div');
 bar.id='planningLayoutBar';bar.className='planningLayoutBar';
 bar.innerHTML='<div class="planningLayoutIntro"><span>Affichage</span><strong id="planningLayoutLabel">Classique</strong></div><div class="planningLayoutSwitch" role="group" aria-label="Mode d\'affichage"><button id="layoutClassicBtn" class="planningLayoutBtn active" type="button"><span aria-hidden="true">▦</span> Classique</button><button id="layoutAgendaBtn" class="planningLayoutBtn" type="button"><span aria-hidden="true">☷</span> Agenda</button></div>';
 toolbar.prepend(bar);
 const dock=document.getElementById('mobilePlanningActionsDock')||document.getElementById('emptyState');
 const view=document.createElement('section');view.id='agendaView';view.className='agendaView hidden';view.setAttribute('aria-label','Agenda de la semaine');
 view.innerHTML='<div class="agendaHeader"><div><span class="agendaEyebrow">VUE ÉQUIPE</span><h2>Agenda de la semaine</h2><p id="agendaSubtitle">Horaires calculés depuis le même import Excel.</p></div><button class="btn light agendaTodayBtn" type="button" id="agendaTodayBtn">Aujourd’hui</button></div><div id="agendaMount" class="agendaMount"></div>';
 if(dock&&dock.parentNode)dock.parentNode.insertBefore(view,dock.nextSibling);
 document.getElementById('layoutClassicBtn').onclick=()=>setLayout('classic',true);
 document.getElementById('layoutAgendaBtn').onclick=()=>setLayout('agenda',true);
 document.getElementById('agendaTodayBtn').onclick=()=>{try{const w=startOfWeek(new Date());if(isoDate(w)!==isoDate(currentWeekStart))loadWeek(w);else renderAgenda()}catch(e){console.warn('Agenda today',e)}};
}
async function loadPreference(){
 try{
   const client=(typeof db!=='undefined'&&db)||null;if(!client)return;
   const s=(await client.auth.getSession()).data?.session;if(!s)return;
   const {data}=await client.from('profiles').select('ui_preferences').eq('id',s.user.id).maybeSingle();
   layout=normalize(data?.ui_preferences?.planning_view);
   setLayout(layout,false);
 }catch(e){console.warn('Préférence agenda',e)}
}
async function persistPreference(v){
 clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{
  try{
   const client=(typeof db!=='undefined'&&db)||null;if(!client)return;
   const s=(await client.auth.getSession()).data?.session;if(!s)return;
   const {data:p}=await client.from('profiles').select('ui_preferences').eq('id',s.user.id).maybeSingle();
   const prefs={...(p?.ui_preferences&&typeof p.ui_preferences==='object'?p.ui_preferences:{}),planning_view:v};
   const {error}=await client.from('profiles').update({ui_preferences:prefs}).eq('id',s.user.id);if(error)throw error;
  }catch(e){console.warn('Enregistrement préférence agenda',e)}
 },180);
}
function setLayout(v,persist){
 layout=normalize(v);document.body.classList.toggle('agendaLayout',layout==='agenda');
 document.getElementById('agendaView')?.classList.toggle('hidden',layout!=='agenda');
 document.getElementById('layoutClassicBtn')?.classList.toggle('active',layout==='classic');
 document.getElementById('layoutAgendaBtn')?.classList.toggle('active',layout==='agenda');
 const label=document.getElementById('planningLayoutLabel');if(label)label.textContent=layout==='agenda'?'Agenda':'Classique';
 try{localStorage.setItem('nettoPlanningLayout',layout)}catch(_){}
 if(layout==='agenda')renderAgenda();
 if(persist){persistPreference(layout);try{window.NettoSounds?.play?.('switch')}catch(_){}}
}
function dayLabel(d){return d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'}).replace('.','')}
function colorLabel(c){return({g:'Matin',b:'Après-midi',w:'Indisponibilité'})[c]||'Service'}
function agendaRanges(row){return rowRanges(row).filter(r=>!['r','y','o'].includes(r.c))}
function renderAgenda(){
 const host=document.getElementById('agendaMount');if(!host)return;
 try{
  if(typeof model==='undefined'||!model){host.innerHTML='<div class="emptyState"><strong>Aucun planning importé pour cette semaine</strong><span>Utilise le même import Excel que dans la vue classique.</span></div>';return}
  const a=currentWeekStart,b=addDays(a,6),todayKey=isoDate(new Date());
  const sub=document.getElementById('agendaSubtitle');if(sub)sub.textContent='Du '+frDate(a)+' au '+frDate(b)+' • mêmes données et calculs que la vue classique';
  const employees=model.employees||[];let html='<div class="agendaGrid"><div class="agendaCorner">Équipe</div>';
  for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt),parts=dayLabel(dt).split(' ');html+='<div class="agendaDayHead '+(key===todayKey?'today':'')+'"><strong>'+escLocal(parts[0])+'</strong><span>'+escLocal(parts.slice(1).join(' '))+'</span></div>'}
  employees.forEach((emp,ri)=>{
   let weekTotal=0;
   for(let di=0;di<7;di++){const day=model.days?.[isoDate(addDays(a,di))],row=day?.cells?.[ri]||[];weekTotal+=agendaRanges(row).reduce((sum,r)=>sum+(r.b-r.a),0)}
   const prof=typeof planningProfileFor==='function'?planningProfileFor(emp.name):null,label=prof?.display_name||emp.name;
   const avatar=typeof identityAvatarHtml==='function'?identityAvatarHtml(prof,label):'<span class="planningIdentityAvatar">'+escLocal((label||'?')[0])+'</span>';
   html+='<div class="agendaEmployee">'+avatar+'<div class="planningIdentityText"><strong>'+escLocal(label)+'</strong><span class="agendaEmployeeTotal">'+String(Math.round(weekTotal*100)/100).replace('.',',')+' h semaine</span></div></div>';
   for(let di=0;di<7;di++){const dt=addDays(a,di),key=isoDate(dt),day=model.days?.[key],row=day?.cells?.[ri]||[],ranges=agendaRanges(row);html+='<div class="agendaCell '+(key===todayKey?'today ':'')+(ranges.length?'':'empty')+'">';
    ranges.forEach(r=>{html+='<div class="agendaShift" data-color="'+escLocal(r.c)+'"><strong>'+fmtTime(r.a)+' – '+fmtTime(r.b)+'</strong><small>'+escLocal(colorLabel(r.c))+' · '+String(Math.round((r.b-r.a)*100)/100).replace('.',',')+' h</small></div>'});
    html+='</div>';
   }
  });
  html+='</div>';host.innerHTML=html;
 }catch(e){console.error('Agenda render',e);host.innerHTML='<div class="emptyState"><strong>Agenda indisponible</strong><span>La vue classique reste disponible.</span></div>'}
}
function hookRender(){
 try{
  if(typeof renderAll==='function'&&!renderAll.__agendaHooked){const base=renderAll;const wrapped=function(){const r=base.apply(this,arguments);if(layout==='agenda')renderAgenda();return r};wrapped.__agendaHooked=true;renderAll=wrapped}
 }catch(e){console.warn('Agenda render hook',e)}
}
function boot(){
 if(booted)return;inject();hookRender();booted=true;
 const wait=()=>{if(typeof db!=='undefined'&&db){loadPreference()}else setTimeout(wait,120)};wait();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.NethorPlanningAgenda={setLayout,render:renderAgenda,get layout(){return layout}};
})();
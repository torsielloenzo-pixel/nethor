/* Nethor desktop — fenêtre des anomalies de planning, jour et semaine. */
(function(){
'use strict';
if(window.NethorHomeAnomalyDialog)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=()=>window.NethorPlanningAnomalyCore;
const DAYS=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
let modal=null,state=null,request=0;

function label(date,withYear=false){
 const [year,month,day]=String(date||'').split('-').map(Number);
 if(!year||!month||!day)return date||'—';
 return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',...(withYear?{year:'numeric'}:{}) ,timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)));
}
function hours(value){
 const n=Number(value);
 return value===null||value===undefined||!Number.isFinite(n)?'—':n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' h'
}
function sentence(count,singular,plural){return count+' '+(count>1?plural:singular)}
function itemsHtml(rows){
 if(!rows?.length)return '<div class="ndaZero"><span aria-hidden="true">✓</span><div><strong>Aucune anomalie détectée</strong><small>Selon les règles de vérification du planning.</small></div></div>';
 return '<div class="ndaItemList">'+rows.map(x=>{
  const contract=x.kind==='contract-hours',delta=Number(x.contractDifference),value=contract?(delta>0?'+':'')+hours(x.contractDifference):'';
  const info=contract?'<div class="ndaContractHours"><span>Total : '+esc(hours(x.totalHours))+'</span><span>Contrat : '+esc(hours(x.contractHours))+'</span></div>':'';
  return '<article class="ndaItem '+(x.level==='alert'?'isAlert':'isWarn')+(contract?' isContract':'')+'">'+
   '<span class="ndaItemIcon" aria-hidden="true">'+esc(x.icon||'!')+'</span>'+
   '<div class="ndaItemCopy"><div class="ndaItemHeading"><strong>'+esc(x.title||'Anomalie')+'</strong>'+(contract?'<b class="ndaContractDelta">'+esc(value)+'</b>':'')+'</div>'+
   '<p>'+esc(x.detail||'')+'</p>'+info+'</div></article>'
 }).join('')+'</div>'
}
function make(){
 if(modal?.isConnected)return modal;
 modal=document.createElement('dialog');
 modal.className='ndAnomalyDialog';
 modal.id='nethorPlanningAnomalyDialog';
 modal.setAttribute('aria-labelledby','ndaHeading');
 modal.setAttribute('aria-describedby','ndaIntro');
 modal.innerHTML='<div class="ndaPanel">'+
  '<div class="ndaHeader"><span class="ndaHeaderIcon" aria-hidden="true">!</span><div class="ndaHeaderCopy"><small>ANALYSE DU PLANNING</small><h2 id="ndaHeading">Détection d’anomalies</h2><p id="ndaIntro">Détail des contrôles sur le planning publié.</p></div><button class="ndaClose" type="button" data-nda-close aria-label="Fermer">×</button></div>'+
  '<div class="ndaSummary" data-nda-summary></div>'+
  '<div class="ndaTabs" role="tablist" aria-label="Période d’analyse"><button type="button" role="tab" data-nda-tab="day" aria-controls="ndaContent">Par jour</button><button type="button" role="tab" data-nda-tab="week" aria-controls="ndaContent">Semaine complète</button></div>'+
  '<div class="ndaStatus" data-nda-status role="status" aria-live="polite"></div>'+
  '<div class="ndaContent" id="ndaContent" role="tabpanel" data-nda-content></div>'+
  '<div class="ndaFooter"><small>Détections indicatives : une anomalie est un point à vérifier, pas nécessairement une erreur de planning.</small><a data-nda-planning-link href="planning.html">Voir le planning complet ↗</a></div>'+
 '</div>';
 document.body.appendChild(modal);
 modal.querySelector('[data-nda-close]').addEventListener('click',()=>modal.close());
 modal.addEventListener('click',e=>{
  if(e.target===modal)modal.close();
  const tab=e.target.closest('[data-nda-tab]');
  if(tab){state.mode=tab.dataset.ndaTab;paint();return}
  const day=e.target.closest('[data-nda-day]');
  if(day){state.selectedDay=day.dataset.ndaDay;state.mode='day';paint();return}
  const fromWeek=e.target.closest('[data-nda-week-day]');
  if(fromWeek){state.selectedDay=fromWeek.dataset.ndaWeekDay;state.mode='day';paint();return}
 });
 modal.addEventListener('close',()=>{request++;state=null});
 return modal
}
function summary(){
 const report=state.report,today=report?.days?.find(x=>x.date===state.todayKey),dayCount=today?.count;
 const nDay=dayCount===null||dayCount===undefined?'—':String(dayCount);
 const nWeek=report?.weekTotal===null||report?.weekTotal===undefined?'—':String(report.weekTotal);
 return '<div class="ndaStat"><span>Aujourd’hui</span><strong>'+nDay+'</strong><small>anomalie'+(dayCount>1?'s':'')+'</small></div>'+
  '<div class="ndaStat isWeek"><span>Semaine complète</span><strong>'+nWeek+'</strong><small>jours et heures de contrat</small></div>'+
  '<div class="ndaWeekRange"><span>Semaine du</span><strong>'+esc(label(state.weekStart,true))+'</strong><small>au '+esc(label(core().plusDays(state.weekStart,6),true))+'</small></div>'
}
function dayView(){
 const report=state.report;
 const day=report?.days?.find(x=>x.date===state.selectedDay);
 const names=core()?.weekKeys(state.weekStart)||[];
 const navigation='<div class="ndaDays" aria-label="Sélectionner une journée">'+names.map((date,i)=>{
  const d=report?.days?.[i],selected=date===state.selectedDay,count=d?.count;
  return '<button type="button" class="ndaDayButton'+(selected?' isCurrent':'')+'" data-nda-day="'+esc(date)+'" aria-pressed="'+selected+'">'+
   '<span>'+DAYS[i].slice(0,3)+'</span><strong>'+esc(label(date))+'</strong>'+
   '<b class="'+(count===null?'isUnknown':count?'hasAnomalies':'isClear')+'">'+(count===null?'—':count)+'</b></button>'
 }).join('')+'</div>';
 const title='<div class="ndaContentHead"><div><strong>'+esc(DAYS[names.indexOf(state.selectedDay)]||'Journée')+' '+esc(label(state.selectedDay,true))+'</strong><small>'+ (day?.available?sentence(day.items.length,'anomalie détectée','anomalies détectées'):'Planning non disponible pour cette journée')+'</small></div></div>';
 const content=!day?.available?'<div class="ndaNoData">Aucun planning publié pour cette journée. Aucun contrôle ne peut être effectué.</div>':itemsHtml(day.items);
 return navigation+title+content
}
function weekView(){
 const r=state.report;
 let body='<div class="ndaContentHead"><div><strong>Analyse de la semaine</strong><small>Sept journées, de lundi à dimanche. Sélectionne une journée pour voir le détail.</small></div></div>';
 for(let i=0;i<7;i++){
  const d=r.days[i],name=DAYS[i],count=d.count;
  body+='<button type="button" class="ndaWeekRow" data-nda-week-day="'+esc(d.date)+'">'+
   '<span class="ndaWeekDay">'+name[0].toUpperCase()+name.slice(1)+' <small>'+esc(label(d.date))+'</small></span>'+
   '<span class="ndaWeekCount '+(!d.available?'notPublished':count?'hasIssues':'noIssues')+'">'+(!d.available?'Planning absent':sentence(count,'anomalie','anomalies'))+'</span><span aria-hidden="true">›</span></button>';
 }
 const extra=r.weekItems||[];
 body+='<div class="ndaWeekContracts"><details'+(extra.length?' open':'')+'><summary><span><b>Différences d’heures de contrat</b><small>Comparaison hebdomadaire avec les valeurs importées ou les contrats connus</small></span><b class="ndaContractCount">'+extra.length+'</b></summary>'+
 (extra.length?itemsHtml(extra):'<div class="ndaZero ndaWeeklyClear"><span>✓</span><div><strong>Aucune différence détectée</strong><small>Sur les informations disponibles pour cette semaine.</small></div></div>')+
 '</details></div>';
 return body
}
function status(message='',warn=false){
 if(!modal)return;
 const el=modal.querySelector('[data-nda-status]');
 if(el){el.textContent=message;el.classList.toggle('isWarn',warn);el.hidden=!message}
}
function paint(){
 if(!modal||!state)return;
 modal.querySelector('[data-nda-summary]').innerHTML=summary();
 modal.querySelectorAll('[data-nda-tab]').forEach(btn=>{
  const active=btn.dataset.ndaTab===state.mode;
  btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;btn.classList.toggle('isActive',active)
 });
 modal.querySelector('[data-nda-content]').innerHTML=state.mode==='week'?weekView():dayView();
 const link=modal.querySelector('[data-nda-planning-link]');
 if(link)link.href='planning.html?week='+encodeURIComponent(state.weekStart)+'&day='+encodeURIComponent(state.selectedDay);
}
function updateTile(report){
 const today=report?.days?.find(d=>d.date===state?.todayKey),count=today?.count;
 const card=document.querySelector('.nethorDesktopReferenceDashboard .ndKpi-alerts');
 if(!card)return;
 const number=card.querySelector('.ndKpiBody strong'),subtitle=card.querySelector('.ndKpiBody small');
 if(number)number.textContent=count===null||count===undefined?'—':String(count);
 if(subtitle)subtitle.textContent=count===null||count===undefined?'planning du jour non renseigné':count?sentence(count,'anomalie détectée','anomalies détectées')+' aujourd’hui':'aucune anomalie détectée aujourd’hui';
}
async function refresh(seq){
 const snapshot=state;if(!snapshot?.db)return;
 const modelQuery=snapshot.db.from('planning_weeks').select('week_start,data').eq('week_start',snapshot.weekStart).maybeSingle();
 const to=core().plusDays(snapshot.weekStart,6);
 const absQuery=snapshot.db.from('planning_absences').select('id,user_id,display_name,type,start_date,end_date,status')
  .lte('start_date',to).gte('end_date',snapshot.weekStart).in('status',['approved','pending']);
 try{
  const [weekRes,absenceRes]=await Promise.all([modelQuery,absQuery]);
  if(seq!==request||!state||!modal?.open)return;
  if(weekRes.error)throw weekRes.error;
  const model=weekRes.data?.data||null;
  // If absences are not accessible, do not mistake an incomplete query for full verification.
  const absences=absenceRes.error?snapshot.absences||[]:(absenceRes.data||[]);
  snapshot.model=model;snapshot.absences=absences;
  snapshot.report=core().analyze(model,snapshot.weekStart,snapshot.profiles,absences);
  paint();updateTile(snapshot.report);
  status(absenceRes.error?'Planning actualisé · demandes d’absence non vérifiables.':'Planning vérifié avec la dernière version enregistrée.',!!absenceRes.error);
 }catch(error){
  if(seq!==request||!state||!modal?.open)return;
  console.warn('Anomalies accueil : mise à jour impossible',error);
  status('Actualisation indisponible : résultats issus du dernier chargement de l’accueil.',true)
 }
}
function open(options){
 if(!core()?.analyze)return;
 const win=make();
 if(win.open)return;
 request++;
 const weekStart=options?.weekStart||'';
 state={db:options?.db||null,profiles:options?.profiles||[],absences:options?.absences||[],
  model:options?.model||null,weekStart,todayKey:options?.todayKey||weekStart,
  selectedDay:options?.todayKey||weekStart,mode:'day',
  report:options?.report||core().analyze(options?.model||null,weekStart,options?.profiles||[],options?.absences||[])
 };
 if(!core().weekKeys(weekStart).includes(state.selectedDay))state.selectedDay=weekStart;
 paint();status('Vérification de la dernière version du planning…');
 win.showModal();
 void refresh(request)
}
window.NethorHomeAnomalyDialog=Object.freeze({open});
})();

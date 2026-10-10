/* Nethor Accueil Desktop — mini-fenêtre du calendrier des livraisons. */
(function(){
'use strict';
if(window.NethorHomeDeliveryDialog)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const core=()=>window.NethorDeliverySchedule;
const DAY_NAMES=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
let dialog=null,state=null,revision=0;
function label(iso,year=false){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));if(!m)return iso||'—';
 return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])))
}
function plural(n,single,multiple){return n+' '+(n>1?multiple:single)}
function rowTime(rule){
 if(rule.period==='nuit')return 'Dans la nuit · horaire non précisé';
 if(rule.window_start&&rule.window_end)return 'Entre '+rule.window_start.replace(':',' h ')+' et '+rule.window_end.replace(':',' h ');
 return 'Horaire non communiqué'
}
function sourceText(){
 return state?.report?.source==='database'?'Calendrier des livraisons · base Nethor':'Calendrier de secours · lecture Supabase indisponible'
}
function groupedRows(rows,kind){
 if(!rows.length){
  const msg=kind==='overnight'?'Aucune livraison de nuit habituelle ce jour.':kind==='possible'?'Aucune livraison occasionnelle signalée.':'Aucune livraison de jour habituelle prévue.';
  return '<div class="nddEmpty"><span aria-hidden="true">✓</span>'+esc(msg)+'</div>'
 }
 return '<div class="nddDeliveryRows">'+rows.map(rule=>{
  const type=rule.category==='frais'?'Frais':rule.category==='gel'?'Gel':'Sec',uncertain=kind==='possible';
  return '<article class="nddDeliveryRow nddCategory-'+esc(rule.category)+'">'+
   '<span class="nddDeliveryGlyph" aria-hidden="true">'+(rule.category==='frais'?'❄':rule.category==='gel'?'◈':'▤')+'</span>'+
   '<div class="nddDeliveryCopy"><strong>'+esc(rule.label)+'</strong>'+
    '<small>'+esc(rowTime(rule))+'</small>'+
    (rule.note?'<span>'+esc(rule.note)+'</span>':'')+
   '</div><b class="nddDeliveryPill '+(uncertain?'isPossible':kind==='overnight'?'isOvernight':'isExpected')+'">'+
    (uncertain?'À confirmer':kind==='overnight'?'Hors compteur':'Habituel')+'</b>'+
  '</article>'
 }).join('')+'</div>'
}
function section(title,subtitle,rows,type){
 const count=rows.length;
 return '<section class="nddDeliverySection"><div class="nddSectionHead"><div><h3>'+esc(title)+'</h3><p>'+esc(subtitle)+'</p></div><b class="nddSectionCount nddSectionCount-'+type+'">'+count+'</b></div>'+
 groupedRows(rows,type)+'</section>'
}
function selected(){
 return state.report.days.find(d=>d.date===state.selectedDay)||state.report.days[0];
}
function stats(){
 const r=state.report,today=r.days.find(d=>d.date===state.todayKey),dayCount=today?.expectedCount??0;
 return '<div class="ndaStat"><span>Aujourd’hui</span><strong>'+dayCount+'</strong><small>flux habituel'+(dayCount>1?'s':'')+' de jour</small></div>'+
  '<div class="ndaStat isWeek"><span>Cette semaine</span><strong>'+r.weekExpected+'</strong><small>flux habituels de jour</small></div>'+
  '<div class="ndaWeekRange"><span>Possibles cette semaine</span><strong>'+r.weekPossible+'</strong><small>non comptabilisé'+(r.weekPossible>1?'s':'')+' comme certain'+(r.weekPossible>1?'s':'')+'</small></div>'
}
function dayView(){
 const r=state.report,d=selected();
 const nav='<div class="ndaDays" aria-label="Choisir une journée">'+r.days.map((item,i)=>{
  const active=item.date===state.selectedDay,any=item.expectedCount>0;
  return '<button type="button" class="ndaDayButton'+(active?' isCurrent':'')+'" data-ndd-day="'+esc(item.date)+'" aria-pressed="'+active+'">'+
   '<span>'+DAY_NAMES[i].slice(0,3)+'</span><strong>'+esc(label(item.date))+'</strong><b class="'+(any?'hasAnomalies':'isClear')+'">'+item.expectedCount+'</b></button>'
 }).join('')+'</div>';
 const heading='<div class="ndaContentHead"><div><strong>'+esc(DAY_NAMES[r.days.indexOf(d)]||'Journée')+' '+esc(label(d.date,true))+'</strong><small>'+
  plural(d.expectedCount,'flux habituel de jour','flux habituels de jour')+' · '+plural(d.possibleCount,'possible','possibles')+
  ' · '+plural(d.overnightCount,'de nuit','de nuit')+'</small></div></div>';
 return nav+heading+
  section('Livraisons habituelles de jour','Seules ces lignes entrent dans le compteur de l’accueil.',d.expected,'expected')+
  section('Livraisons possibles','Occasionnelles : elles ne sont pas comptées comme certaines.',d.possible,'possible')+
  section('Livraisons de nuit','Flux frais informatifs, exclus du compteur de l’accueil.',d.overnight,'overnight');
}
function weekView(){
 const r=state.report;
 let body='<div class="ndaContentHead"><div><strong>Calendrier hebdomadaire</strong><small>Les chiffres sont ceux des flux habituels, pas des camions ni des réceptions confirmées.</small></div></div>';
 body+='<div class="nddWeekLegend"><span class="isExpected">● Habituel de jour</span><span class="isPossible">● Possible</span><span class="isOvernight">● De nuit (hors compteur)</span></div>';
 for(let i=0;i<7;i++){
  const d=r.days[i];
  body+='<button class="ndaWeekRow nddWeekRow" data-ndd-weekday="'+esc(d.date)+'" type="button">'+
   '<span class="ndaWeekDay">'+DAY_NAMES[i]+' <small>'+esc(label(d.date))+'</small></span>'+
   '<span class="nddWeekCounters"><b class="'+(d.expectedCount?'hasExpected':'isZero')+'" title="Flux habituels de jour">'+d.expectedCount+'</b>'+
   (d.possibleCount?'<b class="isPossible" title="Flux possibles">'+d.possibleCount+' ?</b>':'')+
   (d.overnightCount?'<b class="isOvernight" title="Livraisons de nuit hors compteur">'+d.overnightCount+' nuit</b>':'')+
   '</span><span aria-hidden="true">›</span></button>'
 }
 body+='<div class="nddWeekNote">Les <strong>'+r.weekOvernight+' flux de nuit</strong> de la semaine sont visibles dans le détail de chaque jour, mais jamais inclus dans le total des livraisons attendues.</div>';
 return body
}
function status(msg,warning=false){
 if(!dialog)return;const label=dialog.querySelector('[data-ndd-status]');
 if(label){label.hidden=!msg;label.textContent=msg;label.classList.toggle('isWarn',warning)}
}
function render(){
 if(!dialog||!state)return;
 dialog.querySelector('[data-ndd-summary]').innerHTML=stats();
 dialog.querySelector('[data-ndd-content]').innerHTML=state.tab==='week'?weekView():dayView();
 dialog.querySelectorAll('[data-ndd-tab]').forEach(tab=>{
  const active=tab.dataset.nddTab===state.tab;
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.classList.toggle('isActive',active)
 });
 const src=dialog.querySelector('[data-ndd-source]');if(src)src.textContent=sourceText();
}
function ensureDialog(){
 if(dialog?.isConnected)return dialog;
 dialog=document.createElement('dialog');
 dialog.id='nethorHomeDeliveryDialog';
 dialog.className='ndAnomalyDialog ndDeliveryDialog';
 dialog.setAttribute('aria-labelledby','nddHeading');
 dialog.setAttribute('aria-describedby','nddIntro');
 dialog.innerHTML='<div class="ndaPanel">'+
 '<div class="ndaHeader"><span class="ndaHeaderIcon nddHeaderIcon" aria-hidden="true">▤</span>'+
 '<div class="ndaHeaderCopy"><small>CALENDRIER MAGASIN</small><h2 id="nddHeading">Livraisons attendues</h2>'+
 '<p id="nddIntro">Jours habituels de passage · Netto Le Thor.</p></div>'+
 '<button class="ndaClose" type="button" data-ndd-close aria-label="Fermer">×</button></div>'+
 '<div class="ndaSummary" data-ndd-summary></div>'+
 '<div class="ndaTabs" role="tablist" aria-label="Période de livraison">'+
 '<button type="button" role="tab" data-ndd-tab="day" aria-controls="nddContent">Par jour</button>'+
 '<button type="button" role="tab" data-ndd-tab="week" aria-controls="nddContent">Semaine complète</button></div>'+
 '<div class="ndaStatus" data-ndd-status role="status" aria-live="polite" hidden></div>'+
 '<div class="ndaContent nddContent" id="nddContent" role="tabpanel" data-ndd-content></div>'+
 '<div class="ndaFooter nddFooter"><small><strong data-ndd-source></strong> · Les passages sont prévisionnels et ne confirment pas leur réception.</small>'+
 '<button class="nddFooterClose" type="button" data-ndd-close>Fermer</button></div></div>';
 document.body.appendChild(dialog);
 dialog.addEventListener('click',event=>{
  if(event.target===dialog){dialog.close();return}
  if(event.target.closest('[data-ndd-close]')){dialog.close();return}
  const tab=event.target.closest('[data-ndd-tab]');
  if(tab){state.tab=tab.dataset.nddTab;render();return}
  const day=event.target.closest('[data-ndd-day]');
  if(day){state.selectedDay=day.dataset.nddDay;state.tab='day';render();return}
  const weekDay=event.target.closest('[data-ndd-weekday]');
  if(weekDay){state.selectedDay=weekDay.dataset.nddWeekday;state.tab='day';render()}
 });
 dialog.addEventListener('close',()=>{revision++;state=null});
 return dialog
}
function updateDashboardCount(){
 const card=document.querySelector('.nethorDesktopReferenceDashboard .ndKpi-deliveries');
 if(!card||!state)return;
 const day=state.report.days.find(d=>d.date===state.todayKey),count=day?.expectedCount??0,possible=day?.possibleCount??0;
 const number=card.querySelector('.ndKpiBody strong'),subtitle=card.querySelector('.ndKpiBody small');
 if(number)number.textContent=String(count);
 if(subtitle)subtitle.textContent='flux habituels de jour'+(possible?' · '+possible+' possible':'')+(state.report.source==='secours'?' · secours':'');
}
async function refresh(seq){
 const existing=state;if(!existing?.db)return;
 try{
  const response=await core().load(existing.db);
  if(!dialog?.open||seq!==revision||state!==existing)return;
  if(response.source==='secours'&&existing.report.source==='database'){
   status('Actualisation indisponible. Affichage de la dernière version chargée.',true);
   return;
  }
  existing.report=core().analyze(existing.weekStart,response.rows,response.source);
  render();updateDashboardCount();
  status(response.source==='database'?'Calendrier actualisé depuis la base Nethor.':'Mode secours : base Nethor momentanément indisponible.',response.source!=='database');
 }catch(e){
  if(seq!==revision||!dialog?.open)return;
  console.warn('Livraisons Nethor : actualisation indisponible',e);
  status('Actualisation impossible. Les informations affichées sont prévisionnelles.',true)
 }
}
function open(options={}){
 if(!core()?.analyze)return;
 const modal=ensureDialog();
 if(modal.open)return;
 const weekStart=String(options.weekStart||''),report=options.report||core().analyze(weekStart,core().DEFAULT_RULES,'secours'),todayKey=String(options.todayKey||'');
 state={db:options.db||null,weekStart,todayKey,selectedDay:todayKey,tab:'day',report};
 if(!report.days.some(d=>d.date===state.selectedDay))state.selectedDay=weekStart;
 const seq=++revision;
 render();status('Vérification du calendrier en base…');
 modal.showModal();
 void refresh(seq)
}
window.NethorHomeDeliveryDialog=Object.freeze({open});
})();
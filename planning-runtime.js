
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co',SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const PLANNING_SPA_MODE=document.documentElement.dataset.nethorMobileApp==='1';
let planningRuntimeActive=false,planningViewportBound=false;
let planningCacheReady=false,planningCacheUserId='',planningLoadedWeekKey='',planningLoadedRevisionAt='',planningWeekLoadError=false,planningWeekLoadSeq=0,planningDataChannel=null,planningDataRefreshTimer=null,planningDataSyncUnsubscribe=null;
let planningReadStatusByDay=new Map(),planningReadStatusWeekKey='',planningReadStatusSeq=0,planningReadStatusTimer=null,planningReadMarkKey='';
let planningLastSaveVerified=false,planningLastSaveOutcome='none',planningSaveInFlight=false,planningConflictDetected=false;
function planningSharedServices(){return PLANNING_SPA_MODE?(window.NethorMobileServices||window.MobileServices||null):null}
function planningPermissionFromShared(profile,config){
 const roleKey=profile?.role||'',page=config?.pages?.planning||{},levels={none:0,view:1,operate:2,manage:3};
 if(!roleKey||page.enabled===false)return'none';
 if(roleKey==='admin')return'manage';
 const explicit=config?.role_permissions?.planning?.[roleKey];
 let base=Object.prototype.hasOwnProperty.call(levels,explicit)?explicit:(Array.isArray(page.roles)?(page.roles.includes(roleKey)?'view':'none'):'view');
 const extra=planningSharedServices()?.subrolePermissions?.planning;
 if(Object.prototype.hasOwnProperty.call(levels,extra)&&(levels[extra]||0)>(levels[base]||0))base=extra;
 return base
}
function planningGoHome(){
 if(PLANNING_SPA_MODE&&window.NethorMobileRouter?.replace){window.NethorMobileRouter.replace('home',{source:'planning-access'});return}
 location.replace('home.html')
}

const COLOR={g:'#1FB714',b:'#00ABEA',r:'#DD0806',y:'#FFFF00',o:'#EDA900',w:'#FFFFFF'};
const DAYS=[['LUNDI','Lundi'],['MARDI','Mardi'],['MERCREDI','Mercredi'],['JEUDI','Jeudi'],['VENDREDI','Vendredi'],['SAMEDI','Samedi'],['DIMANCHE','Dimanche']];
let db=null,role=null,canEdit=false,planningPermissionLevel='none',currentUser=null,model=null,editMode=false,paintColor='g',planningView='week',teamProfiles=[],planningProfileChannel=null,planningAbsences=[],absenceAccess='hidden',planningSiteConfig={};
let currentWeekStart=startOfWeek(new Date()),currentDay=Math.max(0,Math.min(6,(new Date().getDay()+6)%7)),currentYear=new Date().getFullYear(),planningDeepLinkFocus='';
let drag={active:false,row:null,pointerId:null,changed:new Set(),first:null,last:null};
let editChanges=new Map(),editSnapshot=null;

function isoDate(d){const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function parseISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function startOfWeek(d){const x=new Date(d),n=(x.getDay()+6)%7;x.setHours(0,0,0,0);x.setDate(x.getDate()-n);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function frDate(d){return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
function fmtTime(t){const h=Math.floor(t),m=Math.round((t-h)*60);return h+(m?':'+String(m).padStart(2,'0'):'')}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(v){return String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function showToast(msg){let t=document.getElementById('planningToast');if(!t){t=document.createElement('div');t.id='planningToast';t.className='planningToast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(window._pt);window._pt=setTimeout(()=>t.classList.remove('show'),2400)}
function setSaveState(v){const e=document.getElementById('saveState');if(!e)return;e.textContent=v;e.classList.toggle('passive',String(v||'').trim()==='Lecture seule')}
function playUISound(){window.NettoSounds?.play?.('tap')}

function syncPlanningCalendarViewport(){
 const vv=window.visualViewport;
 const height=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0);
 if(height>0)document.documentElement.style.setProperty('--planning-calendar-h',height+'px');
 document.documentElement.style.setProperty('--planning-calendar-top','0px');
}
function bindPlanningCalendarViewport(){
 syncPlanningCalendarViewport();
 if(planningViewportBound)return;
 planningViewportBound=true;
 window.addEventListener('resize',syncPlanningCalendarViewport,{passive:true});
 window.visualViewport?.addEventListener('resize',syncPlanningCalendarViewport,{passive:true});
 window.visualViewport?.addEventListener('scroll',syncPlanningCalendarViewport,{passive:true})
}
function detectPlanningDevice(){
 if(String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase()==='desktop')return{key:'desktop',label:'Bureau'};
 const ua=String(navigator.userAgent||'');
 const platform=String(navigator.userAgentData?.platform||navigator.platform||'');
 const ipadAsMac=/Mac/i.test(platform)&&navigator.maxTouchPoints>1;
 if(/iPhone|iPad|iPod/i.test(ua)||ipadAsMac)return{key:'ios',label:'iOS'};
 if(/Android/i.test(ua)||/Android/i.test(platform))return{key:'android',label:'Android'};
 return{key:'mobile',label:'Mobile'}
}
function applyPlanningDeviceUI(){
 document.documentElement.classList.add('planningCalendarReady');
 const device=detectPlanningDevice();
 document.documentElement.dataset.planningDevice=device.key;
 const label=document.getElementById('planningDeviceLabel');
 const badge=document.getElementById('yearPlatformBadge');
 if(label)label.textContent=device.label;
 if(badge)badge.textContent='• '+device.label;
}
function slots(m=model){const count=m?.slotCount||58,start=m?.startTime??6;return Array.from({length:count},(_,i)=>start+i*.25)}
function dayKey(index=currentDay){return isoDate(addDays(currentWeekStart,index))}
function modelDay(index=currentDay){return model?.days?.[dayKey(index)]||null}
function totalForRow(row){if(!row)return 0;let n=0;for(const v of row)if(v==='g'||v==='b')n++;return n*.25}
function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}
function planningProfileFor(name){const n=norm(name),base=n.replace(/\s+[a-z]$/,'');return teamProfiles.find(p=>norm(p.display_name)===n)||teamProfiles.find(p=>norm(p.display_name)===base)||null}
function canOpenPlanningUserCard(){return role==='admin'||role==='role_point-de-vente'}
function identityAvatarHtml(p,name,cls='planningIdentityAvatar'){const color=p?.profile_color||'#ff5a2a',photo=p?.avatar_url,frame=p?.avatar_frame||'',clickable=canOpenPlanningUserCard()&&!!p?.id,tag=clickable?'button':'span',attrs=clickable?' type="button" class="'+cls+(photo?' hasPhoto':'')+' planningAvatarButton" data-planning-user-id="'+esc(p.id)+'" aria-label="Ouvrir la fiche de '+esc(name)+'"':' class="'+cls+(photo?' hasPhoto':'')+'"';return '<'+tag+attrs+' '+(frame?'data-avatar-frame="'+esc(frame)+'" ':'')+'style="background:'+(photo?'url(&quot;'+esc(photo)+'&quot;) center/cover no-repeat':esc(color))+'">'+(photo?'':esc(initials(name)))+'</'+tag+'>'}
async function planningUserCardFeature(){
 if(window.NettoProfileUI?.openUserCard)return{open:(user,opts)=>window.NettoProfileUI.openUserCard(user,opts)};
 if(window.NethorProfileFeatures?.userCard)return window.NethorProfileFeatures.userCard;
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-planning-user-card]');
  const done=()=>window.NethorProfileFeatures?.userCard?resolve(window.NethorProfileFeatures.userCard):reject(new Error('Fiche utilisateur indisponible'));
  if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>reject(new Error('Fiche utilisateur indisponible')),{once:true});return}
  const s=document.createElement('script');s.src='profile-user-card.js?v=2';s.async=true;s.dataset.planningUserCard='1';s.onload=done;s.onerror=()=>reject(new Error('Fiche utilisateur indisponible'));document.head.appendChild(s)
 })
}
async function openPlanningUserCard(userId){
 if(!canOpenPlanningUserCard())return;
 const p=teamProfiles.find(x=>x.id===userId);if(!p)return showToast('Fiche utilisateur indisponible');
 try{
  const feature=await planningUserCardFeature();
  feature.open(p,{
   messageUrl:'chat.html?user='+encodeURIComponent(p.id),
   onMessage:user=>{
    const mobileRouter=window.NethorMobileRouter||window.MobileRouter;
    if(mobileRouter?.open)mobileRouter.open('chat',{params:{user:user.id},source:'planning-user-card'});
    else location.href='chat.html?user='+encodeURIComponent(user.id)
   }
  })
 }catch(_){showToast('Fiche utilisateur indisponible')}
}
document.addEventListener('click',e=>{const avatar=e.target.closest('[data-planning-user-id]');if(!avatar)return;e.preventDefault();e.stopPropagation();openPlanningUserCard(avatar.dataset.planningUserId)});
function identityHtml(name){const p=planningProfileFor(name),label=p?.display_name||name;return '<div class="planningIdentity">'+identityAvatarHtml(p,label)+'<span class="planningIdentityText"><strong>'+esc(label)+'</strong></span></div>'}
function rowRanges(row){const out=[];let start=null,color=null;for(let i=0;i<=row.length;i++){const v=i<row.length?(row[i]||null):null;if(v!==color){if(color&&start!==null)out.push({a:(model.startTime??6)+start*.25,b:(model.startTime??6)+i*.25,c:color});start=v?i:null;color=v}}return out}
function renderMobileSchedule(day,employees,rows){
 const box=document.getElementById('mobileSchedule');if(!box)return;if(!model||!day){box.classList.add('hidden');box.innerHTML='';return}box.classList.remove('hidden');
 const colorName={g:'Matin',b:'Après-midi',r:'Rouge',y:'Congé',o:'Orange',w:'Blanc'};
 let html='<div class="mobileTimelineNote">Vue mobile simplifiée • les horaires et statuts proviennent du planning enregistré.</div>';
 employees.forEach((emp,ri)=>{const row=rows[ri]||[],p=planningProfileFor(emp.name),name=p?.display_name||emp.name,ranges=rowRanges(row).filter(x=>x.c==='g'||x.c==='b'),total=totalForRow(row),personal=p?.id===currentUser?.id||norm(name)===norm(currentUser?.name),hasLeave=total===0&&row.some(v=>v==='y'),isRestTarget=planningDeepLinkFocus==='rest'&&total===0&&personal,isLeaveTarget=planningDeepLinkFocus==='leave'&&hasLeave&&personal;
   html+='<article class="mobileEmployeeCard '+(isRestTarget?'deepLinkRestTarget ':'')+(isLeaveTarget?'deepLinkLeaveTarget':'')+'"><div class="mobileEmployeeHead">'+identityAvatarHtml(p,name)+'<div class="mobileEmployeeInfo"><strong>'+esc(name)+'</strong></div><span class="mobileTotal">'+String(total).replace('.',',')+' h</span></div><div class="mobileShifts">';
   if(ranges.length)ranges.forEach(x=>{html+='<div class="mobileShift"><i style="--shift:'+COLOR[x.c]+'"></i><strong>'+fmtTime(x.a)+' → '+fmtTime(x.b)+'</strong><small>'+esc(colorName[x.c]||'')+'</small></div>'});
   else if(hasLeave)html+='<div class="mobileOff leaveState '+(isLeaveTarget?'leaveFocus':'')+'">Congé</div>';
   else html+='<div class="mobileOff '+(isRestTarget?'restFocus':'')+'">'+(isRestTarget?'Jour de repos':'Aucun horaire renseigné')+'</div>';
   html+='</div></article>'
 });box.innerHTML=html;
 if(planningDeepLinkFocus==='rest'){const target=box.querySelector('.deepLinkRestTarget');if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'}))}
 if(planningDeepLinkFocus==='leave'){const target=box.querySelector('.deepLinkLeaveTarget');if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'}))}
}
async function loadTeamProfiles(){const {data,error}=await db.rpc('list_team_members');if(error){console.warn('Identités planning:',error);teamProfiles=[];return}teamProfiles=await Promise.all((data||[]).map(async p=>{if(p.avatar_path){const {data:a}=await db.storage.from('profile-avatars').createSignedUrl(p.avatar_path,3600);p.avatar_url=a?.signedUrl||null}return p}))}
async function refreshPlanningProfiles(){await loadTeamProfiles();if(planningRuntimeActive)renderAll()}
function startPlanningProfileRealtime(){if(planningProfileChannel||!db)return;planningProfileChannel=db.channel('planning-profile-avatars').on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},()=>{refreshPlanningProfiles().catch(()=>{})}).subscribe()}
function currentPlanningWeekKey(){return isoDate(currentWeekStart)}
function planningParisDateKey(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const pick=type=>parts.find(x=>x.type===type)?.value||'';
 return pick('year')+'-'+pick('month')+'-'+pick('day')
}
function planningReadStatusEnabled(){
 return !PLANNING_SPA_MODE&&detectPlanningDevice().key==='desktop'&&planningPermissionLevel==='manage'
}
function planningReadStatusForProfile(profile,date=dayKey()){
 if(!profile?.id||planningReadStatusWeekKey!==currentPlanningWeekKey())return null;
 return planningReadStatusByDay.get(date)?.get(String(profile.id))||null
}
function planningReadBadgeHtml(profile,date=dayKey(),compact=false){
 const status=planningReadStatusForProfile(profile,date);
 if(!status?.status_visible)return '';
 const read=status.is_read===true,readAt=read&&status.read_at?new Date(status.read_at):null;
 const time=readAt&&!Number.isNaN(readAt.getTime())?readAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
 const title=read?('Planning consulté'+(time?' à '+time:'')):'Planning non consulté ce jour';
 return '<span class="planningReadBadge '+(read?'isRead':'isUnread')+(compact?' compact':'')+'" title="'+esc(title)+'" aria-label="'+esc(read?'Lu':'Non lu')+'"><span class="planningReadIcon" aria-hidden="true">'+(read?'✓':'◷')+'</span>'+(compact?'':'<span class="planningReadText">'+(read?'Lu':'Non lu')+(time?'<small>'+esc(time)+'</small>':'')+'</span>')+'</span>'
}
function planningReadCellHtml(profile,date=dayKey()){
 const status=planningReadStatusForProfile(profile,date);
 if(!status?.status_visible)return '';
 const read=status.is_read===true,readAt=read&&status.read_at?new Date(status.read_at):null;
 const time=readAt&&!Number.isNaN(readAt.getTime())?readAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
 const title=read?('Lu'+(time?' à '+time:'')):'Non lu';
 return '<span class="planningReadCellState '+(read?'isRead':'isUnread')+'" title="'+esc(title)+'" aria-label="'+esc(title)+'"><span aria-hidden="true">'+(read?'✓':'◷')+'</span><b>'+(read?'Lu':'Non lu')+'</b></span>'
}
function planningReadWeekSummaryHtml(name,start=currentWeekStart){
 if(!planningReadStatusEnabled())return '';
 const profile=planningProfileFor(name);if(!profile?.id)return '';
 const labels=['L','Ma','Me','J','V','S','D'],marks=[];
 for(let i=0;i<7;i++){
  const date=isoDate(addDays(start,i)),status=planningReadStatusForProfile(profile,date);
  if(!status?.status_visible)continue;
  const read=status.is_read===true,readAt=read&&status.read_at?new Date(status.read_at):null;
  const time=readAt&&!Number.isNaN(readAt.getTime())?readAt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  const title=DAYS[i][1]+' • '+(read?'Lu'+(time?' à '+time:''):'Non lu');
  marks.push('<span class="planningReadDayMark '+(read?'isRead':'isUnread')+'" title="'+esc(title)+'" aria-label="'+esc(title)+'">'+labels[i]+'</span>')
 }
 return marks.length?'<div class="planningReadWeekMarks">'+marks.join('')+'</div>':''
}
function clearPlanningReadStatuses(weekKey=''){
 planningReadStatusSeq++;
 planningReadStatusByDay=new Map();
 planningReadStatusWeekKey=weekKey;
 planningReadMarkKey=''
}
async function loadPlanningReadStatusDay(date,opts={}){
 if(!planningReadStatusEnabled()||!db||!currentUser||!model)return false;
 const week=currentPlanningWeekKey(),weekEnd=isoDate(addDays(currentWeekStart,6));
 if(date<week||date>weekEnd)return false;
 if(planningReadStatusWeekKey!==week)clearPlanningReadStatuses(week);
 const seq=planningReadStatusSeq,requestWeek=week;
 const {data,error}=await db.rpc('planning_day_read_status',{p_week_start:week,p_day:date});
 if(seq!==planningReadStatusSeq||requestWeek!==currentPlanningWeekKey())return false;
 if(error){console.warn('Suivi lecture planning:',error);return false}
 const next=new Map();
 for(const row of data||[])next.set(String(row.user_id),row);
 planningReadStatusByDay.set(date,next);
 if(opts.render!==false&&planningRuntimeActive)renderAll();
 return true
}
async function loadPlanningReadStatusWeek(opts={}){
 const week=currentPlanningWeekKey();
 if(!planningReadStatusEnabled()||!db||!currentUser||!model){clearPlanningReadStatuses(week);return false}
 clearPlanningReadStatuses(week);
 const seq=planningReadStatusSeq,requestWeek=week;
 const {data,error}=await db.rpc('planning_week_read_status',{p_week_start:week});
 if(seq!==planningReadStatusSeq||requestWeek!==currentPlanningWeekKey())return false;
 if(error){console.warn('Suivi lecture planning:',error);return false}
 const nextByDay=new Map();
 for(let i=0;i<7;i++)nextByDay.set(isoDate(addDays(currentWeekStart,i)),new Map());
 for(const row of data||[]){
  const date=String(row.day_date||'');
  if(!nextByDay.has(date))nextByDay.set(date,new Map());
  nextByDay.get(date).set(String(row.user_id),row)
 }
 planningReadStatusByDay=nextByDay;
 planningReadStatusWeekKey=week;
 if(opts.render!==false&&planningRuntimeActive)renderAll();
 return true
}
function startPlanningReadStatusPolling(){
 clearInterval(planningReadStatusTimer);planningReadStatusTimer=null;
 if(!planningReadStatusEnabled())return;
 planningReadStatusTimer=setInterval(()=>{
  if(!planningRuntimeActive||!model)return;
  loadPlanningReadStatusWeek({render:true}).catch(()=>{})
 },15000)
}
async function markPlanningDayRead(date=dayKey(),source=''){
 if(!db||!currentUser||!model||(editMode&&changedDates().length)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(date||'')))return false;
 const markSource=source||(PLANNING_SPA_MODE?'planning_mobile':'planning_desktop');
 const revision=planningLoadedRevisionAt;
 const week=currentPlanningWeekKey();
 if(!revision||planningLoadedWeekKey!==week||planningWeekLoadError||date<week||date>isoDate(addDays(currentWeekStart,6)))return false;
 const key=String(currentUser.id)+'|'+date+'|'+revision+'|'+markSource;
 if(planningReadMarkKey===key)return true;
 const {data,error}=await db.rpc('planning_mark_day_read',{p_day:date,p_source:markSource,p_revision_at:revision});
 if(error){console.warn('Lecture planning:',error);return false}
 if(data===true){
  planningReadMarkKey=key;
  if(planningReadStatusEnabled())await loadPlanningReadStatusDay(date,{render:false});
  return true
 }
 return false
}
function planningAbsenceTouchesCurrentWeek(payload){
 const from=currentPlanningWeekKey(),to=isoDate(addDays(currentWeekStart,6));
 const rows=[payload?.new,payload?.old].filter(Boolean);
 if(!rows.length)return true;
 return rows.some(row=>!row.start_date||!row.end_date||(row.start_date<=to&&row.end_date>=from))
}
function schedulePlanningDataRefresh(){
 const key=currentPlanningWeekKey();
 clearTimeout(planningDataRefreshTimer);
 planningDataRefreshTimer=setTimeout(async()=>{
  if(key!==currentPlanningWeekKey()||!db||!currentUser)return;
  try{
   if(planningSaveInFlight)return;
   if(editMode&&changedDates().length){
    const {data,error}=await db.from('planning_weeks').select('updated_at').eq('week_start',key).maybeSingle();
    if(error){console.warn('Version du planning pendant édition :',error);return}
    if(!data||String(data.updated_at||'')!==String(planningLoadedRevisionAt||'')){
     if(!planningConflictDetected){
      planningConflictDetected=true;
      setSaveState('Conflit : planning modifié ailleurs');
      showToast('Planning modifié ailleurs : vos modifications locales sont conservées')
     }
    }
    return
   }
   const refreshed=await loadWeek(parseISO(key),{render:false,silent:true});
   if(refreshed!==false&&planningRuntimeActive&&key===currentPlanningWeekKey()){await loadPlanningReadStatusWeek({render:false});renderAll()}
  }catch(e){console.warn('Actualisation Planning temps réel:',e)}
 },120)
}
function startPlanningDataRealtime(){
 if(!db)return;
 const sync=window.NethorMobileSync;
 if(PLANNING_SPA_MODE&&sync?.active&&typeof sync.subscribe==='function'){
  if(planningDataSyncUnsubscribe)return;
  planningDataSyncUnsubscribe=sync.subscribe(['planning','absences','resume'],detail=>{
   if(!planningRuntimeActive)return;
   if(detail.domain==='planning'&&detail.weekStart&&detail.weekStart!==currentPlanningWeekKey())return;
   schedulePlanningDataRefresh()
  });
  return
 }
 if(planningDataChannel)return;
 const suffix=String(currentUser?.id||'shared').replace(/[^a-z0-9_-]/gi,'').slice(0,36)||'shared';
 planningDataChannel=db.channel('planning-data-cache-'+suffix)
  .on('postgres_changes',{event:'*',schema:'public',table:'planning_weeks'},payload=>{
   const changed=payload?.new?.week_start||payload?.old?.week_start||'';
   if(!changed||changed===currentPlanningWeekKey())schedulePlanningDataRefresh()
  })
  .on('postgres_changes',{event:'*',schema:'public',table:'planning_absences'},payload=>{
   if(planningAbsenceTouchesCurrentWeek(payload))schedulePlanningDataRefresh()
  })
  .subscribe()
}
// Quand l'application revient au premier plan, revérifier la publication.
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&planningRuntimeActive&&!(PLANNING_SPA_MODE&&window.NethorMobileSync?.active))schedulePlanningDataRefresh()
});
window.addEventListener('pageshow',event=>{
 if(event.persisted&&planningRuntimeActive&&!(PLANNING_SPA_MODE&&window.NethorMobileSync?.active))schedulePlanningDataRefresh()
});
window.addEventListener('online',()=>{if(planningRuntimeActive&&!(PLANNING_SPA_MODE&&window.NethorMobileSync?.active))schedulePlanningDataRefresh()});
window.addEventListener('focus',()=>{if(planningRuntimeActive&&document.visibilityState==='visible'&&!(PLANNING_SPA_MODE&&window.NethorMobileSync?.active))schedulePlanningDataRefresh()});
function workRangesFor(row,m){const out=[];let start=null;for(let i=0;i<=row.length;i++){const working=i<row.length&&(row[i]==='g'||row[i]==='b');if(working&&start===null)start=i;if(!working&&start!==null){out.push({a:(m.startTime??6)+start*.25,b:(m.startTime??6)+i*.25});start=null}}return out}
function friendlyHour(t){const h=Math.floor(t),min=Math.round((t-h)*60);return min?h+'h'+String(min).padStart(2,'0'):h+'h'}
function currentUserEmployeeIndex(m){if(!m||!currentUser)return-1;const p=teamProfiles.find(x=>x.id===currentUser.id)||{display_name:currentUser.name};return (m.employees||[]).findIndex(e=>planningProfileFor(e.name)?.id===p.id||norm(e.name)===norm(p.display_name)||norm(e.name).replace(/\s+[a-z]$/,'')===norm(p.display_name))}
function shortDate(key){const d=parseISO(key);return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
function markPlanningChange(dayIndex,rowIndex){const key=isoDate(addDays(currentWeekStart,dayIndex)),name=model?.employees?.[rowIndex]?.name;if(!name)return;if(!editChanges.has(key))editChanges.set(key,new Set());editChanges.get(key).add(name);setSaveState('Modifications non enregistrées')}
function resetEditChanges(){editChanges=new Map()}
function changedDates(){return [...editChanges.keys()].sort()}
function changedProfilesByUser(){
 const map=new Map();
 for(const [date,names] of editChanges.entries())for(const name of names){const p=planningProfileFor(name);if(!p?.id)continue;if(!map.has(p.id))map.set(p.id,{profile:p,dates:new Set()});map.get(p.id).dates.add(date)}
 return map
}
async function notifyUsers(entries){
 if(!db||!currentUser||!entries?.length)return;
 const payload=entries.map(x=>({user_id:x.user_id,created_by:currentUser.id,kind:x.kind,title:x.title,message:x.message,planning_date:x.planning_date||null,week_start:x.week_start||isoDate(currentWeekStart),target_url:x.target_url||null}));
 const {error}=await db.from('planning_notifications').insert(payload);
 if(error){console.warn('Notifications planning:',error);return}
 const pushable=payload.filter(x=>['manual_edit','import_new','import_replace','absence_request','absence_decision'].includes(x.kind)).map(x=>({user_id:x.user_id,kind:x.kind,title:x.title,message:x.message,target_url:x.target_url}));
 if(pushable.length){
   const {error:pushError}=await db.functions.invoke('planning-push',{body:{action:'send',notifications:pushable}});
   if(pushError)console.warn('Push planning:',pushError)
 }
}
function planningWeekRangeLabel(date){
 const ws=startOfWeek(parseISO(date)),we=addDays(ws,6);
 return 'du '+shortDate(isoDate(ws))+' au '+shortDate(isoDate(we))
}
async function notifyChangedEmployees(){
 const entries=[];
 for(const [userId,v] of changedProfilesByUser()){
  const dates=[...v.dates].sort();if(!dates.length)continue;
  const first=dates[0],last=dates[dates.length-1],firstWeek=isoDate(startOfWeek(parseISO(first))),lastWeek=isoDate(startOfWeek(parseISO(last)));
  let message='';
  if(dates.length===1){
   message='Ton planning du '+shortDate(first)+' a été modifié.'
  }else if(dates.length<=3&&firstWeek===lastWeek){
   message='Ton planning du '+shortDate(first)+' au '+shortDate(last)+' a été modifié.'
  }else{
   const weeks=[...new Set(dates.map(d=>isoDate(startOfWeek(parseISO(d)))))];
   if(weeks.length===1){
    message='Ton planning de la semaine '+planningWeekRangeLabel(first)+' a été modifié.'
   }else{
    message='Ton planning des semaines '+weeks.map(w=>planningWeekRangeLabel(w)).join(' et ')+' a été modifié.'
   }
  }
  entries.push({
   user_id:userId,
   kind:'manual_edit',
   title:'📅 Planning modifié',
   message,
   planning_date:dates.length===1?first:null,
   week_start:firstWeek,
   target_url:'planning.html?week='+encodeURIComponent(firstWeek)+'&day='+encodeURIComponent(first)
  })
 }
 await notifyUsers(entries)
}
async function notifyWholePlanning(kind,m){
 const ids=new Set(),entries=[],replace=kind==='import_replace';
 for(const emp of m?.employees||[]){const p=planningProfileFor(emp.name);if(p?.id)ids.add(p.id)}
 const ws=m?.weekStart||isoDate(currentWeekStart),we=isoDate(addDays(parseISO(ws),6)),target='planning.html?week='+encodeURIComponent(ws)+'&day='+encodeURIComponent(ws);
 const from=frDate(parseISO(ws)),to=frDate(parseISO(we));
 for(const id of ids)entries.push({user_id:id,kind:replace?'import_replace':'import_new',title:replace?'Planning remplacé':'Nouveau planning',message:replace?'Le planning du '+from+' au '+to+' a été remplacé. Pense à reconsulter tes horaires.':'Un planning a été mis en ligne du '+from+' au '+to+'.',week_start:ws,target_url:target});
 await notifyUsers(entries)
}
function logDetails(obj){return JSON.stringify(obj)}
function parseLogDetails(v){try{const x=JSON.parse(v||'');return x&&typeof x==='object'?x:null}catch{return null}}





function absenceTypeLabel(v){return v==='leave'?'Congé':'Indisponibilité'}
function absenceStatusLabel(v){return({pending:'En attente',approved:'Validée',rejected:'Refusée',cancelled:'Annulée'})[v]||v}
function dateInAbsence(date,a){return !!a&&date>=a.start_date&&date<=a.end_date}
function needsPlanningAbsenceData(){
 return absenceAccess!=='hidden'||planningWidgetVisible(planningSiteConfig,'anomalies',role)
}
async function fetchPlanningAbsences(start=currentWeekStart){
 if(!db||!currentUser||!needsPlanningAbsenceData())return[];
 const week=startOfWeek(start),from=isoDate(week),to=isoDate(addDays(week,6));
 const {data,error}=await db.from('planning_absences').select('id,user_id,display_name,type,start_date,end_date,note,status,created_at,updated_at,reviewed_by,reviewed_at').lte('start_date',to).gte('end_date',from).order('created_at',{ascending:false});
 if(error){console.warn('Indisponibilités planning:',error);return[]}
 return data||[]
}
async function loadPlanningAbsences(start=currentWeekStart){
 planningAbsences=await fetchPlanningAbsences(start);
 return planningAbsences
}
function employeeAbsences(name,date,statuses=['approved','pending']){
 const p=planningProfileFor(name),id=p?.id,n=norm(p?.display_name||name);
 return planningAbsences.filter(a=>statuses.includes(a.status)&&dateInAbsence(date,a)&&(id?a.user_id===id:norm(a.display_name)===n))
}
function coverageForDay(day){
 const ss=slots(),rows=day?.cells||[];
 return ss.map((t,si)=>({time:t,count:rows.reduce((n,row)=>n+(((row?.[si]==='g'||row?.[si]==='b')?1:0)),0)}))
}
let coverageModeActive=false,coverageSelectedSlot=0;
function coverageModeAvailable(){
 return planningPlatformKind()==='desktop'&&document.documentElement.dataset.pwCoverage==='1'&&!document.body.classList.contains('agendaLayout')&&!editMode&&!!model&&!!modelDay()
}
function setCoverageMode(next){
 const btn=document.getElementById('coverageModeBtn'),overlay=document.getElementById('coverageOverlay');
 const active=!!next&&coverageModeAvailable();
 coverageModeActive=active;
 document.body.classList.toggle('coverageMode',active);
 if(btn){btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');const strong=btn.querySelector('.coverageModeBtnCopy strong');if(strong)strong.textContent=active?'Fermer':'Couverture'}
 if(overlay)overlay.classList.toggle('hidden',!active);
 if(active){renderCoverageOverlay();window.NettoSounds?.play?.('menuOpen');if(typeof syncPlanningWorkspaceTabs==='function')syncPlanningWorkspaceTabs('coverage')}else if(next===false){window.NettoSounds?.play?.('menuClose');if(typeof planningWorkspaceMode!=='undefined'&&planningWorkspaceMode==='coverage'&&typeof syncPlanningWorkspaceTabs==='function')syncPlanningWorkspaceTabs('planning')}
}
function toggleCoverageMode(){setCoverageMode(!coverageModeActive)}
let planningWorkspaceMode='planning';
function syncPlanningWorkspaceTabs(mode){
 planningWorkspaceMode=mode||'planning';
 ['planning','coverage','analysis'].forEach(key=>{
  const id='workspace'+key.charAt(0).toUpperCase()+key.slice(1)+'Btn';
  const btn=document.getElementById(id);
  if(btn){const on=key===planningWorkspaceMode;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',on?'true':'false')}
 })
}
function setPlanningWorkspaceView(mode){
 if(mode==='coverage'){
  if(!coverageModeAvailable())return;
  syncPlanningWorkspaceTabs('coverage');setCoverageMode(true);return
 }
 if(coverageModeActive)setCoverageMode(false);
 syncPlanningWorkspaceTabs(mode==='analysis'?'analysis':'planning');
 if(mode==='analysis'){
  const card=document.getElementById('anomalyWidget'),body=document.getElementById('anomalyInsightBody');
  if(card&&body?.classList.contains('collapsed'))togglePlanningInsight('anomalies');
  requestAnimationFrame(()=>document.querySelector('.anomalyHistoryRow')?.scrollIntoView({behavior:'smooth',block:'center'}))
 }else{
  requestAnimationFrame(()=>document.getElementById('sheetViewport')?.scrollIntoView({behavior:'smooth',block:'nearest'}))
 }
}

function coveragePeopleForSlot(day,si){
 const rows=day?.cells||[],employees=model?.employees||[];
 return rows.map((row,ri)=>{const v=row?.[si];if(v!=='g'&&v!=='b')return null;const emp=employees[ri],p=planningProfileFor(emp?.name||''),name=p?.display_name||emp?.name||'Employé';return{name,color:p?.profile_color||'#ff5a2a',shift:v}}).filter(Boolean)
}
function coverageSlotColor(count){if(count<=0)return'#dfe3e7';if(count===1)return'#ff6750';if(count===2)return'#f4ad42';return'#35b86b'}
function coverageSelectSlot(si,focus=false){
 const day=modelDay(),data=coverageForDay(day),slotsHost=document.getElementById('coverageOverlaySlots'),detail=document.getElementById('coverageOverlayDetail');
 if(!data.length||!detail)return;
 const index=Math.max(0,Math.min(data.length-1,Number(si)||0));coverageSelectedSlot=index;
 slotsHost?.querySelectorAll('.coverageOverlaySlot').forEach((el,i)=>el.classList.toggle('selected',i===index));
 const x=data[index],people=coveragePeopleForSlot(day,index),from=fmtTime(x.time),to=fmtTime(x.time+.25);
 const chips=people.slice(0,7).map(p=>'<span class="coveragePersonChip"><i class="coveragePersonDot" style="background:'+esc(p.color)+'">'+esc(initials(p.name).slice(0,1))+'</i>'+esc(p.name)+'</span>').join('');
 detail.innerHTML='<div class="coverageOverlayDetailTime"><strong>'+from+' → '+to+'</strong><small>'+x.count+' personne'+(x.count>1?'s':'')+' présente'+(x.count>1?'s':'')+'</small></div><div class="coverageOverlayPeople">'+(chips||'<span class="coverageNoPeople">Aucune présence planifiée sur ce créneau.</span>')+(people.length>7?'<span class="coverageMorePeople">+'+(people.length-7)+'</span>':'')+'</div>';
 if(focus)slotsHost?.querySelectorAll('.coverageOverlaySlot')?.[index]?.focus()
}
function renderCoverageOverlay(){
 const date=document.getElementById('coverageOverlayDate'),summary=document.getElementById('coverageOverlaySummary'),host=document.getElementById('coverageOverlaySlots'),btn=document.getElementById('coverageModeBtn');
 if(!date||!summary||!host||!btn)return;
 const day=modelDay(),data=coverageForDay(day),active=data.filter(x=>x.count>0);
 btn.disabled=!model||!day||!active.length;
 if(!model||!day||!data.length||!active.length){summary.innerHTML='';host.innerHTML='';document.getElementById('coverageOverlayDetail').innerHTML='<span class="coverageNoPeople">Aucune présence planifiée sur cette journée.</span>';if(coverageModeActive)setCoverageMode(false);return}
 host.style.gridTemplateColumns='repeat('+data.length+',minmax(0,1fr))';
 const dt=addDays(currentWeekStart,currentDay);date.textContent=DAYS[currentDay][1]+' '+frDate(dt);
 const max=active.length?Math.max(...active.map(x=>x.count)):0,min=active.length?Math.min(...active.map(x=>x.count)):0,avg=active.length?active.reduce((s,x)=>s+x.count,0)/active.length:0;
 summary.innerHTML='<span class="coverageOverlayMetric"><b>'+min+'</b><span>minimum</span></span><span class="coverageOverlayMetric"><b>'+String(Math.round(avg*10)/10).replace('.',',')+'</b><span>moyenne</span></span><span class="coverageOverlayMetric"><b>'+max+'</b><span>pic</span></span>';
 const denom=Math.max(1,max);
 host.innerHTML=data.map((x,i)=>{const pct=x.count?Math.max(12,Math.round(x.count/denom*88)):6,isHour=i%4===0,label=isHour?String(Math.floor(x.time)):'';return '<button type="button" class="coverageOverlaySlot'+(isHour?' hourMark':'')+(i===coverageSelectedSlot?' selected':'')+'" style="--coverage-height:'+pct+'%;--coverage-color:'+coverageSlotColor(x.count)+'" title="'+fmtTime(x.time)+' • '+x.count+' personne'+(x.count>1?'s':'')+'" onmouseenter="coverageSelectSlot('+i+')" onclick="coverageSelectSlot('+i+',true)"><b>'+x.count+'</b>'+(label?'<small aria-hidden="true">'+label+'</small>':'')+'</button>'}).join('');
 if(coverageSelectedSlot>=data.length)coverageSelectedSlot=0;
 coverageSelectSlot(coverageSelectedSlot)
}
function renderCoverage(){const btn=document.getElementById('coverageModeBtn');if(btn)btn.disabled=!coverageModeAvailable();renderCoverageOverlay()}
function planningNumberOrNull(value){
 if(value===null||value===undefined||value==='')return null;
 const n=Number(value);return Number.isFinite(n)?n:null
}
function planningFormatContractHours(value){
 const n=planningNumberOrNull(value);return n===null?'—':n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' h'
}
function planningContractDifferenceAnomalies(){
 if(!model)return[];
 const out=[],employees=model.employees||[];
 employees.forEach(emp=>{
  const total=planningNumberOrNull(emp.excelWeekTotalHours);
  const excelContract=planningNumberOrNull(emp.excelContractHours);
  const excelDifference=planningNumberOrNull(emp.excelContractDifference);
  const profile=planningProfileFor(emp.name);
  const profileContract=planningNumberOrNull(profile?.contract_hours);
  const contract=excelContract??profileContract;
  const difference=excelDifference??(total!==null&&contract!==null?Math.round((total-contract)*100)/100:null);
  if(difference===null||Math.abs(difference)<0.005)return;
  const label=profile?.display_name||emp.name;
  out.push({
   level:'warn',
   kind:'contract-hours',
   icon:'≠',
   title:label,
   detail:'Différence heures contrat',
   totalHours:total,
   contractHours:contract,
   contractDifference:difference
  })
 });
 return out.sort((a,b)=>Math.abs(b.contractDifference)-Math.abs(a.contractDifference))
}
function planningAnomalies(){
 const out=planningContractDifferenceAnomalies(),day=modelDay(),date=dayKey();if(!model||!day)return out;
 const rows=day.cells||[],employees=model.employees||[];
 employees.forEach((emp,ri)=>{
  const row=rows[ri]||[],total=totalForRow(row),ranges=workRangesFor(row,model),label=planningProfileFor(emp.name)?.display_name||emp.name;
  if(total>10)out.push({level:'warn',icon:'↗',title:label+' • journée longue',detail:String(total).replace('.',',')+' h planifiées — à vérifier selon votre organisation.'});
  for(const r of ranges)if(r.b-r.a<=.5)out.push({level:'warn',icon:'⌁',title:label+' • créneau très court',detail:friendlyHour(r.a)+' à '+friendlyHour(r.b)+' ('+String((r.b-r.a)*60)+' min).'});
  for(let i=1;i<ranges.length;i++){const gap=ranges[i].a-ranges[i-1].b;if(gap>=2)out.push({level:'warn',icon:'Ⅱ',title:label+' • longue coupure',detail:String(Math.round(gap*100)/100).replace('.',',')+' h entre deux périodes de travail.'})}
  const abs=employeeAbsences(emp.name,date,['approved','pending']);
  for(const a of abs)if(total>0)out.push({level:a.status==='approved'?'alert':'warn',icon:a.status==='approved'?'!':'?',title:label+' • '+absenceStatusLabel(a.status).toLowerCase()+' mais horaires présents',detail:absenceTypeLabel(a.type)+' du '+shortDate(a.start_date)+' au '+shortDate(a.end_date)+'.'});
 });
 const cov=coverageForDay(day),first=cov.findIndex(x=>x.count>0),last=cov.length-1-[...cov].reverse().findIndex(x=>x.count>0);
 if(first>=0&&last>=first){
  const activeWindow=cov.slice(first,last+1),low=activeWindow.filter(x=>x.count===1);
  if(low.length){
   const lowRanges=[];let startIdx=null;
   for(let i=0;i<=activeWindow.length;i++){
    const isLow=i<activeWindow.length&&activeWindow[i].count===1;
    if(isLow&&startIdx===null)startIdx=i;
    if(!isLow&&startIdx!==null){
     const start=activeWindow[startIdx].time,end=activeWindow[i-1].time+.25;
     lowRanges.push({start,end,count:i-startIdx});startIdx=null
    }
   }
   const rangesText=lowRanges.map((r,i)=>(i===0?'de ':'de ')+fmtTime(r.start)+' à '+fmtTime(r.end)).join(', puis ');
   out.push({level:'warn',icon:'1',title:'Couverture réduite',detail:'Une seule personne planifiée '+rangesText+' ('+low.length+' créneau'+(low.length>1?'x':'')+' de 15 min).'})
  }
 }
 return out.slice(0,24)
}
function renderAnomalyItem(x){
 if(x.kind==='contract-hours'){
  const diff=planningNumberOrNull(x.contractDifference),under=diff!==null&&diff<0;
  const diffText=diff===null?'—':(diff>0?'+':'')+diff.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' h';
  return '<div class="anomalyItem contractHours '+(under?'under ':'')+esc(x.level)+'"><span class="ai">'+esc(x.icon)+'</span><div><div class="contractHoursTop"><strong>'+esc(x.title)+'</strong><span class="contractHoursDiff">'+esc(diffText)+'</span></div><div class="contractHoursMeta"><span>Total '+esc(planningFormatContractHours(x.totalHours))+'</span><span>Contrat '+esc(planningFormatContractHours(x.contractHours))+'</span></div><span class="contractHoursCaption">Différence heures contrat · semaine importée</span></div></div>'
 }
 return '<div class="anomalyItem '+esc(x.level)+'"><span class="ai">'+esc(x.icon)+'</span><div><strong>'+esc(x.title)+'</strong><span>'+esc(x.detail)+'</span></div></div>'
}
function renderAnomalies(){
 const list=document.getElementById('anomalyList'),metric=document.getElementById('anomalyMetric');if(!list||!metric)return;const items=planningAnomalies();metric.textContent=String(items.length);
 if(!model){list.innerHTML='<div class="absenceEmpty">Aucun planning à analyser pour cette semaine.</div>';return}
 if(!items.length){list.innerHTML='<div class="anomalyGood">✓ Aucune anomalie technique détectée sur cette journée ou cette semaine.</div>';return}
 list.innerHTML=items.map(renderAnomalyItem).join('')
}
function renderAbsencePanel(){
 const list=document.getElementById('absenceList'),sub=document.getElementById('absenceSubtitle'),summary=document.getElementById('absenceManagementSummary');if(!list||!currentUser)return;
 const managing=absenceAccess==='manage',rows=[...planningAbsences].sort((a,b)=>a.start_date.localeCompare(b.start_date)||b.id-a.id);
 if(sub)sub.textContent=managing?'Gestion des demandes de l’équipe liées à cette semaine.':'Tes demandes liées à cette semaine.';
 if(summary){
  summary.classList.toggle('hidden',!managing);
  if(managing){const pending=rows.filter(x=>x.status==='pending').length,approved=rows.filter(x=>x.status==='approved').length,rejected=rows.filter(x=>x.status==='rejected').length;summary.innerHTML='<div class="absenceManageIntro"><b>Gestion</b><span>Informations reçues • validation ou refus uniquement.</span></div><div class="absenceManageStat pending"><span>En attente</span><b>'+pending+'</b></div><div class="absenceManageStat approved"><span>Validées</span><b>'+approved+'</b></div><div class="absenceManageStat rejected"><span>Refusées</span><b>'+rejected+'</b></div>'}
 }
 if(!rows.length){list.innerHTML='<div class="absenceEmpty">'+(managing?'Aucune demande de l’équipe sur cette semaine.':'Aucune demande sur cette semaine.')+'</div>';return}
 list.innerHTML=rows.map(a=>{
  const own=a.user_id===currentUser.id,canReview=managing&&a.status==='pending',canCancel=own&&a.status==='pending',canDelete=role==='admin';
  const who=managing?'<strong>'+esc(a.display_name)+'</strong>':'<strong>'+esc(absenceTypeLabel(a.type))+'</strong>';
  const type=managing?' • '+absenceTypeLabel(a.type):'';
  return '<div class="absenceRow">'+
   '<div class="absenceTop">'+who+'<span class="absenceStatus '+esc(a.status)+'">'+esc(absenceStatusLabel(a.status))+'</span></div>'+
   '<div class="absenceMeta">'+shortDate(a.start_date)+' → '+shortDate(a.end_date)+type+'</div>'+
   (a.note?'<div class="absenceNote">'+esc(a.note)+'</div>':'')+
   ((canReview||canCancel||canDelete)?'<div class="absenceButtons">'+
      (canReview?'<button class="absenceApprove" type="button" onclick="reviewAbsence('+a.id+',\'approved\')">✓ Valider</button><button class="absenceReject" type="button" onclick="reviewAbsence('+a.id+',\'rejected\')">× Refuser</button>':'')+
      (canCancel?'<button class="absenceCancel" type="button" onclick="cancelAbsence('+a.id+')">Annuler ma demande</button>':'')+
      (canDelete?'<button class="absenceReject" type="button" onclick="deleteAbsenceRequest('+a.id+')">Supprimer</button>':'')+
    '</div>':'')+
  '</div>'
 }).join('')
}


function openAbsenceRequest(){
 if(absenceAccess==='hidden'||(absenceAccess==='manage'&&role!=='admin')||!currentUser)return;
 const modal=document.getElementById('absenceRequestModal'),start=document.getElementById('absenceRequestStart'),end=document.getElementById('absenceRequestEnd'),type=document.getElementById('absenceRequestType'),note=document.getElementById('absenceRequestNote');
 if(!modal||!start||!end)return;
 const base=dayKey();
 type.value='unavailable';start.value=base;end.value=base;note.value='';
 modal.classList.remove('hidden');document.body.style.overflow='hidden';
 setTimeout(()=>type.focus(),40);window.NettoSounds?.play?.('menuOpen')
}
function closeAbsenceRequest(){
 document.getElementById('absenceRequestModal')?.classList.add('hidden');document.body.style.overflow='';window.NettoSounds?.play?.('menuClose')
}
async function submitAbsenceRequest(){
 if(absenceAccess==='hidden'||(absenceAccess==='manage'&&role!=='admin')||!db||!currentUser)return;
 const type=document.getElementById('absenceRequestType')?.value||'unavailable',start=document.getElementById('absenceRequestStart')?.value||'',end=document.getElementById('absenceRequestEnd')?.value||'',note=(document.getElementById('absenceRequestNote')?.value||'').trim(),btn=document.getElementById('absenceRequestSubmit');
 if(!start||!end){showToast('Choisis les dates de la demande');return}
 if(end<start){showToast('La date de fin doit être après la date de début');return}
 if(!['unavailable','leave'].includes(type))return;
 if(btn){btn.disabled=true;btn.textContent='Envoi…'}
 try{
  const payload={user_id:currentUser.id,display_name:currentUser.name,type,start_date:start,end_date:end,note:note||null,status:'pending'};
  const {data,error}=await db.from('planning_absences').insert(payload).select('id').single();
  if(error)throw error;
  const reviewers=await db.rpc('planning_absence_reviewer_ids');
  if(reviewers.error)console.warn('Destinataires demande absence:',reviewers.error);
  const reviewerIds=[...new Set((reviewers.data||[]).map(x=>x.user_id).filter(id=>id&&id!==currentUser.id))];
  const week=isoDate(startOfWeek(parseISO(start))),target='planning.html?week='+encodeURIComponent(week)+'&day='+encodeURIComponent(start);
  const label=type==='leave'?'congés':'indisponibilité',message=currentUser.name+' a envoyé une demande d’'+label+' du '+shortDate(start)+' au '+shortDate(end)+'.';
  if(reviewerIds.length)await notifyUsers(reviewerIds.map(user_id=>({user_id,kind:'absence_request',title:'Nouvelle demande '+(type==='leave'?'de congés':"d’indisponibilité"),message,planning_date:start,week_start:week,target_url:target})));
  closeAbsenceRequest();
  currentWeekStart=startOfWeek(parseISO(start));currentDay=(parseISO(start).getDay()+6)%7;
  await loadWeek(currentWeekStart);
  window.NettoSounds?.play?.('success');showToast('Demande envoyée')
 }catch(e){console.error(e);window.NettoSounds?.play?.('error');showToast('Impossible d’envoyer la demande : '+e.message)}
 finally{if(btn){btn.disabled=false;btn.textContent='Envoyer la demande'}}
}
async function cancelAbsence(id){
 if(absenceAccess==='hidden'||!currentUser)return;
 const a=planningAbsences.find(x=>Number(x.id)===Number(id));if(!a||a.user_id!==currentUser.id||a.status!=='pending')return;
 if(!confirm('Annuler cette demande ?'))return;
 const now=new Date().toISOString(),{error}=await db.from('planning_absences').update({status:'cancelled',updated_at:now}).eq('id',id).eq('user_id',currentUser.id).eq('status','pending');
 if(error){showToast('Impossible d’annuler la demande : '+error.message);return}
 await loadPlanningAbsences();renderPlanningInsights();window.NettoSounds?.play?.('delete');showToast('Demande annulée')
}

async function deleteAbsenceRequest(id){
 if(role!=='admin')return;
 const a=planningAbsences.find(x=>Number(x.id)===Number(id));if(!a)return;
 if(!confirm('Supprimer définitivement la demande de '+a.display_name+' ('+absenceTypeLabel(a.type)+' du '+shortDate(a.start_date)+' au '+shortDate(a.end_date)+') ?'))return;
 const {error}=await db.from('planning_absences').delete().eq('id',id);
 if(error){alert('Impossible de supprimer la demande : '+error.message);return}
 planningAbsences=planningAbsences.filter(x=>Number(x.id)!==Number(id));renderPlanningInsights();window.NettoSounds?.play?.('delete');showToast('Demande supprimée')
}
async function clearAbsenceRequests(){
 if(role!=='admin')return;
 if(!confirm('Effacer définitivement TOUTES les demandes d’indisponibilités et de congés, toutes périodes confondues ?'))return;
 const {error}=await db.from('planning_absences').delete().gte('id',0);
 if(error){alert('Impossible d’effacer les demandes : '+error.message);return}
 planningAbsences=[];renderPlanningInsights();window.NettoSounds?.play?.('delete');showToast('Toutes les demandes ont été supprimées')
}
async function clearAbsenceLogs(){
 if(role!=='admin')return;
 if(!confirm('Effacer tous les logs liés aux validations/refus d’indisponibilités et congés ?'))return;
 const {error}=await db.from('planning_logs').delete().eq('action','absence_review');
 if(error){alert('Impossible d’effacer les logs : '+error.message);return}
 await loadPlanningLogs();window.NettoSounds?.play?.('delete');showToast('Logs Indisponibilités / Congés supprimés')
}



const PLANNING_INSIGHT_COLLAPSE_MAP={
 coverage:{card:'coverageWidget',body:'coverageInsightBody'},
 anomalies:{card:'anomalyWidget',body:'anomalyInsightBody'},
 absences:{card:'absencesWidget',body:'absencesInsightBody'}
};
function togglePlanningInsight(key){
 const cfg=PLANNING_INSIGHT_COLLAPSE_MAP[key];if(!cfg)return;
 const card=document.getElementById(cfg.card),body=document.getElementById(cfg.body),head=card?.querySelector(':scope > .insightHead');if(!card||!body)return;
 const opening=body.classList.contains('collapsed');body.classList.toggle('collapsed',!opening);card.classList.toggle('open',opening);head?.setAttribute('aria-expanded',opening?'true':'false');
 try{localStorage.setItem('nettoPlanningInsightOpen:'+key,opening?'1':'0')}catch(_){}
 window.NettoSounds?.play?.(opening?'menuOpen':'menuClose')
}
function restorePlanningInsightStates(){
 Object.entries(PLANNING_INSIGHT_COLLAPSE_MAP).forEach(([key,cfg])=>{
  let open=false;try{open=localStorage.getItem('nettoPlanningInsightOpen:'+key)==='1'}catch(_){}
  const card=document.getElementById(cfg.card),body=document.getElementById(cfg.body),head=card?.querySelector(':scope > .insightHead');if(!card||!body)return;
  body.classList.toggle('collapsed',!open);card.classList.toggle('open',open);head?.setAttribute('aria-expanded',open?'true':'false')
 })
}

function togglePersonalStats(){
 const card=document.getElementById('personalStatsCard'),body=document.getElementById('personalStatsBody'),head=card?.querySelector('.insightHead');if(!card||!body)return;
 const opening=body.classList.contains('collapsed');body.classList.toggle('collapsed',!opening);card.classList.toggle('open',opening);head?.setAttribute('aria-expanded',opening?'true':'false');
 try{localStorage.setItem('nettoPersonalStatsOpen',opening?'1':'0')}catch(_){}
 window.NettoSounds?.play?.(opening?'menuOpen':'menuClose')
}
function restorePersonalStatsState(){
 let open=false;try{open=localStorage.getItem('nettoPersonalStatsOpen')==='1'}catch(_){}
 const card=document.getElementById('personalStatsCard'),body=document.getElementById('personalStatsBody'),head=card?.querySelector('.insightHead');if(!card||!body)return;
 body.classList.toggle('collapsed',!open);card.classList.toggle('open',open);head?.setAttribute('aria-expanded',open?'true':'false')
}

function personalWeekStats(){
 const empty={hours:0,days:0,mornings:0,afternoons:0,average:0};if(!model||!currentUser)return empty;
 const idx=currentUserEmployeeIndex(model);if(idx<0)return empty;
 let hours=0,days=0,mornings=0,afternoons=0;
 for(let di=0;di<7;di++){
  const row=model.days?.[isoDate(addDays(currentWeekStart,di))]?.cells?.[idx]||[];
  const total=totalForRow(row);if(total<=0)continue;
  hours+=total;days++;
  if(row.some(v=>v==='g'))mornings++;
  if(row.some(v=>v==='b'))afternoons++;
 }
 return{hours,days,mornings,afternoons,average:days?hours/days:0}
}
function statNumber(v){const n=Math.round((Number(v)||0)*100)/100;return String(n).replace('.',',')}
function renderPersonalStats(){
 const grid=document.getElementById('personalStatsGrid'),foot=document.getElementById('personalStatsFoot'),sub=document.getElementById('personalStatsSubtitle');if(!grid)return;
 const s=personalWeekStats(),name=teamProfiles.find(x=>x.id===currentUser?.id)?.display_name||currentUser?.name||'Utilisateur';
 if(sub)sub.textContent=name+' • semaine du '+shortDate(isoDate(currentWeekStart))+' au '+shortDate(isoDate(addDays(currentWeekStart,6)));
 if(!model||currentUserEmployeeIndex(model)<0){
  grid.innerHTML='<div class="absenceEmpty">Aucune donnée personnelle trouvée dans le planning de cette semaine.</div>';
  if(foot)foot.textContent='Les statistiques apparaissent uniquement quand ton compte peut être associé à une ligne du planning Excel.';
  return
 }
 grid.innerHTML=
  '<div class="personalStat primary"><div class="personalStatTop"><span class="personalStatIcon">◷</span>Heures de la semaine</div><b>'+statNumber(s.hours)+' h</b><small>Total calculé sur tes créneaux Matin + Après-midi.</small></div>'+
  '<div class="personalStat"><div class="personalStatTop"><span class="personalStatIcon">▦</span>Jours travaillés</div><b>'+s.days+'</b><small>Jour avec au moins un créneau planifié.</small></div>'+
  '<div class="personalStat"><div class="personalStatTop"><span class="personalStatIcon">≈</span>Moyenne / jour</div><b>'+statNumber(s.average)+' h</b><small>Moyenne sur tes jours travaillés.</small></div>'+
  '<div class="personalStat"><div class="personalStatTop"><span class="personalStatIcon">☀</span>Matins</div><b>'+s.mornings+'</b><small>Jours contenant au moins un créneau vert.</small></div>'+
  '<div class="personalStat"><div class="personalStatTop"><span class="personalStatIcon">◐</span>Après-midi</div><b>'+s.afternoons+'</b><small>Jours contenant au moins un créneau bleu.</small></div>';
 if(foot)foot.textContent=s.days?('Sur '+s.days+' jour'+(s.days>1?'s':'')+' travaillé'+(s.days>1?'s':'')+', tu totalises '+statNumber(s.hours)+' h cette semaine.'):'Aucun horaire de travail n’est prévu pour toi sur cette semaine.'
}
function renderPlanningInsights(){renderCoverage();renderPersonalStats();renderAnomalies();renderAbsencePanel()}
async function reviewAbsence(id,status){
 if(absenceAccess!=='manage'||!['approved','rejected'].includes(status))return;const a=planningAbsences.find(x=>x.id===id);if(!a)return;
 const verb=status==='approved'?'valider':'refuser';if(!confirm((verb[0].toUpperCase()+verb.slice(1))+' la demande de '+a.display_name+' ?'))return;
 const reviewedAt=new Date().toISOString();
 const {data:updated,error}=await db.from('planning_absences')
  .update({status,reviewed_by:currentUser.id,reviewed_at:reviewedAt,updated_at:reviewedAt})
  .eq('id',id).eq('status','pending').eq('updated_at',a.updated_at).select('id').maybeSingle();
 if(error){alert('Impossible de mettre à jour la demande : '+error.message);return}
 if(!updated){alert('Cette demande a déjà été traitée ou modifiée par une autre personne. Elle n’a pas été écrasée.');await loadPlanningAbsences();renderPlanningInsights();return}
 await addPlanningLog('absence_review',logDetails({kind:'absence_review',absence_id:a.id,target_user_id:a.user_id,target_name:a.display_name,type:a.type,start_date:a.start_date,end_date:a.end_date,status}));
 const target='profile.html';
 const isLeave=a.type==='leave',accepted=status==='approved';
 await notifyUsers([{user_id:a.user_id,kind:'absence_decision',title:(isLeave?'Congés ':'Indisponibilité ')+(accepted?'acceptés':'refusés'),message:(isLeave?'Tes congés':'Ton indisponibilité')+' du '+shortDate(a.start_date)+' au '+shortDate(a.end_date)+' '+(accepted?'ont été acceptés.':'ont été refusés.'),planning_date:a.start_date,week_start:isoDate(startOfWeek(parseISO(a.start_date))),target_url:target}]);
 await loadPlanningAbsences();renderPlanningInsights();window.NettoSounds?.play?.(status==='approved'?'success':'warning');showToast(status==='approved'?'Demande validée':'Demande refusée')
}

function renderWeekHeader(){
 const a=currentWeekStart,b=addDays(a,6);document.getElementById('weekLabel').textContent='Semaine du '+a.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' au '+b.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
 document.querySelector('header .sub')&&(document.querySelector('header .sub').textContent='Nethor • Semaine du '+a.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' au '+b.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}));
 const box=document.getElementById('days');box.innerHTML=DAYS.map((d,i)=>{const dt=addDays(a,i);return '<button class="day '+(i===currentDay?'active':'')+'" onclick="selectDay('+i+')">'+d[1]+'<small>'+dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+'</small></button>'}).join('')+(model?'<button class="weekTotalChip" type="button" title="Voir le total de chaque utilisateur" onclick="openWeekTotals()"><b>Total</b><small>détail</small></button>':'');if((planningDeepLinkFocus==='rest'||planningDeepLinkFocus==='leave')&&planningIsMobilePlatform())requestAnimationFrame(()=>box.querySelector('.day.active')?.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'}));
}
function weeklyEmployeeTotals(){if(!model)return[];const employees=model.employees||[],a=currentWeekStart;return employees.map((emp,ri)=>{let total=0;for(let di=0;di<7;di++){const d=model.days?.[isoDate(addDays(a,di))];total+=totalForRow(d?.cells?.[ri]||[])}const p=planningProfileFor(emp.name);return{name:p?.display_name||emp.name,total}}).filter(x=>x.total>0)}
function openWeekTotals(){const modal=document.getElementById('weekTotalsModal'),list=document.getElementById('weekTotalsList'),sub=document.getElementById('weekTotalsSubtitle');if(!modal||!list)return;const rows=weeklyEmployeeTotals(),a=currentWeekStart,b=addDays(a,6);if(sub)sub.textContent='Du '+frDate(a)+' au '+frDate(b);list.innerHTML=rows.length?rows.map(x=>'<div class="weekTotalRow"><span>'+esc(x.name)+'</span><b>'+String(Math.round(x.total*100)/100).replace('.',',')+' h</b></div>').join(''):'<div class="weekTotalsEmpty">Aucun horaire enregistré sur cette semaine.</div>';modal.classList.remove('hidden');document.body.style.overflow='hidden'}
function closeWeekTotals(){document.getElementById('weekTotalsModal')?.classList.add('hidden');document.body.style.overflow=''}
function selectDay(i){currentDay=i;renderAll();markPlanningDayRead(dayKey()).then(()=>{if(planningReadStatusEnabled())renderAll()}).catch(()=>{});playUISound()}

function renderReader(){
 const dt=addDays(currentWeekStart,currentDay),day=modelDay();
 document.getElementById('dateTitle').textContent=DAYS[currentDay][1]+' '+frDate(dt);
 const meta=document.getElementById('readerMeta'),badge=document.getElementById('sourceBadge'),empty=document.getElementById('emptyState'),viewport=document.getElementById('sheetViewport');
 if(!model||!day){meta.textContent=planningWeekLoadError?'Impossible de vérifier la dernière version du planning. Réessaie en rouvrant la page.':'Aucun fichier Excel pour cette semaine.';badge.classList.add('hidden');document.getElementById('downloadSourceBtn')?.classList.add('hidden');empty.classList.remove('hidden');viewport.classList.add('hidden');document.getElementById('mobileSchedule')?.classList.add('hidden');document.getElementById('editPlanningBtn').disabled=true;return}
 document.getElementById('editPlanningBtn').disabled=false;empty.classList.add('hidden');viewport.classList.remove('hidden');
 meta.textContent=(model.weekLabel?model.weekLabel+' • ':'')+'Planning issu du fichier Excel • '+fmtTime(model.startTime)+' → '+fmtTime(model.endTime)+(planningLoadedRevisionAt&&!planningWeekLoadError?' • Version vérifiée':'');
 const admin=role==='admin';badge.textContent=admin?(model.sourceFile||'Excel'):'';badge.classList.toggle('hidden',!admin||!model.sourceFile);const downloadBtn=document.getElementById('downloadSourceBtn');if(downloadBtn){downloadBtn.classList.toggle('hidden',!admin);downloadBtn.disabled=!model.sourcePath;downloadBtn.title=model.sourcePath?'Télécharger le fichier Excel source importé':'Ce planning a été importé avant l’archivage des fichiers source. Réimporte le fichier pour activer le téléchargement.'}
 const ss=slots(),employees=model.employees||[],rows=day.cells||[],focusEmployeeIndex=(planningDeepLinkFocus==='rest'||planningDeepLinkFocus==='leave')?currentUserEmployeeIndex(model):-1,visibleEmployees=employees.map((emp,ri)=>({emp,ri,row:rows[ri]||Array(ss.length).fill(null)})).filter(x=>editMode||x.row.some(Boolean)||x.ri===focusEmployeeIndex);
 let h='<table id="xlsTable" class="xlsTable '+(editMode?'editing':'')+'"><colgroup><col class="nameCol"><col class="readCol">'+ss.map(()=>'<col class="slotCol">').join('')+'<col class="totalCol"></colgroup><thead><tr><th class="nameHead">Utilisateur</th><th class="readHead" title="Consultation du planning pour cette journée">Lu</th>';
 ss.forEach((t,i)=>{const major=i%2===0,label=major?(Number.isInteger(t)?String(Math.floor(t)):fmtTime(t)):'',cls=(i%4===0?'hourStart ':'')+(i%2===0?'halfStart':'blankQuarter');h+='<th class="timeHead '+cls+'" title="'+fmtTime(t)+'–'+fmtTime(t+.25)+'">'+label+'</th>'});
 h+='<th class="totalHead">Total</th></tr></thead><tbody>';
 visibleEmployees.forEach(({emp,ri,row})=>{const profile=planningProfileFor(emp.name);h+='<tr><th class="nameCell" title="Ligne Excel '+(emp.excelRow||ri+4)+'">'+identityHtml(emp.name)+'</th><td class="readCell">'+planningReadCellHtml(profile,dayKey())+'</td>';ss.forEach((t,si)=>{const v=row[si]||null,cls=(si%4===0?'hourStart ':'')+(si%2===0?'halfStart ':'')+(editMode?'editable ':'');h+='<td class="slot '+cls+'" data-color="'+(v||'')+'" data-row="'+ri+'" data-slot="'+si+'" title="'+esc(emp.name)+' • '+fmtTime(t)+'–'+fmtTime(t+.25)+'" style="'+(v?'background:'+COLOR[v]+';':'')+'"></td>'});h+='<td class="totalCell" data-total-row="'+ri+'">'+String(totalForRow(row)).replace('.',',')+' h</td></tr>'});
 h+='</tbody></table>';document.getElementById('sheetMount').innerHTML=h;renderMobileSchedule(day,visibleEmployees.map(x=>x.emp),visibleEmployees.map(x=>x.row));document.body.classList.toggle('planningEditing',editMode);if(editMode)bindEditing();markPlanningDayRead(dayKey()).catch(()=>{});
}
function renderAll(){renderWeekHeader();renderReader();renderPlanningInsights()}

async function loadWeek(start=currentWeekStart,opts={}){
 const requestedStart=startOfWeek(start),key=isoDate(requestedStart),requestId=++planningWeekLoadSeq;
 currentWeekStart=requestedStart;
 if(planningReadStatusWeekKey!==key)clearPlanningReadStatuses(key);
 if(!opts.silent)setSaveState('Chargement…');
 const [weekResult,absences]=await Promise.all([
  db.from('planning_weeks').select('data,week_label,source_file,source_path,imported,updated_at').eq('week_start',key).maybeSingle(),
  fetchPlanningAbsences(requestedStart)
 ]);
 if(requestId!==planningWeekLoadSeq)return false;
 const {data,error}=weekResult;
 if(error){
  console.warn('Dernière version du planning indisponible :',error);
  model=null;planningAbsences=absences;planningCacheReady=false;planningLoadedWeekKey='';planningLoadedRevisionAt='';planningWeekLoadError=true;
  clearPlanningReadStatuses(key);
 }else{
  const storedModel=data?.data||null,storedVersion=Number(storedModel?.version||0);
  model=storedModel&&(storedVersion===3||storedVersion===4)?storedModel:null;
  if(storedModel&&!model)console.warn('Version planning non prise en charge:',storedVersion);
  if(model){model.weekLabel=data.week_label||model.weekLabel||'';model.sourceFile=data.source_file||model.sourceFile||'';model.sourcePath=data.source_path||model.sourcePath||null}
  planningLoadedRevisionAt=model?String(data.updated_at||''):'';
  planningWeekLoadError=false;
  planningAbsences=absences;
  planningLoadedWeekKey=key;
  planningCacheReady=true;
  planningCacheUserId=String(currentUser?.id||planningCacheUserId||'');
  planningConflictDetected=false
 }
 if(!opts.silent)setSaveState(error?'Synchronisation impossible':'Lecture seule');
 if(opts.render!==false){renderAll();loadPlanningReadStatusWeek({render:true}).catch(()=>{})}
 return !error
}
async function saveWeek(options={}){
 if(!canEdit||!model)return false;
 const weekKey=isoDate(currentWeekStart);
 const expectedRevision=Object.prototype.hasOwnProperty.call(options,'expectedRevision')?options.expectedRevision:planningLoadedRevisionAt;
 planningLastSaveVerified=false;planningLastSaveOutcome='unknown';planningSaveInFlight=true;
 setSaveState('Enregistrement…');
 const savedAt=new Date().toISOString();
 model.updatedAt=savedAt;
 const localDraft=clonePlanningModel(model);
 const params={
  p_week_start:weekKey,
  p_expected_revision:expectedRevision||null,
  p_data:localDraft,
  p_employee_order:(model.employees||[]).map(x=>x.name),
  p_week_label:model.weekLabel||null,
  p_source_file:model.sourceFile||null,
  p_source_path:model.sourcePath||null,
  p_imported_at:model.importedAt||savedAt
 };
 let result,error;
 try{({data:result,error}=await db.rpc('planning_save_week_if_revision',params))}
 catch(e){error=e}
 finally{planningSaveInFlight=false}
 if(error){
  console.warn('Publication planning non confirmée',error);
  setSaveState('Enregistrement non confirmé • vérifier avant de réessayer');
  return false
 }
 if(result?.status==='conflict'){
  planningConflictDetected=true;planningLastSaveOutcome='conflict';
  setSaveState('Conflit : planning modifié par une autre personne');
  alert('Ce planning a été modifié depuis son ouverture. Tes modifications locales ne sont pas enregistrées. Annule les modifications puis recharge la semaine avant de recommencer.');
  return false
 }
 if(result?.status!=='ok'||!result.revision){
  planningLastSaveOutcome='rejected';
  setSaveState('Enregistrement refusé');
  console.warn('Écriture planning refusée',result);
  return false
 }
 planningLastSaveOutcome='accepted';
 const revision=String(result.revision);
 const readOk=await loadWeek(currentWeekStart,{render:false,silent:true}).catch(e=>{console.warn('Relecture du planning indisponible',e);return false});
 if(!readOk||!model||!planningLoadedRevisionAt||String(planningLoadedRevisionAt)!==revision||String(model.updatedAt||'')!==savedAt){
  if(!readOk||!model){
   model=localDraft;
   planningLoadedWeekKey=weekKey;
   planningLoadedRevisionAt=revision
  }
  planningWeekLoadError=true;
  setSaveState('Enregistré • version non confirmée');
  return true
 }
 planningLastSaveVerified=true;planningConflictDetected=false;
 setSaveState('✓ Enregistré et synchronisé');
 clearPlanningReadStatuses(planningLoadedWeekKey);
 await loadPlanningReadStatusWeek({render:false}).catch(e=>console.warn('Statuts de lecture à actualiser',e));
 setTimeout(()=>{if(!planningConflictDetected)setSaveState(editMode?'Mode modification':'Lecture seule')},850);
 return true
}


function planningPlatformKind(){
 const kind=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase();
 return kind==='desktop'?'desktop':'mobile'
}
function planningIsMobilePlatform(){return planningPlatformKind()==='mobile'}
function syncAbsencesWidgetPosition(mobile){
 const row=document.querySelector('.absencesWideRow'),support=document.querySelector('.planningSupportGrid'),insights=document.getElementById('planningInsights');
 if(!row||!support||!insights)return;
 if(mobile){
  if(row.previousElementSibling!==insights)insights.insertAdjacentElement('afterend',row);
 }else if(row.parentElement!==support){
  support.appendChild(row)
 }
}
function placePlanningActions(){
 /* Phase 4.2 : les actions sont créées directement dans le layout actif.
    Aucun déplacement Desktop/Mobile et aucune décision par largeur. */
 syncAbsencesWidgetPosition(planningIsMobilePlatform())
}

function excelDrag(e,on){e.preventDefault();if(!canEdit)return;document.querySelector('.excelDrop')?.classList.toggle('drag',!!on)}
function excelDropFile(e){e.preventDefault();excelDrag(e,false);const files=e.dataTransfer?.files;if(files?.length)importPlanningFiles(files)}
function cellDate(v){if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());if(typeof v==='number'&&window.XLSX){const x=XLSX.SSF.parse_date_code(v);if(x)return new Date(x.y,x.m-1,x.d)}const m=String(v||'').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1])}return null}
function findSheet(wb,key){return wb.SheetNames.find(x=>norm(x)===norm(key))}

function u16(d,o){return d[o]|(d[o+1]<<8)}function u32(d,o){return (d[o]|(d[o+1]<<8)|(d[o+2]<<16)|(d[o+3]<<24))>>>0}
function decodeBytes(d,unicode){if(unicode){let s='';for(let i=0;i+1<d.length;i+=2)s+=String.fromCharCode(u16(d,i));return s}try{return new TextDecoder('windows-1252').decode(d)}catch(e){let s='';for(const x of d)s+=String.fromCharCode(x);return s}}
function oleWorkbookStream(ab){const d=new Uint8Array(ab),magic=[208,207,17,224,161,177,26,225];if(d.length<512||magic.some((v,i)=>d[i]!==v))throw new Error('Le fichier .xls n’est pas un classeur Excel compatible.');const ss=1<<u16(d,30),nf=u32(d,44),fd=u32(d,48),FREE=0xffffffff,END=0xfffffffe;let fatSecs=[];for(let i=0;i<109;i++){const s=u32(d,76+i*4);if(s!==FREE&&s!==END)fatSecs.push(s)}let dif=u32(d,68),nd=u32(d,72);for(let z=0;z<nd&&dif!==FREE&&dif!==END;z++){const off=(dif+1)*ss,n=ss/4-1;for(let i=0;i<n;i++){const s=u32(d,off+i*4);if(s!==FREE&&s!==END)fatSecs.push(s)}dif=u32(d,off+n*4)}fatSecs=fatSecs.slice(0,nf);const fat=[];for(const s of fatSecs){const off=(s+1)*ss;for(let i=0;i<ss/4;i++)fat.push(u32(d,off+i*4))}function chain(st){const a=[],seen=new Set();let s=st;while(s!==FREE&&s!==END&&s<fat.length&&!seen.has(s)){seen.add(s);a.push(s);s=fat[s]}return a}function read(st,size){const ch=chain(st),out=new Uint8Array(ch.length*ss);let p=0;for(const s of ch){out.set(d.subarray((s+1)*ss,(s+2)*ss),p);p+=ss}return size==null?out:out.subarray(0,size)}const dir=read(fd),entries=[];for(let p=0;p+128<=dir.length;p+=128){const nl=u16(dir,p+64),type=dir[p+66];if(nl<2)continue;entries.push({name:decodeBytes(dir.subarray(p,p+nl-2),true),type,start:u32(dir,p+116),size:u32(dir,p+120)})}const e=entries.find(x=>x.type===2&&(x.name==='Workbook'||x.name==='Book'));if(!e)throw new Error('Flux Workbook introuvable.');return read(e.start,e.size)}
function records(d,start=0,end=d.length){const out=[];for(let p=start;p+4<=end;){const id=u16(d,p),len=u16(d,p+2),q=p+4;if(q+len>end)break;out.push({id,rec:d.subarray(q,q+len)});p=q+len;if(id===10&&start>0)break}return out}
function legacyStyleReader(ab){try{const wb=oleWorkbookStream(ab),g=records(wb),sheets=[],xfs=[],palette=[];for(const x of g){if(x.id===133){const off=u32(x.rec,0),n=x.rec[6],uni=x.rec[7]&1,name=decodeBytes(x.rec.subarray(8,8+n*(uni?2:1)),!!uni).trim();sheets.push({name,off})}else if(x.id===224)xfs.push(x.rec);else if(x.id===146){const n=u16(x.rec,0);for(let i=0;i<n;i++)palette.push([x.rec[2+i*4],x.rec[3+i*4],x.rec[4+i*4]])}}const maps={};for(let si=0;si<sheets.length;si++){const sh=sheets[si],end=sheets[si+1]?.off||wb.length,map=new Map();for(const x of records(wb,sh.off,end)){const q=x.rec;if([253,515,638,6,513,516,517].includes(x.id)&&q.length>=6)map.set(u16(q,0)+','+u16(q,2),u16(q,4));else if(x.id===189){const rr=u16(q,0),fc=u16(q,2),lc=u16(q,q.length-2);for(let cc=fc,p=4;cc<=lc;cc++,p+=6)map.set(rr+','+cc,u16(q,p))}else if(x.id===190){const rr=u16(q,0),fc=u16(q,2),lc=u16(q,q.length-2);for(let cc=fc,p=4;cc<=lc;cc++,p+=2)map.set(rr+','+cc,u16(q,p))}}maps[norm(sh.name)]=map}function color(sheet,r,c){const xf=maps[norm(sheet)]?.get(r+','+c),rec=xfs[xf];if(!rec)return null;const idx=u16(rec,18)&127,rgb=idx>=8&&idx<8+palette.length?palette[idx-8]:null;if(!rgb)return null;const [R,G,B]=rgb;if(R>245&&G>245&&B>245)return'w';if(R>210&&G<90&&B<90)return'r';if(G>130&&R<120&&B<130)return'g';if(B>150&&G>100&&R<130)return'b';if(R>235&&G>220&&B<70)return'y';if(R>190&&G>75&&G<220&&B<120)return'o';return null}return{color}}catch(e){console.warn('Styles XLS:',e);return null}}
function modernCellColor(cell){const fg=cell?.s?.fill?.fgColor||cell?.s?.fgColor||{},rgb=String(fg.rgb||fg.argb||'').replace(/^FF/,'').toUpperCase();if(/1FB714|00B050|49A900|70AD47/.test(rgb))return'g';if(/00ABEA|00B0F0|1594DF|5B9BD5/.test(rgb))return'b';if(/DD0806|F0180B|FF0000|C00000/.test(rgb))return'r';if(/FFFF00|FFF200|F2EF00/.test(rgb))return'y';if(/EDA900|FFC000|FF9900|F5A800/.test(rgb))return'o';if(/FFFFFF/.test(rgb))return'w';return null}

let xlsxLoader=null;
function ensureXlsx(){
 if(window.XLSX)return Promise.resolve(window.XLSX);
 if(xlsxLoader)return xlsxLoader;
 xlsxLoader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.async=true;s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Lecteur Excel indisponible.'));s.onerror=()=>reject(new Error('Impossible de charger le lecteur Excel.'));document.head.appendChild(s)});
 return xlsxLoader
}
function planningExcelHeaderKey(value){
 return norm(value).replace(/[^a-z0-9]+/g,' ').trim()
}
function planningExcelHours(cell){
 if(!cell||cell.v===null||cell.v===undefined||cell.v==='')return null;
 const v=cell.v;
 if(typeof v==='number'){
  const format=String(cell.z||cell.w||'').toLowerCase();
  if((format.includes('[h]')||/h+:mm/.test(format))&&Math.abs(v)<=10)return Math.round(v*24*100)/100;
  return Math.round(v*100)/100
 }
 const s=String(v).trim().replace(/\s/g,'').replace(',','.');
 if(/^[-+]?\d+(?:\.\d+)?$/.test(s))return Math.round(Number(s)*100)/100;
 const hm=s.match(/^([-+]?)(\d+):([0-5]\d)$/);
 if(hm){const sign=hm[1]==='-'?-1:1;return Math.round(sign*(Number(hm[2])+Number(hm[3])/60)*100)/100}
 return null
}
function planningExcelWeeklySummary(wb,employees,mondayName){
 const employeeIndex=new Map(employees.map((e,i)=>[norm(e.name),i]));
 let best=null;
 for(const sheetName of wb.SheetNames||[]){
  const ws=wb.Sheets[sheetName],ref=ws?.['!ref'];if(!ws||!ref)continue;
  const range=XLSX.utils.decode_range(ref),maxRow=Math.min(range.e.r,range.s.r+120),maxCol=Math.min(range.e.c,220);
  for(let r=range.s.r;r<=maxRow;r++){
   let totalCol=-1,contractCol=-1,diffCol=-1;
   for(let col=range.s.c;col<=maxCol;col++){
    const key=planningExcelHeaderKey(ws[XLSX.utils.encode_cell({r,c:col})]?.v);
    if(key==='total')totalCol=col;
    else if(key==='heures contrat')contractCol=col;
    else if(key==='difference heures contrat'||key==='difference heure contrat')diffCol=col;
   }
   if(contractCol<0||diffCol<0)continue;
   const score=(totalCol>=0?4:0)+(norm(sheetName)===norm(mondayName)?2:0);
   if(!best||score>best.score)best={sheetName,ws,range,headerRow:r,totalCol,contractCol,diffCol,score}
  }
 }
 if(!best)return null;
 const {ws,range,headerRow,totalCol,contractCol,diffCol}=best;
 const result=employees.map(()=>({total:null,contract:null,difference:null}));
 for(let r=headerRow+1;r<=Math.min(range.e.r,headerRow+40);r++){
  let matchedIndex=-1;
  for(let col=range.s.c;col<=Math.min(range.e.c,Math.max(contractCol,diffCol));col++){
   const key=norm(ws[XLSX.utils.encode_cell({r,c:col})]?.v);
   if(employeeIndex.has(key)){matchedIndex=employeeIndex.get(key);break}
  }
  if(matchedIndex<0)continue;
  const total=totalCol>=0?planningExcelHours(ws[XLSX.utils.encode_cell({r,c:totalCol})]):null;
  const contract=planningExcelHours(ws[XLSX.utils.encode_cell({r,c:contractCol})]);
  let difference=planningExcelHours(ws[XLSX.utils.encode_cell({r,c:diffCol})]);
  if(difference===null&&total!==null&&contract!==null)difference=Math.round((total-contract)*100)/100;
  result[matchedIndex]={total,contract,difference}
 }
 employees.forEach((emp,i)=>{
  if(result[i].contract!==null||result[i].difference!==null)return;
  const candidates=[emp.rowIndex,headerRow+1+i].filter((v,idx,a)=>Number.isInteger(v)&&v>headerRow&&v<=range.e.r&&a.indexOf(v)===idx);
  for(const r of candidates){
   const total=totalCol>=0?planningExcelHours(ws[XLSX.utils.encode_cell({r,c:totalCol})]):null;
   const contract=planningExcelHours(ws[XLSX.utils.encode_cell({r,c:contractCol})]);
   let difference=planningExcelHours(ws[XLSX.utils.encode_cell({r,c:diffCol})]);
   if(difference===null&&total!==null&&contract!==null)difference=Math.round((total-contract)*100)/100;
   if(total!==null||contract!==null||difference!==null){result[i]={total,contract,difference};break}
  }
 });
 return{sheet:best.sheetName,rows:result}
}
async function readPlanningFile(file){
 if(!window.XLSX)throw new Error('Le lecteur Excel n’est pas chargé.');const ab=await file.arrayBuffer(),wb=XLSX.read(ab,{type:'array',cellDates:true,cellStyles:true});
 const mondayName=findSheet(wb,'LUNDI');if(!mondayName)throw new Error('Feuille LUNDI introuvable.');const mondayWs=wb.Sheets[mondayName],mondayDate=cellDate(mondayWs.B2?.v);if(!mondayDate)throw new Error('Date du lundi introuvable en B2.');
 const weekLabel=String(mondayWs.C1?.v||'').trim(),employees=[];for(let r=3;r<=14;r++){const cell=mondayWs['B'+(r+1)],name=String(cell?.v??'').trim();if(name&&name.toUpperCase()!=='TOTAL')employees.push({excelRow:r+1,rowIndex:r,name})}
 if(!employees.length)throw new Error('Aucun employé trouvé dans B4:B15.');const legacy=/\.xls$/i.test(file.name)&&!/\.xlsx$/i.test(file.name)?legacyStyleReader(ab):null;
 const days={};for(let di=0;di<7;di++){const [sheetKey,label]=DAYS[di],sheetName=findSheet(wb,sheetKey);if(!sheetName)throw new Error('Feuille '+sheetKey+' introuvable.');const ws=wb.Sheets[sheetName],key=isoDate(addDays(mondayDate,di)),matrix=[];for(const emp of employees){const row=[];for(let si=0;si<58;si++){const c=2+si,addr=XLSX.utils.encode_cell({r:emp.rowIndex,c}),cell=ws[addr],occupied=!!(cell&&cell.v!==null&&cell.v!==''&&cell.v!==0&&cell.v!==false);
      // Dans le planning Netto, Rouge / Jaune / Orange sont souvent des cellules uniquement colorées,
      // sans valeur "1". La couleur Excel prime donc toujours sur le contenu de la cellule.
      const styleColor=legacy?.color(sheetName,emp.rowIndex,c)||modernCellColor(cell);
      let color=(styleColor&&styleColor!=='w')?styleColor:null;
      // Vert / Bleu ont généralement une valeur 1 ; si un ancien export perd le style mais garde 1,
      // on ne peint pas arbitrairement : seul le style Excel décide de la couleur.
      if(!color&&occupied&&styleColor&&styleColor!=='w')color=styleColor;
      row.push(color)}matrix.push(row)}days[key]={sheet:sheetName.trim(),label,date:key,cells:matrix}}
 const weeklySummary=planningExcelWeeklySummary(wb,employees,mondayName);
 if(weeklySummary?.rows)employees.forEach((emp,i)=>{const s=weeklySummary.rows[i]||{};emp.excelWeekTotalHours=s.total;emp.excelContractHours=s.contract;emp.excelContractDifference=s.difference});
 const colorCounts={g:0,b:0,r:0,y:0,o:0};Object.values(days).forEach(d=>d.cells.forEach(row=>row.forEach(v=>{if(v&&colorCounts[v]!==undefined)colorCounts[v]++})));
 return{version:4,reader:'netto-xls-direct',weekStart:isoDate(mondayDate),weekLabel,sourceFile:file.name,importedAt:new Date().toISOString(),startTime:6,endTime:20.5,slotMinutes:15,slotCount:58,employees,days,colorCounts,weeklySummarySource:weeklySummary?.sheet||null}
}
function planningFileExtension(name){const m=String(name||'').toLowerCase().match(/\.(xlsm|xlsx|xls)$/);return m?.[1]||'xlsx'}
async function archivePlanningSource(file,weekStart){
 const ext=planningFileExtension(file.name),path=weekStart+'/'+Date.now()+'-'+crypto.randomUUID()+'.'+ext;
 const contentType=file.type||({'xls':'application/vnd.ms-excel','xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsm':'application/vnd.ms-excel.sheet.macroenabled.12'}[ext]||'application/octet-stream');
 const {error}=await db.storage.from('planning-files').upload(path,file,{upsert:false,contentType});
 if(error)throw error;return path
}
async function downloadPlanningSource(){
 if(role!=='admin'||!model?.sourcePath)return;
 const btn=document.getElementById('downloadSourceBtn');if(btn)btn.disabled=true;
 try{
  const {data,error}=await db.storage.from('planning-files').download(model.sourcePath);if(error)throw error;
  const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=model.sourceFile||('planning-'+isoDate(currentWeekStart)+'.'+planningFileExtension(model.sourcePath));document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showToast('Téléchargement du fichier Excel lancé')
 }catch(e){console.error(e);alert('Téléchargement impossible : '+e.message)}
 finally{if(btn)btn.disabled=false}
}

let planningImportHistoryRows=[],planningImportHistoryBusy=false,planningImportHistoryEscapeBound=false;
function planningImportHistoryAllowed(){return role==='admin'&&planningPlatformKind()==='desktop'}
function planningImportHistoryDate(value){
 const d=new Date(value);if(Number.isNaN(d.getTime()))return'—';
 return d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
}
function planningImportHistorySize(value){
 const n=Number(value);if(!Number.isFinite(n)||n<=0)return'';
 if(n<1024)return n+' o';if(n<1048576)return (n/1024).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Ko';
 return (n/1048576).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Mo'
}
function ensurePlanningImportHistoryModal(){
 let modal=document.getElementById('planningImportHistoryModal');if(modal)return modal;
 modal=document.createElement('div');modal.id='planningImportHistoryModal';modal.className='planningImportHistoryBackdrop hidden';
 modal.innerHTML='<section class="planningImportHistoryPanel" role="dialog" aria-modal="true" aria-labelledby="planningImportHistoryTitle">'+
  '<header class="planningImportHistoryHead"><div><span>ADMINISTRATION</span><h2 id="planningImportHistoryTitle">Fichiers Excel importés</h2><p>Historique des imports du planning, avec auteur et adresse IP lorsqu’elle a été enregistrée.</p></div><button type="button" class="planningImportHistoryClose" aria-label="Fermer" onclick="closePlanningImportHistory()">×</button></header>'+
  '<div class="planningImportHistorySummary" id="planningImportHistorySummary">Chargement…</div>'+
  '<div class="planningImportHistoryTableWrap"><table class="planningImportHistoryTable"><thead><tr><th>Fichier</th><th>Date d’importation</th><th>Utilisateur</th><th>IP</th><th>Semaine</th><th></th></tr></thead><tbody id="planningImportHistoryBody"></tbody></table></div>'+
  '<div class="planningImportHistoryEmpty hidden" id="planningImportHistoryEmpty">Aucun import Excel enregistré.</div>'+
  '</section>';
 modal.addEventListener('click',e=>{if(e.target===modal)closePlanningImportHistory()});
 document.body.appendChild(modal);
 if(!planningImportHistoryEscapeBound){
  planningImportHistoryEscapeBound=true;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('planningImportHistoryModal')?.classList.contains('hidden'))closePlanningImportHistory()})
 }
 return modal
}
function renderPlanningImportHistory(){
 const body=document.getElementById('planningImportHistoryBody'),empty=document.getElementById('planningImportHistoryEmpty'),summary=document.getElementById('planningImportHistorySummary');
 if(!body||!empty||!summary)return;
 const rows=planningImportHistoryRows||[];
 summary.textContent=rows.length+' import'+(rows.length>1?'s':'')+' enregistré'+(rows.length>1?'s':'')+' depuis la mise en service du planning.';
 empty.classList.toggle('hidden',rows.length>0);
 body.innerHTML=rows.map(row=>{
  const size=planningImportHistorySize(row.file_size),available=!!row.storage_path;
  let week='—';try{week=row.week_start?frDate(parseISO(String(row.week_start))):'—'}catch(_){}
  return '<tr><td><div class="planningImportHistoryFile"><strong title="'+esc(row.file_name||'Fichier Excel')+'">'+esc(row.file_name||'Fichier Excel')+'</strong><small>'+(size?esc(size):available?'Fichier archivé':'Source non archivée à cette date')+'</small></div></td>'+
   '<td><span class="planningImportHistoryDate">'+esc(planningImportHistoryDate(row.imported_at))+'</span></td>'+
   '<td><strong class="planningImportHistoryUser">'+esc(row.imported_by_name||'Utilisateur')+'</strong></td>'+
   '<td><code class="planningImportHistoryIp">'+esc(row.ip_address||'Non disponible')+'</code></td>'+
   '<td><span class="planningImportHistoryWeek">'+esc(week)+'</span></td>'+
   '<td class="planningImportHistoryAction">'+(available?'<button type="button" onclick="downloadPlanningHistoryFile('+Number(row.id)+')">⇩ Télécharger</button>':'<button type="button" disabled title="Ce fichier a été importé avant l’archivage des sources Excel.">Indisponible</button>')+'</td></tr>'
 }).join('')
}
async function loadPlanningImportHistory(){
 if(!planningImportHistoryAllowed()||planningImportHistoryBusy)return;
 planningImportHistoryBusy=true;
 const summary=document.getElementById('planningImportHistorySummary');if(summary)summary.textContent='Chargement de l’historique…';
 try{
  const {data,error}=await db.from('planning_import_history').select('id,week_start,file_name,storage_path,imported_at,imported_by_name,ip_address,file_size,mime_type').order('imported_at',{ascending:false}).limit(500);
  if(error)throw error;planningImportHistoryRows=data||[];renderPlanningImportHistory()
 }catch(e){
  console.error(e);if(summary)summary.textContent='Impossible de charger l’historique des imports.';
  const body=document.getElementById('planningImportHistoryBody');if(body)body.innerHTML=''
 }finally{planningImportHistoryBusy=false}
}
async function openPlanningImportHistory(){
 if(!planningImportHistoryAllowed())return;
 const modal=ensurePlanningImportHistoryModal();modal.classList.remove('hidden');document.body.classList.add('planningImportHistoryOpen');
 await loadPlanningImportHistory()
}
function closePlanningImportHistory(){
 document.getElementById('planningImportHistoryModal')?.classList.add('hidden');document.body.classList.remove('planningImportHistoryOpen')
}
async function downloadPlanningHistoryFile(id){
 if(!planningImportHistoryAllowed())return;
 const row=planningImportHistoryRows.find(x=>Number(x.id)===Number(id));if(!row?.storage_path)return;
 const btns=[...document.querySelectorAll('.planningImportHistoryAction button')];btns.forEach(b=>b.disabled=true);
 try{
  const {data,error}=await db.storage.from('planning-files').download(row.storage_path);if(error)throw error;
  const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=row.file_name||('planning-'+String(row.week_start||'archive')+'.'+planningFileExtension(row.storage_path));document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showToast('Téléchargement du fichier Excel lancé')
 }catch(e){console.error(e);alert('Téléchargement impossible : '+e.message)}
 finally{btns.forEach(b=>{if(!b.textContent?.includes('Indisponible'))b.disabled=false})}
}
async function recordPlanningImportAudit(file,storagePath){
 if(!db||!currentUser||!storagePath)return;
 try{
  const {error}=await db.functions.invoke('planning-import-audit',{body:{storage_path:storagePath,file_size:Number(file?.size||0)||null,mime_type:file?.type||null}});
  if(error)throw error
 }catch(e){console.warn('Historique import Planning : métadonnées réseau non enregistrées.',e)}
}
async function processPlanningFile(file,state){
 const next=await readPlanningFile(file),target=parseISO(next.weekStart),key=next.weekStart,{data:existing,error:checkErr}=await db.from('planning_weeks').select('week_start,source_path,updated_at').eq('week_start',key).maybeSingle();if(checkErr)throw checkErr;
 const replacing=!!existing;
 if(replacing&&!confirm('Remplacer le planning actuel de la semaine du '+frDate(target)+' avec « '+file.name+' » ?\n\nLe fichier Excel remplacera entièrement cette semaine.'))return{status:'cancelled',file};
 let archivedPath=null;
 try{
  archivedPath=await archivePlanningSource(file,key);next.sourcePath=archivedPath;
  currentWeekStart=target;currentDay=0;model=next;
  const saved=await saveWeek({expectedRevision:existing?.updated_at||null});if(!saved)throw new Error(planningLastSaveOutcome==='conflict'?'Import refusé : la semaine a été modifiée par une autre personne.':'Le planning n’a pas pu être enregistré ou confirmé.');
  await recordPlanningImportAudit(file,archivedPath);
 }catch(e){
  // Si le serveur a accepté l'écriture mais que le réseau a échoué après,
  // ne jamais supprimer sa source. Reprendre l'état publié si possible.
  if(archivedPath&&['conflict','rejected'].includes(planningLastSaveOutcome)){try{await db.storage.from('planning-files').remove([archivedPath])}catch(_){}}
  await loadWeek(target,{render:false,silent:true}).catch(error=>console.warn('Récupération du planning après import refusé :',error));
  renderAll();
  throw e
 }
 await addPlanningLog('import',logDetails({kind:replacing?'import_replace':'import_new',week_start:key,source:file.name}));
 await notifyWholePlanning(replacing?'import_replace':'import_new',next);
 return{status:'ok',file,replacing,next,verified:planningLastSaveVerified}
}
let planningImportBusy=false;
async function importPlanningFiles(fileList){
 if(!canEdit||planningImportBusy)return;const files=[...(fileList||[])].filter(f=>/\.(xls|xlsx|xlsm)$/i.test(f.name||''));if(!files.length)return;
 planningImportBusy=true;
 const state=document.getElementById('importState');state.className='importState';state.textContent='Préparation de '+files.length+' fichier'+(files.length>1?'s':'')+'…';
 const results=[];try{
  await ensureXlsx();
  for(let i=0;i<files.length;i++){
   const file=files[i];state.className='importState';state.textContent='Traitement '+(i+1)+'/'+files.length+' • '+file.name;
   try{results.push(await processPlanningFile(file,state))}catch(e){console.error(e);results.push({status:'error',file,error:e});}
  }
  const ok=results.filter(x=>x.status==='ok'),confirmed=ok.filter(x=>x.verified!==false),unverified=ok.filter(x=>x.verified===false),cancelled=results.filter(x=>x.status==='cancelled'),errors=results.filter(x=>x.status==='error');
  state.className='importState '+(errors.length?'err':unverified.length?'warn':'ok');
  const parts=[];if(confirmed.length)parts.push('✓ '+confirmed.length+' confirmé'+(confirmed.length>1?'s':''));if(unverified.length)parts.push('⚠ '+unverified.length+' enregistré'+(unverified.length>1?'s':'')+' • version à vérifier');if(cancelled.length)parts.push(cancelled.length+' annulé'+(cancelled.length>1?'s':''));if(errors.length)parts.push(errors.length+' erreur'+(errors.length>1?'s':''));
  state.textContent=parts.join(' • ')+(errors.length?' — '+errors.map(x=>x.file.name).join(', '):'');
  if(ok.length){renderAll();showToast(unverified.length?'Enregistré, version à vérifier':(ok.length>1?'✓ '+ok.length+' plannings importés':(ok[0].replacing?'✓ Planning remplacé':'✓ Planning importé')))}
 }finally{planningImportBusy=false;document.getElementById('excelFile').value=''}
}

function setPaintColor(c){paintColor=c;document.querySelectorAll('.paintChoice').forEach(b=>b.classList.toggle('active',b.dataset.color===c))}
function clonePlanningModel(value){if(!value)return value;try{return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}catch(_){return JSON.parse(JSON.stringify(value))}}
function toggleEditMode(){if(!canEdit||!model)return;if(editMode){saveAndFinishEdit();return}if(coverageModeActive)setCoverageMode(false);resetEditChanges();editSnapshot=clonePlanningModel(model);editMode=true;document.getElementById('editTools').classList.remove('hidden');document.getElementById('editSaveBar').classList.remove('hidden');const b=document.getElementById('editPlanningBtn');b.textContent='✓ Enregistrer';b.classList.add('editing');setSaveState('Mode modification');renderReader()}
function cancelPlanningEdit(){
 if(!canEdit||!editMode)return;
 const hasChanges=changedDates().length>0;
 if(hasChanges&&!confirm('Annuler les modifications non enregistrées du planning ?'))return;
 if(editSnapshot)model=clonePlanningModel(editSnapshot);
 editSnapshot=null;editMode=false;resetEditChanges();
 document.getElementById('editTools').classList.add('hidden');
 document.getElementById('editSaveBar').classList.add('hidden');
 const b=document.getElementById('editPlanningBtn');b.textContent='✎ Modifier le planning';b.classList.remove('editing');
 setSaveState('Vérification de la semaine…');loadWeek(currentWeekStart).catch(e=>console.warn('Rechargement après abandon :',e));window.NettoSounds?.play?.('menuClose');showToast(hasChanges?'Modifications annulées':'Mode modification fermé')
}
async function saveAndFinishEdit(){if(!canEdit||!model)return;const dates=changedDates();if(dates.length){const saved=await saveWeek();if(!saved){showToast(planningLastSaveOutcome==='conflict'?'Conflit : modifications locales conservées':'Enregistrement non confirmé : modifications conservées');return}await addPlanningLog('modify',logDetails({kind:'manual_edit',dates}));await notifyChangedEmployees()}editSnapshot=null;editMode=false;document.getElementById('editTools').classList.add('hidden');document.getElementById('editSaveBar').classList.add('hidden');const b=document.getElementById('editPlanningBtn');b.textContent='✎ Modifier le planning';b.classList.remove('editing');setSaveState(dates.length?(planningLastSaveVerified?'✓ Planning enregistré':'Enregistré • version non confirmée'):'Lecture seule');resetEditChanges();renderAll();if(dates.length&&planningLastSaveVerified)window.NettoSounds?.play?.('success');showToast(dates.length?(!planningLastSaveVerified?'Enregistré, version à revérifier':'✓ Modifications enregistrées'):'Aucune modification')}
function paintCell(td){if(!editMode||!model)return;const row=+td.dataset.row,slot=+td.dataset.slot;if(drag.row!==null&&row!==drag.row)return;const key=row+'|'+slot;if(drag.changed.has(key))return;drag.changed.add(key);const d=modelDay(),value=paintColor==='erase'?null:paintColor;if(d.cells[row][slot]===value)return;d.cells[row][slot]=value;markPlanningChange(currentDay,row);td.style.background=value?COLOR[value]:'';drag.first=drag.first||{row,slot};drag.last={row,slot}}
function bindEditing(){const table=document.getElementById('xlsTable');if(!table)return;table.onpointerdown=e=>{const td=e.target.closest('.slot.editable');if(!td||e.button>0)return;e.preventDefault();drag={active:true,row:+td.dataset.row,pointerId:e.pointerId,changed:new Set(),first:null,last:null};try{table.setPointerCapture(e.pointerId)}catch(_){}paintCell(td)};table.onpointermove=e=>{if(!drag.active||e.pointerId!==drag.pointerId)return;e.preventDefault();const td=document.elementFromPoint(e.clientX,e.clientY)?.closest('.slot.editable');if(td&&table.contains(td))paintCell(td)};const end=e=>{if(!drag.active)return;drag.active=false;if(drag.changed.size){renderReader();renderPlanningInsights()}drag.row=null;drag.changed.clear()};table.onpointerup=end;table.onpointercancel=end;table.onlostpointercapture=end}
async function resetDay(){if(!canEdit||!editMode||!model)return;const date=dayKey();if(!confirm('Réinitialiser entièrement '+DAYS[currentDay][1]+' '+frDate(addDays(currentWeekStart,currentDay))+' ?'))return;const d=modelDay(),affected=[];d.cells.forEach((r,i)=>{if(r.some(Boolean)){affected.push(model.employees[i]?.name);markPlanningChange(currentDay,i)}});d.cells=d.cells.map(r=>r.map(()=>null));const saved=await saveWeek();if(!saved){showToast(planningLastSaveOutcome==='conflict'?'Conflit : la journée n’a pas été réinitialisée':'Réinitialisation non confirmée. Vérifie la semaine avant de réessayer.');return}await addPlanningLog('modify',logDetails({kind:'reset_day',dates:[date]}));const ids=[...new Set(affected.map(n=>planningProfileFor(n)?.id).filter(Boolean))];await notifyUsers(ids.map(id=>({user_id:id,kind:'reset_day',title:'Planning du '+shortDate(date)+' modifié',message:'La journée du '+shortDate(date)+' a été réinitialisée. Merci de reconsulter tes horaires.',planning_date:date,week_start:isoDate(startOfWeek(parseISO(date))),target_url:'planning.html?week='+encodeURIComponent(isoDate(startOfWeek(parseISO(date))))+'&day='+encodeURIComponent(date)})));resetEditChanges();editSnapshot=clonePlanningModel(model);renderAll();if(planningLastSaveVerified)window.NettoSounds?.play?.('delete');showToast(planningLastSaveVerified?'Planning du jour réinitialisé':'Enregistré • version à vérifier')}
async function resetWeek(){
 if(!canEdit||!editMode||!model)return;
 if(!confirm('Réinitialiser entièrement le planning de la semaine du '+frDate(currentWeekStart)+' ?'))return;
 const key=isoDate(currentWeekStart);
 const revision=planningLoadedRevisionAt;
 if(!revision){setSaveState('Version du planning inconnue • recharge la semaine');return}
 const ids=[...new Set((model.employees||[]).map(e=>planningProfileFor(e.name)?.id).filter(Boolean))];
 let result,error;
 try{({data:result,error}=await db.rpc('planning_delete_week_if_revision',{p_week_start:key,p_expected_revision:revision}))}
 catch(e){error=e}
 if(error){
  setSaveState('Suppression non confirmée • vérifier la semaine');
  console.warn('Réinitialisation semaine non confirmée',error);
  return
 }
 if(result?.status==='conflict'){
  planningConflictDetected=true;
  setSaveState('Conflit : la semaine a été modifiée ailleurs');
  alert('La semaine a changé depuis son ouverture. Elle n’a pas été supprimée. Annule tes modifications et recharge le planning avant de recommencer.');
  return
 }
 if(result?.status!=='ok'){
  setSaveState('Suppression de semaine refusée');
  return
 }
 await addPlanningLog('modify',logDetails({kind:'reset_week',week_start:key}));
 await notifyUsers(ids.map(id=>({user_id:id,kind:'reset_week',title:'Planning de la semaine réinitialisé',message:'Le planning de la semaine du '+frDate(currentWeekStart)+' a été réinitialisé. Merci de reconsulter tes horaires.',week_start:key,target_url:'planning.html?week='+encodeURIComponent(key)+'&day='+encodeURIComponent(key)})));
 model=null;editSnapshot=null;editMode=false;resetEditChanges();planningLoadedRevisionAt='';planningLoadedWeekKey='';planningCacheReady=false;planningConflictDetected=false;
 document.getElementById('editTools').classList.add('hidden');
 document.getElementById('editSaveBar').classList.add('hidden');
 document.getElementById('editPlanningBtn').textContent='✎ Modifier le planning';
 renderAll();window.NettoSounds?.play?.('delete');showToast('Planning de la semaine réinitialisé')
}

async function addPlanningLog(action,details){try{if(!db||!currentUser)return;await db.from('planning_logs').insert({user_id:currentUser.id,display_name:currentUser.name,action,details});await loadPlanningLogs()}catch(e){console.warn(e)}}
function renderPlanningLog(x){
 const d=new Date(x.created_at),j=parseLogDetails(x.details),stamp=d.toLocaleDateString('fr-FR')+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});let cls='logModify',icon='✎',title=x.display_name+' a modifié le planning',detail='';
 if(j?.kind==='import_new'){cls='logImport';icon='▦';title=x.display_name+' a importé le planning du '+shortDate(j.week_start);detail='Le planning est maintenant disponible pour l’équipe.'}
 else if(j?.kind==='import_replace'){cls='logReplace';icon='↻';title=x.display_name+' a remplacé le planning du '+shortDate(j.week_start);detail='Le planning précédent a été écrasé : pensez à reconsulter vos horaires.'}
 else if(j?.kind==='manual_edit'){cls='logModify';icon='✎';const dates=(j.dates||[]).map(shortDate);title=x.display_name+' a modifié les horaires de '+(dates.length>1?dates.length+' journées':'la journée du '+(dates[0]||''));detail=dates.length>1?'Journées concernées : '+dates.join(' • ')+' — veuillez reconsulter vos horaires.':'La journée du '+(dates[0]||'')+' a été modifiée, veuillez reconsulter vos horaires.'}
 else if(j?.kind==='reset_day'){cls='logReset';icon='⌫';const date=(j.dates||[])[0];title=x.display_name+' a réinitialisé la journée du '+shortDate(date);detail='Les horaires de cette journée ont été effacés.'}
 else if(j?.kind==='reset_week'){cls='logReset';icon='⌫';title=x.display_name+' a réinitialisé la semaine du '+shortDate(j.week_start);detail='Le planning de cette semaine a été effacé.'}
 else if(j?.kind==='absence_review'){cls=j.status==='approved'?'logImport':'logReset';icon=j.status==='approved'?'✓':'×';title=x.display_name+' a '+(j.status==='approved'?'validé':'refusé')+' la demande de '+(j.target_name||'un utilisateur');detail=absenceTypeLabel(j.type)+' du '+shortDate(j.start_date)+' au '+shortDate(j.end_date)+'.'}
 else if(x.action==='import'){cls='logImport';icon='▦';title=x.display_name+' a importé un planning';detail=x.details||''}
 else{detail=x.details||''}
 return '<div class="planningLog '+cls+'" data-log-id="'+esc(x.id)+'"><span class="logIcon">'+icon+'</span><div class="logBody"><strong>'+esc(title)+'</strong>'+(detail?'<span>'+esc(detail)+'</span>':'')+'<small>'+esc(stamp)+'</small></div>'+(role==='admin'?'<button class="logDelete" type="button" title="Supprimer cette ligne" aria-label="Supprimer cette ligne" onclick="deletePlanningLog('+Number(x.id)+')">×</button>':'')+'</div>'
}
async function loadPlanningLogs(){const box=document.getElementById('planningLogsList');if(!box)return;const {data,error}=await db.from('planning_logs').select('id,display_name,action,details,created_at').order('created_at',{ascending:false}).limit(100);if(error){box.innerHTML='<span class="logsEmpty">Historique indisponible.</span>';return}const clean=(data||[]).filter(x=>x.action!=='modify'||!!parseLogDetails(x.details));box.innerHTML=clean.length?clean.map(renderPlanningLog).join(''):'<span class="logsEmpty">Aucune activité enregistrée.</span>'}
async function deletePlanningLog(id){
 if(role!=='admin')return;
 const logId=Number(id);if(!Number.isFinite(logId))return;
 if(!confirm('Supprimer uniquement cette ligne de l’historique ?'))return;
 const row=document.querySelector('.planningLog[data-log-id="'+String(logId)+'"]');
 if(row){row.style.opacity='.45';row.style.pointerEvents='none'}
 const {error}=await db.from('planning_logs').delete().eq('id',logId);
 if(error){if(row){row.style.opacity='';row.style.pointerEvents=''}window.NettoSounds?.play?.('error');alert('Impossible de supprimer cette ligne : '+error.message);return}
 window.NettoSounds?.play?.('delete');
 if(row)row.remove();else await loadPlanningLogs();
 const box=document.getElementById('planningLogsList');if(box&&!box.querySelector('.planningLog'))box.innerHTML='<span class="logsEmpty">Aucune activité enregistrée.</span>'
}
async function clearPlanningLogs(){if(role!=='admin'||!confirm('Effacer tout l’historique du planning ?'))return;const {error}=await db.from('planning_logs').delete().gte('id',0);if(error)alert('Impossible d’effacer les logs.');else loadPlanningLogs()}

function discardEditsBeforeNavigation(){
 if(!editMode)return true;
 if(changedDates().length&&!confirm('Tu as des modifications non enregistrées. Les abandonner pour changer de semaine ?'))return false;
 editMode=false;editSnapshot=null;resetEditChanges();
 document.getElementById('editTools')?.classList.add('hidden');
 document.getElementById('editSaveBar')?.classList.add('hidden');
 const button=document.getElementById('editPlanningBtn');
 if(button){button.textContent='✎ Modifier le planning';button.classList.remove('editing')}
 return true
}
async function changeWeek(delta){if(!discardEditsBeforeNavigation())return;currentWeekStart=addDays(currentWeekStart,delta*7);currentDay=0;await loadWeek(currentWeekStart);playUISound()}
async function goCurrentWeek(){if(!discardEditsBeforeNavigation())return;const now=new Date();currentWeekStart=startOfWeek(now);currentDay=Math.max(0,Math.min(6,(now.getDay()+6)%7));await loadWeek(currentWeekStart)}
function setPlanningView(v,opts={}){
 planningView=v==='year'?'year':'week';
 const yearView=document.getElementById('yearView');
 const weekView=document.getElementById('weekView');
 if(weekView)weekView.classList.remove('hidden');
 if(yearView){
  yearView.classList.toggle('hidden',planningView!=='year');
  yearView.setAttribute('aria-hidden',planningView==='year'?'false':'true')
 }
 document.body.classList.toggle('planningYearOpen',planningView==='year');
 document.getElementById('weekViewBtn')?.classList.toggle('active',planningView==='week');
 document.getElementById('yearViewBtn')?.classList.toggle('active',planningView==='year');
 document.querySelector('.weekNav')?.classList.toggle('hidden',planningView!=='week');
 if(planningView==='year'){
  syncPlanningCalendarViewport();
  renderYear();
  setTimeout(()=>document.querySelector('.yearCloseBtn')?.focus(),40)
 }else{
  renderAll()
 }
 if(opts.sound!==false)window.NettoSounds?.play?.('switch')
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&planningView==='year')setPlanningView('week')});
async function changeYear(n){currentYear+=n;await renderYear()}
async function goCurrentYear(){currentYear=new Date().getFullYear();await renderYear();window.NettoSounds?.play?.('tap')}
async function renderYear(){
 const title=document.getElementById('yearTitle');if(title)title.textContent=currentYear;
 const yearStart=new Date(currentYear,0,1),yearEnd=new Date(currentYear,11,31),queryStart=isoDate(startOfWeek(yearStart)),queryEnd=isoDate(startOfWeek(yearEnd));
 const {data,error}=await db.from('planning_weeks').select('week_start').gte('week_start',queryStart).lte('week_start',queryEnd);
 const weeks=new Set((data||[]).map(x=>x.week_start)),summary=document.getElementById('yearSummary');
 if(summary)summary.textContent=error?'Impossible de vérifier les semaines publiées.':weeks.size+(weeks.size>1?' semaines publiées':' semaine publiée')+' sur '+currentYear+'.';
 let html='',todayKey=isoDate(new Date());
 for(let m=0;m<12;m++){
  const first=new Date(currentYear,m,1),last=new Date(currentYear,m+1,0),offset=(first.getDay()+6)%7,monthWeeks=new Set();
  for(let d=1;d<=last.getDate();d++)monthWeeks.add(isoDate(startOfWeek(new Date(currentYear,m,d))));
  const published=[...monthWeeks].filter(w=>weeks.has(w)).length;
  html+='<section class="monthCard"><div class="monthCardHeader"><h3>'+first.toLocaleDateString('fr-FR',{month:'long'})+'</h3><span class="monthStatus '+(published?'hasPlanning':'')+'">'+(published?published+' sem.':'Aucun planning')+'</span></div><div class="monthWeekdays"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div><div class="monthDays">'+Array.from({length:offset},()=>'<span class="yearEmptySlot"></span>').join('');
  for(let d=1;d<=last.getDate();d++){
   const dt=new Date(currentYear,m,d),dateKey=isoDate(dt),wk=isoDate(startOfWeek(dt)),has=weeks.has(wk),today=dateKey===todayKey,weekend=dt.getDay()===0||dt.getDay()===6;
   const label=dt.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(has?' — planning disponible':'');
   html+='<button class="yearDay '+(has?'hasData ':'')+(today?'today ':'')+(weekend?'weekend':'')+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" onclick="openYearDate(\''+dateKey+'\')">'+d+(has?'<i></i>':'')+'</button>'
  }
  html+='</div></section>'
 }
 document.getElementById('yearGrid').innerHTML=html
}
async function openYearDate(k){const d=parseISO(k);currentWeekStart=startOfWeek(d);currentDay=(d.getDay()+6)%7;setPlanningView('week');await loadWeek(currentWeekStart)}

function applyPlanningDeepLink(){const q=new URLSearchParams(location.search),week=q.get('week'),day=q.get('day'),focus=q.get('focus');planningDeepLinkFocus=focus==='rest'||focus==='leave'?focus:'';if(week&&/^\d{4}-\d{2}-\d{2}$/.test(week))currentWeekStart=startOfWeek(parseISO(week));if(day&&/^\d{4}-\d{2}-\d{2}$/.test(day)){const d=parseISO(day),ws=startOfWeek(d);currentWeekStart=ws;currentDay=Math.max(0,Math.min(6,(d.getDay()+6)%7))}}
async function waitForSupabase(ms=8000){const s=Date.now();while(Date.now()-s<ms){if(window.supabase?.createClient)return;await new Promise(r=>setTimeout(r,100))}throw new Error('Supabase indisponible')}
const PLANNING_WIDGETS={coverage:'coverageWidget',personal_stats:'personalStatsCard',anomalies:'anomalyWidget',absences:'absencesWidget'};
function absencePermission(config,userRole){
 if(userRole==='admin')return'manage';
 const value=config?.planning_widgets?.absences?.[userRole];
 if(value==='manage'||value===true)return'manage';
 if(value==='request')return'request';
 return'hidden'
}
function planningWidgetVisible(config,key,userRole){
 if(key==='absences')return absencePermission(config,userRole)!=='hidden';
 const rules=config?.planning_widgets?.[key];return !rules||typeof rules!=='object'||rules[userRole]!==false
}
function applyPlanningAccessDataset(config,userRole,permission,absenceOverride){
 const root=document.documentElement,abs=absenceOverride||absencePermission(config,userRole);
 root.dataset.planningRole=userRole||'lecture';
 root.dataset.planningPermission=permission||'none';
 root.dataset.planningCanEdit=permission==='manage'?'1':'0';
 root.dataset.planningAdmin=userRole==='admin'?'1':'0';
 root.dataset.pwPersonal=planningWidgetVisible(config,'personal_stats',userRole)?'1':'0';
 root.dataset.pwAnomalies=planningWidgetVisible(config,'anomalies',userRole)?'1':'0';
 root.dataset.pwCoverage=planningWidgetVisible(config,'coverage',userRole)?'1':'0';
 root.dataset.pwAbsences=abs!=='hidden'?'1':'0';
 root.dataset.planningAbsence=abs;
 root.dataset.planningLogs=(permission==='manage'||abs==='manage')?'1':'0';
 root.dataset.planningAccess='ready'
}
async function applyPlanningWidgetPermissions(userRole,configOverride=null,permissionOverride=planningPermissionLevel){
 let config=configOverride&&typeof configOverride==='object'&&Object.keys(configOverride).length?configOverride:null;
 if(!config){
  const uiConfig=window.NettoProfileUI?.siteConfig;
  if(uiConfig&&typeof uiConfig==='object'&&Object.keys(uiConfig).length)config=uiConfig
 }
 if(!config){
  try{
   const {data,error}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
   if(error)throw error;config=data?.value&&typeof data.value==='object'?data.value:{}
  }catch(e){console.warn('Permissions widgets indisponibles',e);config={}}
 }
 planningSiteConfig=config;
 absenceAccess=absencePermission(config,userRole);
 if(absenceAccess!=='hidden'){
  try{
   const {data,error}=await db.rpc('planning_absence_my_permission');
   if(!error&&['hidden','request','manage'].includes(data))absenceAccess=data;
   else if(error)console.warn('Permission Indisponibilités / Congés:',error)
  }catch(e){console.warn('Permission Indisponibilités / Congés:',e)}
 }
 applyPlanningAccessDataset(config,userRole,permissionOverride,absenceAccess);
 for(const [key,id] of Object.entries(PLANNING_WIDGETS)){
  const el=document.getElementById(id);if(!el)continue;
  const allowed=key==='absences'?absenceAccess!=='hidden':planningWidgetVisible(config,key,userRole);
  el.classList.toggle('hidden',!allowed)
 }
 const personalVisible=planningWidgetVisible(config,'personal_stats',userRole);
 document.getElementById('planningInsights')?.classList.toggle('hidden',!personalVisible)
}
function updatePlanningRoleActions(){
 const canManageAbsences=absenceAccess==='manage';
 document.getElementById('editPlanningBtn')?.classList.toggle('hidden',!canEdit);
 document.getElementById('importPanel')?.classList.toggle('hidden',!canEdit);
 document.getElementById('downloadSourceBtn')?.classList.toggle('hidden',role!=='admin'||!model);
 document.getElementById('planningImportHistoryBtn')?.classList.toggle('hidden',!planningImportHistoryAllowed());
 if(role!=='admin')closePlanningImportHistory();
 document.getElementById('planningLogs')?.classList.toggle('hidden',!(canEdit||canManageAbsences));
 document.getElementById('clearPlanningLogs')?.classList.toggle('hidden',role!=='admin');
 document.getElementById('absenceRequestBtn')?.classList.toggle('hidden',absenceAccess==='hidden');
 document.getElementById('absenceAdminTools')?.classList.toggle('hidden',role!=='admin');
 placePlanningActions()
}
async function waitForProfileContext(uid,ms=1800){
 const shared=planningSharedServices();if(shared?.profile&&shared?.session?.user?.id===uid)return shared.profile;
 const start=Date.now(),api=window.NettoProfileUI;
 while(Date.now()-start<ms){
  if(api?.session?.user?.id===uid&&api.profile)return api.profile;
  await new Promise(r=>setTimeout(r,25))
 }
 return api?.session?.user?.id===uid?api.profile:null
}
async function prewarmPlanningRuntime(){
 if(!PLANNING_SPA_MODE)return false;
 const shared=planningSharedServices();
 if(!shared)return false;
 await shared.ready();
 const session=shared.session,p=shared.profile;
 if(!session||!p||!shared.client)return false;
 const permission=planningPermissionFromShared(p,shared.siteConfig||{});
 if(permission==='none')return false;
 const uid=String(session.user.id||'');
 if(planningCacheReady&&planningCacheUserId===uid&&planningLoadedWeekKey)return true;
 db=shared.client;
 role=p.role||'lecture';
 planningPermissionLevel=permission;
 canEdit=permission==='manage';
 currentUser={id:session.user.id,name:p.display_name||'Utilisateur'};
 planningSiteConfig=shared.siteConfig||{};
 absenceAccess=absencePermission(planningSiteConfig,role);
 currentWeekStart=startOfWeek(new Date());
 currentDay=Math.max(0,Math.min(6,(new Date().getDay()+6)%7));
 planningDeepLinkFocus='';
 await Promise.all([
  loadTeamProfiles(),
  loadWeek(currentWeekStart,{render:false,silent:true})
 ]);
 planningCacheUserId=uid;
 planningRuntimeActive=false;
 return planningCacheReady
}
async function syncFreshPlanningAccess(fresh=(planningSharedServices()?.profile||window.NettoProfileUI?.profile)){
 if(!fresh)return;
 try{
  const shared=planningSharedServices(),api=window.NettoProfileUI;
  role=fresh.role||role||'lecture';
  planningPermissionLevel=shared?planningPermissionFromShared(fresh,shared.siteConfig||{}):(api?.permissionLevel?.('planning',fresh)||'none');
  if(planningPermissionLevel==='none'){planningGoHome();return}
  canEdit=planningPermissionLevel==='manage';
  currentUser={id:shared?.session?.user?.id||api?.session?.user?.id||currentUser?.id,name:fresh.display_name||currentUser?.name||'Utilisateur'};
  await applyPlanningWidgetPermissions(role,shared?.siteConfig||api?.siteConfig||{},planningPermissionLevel);
  updatePlanningRoleActions();
  await loadPlanningReadStatusWeek({render:false});startPlanningReadStatusPolling();
  if(document.documentElement.dataset.planningLogs==='1')loadPlanningLogs().catch(()=>{});
  renderAll()
 }catch(e){console.warn('Actualisation accès planning:',e)}
}
window.addEventListener('netto:profile',e=>{
 if(!document.body?.classList.contains('planningReady')||e.detail?.cached)return;
 syncFreshPlanningAccess(e.detail?.profile).catch(()=>{})
});
async function init(){
 planningRuntimeActive=true;
 bindPlanningCalendarViewport();applyPlanningDeviceUI();
 const shared=planningSharedServices();
 let session=null,p=null;
 if(shared){
  await shared.ready();
  db=shared.client;session=shared.session;p=shared.profile
 }else{
  await waitForSupabase();
  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const auth=await db.auth.getSession();session=auth?.data?.session||null
 }
 if(!session){if(PLANNING_SPA_MODE)planningGoHome();else location.href='index.html';return}
 const sameCachedUser=PLANNING_SPA_MODE&&planningCacheReady&&planningCacheUserId===String(session.user.id);
 if(!sameCachedUser){
  currentWeekStart=startOfWeek(new Date());
  currentDay=Math.max(0,Math.min(6,(new Date().getDay()+6)%7))
 }
 planningDeepLinkFocus='';
 let routeOverride=false;
 try{
  const q=new URLSearchParams(location.search);
  routeOverride=q.has('week')||q.has('day')||q.has('focus')
 }catch(_){}
 if(!sameCachedUser||routeOverride)applyPlanningDeepLink();
 try{localStorage.removeItem('nettoPlanningView')}catch(_){}
 if(!p)p=await waitForProfileContext(session.user.id);
 if(!p){
  const fast=window.__planningFastContext;
  if(fast?.profile)p=fast.profile
 }
 if(!p){
  const result=await db.from('profiles').select('role,display_name').eq('id',session.user.id).maybeSingle();p=result.data
 }
 role=p?.role||'lecture';
 const api=window.NettoProfileUI;
 planningPermissionLevel=shared?planningPermissionFromShared(p,shared.siteConfig||{}):(api?.profile&&api.profile.role===role?(api.permissionLevel?.('planning',api.profile)||'none'):String(window.__planningFastContext?.accessSnapshot?.permissions?.planning||'none'));
 if(!shared&&planningPermissionLevel==='none'&&api?.refresh){
  const waitStart=Date.now();
  while(api?.session?.user?.id!==session.user.id&&Date.now()-waitStart<2500)await new Promise(r=>setTimeout(r,35));
  const fresh=await api.refresh();
  if(fresh){p=fresh;role=fresh.role||role;planningPermissionLevel=api.permissionLevel?.('planning',fresh)||'none'}
 }
 if(planningPermissionLevel==='none'){planningGoHome();return}
 canEdit=planningPermissionLevel==='manage';
 currentUser={id:session.user.id,name:p?.display_name||'Utilisateur'};
 const initialConfig=shared?.siteConfig||(api?.siteConfig&&Object.keys(api.siteConfig).length?api.siteConfig:window.__planningFastContext?.siteConfig)||{};

 if(sameCachedUser){
  planningSiteConfig=initialConfig;
  const configuredAbsence=absencePermission(initialConfig,role);
  if(configuredAbsence==='hidden')absenceAccess='hidden';
  else if(!['request','manage'].includes(absenceAccess))absenceAccess=configuredAbsence;
  applyPlanningAccessDataset(initialConfig,role,planningPermissionLevel,absenceAccess);
  updatePlanningRoleActions();
  restorePersonalStatsState();restorePlanningInsightStates();syncPlanningWorkspaceTabs(planningWorkspaceMode||'planning');
  // Toujours revalider auprès du serveur : le préchargement mobile peut être ancien.
  await loadWeek(currentWeekStart,{render:false,silent:true});
  await loadPlanningReadStatusWeek({render:false});
  startPlanningProfileRealtime();startPlanningDataRealtime();startPlanningReadStatusPolling();
  document.body.classList.add('planningReady');
  renderAll();
  setPlanningView(planningView,{sound:false});
  Promise.resolve(applyPlanningWidgetPermissions(role,initialConfig,planningPermissionLevel)).then(()=>{
   if(!planningRuntimeActive)return;
   updatePlanningRoleActions();renderAll();
   if(document.documentElement.dataset.planningLogs==='1')loadPlanningLogs().catch(()=>{})
  }).catch(e=>console.warn('Actualisation permissions Planning:',e));
  return true
 }

 const savedView='week';
 await applyPlanningWidgetPermissions(role,initialConfig,planningPermissionLevel);
 updatePlanningRoleActions();
 restorePersonalStatsState();restorePlanningInsightStates();syncPlanningWorkspaceTabs('planning');
 const shouldLogs=document.documentElement.dataset.planningLogs==='1';
 await Promise.all([
  loadTeamProfiles(),
  loadWeek(currentWeekStart,{render:false}),
  shouldLogs?loadPlanningLogs():Promise.resolve()
 ]);
 planningCacheUserId=String(session.user.id);
 await loadPlanningReadStatusWeek({render:false});
 startPlanningProfileRealtime();startPlanningDataRealtime();startPlanningReadStatusPolling();
 document.body.classList.add('planningReady');
 renderAll();
 setPlanningView(savedView,{sound:false});
 if(shared?.profile)syncFreshPlanningAccess(shared.profile).catch(()=>{});
 else if(api?.profile)syncFreshPlanningAccess(api.profile).catch(()=>{});
 return true
}
function planningInitError(e){console.error(e);const meta=document.getElementById('readerMeta');if(meta)meta.textContent='Erreur de chargement du planning.'}
if(!PLANNING_SPA_MODE){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(planningInitError),{once:true});
 else init().catch(planningInitError)
}

function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function applyTheme(t){t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('nettoTheme',t)}catch(e){}}
function toggleTheme(e){e?.stopPropagation();applyTheme(currentTheme()==='dark'?'light':'dark')}
if(!PLANNING_SPA_MODE)document.addEventListener('DOMContentLoaded',()=>applyTheme(currentTheme()));

async function unmountPlanningRuntime(options={}){
 planningRuntimeActive=false;
 coverageModeActive=false;
 drag={active:false,row:null,pointerId:null,changed:new Set(),first:null,last:null};
 document.body.classList.remove('planningReady','planningEditing','planningYearOpen','agendaLayout','mobileAgendaForced','coverageMode');
 for(const key of ['planningRole','planningPermission','planningCanEdit','planningAdmin','pwPersonal','pwAnomalies','pwCoverage','pwAbsences','planningAbsence','planningLogs','planningAccess','planningDevice'])delete document.documentElement.dataset[key];
 if(PLANNING_SPA_MODE&&options.hard!==true)return true;
 clearTimeout(planningDataRefreshTimer);planningDataRefreshTimer=null;
 clearInterval(planningReadStatusTimer);planningReadStatusTimer=null;
 if(typeof planningDataSyncUnsubscribe==='function')planningDataSyncUnsubscribe();planningDataSyncUnsubscribe=null;
 try{if(planningProfileChannel&&db)await db.removeChannel(planningProfileChannel)}catch(_){}
 try{if(planningDataChannel&&db)await db.removeChannel(planningDataChannel)}catch(_){}
 planningProfileChannel=null;planningDataChannel=null;
 editMode=false;resetEditChanges();editSnapshot=null;model=null;planningAbsences=[];teamProfiles=[];
 planningCacheReady=false;planningCacheUserId='';planningLoadedWeekKey='';planningLoadedRevisionAt='';planningWeekLoadError=false;planningWeekLoadSeq++;clearPlanningReadStatuses('');
 return true
}
async function mountPlanningRuntime(){return init()}
window.NethorPlanningRuntime=Object.freeze({
 mount:mountPlanningRuntime,
 unmount:unmountPlanningRuntime,
 prewarm:prewarmPlanningRuntime,
 reset:()=>unmountPlanningRuntime({hard:true}),
 render:()=>renderAll(),
 markRead:(value,source)=>markPlanningDayRead(value||dayKey(),source),
 loadWeek:(value)=>loadWeek(value?parseISO(value):currentWeekStart),
 get active(){return planningRuntimeActive},
 get cached(){return planningCacheReady},
 get cacheWeek(){return planningLoadedWeekKey},
 get loadError(){return planningWeekLoadError},
 get revision(){return planningLoadedRevisionAt},
 get week(){return isoDate(currentWeekStart)},
 get day(){return dayKey()}
});


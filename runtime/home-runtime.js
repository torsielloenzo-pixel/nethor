const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co',SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let homeSession=null,homePageViewRows=[],homeCurrentViewKey='',homeCurrentViewLabel='';
let homeDashboardProfile=null,homeDashboardName='',homeDashboardConfig={},homeTaskCatalog=[],homeTaskRows=[],homeTaskAssignees=[],homeTaskCompletions=[],homeTaskTeam=[],homeTaskAfternoonUserIds=[],homeTaskBusy=false;
const $=id=>document.getElementById(id);
function homePageKey(value){try{const u=new URL(String(value||''),location.href);return (u.pathname.split('/').pop()||'home.html')}catch(_){const s=String(value||'').split('/').pop()||'home.html';return s.split('?')[0]}}
async function loadAdminPageViews(){
 if(window.currentRole!=='admin')return;
 const {data,error}=await db.from('admin_page_view_counts').select('page_key,actor_id,display_name,view_count,last_view_at');
 if(error){console.warn('Statistiques consultations:',error);return}
 homePageViewRows=data||[];
 document.querySelectorAll('[data-view-key]').forEach(btn=>{const key=btn.dataset.viewKey,total=homePageViewRows.filter(x=>x.page_key===key).reduce((n,x)=>n+Number(x.view_count||0),0),b=btn.querySelector('b');if(b)b.textContent=String(total);btn.title=total+' consultation'+(total>1?'s':'')})
}
function openPageViews(key,label,e){e?.preventDefault();e?.stopPropagation();homeCurrentViewKey=key;homeCurrentViewLabel=label;$('pageViewsTitle').textContent=label+' · consultations';const rows=homePageViewRows.filter(x=>x.page_key===key).sort((a,b)=>Number(b.view_count||0)-Number(a.view_count||0)),total=rows.reduce((n,x)=>n+Number(x.view_count||0),0);$('pageViewsTotal').textContent=String(total);$('pageViewsList').innerHTML=rows.length?rows.map(x=>'<div class="pageViewUser"><div><strong>'+homeEsc(x.display_name||'Utilisateur')+'</strong><small>Dernière visite : '+new Date(x.last_view_at).toLocaleDateString('fr-FR')+' · '+new Date(x.last_view_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'</small></div><b>'+Number(x.view_count||0)+'×</b></div>').join(''):'<div class="pageViewsEmpty">Aucune consultation comptabilisée pour cette page.</div>';const dialog=$('pageViewsDialog');if(!dialog.open){dialog.showModal();window.NettoSounds?.play?.('menuOpen')}}
async function resetCurrentPageViews(){if(!homeCurrentViewKey||!homeSession)return;if(!confirm('Réinitialiser le compteur de consultations pour « '+homeCurrentViewLabel+' » ?\n\nLe journal d’activité complet sera conservé.'))return;const {error}=await db.from('page_view_counter_resets').upsert({page_key:homeCurrentViewKey,reset_at:new Date().toISOString(),reset_by:homeSession.user.id},{onConflict:'page_key'});if(error){window.NettoSounds?.play?.('error');return alert('Réinitialisation impossible : '+error.message)}window.NettoSounds?.play?.('success');await loadAdminPageViews();openPageViews(homeCurrentViewKey,homeCurrentViewLabel);}
let audioCtx=null;
function logoutSound(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=audioCtx||(audioCtx=new A()),play=()=>{const n=a.currentTime,m=a.createGain();m.gain.setValueAtTime(.0001,n);m.gain.exponentialRampToValueAtTime(.045,n+.04);m.gain.exponentialRampToValueAtTime(.0001,n+.5);m.connect(a.destination);[[587,0],[494,.08],[392,.16]].forEach(([f,d])=>{const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(f,n+d);g.gain.setValueAtTime(.0001,n+d);g.gain.exponentialRampToValueAtTime(.22,n+d+.035);g.gain.exponentialRampToValueAtTime(.0001,n+d+.3);o.connect(g);g.connect(m);o.start(n+d);o.stop(n+d+.33)})};a.state==='suspended'?a.resume().then(play):play()}catch(e){}}
function toggleUserMenu(e){e?.stopPropagation();const m=document.getElementById('userMenu'),b=document.getElementById('userMenuBtn');m.classList.toggle('hidden');b.setAttribute('aria-expanded',String(!m.classList.contains('hidden')))}
function closeUserMenu(){const m=document.getElementById('userMenu');if(m)m.classList.add('hidden');const b=document.getElementById('userMenuBtn');if(b)b.setAttribute('aria-expanded','false')}
document.addEventListener('click',e=>{if(!e.target.closest('.userMenuWrap'))closeUserMenu()});
function homeNorm(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function homeStartOfWeek(d){const x=new Date(d),n=(x.getDay()+6)%7;x.setHours(0,0,0,0);x.setDate(x.getDate()-n);return x}
function homeIsoDate(d){const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function homeFriendlyHour(t){const h=Math.floor(t),min=Math.round((t-h)*60);return min?h+'h'+String(min).padStart(2,'0'):h+'h'}
function homeWorkRanges(row,m){const out=[];let start=null;for(let i=0;i<=row.length;i++){const working=i<row.length&&(row[i]==='g'||row[i]==='b');if(working&&start===null)start=i;if(!working&&start!==null){out.push({a:(m.startTime??6)+start*.25,b:(m.startTime??6)+i*.25});start=null}}return out}
async function loadHomeTodayPlanning(profile,name){
 const el=document.getElementById('homeTodayMessage');if(!el)return;
 if(homeTaskMode(profile?.role)==='editor'){el.classList.add('hidden');el.textContent='';return}
 el.classList.remove('hidden');
 const today=new Date(),week=homeIsoDate(homeStartOfWeek(today)),todayKey=homeIsoDate(today);
 const {data,error}=await db.from('planning_weeks').select('data').eq('week_start',week).maybeSingle();
 if(error||!data?.data){el.textContent='Ton planning d’aujourd’hui n’est pas encore renseigné.';return}
 const m=data.data,target=homeNorm(name),employees=m.employees||[];
 const idx=employees.findIndex(e=>{const n=homeNorm(e?.name),base=n.replace(/\s+[a-z]$/,'');return n===target||base===target});
 if(idx<0){el.textContent='Ton planning d’aujourd’hui n’est pas encore renseigné.';return}
 const facts=homeDayFacts(m,todayKey,name);
 if(facts.hours>0&&facts.ranges.length){const schedule=facts.ranges.map(x=>homeFriendlyHour(x.a)+' à '+homeFriendlyHour(x.b)).join(' • ');el.innerHTML='Ton planning d’aujourd’hui : <strong>'+schedule+'</strong>. Bonne journée !';return}
 if(facts.isLeave){el.innerHTML='Tu ne travailles pas aujourd’hui · <strong>Congé</strong> indiqué dans ton planning.';return}
 if(facts.isRest){el.innerHTML='Tu ne travailles pas aujourd’hui · <strong>Jour de repos</strong>. Profite bien de ta journée !';return}
 el.innerHTML='Tu ne travailles pas aujourd’hui · <strong>Statut indiqué dans le planning</strong>.'
}

function homePlatformKind(){const kind=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase();return kind==='desktop'?'desktop':'mobile'}
function homeIsMobilePlatform(){return homePlatformKind()==='mobile'}
function homeAddDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function homeParseDate(s){const [y,m,d]=String(s||'').split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1)}
function homeDateDiffDays(fromKey,toKey){
 const [fy,fm,fd]=String(fromKey||'').split('-').map(Number),[ty,tm,td]=String(toKey||'').split('-').map(Number);
 if(!fy||!fm||!fd||!ty||!tm||!td)return 0;
 return Math.round((Date.UTC(ty,tm-1,td)-Date.UTC(fy,fm-1,fd))/86400000)
}
function homeDateLabel(dateKey,todayKey){
 if(dateKey===todayKey)return'Aujourd’hui';
 const tomorrow=homeIsoDate(homeAddDays(homeParseDate(todayKey),1));if(dateKey===tomorrow)return'Demain';
 return homeParseDate(dateKey).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','')
}
function homeClock(v){const h=Math.floor(v),m=Math.round((v-h)*60);return String(h).padStart(2,'0')+'h'+(m?String(m).padStart(2,'0'):'00')}
function homeEmployeeIndex(model,name){
 const target=homeNorm(name),employees=model?.employees||[];
 return employees.findIndex(e=>{const n=homeNorm(e?.name),base=n.replace(/\s+[a-z]$/,'');return n===target||base===target})
}
function homeDayFacts(model,dateKey,name){
 const idx=homeEmployeeIndex(model,name);if(idx<0)return{hours:0,ranges:[],idx:-1,row:[],isLeave:false,isBlank:false,isRestStatus:false,isRest:false,hasOtherStatus:false};
 const row=model?.days?.[dateKey]?.cells?.[idx]||[],ranges=homeWorkRanges(row,model||{}),hours=row.reduce((n,v)=>n+(v==='g'||v==='b'?0.25:0),0);
 const isLeave=hours===0&&row.some(v=>v==='y'),isBlank=row.every(v=>!v);
 const isRestStatus=hours===0&&!isLeave&&row.some(v=>v==='r'||v==='o')&&row.every(v=>!v||v==='r'||v==='o');
 const isRest=isBlank||isRestStatus,hasOtherStatus=hours===0&&!isLeave&&!isRest&&row.some(Boolean);
 return{hours,ranges,idx,row,isLeave,isBlank,isRestStatus,isRest,hasOtherStatus}
}
function homeDayHours(model,dateKey,name){
 const d=homeDayFacts(model,dateKey,name);return{hours:d.hours,ranges:d.ranges,idx:d.idx}
}
function homeWidgetVisible(cfg,id,profile,subroleKeys=[]){
 const node=cfg?.home_widgets?.[id]||{},role=profile?.role||'',fallback=id==='operations_hub'?role==='admin':true;
 const roleValue=node?.roles?.[role],allowed=(typeof roleValue==='boolean'?roleValue:fallback)||subroleKeys.some(k=>node?.subroles?.[k]===true);
 if(!allowed)return false;
 const personal=profile?.ui_preferences?.home_widgets?.[id];
 return typeof personal==='boolean'?personal:true
}
function homeStatIcon(id){
 const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
 const icons={
  hours:'<svg '+common+'><circle cx="12" cy="12" r="8.25"/><path d="M12 7.7v4.7l3.15 1.85"/></svg>',
  absences:'<svg '+common+'><rect x="4.2" y="5.6" width="15.6" height="14.1" rx="2.4"/><path d="M7.5 3.9v3.4M16.5 3.9v3.4M4.2 9.2h15.6M8 13h3M8 16h6"/></svg>',
  next_rest:'<svg '+common+'><path d="M17.7 15.8A7.2 7.2 0 0 1 8.2 6.3a7.35 7.35 0 1 0 9.5 9.5Z"/><path d="M16.6 6.1v2.2M15.5 7.2h2.2"/></svg>'
 };
 return icons[id]||icons.hours
}
function homeDashboardIcon(id){
 const nav=window.NettoProfileUI?.mobileNavIcon;
 const map={next_shift:'planning',hours:'planning',absences:'planning',next_rest:'planning',tasks:'articles',important_info:'notifications',team_today:'accounts',quick_access:'home'};
 return typeof nav==='function'?nav(map[id]||id):''
}
function homeParisDateKey(d=new Date()){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),o={};
  parts.forEach(p=>{if(p.type!=='literal')o[p.type]=p.value});
  return o.year+'-'+o.month+'-'+o.day
 }catch(_){return homeIsoDate(d)}
}
function homeTaskMode(role){
 const r=String(role||'').trim().toLowerCase();
 if(['admin','role_point-de-vente','point_vente','surface_vente'].includes(r))return'editor';
 if(['responsable','employe'].includes(r))return'user';
 return'hidden'
}
function homeTaskOperationalUsers(rows=homeTaskTeam){
 return (rows||[]).filter(x=>['responsable','employe'].includes(String(x.role||'').toLowerCase()))
}
function homeTaskAfternoonUsers(){
 const ids=new Set(homeTaskAfternoonUserIds||[]);
 return homeTaskOperationalUsers().filter(x=>ids.has(x.id))
}
function homeTaskAfternoonNames(){
 return homeTaskAfternoonUsers().map(x=>x.display_name||'Utilisateur')
}
function homeTaskGroups(rows){
 const map=new Map();
 for(const row of rows||[]){
  const key=row.section_key||'autre',label=row.section_label||'Autre';
  if(!map.has(key))map.set(key,{key,label,rows:[]});
  map.get(key).rows.push(row)
 }
 return [...map.values()]
}
function homeTaskAssigneeLabel(task){
 if(task.all_users)return'Tous les utilisateurs';
 const ids=homeTaskAssignees.filter(x=>x.task_id===task.id).map(x=>x.user_id);
 const names=ids.map(id=>homeTaskTeam.find(x=>x.id===id)?.display_name).filter(Boolean);
 if(!names.length)return'Aucun destinataire';
 if(names.length<=3)return names.join(' · ');
 return names.slice(0,3).join(' · ')+' +'+(names.length-3)
}
function homeTaskExpectedCount(task){
 return task.all_users?homeTaskOperationalUsers().length:homeTaskAssignees.filter(x=>x.task_id===task.id).length
}
function homeTaskCompletedCount(task){
 return homeTaskCompletions.filter(x=>x.task_id===task.id).length
}
function homeTaskGroupIcon(key){
 const icons={fl:'🥬',livraison_stock:'▤',promotion:'%',nettoyage:'✦',facing:'≡',dates:'◷',autre:'+'};
 return icons[key]||'•'
}
function homeTaskTemplateGroupsHtml(){
 const publishedKeys=new Set((homeTaskRows||[]).flatMap(t=>Array.isArray(t.source_keys)&&t.source_keys.length?t.source_keys:[t.catalog_key]).filter(Boolean));
 const groups=homeTaskGroups(homeTaskCatalog);
 return '<div class="mhdTaskTemplateGroups">'+groups.map((g,index)=>'<div class="mhdTaskTemplateGroup" data-task-group="'+homeEsc(g.key)+'"><button type="button" class="mhdTaskGroupToggle" aria-expanded="'+(index===0?'true':'false')+'" onclick="homeToggleTaskGroup(this)"><span class="mhdTaskGroupLead"><i>'+homeEsc(homeTaskGroupIcon(g.key))+'</i><span><strong>'+homeEsc(g.label)+'</strong><small>'+g.rows.length+' mission'+(g.rows.length>1?'s':'')+'</small></span></span><span class="mhdTaskGroupMeta"><b data-task-group-count>0</b><em>⌄</em></span></button><div class="mhdTaskTemplateGrid '+(index===0?'':'hidden')+'">'+g.rows.map(t=>{const sent=publishedKeys.has(t.key);return '<button type="button" class="mhdTaskChip'+(sent?' is-published':'')+'" data-task-template="'+homeEsc(t.key)+'" onclick="homeToggleTaskTemplate(this)" '+(sent?'disabled aria-disabled="true"':'')+'><span class="mhdTaskChipCheck">'+(sent?'✓':'✓')+'</span><span class="mhdTaskChipCopy"><strong>'+homeEsc(t.title)+'</strong>'+(sent?'<small>Déjà transmise</small>':'')+'</span></button>'}).join('')+'</div></div>').join('')+'</div>'
}
function homeTaskAudienceHtml(){
 const users=homeTaskAfternoonUsers();
 if(!users.length)return '<div class="mhdTaskAudience mhdTaskAudienceEmpty"><div class="mhdTaskAudienceHead"><div><span class="mhdTaskFieldLabel">Destinataires</span><strong>Équipe d’après-midi</strong><small>Aucune personne opérationnelle détectée après 14h dans le planning du jour.</small></div><span class="mhdTaskAudienceCount">0</span></div></div>';
 return '<div class="mhdTaskAudience"><div class="mhdTaskAudienceHead"><div><span class="mhdTaskFieldLabel">Destinataires</span><strong>Équipe d’après-midi</strong><small>Présence détectée après 14h · décoche uniquement si nécessaire.</small></div><span class="mhdTaskAudienceCount">'+users.length+'</span></div><div class="mhdTaskAudienceGrid">'+users.map(u=>'<button type="button" class="mhdTaskAssigneeChip selected" data-task-user="'+homeEsc(u.id)+'" aria-pressed="true" onclick="homeToggleTaskAudienceUser(this)"><span>'+homeEsc((u.display_name||'U').slice(0,1).toUpperCase())+'</span>'+homeEsc(u.display_name||'Utilisateur')+'</button>').join('')+'</div></div>'
}
function homeRenderTaskEditor(taskError){
 const tasks=homeTaskRows||[],groups=homeTaskGroups(tasks),afternoon=homeTaskAfternoonUsers(),afternoonNames=homeTaskAfternoonNames();
 const totalDone=tasks.reduce((n,t)=>n+homeTaskCompletedCount(t),0),totalExpected=tasks.reduce((n,t)=>n+homeTaskExpectedCount(t),0);
 const completedTasks=tasks.filter(t=>{const expected=homeTaskExpectedCount(t);return expected>0&&homeTaskCompletedCount(t)>=expected}).length;
 const rate=totalExpected?Math.min(100,Math.round(totalDone/totalExpected*100)):0;
 const rows=groups.map(g=>'<div class="mhdTaskPublishedGroup"><div class="mhdTaskGroupTitle"><span>'+homeEsc(g.label)+'</span><b>'+g.rows.length+'</b></div>'+g.rows.map(t=>{
  const done=homeTaskCompletedCount(t),expected=homeTaskExpectedCount(t),audience=homeTaskAssigneeLabel(t),finished=expected>0&&done>=expected;
  return '<div class="mhdTaskPublishedRow '+(finished?'done':'')+'"><span class="mhdTaskStatusDot '+(finished?'done':'')+'"></span><span class="mhdTaskPublishedCopy"><strong>'+homeEsc(t.title)+'</strong>'+(t.detail?'<small>'+homeEsc(t.detail)+'</small>':'')+'<em>'+homeEsc(audience)+'</em></span><span class="mhdTaskValidation">'+(finished?'✓ ':'')+done+'/'+expected+'</span><button type="button" class="mhdTaskDelete" aria-label="Supprimer la mission" title="Supprimer" onclick="homeDeleteDailyTask(\''+homeEsc(t.id)+'\',this)">×</button></div>'
 }).join('')+'</div>').join('');
 const openClass=tasks.length?' hidden':'';
 const teamLabel=afternoon.length?(afternoonNames.slice(0,4).join(' · ')+(afternoonNames.length>4?' +'+(afternoonNames.length-4):'')):'Aucune équipe détectée';
 return '<section class="mhdCard mhdSection mhdTasks editor"><div class="mhdTaskEditorTop"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('tasks')+'</span><div><strong>Passation après-midi</strong><small class="mhdTaskRoleHint">Missions laissées par l’équipe du matin</small></div></div><div class="mhdTaskHeaderActions">'+(tasks.length?'<button class="mhdTaskResetBtn" type="button" onclick="homeResetDailyTasks(this)">Vider</button>':'')+'<button class="mhdTaskAddBtn" type="button" onclick="homeToggleTaskComposer()">'+(tasks.length?'+ Ajouter':'Préparer')+'</button></div></div>'+
 '<div class="mhdTaskHandoff"><div class="mhdTaskHandoffRoute"><span>MATIN</span><i>→</i><span>APRÈS-MIDI</span></div><div class="mhdTaskHandoffTeam"><strong>'+afternoon.length+' personne'+(afternoon.length>1?'s':'')+' concernée'+(afternoon.length>1?'s':'')+'</strong><small>'+homeEsc(teamLabel)+' · selon le planning après 14h</small></div></div>'+
 (tasks.length?'<div class="mhdTaskOverview"><div><strong>'+tasks.length+'</strong><span>mission'+(tasks.length>1?'s':'')+'</span></div><div><strong>'+totalDone+'/'+totalExpected+'</strong><span>validations</span></div><div><strong>'+completedTasks+'/'+tasks.length+'</strong><span>terminée'+(tasks.length>1?'s':'')+'</span></div><div class="mhdTaskOverviewProgress"><i style="width:'+rate+'%"></i></div></div>':'')+
 '<div id="mhdTaskComposer" class="mhdTaskComposer'+openClass+'"><div class="mhdTaskComposerTitle"><div><strong>Préparer la passation</strong><small>Sélectionne plusieurs missions : elles seront envoyées en une seule fois.</small></div><span id="mhdTaskSelectedSummary">0 sélectionnée</span></div>'+homeTaskTemplateGroupsHtml()+
 '<div id="mhdFacingDetail" class="mhdFacingDetail hidden"><label class="mhdTaskFieldLabel" for="mhdFacingSecDetail">Facing sec · précision</label><input id="mhdFacingSecDetail" class="mhdTaskInput" maxlength="90" placeholder="Tous les rayons, ou préciser un rayon"></div>'+
 '<div class="mhdTaskComposerBottom"><div class="mhdCustomTask"><label class="mhdTaskFieldLabel" for="mhdCustomTaskTitle">Mission ponctuelle</label><input id="mhdCustomTaskTitle" class="mhdTaskInput" maxlength="160" placeholder="Ex. Ranger la réserve boissons" oninput="homeSyncTaskComposerSelection()"><small>Valable uniquement aujourd’hui.</small></div>'+homeTaskAudienceHtml()+'</div>'+
 '<div class="mhdTaskComposerActions"><span id="mhdTaskComposerState">'+(afternoon.length?'Visible uniquement par les destinataires sélectionnés.':'Renseigne d’abord le planning de l’après-midi pour pouvoir publier.')+'</span><button type="button" class="mhdTaskPublishBtn" onclick="homePublishDailyTasks(this)" '+(afternoon.length?'':'disabled')+'>Publier la passation</button></div></div>'+
 (taskError?'<div class="mhdTaskError">Impossible de charger la passation pour le moment.</div>':(rows||'<div class="mhdTaskEmptyState"><strong>Aucune passation envoyée</strong><span>Prépare les missions à transmettre à l’équipe d’après-midi.</span></div>'))+'</section>'
}
function homeRenderTaskUser(taskError){
 const uid=homeSession?.user?.id,tasks=homeTaskRows||[],doneSet=new Set(homeTaskCompletions.filter(x=>x.user_id===uid).map(x=>x.task_id)),done=tasks.filter(t=>doneSet.has(t.id)).length;
 const groups=homeTaskGroups(tasks);
 const rows=groups.map(g=>{const ordered=[...g.rows].sort((a,b)=>Number(doneSet.has(a.id))-Number(doneSet.has(b.id)));return '<div class="mhdTaskUserGroup"><div class="mhdTaskGroupTitle"><span>'+homeEsc(g.label)+'</span><b>'+ordered.length+'</b></div>'+ordered.map(t=>'<button type="button" class="mhdRow mhdTaskRow '+(doneSet.has(t.id)?'done':'')+'" data-task-id="'+homeEsc(t.id)+'" aria-pressed="'+(doneSet.has(t.id)?'true':'false')+'" onclick="homeToggleDailyTask(\''+homeEsc(t.id)+'\',this)"><span class="mhdTaskCheck"></span><span class="mhdRowCopy"><strong>'+homeEsc(t.title)+'</strong>'+(t.detail?'<small>'+homeEsc(t.detail)+'</small>':'')+'</span><span class="mhdTaskBadge">'+(doneSet.has(t.id)?'Fait':'À faire')+'</span></button>').join('')+'</div>'}).join('');
 const finished=tasks.length>0&&done===tasks.length;
 return '<section class="mhdCard mhdSection mhdTasks"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('tasks')+'</span><div><strong>Passation · après-midi</strong><small class="mhdTaskRoleHint">Missions transmises par l’équipe du matin</small></div></div><span class="mhdTaskUserProgress '+(finished?'done':'')+'">'+(finished?'✓ Terminé':done+'/'+tasks.length)+'</span></div>'+(finished?'<div class="mhdTaskSuccess"><strong>Passation terminée</strong><span>Toutes tes missions ont été validées.</span></div>':'')+(taskError?'<div class="mhdTaskError">Impossible de charger tes missions pour le moment.</div>':(rows||'<div class="mhdTaskEmptyState"><strong>Rien à reprendre</strong><span>Aucune mission ne t’est affectée pour cet après-midi.</span></div>'))+'</section>'
}
function homeRenderDailyTasks(profile,taskError){
 const mode=homeTaskMode(profile?.role);
 if(mode==='editor')return homeRenderTaskEditor(taskError);
 if(mode==='user')return homeRenderTaskUser(taskError);
 return''
}
function homeToggleTaskComposer(){
 const box=document.getElementById('mhdTaskComposer');if(!box)return;
 box.classList.toggle('hidden');if(!box.classList.contains('hidden')){homeSyncTaskComposerSelection();setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),30)}
}
function homeToggleTaskGroup(btn){
 const group=btn?.closest('[data-task-group]'),grid=group?.querySelector('.mhdTaskTemplateGrid');if(!grid)return;
 const open=grid.classList.toggle('hidden')===false;btn.setAttribute('aria-expanded',String(open))
}
function homeSyncTaskComposerSelection(){
 const box=document.getElementById('mhdTaskComposer');if(!box)return;
 const selected=[...box.querySelectorAll('[data-task-template].selected')],custom=String(document.getElementById('mhdCustomTaskTitle')?.value||'').trim();
 box.querySelectorAll('[data-task-group]').forEach(group=>{
  const count=group.querySelectorAll('[data-task-template].selected').length,badge=group.querySelector('[data-task-group-count]');
  if(badge){badge.textContent=String(count);badge.classList.toggle('active',count>0)}
 });
 const count=selected.length+(custom?1:0),summary=document.getElementById('mhdTaskSelectedSummary');
 if(summary){summary.textContent=count+' sélectionnée'+(count>1?'s':'');summary.classList.toggle('active',count>0)}
}
function homeToggleTaskTemplate(btn){
 btn?.classList.toggle('selected');
 const facing=document.querySelector('[data-task-template="facing_sec"]')?.classList.contains('selected');
 document.getElementById('mhdFacingDetail')?.classList.toggle('hidden',!facing);
 homeSyncTaskComposerSelection()
}
function homeToggleTaskAudienceUser(btn){
 const box=btn?.closest('.mhdTaskComposer');if(!box)return;
 btn.classList.toggle('selected');
 btn.setAttribute('aria-pressed',String(btn.classList.contains('selected')));
 const count=box.querySelectorAll('[data-task-user].selected').length,state=document.getElementById('mhdTaskComposerState'),publish=box.querySelector('.mhdTaskPublishBtn');
 if(publish)publish.disabled=count===0;
 if(state)state.textContent=count?count+' destinataire'+(count>1?'s':'')+' sélectionné'+(count>1?'s':'')+'.':'Sélectionne au moins une personne de l’équipe d’après-midi.'
}

function homeTaskPair(rows,keyA,keyB,title){
 const a=rows.find(x=>x.catalog_key===keyA),b=rows.find(x=>x.catalog_key===keyB);if(!a||!b)return rows;
 const merged={...a,id:undefined,catalog_key:null,source_keys:[keyA,keyB],title,sort_order:Math.min(Number(a.sort_order)||100,Number(b.sort_order)||100)};
 return rows.filter(x=>x!==a&&x!==b).concat(merged)
}
async function homeRefreshDashboard(){
 if(!homeDashboardProfile)return;
 await renderMobileHomeDashboard(homeDashboardProfile,homeDashboardName,homeDashboardConfig)
}
async function homePublishDailyTasks(btn){
 if(homeTaskBusy||!homeSession)return;
 const box=document.getElementById('mhdTaskComposer'),state=document.getElementById('mhdTaskComposerState');if(!box)return;
 const keys=[...box.querySelectorAll('[data-task-template].selected:not(:disabled)')].map(x=>x.dataset.taskTemplate),custom=String(document.getElementById('mhdCustomTaskTitle')?.value||'').trim();
 if(!keys.length&&!custom){if(state)state.textContent='Sélectionne au moins une mission ou ajoute une mission ponctuelle.';return}
 const selectedUsers=[...box.querySelectorAll('[data-task-user].selected')].map(x=>x.dataset.taskUser).filter(id=>homeTaskAfternoonUserIds.includes(id));
 if(!selectedUsers.length){if(state)state.textContent='Sélectionne au moins une personne de l’équipe d’après-midi.';return}
 const byKey=new Map(homeTaskCatalog.map(x=>[x.key,x])),today=homeParisDateKey(),uid=homeSession.user.id;
 let rows=keys.map(k=>byKey.get(k)).filter(Boolean).map(t=>({task_date:today,catalog_key:t.key,source_keys:[t.key],title:t.title,section_key:t.section_key,section_label:t.section_label,detail:t.key==='facing_sec'?(String(document.getElementById('mhdFacingSecDetail')?.value||'').trim()||'Tous'):null,all_users:false,sort_order:Number(t.sort_order)||100,created_by:uid}));
 rows=homeTaskPair(rows,'livraison_gel','stock_gel','Livraison + Stock gel');
 rows=homeTaskPair(rows,'livraison_sec','stock_sec','Livraison + Stock sec');
 if(custom)rows.push({task_date:today,catalog_key:null,source_keys:[],title:custom,section_key:'autre',section_label:'Autre',detail:null,all_users:false,sort_order:900,created_by:uid});
 rows=rows.sort((a,b)=>a.sort_order-b.sort_order);
 homeTaskBusy=true;if(btn)btn.disabled=true;if(state)state.textContent='Publication de la passation…';
 try{
  const inserted=await db.from('daily_tasks').insert(rows).select('id');
  if(inserted.error)throw inserted.error;
  const ids=(inserted.data||[]).map(x=>x.id);
  if(ids.length){
   const assignments=ids.flatMap(task_id=>selectedUsers.map(user_id=>({task_id,user_id})));
   const assigned=await db.from('daily_task_assignees').insert(assignments);
   if(assigned.error){await db.from('daily_tasks').delete().in('id',ids);throw assigned.error}
  }
  window.NettoSounds?.play?.('success');await homeRefreshDashboard()
 }catch(e){console.error('Passation du jour:',e);if(state)state.textContent='Publication impossible : '+(e?.message||'erreur');window.NettoSounds?.play?.('error')}
 finally{homeTaskBusy=false;if(btn)btn.disabled=false}
}

async function homeDeleteDailyTask(id,btn){
 if(homeTaskBusy||!id)return;if(!confirm('Supprimer cette tâche de la journée ?'))return;
 homeTaskBusy=true;if(btn)btn.disabled=true;
 const {error}=await db.from('daily_tasks').delete().eq('id',id);
 homeTaskBusy=false;if(error){window.NettoSounds?.play?.('error');alert('Suppression impossible : '+error.message);if(btn)btn.disabled=false;return}
 window.NettoSounds?.play?.('delete');await homeRefreshDashboard()
}
async function homeResetDailyTasks(btn){
 if(homeTaskBusy||!homeSession||!homeTaskRows.length)return;
 if(!confirm('Réinitialiser toutes les tâches du jour ?\n\nLes missions, affectations et validations d’aujourd’hui seront supprimées.'))return;
 homeTaskBusy=true;if(btn)btn.disabled=true;
 const today=homeParisDateKey(),{error}=await db.from('daily_tasks').delete().eq('task_date',today);
 homeTaskBusy=false;
 if(error){window.NettoSounds?.play?.('error');alert('Réinitialisation impossible : '+error.message);if(btn)btn.disabled=false;return}
 window.NettoSounds?.play?.('delete');await homeRefreshDashboard()
}
async function homeToggleDailyTask(id,btn){
 if(homeTaskBusy||!homeSession||!id)return;
 homeTaskBusy=true;if(btn)btn.disabled=true;
 const uid=homeSession.user.id,done=homeTaskCompletions.some(x=>x.task_id===id&&x.user_id===uid);
 const res=done?await db.from('daily_task_completions').delete().eq('task_id',id).eq('user_id',uid):await db.from('daily_task_completions').insert({task_id:id,user_id:uid});
 homeTaskBusy=false;
 if(res.error){console.error('Validation tâche:',res.error);window.NettoSounds?.play?.('error');if(btn)btn.disabled=false;return}
 window.NettoSounds?.play?.('success');await homeRefreshDashboard()
}
function homeNotifIcon(kind){return kind==='manual_edit'||kind==='import_new'||kind==='import_replace'?'▦':kind==='admin_message'?'!':kind==='maintenance'?'⚒':kind==='app_update'?'↑':'•'}
function homeSince(d){
 if(!d)return'';const ms=Date.now()-new Date(d).getTime(),m=Math.max(0,Math.floor(ms/60000));
 if(m<1)return'à l’instant';if(m<60)return'il y a '+m+' min';const h=Math.floor(m/60);if(h<24)return'il y a '+h+' h';return'il y a '+Math.floor(h/24)+' j'
}
function homeAllowedModules(profile,cfg){
 const nav=window.NettoProfileUI,mods=(nav?.modules||[]).filter(m=>!['home','profile','settings','accounts','portal_admin'].includes(m.id));
 return mods.filter(m=>nav?.canAccess?nav.canAccess(m,profile,cfg):true)
   .sort((a,b)=>Number(cfg?.pages?.[a.id]?.order||a.order||99)-Number(cfg?.pages?.[b.id]?.order||b.order||99))
}
function homeSuggestedTasks(profile,cfg){
 const allowed=new Set(homeAllowedModules(profile,cfg).map(m=>m.id)),out=[];
 if(allowed.has('planning'))out.push({id:'planning',title:'Consulter mon planning',tag:'Planning'});
 if(allowed.has('stock'))out.push({id:'stock',title:'Vérifier le stock Fruits & Légumes',tag:'Stock'});
 if(allowed.has('chat'))out.push({id:'chat',title:'Consulter les messages d’équipe',tag:'Équipe'});
 if(allowed.has('articles'))out.push({id:'articles',title:'Consulter les fiches articles utiles',tag:'Journée'});
 if(!out.length)out.push({id:'notifications',title:'Vérifier mes informations Nethor',tag:'Journée'});
 return out.slice(0,4)
}
async function renderHomeDashboard(profile,name,cfg){
 const host=$('homeDashboard');if(!host)return;
 host.innerHTML='<div class="mhdCard mhdSection"><div class="mhdEmpty">Chargement de ton espace de travail…</div></div>';
 const today=new Date(),todayKey=homeParisDateKey(today),weekStart=homeIsoDate(homeStartOfWeek(today)),weekEnd=homeIsoDate(homeAddDays(homeStartOfWeek(today),84));
 homeDashboardProfile=profile;homeDashboardName=name;homeDashboardConfig=cfg||{};
 const [subRes,weeksRes,notifRes,profilesRes,taskCatalogRes,taskRowsRes]=await Promise.all([
  Promise.resolve(db.rpc('my_subrole_keys')).catch(()=>({data:[]})),
  db.from('planning_weeks').select('week_start,data').gte('week_start',weekStart).lte('week_start',weekEnd).order('week_start'),
  db.from('planning_notifications').select('id,kind,title,message,target_url,created_at,read_at').eq('user_id',homeSession.user.id).order('created_at',{ascending:false}).limit(6),
  db.rpc('list_team_members'),
  db.from('daily_task_catalog').select('key,section_key,section_label,title,sort_order').eq('active',true).order('sort_order'),
  db.from('daily_tasks').select('id,task_date,catalog_key,source_keys,title,section_key,section_label,detail,all_users,sort_order,created_by,created_at').eq('task_date',todayKey).order('sort_order').order('created_at')
 ]);
 const subroleKeys=(subRes?.data||[]).map(x=>x.subrole_key).filter(Boolean),weeks=(weeksRes.data||[]).map(x=>x.data).filter(Boolean);
 const widget=id=>homeWidgetVisible(cfg,id,profile,subroleKeys);
 homeTaskCatalog=taskCatalogRes.error?[]:(taskCatalogRes.data||[]);
 homeTaskRows=taskRowsRes.error?[]:(taskRowsRes.data||[]);
 homeTaskTeam=profilesRes.error?[]:(profilesRes.data||[]);
 homeTaskAssignees=[];homeTaskCompletions=[];
 if(widget('tasks')&&homeTaskRows.length){
  const ids=homeTaskRows.map(x=>x.id),[aRes,cRes]=await Promise.all([
   db.from('daily_task_assignees').select('task_id,user_id').in('task_id',ids),
   db.from('daily_task_completions').select('task_id,user_id,completed_at').in('task_id',ids)
  ]);
  homeTaskAssignees=aRes.error?[]:(aRes.data||[]);homeTaskCompletions=cRes.error?[]:(cRes.data||[])
 }
 const taskLoadError=!!(taskCatalogRes.error||taskRowsRes.error);
 const currentWeek=weeks.find(w=>String(w.weekStart||w.week_start||'')===weekStart)||weeks[0]||null;
 const allDays=[];
 for(const model of weeks)for(const dateKey of Object.keys(model?.days||{}))if(dateKey>=todayKey)allDays.push({dateKey,model});
 allDays.sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
 let nextShift=null;
 const nowHour=today.getHours()+today.getMinutes()/60;
 for(const x of allDays){
  const d=homeDayHours(x.model,x.dateKey,name);
  if(d.hours<=0)continue;
  if(x.dateKey===todayKey&&d.ranges.length&&d.ranges.every(r=>r.b<=nowHour))continue;
  nextShift={...x,...d};break
 }
 const currentHours=currentWeek?Object.keys(currentWeek.days||{}).reduce((sum,dateKey)=>sum+homeDayFacts(currentWeek,dateKey,name).hours,0):0;
 let nextRest=null,nextLeave=null;
 for(const x of allDays.filter(x=>x.dateKey>todayKey)){const d=homeDayFacts(x.model,x.dateKey,name);if(d.idx>=0&&d.isRest){nextRest=x.dateKey;break}}
 const firstLeaveIndex=allDays.findIndex(x=>homeDayFacts(x.model,x.dateKey,name).isLeave);
 if(firstLeaveIndex>=0){
  const first=allDays[firstLeaveIndex];let end=first.dateKey;
  for(let i=firstLeaveIndex+1;i<allDays.length;i++){
   const prev=homeParseDate(end),expected=homeIsoDate(homeAddDays(prev,1)),x=allDays[i];
   if(x.dateKey!==expected||!homeDayFacts(x.model,x.dateKey,name).isLeave)break;
   end=x.dateKey
  }
  nextLeave={start:first.dateKey,end}
 }
 const notifications=notifRes.error?[]:(notifRes.data||[]);
 const profileRows=homeTaskTeam;
 const todayModel=weeks.find(w=>w?.days?.[todayKey])||currentWeek;
 const todayTeam=[];
 const workingNames=[],afternoonNames=[];
 if(todayModel?.days?.[todayKey]){
  (todayModel.employees||[]).forEach((e,i)=>{
   const row=todayModel.days[todayKey].cells?.[i]||[],ranges=homeWorkRanges(row,todayModel||{});
   if(row.some(v=>v==='g'||v==='b'))workingNames.push(e.name);
   if(ranges.some(r=>r.b>14))afternoonNames.push(e.name)
  })
 }
 for(const n of workingNames){
  const p=profileRows.find(x=>homeNorm(x.display_name)===homeNorm(n));todayTeam.push({name:n,profile:p||null})
 }
 homeTaskAfternoonUserIds=[...new Set(afternoonNames.map(n=>{
  const target=homeNorm(n),base=target.replace(/\s+[a-z]$/,'');
  return profileRows.find(x=>{const p=homeNorm(x.display_name),pb=p.replace(/\s+[a-z]$/,'');return p===target||pb===target||p===base||pb===base})?.id
 }).filter(Boolean))];
 const roleLabel=window.NettoProfileUI?.roleLabel?.(profile.role)||profile.role||'Compte';
 const dateLabel=today.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).replace('.','');
 const sections=[];
 if(homeIsMobilePlatform()&&widget('welcome'))sections.push('<section class="mhdHero mhdWelcome"><div class="mhdHeroTop"><span class="mhdPill"><i></i> ESPACE DE TRAVAIL</span><span class="mhdPill mhdDatePill">▣ '+homeEsc(dateLabel)+'</span></div><h1>Bonjour '+homeEsc(name||roleLabel)+' 👋</h1><p>Voici tes informations utiles pour aujourd’hui.</p></section>');
 if(widget('next_shift')){
  const shiftText=nextShift?.ranges?.length?nextShift.ranges.map(r=>homeClock(r.a)+' - '+homeClock(r.b)).join(' • '):'Aucune prise de poste à venir',when=nextShift?homeDateLabel(nextShift.dateKey,todayKey):'—',target=nextShift?'planning.html?week='+encodeURIComponent(homeIsoDate(homeStartOfWeek(homeParseDate(nextShift.dateKey))))+'&day='+encodeURIComponent(nextShift.dateKey):'planning.html';
  sections.push('<button class="mhdCard mhdNext" type="button" onclick="location.href=\''+homeEsc(target)+'\'"><div class="mhdNextHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('next_shift')+'</span><strong>Prise de poste</strong></div><span class="mhdWhen">'+homeEsc(when)+'</span></div><div class="mhdShiftLine"><b>'+homeEsc(shiftText)+'</b><span class="mhdChevron">›</span></div><div class="mhdShiftMeta"><span class="mhdTag green">Planning personnel</span>'+(nextShift?.hours?'<span class="mhdTag amber">'+homeEsc(String(nextShift.hours).replace('.',','))+' h</span>':'')+'</div></button>')
 }
 const stats=[];
 if(widget('hours'))stats.push('<button class="mhdStat" type="button" onclick="location.href=\'planning.html\'"><div class="mhdStatHead"><span class="mhdMiniIcon">'+homeStatIcon('hours')+'</span>Mes heures</div><strong>'+homeEsc(String(currentHours).replace('.',','))+' h</strong><small>planifiées cette semaine</small><div class="mhdProgress"><i style="width:'+Math.min(100,Math.round(currentHours/35*100))+'%"></i></div></button>');
 if(widget('absences')){
  const leaveStart=nextLeave?.start||'',leaveEnd=nextLeave?.end||'',leaveOngoing=!!leaveStart&&leaveStart<=todayKey&&todayKey<=leaveEnd,leaveFocusDate=leaveOngoing?todayKey:leaveStart,leaveTarget=leaveFocusDate?'planning.html?week='+encodeURIComponent(homeIsoDate(homeStartOfWeek(homeParseDate(leaveFocusDate))))+'&day='+encodeURIComponent(leaveFocusDate)+'&focus=leave':'planning.html';
  const short=k=>homeParseDate(k).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),daysUntil=leaveStart?Math.max(0,homeDateDiffDays(todayKey,leaveStart)):0;
  let leaveMain='Aucun',leaveSub='aucun congé planifié';
  if(leaveOngoing){
   leaveMain='<span class="mhdValueBlue">Congé</span>'+(nextShift?.dateKey?' jusqu’au '+homeEsc(short(nextShift.dateKey)):'');
   leaveSub=nextShift?.dateKey?'prochaine prise de poste':'En cours'
  }else if(leaveStart){
   leaveMain='<span class="mhdValueBlue">Dans '+daysUntil+' jour'+(daysUntil>1?'s':'')+'</span>';
   leaveSub=leaveStart===leaveEnd?'Congé le '+short(leaveStart):'Congé du '+short(leaveStart)+' au '+short(leaveEnd)
  }
  stats.push('<button class="mhdStat mhdStatLeave" type="button" onclick="location.href=\''+homeEsc(leaveTarget)+'\'"><div class="mhdStatHead"><span class="mhdMiniIcon">'+homeStatIcon('absences')+'</span>Congés</div><strong>'+leaveMain+'</strong><small>'+homeEsc(leaveSub)+'</small></button>')
 }
 if(widget('next_rest')){const restTarget=nextRest?'planning.html?week='+encodeURIComponent(homeIsoDate(homeStartOfWeek(homeParseDate(nextRest))))+'&day='+encodeURIComponent(nextRest)+'&focus=rest':'planning.html';stats.push('<button class="mhdStat" type="button" onclick="location.href=\''+homeEsc(restTarget)+'\'"><div class="mhdStatHead"><span class="mhdMiniIcon">'+homeStatIcon('next_rest')+'</span>Prochain repos</div><strong>'+(nextRest?homeEsc(homeParseDate(nextRest).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','')):'—')+'</strong><small>'+(nextRest?'Jour de repos':'non déterminé')+'</small></button>')}
 if(stats.length)sections.push('<section class="mhdStats">'+stats.join('')+'</section>');
 if(widget('tasks'))sections.push(homeRenderDailyTasks(profile,taskLoadError));
 if(widget('important_info')){
  const infos=notifications.filter(n=>['manual_edit','import_new','import_replace','admin_message','maintenance','app_update','absence_decision'].includes(n.kind)).slice(0,2);
  sections.push('<section class="mhdCard mhdSection mhdImportant"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('important_info')+'</span><strong>Informations importantes</strong></div><button class="mhdSectionLink" type="button" onclick="location.href=\'notifications.html\'">Voir toutes ›</button></div>'+(infos.length?infos.map((n,i)=>'<button type="button" class="mhdInfoRow '+(i?'orange':'')+'" onclick="location.href=\''+homeEsc(n.target_url||'notifications.html')+'\'"><span class="mhdInfoIcon">'+homeEsc(homeNotifIcon(n.kind))+'</span><span class="mhdInfoCopy"><strong>'+homeEsc(n.title||'Information Nethor')+'</strong><small>'+homeEsc(n.message||'')+'</small></span><time>'+homeEsc(homeSince(n.created_at))+'</time></button>').join(''):'<div class="mhdEmpty">Aucune information importante pour le moment.</div>')+'</section>')
 }
 if(widget('team_today')){
  const shown=todayTeam.slice(0,3),extra=Math.max(0,todayTeam.length-shown.length);
  const teamPlanningTarget='planning.html?week='+encodeURIComponent(weekStart)+'&day='+encodeURIComponent(todayKey);
  sections.push('<section class="mhdCard mhdSection mhdTeamSection'+(homeTaskMode(profile?.role)==='editor'?' editorCompanion':'')+'"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('team_today')+'</span><strong class="mhdTeamHeading">'+(homeIsMobilePlatform()?'Équipe aujourd’hui':'Équipe<br>du jour')+'</strong></div><button class="mhdSectionLink" type="button" onclick="location.href=\''+homeEsc(teamPlanningTarget)+'\'">Voir le planning ›</button></div>'+(shown.length?'<div class="mhdTeam">'+shown.map((x,i)=>'<div class="mhdPerson"><span id="mhdAvatar'+i+'" class="mhdAvatar">'+homeEsc((x.name||'U').slice(0,1).toUpperCase())+'</span>'+(x.profile&&window.NettoProfileUI?.onlineIds?.has?.(x.profile.id)?'<i class="mhdOnline"></i>':'')+'<strong>'+homeEsc(x.name)+'</strong><small>'+homeEsc(x.profile?window.NettoProfileUI?.roleLabel?.(x.profile.role)||x.profile.role:'Équipe')+'</small></div>').join('')+(extra?'<span class="mhdMorePeople">+'+extra+'</span>':'')+'</div>':'<div class="mhdEmpty">Aucun membre planifié aujourd’hui.</div>')+'</section>');
 }
 if(homeIsMobilePlatform()&&widget('quick_access')){
  const modules=homeAllowedModules(profile,cfg).slice(0,4);
  if(modules.length)sections.push('<section class="mhdCard mhdSection mhdQuickSection"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+homeDashboardIcon('quick_access')+'</span><strong>Accès rapides</strong></div></div><div class="mhdQuickGrid">'+modules.map(m=>'<button class="mhdQuick" type="button" onclick="location.href=\''+homeEsc(m.url||m.baseUrl||'home.html')+'\'"><span class="mhdQuickIcon">'+(window.NettoProfileUI?.mobileNavIcon?.(m.id)||'')+'</span><strong>'+homeEsc(m.homeLabel||m.label||m.id)+'</strong></button>').join('')+'</div></section>')
 }
 host.innerHTML='<div class="mhdStack">'+sections.join('')+'</div>';
 const todaySelf=todayModel?homeDayFacts(todayModel,todayKey,name):{hours:0,ranges:[]};
 await window.NethorOperationsWidget?.mount?.({
  host,db,session:homeSession,profile,config:cfg||{},subroleKeys,todayKey,
  service:{hours:todaySelf.hours,ranges:todaySelf.ranges,weekHours:currentHours,nextShift},
  tasks:{rows:homeTaskRows,assignees:homeTaskAssignees,completions:homeTaskCompletions,team:homeTaskTeam}
 });
 // Paint team avatars after the final DOM exists.
 if(widget('team_today')){
  const shown=todayTeam.slice(0,3);
  for(let i=0;i<shown.length;i++){
   const p=shown[i].profile;if(!p)continue;let url=null;
   if(p.avatar_path){try{const {data}=await db.storage.from('profile-avatars').createSignedUrl(p.avatar_path,3600);url=data?.signedUrl||null}catch(_){}}
   window.NettoProfileUI?.paintAvatar?.(document.getElementById('mhdAvatar'+i),url,p.display_name,p.profile_color,p.avatar_frame)
  }
 }
}
function homeAfterFirstPaint(task){
 const run=()=>{try{const result=task();if(result?.catch)result.catch(()=>{})}catch(_){}};
 requestAnimationFrame(()=>requestAnimationFrame(()=>{'requestIdleCallback' in window?requestIdleCallback(run,{timeout:700}):setTimeout(run,40)}))
}
async function boot(){
 const {data:{session}}=await db.auth.getSession();if(!session){location.replace('index.html');return}
 homeSession=session;
 const {data:p}=await db.from('profiles').select('display_name,email,role,avatar_path,profile_color,avatar_frame,ui_preferences').eq('id',session.user.id).maybeSingle();
 window.currentRole=p?.role;
 document.querySelectorAll('.adminOnlyMenu').forEach(x=>x.classList.toggle('hidden',window.currentRole!=='admin'));
 const name=p?.display_name||p?.email?.split('@')[0]||'';
 const roleNames={admin:'Administrateur',responsable:'Responsable',lecture:'Lecture seule',employe:'Employé'},role=window.NettoProfileUI?.roleLabel?.(p?.role)||roleNames[p?.role]||p?.role||'Compte';
 const helloTitle=document.getElementById('helloTitle');if(helloTitle)helloTitle.textContent=name?'Bonjour '+name+' 👋':'Bonjour 👋';
 const paint=avatarUrl=>['userAvatar','userMenuAvatar'].forEach(id=>{const e=document.getElementById(id);if(!e)return;if(window.NettoProfileUI?.paintAvatar)window.NettoProfileUI.paintAvatar(e,avatarUrl,name,p?.profile_color,p?.avatar_frame);else{e.style.background=p?.profile_color||'#ff5a2a';e.textContent=(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');if(avatarUrl){e.classList.add('hasPhoto');e.style.backgroundImage='url("'+avatarUrl.replace(/"/g,'%22')+'")';e.textContent=''}}});
 paint(null);
 if(p?.avatar_path)homeAfterFirstPaint(async()=>{const {data:av}=await db.storage.from('profile-avatars').createSignedUrl(p.avatar_path,3600);if(av?.signedUrl)paint(av.signedUrl)});
 ['userName','userMenuName'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name||'Utilisateur'});
 ['userRole','userMenuRole'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=role});
 await window.NettoProfileUI?.refresh?.();
 const sharedConfig=await loadSharedSiteConfig();
 window.NettoProfileUI?.rebuildModules?.(sharedConfig||{});
 renderHomeCards(p,sharedConfig);
 if(p?.role==='admin'&&homePlatformKind()==='desktop')homeAfterFirstPaint(loadAdminPageViews);
 await loadHomeTodayPlanning(p,name);
 await renderHomeDashboard(p,name,sharedConfig||{});
 const status=document.getElementById('status');if(status)status.textContent='Session active'
}
function homeEsc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderHomeCards(profile,cfg){
 const host=document.getElementById('homePages'),nav=window.NettoProfileUI;if(!host)return;
 const modules=nav?.visibleModules?nav.visibleModules('home',profile,cfg):[];
 if(!modules.length){host.innerHTML='<div class="homeEmpty"><strong>Ton accueil est vide</strong><span>Tu peux réactiver les outils auxquels tu as accès depuis Personnalisation.</span><br><button type="button" onclick="location.href=\'settings.html\'">Personnaliser mon accueil</button></div>';return}
 const items=modules.map((m,index)=>{const shared=cfg?.pages?.[m.id]||{},configured=String(shared.url||'').trim(),url=configured&&configured!==String(m.baseUrl||m.url||'').trim()?configured:(m.homeUrl||configured||m.url),order=Number(shared.order||m.order);return{m,index,url,order:Number.isFinite(order)&&order>0?order:100+index,label:m.homeLabel||m.label,description:m.description||m.subtitle||''}}).sort((a,b)=>a.order-b.order||a.index-b.index);
 const admin=profile?.role==='admin';
 host.innerHTML=items.map(({m,url,label,description})=>{const icon=m.asset?'<img src="'+homeEsc(m.asset)+'" alt="">':homeEsc(m.icon||'•'),color=/^#[0-9a-f]{6}$/i.test(m.menuColor||'')?m.menuColor:'#ff2f1f',accent=/^#[0-9a-f]{6}$/i.test(m.menuAccent||'')?m.menuAccent:'#ff8500',style='--menu-color:'+color+';--menu-accent:'+accent+';',key=homePageKey(url),card='<button class="pageCard portalThemeCard '+homeEsc(m.cardClass||'')+'" style="'+style+'" data-home-url="'+homeEsc(url)+'"><div class="cardTop"><div class="icon">'+icon+'</div><span class="cardKicker">'+homeEsc(m.kicker||'OUTIL')+'</span></div><div class="cardContent"><h2>'+homeEsc(label)+'</h2><p>'+homeEsc(description)+'</p></div><div class="cardFoot"><span>'+homeEsc(m.action||'Ouvrir')+'</span><span class="arrow">→</span></div></button>';return admin?'<div class="pageCardShell">'+card+'<button class="adminViewStat" data-view-key="'+homeEsc(key)+'" data-view-label="'+homeEsc(label)+'" aria-label="Voir les consultations"><span class="eye">👁</span><b>0</b></button></div>':card}).join('');
 host.querySelectorAll('[data-home-url]').forEach(el=>el.onclick=()=>location.href=el.dataset.homeUrl);
 host.querySelectorAll('.adminViewStat[data-view-key]').forEach(el=>el.onclick=e=>openPageViews(el.dataset.viewKey,el.dataset.viewLabel||'Page',e));
}
async function logout(){logoutSound();await new Promise(r=>setTimeout(r,380));await db.auth.signOut({scope:'local'});location.replace('index.html')} async function menuLogout(){await logout()}
boot();

async function loadSharedSiteConfig(){
 try{
  if(!db)return null;
  const {data}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
  const cfg=data?.value;if(!cfg)return null;
  applySharedSiteConfig(cfg);return cfg;
 }catch(e){console.warn('Réglages du site:',e);return null}
}
function setMenuEntry(urlKey,cfg){
 const n=cfg?.nav?.[urlKey];if(!n)return;
 const defaults={home:'home.html',stock:'index.html',planning:'planning.html',chat:'chat.html'};
 const old=defaults[urlKey];
 document.querySelectorAll('#nMenu button,#brandMenu button').forEach(b=>{
  const oc=b.getAttribute('onclick')||'';
  if(!oc.includes("'"+old+"'")&&!oc.includes('"'+old+'"'))return;
  const icon=b.querySelector(':scope > span'),strong=b.querySelector('strong'),small=b.querySelector('small');
  if(icon)icon.textContent=n.icon||icon.textContent;if(strong)strong.textContent=n.label||strong.textContent;if(small)small.textContent=n.subtitle||'';
  const target=String(n.url||old).replace(/['"<>]/g,'');b.onclick=()=>location.href=target;
 });
}

function applySharedSiteConfig(cfg){
 ['home','stock','planning','chat','test'].forEach(k=>setMenuEntry(k,cfg));
 const brand=cfg?.brand;if(brand){const b=document.querySelector('.brand>div:last-child strong'),s=document.querySelector('.brand>div:last-child small');if(b&&brand.name)b.textContent=brand.name;if(s&&brand.subtitle)s.textContent=brand.subtitle}
 const eyebrow=document.querySelector('.eyebrow');if(eyebrow&&cfg?.home?.eyebrow)eyebrow.textContent=cfg.home.eyebrow;const intro=document.querySelector('.hello p');if(intro&&cfg?.home?.intro)intro.textContent=cfg.home.intro;
 const map={stock:document.querySelector('.pageCard.stock'),planning:document.querySelector('.pageCard.planning'),chat:document.querySelector('.pageCard.chatCard')};
 const logoByTool={stock:'assets/logo-stock.svg',planning:'assets/logo-planning.svg',chat:'assets/logo-chat.svg'};
 Object.entries(map).forEach(([k,el])=>{const p=cfg?.pages?.[k];if(!el||!p)return;el.classList.toggle('hidden',p.visible===false);el.style.order=Number(p.order||1);const ic=el.querySelector('.icon'),h2=el.querySelector('h2'),d=el.querySelector('p');if(ic){let img=ic.querySelector('img');if(!img){ic.textContent='';img=document.createElement('img');img.alt='';ic.appendChild(img)}img.src=logoByTool[k]}if(h2)h2.textContent=p.label||'';if(d)d.textContent=p.description||'';const target=String(p.url||'').replace(/['"<>]/g,'');el.onclick=()=>location.href=target});
 document.querySelectorAll('.settingsLink').forEach(x=>x.classList.remove('hidden'));
}


function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function applyTheme(theme){theme=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('nettoTheme',theme)}catch(e){}document.querySelectorAll('.themeIcon').forEach(x=>x.textContent=theme==='dark'?'☀':'☾');document.querySelectorAll('.themeLabel').forEach(x=>x.textContent=theme==='dark'?'Mode clair':'Mode sombre');document.querySelectorAll('.themeSub').forEach(x=>x.textContent=theme==='dark'?'Revenir au thème clair':'Passer au thème sombre');const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=theme==='dark'?'#111214':'#f4f4f6'}
function toggleTheme(e){e?.stopPropagation();applyTheme(currentTheme()==='dark'?'light':'dark')}
document.addEventListener('DOMContentLoaded',()=>applyTheme(currentTheme()));

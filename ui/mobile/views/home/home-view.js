(function(){
'use strict';

const MODULES=Object.freeze([
 {id:'stock',label:'Stock F&L',url:'index.html',roles:null,order:10},
 {id:'planning',label:'Planning',url:'planning.html',roles:null,order:20},
 {id:'chat',label:'Chat',url:'chat.html',roles:null,order:30},
 {id:'scanner',label:'Scanner',url:'scanner.html',roles:null,order:40},
 {id:'articles',label:'Fiches articles',url:'articles.html',roles:null,order:50},
 {id:'notifications',label:'Notifications',url:'notifications.html',roles:null,order:60},
 {id:'fl_assistant',label:'Assistant Précommande',url:'fl-assistant.html',roles:['admin','responsable'],order:70},
 {id:'bakery',label:'Boulangerie',url:'bakery.html',roles:['admin'],order:80},
 {id:'rewards',label:'Défis & Boutique',url:'rewards.html',roles:['admin'],order:90},
 {id:'accounts',label:'Gestion des comptes',url:'accounts.html',roles:['admin'],order:100},
 {id:'portal_admin',label:'Gestion',url:'admin-portal.html',roles:['admin'],order:110}
]);
const LEVELS=Object.freeze({none:0,view:1,operate:2,manage:3});
const IMPORTANT_KINDS=new Set(['manual_edit','import_new','import_replace','admin_message','maintenance','app_update','absence_decision']);

const state={
 host:null,
 dashboard:null,
 mounted:false,
 renderToken:0,
 unsubscribe:null,
 channels:[],
 unsubscribeSync:null,
 refreshTimer:null,
 busy:false,
 profile:null,
 config:{},
 session:null,
 db:null,
 name:'',
 todayKey:'',
 weeks:[],
 team:[],
 taskCatalog:[],
 tasks:[],
 assignees:[],
 completions:[],
 afternoonUserIds:[],
 preloaded:null,
 preloadPromise:null
};

function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function norm(value){return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function addDays(date,days){const x=new Date(date);x.setDate(x.getDate()+days);return x}
function startOfWeek(date){const x=new Date(date),n=(x.getDay()+6)%7;x.setHours(0,0,0,0);x.setDate(x.getDate()-n);return x}
function isoDate(date){const x=new Date(date);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function parseDate(value){const [y,m,d]=String(value||'').split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1)}
function dateDiffDays(fromKey,toKey){
 const [fy,fm,fd]=String(fromKey||'').split('-').map(Number),[ty,tm,td]=String(toKey||'').split('-').map(Number);
 if(!fy||!fm||!fd||!ty||!tm||!td)return 0;
 return Math.round((Date.UTC(ty,tm-1,td)-Date.UTC(fy,fm-1,fd))/86400000)
}
function parisDateKey(date=new Date()){
 try{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),o={};
  parts.forEach(p=>{if(p.type!=='literal')o[p.type]=p.value});
  return o.year+'-'+o.month+'-'+o.day
 }catch(_){return isoDate(date)}
}
function clock(value){const h=Math.floor(value),m=Math.round((value-h)*60);return String(h).padStart(2,'0')+'h'+String(m).padStart(2,'0')}
function dateLabel(dateKey,todayKey){
 if(dateKey===todayKey)return'Aujourd’hui';
 const tomorrow=isoDate(addDays(parseDate(todayKey),1));
 if(dateKey===tomorrow)return'Demain';
 return parseDate(dateKey).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','')
}
function workRanges(row,model){
 const out=[];let start=null;
 for(let i=0;i<=row.length;i++){
  const working=i<row.length&&(row[i]==='g'||row[i]==='b');
  if(working&&start===null)start=i;
  if(!working&&start!==null){out.push({a:(model.startTime??6)+start*.25,b:(model.startTime??6)+i*.25});start=null}
 }
 return out
}
function employeeIndex(model,name){
 const target=norm(name),employees=model?.employees||[];
 return employees.findIndex(e=>{const n=norm(e?.name),base=n.replace(/\s+[a-z]$/,'');return n===target||base===target})
}
function dayFacts(model,dateKey,name){
 const idx=employeeIndex(model,name);
 if(idx<0)return{hours:0,ranges:[],idx:-1,row:[],isLeave:false,isBlank:false,isRestStatus:false,isRest:false,hasOtherStatus:false};
 const row=model?.days?.[dateKey]?.cells?.[idx]||[],ranges=workRanges(row,model||{}),hours=row.reduce((n,v)=>n+(v==='g'||v==='b'?0.25:0),0);
 const isLeave=hours===0&&row.some(v=>v==='y'),isBlank=row.every(v=>!v);
 const isRestStatus=hours===0&&!isLeave&&row.some(v=>v==='r'||v==='o')&&row.every(v=>!v||v==='r'||v==='o');
 const isRest=isBlank||isRestStatus,hasOtherStatus=hours===0&&!isLeave&&!isRest&&row.some(Boolean);
 return{hours,ranges,idx,row,isLeave,isBlank,isRestStatus,isRest,hasOtherStatus}
}
function dayHours(model,dateKey,name){const d=dayFacts(model,dateKey,name);return{hours:d.hours,ranges:d.ranges,idx:d.idx}}

function roleLabel(role){
 return {
  admin:'Administrateur',
  'role_point-de-vente':'Point de vente',
  responsable:'Responsable',
  employe:'Employé',
  lecture:'Lecture seule'
 }[role]||String(role||'Compte')
}
function roleKeys(cfg){
 const custom=cfg?.role_definitions&&typeof cfg.role_definitions==='object'?Object.keys(cfg.role_definitions):[];
 return [...new Set(['admin','role_point-de-vente','responsable','employe','lecture',...custom])]
}
function permissionLevel(module){
 const profile=state.profile,cfg=state.config,role=profile?.role||'';
 if(!module||!role)return'none';
 if(cfg?.pages?.[module.id]?.enabled===false)return'none';
 if(role==='admin')return'manage';
 const max=Array.isArray(module.roles)?module.roles.filter(r=>roleKeys(cfg).includes(r)):roleKeys(cfg);
 const configured=Array.isArray(cfg?.pages?.[module.id]?.roles)?cfg.pages[module.id].roles.filter(r=>max.includes(r)):max;
 const explicit=cfg?.role_permissions?.[module.id]?.[role];
 let base=Object.prototype.hasOwnProperty.call(LEVELS,explicit)?explicit:(configured.includes(role)?'view':'none');
 const extra=services()?.subrolePermissions?.[module.id];
 if(extra==='manage')return'manage';
 if(extra==='operate'&&base!=='manage')return'operate';
 if(extra==='view'&&base==='none')return'view';
 return base
}
function configuredModule(module){
 const page=state.config?.pages?.[module.id]&&typeof state.config.pages[module.id]==='object'?state.config.pages[module.id]:{};
 const mobile=page?.platform_overrides?.mobile&&typeof page.platform_overrides.mobile==='object'?page.platform_overrides.mobile:{};
 return{...module,
  label:String(mobile.nav_label||mobile.label||page.nav_label||page.label||module.label),
  url:String(mobile.url||page.url||module.url),
  image_url:String(mobile.image_url||'')
 }
}
function allowedModules(){
 return MODULES.filter(module=>permissionLevel(module)!=='none')
  .map(configuredModule)
  .sort((a,b)=>Number(state.config?.pages?.[a.id]?.order||a.order)-Number(state.config?.pages?.[b.id]?.order||b.order))
}
const MOBILE_HOME_DISPLAY_WIDGETS=new Set(['welcome','next_shift','hours','absences','next_rest','tasks','important_info','team_today','quick_access']);
function widgetVisible(id){
 const cfg=state.config,profile=state.profile,node=cfg?.home_widgets?.[id]||{};
 if(node.enabled===false)return false;
 const personal=profile?.ui_preferences?.home_widgets?.[id];
 if(MOBILE_HOME_DISPLAY_WIDGETS.has(id))return typeof personal==='boolean'?personal:true;
 const role=profile?.role||'',fallback=id==='operations_hub'?role==='admin':true;
 const roleValue=node?.roles?.[role],subroleKeys=services()?.subroleKeys||[];
 const allowed=(typeof roleValue==='boolean'?roleValue:fallback)||subroleKeys.some(key=>node?.subroles?.[key]===true);
 if(!allowed)return false;
 return typeof personal==='boolean'?personal:true
}
function routeIdForFile(file){
 const table=window.NethorNavigation?.mobileViewTable?.()||{};
 const target=String(file||'').toLowerCase();
 return Object.keys(table).find(id=>String(table[id]||'').split('?')[0].toLowerCase()===target)||''
}
function paramsObject(searchParams){
 const out={};
 searchParams.forEach((value,key)=>{
  if(key==='mobile_preview'||key==='nethor_platform'||key==='view')return;
  out[key]=value
 });
 return out
}
function navigate(raw){
 try{
  const u=new URL(raw||'home.html',location.href);
  if(u.origin!==location.origin){location.href=u.href;return}
  const file=(u.pathname.split('/').pop()||'home.html').toLowerCase(),view=routeIdForFile(file);
  if(view&&router()?.open){
   router().open(view,{params:paramsObject(u.searchParams),source:'home-view'});
   return
  }
  if(window.NethorNavigation?.navigate){window.NethorNavigation.navigate((u.pathname.split('/').pop()||'home.html')+u.search+u.hash);return}
  location.href=(u.pathname.split('/').pop()||'home.html')+u.search+u.hash
 }catch(_){location.href=raw}
}

function icon(id){
 const page=state.config?.pages?.[id]||{},mobile=page?.platform_overrides?.mobile||{},custom=String(mobile.image_url||'').trim();
 if(custom)return '<img src="'+esc(custom)+'" alt="" style="display:block;width:23px;height:23px;object-fit:contain">';
 const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
 const icons={
  planning:'<svg '+common+'><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 4v3M16 4v3M4 9.5h16"/><path d="M8 13h3M13 13h3M8 16h3"/></svg>',
  notifications:'<svg '+common+'><path d="M6.5 16.5h11l-1.4-2.1V10a4.1 4.1 0 0 0-8.2 0v4.4L6.5 16.5Z"/><path d="M10 19h4"/></svg>',
  accounts:'<svg '+common+'><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.3"/><path d="M4 19c.9-3 2.8-4.6 5-4.6S13.1 16 14 19"/><path d="M14.5 18.5c.6-2 1.8-3.1 3.4-3.1 1.2 0 2.3.7 3.1 2.1"/></svg>',
  chat:'<svg '+common+'><path d="M5 5.5h14v10H10l-5 3v-13Z"/><path d="M8 9h8M8 12h5"/></svg>',
  stock:'<svg '+common+'><path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z"/><path d="M5 7.5 12 11l7-3.5M12 11v9"/></svg>',
  articles:'<svg '+common+'><path d="M6 4h9l3 3v13H6V4Z"/><path d="M15 4v4h4M9 12h6M9 15h6"/></svg>',
  scanner:'<svg '+common+'><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 10v4M10 9v6M13 10v4M16 9v6"/></svg>',
  home:'<svg '+common+'><path d="m4 11 8-7 8 7"/><path d="M6.5 10.5V20h11v-9.5M10 20v-6h4v6"/></svg>'
 };
 return icons[id]||icons.home
}
function dashboardIcon(id){
 const map={next_shift:'planning',tasks:'articles',important_info:'notifications',team_today:'accounts',quick_access:'home'};
 return icon(map[id]||id)
}
function statIcon(id){
 const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
 const icons={
  hours:'<svg '+common+'><circle cx="12" cy="12" r="8.25"/><path d="M12 7.7v4.7l3.15 1.85"/></svg>',
  absences:'<svg '+common+'><rect x="4.2" y="5.6" width="15.6" height="14.1" rx="2.4"/><path d="M7.5 3.9v3.4M16.5 3.9v3.4M4.2 9.2h15.6M8 13h3M8 16h6"/></svg>',
  next_rest:'<svg '+common+'><path d="M17.7 15.8A7.2 7.2 0 0 1 8.2 6.3a7.35 7.35 0 1 0 9.5 9.5Z"/><path d="M16.6 6.1v2.2M15.5 7.2h2.2"/></svg>'
 };
 return icons[id]||icons.hours
}
function notifIcon(kind){return kind==='manual_edit'||kind==='import_new'||kind==='import_replace'?'▦':kind==='admin_message'?'!':kind==='maintenance'?'⚒':kind==='app_update'?'↑':'•'}
function homeNotificationVisual(kind){
 const raw=services()?.siteConfig?.platform_ui?.mobile?.notification_visuals?.[kind],node=raw&&typeof raw==='object'?raw:{};
 return{url:String(node.url||'').trim()}
}
function homeNotificationIconHtml(kind){
 const visual=homeNotificationVisual(kind),body=visual.url?'<img src="'+esc(visual.url)+'" alt="" draggable="false">':esc(notifIcon(kind));
 return '<span class="mhdInfoIcon">'+body+'</span>'
}
function since(value){
 if(!value)return'';
 const ms=Date.now()-new Date(value).getTime(),m=Math.max(0,Math.floor(ms/60000));
 if(m<1)return'à l’instant';
 if(m<60)return'il y a '+m+' min';
 const h=Math.floor(m/60);
 if(h<24)return'il y a '+h+' h';
 return'il y a '+Math.floor(h/24)+' j'
}

function taskMode(role){
 const value=String(role||'').trim().toLowerCase();
 if(['admin','role_point-de-vente','point_vente','surface_vente'].includes(value))return'editor';
 if(['responsable','employe'].includes(value))return'user';
 return'hidden'
}
function operationalUsers(){return state.team.filter(x=>['responsable','employe'].includes(String(x.role||'').toLowerCase()))}
function afternoonUsers(){const ids=new Set(state.afternoonUserIds);return operationalUsers().filter(x=>ids.has(x.id))}
function taskGroups(rows){
 const map=new Map();
 for(const row of rows||[]){
  const key=row.section_key||'autre',label=row.section_label||'Autre';
  if(!map.has(key))map.set(key,{key,label,rows:[]});
  map.get(key).rows.push(row)
 }
 return [...map.values()]
}
function expectedCount(task){return task.all_users?operationalUsers().length:state.assignees.filter(x=>x.task_id===task.id).length}
function completedCount(task){return state.completions.filter(x=>x.task_id===task.id).length}
function assigneeLabel(task){
 if(task.all_users)return'Tous les utilisateurs';
 const ids=state.assignees.filter(x=>x.task_id===task.id).map(x=>x.user_id);
 const names=ids.map(id=>state.team.find(x=>x.id===id)?.display_name).filter(Boolean);
 if(!names.length)return'Aucun destinataire';
 return names.length<=3?names.join(' · '):names.slice(0,3).join(' · ')+' +'+(names.length-3)
}
function taskGroupIcon(key){return{fl:'🥬',livraison_stock:'▤',promotion:'%',nettoyage:'✦',facing:'≡',dates:'◷',autre:'+'}[key]||'•'}
function taskTemplatesHtml(){
 const published=new Set(state.tasks.flatMap(t=>Array.isArray(t.source_keys)&&t.source_keys.length?t.source_keys:[t.catalog_key]).filter(Boolean));
 const groups=taskGroups(state.taskCatalog);
 return '<div class="mhdTaskTemplateGroups">'+groups.map((group,index)=>'<div class="mhdTaskTemplateGroup" data-task-group="'+esc(group.key)+'"><button type="button" class="mhdTaskGroupToggle" data-home-action="task-group" aria-expanded="'+(index===0?'true':'false')+'"><span class="mhdTaskGroupLead"><i>'+esc(taskGroupIcon(group.key))+'</i><span><strong>'+esc(group.label)+'</strong><small>'+group.rows.length+' mission'+(group.rows.length>1?'s':'')+'</small></span></span><span class="mhdTaskGroupMeta"><b data-task-group-count>0</b><em>⌄</em></span></button><div class="mhdTaskTemplateGrid '+(index===0?'':'hidden')+'">'+group.rows.map(task=>{const sent=published.has(task.key);return '<button type="button" class="mhdTaskChip'+(sent?' is-published':'')+'" data-home-action="task-template" data-task-template="'+esc(task.key)+'" '+(sent?'disabled aria-disabled="true"':'')+'><span class="mhdTaskChipCheck">✓</span><span class="mhdTaskChipCopy"><strong>'+esc(task.title)+'</strong>'+(sent?'<small>Déjà transmise</small>':'')+'</span></button>'}).join('')+'</div></div>').join('')+'</div>'
}
function taskAudienceHtml(){
 const users=afternoonUsers();
 if(!users.length)return '<div class="mhdTaskAudience mhdTaskAudienceEmpty"><div class="mhdTaskAudienceHead"><div><span class="mhdTaskFieldLabel">Destinataires</span><strong>Équipe d’après-midi</strong><small>Aucune personne opérationnelle détectée après 14h dans le planning du jour.</small></div><span class="mhdTaskAudienceCount">0</span></div></div>';
 return '<div class="mhdTaskAudience"><div class="mhdTaskAudienceHead"><div><span class="mhdTaskFieldLabel">Destinataires</span><strong>Équipe d’après-midi</strong><small>Présence détectée après 14h · décoche uniquement si nécessaire.</small></div><span class="mhdTaskAudienceCount">'+users.length+'</span></div><div class="mhdTaskAudienceGrid">'+users.map(user=>'<button type="button" class="mhdTaskAssigneeChip selected" data-home-action="task-user" data-task-user="'+esc(user.id)+'" aria-pressed="true"><span>'+esc((user.display_name||'U').slice(0,1).toUpperCase())+'</span>'+esc(user.display_name||'Utilisateur')+'</button>').join('')+'</div></div>'
}
function renderTaskEditor(loadError){
 const tasks=state.tasks,groups=taskGroups(tasks),afternoon=afternoonUsers(),afternoonNames=afternoon.map(x=>x.display_name||'Utilisateur');
 const totalDone=tasks.reduce((n,t)=>n+completedCount(t),0),totalExpected=tasks.reduce((n,t)=>n+expectedCount(t),0);
 const completedTasks=tasks.filter(t=>{const expected=expectedCount(t);return expected>0&&completedCount(t)>=expected}).length;
 const rate=totalExpected?Math.min(100,Math.round(totalDone/totalExpected*100)):0;
 const rows=groups.map(group=>'<div class="mhdTaskPublishedGroup"><div class="mhdTaskGroupTitle"><span>'+esc(group.label)+'</span><b>'+group.rows.length+'</b></div>'+group.rows.map(task=>{
   const done=completedCount(task),expected=expectedCount(task),finished=expected>0&&done>=expected;
   return '<div class="mhdTaskPublishedRow '+(finished?'done':'')+'"><span class="mhdTaskStatusDot '+(finished?'done':'')+'"></span><span class="mhdTaskPublishedCopy"><strong>'+esc(task.title)+'</strong>'+(task.detail?'<small>'+esc(task.detail)+'</small>':'')+'<em>'+esc(assigneeLabel(task))+'</em></span><span class="mhdTaskValidation">'+(finished?'✓ ':'')+done+'/'+expected+'</span><button type="button" class="mhdTaskDelete" data-home-action="task-delete" data-task-id="'+esc(task.id)+'" aria-label="Supprimer la mission">×</button></div>'
 }).join('')+'</div>').join('');
 const openClass=tasks.length?' hidden':'';
 const teamLabel=afternoon.length?(afternoonNames.slice(0,4).join(' · ')+(afternoonNames.length>4?' +'+(afternoonNames.length-4):'')):'Aucune équipe détectée';
 return '<section class="mhdCard mhdSection mhdTasks editor"><div class="mhdTaskEditorTop"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('tasks')+'</span><div><strong>Passation après-midi</strong><small class="mhdTaskRoleHint">Missions laissées par l’équipe du matin</small></div></div><div class="mhdTaskHeaderActions">'+(tasks.length?'<button class="mhdTaskResetBtn" type="button" data-home-action="task-reset">Vider</button>':'')+'<button class="mhdTaskAddBtn" type="button" data-home-action="task-composer">'+(tasks.length?'+ Ajouter':'Préparer')+'</button></div></div>'+
 '<div class="mhdTaskHandoff"><div class="mhdTaskHandoffRoute"><span>MATIN</span><i>→</i><span>APRÈS-MIDI</span></div><div class="mhdTaskHandoffTeam"><strong>'+afternoon.length+' personne'+(afternoon.length>1?'s':'')+' concernée'+(afternoon.length>1?'s':'')+'</strong><small>'+esc(teamLabel)+' · selon le planning après 14h</small></div></div>'+
 (tasks.length?'<div class="mhdTaskOverview"><div><strong>'+tasks.length+'</strong><span>mission'+(tasks.length>1?'s':'')+'</span></div><div><strong>'+totalDone+'/'+totalExpected+'</strong><span>validations</span></div><div><strong>'+completedTasks+'/'+tasks.length+'</strong><span>terminée'+(tasks.length>1?'s':'')+'</span></div><div class="mhdTaskOverviewProgress"><i style="width:'+rate+'%"></i></div></div>':'')+
 '<div id="mhdTaskComposer" class="mhdTaskComposer'+openClass+'"><div class="mhdTaskComposerTitle"><div><strong>Préparer la passation</strong><small>Sélectionne plusieurs missions : elles seront envoyées en une seule fois.</small></div><span id="mhdTaskSelectedSummary">0 sélectionnée</span></div>'+taskTemplatesHtml()+
 '<div id="mhdFacingDetail" class="mhdFacingDetail hidden"><label class="mhdTaskFieldLabel" for="mhdFacingSecDetail">Facing sec · précision</label><input id="mhdFacingSecDetail" class="mhdTaskInput" maxlength="90" placeholder="Tous les rayons, ou préciser un rayon"></div>'+
 '<div class="mhdTaskComposerBottom"><div class="mhdCustomTask"><label class="mhdTaskFieldLabel" for="mhdCustomTaskTitle">Mission ponctuelle</label><input id="mhdCustomTaskTitle" class="mhdTaskInput" maxlength="160" placeholder="Ex. Ranger la réserve boissons" data-home-task-custom><small>Valable uniquement aujourd’hui.</small></div>'+taskAudienceHtml()+'</div>'+
 '<div class="mhdTaskComposerActions"><span id="mhdTaskComposerState">'+(afternoon.length?'Visible uniquement par les destinataires sélectionnés.':'Renseigne d’abord le planning de l’après-midi pour pouvoir publier.')+'</span><button type="button" class="mhdTaskPublishBtn" data-home-action="task-publish" '+(afternoon.length?'':'disabled')+'>Publier la passation</button></div></div>'+
 (loadError?'<div class="mhdTaskError">Impossible de charger la passation pour le moment.</div>':(rows||'<div class="mhdTaskEmptyState"><strong>Aucune passation envoyée</strong><span>Prépare les missions à transmettre à l’équipe d’après-midi.</span></div>'))+'</section>'
}
function renderTaskUser(loadError){
 const uid=state.session?.user?.id,tasks=state.tasks,doneSet=new Set(state.completions.filter(x=>x.user_id===uid).map(x=>x.task_id)),done=tasks.filter(t=>doneSet.has(t.id)).length;
 const groups=taskGroups(tasks);
 const rows=groups.map(group=>{const ordered=[...group.rows].sort((a,b)=>Number(doneSet.has(a.id))-Number(doneSet.has(b.id)));return '<div class="mhdTaskUserGroup"><div class="mhdTaskGroupTitle"><span>'+esc(group.label)+'</span><b>'+ordered.length+'</b></div>'+ordered.map(task=>'<button type="button" class="mhdRow mhdTaskRow '+(doneSet.has(task.id)?'done':'')+'" data-home-action="task-toggle" data-task-id="'+esc(task.id)+'" aria-pressed="'+(doneSet.has(task.id)?'true':'false')+'"><span class="mhdTaskCheck"></span><span class="mhdRowCopy"><strong>'+esc(task.title)+'</strong>'+(task.detail?'<small>'+esc(task.detail)+'</small>':'')+'</span><span class="mhdTaskBadge">'+(doneSet.has(task.id)?'Fait':'À faire')+'</span></button>').join('')+'</div>'}).join('');
 const finished=tasks.length>0&&done===tasks.length;
 return '<section class="mhdCard mhdSection mhdTasks"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('tasks')+'</span><div><strong>Passation · après-midi</strong><small class="mhdTaskRoleHint">Missions transmises par l’équipe du matin</small></div></div><span class="mhdTaskUserProgress '+(finished?'done':'')+'">'+(finished?'✓ Terminé':done+'/'+tasks.length)+'</span></div>'+(finished?'<div class="mhdTaskSuccess"><strong>Passation terminée</strong><span>Toutes tes missions ont été validées.</span></div>':'')+(loadError?'<div class="mhdTaskError">Impossible de charger tes missions pour le moment.</div>':(rows||'<div class="mhdTaskEmptyState"><strong>Rien à reprendre</strong><span>Aucune mission ne t’est affectée pour cet après-midi.</span></div>'))+'</section>'
}
function renderTasks(loadError){
 const mode=taskMode(state.profile?.role);
 return mode==='editor'?renderTaskEditor(loadError):mode==='user'?renderTaskUser(loadError):''
}

function syncComposer(){
 const box=state.dashboard?.querySelector('#mhdTaskComposer');if(!box)return;
 const selected=[...box.querySelectorAll('[data-task-template].selected')],custom=String(box.querySelector('[data-home-task-custom]')?.value||'').trim();
 box.querySelectorAll('[data-task-group]').forEach(group=>{
  const count=group.querySelectorAll('[data-task-template].selected').length,badge=group.querySelector('[data-task-group-count]');
  if(badge){badge.textContent=String(count);badge.classList.toggle('active',count>0)}
 });
 const count=selected.length+(custom?1:0),summary=box.querySelector('#mhdTaskSelectedSummary');
 if(summary){summary.textContent=count+' sélectionnée'+(count>1?'s':'');summary.classList.toggle('active',count>0)}
}
function mergeTaskPair(rows,keyA,keyB,title){
 const a=rows.find(x=>x.catalog_key===keyA),b=rows.find(x=>x.catalog_key===keyB);
 if(!a||!b)return rows;
 const merged={...a,id:undefined,catalog_key:null,source_keys:[keyA,keyB],title,sort_order:Math.min(Number(a.sort_order)||100,Number(b.sort_order)||100)};
 return rows.filter(x=>x!==a&&x!==b).concat(merged)
}
async function publishTasks(button){
 if(state.busy||!state.session||!state.db)return;
 const box=state.dashboard?.querySelector('#mhdTaskComposer'),message=box?.querySelector('#mhdTaskComposerState');if(!box)return;
 const keys=[...box.querySelectorAll('[data-task-template].selected:not(:disabled)')].map(x=>x.dataset.taskTemplate),custom=String(box.querySelector('[data-home-task-custom]')?.value||'').trim();
 if(!keys.length&&!custom){if(message)message.textContent='Sélectionne au moins une mission ou ajoute une mission ponctuelle.';return}
 const selectedUsers=[...box.querySelectorAll('[data-task-user].selected')].map(x=>x.dataset.taskUser).filter(id=>state.afternoonUserIds.includes(id));
 if(!selectedUsers.length){if(message)message.textContent='Sélectionne au moins une personne de l’équipe d’après-midi.';return}
 const byKey=new Map(state.taskCatalog.map(x=>[x.key,x])),uid=state.session.user.id;
 let rows=keys.map(key=>byKey.get(key)).filter(Boolean).map(task=>({
  task_date:state.todayKey,catalog_key:task.key,source_keys:[task.key],title:task.title,section_key:task.section_key,section_label:task.section_label,
  detail:task.key==='facing_sec'?(String(box.querySelector('#mhdFacingSecDetail')?.value||'').trim()||'Tous'):null,
  all_users:false,sort_order:Number(task.sort_order)||100,created_by:uid
 }));
 rows=mergeTaskPair(rows,'livraison_gel','stock_gel','Livraison + Stock gel');
 rows=mergeTaskPair(rows,'livraison_sec','stock_sec','Livraison + Stock sec');
 if(custom)rows.push({task_date:state.todayKey,catalog_key:null,source_keys:[],title:custom,section_key:'autre',section_label:'Autre',detail:null,all_users:false,sort_order:900,created_by:uid});
 rows.sort((a,b)=>a.sort_order-b.sort_order);
 state.busy=true;if(button)button.disabled=true;if(message)message.textContent='Publication de la passation…';
 try{
  const inserted=await state.db.from('daily_tasks').insert(rows).select('id');
  if(inserted.error)throw inserted.error;
  const ids=(inserted.data||[]).map(x=>x.id);
  if(ids.length){
   const assignments=ids.flatMap(task_id=>selectedUsers.map(user_id=>({task_id,user_id})));
   const assigned=await state.db.from('daily_task_assignees').insert(assignments);
   if(assigned.error){await state.db.from('daily_tasks').delete().in('id',ids);throw assigned.error}
  }
  state.preloaded=null;await render()
 }catch(error){
  console.error('[Nethor HomeView] passation',error);
  if(message)message.textContent='Publication impossible : '+(error?.message||'erreur')
 }finally{state.busy=false;if(button)button.disabled=false}
}
async function deleteTask(id,button){
 if(state.busy||!id||!confirm('Supprimer cette tâche de la journée ?'))return;
 state.busy=true;if(button)button.disabled=true;
 try{
  const {error}=await state.db.from('daily_tasks').delete().eq('id',id);
  if(error)throw error;
  state.preloaded=null;await render()
 }catch(error){alert('Suppression impossible : '+error.message);if(button)button.disabled=false}
 finally{state.busy=false}
}
async function resetTasks(button){
 if(state.busy||!state.tasks.length||!confirm('Réinitialiser toutes les tâches du jour ?\n\nLes missions, affectations et validations d’aujourd’hui seront supprimées.'))return;
 state.busy=true;if(button)button.disabled=true;
 try{
  const {error}=await state.db.from('daily_tasks').delete().eq('task_date',state.todayKey);
  if(error)throw error;
  state.preloaded=null;await render()
 }catch(error){alert('Réinitialisation impossible : '+error.message);if(button)button.disabled=false}
 finally{state.busy=false}
}
async function toggleTask(id,button){
 if(state.busy||!state.session||!id)return;
 state.busy=true;if(button)button.disabled=true;
 try{
  const uid=state.session.user.id,done=state.completions.some(x=>x.task_id===id&&x.user_id===uid);
  const result=done
    ?await state.db.from('daily_task_completions').delete().eq('task_id',id).eq('user_id',uid)
    :await state.db.from('daily_task_completions').insert({task_id:id,user_id:uid});
  if(result.error)throw result.error;
  state.preloaded=null;await render()
 }catch(error){console.error('[Nethor HomeView] task validation',error);if(button)button.disabled=false}
 finally{state.busy=false}
}

async function signedAvatar(profile){
 if(!profile?.avatar_path||!state.db)return'';
 try{
  const {data}=await state.db.storage.from('profile-avatars').createSignedUrl(profile.avatar_path,3600);
  return data?.signedUrl||''
 }catch(_){return''}
}
function avatarInitials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}
async function paintTeamAvatars(rows){
 for(const row of rows){
  if(!state.mounted)return;
  const el=state.dashboard?.querySelector('[data-home-team-avatar="'+row.id+'"]');if(!el)continue;
  const url=await signedAvatar(row.profile);
  if(url){el.style.backgroundImage='url("'+url.replace(/"/g,'%22')+'")';el.textContent=''}
 }
}

async function loadHomeSnapshot(shared){
 await shared?.ready?.();
 const profile=shared?.profile||null,config=shared?.siteConfig||{},session=shared?.session||null,db=shared?.client||null;
 if(!profile||!session||!db)return null;
 const today=new Date(),todayKey=parisDateKey(today),weekStart=isoDate(startOfWeek(today)),weekEnd=isoDate(addDays(startOfWeek(today),84));
 const sync=window.NethorMobileSync;
 const planningTicket=sync?.beginCheck?.('planning'),tasksTicket=sync?.beginCheck?.('tasks');
 try{
 const [weeksRes,profilesRes,taskCatalogRes,taskRowsRes]=await Promise.all([
  db.from('planning_weeks').select('week_start,data,updated_at').gte('week_start',weekStart).lte('week_start',weekEnd).order('week_start'),
  db.rpc('list_team_members'),
  db.from('daily_task_catalog').select('key,section_key,section_label,title,sort_order').eq('active',true).order('sort_order'),
  db.from('daily_tasks').select('id,task_date,catalog_key,source_keys,title,section_key,section_label,detail,all_users,sort_order,created_by,created_at').eq('task_date',todayKey).order('sort_order').order('created_at')
 ]);
 const tasks=taskRowsRes.error?[]:(taskRowsRes.data||[]);
 let assignees=[],completions=[],relatedTasksError=false;
 if(tasks.length){
  const ids=tasks.map(x=>x.id),[aRes,cRes]=await Promise.all([
   db.from('daily_task_assignees').select('task_id,user_id').in('task_id',ids),
   db.from('daily_task_completions').select('task_id,user_id,completed_at').in('task_id',ids)
  ]);
  assignees=aRes.error?[]:(aRes.data||[]);
  completions=cRes.error?[]:(cRes.data||[]);
  relatedTasksError=!!(aRes.error||cRes.error)
 }
 const tasksFailed=!!(taskCatalogRes.error||taskRowsRes.error||relatedTasksError);
 if(weeksRes.error)sync?.markFailed?.('planning',planningTicket);
 else sync?.markVerified?.('planning',planningTicket);
 if(tasksFailed)sync?.markFailed?.('tasks',tasksTicket);
 else sync?.markVerified?.('tasks',tasksTicket);
 return{
  loadedAt:Date.now(),userId:String(session.user.id||''),todayKey,weekStart,
  profile,config,session,db,
  weeks:(weeksRes.data||[]).filter(x=>x.data).map(x=>({...x.data,__planningWeekStart:x.week_start,__planningRevisionAt:x.updated_at})),
   planningLoadError:!!weeksRes.error,
  team:profilesRes.error?[]:(profilesRes.data||[]),
  taskCatalog:taskCatalogRes.error?[]:(taskCatalogRes.data||[]),
  tasks,assignees,completions,
  taskLoadError:tasksFailed
 }
 }catch(error){
  sync?.markFailed?.('planning',planningTicket);
  sync?.markFailed?.('tasks',tasksTicket);
  throw error
 }
}
function applyHomeSnapshot(snapshot){
 if(!snapshot)return false;
 state.profile=snapshot.profile;state.config=snapshot.config;state.session=snapshot.session;state.db=snapshot.db;
 state.todayKey=snapshot.todayKey;state.weeks=snapshot.weeks;state.team=snapshot.team;state.taskCatalog=snapshot.taskCatalog;
 state.tasks=snapshot.tasks;state.assignees=snapshot.assignees;state.completions=snapshot.completions;
 state.name=state.profile?.display_name||state.session?.user?.email?.split('@')[0]||'';
 return true
}
async function preload(){
 const shared=services();
 if(!shared)return false;
 const uid=String(shared?.session?.user?.id||'');
 if(state.preloaded&&state.preloaded.userId===uid&&Date.now()-state.preloaded.loadedAt<45000)return true;
 if(state.preloadPromise)return state.preloadPromise;
 state.preloadPromise=loadHomeSnapshot(shared).then(snapshot=>{
  if(!snapshot)return false;
  state.preloaded=snapshot;
  return true
 }).catch(error=>{console.warn('[Nethor HomeView] preload',error);return false}).finally(()=>{state.preloadPromise=null});
 return state.preloadPromise
}

async function render(){
 if(!state.mounted||!state.dashboard)return;
 const token=++state.renderToken,shared=services();
 await shared?.ready?.();
 if(!state.mounted||token!==state.renderToken)return;
 state.profile=shared?.profile||null;
 state.config=shared?.siteConfig||{};
 state.session=shared?.session||null;
 state.db=shared?.client||null;
 if(!state.profile||!state.session||!state.db){
  state.dashboard.innerHTML='<div class="mhdCard mhdSection"><div class="mhdEmpty">Impossible de charger ton espace de travail.</div></div>';
  return
 }
 state.name=state.profile.display_name||state.session.user?.email?.split('@')[0]||'';

 const today=new Date(),todayKey=parisDateKey(today),weekStart=isoDate(startOfWeek(today));
 const uid=String(state.session.user.id||'');
 const offline=navigator.onLine===false;
 const sync=window.NethorMobileSync;
 const needsRefresh=!offline&&sync?.active&&(['planning','tasks'].some(domain=>sync.statusOf(domain)!=='fresh'));
 let snapshot=state.preloaded&&state.preloaded.userId===uid&&state.preloaded.todayKey===todayKey&&(offline||Date.now()-state.preloaded.loadedAt<45000)?state.preloaded:null;
 if(!snapshot&&state.preloadPromise&&!offline){
  await state.preloadPromise;
  snapshot=state.preloaded&&state.preloaded.userId===uid&&state.preloaded.todayKey===todayKey&&Date.now()-state.preloaded.loadedAt<45000?state.preloaded:null
 }
 // Realtime ou retour au premier plan ont pu invalider le préchargement.
 if(needsRefresh||snapshot?.planningLoadError||snapshot?.taskLoadError)snapshot=offline?snapshot:null;
 // Les données préchargées ne sont réutilisées que si la version serveur est inchangée.
 if(snapshot&&!offline){
  const end=isoDate(addDays(startOfWeek(today),84));
  const {data:published,error:versionError}=await state.db.from('planning_weeks').select('week_start,updated_at').gte('week_start',weekStart).lte('week_start',end).order('week_start');
  const cached=new Map((snapshot.weeks||[]).map(w=>[String(w.__planningWeekStart||w.weekStart||w.week_start||''),String(w.__planningRevisionAt||'')]));
  if(versionError||!Array.isArray(published)||published.length!==cached.size||published.some(w=>cached.get(String(w.week_start))!==String(w.updated_at||'')))snapshot=null;
 }
 if(!snapshot&&!offline)snapshot=await loadHomeSnapshot(shared);
 if(!state.mounted||token!==state.renderToken)return;
 if(!snapshot){
  state.dashboard.innerHTML='<div class="mhdCard mhdSection"><div class="mhdEmpty">'+(offline?'Hors connexion · aucune donnée de cette journée n’est disponible dans la session.':'Impossible de charger ton espace de travail.')+'</div></div>';
  return
 }
 state.preloaded=snapshot;
 applyHomeSnapshot(snapshot);

 const taskLoadError=!!snapshot.taskLoadError;
 const weeks=state.weeks,exactCurrentWeek=weeks.find(w=>String(w.__planningWeekStart||w.weekStart||w.week_start||'')===weekStart)||null,currentWeek=exactCurrentWeek;
 const allDays=[];
 for(const model of weeks)for(const dateKey of Object.keys(model?.days||{}))if(dateKey>=todayKey)allDays.push({dateKey,model});
 allDays.sort((a,b)=>a.dateKey.localeCompare(b.dateKey));
 let nextShift=null;
 const nowHour=today.getHours()+today.getMinutes()/60;
 for(const item of allDays){
  const facts=dayHours(item.model,item.dateKey,state.name);
  if(facts.hours<=0)continue;
  if(item.dateKey===todayKey&&facts.ranges.length&&facts.ranges.every(r=>r.b<=nowHour))continue;
  nextShift={...item,...facts};break
 }
 const currentHours=currentWeek?Object.keys(currentWeek.days||{}).reduce((sum,dateKey)=>sum+dayFacts(currentWeek,dateKey,state.name).hours,0):0;
 let nextRest=null,nextLeave=null;
 for(const item of allDays.filter(x=>x.dateKey>todayKey)){
  const facts=dayFacts(item.model,item.dateKey,state.name);
  if(facts.idx>=0&&facts.isRest){nextRest=item.dateKey;break}
 }
 const firstLeaveIndex=allDays.findIndex(item=>dayFacts(item.model,item.dateKey,state.name).isLeave);
 if(firstLeaveIndex>=0){
  const first=allDays[firstLeaveIndex];let end=first.dateKey;
  for(let i=firstLeaveIndex+1;i<allDays.length;i++){
   const expected=isoDate(addDays(parseDate(end),1)),item=allDays[i];
   if(item.dateKey!==expected||!dayFacts(item.model,item.dateKey,state.name).isLeave)break;
   end=item.dateKey
  }
  nextLeave={start:first.dateKey,end}
 }
 const todayModel=weeks.find(w=>w?.days?.[todayKey])||currentWeek,workingNames=[],afternoonNames=[],todayTeam=[];
 if(todayModel?.days?.[todayKey]){
  (todayModel.employees||[]).forEach((employee,i)=>{
   const row=todayModel.days[todayKey].cells?.[i]||[],ranges=workRanges(row,todayModel||{});
   if(row.some(v=>v==='g'||v==='b'))workingNames.push(employee.name);
   if(ranges.some(r=>r.b>14))afternoonNames.push(employee.name)
  })
 }
 for(const name of workingNames){
  const profile=state.team.find(x=>norm(x.display_name)===norm(name));
  todayTeam.push({name,profile:profile||null})
 }
 state.afternoonUserIds=[...new Set(afternoonNames.map(name=>{
  const target=norm(name),base=target.replace(/\s+[a-z]$/,'');
  return state.team.find(x=>{const p=norm(x.display_name),pb=p.replace(/\s+[a-z]$/,'');return p===target||pb===target||p===base||pb===base})?.id
 }).filter(Boolean))];

 const sections=[],role=roleLabel(state.profile.role);
 const syncState=offline?'error':(snapshot.planningLoadError?'error':(exactCurrentWeek?'ok':'missing'));
 const syncText=offline?'Dernières données consultées · non vérifiées hors connexion':(snapshot.planningLoadError?'Planning indisponible : vérification impossible':(exactCurrentWeek?'Planning récupéré du serveur':'Aucun planning publié cette semaine'));
 sections.push('<div class="mhdPlanningSyncState '+syncState+'" role="status">'+esc(syncText)+'</div>');
 const dateText=today.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 const welcomeName=state.name||role;
 const todayPersonal=todayModel?dayFacts(todayModel,todayKey,state.name):null;
 const todayRanges=todayPersonal?.ranges||[];
 const firstTodayRange=todayRanges[0]||null,lastTodayRange=todayRanges.length?todayRanges[todayRanges.length-1]:null;

 // 00:00–04:59 reste dans la continuité du soir ; Bonjour commence à 05:00.
 const isMorning=nowHour>=5&&nowHour<12;
 const isAfternoon=nowHour>=12&&nowHour<18;
 let welcomeTone=isMorning?'morning':isAfternoon?'afternoon':'evening';
 let welcomeTitle=(isMorning?'Bonjour ':isAfternoon?'Bon après-midi ':'Bonsoir ')+welcomeName+' 👋';
 let welcomeHint='Voici l’essentiel pour aujourd’hui.';

 if(todayPersonal?.isLeave){
  welcomeTone='leave';
  welcomeTitle='Tu es en congé aujourd’hui ☂️';
  welcomeHint='Profite de ta journée, '+welcomeName+'.'
 }else if(todayPersonal?.isRest){
  welcomeTone='rest';
  welcomeTitle='Bonne journée '+welcomeName+' ☀️';
  welcomeHint='Tu es en repos aujourd’hui.'
 }else if(firstTodayRange&&nowHour<firstTodayRange.a){
  const delta=Math.max(0,Math.round((firstTodayRange.a-nowHour)*60));
  welcomeHint=delta<=90?'Ta journée commence bientôt.':'Ta prise de poste est prévue aujourd’hui.'
 }else if(firstTodayRange&&lastTodayRange&&nowHour>=firstTodayRange.a&&nowHour<lastTodayRange.b){
  welcomeHint=nowHour<14?'Bonne prise de poste !':'Bonne continuation !'
 }else if(lastTodayRange&&nowHour>=lastTodayRange.b){
  welcomeHint='Ta journée de travail est terminée.'
 }else if(nextShift?.dateKey===isoDate(addDays(parseDate(todayKey),1))){
  welcomeHint='Prochaine prise de poste demain.'
 }

 const welcomeHtml=widgetVisible('welcome')
  ?'<section class="mhdHero mhdWelcome '+esc(welcomeTone)+'"><div class="mhdWelcomeCopy"><h1>'+esc(welcomeTitle)+'</h1><span class="mhdWelcomeDate">'+esc(dateText)+'</span><p>'+esc(welcomeHint)+'</p></div></section>'
  :'';

 let nextShiftHtml='';
 if(widgetVisible('next_shift')){
  const shiftText=snapshot.planningLoadError?'Planning indisponible':(nextShift?.ranges?.length?nextShift.ranges.map(r=>clock(r.a)+' - '+clock(r.b)).join(' • '):'Aucune prise de poste à venir'),when=nextShift?dateLabel(nextShift.dateKey,todayKey):'—';
  const target=nextShift?'planning.html?week='+encodeURIComponent(isoDate(startOfWeek(parseDate(nextShift.dateKey))))+'&day='+encodeURIComponent(nextShift.dateKey):'planning.html';
  nextShiftHtml='<button class="mhdCard mhdNext" type="button" data-home-nav="'+esc(target)+'"><div class="mhdNextHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('next_shift')+'</span><strong>Prise de poste</strong></div><span class="mhdWhen">'+esc(when)+'</span></div><div class="mhdShiftLine"><b>'+esc(shiftText)+'</b><span class="mhdChevron">›</span></div><div class="mhdShiftMeta"><span class="mhdTag green">Planning personnel</span>'+(nextShift?.hours?'<span class="mhdTag amber">'+esc(String(nextShift.hours).replace('.',','))+' h</span>':'')+'</div></button>'
 }

 if(welcomeHtml&&nextShiftHtml)sections.push('<section class="mhdWelcomeShiftGroup">'+welcomeHtml+nextShiftHtml+'</section>');
 else{
  if(welcomeHtml)sections.push(welcomeHtml);
  if(nextShiftHtml)sections.push(nextShiftHtml)
 }
 const stats=[];
 if(widgetVisible('hours'))stats.push('<button class="mhdStat" type="button" data-home-nav="planning.html"><div class="mhdStatHead"><span class="mhdMiniIcon">'+statIcon('hours')+'</span>Mes heures</div><strong>'+(snapshot.planningLoadError||!currentWeek?'—':esc(String(currentHours).replace('.',','))+' h')+'</strong><small>'+(snapshot.planningLoadError?'horaires non vérifiés':(!currentWeek?'aucun planning publié':'planifiées cette semaine'))+'</small>'+(snapshot.planningLoadError||!currentWeek?'':'<div class="mhdProgress"><i style="width:'+Math.min(100,Math.round(currentHours/35*100))+'%"></i></div>')+'</button>');
 if(widgetVisible('absences')){
  const leaveStart=nextLeave?.start||'',leaveEnd=nextLeave?.end||'',leaveOngoing=!!leaveStart&&leaveStart<=todayKey&&todayKey<=leaveEnd,focusDate=leaveOngoing?todayKey:leaveStart;
  const target=focusDate?'planning.html?week='+encodeURIComponent(isoDate(startOfWeek(parseDate(focusDate))))+'&day='+encodeURIComponent(focusDate)+'&focus=leave':'planning.html';
  const short=key=>parseDate(key).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),daysUntil=leaveStart?Math.max(0,dateDiffDays(todayKey,leaveStart)):0;
  let main='Aucun',sub='aucun congé planifié';
  if(leaveOngoing){main='<span class="mhdValueBlue">Congé</span>'+(nextShift?.dateKey?' jusqu’au '+esc(short(nextShift.dateKey)):'');sub=nextShift?.dateKey?'prochaine prise de poste':'En cours'}
  else if(leaveStart){main='<span class="mhdValueBlue">Dans '+daysUntil+' jour'+(daysUntil>1?'s':'')+'</span>';sub=leaveStart===leaveEnd?'Congé le '+short(leaveStart):'Congé du '+short(leaveStart)+' au '+short(leaveEnd)}
  stats.push('<button class="mhdStat mhdStatLeave" type="button" data-home-nav="'+esc(target)+'"><div class="mhdStatHead"><span class="mhdMiniIcon">'+statIcon('absences')+'</span>Congés</div><strong>'+main+'</strong><small>'+esc(sub)+'</small></button>')
 }
 if(widgetVisible('next_rest')){
  const target=nextRest?'planning.html?week='+encodeURIComponent(isoDate(startOfWeek(parseDate(nextRest))))+'&day='+encodeURIComponent(nextRest)+'&focus=rest':'planning.html';
  stats.push('<button class="mhdStat" type="button" data-home-nav="'+esc(target)+'"><div class="mhdStatHead"><span class="mhdMiniIcon">'+statIcon('next_rest')+'</span>Prochain repos</div><strong>'+(nextRest?esc(parseDate(nextRest).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','')):'—')+'</strong><small>'+(nextRest?'Jour de repos':'non déterminé')+'</small></button>')
 }
 if(stats.length)sections.push('<section class="mhdStats">'+stats.join('')+'</section>');

 if(widgetVisible('tasks'))sections.push(renderTasks(taskLoadError));

 if(widgetVisible('important_info')){
  const infos=(services()?.notifications||[]).filter(n=>IMPORTANT_KINDS.has(n.kind)).slice(0,2);
  sections.push('<section class="mhdCard mhdSection mhdImportant"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('important_info')+'</span><strong>Informations importantes</strong></div><button class="mhdSectionLink" type="button" data-home-nav="notifications.html">Voir toutes ›</button></div>'+(infos.length?infos.map((item,index)=>'<button type="button" class="mhdInfoRow '+(index?'orange':'')+'" data-home-nav="'+esc(item.target_url||'notifications.html')+'">'+homeNotificationIconHtml(item.kind)+'<span class="mhdInfoCopy"><strong>'+esc(item.title||'Information Nethor')+'</strong><small>'+esc(item.message||'')+'</small></span><time>'+esc(since(item.created_at))+'</time></button>').join(''):'<div class="mhdEmpty">Aucune information importante pour le moment.</div>')+'</section>')
 }

 const avatarRows=[];
 if(widgetVisible('team_today')){
  const shown=todayTeam.slice(0,3),extra=Math.max(0,todayTeam.length-shown.length),target='planning.html?week='+encodeURIComponent(weekStart)+'&day='+encodeURIComponent(todayKey);
  sections.push('<section class="mhdCard mhdSection mhdTeamSection'+(taskMode(state.profile.role)==='editor'?' editorCompanion':'')+'"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('team_today')+'</span><strong class="mhdTeamHeading">Équipe aujourd’hui</strong></div><button class="mhdSectionLink" type="button" data-home-nav="'+esc(target)+'">Voir le planning ›</button></div>'+(shown.length?'<div class="mhdTeam">'+shown.map((item,index)=>{
    const id='team-'+index;
    if(item.profile)avatarRows.push({id,profile:item.profile});
    return '<div class="mhdPerson"><span class="mhdAvatar" data-home-team-avatar="'+id+'" style="background-color:'+esc(item.profile?.profile_color||'#ff5a2a')+'">'+esc(avatarInitials(item.name))+'</span><strong>'+esc(item.name)+'</strong><small>'+esc(item.profile?roleLabel(item.profile.role):'Équipe')+'</small></div>'
  }).join('')+(extra?'<span class="mhdMorePeople">+'+extra+'</span>':'')+'</div>':'<div class="mhdEmpty">'+(snapshot.planningLoadError?'Impossible de vérifier l’équipe du jour.':'Aucun membre planifié aujourd’hui.')+'</div>')+'</section>')
 }

 if(widgetVisible('quick_access')){
  const modules=allowedModules().slice(0,4);
  if(modules.length)sections.push('<section class="mhdCard mhdSection mhdQuickSection"><div class="mhdSectionHead"><div class="mhdTitleWithIcon"><span class="mhdIcon">'+dashboardIcon('quick_access')+'</span><strong>Accès rapides</strong></div></div><div class="mhdQuickGrid">'+modules.map(module=>'<button class="mhdQuick" type="button" data-home-nav="'+esc(module.url)+'"><span class="mhdQuickIcon">'+icon(module.id)+'</span><strong>'+esc(module.label)+'</strong></button>').join('')+'</div></section>')
 }

 if(!state.mounted||token!==state.renderToken)return;
 state.dashboard.innerHTML='<div class="mhdStack">'+sections.join('')+'</div>';
 if(!offline&&exactCurrentWeek?.__planningRevisionAt&&!snapshot.planningLoadError){
  services()?.markPlanningDayRead?.(todayKey,'mobile_home',exactCurrentWeek.__planningRevisionAt).catch?.(()=>{});
 }
 const todaySelf=todayModel?dayFacts(todayModel,todayKey,state.name):{hours:0,ranges:[]};
 if(window.NethorOperationsWidget?.mount){
  await window.NethorOperationsWidget.mount({
   host:state.dashboard,db:state.db,session:state.session,profile:state.profile,config:state.config,
   subroleKeys:services()?.subroleKeys||[],todayKey,
   service:{hours:todaySelf.hours,ranges:todaySelf.ranges,weekHours:currentHours,nextShift},
   tasks:{rows:state.tasks,assignees:state.assignees,completions:state.completions,team:state.team}
  })
 }
 paintTeamAvatars(avatarRows).catch(()=>{})
}

function scheduleRender(options={}){
 clearTimeout(state.refreshTimer);
 if(options?.invalidate!==false)state.preloaded=null;
 state.refreshTimer=setTimeout(()=>{if(state.mounted)render().catch(error=>console.error('[Nethor HomeView] refresh',error))},120)
}
function startRealtime(){
 if(!state.db||!state.session)return;
 stopRealtime();
 const sync=window.NethorMobileSync;
 if(sync?.active&&typeof sync.subscribe==='function'){
  state.unsubscribeSync=sync.subscribe(['planning','absences','tasks','team','resume'],()=>scheduleRender());
  return
 }
 const uid=state.session.user.id;
 const planning=state.db.channel('mobile-home-planning-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'planning_weeks'},scheduleRender).subscribe();
 const tasks=state.db.channel('mobile-home-tasks-'+uid)
  .on('postgres_changes',{event:'*',schema:'public',table:'daily_tasks'},scheduleRender)
  .on('postgres_changes',{event:'*',schema:'public',table:'daily_task_assignees'},scheduleRender)
  .on('postgres_changes',{event:'*',schema:'public',table:'daily_task_completions'},scheduleRender)
  .subscribe();
 const team=state.db.channel('mobile-home-team-'+uid).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},scheduleRender).subscribe();
 state.channels=[planning,tasks,team]
}
function stopRealtime(){
 if(typeof state.unsubscribeSync==='function')state.unsubscribeSync();
 state.unsubscribeSync=null;
 if(!state.db)return;
 state.channels.forEach(channel=>{try{state.db.removeChannel(channel)}catch(_){}});
 state.channels=[]
}
function onReturnToApp(){if(!window.NethorMobileSync?.active&&state.mounted&&document.visibilityState!=='hidden')scheduleRender()}
function onServiceChange(detail){
 if(!state.mounted)return;
 if(detail?.type==='notifications'){scheduleRender({invalidate:false});return}
 if(['ready','core','permissions'].includes(detail?.type))scheduleRender()
}
function onClick(event){
 const nav=event.target?.closest?.('[data-home-nav]');
 if(nav){event.preventDefault();navigate(nav.getAttribute('data-home-nav'));return}
 const link=event.target?.closest?.('a[href]');
 if(link&&state.host?.contains(link)){
  const href=link.getAttribute('href');
  if(href&&!href.startsWith('#')&&!/^javascript:/i.test(href)){event.preventDefault();navigate(href);return}
 }
 const button=event.target?.closest?.('[data-home-action]');if(!button)return;
 const action=button.dataset.homeAction;
 if(action==='task-composer'){
  const box=state.dashboard?.querySelector('#mhdTaskComposer');if(!box)return;
  box.classList.toggle('hidden');if(!box.classList.contains('hidden')){syncComposer();setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),30)}
 }else if(action==='task-group'){
  const group=button.closest('[data-task-group]'),grid=group?.querySelector('.mhdTaskTemplateGrid');if(!grid)return;
  const open=!grid.classList.toggle('hidden');button.setAttribute('aria-expanded',String(open))
 }else if(action==='task-template'){
  button.classList.toggle('selected');
  const facing=state.dashboard?.querySelector('[data-task-template="facing_sec"]')?.classList.contains('selected');
  state.dashboard?.querySelector('#mhdFacingDetail')?.classList.toggle('hidden',!facing);syncComposer()
 }else if(action==='task-user'){
  button.classList.toggle('selected');button.setAttribute('aria-pressed',String(button.classList.contains('selected')));
  const box=button.closest('.mhdTaskComposer'),count=box?.querySelectorAll('[data-task-user].selected').length||0,msg=box?.querySelector('#mhdTaskComposerState'),publish=box?.querySelector('[data-home-action="task-publish"]');
  if(publish)publish.disabled=count===0;if(msg)msg.textContent=count?count+' destinataire'+(count>1?'s':'')+' sélectionné'+(count>1?'s':'')+'.':'Sélectionne au moins une personne de l’équipe d’après-midi.'
 }else if(action==='task-publish')publishTasks(button);
 else if(action==='task-delete')deleteTask(button.dataset.taskId,button);
 else if(action==='task-reset')resetTasks(button);
 else if(action==='task-toggle')toggleTask(button.dataset.taskId,button)
}
function onInput(event){if(event.target?.matches?.('[data-home-task-custom]'))syncComposer()}

async function mount(host){
 state.host=host;state.mounted=true;state.renderToken++;
 document.title='Nethor';
 host.innerHTML='<div class="nethorHomeView" data-home-view><section class="homeMobileDashboard" data-home-dashboard aria-live="polite"><div class="mhdCard mhdSection"><div class="mhdEmpty">Chargement de ton espace de travail…</div></div></section></div>';
 state.dashboard=host.querySelector('[data-home-dashboard]');
 host.addEventListener('click',onClick);
 host.addEventListener('input',onInput);
 const shared=services();
 await shared?.ready?.();
 if(!state.mounted)return false;
 state.unsubscribe=shared?.subscribe?.(onServiceChange,{immediate:false})||null;
 state.session=shared?.session||null;state.db=shared?.client||null;
 startRealtime();
 document.addEventListener('visibilitychange',onReturnToApp);
 window.addEventListener('online',onReturnToApp);
 window.addEventListener('pageshow',onReturnToApp);
 await render();
 return true
}
async function unmount(){
 state.mounted=false;state.renderToken++;
 clearTimeout(state.refreshTimer);
 if(typeof state.unsubscribe==='function')state.unsubscribe();
 state.unsubscribe=null;
 stopRealtime();
 document.removeEventListener('visibilitychange',onReturnToApp);
 window.removeEventListener('online',onReturnToApp);
 window.removeEventListener('pageshow',onReturnToApp);
 try{await window.NethorOperationsWidget?.unmount?.()}catch(_){}
 if(state.host){
  state.host.removeEventListener('click',onClick);
  state.host.removeEventListener('input',onInput);
  state.host.innerHTML=''
 }
 state.host=null;state.dashboard=null;state.profile=null;state.session=null;state.db=null;
 state.afternoonUserIds=[];
 return true
}

const api=Object.freeze({mount,unmount,preload,render,navigate});
window.NethorMobileHomeView=api;
const mobileRouter=router();
if(mobileRouter?.register)mobileRouter.register('home',api);
})();
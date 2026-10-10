(function(){
'use strict';
const DEFAULTS={
 enabled:true,
 management:{platform:'desktop',category:'home'},
 widgets:{
  store_banner:{enabled:true,label:'Point de vente'},
  present_staff:{enabled:true,label:'Effectif présent'},
  planning_coverage:{enabled:true,label:'Couverture planning'},
  daily_tasks:{enabled:true,label:'Tâches du jour'},
  critical_alerts:{enabled:true,label:'Alertes critiques'},
  deliveries:{enabled:true,label:'Livraisons attendues'},
  priorities:{enabled:true,label:'Priorités immédiates',max_items:5},
  planning_view:{enabled:true,label:'Vue magasin aujourd’hui',show_all_day:true,max_items:6},
  team_service:{enabled:true,label:'Équipe en service',max_items:5},
  operations_followup:{enabled:true,label:'Suivi opérationnel',max_items:6},
  priority_messages:{enabled:true,label:'Messages prioritaires',max_items:4},
  quick_actions:{enabled:true,label:'Actions rapides'}
 },
 quick_actions:{
  incident:{enabled:true,label:'Nouveau signalement',url:'report-problem.html',icon:'alert'},
  task:{enabled:true,label:'Voir les tâches',url:'home.html#nethorDesktopFollowupWidget',icon:'task'},
  planning:{enabled:true,label:'Importer planning',url:'planning.html',icon:'calendar'},
  scanner:{enabled:true,label:'Ouvrir le scanner',url:'scanner.html',icon:'scan'}
 },
 style:{accent:'#ff5a2a',radius:16,gap:14}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr=esc;
function deepMerge(base,raw){
 const out={...base,...(raw&&typeof raw==='object'?raw:{})};
 for(const key of ['widgets','quick_actions','style']){
  out[key]={...(base[key]||{}),...((raw&&raw[key]&&typeof raw[key]==='object')?raw[key]:{})}
 }
 for(const [key,value] of Object.entries(base.widgets||{}))out.widgets[key]={...value,...(out.widgets[key]&&typeof out.widgets[key]==='object'?out.widgets[key]:{})};
 for(const [key,value] of Object.entries(base.quick_actions||{}))out.quick_actions[key]={...value,...(out.quick_actions[key]&&typeof out.quick_actions[key]==='object'?out.quick_actions[key]:{})};
 return out
}
function config(site){return deepMerge(DEFAULTS,site?.desktop_dashboard_widget)}
function enabled(w){return w?.enabled!==false}
function int(v,fallback,min=1,max=20){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function clock(v){const h=Math.floor(v),m=Math.round((v-h)*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
function ranges(row=[],model={}){
 const out=[];let start=null;
 for(let i=0;i<=row.length;i++){
  const on=i<row.length&&(row[i]==='g'||row[i]==='b');
  if(on&&start===null)start=i;
  if(!on&&start!==null){out.push({a:(model.startTime??6)+start*.25,b:(model.startTime??6)+i*.25});start=null}
 }
 return out
}
function personProfile(name,rows=[]){
 const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const n=norm(name),base=n.replace(/\s+[a-z]$/,'');
 return rows.find(x=>{const p=norm(x?.display_name),pb=p.replace(/\s+[a-z]$/,'');return p===n||pb===n||p===base||pb===base})||null
}
function peopleNow(model,dateKey,profiles=[],now=new Date()){
 if(!model?.days?.[dateKey])return[];
 const nowHour=now.getHours()+now.getMinutes()/60,out=[];
 (model.employees||[]).forEach((e,i)=>{
  const rs=ranges(model.days[dateKey].cells?.[i]||[],model),current=rs.find(r=>nowHour>=r.a&&nowHour<r.b);
  if(!current)return;
  const profile=personProfile(e?.name,profiles);
  out.push({name:String(e?.name||profile?.display_name||'Utilisateur'),profile,current,ranges:rs})
 });
 return out.sort((a,b)=>a.current.a-b.current.a||a.name.localeCompare(b.name,'fr',{sensitivity:'base'}))
}
function peopleToday(model,dateKey,profiles=[]){
 if(!model?.days?.[dateKey])return[];
 return (model.employees||[]).flatMap((e,i)=>{const rs=ranges(model.days[dateKey].cells?.[i]||[],model);if(!rs.length)return[];const profile=personProfile(e?.name,profiles);return[{name:String(e?.name||profile?.display_name||'Utilisateur'),profile,current:rs[0],ranges:rs}]})
 .sort((a,b)=>a.current.a-b.current.a||a.name.localeCompare(b.name,'fr',{sensitivity:'base'}))
}
function todayTeamCount(model,dateKey){
 if(!model?.days?.[dateKey])return 0;
 return (model.employees||[]).reduce((n,e,i)=>n+((model.days[dateKey].cells?.[i]||[]).some(v=>v==='g'||v==='b')?1:0),0)
}
function coverage(model,dateKey){
 const rows=model?.days?.[dateKey]?.cells||[];if(!rows.length)return null;
 const max=Math.max(0,...rows.map(r=>r?.length||0));if(!max)return null;
 const occupied=[];
 for(let i=0;i<max;i++)occupied[i]=rows.some(r=>r?.[i]==='g'||r?.[i]==='b');
 const first=occupied.indexOf(true),last=occupied.lastIndexOf(true);if(first<0||last<first)return null;
 const span=last-first+1,filled=occupied.slice(first,last+1).filter(Boolean).length;
 return Math.round(filled/span*100)
}
function normName(value){return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function planningDayAnomalyCount(model,dateKey,profiles=[],absences=[]){
 const day=model?.days?.[dateKey];if(!model||!day)return null;
 const rows=day.cells||[],employees=model.employees||[];let count=0;
 employees.forEach((emp,ri)=>{
  const row=rows[ri]||[],rs=ranges(row,model),total=row.reduce((n,v)=>n+((v==='g'||v==='b')?1:0),0)*.25;
  if(total>10)count++;
  for(const r of rs)if(r.b-r.a<=.5)count++;
  for(let i=1;i<rs.length;i++)if(rs[i].a-rs[i-1].b>=2)count++;
  if(total>0){
   const profile=personProfile(emp?.name,profiles),id=profile?.id,name=normName(profile?.display_name||emp?.name);
   count+=(absences||[]).filter(a=>{
    if(!['approved','pending'].includes(String(a?.status||'')))return false;
    if(String(a?.start_date||'')>dateKey||String(a?.end_date||'')<dateKey)return false;
    return id?String(a?.user_id||'')===String(id):normName(a?.display_name)===name
   }).length
  }
 });
 const max=Math.max(0,...rows.map(r=>r?.length||0));
 if(max){
  const occupied=Array.from({length:max},(_,i)=>rows.reduce((n,row)=>n+(((row?.[i]==='g'||row?.[i]==='b')?1:0)),0));
  const first=occupied.findIndex(n=>n>0),last=occupied.length-1-[...occupied].reverse().findIndex(n=>n>0);
  if(first>=0&&last>=first&&occupied.slice(first,last+1).some(n=>n===1))count++
 }
 return count
}
function taskState(ctx,row){
 const team=(ctx.taskTeam||[]).filter(x=>['responsable','employe'].includes(String(x.role||'').toLowerCase()));
 const expected=row.all_users?team.length:(ctx.taskAssignees||[]).filter(x=>x.task_id===row.id).length;
 const completed=(ctx.taskCompletions||[]).filter(x=>x.task_id===row.id).length;
 return{expected,completed,status:expected>0&&completed>=expected?'done':completed>0?'partial':'todo'}
}
function taskStats(ctx){
 const rows=ctx.taskRows||[],states=rows.map(row=>({row,...taskState(ctx,row)}));
 return{total:rows.length,done:states.filter(x=>x.status==='done').length,states}
}
function since(value){
 const t=new Date(value).getTime();if(!t)return'';
 const d=Math.max(0,Date.now()-t),m=Math.floor(d/60000);
 if(m<1)return"à l’instant";if(m<60)return'il y a '+m+' min';const h=Math.floor(m/60);if(h<24)return'il y a '+h+' h';return'il y a '+Math.floor(h/24)+' j'
}
function icon(kind){
 const common='viewBox="0 0 24 24" aria-hidden="true"';
 const m={
  team:'<svg '+common+'><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.4 2.3-5.1 5.5-5.1s5 1.7 5.5 5.1"/><circle cx="17" cy="9" r="2.3"/><path d="M15.2 14.2c3-.3 4.8 1.2 5.3 4.2"/></svg>',
  calendar:'<svg '+common+'><rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.2h17"/></svg>',
  task:'<svg '+common+'><rect x="4" y="4" width="16" height="16" rx="2.6"/><path d="m8 12 2.3 2.3L16.5 8"/></svg>',
  alert:'<svg '+common+'><path d="M12 3 21 20H3L12 3Z"/><path d="M12 9v5M12 17.2v.2"/></svg>',
  truck:'<svg '+common+'><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  chat:'<svg '+common+'><path d="M4 5h16v12H9l-5 3V5Z"/><path d="M8 9h8M8 13h5"/></svg>',
  scan:'<svg '+common+'><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
  clock:'<svg '+common+'><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  bolt:'<svg '+common+'><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/></svg>'
 };
 return m[kind]||m.task
}
function kpi(id,label,value,sub,kind,progress,extra=''){
 const interactive=id==='alerts'?' role="button" tabindex="0" aria-haspopup="dialog" aria-label="Voir les anomalies du planning par jour et sur la semaine" title="Détails des anomalies du planning"':'';
 const p=Number.isFinite(progress)?'<div class="ndKpiProgress"><i style="width:'+Math.max(0,Math.min(100,progress))+'%"></i></div>':'';
 return '<article class="ndKpi ndKpi-'+id+'" id="'+extra+'"'+interactive+'><span class="ndKpiIcon">'+icon(kind)+'</span><div class="ndKpiBody"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+p+'</div><span class="ndKpiArrow">›</span></article>'
}
function sectionHead(label,count,actionLabel,url,iconKind){
 return '<div class="ndSectionHead"><div class="ndSectionTitle"><span class="ndSectionIcon">'+icon(iconKind)+'</span><strong>'+esc(label)+'</strong>'+(Number.isFinite(count)&&count>0?'<b>'+count+'</b>':'')+'</div>'+(url?'<button type="button" data-desktop-home-url="'+attr(url)+'">'+esc(actionLabel||'Voir tout')+' <span>→</span></button>':'')+'</div>'
}
function priorityRows(ctx,chatRows,deliveries,max){
 const out=[],tasks=taskStats(ctx).states.filter(x=>x.status!=='done');
 tasks.forEach(x=>out.push({kind:'task',title:x.row.title||'Tâche du jour',sub:x.row.section_label||'Tâche',state:x.status==='partial'?'En cours':'À faire',cls:x.status==='partial'?'amber':'orange',url:'home.html#nethorDesktopFollowupWidget',time:''}));
 (ctx.notifications||[]).filter(n=>!n.read_at).forEach(n=>out.push({kind:'alert',title:n.title||'Information à traiter',sub:n.message||'',state:'Nouveau',cls:'red',url:n.target_url||'notifications.html',time:since(n.created_at)}));
 deliveries.filter(x=>!['put_away','cancelled'].includes(x.status)).forEach(x=>out.push({kind:'truck',title:'Livraison '+(x.supplier||x.stream||''),sub:[x.expected_label,x.position_label].filter(Boolean).join(' · '),state:x.status==='received'?'Reçue':'À suivre',cls:x.status==='received'?'green':'blue',url:'home.html#nethorDesktopDeliveriesKpi',time:''}));
 chatRows.filter(x=>Number(x.unread_count)>0).forEach(x=>out.push({kind:'chat',title:x.conversation_name||'Message équipe',sub:x.last_message||'',state:'Message',cls:'blue',url:'chat.html',time:since(x.last_message_at)}));
 return out.slice(0,max)
}
function renderPriorities(ctx,w,chatRows,deliveries){
 const max=int(w.max_items,5,1,10),rows=priorityRows(ctx,chatRows,deliveries,max);
 return '<section class="ndCard ndPriorities" id="nethorDesktopPriorities">'+sectionHead(w.label,rows.length,'Voir toutes les tâches','home.html#nethorDesktopFollowupWidget','alert')+
  '<div class="ndRows">'+(rows.length?rows.map(x=>'<button class="ndPriorityRow" type="button" data-desktop-home-url="'+attr(x.url)+'"><span class="ndRowIcon '+esc(x.cls)+'">'+icon(x.kind)+'</span><span class="ndRowCopy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span><span class="ndRowState '+esc(x.cls)+'">'+esc(x.state)+'</span><time>'+esc(x.time)+'</time><span class="ndRowArrow">›</span></button>').join(''):'<div class="ndEmpty">Aucune priorité immédiate détectée.</div>')+'</div></section>'
}
function renderTeam(ctx,w,people){
 const rows=people;
 return '<section class="ndCard ndTeam" id="nethorDesktopTeamWidget">'+sectionHead(w.label,people.length,'Voir toute l’équipe','planning.html','team')+
  '<div class="ndTeamRows">'+(rows.length?rows.map(x=>{const role=x.profile?.role?window.NettoProfileUI?.roleLabel?.(x.profile.role)||x.profile.role:'Équipe',initials=String(x.name).split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join('');return'<div class="ndTeamRow"><span class="ndAvatar" style="--nd-avatar:'+attr(x.profile?.profile_color||'#ff7a3d')+'">'+esc(initials||'U')+'</span><span class="ndTeamCopy"><strong>'+esc(x.name)+'</strong><small>'+esc(role)+'</small></span><span class="ndTeamShift">'+esc(clock(x.current.a)+' – '+clock(x.current.b))+'</span><span class="ndPresence">● Présent</span></div>'}).join(''):'<div class="ndEmpty">Aucun membre actuellement en poste.</div>')+'</div></section>'
}
function renderFollowup(ctx,w,deliveries){
 const max=int(w.max_items,6,1,10),states=taskStats(ctx).states.slice(0,max);
 const rows=states.map(x=>({title:x.row.title||'Tâche',sub:x.row.section_label||'',status:x.status,meta:x.expected?x.completed+'/'+x.expected:'—'}));
 if(rows.length<max)deliveries.filter(x=>!['put_away','cancelled'].includes(x.status)).slice(0,max-rows.length).forEach(x=>rows.push({title:'Réception '+(x.supplier||x.stream||'livraison'),sub:x.expected_label||'Livraison du jour',status:x.status==='received'?'done':'todo',meta:x.status==='received'?'Terminé':'À suivre'}));
 const done=rows.filter(x=>x.status==='done').length;
 return '<section class="ndCard ndFollowup" id="nethorDesktopFollowupWidget">'+sectionHead(w.label,undefined,null,null,'task')+'<div class="ndFollowupProgress"><span><i style="width:'+(rows.length?Math.round(done/rows.length*100):0)+'%"></i></span><b>'+done+' / '+rows.length+'</b></div><div class="ndFollowRows">'+(rows.length?rows.map(x=>'<div class="ndFollowRow"><span class="ndCheck '+esc(x.status)+'">'+(x.status==='done'?'✓':x.status==='partial'?'◐':'')+'</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span><b class="'+esc(x.status)+'">'+esc(x.status==='done'?'Terminé':x.status==='partial'?'En cours':x.meta||'À faire')+'</b></div>').join(''):'<div class="ndEmpty">Aucun suivi opérationnel publié aujourd’hui.</div>')+'</div></section>'
}
function renderMessages(ctx,w,chatRows){
 const max=int(w.max_items,4,1,8),profiles=ctx.profileRows||[];
 const rows=[...chatRows].sort((a,b)=>(Number(b.unread_count>0)-Number(a.unread_count>0))||new Date(b.last_message_at||0)-new Date(a.last_message_at||0)).slice(0,max);
 return '<section class="ndCard ndMessages">'+sectionHead(w.label,rows.reduce((n,x)=>n+Number(x.unread_count||0),0),'Voir tous les messages','chat.html','chat')+'<div class="ndMessageRows">'+(rows.length?rows.map(x=>{const sender=profiles.find(p=>p.id===x.last_sender),name=sender?.display_name||x.conversation_name||'Conversation',initials=String(name).split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join('');return'<button class="ndMessageRow" type="button" data-desktop-home-url="chat.html"><span class="ndAvatar small" style="--nd-avatar:'+attr(sender?.profile_color||'#8b6de8')+'">'+esc(initials||'M')+'</span><span><strong>'+esc(name)+'</strong><small>'+esc(x.last_message||'Aucun aperçu disponible')+'</small></span><time>'+esc(since(x.last_message_at))+'</time>'+(Number(x.unread_count)>0?'<i></i>':'')+'</button>'}).join(''):'<div class="ndEmpty">Aucun message récent.</div>')+'</div></section>'
}
function renderQuickActions(site,w){
 const c=config(site),items=Object.entries(c.quick_actions).filter(([,x])=>enabled(x));
 return '<section class="ndCard ndActions">'+sectionHead(w.label,undefined,null,null,'bolt')+'<div class="ndActionGrid">'+items.map(([key,x])=>'<button type="button" data-desktop-home-action="'+attr(key)+'" data-desktop-home-url="'+attr(x.url)+'"><span class="'+esc(key)+'">'+icon(x.icon||key)+'</span><strong>'+esc(x.label)+'</strong></button>').join('')+'</div></section>'
}
async function safeQueries(ctx){
 const db=ctx.db,today=ctx.todayKey,now=new Date().toISOString(),weekStart=ctx.weekStart||today,weekEnd=window.NethorPlanningAnomalyCore?.plusDays?.(weekStart,6)||today;
 const results=await Promise.allSettled([
  db.rpc('list_chat_conversations'),
  db.from('operations_deliveries').select('id,delivery_date,stream,supplier,expected_label,expected_at,supports,position_label,status,note,created_at').eq('delivery_date',today).order('created_at',{ascending:false}).limit(40),
  db.from('operations_flashes').select('id,category,title,body,active,starts_at,expires_at,created_at').eq('active',true).lte('starts_at',now).or('expires_at.is.null,expires_at.gte.'+now).order('created_at',{ascending:false}).limit(40),
  db.from('planning_absences').select('id,user_id,display_name,type,start_date,end_date,status').lte('start_date',weekEnd).gte('end_date',weekStart).in('status',['approved','pending'])
 ]);
 const data=x=>x.status==='fulfilled'&&!x.value?.error?(x.value.data||[]):[];
 return{
  chat:data(results[0]),deliveries:data(results[1]),flashes:data(results[2]),absences:data(results[3]),
  deliveryAvailable:results[1].status==='fulfilled'&&!results[1].value?.error,
  absenceAvailable:results[3].status==='fulfilled'&&!results[3].value?.error
 }
}
async function render(ctx){
 const c=config(ctx.cfg||{});if(c.enabled===false)return{html:'',config:c};
 const ext=await safeQueries(ctx),now=new Date(),people=peopleToday(ctx.todayModel,ctx.todayKey,ctx.profileRows),currentlyWorking=peopleNow(ctx.todayModel,ctx.todayKey,ctx.profileRows,now),teamTotal=todayTeamCount(ctx.todayModel,ctx.todayKey),cov=coverage(ctx.todayModel,ctx.todayKey),tasks=taskStats(ctx);
 const criticalKinds=new Set(['maintenance','password_reset_request','security','incident','problem']);
 const alertCount=(ctx.notifications||[]).filter(n=>!n.read_at&&criticalKinds.has(String(n.kind||''))).length+ext.flashes.filter(x=>['material','procedure'].includes(x.category)).length;
 const belongsToWeek=model=>{
  if(!model?.days||!ctx.weekStart)return false;
  const next=window.NethorPlanningAnomalyCore?.plusDays?.(ctx.weekStart,6)||ctx.todayKey;
  return Object.keys(model.days).some(date=>date>=ctx.weekStart&&date<=next)
 };
 const weekModel=belongsToWeek(ctx.currentWeek)?ctx.currentWeek:belongsToWeek(ctx.todayModel)?ctx.todayModel:null;
 const anomalyReport=window.NethorPlanningAnomalyCore?.analyze?.(weekModel,ctx.weekStart,ctx.profileRows,ext.absences)||null;
 const currentAnomalyDay=anomalyReport?.days?.find(x=>x.date===ctx.todayKey);
 const planningAnomalyCount=currentAnomalyDay?currentAnomalyDay.count:planningDayAnomalyCount(ctx.todayModel,ctx.todayKey,ctx.profileRows,ext.absences);
 const anomalyAllowedByRule=ctx.cfg?.planning_widgets?.anomalies?.[String(ctx.profile?.role||'')]!==false;
 let anomalyPlanningLevel='view';
 try{anomalyPlanningLevel=window.NettoProfileUI?.permissionLevel?.('planning',ctx.profile)||'view'}catch(_){}
 const canInspectAnomalies=anomalyAllowedByRule&&anomalyPlanningLevel!=='none';
 const kpis=[],wd=c.widgets;
 if(enabled(wd.present_staff))kpis.push(kpi('staff',wd.present_staff.label,currentlyWorking.length+' / '+teamTotal,currentlyWorking.length?'actuellement en poste':'aucune présence actuellement','team',teamTotal?Math.round(currentlyWorking.length/teamTotal*100):0));
 if(enabled(wd.planning_coverage))kpis.push(kpi('coverage',wd.planning_coverage.label,cov==null?'—':cov+' %',cov==null?'planning non renseigné':'continuité des plages planifiées','calendar',cov??0));
 if(enabled(wd.daily_tasks))kpis.push(kpi('tasks',wd.daily_tasks.label,tasks.done+' / '+tasks.total,tasks.total?'missions publiées aujourd’hui':'aucune tâche publiée','task',tasks.total?Math.round(tasks.done/tasks.total*100):0));
 if(enabled(wd.critical_alerts)){
  const anomalyValue=planningAnomalyCount===null?'—':String(planningAnomalyCount);
  const anomalyText=planningAnomalyCount===null?'planning du jour non renseigné':planningAnomalyCount?(planningAnomalyCount+' anomalie'+(planningAnomalyCount>1?'s':'')+' détectée'+(planningAnomalyCount>1?'s':'')+' aujourd’hui'):'aucune anomalie détectée aujourd’hui';
  kpis.push(kpi('alerts',wd.critical_alerts.label,anomalyValue,anomalyText,'alert',planningAnomalyCount===null?undefined:Math.min(100,planningAnomalyCount*20)))
 }
 if(enabled(wd.deliveries))kpis.push(kpi('deliveries',wd.deliveries.label,ext.deliveryAvailable?String(ext.deliveries.filter(x=>!['put_away','cancelled'].includes(x.status)).length):'—',ext.deliveryAvailable?'actives aujourd’hui':'données non accessibles','truck',undefined,'nethorDesktopDeliveriesKpi'));
 const style='--nd-accent:'+attr(c.style.accent||'#ff5a2a')+';--nd-radius:'+int(c.style.radius,16,10,28)+'px;--nd-gap:'+int(c.style.gap,14,8,24)+'px';
 const parts=[];
 // Store banner remains untouched. Only the dashboard widgets change layout.
 if(enabled(wd.store_banner)&&ctx.storeInfoHtml)parts.push('<div class="ndHeroSlot">'+ctx.storeInfoHtml+'</div>');
 if(kpis.length)parts.push('<div class="ndKpiGrid" id="nethorDesktopStatsRow" style="--nd-kpi-count:'+kpis.length+'">'+kpis.join('')+'</div>');
 // The daily timeline is the principal widget; messages and quick actions share
 // an independent right column. Optional widgets remain accessible below.
 const primary=[];
 if(enabled(wd.planning_view))primary.push('<section class="ndPlanningSlot">'+(ctx.quickPlanningHtml||'<div class="ndCard ndEmpty">Planning indisponible.</div>')+'</section>');
 if(enabled(wd.priorities))primary.push(renderPriorities(ctx,wd.priorities,ext.chat,ext.deliveries));
 const sidebar=[];
 if(enabled(wd.priority_messages))sidebar.push(renderMessages(ctx,wd.priority_messages,ext.chat));
 if(enabled(wd.quick_actions))sidebar.push(renderQuickActions(ctx.cfg||{},wd.quick_actions));
 if(primary.length||sidebar.length){
  const gridClass='ndWidgetGrid'+(!primary.length?' ndWidgetGrid--asideOnly':'')+(!sidebar.length?' ndWidgetGrid--primaryOnly':'');
  parts.push('<div class="'+gridClass+'">'+
   (primary.length?'<div class="ndWidgetPrimary">'+primary.join('')+'</div>':'')+
   (sidebar.length?'<div class="ndWidgetAside">'+sidebar.join('')+'</div>':'')+
  '</div>');
 }
 const secondary=[];
 if(enabled(wd.team_service))secondary.push(renderTeam(ctx,wd.team_service,people));
 if(enabled(wd.operations_followup))secondary.push(renderFollowup(ctx,wd.operations_followup,ext.deliveries));
 if(secondary.length)parts.push('<div class="ndSupportingGrid">'+secondary.join('')+'</div>');
 return{html:'<div class="nethorDesktopReferenceDashboard" style="'+style+'">'+parts.join('')+'</div>',
  config:c,people,ext,tasks,alertCount,planningAnomalyCount,anomalyReport,canInspectAnomalies,
  anomalyContext:{db:ctx.db,weekStart:ctx.weekStart,todayKey:ctx.todayKey,model:weekModel,profiles:ctx.profileRows,absences:ext.absences,absencesAvailable:ext.absenceAvailable}
 }
}
// Le signalement express embarque la page officielle : aucune duplication de l'API de création.
function openQuickReport(){
 const fullPage='report-problem.html?from=home.html';
 if(typeof HTMLDialogElement==='undefined'){location.href=fullPage;return}
 let dialog=document.getElementById('nethorQuickReportDialog');
 if(!dialog){
  dialog=document.createElement('dialog');
  dialog.id='nethorQuickReportDialog';
  dialog.className='ndReportDialog';
  dialog.setAttribute('aria-labelledby','ndReportDialogTitle');
  dialog.setAttribute('aria-describedby','ndReportDialogDescription');
  dialog.innerHTML='<div class="ndReportShell">'+
   '<div class="ndReportHeader"><div class="ndReportHeaderText">'+
   '<strong id="ndReportDialogTitle">Signaler un problème</strong>'+
   '<span id="ndReportDialogDescription">Décris ce qui ne fonctionne pas. Le diagnostic est joint automatiquement.</span></div>'+
   '<button type="button" class="ndReportClose" data-nd-report-close aria-label="Fermer la fenêtre">×</button></div>'+
   '<iframe class="ndReportFrame" title="Formulaire Nethor de signalement de problème" referrerpolicy="same-origin"></iframe>'+
   '</div>';
  dialog.querySelector('[data-nd-report-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>dialog.querySelector('iframe')?.removeAttribute('src'));
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==dialog.querySelector('iframe')?.contentWindow)return;
   if(event.data?.type==='nethor:quick-report-close'&&dialog.open)dialog.close()
  });
  document.body.appendChild(dialog)
 }
 if(dialog.open)return;
 dialog.querySelector('iframe').src=fullPage+'&embedded=desktop-home';
 dialog.showModal();
}
function activate(result){
 const root=document.querySelector('.nethorDesktopReferenceDashboard');if(!root)return;
 const planningTitle=root.querySelector('.ndPlanningSlot .qplanTitleCopy strong');if(planningTitle&&result?.config?.widgets?.planning_view?.label)planningTitle.textContent=result.config.widgets.planning_view.label;
 const anomalyTile=root.querySelector('.ndKpi-alerts[role="button"]');
 if(anomalyTile&&result?.canInspectAnomalies===false){
  anomalyTile.removeAttribute('role');anomalyTile.removeAttribute('tabindex');anomalyTile.removeAttribute('aria-haspopup');
  anomalyTile.title='Détail des anomalies réservé aux utilisateurs autorisés sur le planning';
 }
 if(anomalyTile&&result?.canInspectAnomalies!==false&&!anomalyTile.dataset.ndAnomalyBound){
  anomalyTile.dataset.ndAnomalyBound='1';
  const open=()=>window.NethorHomeAnomalyDialog?.open?.({...result.anomalyContext,report:result.anomalyReport});
  anomalyTile.addEventListener('click',open);
  anomalyTile.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}
  });
 }
 root.querySelectorAll('[data-desktop-home-url]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.dataset.desktopHomeAction==='incident'){openQuickReport();return}
  if(btn.dataset.desktopHomeAction==='planning'){
   if(typeof window.NethorPlanningQuickImport?.open==='function')window.NethorPlanningQuickImport.open();
   else console.error('Importateur Excel indisponible sur l’accueil.');
   return;
  }
  const url=btn.dataset.desktopHomeUrl;
  if(url)location.href=url;
 }));
 const badges={tasks:Math.max(0,(result?.tasks?.total||0)-(result?.tasks?.done||0)),chat:(result?.ext?.chat||[]).reduce((n,x)=>n+Number(x.unread_count||0),0),incidents:Number(result?.alertCount||0),receptions:(result?.ext?.deliveries||[]).filter(x=>!['put_away','cancelled'].includes(x.status)).length};
 Object.entries(badges).forEach(([key,value])=>{const b=document.querySelector('.nethorSidebarItem[data-sidebar-key="'+key+'"] .nethorSidebarBadge');if(!b)return;b.textContent=value>99?'99+':String(value);b.classList.toggle('hidden',!value)})
}
window.NethorDesktopHomeDashboard=Object.freeze({render,activate,defaults:DEFAULTS});
})();
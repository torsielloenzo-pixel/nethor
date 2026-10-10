const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co',SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let ROLES=['admin','responsable','employe','lecture'];const ROLE_LABEL={admin:'Administrateur',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'};
function roleName(r){return config?.role_definitions?.[r]?.label||ROLE_LABEL[r]||r||'Compte'}
let session=null,profile=null,config={},dirty=false,notificationUsers=[],notificationRules=[],portalLogs=[],reportedProblems=[],logSourceFilter='all',logTypeFilter='all',problemStatusFilter='all',problemPageFilter='all',problemSearchFilter='',accountSubview='accounts';
let managementArticles=[],managementFamilies=[],managementCategories=[],managementArticleSort={key:null,direction:'asc'};
let mobileThemeProfileFramesCache={light:[],dark:[],mineral:[],sage:[],plum:[],halloween:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr=esc;
function clone(v){return JSON.parse(JSON.stringify(v||{}))}
function validColor(v,f='#ff2f1f'){return /^#[0-9a-f]{6}$/i.test(String(v||''))?v:f}
function validUrl(v){const s=String(v||'').trim();return !s||(!/^\s*(javascript|data|vbscript):/i.test(s)&&(/^(https?:\/\/|\.\/|\.\.\/|[a-zA-Z0-9_./?=&%-]+$)/.test(s)))}
function markDirty(){dirty=true;$('saveState').textContent='Modifications non enregistrées';$('saveState').className='saveState'}
const MANAGEMENT_META={
 overview:{group:'Gestion',title:'Tableau de bord',description:'Vue d’ensemble de l’administration Nethor, organisée par nature de réglage.'},
 blocks:{group:'Accueil & interface',title:'Widgets d’accueil',description:'Affiche, masque et personnalise les widgets sans mélanger leur visibilité avec les droits utilisateurs.'},
 system:{group:'Accueil & interface',title:'Pages & fonctionnalités',description:'Gère l’existence, les libellés, les destinations et les emplacements des pages. Les droits utilisateurs sont séparés.'},
 mobile:{group:'Accueil & interface',title:'Mobile',description:'Gère la structure, la navigation et les composants propres à l’application mobile.'},
 desktop:{group:'Accueil & interface',title:'Desktop',description:'Gère la structure et les composants propres à l’interface ordinateur.'},
 general:{group:'Apparence & médias',title:'Identité & thèmes',description:'Nom, identité globale et couleurs communes de Nethor.'},
 sounds:{group:'Apparence & médias',title:'Sons & audio',description:'Gère l’identité sonore : connexion, bienvenue, déconnexion et interface.'},
 media:{group:'Apparence & médias',title:'Médias & logos',description:'Bibliothèque des ressources visuelles officielles de Nethor.'},
 articles:{group:'Contenus',title:'Fiches articles',description:'Administre le référentiel produits, familles, catégories et EAN13.'},
 notifications:{group:'Communication',title:'Notifications',description:'Gère les envois, règles globales et autorisations de notification.'},
 problems:{group:'Communication',title:'Problèmes signalés',description:'Consulte, diagnostique et traite les problèmes remontés.'},
 maintenance:{group:'Système',title:'Maintenance',description:'Contrôle la disponibilité du portail.'},
 logs:{group:'Système',title:'Journal des modifications',description:'Retrouve les mises à jour, patchs et modifications du portail.'}
}
const ACCOUNT_META={
 accounts:{title:'Comptes',description:'Création, profils et accès des utilisateurs.'},
 roles:{title:'Rôles & permissions',description:'Niveaux d’accès, permissions, sous-rôles et droits fonctionnels.'},
 logs:{title:'Activité utilisateurs',description:'Consultations, connexions et actions enregistrées pour les comptes.'}
};
function restructureManagementOverview(){const host=document.querySelector('#tab-overview .managementOverviewGrid');if(host)host.innerHTML="<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon orange\">⌂</span><div><strong>Accueil & interface</strong><small>Affichage, pages et plateformes.</small></div></div></div><div class=\"managementActionGrid\"><button onclick=\"showTab('blocks')\"><span>▥</span><div><strong>Widgets d’accueil</strong><small>Afficher, masquer, personnaliser</small></div><b>Ouvrir</b></button><button onclick=\"showTab('system')\"><span>▦</span><div><strong>Pages & fonctionnalités</strong><small>Structure et emplacements</small></div><b>Ouvrir</b></button><button onclick=\"showTab('mobile')\"><span>▣</span><div><strong>Mobile</strong><small>Interface et navigation mobile</small></div><b>Ouvrir</b></button><button onclick=\"showTab('desktop')\"><span>▤</span><div><strong>Desktop</strong><small>Interface ordinateur</small></div><b>Ouvrir</b></button></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon violet\">◈</span><div><strong>Apparence & médias</strong><small>Identité, connexion et sons.</small></div></div></div><div class=\"managementActionGrid\"><button onclick=\"showTab('general')\"><span>◈</span><div><strong>Identité & thèmes</strong><small>Nom et couleurs</small></div><b>Ouvrir</b></button><button onclick=\"showTab('login')\"><span>▤</span><div><strong>Écran de connexion</strong><small>Logos, fond et textes</small></div><b>Ouvrir</b></button><button onclick=\"showTab('media')\"><span>▧</span><div><strong>Médias & logos</strong><small>Bibliothèque visuelle</small></div><b>Ouvrir</b></button><button onclick=\"showTab('sounds')\"><span>♫</span><div><strong>Sons & audio</strong><small>Identité sonore</small></div><b>Ouvrir</b></button></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon orange\">▤</span><div><strong>Contenus</strong><small>Données métier administrées.</small></div></div><button onclick=\"showTab('articles')\">Gérer</button></div><div class=\"managementActionGrid managementActionGridSingle\"><button onclick=\"showTab('articles')\"><span>▤</span><div><strong>Fiches articles</strong><small>Produits, familles, catégories et EAN13</small></div><b>Ouvrir</b></button></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon green\">♙</span><div><strong>Utilisateurs & accès</strong><small>Comptes et droits réels, séparés de l’affichage.</small></div></div></div><div class=\"managementActionGrid managementActionGridThree\"><button onclick=\"showAccountsView('accounts')\"><span>♙</span><div><strong>Comptes</strong><small>Profils utilisateurs</small></div><b>Ouvrir</b></button><button onclick=\"showAccountsView('roles')\"><span>◇</span><div><strong>Rôles & permissions</strong><small>Droits fonctionnels</small></div><b>Ouvrir</b></button><button onclick=\"showAccountsView('logs')\"><span>≡</span><div><strong>Activité utilisateurs</strong><small>Consultations et actions</small></div><b>Ouvrir</b></button></div><div id=\"managementUsersPreview\" class=\"managementPreviewList\"><div class=\"managementEmpty\">Chargement des comptes…</div></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon blue\">♢</span><div><strong>Communication</strong><small>Diffusion et support terrain.</small></div></div></div><div class=\"managementActionGrid\"><button onclick=\"showTab('notifications')\"><span>♢</span><div><strong>Notifications</strong><small>Envoi et règles</small></div><b>Ouvrir</b></button><button onclick=\"showTab('problems')\"><span>!</span><div><strong>Problèmes signalés</strong><small>Diagnostic et traitement</small></div><b>Ouvrir</b></button></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon violet\">⚙</span><div><strong>Système</strong><small>Disponibilité et historique.</small></div></div></div><div class=\"managementActionGrid\"><button onclick=\"showTab('maintenance')\"><span>⚙</span><div><strong>Maintenance</strong><small>Disponibilité du portail</small></div><b>Ouvrir</b></button><button onclick=\"showTab('logs')\"><span>≡</span><div><strong>Journal des modifications</strong><small>MAJ et historique</small></div><b>Ouvrir</b></button></div></article>\n<article class=\"managementOverviewCard\"><div class=\"managementCardHead\"><div><span class=\"managementCardIcon blue\">◷</span><div><strong>Activité récente</strong><small>Dernières évolutions du portail.</small></div></div><button onclick=\"showTab('logs')\">Voir le journal</button></div><div id=\"managementLogsPreview\" class=\"managementPreviewList\"><div class=\"managementEmpty\">Chargement du journal…</div></div></article>"}
function toggleManagementNavGroup(key,button){
 const group=document.querySelector('.managementNavGroup[data-nav-group="'+CSS.escape(key)+'"]');if(!group)return;
 const opening=!group.classList.contains('open');
 document.querySelectorAll('.managementNavGroup').forEach(g=>{if(g!==group)g.classList.remove('open');g.querySelector('.managementNavParent')?.setAttribute('aria-expanded',g===group&&opening?'true':'false')});
 group.classList.toggle('open',opening);button?.setAttribute('aria-expanded',opening?'true':'false');
 if(opening)window.NettoSounds?.play?.('menuOpen');else window.NettoSounds?.play?.('menuClose')
}
function managementButtonFor(name){
 if(name==='accounts')return document.querySelector('[data-tab="accounts"][data-account-view="'+CSS.escape(accountSubview)+'"]');
 return document.querySelector('.managementSide [data-tab="'+CSS.escape(name)+'"]')
}
function activateManagementNav(btn){
 document.querySelectorAll('.managementSide [data-tab]').forEach(x=>x.classList.toggle('active',x===btn));
 document.querySelectorAll('.managementNavDirect[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));
 const activeGroup=btn?.closest?.('.managementNavGroup')||null;
 document.querySelectorAll('.managementNavGroup').forEach(group=>{
  const active=group===activeGroup;group.classList.toggle('activeGroup',active);
  if(active){group.classList.add('open');group.querySelector('.managementNavParent')?.setAttribute('aria-expanded','true')}
  else{group.classList.remove('open');group.querySelector('.managementNavParent')?.setAttribute('aria-expanded','false')}
 })
}
function updateManagementHero(name){
 let meta;
 if(name==='accounts'){
  const a=ACCOUNT_META[accountSubview]||ACCOUNT_META.accounts;
  meta={group:'Utilisateurs & accès',title:a.title,description:a.description}
 }else meta=MANAGEMENT_META[name]||MANAGEMENT_META.overview;
 if($('managementBreadcrumb'))$('managementBreadcrumb').innerHTML='Gestion <span>›</span> '+esc(meta.group)+(meta.title!==meta.group?' <span>›</span> '+esc(meta.title):'');
 if($('managementHeroTitle'))$('managementHeroTitle').textContent=meta.title;
 if($('managementHeroText'))$('managementHeroText').textContent=meta.description
}
function showTab(name,btn,opts={}){
 const aliases={pages:'system',identity:'general',navigation:'mobile',widgets:'blocks',computer:'desktop',audio:'sounds'};
 name=aliases[name]||name;
 const valid=['overview','general','system','mobile','desktop','sounds','blocks','accounts','articles','media','notifications','problems','maintenance','logs'];
 if(!valid.includes(name))name='overview';
 btn=btn||managementButtonFor(name);
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='tab-'+name));
 activateManagementNav(btn);
 const noSticky=['overview','accounts','articles','media','notifications','problems','logs'];
 const hideSave=noSticky.includes(name);
 document.querySelector('.stickySave')?.classList.toggle('hidden',hideSave);
 document.querySelector('.adminPortalMobileSave')?.classList.toggle('hidden',hideSave);
 try{localStorage.setItem('nettoManagementTab',name)}catch(_){}
 const u=new URL(location.href);u.searchParams.set('tab',name);
 if(name==='accounts')u.searchParams.set('sub',accountSubview);else u.searchParams.delete('sub');
 history.replaceState({},'',u);
 updateManagementHero(name);
 if(name==='overview')loadManagementOverview().catch(()=>{});
 if(name==='articles')loadManagementArticles().catch(()=>{});
 if(name==='notifications')loadNotificationAdmin().catch(()=>{});
 if(name==='problems')loadReportedProblems().catch(()=>{});
 if(name==='logs')loadPortalLogs().catch(()=>{});
 if(name==='maintenance')window.NethorHealthAdmin?.refresh?.();
 enhanceCompactPortal();
 if(opts.sound!==false)window.NettoSounds?.play?.('menuOpen')
}
function setAccountsFrame(view,force=false){
 accountSubview=['accounts','roles','logs'].includes(view)?view:'accounts';
 const meta=ACCOUNT_META[accountSubview]||ACCOUNT_META.accounts;
 if($('managementAccountsTitle'))$('managementAccountsTitle').textContent=meta.title;
 if($('managementAccountsIntro'))$('managementAccountsIntro').textContent=meta.description;
 const frame=$('managementAccountsFrame');if(!frame)return;
 const target=new URL('accounts.html',location.href);target.searchParams.set('embedded','1');target.searchParams.set('nav','external');target.searchParams.set('tab',accountSubview);
 if(force||!frame.src||new URL(frame.src,location.href).searchParams.get('tab')!==accountSubview)frame.src=target.pathname.split('/').pop()+target.search
}
function showAccountsView(view,btn,opts={}){
 accountSubview=['accounts','roles','logs'].includes(view)?view:'accounts';
 try{localStorage.setItem('nettoManagementAccountsView',accountSubview)}catch(_){}
 setAccountsFrame(accountSubview);
 btn=btn||managementButtonFor('accounts');
 showTab('accounts',btn,opts)
}
function filterManagementNav(value){
 const q=String(value||'').trim().toLocaleLowerCase('fr');
 const directs=[...document.querySelectorAll('.managementSide>.managementNavDirect')];
 const groups=[...document.querySelectorAll('.managementNavGroup')];
 directs.forEach(btn=>{btn.style.display=!q||btn.textContent.toLocaleLowerCase('fr').includes(q)?'':'none'});
 groups.forEach(group=>{
  const parent=group.querySelector('.managementNavParent'),children=[...group.querySelectorAll('.managementNavChild')];
  const parentMatch=!q||parent?.textContent.toLocaleLowerCase('fr').includes(q);
  const childMatches=children.map(x=>!q||x.textContent.toLocaleLowerCase('fr').includes(q));
  const visible=parentMatch||childMatches.some(Boolean);
  group.style.display=visible?'':'none';
  children.forEach((child,i)=>child.style.display=(!q||parentMatch||childMatches[i])?'':'none');
  if(q&&visible){group.classList.add('open');parent?.setAttribute('aria-expanded','true')}
  else if(!q){const active=group.classList.contains('activeGroup');group.classList.toggle('open',active);parent?.setAttribute('aria-expanded',active?'true':'false')}
 })
}
function reloadAccountsFrame(){setAccountsFrame(accountSubview,true)}
window.addEventListener('message',event=>{
 const frame=$('managementAccountsFrame');
 if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow)return;
 const data=event.data;if(!data||data.type!=='nethor-accounts-tab'||!['accounts','roles','logs'].includes(data.tab))return;
 accountSubview=data.tab;
 try{localStorage.setItem('nettoManagementAccountsView',accountSubview)}catch(_){}
 const meta=ACCOUNT_META[accountSubview]||ACCOUNT_META.accounts;
 if($('managementAccountsTitle'))$('managementAccountsTitle').textContent=meta.title;
 if($('managementAccountsIntro'))$('managementAccountsIntro').textContent=meta.description;
 if($('tab-accounts')?.classList.contains('active')){
  activateManagementNav(managementButtonFor('accounts'));updateManagementHero('accounts');
  const u=new URL(location.href);u.searchParams.set('tab','accounts');u.searchParams.set('sub',accountSubview);history.replaceState({},'',u)
 }
});
function managementInitials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}
async function loadManagementOverview(){
 const usersBox=$('managementUsersPreview'),logsBox=$('managementLogsPreview');
 try{
  const since=new Date(Date.now()-7*86400000).toISOString();
  const [usersRes,logsRes,updatesRes,problemsRes]=await Promise.all([
   db.from('profiles').select('id,display_name,role',{count:'exact'}).limit(4),
   db.from('portal_change_logs').select('id,title,description,area,created_at').order('created_at',{ascending:false}).limit(4),
   db.from('portal_change_logs').select('id',{count:'exact',head:true}).gte('created_at',since),
   db.from('reported_problems').select('id',{count:'exact',head:true}).neq('status','resolved')
  ]);
  if($('managementPages'))$('managementPages').textContent=String(builtinModules().length);
  if($('managementAccounts'))$('managementAccounts').textContent=String(usersRes.count??usersRes.data?.length??0);
  if($('managementProblems'))$('managementProblems').textContent=String(problemsRes.count??0);
  if($('managementUpdates'))$('managementUpdates').textContent=String(updatesRes.count??0);
  if(usersBox)usersBox.innerHTML=(usersRes.data||[]).map(u=>'<div class="managementPreviewRow"><span class="managementPreviewAvatar">'+esc(managementInitials(u.display_name))+'</span><div><strong>'+esc(u.display_name||'Utilisateur')+'</strong><small>'+esc(roleName(u.role))+'</small></div><time>›</time></div>').join('')||'<div class="managementEmpty">Aucun compte.</div>';
  if(logsBox)logsBox.innerHTML=(logsRes.data||[]).map(x=>'<div class="managementPreviewRow"><span class="managementPreviewAvatar">A</span><div><strong>'+esc(x.title||'Modification')+'</strong><small>'+esc(x.area||x.description||'Nethor')+'</small></div><time>'+new Date(x.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+'</time></div>').join('')||'<div class="managementEmpty">Aucune modification récente.</div>'
 }catch(e){console.warn('Vue Gestion:',e);if(usersBox)usersBox.innerHTML='<div class="managementEmpty">Comptes indisponibles.</div>';if(logsBox)logsBox.innerHTML='<div class="managementEmpty">Journal indisponible.</div>'}
}

const STORE_INFO_WIDGET_DEFAULTS={
 enabled:true,
 store_name:'Netto Le Thor',
 photo_url:'',
 photo_path:'',
 photo_name:'',
 opening_label:"Horaires d'ouverture aujourd'hui",
 greetings:{morning:'Bonjour',afternoon:'Bon après-midi',evening:'Bonsoir'},
 hours:{0:'09:00-12:30',1:'08:00-20:00',2:'08:00-20:00',3:'08:00-20:00',4:'08:00-20:00',5:'08:00-20:00',6:'08:00-20:00'},
 style:{
  accent:'#ff6a2b',
  surface_light:'#202630',
  surface_dark:'#171b21',
  text_light:'#ffffff',
  text_dark:'#ffffff',
  muted_light:'#d4d8df',
  muted_dark:'#d4d8df',
  radius:18,
  height:178,
  image_dim:28,
  image_position:'center center',
  image_zoom:100,
  image_x:50,
  image_y:50,
  greeting_size:18,
  store_name_size:30,
  hours_label_size:11,
  hours_value_size:28,
  shadow:true
 }
};
function normalizeStoreInfoPosition(value){
 const allowed=['center center','right center','left center','center top','center bottom'],v=String(value||'').trim();
 return allowed.includes(v)?v:STORE_INFO_WIDGET_DEFAULTS.style.image_position
}
function storeInfoPositionCoordinates(position){
 const map={'center center':[50,50],'right center':[100,50],'left center':[0,50],'center top':[50,0],'center bottom':[50,100]};
 return map[normalizeStoreInfoPosition(position)]||[50,50]
}
function normalizeStoreInfoWidgetConfig(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const hours=raw.hours&&typeof raw.hours==='object'?raw.hours:{},style=raw.style&&typeof raw.style==='object'?raw.style:{},greetings=raw.greetings&&typeof raw.greetings==='object'?raw.greetings:{};
 return{
  enabled:raw.enabled!==false,
  store_name:String(raw.store_name||STORE_INFO_WIDGET_DEFAULTS.store_name),
  photo_url:String(raw.photo_url||''),
  photo_path:String(raw.photo_path||''),
  photo_name:String(raw.photo_name||''),
  opening_label:String(raw.opening_label||STORE_INFO_WIDGET_DEFAULTS.opening_label),
  greetings:{
   morning:String(greetings.morning||STORE_INFO_WIDGET_DEFAULTS.greetings.morning),
   afternoon:String(greetings.afternoon||STORE_INFO_WIDGET_DEFAULTS.greetings.afternoon),
   evening:String(greetings.evening||STORE_INFO_WIDGET_DEFAULTS.greetings.evening)
  },
  hours:{...STORE_INFO_WIDGET_DEFAULTS.hours,...hours},
  style:{
   accent:validColor(style.accent,STORE_INFO_WIDGET_DEFAULTS.style.accent),
   surface_light:validColor(style.surface_light,STORE_INFO_WIDGET_DEFAULTS.style.surface_light),
   surface_dark:validColor(style.surface_dark,STORE_INFO_WIDGET_DEFAULTS.style.surface_dark),
   text_light:validColor(style.text_light,STORE_INFO_WIDGET_DEFAULTS.style.text_light),
   text_dark:validColor(style.text_dark,STORE_INFO_WIDGET_DEFAULTS.style.text_dark),
   muted_light:validColor(style.muted_light,STORE_INFO_WIDGET_DEFAULTS.style.muted_light),
   muted_dark:validColor(style.muted_dark,STORE_INFO_WIDGET_DEFAULTS.style.muted_dark),
   radius:Math.max(10,Math.min(32,Number(style.radius)||STORE_INFO_WIDGET_DEFAULTS.style.radius)),
   height:Math.max(140,Math.min(260,Number(style.height)||STORE_INFO_WIDGET_DEFAULTS.style.height)),
   image_dim:Math.max(0,Math.min(75,Number(style.image_dim)??STORE_INFO_WIDGET_DEFAULTS.style.image_dim)),
   image_position:normalizeStoreInfoPosition(style.image_position),
   image_zoom:Math.max(100,Math.min(250,Number(style.image_zoom)||STORE_INFO_WIDGET_DEFAULTS.style.image_zoom)),
   image_x:Math.max(0,Math.min(100,Number.isFinite(Number(style.image_x))?Number(style.image_x):storeInfoPositionCoordinates(style.image_position)[0])),
   image_y:Math.max(0,Math.min(100,Number.isFinite(Number(style.image_y))?Number(style.image_y):storeInfoPositionCoordinates(style.image_position)[1])),
   greeting_size:Math.max(12,Math.min(42,Number(style.greeting_size)||STORE_INFO_WIDGET_DEFAULTS.style.greeting_size)),
   store_name_size:Math.max(14,Math.min(52,Number(style.store_name_size)||STORE_INFO_WIDGET_DEFAULTS.style.store_name_size)),
   hours_label_size:Math.max(8,Math.min(24,Number(style.hours_label_size)||STORE_INFO_WIDGET_DEFAULTS.style.hours_label_size)),
   hours_value_size:Math.max(14,Math.min(48,Number(style.hours_value_size)||STORE_INFO_WIDGET_DEFAULTS.style.hours_value_size)),
   shadow:style.shadow!==false
  }
 }
}


const QUICK_PLANNING_WIDGET_DEFAULTS={
 enabled:true,
 title:'Vue rapide planning',
 subtitle:'Personnes en poste actuellement',
 action_label:'Voir le planning complet',
 empty_text:'Aucune personne en poste actuellement',
 show_avatar:true,
 show_role:true,
 show_shift:true,
 show_legend:true,
 density:'comfortable',
 bar_mode:'profile',
 style:{
  accent:'#ff5a2a',now_color:'#ff5a2a',
  surface_light:'#ffffff',surface_dark:'#23272d',
  text_light:'#1f2937',text_dark:'#f3f5f7',
  grid_light:'#e7ebf0',grid_dark:'#3a4149',
  radius:18,shadow:true
 }
};
function normalizeQuickPlanningWidgetConfig(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const style=raw.style&&typeof raw.style==='object'?raw.style:{};
 return{
  enabled:raw.enabled!==false,
  title:String(raw.title||QUICK_PLANNING_WIDGET_DEFAULTS.title),
  subtitle:String(raw.subtitle||QUICK_PLANNING_WIDGET_DEFAULTS.subtitle),
  action_label:String(raw.action_label||QUICK_PLANNING_WIDGET_DEFAULTS.action_label),
  empty_text:String(raw.empty_text||QUICK_PLANNING_WIDGET_DEFAULTS.empty_text),
  show_avatar:raw.show_avatar!==false,
  show_role:raw.show_role!==false,
  show_shift:raw.show_shift!==false,
  show_legend:raw.show_legend!==false,
  density:raw.density==='compact'?'compact':'comfortable',
  bar_mode:raw.bar_mode==='accent'?'accent':'profile',
  style:{
   accent:validColor(style.accent,QUICK_PLANNING_WIDGET_DEFAULTS.style.accent),
   now_color:validColor(style.now_color,QUICK_PLANNING_WIDGET_DEFAULTS.style.now_color),
   surface_light:validColor(style.surface_light,QUICK_PLANNING_WIDGET_DEFAULTS.style.surface_light),
   surface_dark:validColor(style.surface_dark,QUICK_PLANNING_WIDGET_DEFAULTS.style.surface_dark),
   text_light:validColor(style.text_light,QUICK_PLANNING_WIDGET_DEFAULTS.style.text_light),
   text_dark:validColor(style.text_dark,QUICK_PLANNING_WIDGET_DEFAULTS.style.text_dark),
   grid_light:validColor(style.grid_light,QUICK_PLANNING_WIDGET_DEFAULTS.style.grid_light),
   grid_dark:validColor(style.grid_dark,QUICK_PLANNING_WIDGET_DEFAULTS.style.grid_dark),
   radius:Math.max(10,Math.min(30,Number(style.radius)||QUICK_PLANNING_WIDGET_DEFAULTS.style.radius)),
   shadow:style.shadow!==false
  }
 }
}


const DESKTOP_STORE_GOOGLE_URL='https://www.google.com/maps/search/?api=1&query=Netto%20Le%20Thor&query_place_id=ChIJSY7JsE71tRIRRSih3toBniY&utm_source=nethor&utm_campaign=place_details_search';
const DESKTOP_DASHBOARD_WIDGET_DEFAULTS={
 enabled:true,legacy_operations_hub:false,
 management:{platform:'desktop',category:'home'},
 header:{store_name:'Netto Le Thor',store_subtitle:'Point de vente',store_url:DESKTOP_STORE_GOOGLE_URL,store_image_url:'',store_image_path:'',store_image_name:'',show_store:true,show_datetime:true,show_notifications:true,show_user:true,show_update:true,show_mobile_preview:true,show_admin_logs:true,show_store_image:true},
 background:{enabled:false,image_url:'',image_path:'',image_name:'',fit:'cover',position:'center',veil:14},
 sidebar:{enabled:true,width:240,logo_full_url:'',logo_full_path:'',logo_full_name:'',logo_compact_url:'',logo_compact_path:'',logo_compact_name:'',items:{
  home:{enabled:true,label:'Accueil',url:'home.html'},
  management:{enabled:true,label:'Gestion',url:'admin-portal.html'},
  activity:{enabled:true,label:'Activité magasin',url:'home.html#nethorDesktopStatsRow'},
  planning:{enabled:true,label:'Planning',url:'planning.html'},
  team:{enabled:true,label:'Équipe',url:'home.html#nethorDesktopTeamWidget'},
  tasks:{enabled:true,label:'Tâches',url:'home.html#nethorDesktopPriorities'},
  receptions:{enabled:true,label:'Réceptions',url:'home.html#nethorDesktopDeliveriesKpi'},
  articles:{enabled:true,label:'Fiches articles',url:'articles.html'},
  chat:{enabled:true,label:'Chat',url:'chat.html'},
  incidents:{enabled:true,label:'Incidents',url:'report-problem.html'},
  reports:{enabled:true,label:'Rapports',url:'admin-portal.html?tab=logs'},
  settings:{enabled:true,label:'Paramètres',url:'settings.html'}
 }},
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
 style:{accent:'#ff5a2a',radius:16,gap:14,sidebar_text_scale:100,widget_text_scale:100}
};
function normalizeDesktopDashboardWidgetConfig(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const background=raw.background&&typeof raw.background==='object'?raw.background:{},header=raw.header&&typeof raw.header==='object'?raw.header:{},sidebar=raw.sidebar&&typeof raw.sidebar==='object'?raw.sidebar:{},widgets=raw.widgets&&typeof raw.widgets==='object'?raw.widgets:{},actions=raw.quick_actions&&typeof raw.quick_actions==='object'?raw.quick_actions:{},style=raw.style&&typeof raw.style==='object'?raw.style:{};
 const items=sidebar.items&&typeof sidebar.items==='object'?sidebar.items:{},normalizedItems={};
 for(const [key,def] of Object.entries(DESKTOP_DASHBOARD_WIDGET_DEFAULTS.sidebar.items)){
  const x=items[key]&&typeof items[key]==='object'?items[key]:{};
  normalizedItems[key]={enabled:x.enabled!==false,label:String(x.label||def.label),url:String(x.url||def.url)}
 }
 const normalizedWidgets={};
 for(const [key,def] of Object.entries(DESKTOP_DASHBOARD_WIDGET_DEFAULTS.widgets)){
  const x=widgets[key]&&typeof widgets[key]==='object'?widgets[key]:{};
  normalizedWidgets[key]={...def,...x,enabled:x.enabled!==false,label:String(x.label||def.label)};
  if('max_items' in def)normalizedWidgets[key].max_items=Math.max(1,Math.min(12,Number(x.max_items)||def.max_items))
 }
 const normalizedActions={};
 for(const [key,def] of Object.entries(DESKTOP_DASHBOARD_WIDGET_DEFAULTS.quick_actions)){
  const x=actions[key]&&typeof actions[key]==='object'?actions[key]:{};
  normalizedActions[key]={...def,...x,enabled:x.enabled!==false,label:String(x.label||def.label),url:String(x.url||def.url),icon:String(x.icon||def.icon)}
 }
 return{
  enabled:raw.enabled!==false,legacy_operations_hub:raw.legacy_operations_hub===true,
  management:{platform:'desktop',category:'home'},
  background:{
   enabled:background.enabled===true,
   image_url:String(background.image_url||''),
   image_path:String(background.image_path||''),
   image_name:String(background.image_name||''),
   fit:['cover','contain'].includes(background.fit)?background.fit:'cover',
   position:['center','top','bottom'].includes(background.position)?background.position:'center',
   veil:Number.isFinite(Number(background.veil))?Math.max(0,Math.min(75,Math.round(Number(background.veil)))):14
  },
  header:{
   store_name:String(header.store_name||DESKTOP_DASHBOARD_WIDGET_DEFAULTS.header.store_name),
   store_subtitle:String(header.store_subtitle||DESKTOP_DASHBOARD_WIDGET_DEFAULTS.header.store_subtitle),
   store_url:String(!header.store_url||header.store_url==='home.html'?DESKTOP_STORE_GOOGLE_URL:header.store_url),
   store_image_url:String(header.store_image_url||''),store_image_path:String(header.store_image_path||''),store_image_name:String(header.store_image_name||''),
   show_store:header.show_store!==false,show_datetime:header.show_datetime!==false,show_notifications:header.show_notifications!==false,show_user:header.show_user!==false,show_update:header.show_update!==false,show_mobile_preview:header.show_mobile_preview!==false,show_admin_logs:header.show_admin_logs!==false,show_store_image:header.show_store_image!==false
  },
  sidebar:{
   enabled:sidebar.enabled!==false,width:Math.max(180,Math.min(280,Number(sidebar.width)||240)),
   logo_full_url:String(sidebar.logo_full_url||''),logo_full_path:String(sidebar.logo_full_path||''),logo_full_name:String(sidebar.logo_full_name||''),
   logo_compact_url:String(sidebar.logo_compact_url||''),logo_compact_path:String(sidebar.logo_compact_path||''),logo_compact_name:String(sidebar.logo_compact_name||''),
   items:normalizedItems
  },
  widgets:normalizedWidgets,quick_actions:normalizedActions,
  style:{accent:validColor(style.accent,DESKTOP_DASHBOARD_WIDGET_DEFAULTS.style.accent),radius:Math.max(10,Math.min(28,Number(style.radius)||16)),gap:Math.max(8,Math.min(24,Number(style.gap)||14)),sidebar_text_scale:Math.max(70,Math.min(160,Number(style.sidebar_text_scale)||100)),widget_text_scale:Math.max(70,Math.min(160,Number(style.widget_text_scale)||100))}
 }
}

function normalize(raw){
 const c=raw&&typeof raw==='object'?clone(raw):{};
 c.brand={name:c.brand?.name||'Nethor',subtitle:c.brand?.subtitle||'Espace outils',header_logo_url:String(c.brand?.header_logo_url||''),header_logo_path:String(c.brand?.header_logo_path||''),header_logo_name:String(c.brand?.header_logo_name||'')};
 c.home={eyebrow:c.home?.eyebrow||'Espace de travail',intro:c.home?.intro||'Choisis l’espace que tu veux ouvrir.'};
 c.theme={primary:validColor(c.theme?.primary,'#ff2f1f'),secondary:validColor(c.theme?.secondary,'#ff8500'),ink:validColor(c.theme?.ink,'#182235')};
 c.maintenance={enabled:c.maintenance?.enabled===true};
 c.pages=c.pages&&typeof c.pages==='object'?c.pages:{};
 Object.keys(c.pages).filter(k=>k.startsWith('custom_')).forEach(k=>delete c.pages[k]);
 delete c.customMenus;
 c.store_info_widget=normalizeStoreInfoWidgetConfig(c.store_info_widget);
 c.quick_planning_widget=normalizeQuickPlanningWidgetConfig(c.quick_planning_widget);
 c.desktop_dashboard_widget=normalizeDesktopDashboardWidgetConfig(c.desktop_dashboard_widget);
 c.personalization=c.personalization&&typeof c.personalization==='object'?c.personalization:{};
 c.personalization.home_menus_enabled=c.personalization.home_menus_enabled!==false;
 c.mobile_user_menu=c.mobile_user_menu&&typeof c.mobile_user_menu==='object'?c.mobile_user_menu:{};
 c.mobile_user_menu.items=c.mobile_user_menu.items&&typeof c.mobile_user_menu.items==='object'?c.mobile_user_menu.items:{};
 c.mobile_bar=c.mobile_bar&&typeof c.mobile_bar==='object'?c.mobile_bar:{enabled:true,items:[]};
 c.sounds=c.sounds&&typeof c.sounds==='object'?c.sounds:{};
 c.sounds.items=c.sounds.items&&typeof c.sounds.items==='object'?c.sounds.items:{};
 c.platform_ui=c.platform_ui&&typeof c.platform_ui==='object'?c.platform_ui:{};
 for(const kind of ['mobile','desktop']){
  const current=c.platform_ui[kind]&&typeof c.platform_ui[kind]==='object'?c.platform_ui[kind]:{};
  const cleanAsset=x=>{x=x&&typeof x==='object'?x:{};return{url:String(x.url||''),path:String(x.path||''),name:String(x.name||''),tag:String(x.tag||''),api:String(x.api||'')}};
  const themedAsset=key=>{const x=current[key]&&typeof current[key]==='object'?current[key]:{},legacy=cleanAsset(x),light=cleanAsset(x.light),dark=cleanAsset(x.dark);return{light:light.url||light.path||light.name?light:legacy,dark}};
  const simpleAsset=key=>cleanAsset(current[key]);
  const currentControls=current.controls&&typeof current.controls==='object'?current.controls:{},controls={};
  for(const key of ['notifications','user_menu','theme','update','logout']){
   const x=currentControls[key]&&typeof currentControls[key]==='object'?currentControls[key]:{};
   controls[key]={label:String(x.label||''),subtitle:String(x.subtitle||''),url:String(x.url||''),path:String(x.path||''),name:String(x.name||'')}
  }
  const notificationVisuals={};
  if(kind==='mobile'){
   const source=current.notification_visuals&&typeof current.notification_visuals==='object'?current.notification_visuals:{};
   for(const def of MOBILE_NOTIFICATION_VISUAL_DEFS)notificationVisuals[def.key]=normalizeMobileNotificationVisual(source[def.key])
  }
  const headerLogoScale=Math.max(60,Math.min(160,Math.round(Number(current.header_logo_scale)||100)));
  const headerLayout=['logo_only','logo_logo','text_logo','logo_text'].includes(current.header_layout)?current.header_layout:'logo_only';
  const headerText=String(current.header_text||'').slice(0,80);
  c.platform_ui[kind]={
   header_layout:headerLayout,
   header_text:headerText,
   header_logo:themedAsset('header_logo'),
   header_logo_secondary:themedAsset('header_logo_secondary'),
   header_themes:kind==='mobile'?normalizeMobileHeaderThemes(current.header_themes):{},
   header_logo_mode:kind==='desktop'&&current.header_logo_mode==='animation'?'animation':'image',
   header_logo_animation:themedAsset('header_logo_animation'),
   header_logo_scale:kind==='desktop'?headerLogoScale:100,
   login_logo:themedAsset('login_logo'),
   welcome_media:{...themedAsset('welcome_media'),type:current.welcome_media?.type==='animation'?'animation':'image'},
   welcome_media_themes:kind==='mobile'?normalizeMobileWelcomeThemeAssets(current.welcome_media_themes):{},
   home_screen_icon:simpleAsset('home_screen_icon'),
   browser_icon:themedAsset('browser_icon'),
   desktop_shortcut_icon:simpleAsset('desktop_shortcut_icon'),
   update_logo:simpleAsset('update_logo'),
   controls,
   notification_visuals:kind==='mobile'?notificationVisuals:{},
   home_banner:kind==='mobile'?normalizeMobileHomeBanner(current.home_banner):{},
   profile_frames:kind==='mobile'?normalizeMobileProfileFrames(current.profile_frames):{}
  }
 }
 return c
}
function waitProfileUI(){return new Promise(resolve=>{let n=0;const t=setInterval(()=>{if(window.NettoProfileUI||n++>100){clearInterval(t);resolve()}},50)})}
async function ensureAdminGlobalTools(){
 const ui=window.NettoProfileUI;if(!ui)return false;
 try{
  if(!ui.profile)await ui.refresh?.();
  ui.rebuildGlobalHeader?.();
  if(!document.getElementById('nettoGlobalTools')){
   await ui.refresh?.();
   ui.rebuildGlobalHeader?.()
  }
  return !!document.getElementById('nettoGlobalTools')
 }catch(e){console.warn('Restauration barre administrateur:',e);return false}
}
function builtinModules(){return (window.NettoProfileUI?.modules||[]).filter(m=>!m.custom)}
function maxRoles(m){return window.NettoProfileUI?.maxRoles?.(m)||ROLES}
function defaultPage(m,index){return{
 enabled:m.enabled!==false,
 label:m.homeLabel||m.label,
 nav_label:m.label,
 subtitle:m.subtitle||'',
 description:m.description||'',
 url:m.url||'',
 order:index+1,
 roles:[...maxRoles(m)],
 home:!!m.home,
 user_menu:!!m.userMenu,
 default_home:m.defaultHome!==false,
 default_user:m.defaultUser!==false,
 kicker:m.kicker||'OUTIL',
 action:m.action||'Ouvrir',
 icon:m.icon||'',
 image_url:m.asset||'',
 image_path:'',
 color:m.menuColor||config.theme.primary,
 accent:m.menuAccent||config.theme.secondary
}}
function ensurePages(){
 builtinModules().forEach((m,i)=>{
  const d=defaultPage(m,i),p=config.pages[m.id]&&typeof config.pages[m.id]==='object'?config.pages[m.id]:{};
  config.pages[m.id]={...d,...p};
  if(m.rolesLocked)config.pages[m.id].roles=[...maxRoles(m)];
  else config.pages[m.id].roles=Array.isArray(config.pages[m.id].roles)?config.pages[m.id].roles.filter(r=>maxRoles(m).includes(r)):[...maxRoles(m)];
  if(m.enabledLocked)config.pages[m.id].enabled=true;
  if(m.placementLocked){
   config.pages[m.id].home=false;config.pages[m.id].user_menu=false;
   config.pages[m.id].default_home=false;config.pages[m.id].default_user=false
  }
  const po=config.pages[m.id].platform_overrides&&typeof config.pages[m.id].platform_overrides==='object'?config.pages[m.id].platform_overrides:{};
  config.pages[m.id].platform_overrides={mobile:po.mobile&&typeof po.mobile==='object'?po.mobile:{},desktop:po.desktop&&typeof po.desktop==='object'?po.desktop:{}}
 })
}
function field(label,value,key,id,cls=''){return '<div class="field '+cls+'"><label>'+esc(label)+'</label><input value="'+attr(value)+'" data-page="'+attr(id)+'" data-key="'+attr(key)+'"></div>'}
function effectivePageRole(m,p,r){
 const explicit=config?.role_permissions?.[m.id]?.[r];
 if(['none','view','operate','manage'].includes(explicit))return explicit!=='none';
 return (p.roles||[]).includes(r)
}
function rolePicker(m,p){
 const max=maxRoles(m),fixed=m.rolesLocked===true;
 return '<div class="roles">'+ROLES.map(r=>{
  const allowed=max.includes(r),checked=allowed&&effectivePageRole(m,p,r);
  return '<label class="role '+(!allowed?'disabled':'')+'"><input type="checkbox" data-role-page="'+attr(m.id)+'" data-role="'+attr(r)+'" '+(checked?'checked':'')+' '+((!allowed||fixed)?'disabled':'')+'> '+esc(roleName(r))+'</label>'
 }).join('')+'</div>'
}
function visualHtml(url,icon){return url?'<img src="'+attr(url)+'" alt="">':esc(icon||'•')}
const PAGE_GROUP_LABELS={principal:'Navigation principale',terrain:'Outils métier',communication:'Communication',administration:'Administration',systeme:'Système'};
const PAGE_GROUP_ORDER=['principal','terrain','communication','administration','systeme'];
const PAGE_FEATURES={
 home:['Widgets d’accueil','Planning du jour','Accès rapides','Tâches du jour'],
 profile:['Photo & avatar','Cadres d’avatar','Apparence','Préférences utilisateur','Réglages notifications'],
 stock:['Stock Fruits & Légumes','Consultation','Fiches produit','Suggestions de commande','Panier de commande'],
 planning:['Vues Jour / Semaine / Année','Import planning Excel','Couverture magasin','Mes statistiques','Détection d’anomalies','Indisponibilités / Congés','Tâches du jour'],
 chat:['Canal Général','Conversations','Pièces jointes','Présence équipe','Rôles affichés'],
 scanner:['Lecture EAN8 / EAN13 / UPC-A','Recherche manuelle EAN13','Informations de la fiche trouvée'],
 articles:['Création & modification','Familles','Catégories','Conditionnements','EAN13','Statut produit'],
 notifications:['Centre d’activité','Notifications portail','Suivi lu / non lu','Badge non lu','Destination de barre mobile'],
 notification_settings:['Préférences de notifications','Canal portail','Push mobile','Types de notifications'],
 problem_report:['Signalement de problème','Contexte page & appareil','Envoi vers l’administration'],
 fl_assistant:['Imports XLS / XLSX / CSV','Ventes','Stock','Casse & dons','Commandes précédentes','Référentiel EAN13'],
 rewards:['Défis','Boutique','Jetons','Équipements de profil'],
 bakery:['Stock Boulangerie','Consultation','Gestion articles','Catégories','EAN13'],
 accounts:['Comptes','Rôles & permissions','Sous-rôles internes','Journal d’activité','Réinitialisation mot de passe'],
 portal_admin:['Tableau de bord','Accueil & interface','Apparence & médias','Contenus','Utilisateurs & accès','Communication','Système','Pages & fonctionnalités','Widgets d’accueil','Mobile','Desktop','Problèmes signalés','Journal'],
 settings:['Accueil personnalisé','Raccourcis','Apparence'],
 maintenance:['Mode maintenance','Redirection utilisateurs']
};
function pageGroup(m){
 if(PAGE_GROUP_LABELS[m?.group])return m.group;
 const sig=[m?.id,m?.label,m?.homeLabel,m?.url,m?.subtitle].filter(Boolean).join(' ').toLowerCase();
 if(m?.platform==='system'||/(maintenance|repair|setting|param[eè]tre|system)/i.test(sig))return'systeme';
 if(/(account|admin|portal|gestion|reward|boutique)/i.test(sig))return'administration';
 if(/(chat|notification|message|problem|signal)/i.test(sig))return'communication';
 if(/(stock|scanner|article|bakery|boulanger|assistant|fruit|l[eé]gume)/i.test(sig))return'terrain';
 return'principal'
}
function pagePlatformLabel(m){return m?.platform==='mobile'?'Mobile uniquement':m?.platform==='desktop'?'Desktop uniquement':m?.platform==='system'?'Système':'Mobile + desktop'}
function moduleMobileAvailable(m){return !!m&&m.navigation!==false&&m.platform!=='desktop'&&m.platform!=='system'}
function moduleDesktopAvailable(m){return !!m&&m.navigation!==false&&m.platform!=='mobile'&&m.platform!=='system'}
function moduleMobileBarEligible(m){const fn=window.NettoProfileUI?.mobileBarEligible;return typeof fn==='function'?fn(m):moduleMobileAvailable(m)&&m.mobileBar!==false}
function moduleBadgesHtml(m,p){
 const deviceBadge=m.platform==='mobile'?'<span class="moduleBadge mobile">Mobile uniquement</span>':m.platform==='desktop'?'<span class="moduleBadge desktop">Desktop uniquement</span>':m.platform==='system'?'<span class="moduleBadge system">Système</span>':'<span class="moduleBadge devices">Mobile + desktop</span>';
 const badges=[
  '<span class="moduleBadge '+(p.enabled!==false?'on':'off')+'">'+(p.enabled!==false?'Actif':'Inactif')+'</span>',
  deviceBadge,
  moduleMobileBarEligible(m)?'<span class="moduleBadge mobilebar">Barre mobile</span>':'',
  p.home?'<span class="moduleBadge">Accueil</span>':'',
  p.user_menu?'<span class="moduleBadge">Menu utilisateur</span>':'',
  (m.rolesLocked||m.enabledLocked||m.placementLocked)?'<span class="moduleBadge protected">Protégée</span>':'',
  !PAGE_GROUP_LABELS[m?.group]?'<span class="moduleBadge">Classement auto</span>':''
 ];
 return badges.filter(Boolean).join('')
}
function pageProtectionText(m){
 const rows=[];
 if(m.enabledLocked)rows.push('activation protégée');
 if(m.rolesLocked)rows.push('accès administrateur protégé');
 if(m.placementLocked)rows.push('emplacements de navigation protégés');
 return rows.length?'Garde-fous techniques : '+rows.join(', ')+'. Les droits d’accès se gèrent dans Utilisateurs & accès.':''
}
function systemFilterMatch(m,p,filter){
 if(filter==='active')return p.enabled!==false;
 if(filter==='home')return p.home===true;
 if(filter==='user_menu')return p.user_menu===true;
 if(filter==='mobile_available')return moduleMobileAvailable(m);
 if(filter==='desktop_available')return moduleDesktopAvailable(m);
 if(filter==='mobile_bar')return moduleMobileBarEligible(m);
 if(filter==='mobile_only')return m?.platform==='mobile';
 if(filter==='desktop_only')return m?.platform==='desktop';
 if(PAGE_GROUP_LABELS[filter])return pageGroup(m)===filter;
 return true
}
function refreshSystemStats(mods=builtinModules()){
 const pages=mods.map(m=>config.pages[m.id]||{});
 if($('systemPageTotal'))$('systemPageTotal').textContent=String(mods.length);
 if($('systemPageActive'))$('systemPageActive').textContent=String(pages.filter(p=>p.enabled!==false).length);
 if($('systemPageMobile'))$('systemPageMobile').textContent=String(mods.filter(moduleMobileAvailable).length);
 if($('systemPageDesktop'))$('systemPageDesktop').textContent=String(mods.filter(moduleDesktopAvailable).length);
 if($('systemPageHome'))$('systemPageHome').textContent=String(pages.filter(p=>p.home===true).length);
 if($('systemPageUserMenu'))$('systemPageUserMenu').textContent=String(pages.filter(p=>p.user_menu===true).length)
}
function systemModuleCard(m,index){
 const p=config.pages[m.id],protection=pageProtectionText(m);
 const enabledDisabled=m.enabledLocked?'disabled':'',placementDisabled=m.placementLocked?'disabled':'';
 return '<article class="moduleCard" id="moduleCard_'+attr(m.id)+'">'+
  '<div class="moduleHead" onclick="toggleModuleBody(\''+attr(m.id)+'\',event)">'+
   '<div class="moduleVisual">'+visualHtml(p.image_url||m.asset,p.icon||m.icon)+'</div>'+
   '<div class="moduleHeadInfo"><strong class="moduleDisplayName">'+esc(p.label||m.label)+'</strong><span class="moduleHeadMeta">'+esc(m.id)+' · '+esc(p.url||m.url||'')+' · '+esc(pagePlatformLabel(m))+'</span><div class="moduleHeadBadges">'+moduleBadgesHtml(m,p)+'</div></div>'+
   '<div class="moduleHeadActions"><button type="button" class="moduleHeadAction" onclick="openSystemPage(\''+attr(m.id)+'\',event)">Ouvrir</button><button type="button" class="moduleHeadAction" onclick="resetSystemPage(\''+attr(m.id)+'\',event)">Réinitialiser</button></div>'+
   '<span class="moduleChevron">⌄</span>'+
  '</div>'+
  '<div class="moduleBody collapsed" id="moduleBody_'+attr(m.id)+'">'+
   '<div class="moduleTech"><div><small>Identifiant technique · '+esc(pagePlatformLabel(m))+'</small><code>'+esc(m.id)+' · '+esc(m.url||'')+'</code></div><a href="'+attr(p.url||m.url||'#')+'" target="_blank" rel="noopener">Tester la page ↗</a></div>'+
   ((PAGE_FEATURES[m.id]||[]).length?'<div class="moduleFeatures"><small>Fonctionnalités liées</small><div>'+(PAGE_FEATURES[m.id]||[]).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>':'')+
   '<div class="moduleGrid">'+
    field('Nom sur l’accueil',p.label,'label',m.id)+
    field('Nom dans la navigation',p.nav_label,'nav_label',m.id)+
    field('Sous-titre',p.subtitle,'subtitle',m.id,'span2')+
    field('Description',p.description,'description',m.id,'span2')+
    field('Destination',p.url,'url',m.id,'span2')+
    field('Petit titre',p.kicker,'kicker',m.id)+
    field('Texte du bouton',p.action,'action',m.id)+
    field('Icône / emoji',p.icon,'icon',m.id)+
    field('Ordre',p.order,'order',m.id)+
    '<div class="field span2"><label>Image du menu</label><div class="assetLine"><div class="assetPreview">'+visualHtml(p.image_url,p.icon)+'</div><input type="text" value="'+attr(p.image_url||'')+'" data-page="'+attr(m.id)+'" data-key="image_url" placeholder="URL ou chemin image"><button class="btn secondaryBtn mini" type="button" onclick="choosePageImage(\''+attr(m.id)+'\')">Importer</button>'+(p.image_url?'<a class="btn secondaryBtn mini" href="'+attr(p.image_url)+'" download>Télécharger</a>':'')+'<input id="pageFile_'+attr(m.id)+'" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onchange="uploadPageImage(\''+attr(m.id)+'\',this)"></div></div>'+
    '<div class="field"><label>Couleur</label><input type="color" value="'+attr(validColor(p.color,config.theme.primary))+'" data-page="'+attr(m.id)+'" data-key="color"></div>'+
    '<div class="field"><label>Accent</label><input type="color" value="'+attr(validColor(p.accent,config.theme.secondary))+'" data-page="'+attr(m.id)+'" data-key="accent"></div>'+
   '</div>'+
   '<div class="toggleRow">'+
    '<label class="toggleChip"><input type="checkbox" data-page="'+attr(m.id)+'" data-key="enabled" '+(p.enabled!==false?'checked':'')+' '+enabledDisabled+'> Page active</label>'+
    '<label class="toggleChip"><input type="checkbox" data-page="'+attr(m.id)+'" data-key="home" '+(p.home?'checked':'')+' '+placementDisabled+'> Afficher sur l’accueil</label>'+
    '<label class="toggleChip"><input type="checkbox" data-page="'+attr(m.id)+'" data-key="user_menu" '+(p.user_menu?'checked':'')+' '+placementDisabled+'> Menu utilisateur</label>'+
    '<label class="toggleChip"><input type="checkbox" data-page="'+attr(m.id)+'" data-key="default_home" '+(p.default_home?'checked':'')+' '+placementDisabled+'> Accueil par défaut</label>'+
    '<label class="toggleChip"><input type="checkbox" data-page="'+attr(m.id)+'" data-key="default_user" '+(p.default_user?'checked':'')+' '+placementDisabled+'> Menu par défaut</label>'+
   '</div>'+
   '<div class="moduleProtection"><b>Droits d’accès :</b> gérés séparément dans Utilisateurs & accès → Rôles & permissions.</div>'+ 
   (protection?'<div class="moduleProtection">'+esc(protection)+'</div>':'')+
  '</div>'+
 '</article>'
}

function ensureOperationsWidgetConfig(){
 config.home_widgets=config.home_widgets&&typeof config.home_widgets==='object'?config.home_widgets:{};
 const current=config.home_widgets.operations_hub&&typeof config.home_widgets.operations_hub==='object'?config.home_widgets.operations_hub:{};
 const defaults={
  enabled:true,label:'Pilotage magasin',subtitle:'Relève, service, commandes, livraisons et Flash magasin',
  density:'compact',max_items:3,show_counters:true,default_section:'handover',
  sections:{handover:true,service:true,orders:true,deliveries:true,flashes:true},roles:{},subroles:{}
 };
 const node=config.home_widgets.operations_hub={...defaults,...current};
 node.sections={...defaults.sections,...(current.sections&&typeof current.sections==='object'?current.sections:{})};
 node.roles=current.roles&&typeof current.roles==='object'?current.roles:{admin:true,'role_point-de-vente':false,responsable:false,employe:false,lecture:false};
 node.subroles=current.subroles&&typeof current.subroles==='object'?current.subroles:{};
 node.density=node.density==='detailed'?'detailed':'compact';
 node.max_items=Math.min(8,Math.max(1,Number(node.max_items)||3));
 if(!['handover','service','orders','deliveries','flashes'].includes(node.default_section))node.default_section='handover';
 return node
}
function renderOperationsWidgetEditor(){
 const host=$('operationsWidgetEditor');if(!host)return;
 const w=ensureOperationsWidgetConfig(),sectionLabel={handover:'Relève',service:'Mon service',orders:'Commandes',deliveries:'Livraisons',flashes:'Flash magasin'};
 host.innerHTML='<div class="operationsWidgetAdminCard">'+
  '<div class="operationsWidgetAdminSummary"><div><strong>'+esc(w.label)+'</strong><small>'+esc(w.subtitle)+'</small></div><label class="toggleChip"><input type="checkbox" data-operations-widget="enabled" '+(w.enabled!==false?'checked':'')+'> Widget actif</label></div>'+
  '<div class="operationsWidgetAdminGrid">'+
   '<div class="field"><label>Titre du widget</label><input maxlength="80" value="'+attr(w.label)+'" data-operations-widget="label"></div>'+
   '<div class="field"><label>Affichage</label><select data-operations-widget="density"><option value="compact" '+(w.density==='compact'?'selected':'')+'>Compact</option><option value="detailed" '+(w.density==='detailed'?'selected':'')+'>Détaillé</option></select></div>'+
   '<div class="field full"><label>Sous-titre</label><input maxlength="180" value="'+attr(w.subtitle)+'" data-operations-widget="subtitle"></div>'+
   '<div class="field"><label>Éléments maximum par section</label><input type="number" min="1" max="8" value="'+attr(w.max_items)+'" data-operations-widget="max_items"></div>'+
   '<div class="field"><label>Section ouverte par défaut</label><select data-operations-widget="default_section">'+Object.entries(sectionLabel).map(([k,v])=>'<option value="'+k+'" '+(w.default_section===k?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></div>'+
  '</div>'+
  '<div class="operationsWidgetAdminToggles">'+
   Object.entries(sectionLabel).map(([k,v])=>'<label class="operationsWidgetToggle"><span><strong>'+esc(v)+'</strong><small>Afficher cette partie du widget.</small></span><input type="checkbox" data-operations-section="'+k+'" '+(w.sections[k]!==false?'checked':'')+'></label>').join('')+
   '<label class="operationsWidgetToggle"><span><strong>Compteurs</strong><small>Afficher le nombre d’éléments sur les onglets.</small></span><input type="checkbox" data-operations-widget="show_counters" '+(w.show_counters!==false?'checked':'')+'></label>'+
  '</div>'+
  '<div class="operationsWidgetAdminNote"><b>Séparation :</b> ce bloc règle le contenu, l’apparence et l’activation globale. Les droits d’accès au module Pilotage magasin restent dans <b>Utilisateurs & accès → Rôles & permissions</b>.</div>'+
 '</div>';
 host.querySelectorAll('[data-operations-widget]').forEach(el=>el.oninput=el.onchange=()=>{
  const key=el.dataset.operationsWidget,node=ensureOperationsWidgetConfig();
  let value=el.type==='checkbox'?el.checked:el.value;
  if(key==='max_items')value=Math.min(8,Math.max(1,Number(value)||3));
  node[key]=value;markDirty()
 });
 host.querySelectorAll('[data-operations-section]').forEach(el=>el.onchange=()=>{
  const node=ensureOperationsWidgetConfig();node.sections[el.dataset.operationsSection]=el.checked;markDirty()
 })
}

function ensureStoreInfoWidgetConfig(){
 config.store_info_widget=normalizeStoreInfoWidgetConfig(config.store_info_widget);
 return config.store_info_widget
}
function storeBannerHoursText(spec){
 const value=String(spec||'').trim();
 return !value||/^(ferme|fermé|closed)$/i.test(value)?'Fermé aujourd’hui':value.replace(/\s*[-–—]\s*/g,' – ')
}
function updateStoreBannerPreview(){
 const w=ensureStoreInfoWidgetConfig(),root=$('storeBannerPreview');if(!root)return;
 const theme=document.documentElement.dataset.theme==='dark'?'dark':'light',s=w.style;
 root.style.setProperty('--sb-surface',theme==='dark'?s.surface_dark:s.surface_light);
 root.style.setProperty('--sb-text',theme==='dark'?s.text_dark:s.text_light);
 root.style.setProperty('--sb-muted',theme==='dark'?s.muted_dark:s.muted_light);
 root.style.setProperty('--sb-accent',s.accent);
 root.style.setProperty('--sb-radius',s.radius+'px');
 root.style.setProperty('--sb-height',Math.max(120,Math.round(s.height*.68))+'px');
 root.style.setProperty('--sb-dim',(s.image_dim/100).toFixed(2));
 root.style.setProperty('--sb-position',s.image_x+'% '+s.image_y+'%');
 root.style.setProperty('--sb-origin',s.image_x+'% '+s.image_y+'%');
 root.style.setProperty('--sb-zoom',(s.image_zoom/100).toFixed(2));
 root.style.setProperty('--sb-greeting-size',Math.max(10,Math.round(s.greeting_size*.72))+'px');
 root.style.setProperty('--sb-store-name-size',Math.max(11,Math.round(s.store_name_size*.62))+'px');
 root.style.setProperty('--sb-hours-label-size',Math.max(7,Math.round(s.hours_label_size*.72))+'px');
 root.style.setProperty('--sb-hours-value-size',Math.max(11,Math.round(s.hours_value_size*.62))+'px');
 const visual=root.querySelector('.storeBannerPreviewVisual'),url=validUrl(w.photo_url)?String(w.photo_url||'').trim():'';
 if(visual){
  visual.style.backgroundImage=url?'url("'+url.replace(/"/g,'%22')+'")':'none';
  visual.classList.toggle('empty',!url)
 }
 const greeting=$('storeBannerPreviewGreeting'),store=$('storeBannerPreviewStore'),label=$('storeBannerPreviewLabel'),hours=$('storeBannerPreviewHours');
 if(greeting)greeting.textContent=(w.greetings.evening||'Bonsoir')+' Utilisateur';
 if(store)store.textContent=w.store_name||'Netto Le Thor';
 if(label)label.textContent=w.opening_label||"Horaires d'ouverture aujourd'hui";
 if(hours)hours.textContent=storeBannerHoursText(w.hours[String(new Date().getDay())]||w.hours['1'])
}
function chooseStoreBannerImage(){$('storeBannerFile')?.click()}
async function uploadStoreBannerImage(input){
 const file=input?.files?.[0];if(!file)return;
 try{
  const ext=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,''),allowed=new Set(['jpg','jpeg','png','webp','avif']);
  if(!allowed.has(ext))throw new Error('Format non pris en charge. Utilise JPG, PNG, WEBP ou AVIF.');
  if(file.size>12*1024*1024)throw new Error('Image trop lourde : 12 Mo maximum.');
  const state=$('saveState');if(state){state.className='saveState';state.textContent='Import de la bannière…'}
  const storagePath='widgets/home/banner/background-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=ensureStoreInfoWidgetConfig();
  node.photo_url=data?.publicUrl||'';node.photo_path=storagePath;node.photo_name=file.name;
  markDirty();renderStoreInfoWidgetEditor();if(state)state.textContent='Image de bannière prête à être enregistrée'
 }catch(e){
  const state=$('saveState');if(state){state.className='saveState err';state.textContent='Erreur bannière : '+(e?.message||e)}
  alert('Import impossible : '+(e?.message||e))
 }finally{if(input)input.value=''}
}
function removeStoreBannerImage(){
 const node=ensureStoreInfoWidgetConfig();node.photo_url='';node.photo_path='';node.photo_name='';
 markDirty();renderStoreInfoWidgetEditor()
}
function resetStoreBannerCrop(){
 const node=ensureStoreInfoWidgetConfig();node.style.image_zoom=100;node.style.image_x=50;node.style.image_y=50;node.style.image_position='center center';
 markDirty();renderStoreInfoWidgetEditor()
}
function renderStoreInfoWidgetEditor(){
 let host=$('storeInfoWidgetEditor');
 if(!host){
  const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
  const block=document.createElement('div');block.className='operationsWidgetAdmin storeInfoWidgetAdmin';
  block.innerHTML='<div class="storeInfoAdminHead"><div><span class="eyebrow">WIDGET DESKTOP · BANNIÈRE</span><h3>Bannière d’accueil</h3><p>Accueil personnalisé, point de vente, horaires du jour et photo fondue dans le fond de la bannière.</p></div><button class="btn secondaryBtn mini" type="button" onclick="renderStoreInfoWidgetEditor()">↻ Actualiser</button></div><div id="storeInfoWidgetEditor"></div>';
  panel.appendChild(block);host=$('storeInfoWidgetEditor')
 }
 const w=ensureStoreInfoWidgetConfig(),days=[['1','Lundi'],['2','Mardi'],['3','Mercredi'],['4','Jeudi'],['5','Vendredi'],['6','Samedi'],['0','Dimanche']];
 host.innerHTML=
  '<div class="operationsWidgetAdminCard">'+
   '<div class="operationsWidgetAdminSummary"><div><strong>Bannière d’accueil</strong><small>Visible uniquement sur l’accueil Desktop. Le prénom affiché provient automatiquement du compte connecté.</small></div><label class="toggleChip"><input type="checkbox" data-store-info="enabled" '+(w.enabled!==false?'checked':'')+'> Afficher la bannière</label></div>'+
   '<div class="storeInfoAdminGrid">'+
    '<div class="field"><label>Nom du magasin</label><input maxlength="90" value="'+attr(w.store_name)+'" data-store-info="store_name"></div>'+
    '<div class="field"><label>Titre des horaires</label><input maxlength="90" value="'+attr(w.opening_label)+'" data-store-info="opening_label"></div>'+
    '<div class="field"><label>Matin</label><input maxlength="40" value="'+attr(w.greetings.morning)+'" data-store-greeting="morning"></div>'+
    '<div class="field"><label>Après-midi</label><input maxlength="40" value="'+attr(w.greetings.afternoon)+'" data-store-greeting="afternoon"></div>'+
    '<div class="field"><label>Soir</label><input maxlength="40" value="'+attr(w.greetings.evening)+'" data-store-greeting="evening"></div>'+
    '<div class="field"><label>Position de la photo</label><select data-store-style="image_position">'+
     [['center center','Centrée'],['right center','Alignée à droite'],['left center','Alignée à gauche'],['center top','Centrée en haut'],['center bottom','Centrée en bas']].map(x=>'<option value="'+x[0]+'" '+(w.style.image_position===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+
    '</select></div>'+
   '</div>'+
   '<div class="storeBannerAsset">'+
    '<div class="storeBannerAssetCopy"><strong>Image de fond</strong><small>La photo est automatiquement fondue dans le fond sombre de la bannière, comme sur la référence.</small><span>'+(w.photo_name?esc(w.photo_name):w.photo_url?'Image personnalisée enregistrée':'Aucune image · fond graphique Nethor utilisé')+'</span></div>'+
    '<div class="storeBannerAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="chooseStoreBannerImage()">Importer une image</button>'+(w.photo_url?'<button class="btn secondaryBtn mini" type="button" onclick="removeStoreBannerImage()">Retirer</button>':'')+'</div>'+
    '<input id="storeBannerFile" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" hidden onchange="uploadStoreBannerImage(this)">'+
   '</div>'+
   '<div class="storeBannerCrop"><div class="storeBannerSectionTitle"><strong>Agrandir & recadrer l’image</strong><small>Le cadrage est appliqué directement à la bannière Desktop.</small></div><div class="storeBannerCropGrid">'+
    '<div class="field"><label>Zoom</label><div class="storeBannerRange"><input type="range" min="100" max="250" step="5" value="'+attr(w.style.image_zoom)+'" data-store-style="image_zoom"><output data-store-output="image_zoom">'+attr(w.style.image_zoom)+' %</output></div></div>'+
    '<div class="field"><label>Position horizontale</label><div class="storeBannerRange"><input type="range" min="0" max="100" step="1" value="'+attr(w.style.image_x)+'" data-store-style="image_x"><output data-store-output="image_x">'+attr(w.style.image_x)+' %</output></div></div>'+
    '<div class="field"><label>Position verticale</label><div class="storeBannerRange"><input type="range" min="0" max="100" step="1" value="'+attr(w.style.image_y)+'" data-store-style="image_y"><output data-store-output="image_y">'+attr(w.style.image_y)+' %</output></div></div>'+
    '<div class="field storeBannerCropReset"><label>Réinitialiser</label><button class="btn secondaryBtn mini" type="button" onclick="resetStoreBannerCrop()">Centrer · 100 %</button></div>'+
   '</div></div>'+
   '<div class="field storeBannerUrlField"><label>URL ou chemin de l’image</label><input maxlength="700" placeholder="Ex. assets/magasin.webp ou https://…" value="'+attr(w.photo_url)+'" data-store-info="photo_url"><small class="platformMediaHint">Tu peux importer une image ou renseigner directement une URL/chemin public.</small></div>'+
   '<div class="storeInfoHours">'+days.map(([key,label])=>'<div class="field"><label>'+label+'</label><input maxlength="40" value="'+attr(w.hours[key]||'')+'" data-store-hour="'+key+'" placeholder="08:00-20:00"></div>').join('')+'</div>'+
   '<div class="storeBannerTypography"><div class="storeBannerSectionTitle"><strong>Taille des textes</strong><small>Réglages indépendants de chaque texte de la bannière.</small></div><div class="storeBannerTypographyGrid">'+
    '<div class="field"><label>Bonjour / Bonsoir + utilisateur</label><input type="number" min="12" max="42" value="'+attr(w.style.greeting_size)+'" data-store-style="greeting_size"><small>px</small></div>'+
    '<div class="field"><label>Nom du magasin</label><input type="number" min="14" max="52" value="'+attr(w.style.store_name_size)+'" data-store-style="store_name_size"><small>px</small></div>'+
    '<div class="field"><label>Titre horaires</label><input type="number" min="8" max="24" value="'+attr(w.style.hours_label_size)+'" data-store-style="hours_label_size"><small>px</small></div>'+
    '<div class="field"><label>Valeur des horaires</label><input type="number" min="14" max="48" value="'+attr(w.style.hours_value_size)+'" data-store-style="hours_value_size"><small>px</small></div>'+
   '</div></div>'+
   '<div class="storeInfoStyleGrid">'+
    '<div class="field"><label>Accent</label><input type="color" value="'+attr(w.style.accent)+'" data-store-style="accent"></div>'+
    '<div class="field"><label>Fond clair</label><input type="color" value="'+attr(w.style.surface_light)+'" data-store-style="surface_light"></div>'+
    '<div class="field"><label>Fond sombre</label><input type="color" value="'+attr(w.style.surface_dark)+'" data-store-style="surface_dark"></div>'+
    '<div class="field"><label>Texte clair</label><input type="color" value="'+attr(w.style.text_light)+'" data-store-style="text_light"></div>'+
    '<div class="field"><label>Texte sombre</label><input type="color" value="'+attr(w.style.text_dark)+'" data-store-style="text_dark"></div>'+
    '<div class="field"><label>Secondaire clair</label><input type="color" value="'+attr(w.style.muted_light)+'" data-store-style="muted_light"></div>'+
    '<div class="field"><label>Secondaire sombre</label><input type="color" value="'+attr(w.style.muted_dark)+'" data-store-style="muted_dark"></div>'+
    '<div class="field"><label>Arrondi (px)</label><input type="number" min="10" max="32" value="'+attr(w.style.radius)+'" data-store-style="radius"></div>'+
    '<div class="field"><label>Hauteur (px)</label><input type="number" min="140" max="260" value="'+attr(w.style.height)+'" data-store-style="height"></div>'+
    '<div class="field"><label>Assombrissement photo (%)</label><input type="number" min="0" max="75" value="'+attr(w.style.image_dim)+'" data-store-style="image_dim"></div>'+
   '</div>'+
   '<div class="operationsWidgetAdminToggles"><label class="operationsWidgetToggle"><span><strong>Ombre</strong><small>Ajoute une profondeur discrète autour de la bannière.</small></span><input type="checkbox" data-store-style="shadow" '+(w.style.shadow!==false?'checked':'')+'></label></div>'+
   '<div class="storeInfoPreview"><span class="storeInfoPreviewTitle">Aperçu</span><div id="storeBannerPreview" class="storeBannerPreview"><span class="storeBannerPreviewVisual empty"></span><div class="storeBannerPreviewContent"><div><strong id="storeBannerPreviewGreeting">Bonsoir Utilisateur</strong><small id="storeBannerPreviewStore">Netto Le Thor</small></div><div class="storeBannerPreviewHours"><span id="storeBannerPreviewLabel">Horaires d’ouverture aujourd’hui</span><b id="storeBannerPreviewHours">08:00 – 20:00</b></div></div></div></div>'+
   '<div class="storeInfoSource"><b>Horaires par défaut :</b> lundi à samedi 08:00–20:00 · dimanche 09:00–12:30. L’affichage choisit automatiquement le bon jour en heure de Paris.</div>'+
  '</div>';
 host.querySelectorAll('[data-store-info]').forEach(el=>el.oninput=el.onchange=()=>{
  const node=ensureStoreInfoWidgetConfig(),key=el.dataset.storeInfo;
  node[key]=el.type==='checkbox'?el.checked:el.value;markDirty();updateStoreBannerPreview()
 });
 host.querySelectorAll('[data-store-greeting]').forEach(el=>el.oninput=el.onchange=()=>{
  ensureStoreInfoWidgetConfig().greetings[el.dataset.storeGreeting]=el.value;markDirty();updateStoreBannerPreview()
 });
 host.querySelectorAll('[data-store-hour]').forEach(el=>el.oninput=el.onchange=()=>{
  ensureStoreInfoWidgetConfig().hours[el.dataset.storeHour]=el.value.trim();markDirty();updateStoreBannerPreview()
 });
 host.querySelectorAll('[data-store-style]').forEach(el=>el.oninput=el.onchange=()=>{
  const node=ensureStoreInfoWidgetConfig(),key=el.dataset.storeStyle;
  let value=el.type==='checkbox'?el.checked:el.value;
  if(key==='radius')value=Math.max(10,Math.min(32,Number(value)||18));
  if(key==='height')value=Math.max(140,Math.min(260,Number(value)||178));
  if(key==='image_dim')value=Math.max(0,Math.min(75,Number(value)||0));
  if(key==='image_zoom')value=Math.max(100,Math.min(250,Number(value)||100));
  if(key==='image_x'||key==='image_y')value=Math.max(0,Math.min(100,Number(value)||0));
  if(key==='image_position'){
   const [x,y]=storeInfoPositionCoordinates(value);node.style.image_x=x;node.style.image_y=y
  }
  if(key==='greeting_size')value=Math.max(12,Math.min(42,Number(value)||18));
  if(key==='store_name_size')value=Math.max(14,Math.min(52,Number(value)||30));
  if(key==='hours_label_size')value=Math.max(8,Math.min(24,Number(value)||11));
  if(key==='hours_value_size')value=Math.max(14,Math.min(48,Number(value)||28));
  node.style[key]=value;
  const output=host.querySelector('[data-store-output="'+key+'"]');if(output)output.textContent=value+' %';
  if(key==='image_position'){
   const ox=host.querySelector('[data-store-output="image_x"]'),oy=host.querySelector('[data-store-output="image_y"]'),ix=host.querySelector('[data-store-style="image_x"]'),iy=host.querySelector('[data-store-style="image_y"]');
   if(ix)ix.value=node.style.image_x;if(iy)iy.value=node.style.image_y;if(ox)ox.textContent=node.style.image_x+' %';if(oy)oy.textContent=node.style.image_y+' %'
  }
  markDirty();updateStoreBannerPreview()
 });
 updateStoreBannerPreview()
}


function ensureQuickPlanningWidgetConfig(){
 config.quick_planning_widget=normalizeQuickPlanningWidgetConfig(config.quick_planning_widget);
 return config.quick_planning_widget
}
function renderQuickPlanningWidgetEditor(){
 let host=$('quickPlanningWidgetEditor');
 if(!host){
  const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
  const block=document.createElement('div');block.className='operationsWidgetAdmin quickPlanningWidgetAdmin';
  block.innerHTML='<div class="quickPlanningAdminHead"><div><span class="eyebrow">WIDGET DESKTOP · PLANNING</span><h3>Vue magasin aujourd’hui</h3><p>Équipe du matin en vert, équipe de l’après-midi en bleu, horaires du planning et ligne « Maintenant » automatique.</p></div><button class="btn secondaryBtn mini" type="button" onclick="renderQuickPlanningWidgetEditor()">↻ Actualiser</button></div><div id="quickPlanningWidgetEditor"></div>';
  panel.appendChild(block);host=$('quickPlanningWidgetEditor')
 }
 const w=ensureQuickPlanningWidgetConfig();
 host.innerHTML=
  '<div class="operationsWidgetAdminCard">'+
   '<div class="operationsWidgetAdminSummary"><div><strong>Personnalisation & visibilité</strong><small>Le widget occupe 8 colonnes sur 12 sur Desktop afin de rester très large tout en laissant 4 colonnes disponibles pour un second widget compact. Il se recalcule automatiquement depuis le planning publié.</small></div><label class="toggleChip"><input type="checkbox" data-quick-planning="enabled" '+(w.enabled!==false?'checked':'')+'> Afficher le widget</label></div>'+
   '<div class="quickPlanningAdminGrid">'+
    '<div class="field"><label>Titre</label><input maxlength="90" value="'+attr(w.title)+'" data-quick-planning="title"></div>'+
    '<div class="field"><label>Sous-titre</label><input maxlength="120" value="'+attr(w.subtitle)+'" data-quick-planning="subtitle"></div>'+
    '<div class="field"><label>Texte du bouton</label><input maxlength="80" value="'+attr(w.action_label)+'" data-quick-planning="action_label"></div>'+
    '<div class="field"><label>Densité</label><select data-quick-planning="density"><option value="comfortable" '+(w.density==='comfortable'?'selected':'')+'>Confortable</option><option value="compact" '+(w.density==='compact'?'selected':'')+'>Compacte</option></select></div>'+
    '<div class="field full"><label>Texte lorsqu’aucune personne n’est en poste</label><input maxlength="160" value="'+attr(w.empty_text)+'" data-quick-planning="empty_text"></div>'+
    '<div class="field"><label>Équipes</label><div class="quickPlanningTeamLegend"><span class="morning">Matin · vert</span><span class="afternoon">Après-midi · bleu</span></div></div>'+
   '</div>'+
   '<div class="operationsWidgetAdminToggles">'+
    '<label class="operationsWidgetToggle"><span><strong>Avatar</strong><small>Afficher les initiales / couleurs du profil.</small></span><input type="checkbox" data-quick-planning="show_avatar" '+(w.show_avatar?'checked':'')+'></label>'+
    '<label class="operationsWidgetToggle"><span><strong>Rôle</strong><small>Afficher le rôle sous le nom.</small></span><input type="checkbox" data-quick-planning="show_role" '+(w.show_role?'checked':'')+'></label>'+
    '<label class="operationsWidgetToggle"><span><strong>Horaire du poste</strong><small>Afficher la plage horaire active sous le nom.</small></span><input type="checkbox" data-quick-planning="show_shift" '+(w.show_shift?'checked':'')+'></label>'+
    '<label class="operationsWidgetToggle"><span><strong>Légende</strong><small>Afficher En poste · Pause · Maintenant.</small></span><input type="checkbox" data-quick-planning="show_legend" '+(w.show_legend?'checked':'')+'></label>'+
   '</div>'+
   '<div class="quickPlanningStyleGrid">'+
    '<div class="field"><label>Accent</label><input type="color" value="'+attr(w.style.accent)+'" data-quick-planning-style="accent"></div>'+
    '<div class="field"><label>« Maintenant »</label><input type="color" value="'+attr(w.style.now_color)+'" data-quick-planning-style="now_color"></div>'+
    '<div class="field"><label>Fond clair</label><input type="color" value="'+attr(w.style.surface_light)+'" data-quick-planning-style="surface_light"></div>'+
    '<div class="field"><label>Fond sombre</label><input type="color" value="'+attr(w.style.surface_dark)+'" data-quick-planning-style="surface_dark"></div>'+
    '<div class="field"><label>Texte clair</label><input type="color" value="'+attr(w.style.text_light)+'" data-quick-planning-style="text_light"></div>'+
    '<div class="field"><label>Texte sombre</label><input type="color" value="'+attr(w.style.text_dark)+'" data-quick-planning-style="text_dark"></div>'+
    '<div class="field"><label>Grille claire</label><input type="color" value="'+attr(w.style.grid_light)+'" data-quick-planning-style="grid_light"></div>'+
    '<div class="field"><label>Grille sombre</label><input type="color" value="'+attr(w.style.grid_dark)+'" data-quick-planning-style="grid_dark"></div>'+
    '<div class="field"><label>Arrondi (px)</label><input type="number" min="10" max="30" value="'+attr(w.style.radius)+'" data-quick-planning-style="radius"></div>'+
   '</div>'+
   '<div class="operationsWidgetAdminToggles"><label class="operationsWidgetToggle"><span><strong>Ombre</strong><small>Ajoute une profondeur légère autour du widget.</small></span><input type="checkbox" data-quick-planning-style="shadow" '+(w.style.shadow!==false?'checked':'')+'></label></div>'+
   '<div class="quickPlanningNote"><b>Plage horaire automatique :</b> aucune heure de début ou de fin n’est réglable manuellement. La frise présente les heures de 06:00 à 20:30 avec un repère continu en temps réel. Aucun défilement horizontal n’est proposé.</div>'+
   '<div class="quickPlanningPreview"><div class="quickPlanningPreviewCard"><div class="quickPlanningPreviewHead"><strong>'+esc(w.title)+'</strong><span>'+esc(w.action_label)+' →</span></div><div class="quickPlanningPreviewRow"><span class="quickPlanningPreviewName">Utilisateur</span><span class="quickPlanningPreviewTrack"><i class="quickPlanningPreviewBar"></i><i class="quickPlanningPreviewNow" style="border-color:'+attr(w.style.now_color)+'"></i></span></div></div></div>'+
  '</div>';
 host.querySelectorAll('[data-quick-planning]').forEach(el=>el.oninput=el.onchange=()=>{
  const node=ensureQuickPlanningWidgetConfig(),key=el.dataset.quickPlanning;
  node[key]=el.type==='checkbox'?el.checked:el.value;markDirty()
 });
 host.querySelectorAll('[data-quick-planning-style]').forEach(el=>el.oninput=el.onchange=()=>{
  const node=ensureQuickPlanningWidgetConfig(),key=el.dataset.quickPlanningStyle;
  let value=el.type==='checkbox'?el.checked:el.value;
  if(key==='radius')value=Math.max(10,Math.min(30,Number(value)||18));
  node.style[key]=value;markDirty()
 })
}



function ensureDesktopDashboardWidgetConfig(){
 config.desktop_dashboard_widget=normalizeDesktopDashboardWidgetConfig(config.desktop_dashboard_widget);
 return config.desktop_dashboard_widget
}

function desktopSidebarLogoNode(kind){
 const sidebar=ensureDesktopDashboardWidgetConfig().sidebar;
 const prefix=kind==='compact'?'logo_compact':'logo_full';
 return {url:String(sidebar[prefix+'_url']||''),path:String(sidebar[prefix+'_path']||''),name:String(sidebar[prefix+'_name']||'')};
}
function chooseDesktopSidebarLogo(kind){
 if(!['full','compact'].includes(kind))return;
 $('desktopSidebarLogoInput_'+kind)?.click()
}
function previewDesktopSidebarLogoChanges(){
 try{
  // Updating the desktop shell also asks ProfileUI to paint both brand variants.
  window.NethorDesktopShell?.applyDesktopShellConfig?.(config);
 }catch(e){console.warn('Aperçu logo latéral',e)}
}
async function uploadDesktopSidebarLogo(kind,input){
 const file=input?.files?.[0];if(!file)return;
 const state=$('saveState');
 try{
  if(!['full','compact'].includes(kind))throw new Error('Emplacement de logo invalide');
  const ext=String(file.name||'').split('.').pop().toLowerCase();
  if(!['png','webp','svg'].includes(ext))throw new Error('Format accepté : PNG, WebP ou SVG.');
  if(file.size>3*1024*1024)throw new Error('Logo trop volumineux : maximum 3 Mo.');
  if(ext==='svg'){
   const svg=await file.text();
   // SVG stays an image asset: refuse embedded scripts, event handlers and external references.
   if(!/<svg[\s>]/i.test(svg)||/<\s*(script|foreignObject|iframe|object|embed)\b/i.test(svg)||
      /\bon[a-z]+\s*=/i.test(svg)||/javascript\s*:/i.test(svg)||/\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:)/i.test(svg))
    throw new Error('SVG non sécurisé : utilise un SVG graphique sans scripts ni ressources externes.');
  }
  if(state){state.className='saveState';state.textContent='Import du logo '+(kind==='full'?'complet':'compact')+'…'}
  const storagePath='desktop/sidebar/'+kind+'-'+Date.now()+'.'+ext;
  const contentType=ext==='svg'?'image/svg+xml':ext==='png'?'image/png':'image/webp';
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType});
  if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath);
  if(!data?.publicUrl)throw new Error('Lien public du logo indisponible.');
  const side=ensureDesktopDashboardWidgetConfig().sidebar;
  side['logo_'+kind+'_url']=data.publicUrl;
  side['logo_'+kind+'_path']=storagePath;
  side['logo_'+kind+'_name']=String(file.name||'Logo');
  markDirty();renderDesktopSidebarLogoEditor();previewDesktopSidebarLogoChanges();
  if(state)state.textContent='Logo '+(kind==='full'?'complet':'compact')+' prêt · clique Enregistrer pour publier'
 }catch(e){
  if(state){state.className='saveState err';state.textContent='Erreur logo latéral : '+(e?.message||e)}
 }finally{if(input)input.value=''}
}
function removeDesktopSidebarLogo(kind){
 if(!['full','compact'].includes(kind))return;
 const side=ensureDesktopDashboardWidgetConfig().sidebar;
 for(const field of ['url','path','name'])side['logo_'+kind+'_'+field]='';
 markDirty();renderDesktopSidebarLogoEditor();previewDesktopSidebarLogoChanges()
}
function downloadDesktopSidebarLogo(kind){
 if(!['full','compact'].includes(kind))return;
 const asset=desktopSidebarLogoNode(kind);
 if(asset.url)downloadAssetUrl(asset.url,asset.name||'logo-nethor-'+kind+'.svg')
}
function renderDesktopSidebarLogoEditor(){
 if(!$('tab-desktop'))return;
 let host=$('desktopSidebarLogoEditor');
 if(!host){
  host=document.createElement('section');
  host.id='desktopSidebarLogoEditor';host.className='panel desktopSidebarLogoEditor';
  const anchor=$('platformIdentity_desktop');
  if(anchor)anchor.insertAdjacentElement('afterend',host);
  else $('tab-desktop').prepend(host);
 }
 const sidebar=ensureDesktopDashboardWidgetConfig().sidebar;
 const card=kind=>{
  const compact=kind==='compact',item=desktopSidebarLogoNode(kind),label=compact?'Logo compact':'Logo complet';
  const fallback=compact?'<span class="ddBrandDefaultCompact">n</span>':'<span class="ddBrandDefaultFull">nethor</span>';
  return '<article class="ddBrandCard">'+
    '<div class="ddBrandStage '+(compact?'ddBrandStageCompact':'ddBrandStageFull')+'">'+
     (item.url?'<img src="'+attr(item.url)+'" alt="Aperçu '+label+'" loading="lazy">':fallback)+
    '</div>'+
    '<div class="ddBrandCopy"><strong>'+label+'</strong>'+
     '<small>'+(compact?'Visible lorsque la navigation est rétractée. Format carré conseillé, par exemple 256 × 256 px.':'Visible lorsque la navigation est déployée. Format horizontal conseillé.')+'</small>'+
     '<span>'+(item.url?esc(item.name||'Logo personnalisé'):'Identité Nethor par défaut')+'</span>'+
    '</div>'+
    '<div class="ddBrandActions">'+
     '<button type="button" class="btn secondaryBtn mini" onclick="chooseDesktopSidebarLogo(\''+kind+'\')">Importer un logo</button>'+
     (item.url?'<button type="button" class="btn secondaryBtn mini" onclick="downloadDesktopSidebarLogo(\''+kind+'\')">Télécharger</button><button type="button" class="btn secondaryBtn mini" onclick="removeDesktopSidebarLogo(\''+kind+'\')">Réinitialiser</button>':'')+
    '</div>'+
    '<input id="desktopSidebarLogoInput_'+kind+'" type="file" hidden accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml" onchange="uploadDesktopSidebarLogo(\''+kind+'\',this)">'+
   '</article>';
 };
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Logos de la barre latérale Desktop</h2><p>Deux fichiers indépendants pour la barre complète et la barre compacte. Les logos mobiles ne sont pas modifiés.</p></div></div>'+
  '<div class="ddBrandGrid">'+card('full')+card('compact')+'</div>'+
  '<div class="ddBrandFootnote">Les fichiers sont conservés dans les médias sécurisés du portail. Clique <b>Enregistrer</b> après l’importation pour appliquer le logo à tous les comptes Desktop. Le choix « Complet / Compact » reste local à chaque navigateur.</div>';
}


function desktopGlobalBackgroundNode(){
 return ensureDesktopDashboardWidgetConfig().background
}
function applyDesktopGlobalBackgroundPreview(){
 try{window.NethorDesktopShell?.applyDesktopShellConfig?.(config)}
 catch(e){console.warn('Aperçu du fond Desktop indisponible',e)}
}
function chooseDesktopGlobalBackground(){
 $('desktopGlobalBackgroundFile')?.click()
}
function removeDesktopGlobalBackground(){
 const node=desktopGlobalBackgroundNode();
 node.image_url='';node.image_path='';node.image_name='';node.enabled=false;
 markDirty();renderDesktopGlobalBackgroundEditor();applyDesktopGlobalBackgroundPreview()
}
function downloadDesktopGlobalBackground(){
 const node=desktopGlobalBackgroundNode();
 if(node.image_url)downloadAssetUrl(node.image_url,node.image_name||'fond-nethor-desktop.webp')
}
function updateDesktopGlobalBackgroundPreview(){
 const host=$('desktopGlobalBackgroundEditor');if(!host)return;
 const node=desktopGlobalBackgroundNode(),image=host.querySelector('.ndBgPreview'),badge=host.querySelector('.ndBgPreviewBadge');
 const hasImage=!!String(node.image_url||'').trim(),opacity=Math.max(0,Math.min(75,Number(node.veil)||0))/100;
 const color=document.documentElement.dataset.theme==='dark'?'17,19,23':'247,249,252';
 if(image){
  image.style.backgroundImage=hasImage?
   'linear-gradient(rgba('+color+','+opacity+'),rgba('+color+','+opacity+')),url('+JSON.stringify(node.image_url)+')':'none';
  image.style.backgroundSize='cover,'+(node.fit==='contain'?'contain':'cover');
  image.style.backgroundPosition='center,'+(node.position==='top'?'center top':node.position==='bottom'?'center bottom':'center center');
  image.style.backgroundRepeat='no-repeat';
  image.classList.toggle('hasImage',hasImage);
 }
 if(badge)badge.textContent=!hasImage?'Aucun fond sélectionné':node.enabled?'Fond activé · Desktop':'Fond désactivé';
 const value=host.querySelector('.ndBgVeilValue');if(value)value.textContent=node.veil+' %';
}
async function uploadDesktopGlobalBackground(input){
 const file=input?.files?.[0];if(!file)return;
 const state=$('saveState');
 try{
  const ext=String(file.name||'').split('.').pop().toLowerCase();
  const mime={'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp'};
  if(!Object.prototype.hasOwnProperty.call(mime,ext))throw new Error('Format accepté : PNG, JPG ou WebP.');
  if(file.type&&file.type!==mime[ext])throw new Error('Le format du fichier ne correspond pas à son extension.');
  if(file.size>8*1024*1024)throw new Error('Image trop volumineuse : 8 Mo maximum.');
  if(!file.size)throw new Error('Le fichier sélectionné est vide.');
  if(state){state.className='saveState';state.textContent='Import du fond Desktop…'}
  const storagePath='desktop/background/wallpaper-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:mime[ext]});
  if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath);
  if(!data?.publicUrl)throw new Error('Lien public du fond indisponible.');
  const node=desktopGlobalBackgroundNode();
  node.image_url=data.publicUrl;node.image_path=storagePath;node.image_name=String(file.name||'Fond Desktop');
  node.enabled=true;
  markDirty();renderDesktopGlobalBackgroundEditor();applyDesktopGlobalBackgroundPreview();
  if(state)state.textContent='Fond Desktop prêt · clique Enregistrer pour le publier sur toutes les pages';
 }catch(e){
  if(state){state.className='saveState err';state.textContent='Erreur fond Desktop : '+(e?.message||e)}
 }finally{if(input)input.value=''}
}
function renderDesktopGlobalBackgroundEditor(){
 const desktopTab=$('tab-desktop');if(!desktopTab)return;
 let host=$('desktopGlobalBackgroundEditor');
 if(!host){
  host=document.createElement('section');
  host.id='desktopGlobalBackgroundEditor';
  host.className='panel desktopGlobalBackgroundEditor';
  const logos=$('desktopSidebarLogoEditor'),identity=$('platformIdentity_desktop');
  if(logos)logos.insertAdjacentElement('afterend',host);
  else if(identity)identity.insertAdjacentElement('afterend',host);
  else desktopTab.prepend(host);
 }
 const node=desktopGlobalBackgroundNode(),exists=!!node.image_url;
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Fond d’écran global · Desktop</h2>'+
  '<p>Un fond commun à toutes les pages ordinateur, derrière les widgets et les panneaux. La version mobile et l’écran de connexion restent indépendants.</p></div></div>'+
  '<div class="ndBgLayout"><div class="ndBgPreview" aria-label="Aperçu du fond global"><span class="ndBgPreviewBadge"></span>'+
   '<div class="ndBgPreviewScreen"><span class="ndBgPreviewSidebar"></span><span class="ndBgPreviewHeader"></span><span class="ndBgPreviewCard"></span><span class="ndBgPreviewCard second"></span></div></div>'+
  '<div class="ndBgDetails"><strong>'+(exists?esc(node.image_name||'Image personnalisée'):'Aucune image importée')+'</strong>'+
   '<small>'+(exists?'Le fond s’appliquera à tous les comptes Desktop après Enregistrer.':'Formats PNG, JPG, WebP · maximum 8 Mo. Résolution 1920 × 1080 px conseillée.')+'</small>'+
   '<label class="ndBgEnabled"><input type="checkbox" data-nd-bg-setting="enabled" '+(node.enabled?'checked':'')+'> <span>Afficher le fond sur toutes les pages Desktop</span></label>'+
   '<div class="ndBgButtons"><button class="btn secondaryBtn mini" type="button" onclick="chooseDesktopGlobalBackground()">Importer une image</button>'+
    (exists?'<button class="btn secondaryBtn mini" type="button" onclick="downloadDesktopGlobalBackground()">Télécharger</button>'+
      '<button class="btn secondaryBtn mini" type="button" onclick="removeDesktopGlobalBackground()">Réinitialiser</button>':'')+
   '</div><input type="file" id="desktopGlobalBackgroundFile" hidden accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange="uploadDesktopGlobalBackground(this)"></div></div>'+
  '<div class="ndBgSettings"><div class="field"><label for="desktopGlobalBackgroundFit">Cadrage de l’image</label>'+
    '<select id="desktopGlobalBackgroundFit" data-nd-bg-setting="fit"><option value="cover" '+(node.fit==='cover'?'selected':'')+'>Remplir l’écran</option><option value="contain" '+(node.fit==='contain'?'selected':'')+'>Afficher toute l’image</option></select></div>'+
   '<div class="field"><label for="desktopGlobalBackgroundPosition">Position</label><select id="desktopGlobalBackgroundPosition" data-nd-bg-setting="position">'+
    [['top','Haut'],['center','Centre'],['bottom','Bas']].map(x=>'<option value="'+x[0]+'" '+(node.position===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></div>'+
   '<div class="field ndBgVeil"><label for="desktopGlobalBackgroundVeil">Voile de lecture <b class="ndBgVeilValue">'+node.veil+' %</b></label>'+
    '<input id="desktopGlobalBackgroundVeil" type="range" min="0" max="75" step="5" value="'+node.veil+'" data-nd-bg-setting="veil"><small>Un voile léger garde les textes lisibles. 0 % = image sans voile.</small></div></div>'+
  '<p class="ndBgFoot">Ce réglage ne modifie ni les images des widgets, ni la bannière du magasin. Clique <b>Enregistrer</b> pour le publier.</p>';
 host.querySelectorAll('[data-nd-bg-setting]').forEach(el=>{
  el.oninput=el.onchange=()=>{
   const key=el.dataset.ndBgSetting,settings=desktopGlobalBackgroundNode();
   settings[key]=key==='enabled'?el.checked:key==='veil'?Math.max(0,Math.min(75,Number(el.value)||0)):el.value;
   markDirty();updateDesktopGlobalBackgroundPreview();applyDesktopGlobalBackgroundPreview();
  };
 });
 updateDesktopGlobalBackgroundPreview()
}

function chooseDesktopStoreImage(){$('desktopStoreImageFile')?.click()}
function desktopStoreImageEffective(){
 const node=ensureDesktopDashboardWidgetConfig(),own=String(node.header.store_image_url||'').trim();
 return{url:own||String(config?.store_info_widget?.photo_url||'').trim(),name:String(node.header.store_image_name||config?.store_info_widget?.photo_name||'Netto-Le-Thor')}
}
async function uploadDesktopStoreImage(input){
 const file=input?.files?.[0];if(!file)return;
 const state=$('saveState');
 try{
  const ext=(file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,''),allowed=new Set(['jpg','jpeg','png','webp','avif']);
  if(!allowed.has(ext))throw new Error('Format non pris en charge. Utilise JPG, PNG, WEBP ou AVIF.');
  if(file.size>8*1024*1024)throw new Error('Image trop lourde : 8 Mo maximum.');
  if(state){state.className='saveState';state.textContent='Import de la photo du point de vente…'}
  const storagePath='desktop/header/store-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=ensureDesktopDashboardWidgetConfig();
  node.header.store_image_url=data?.publicUrl||'';node.header.store_image_path=storagePath;node.header.store_image_name=file.name;
  markDirty();renderDesktopDashboardWidgetEditor();if(state)state.textContent='Photo du point de vente prête à être enregistrée'
 }catch(e){
  if(state){state.className='saveState err';state.textContent='Erreur photo : '+(e?.message||e)}
  alert('Import impossible : '+(e?.message||e))
 }finally{if(input)input.value=''}
}
function downloadDesktopStoreImage(){
 const asset=desktopStoreImageEffective();if(asset.url)downloadAssetUrl(asset.url,asset.name||'Netto-Le-Thor')
}
function removeDesktopStoreImage(){
 const node=ensureDesktopDashboardWidgetConfig();node.header.store_image_url='';node.header.store_image_path='';node.header.store_image_name='';
 markDirty();renderDesktopDashboardWidgetEditor()
}
const DESKTOP_DASHBOARD_WIDGET_LABELS={
 store_banner:'Bannière point de vente',present_staff:'Effectif présent',planning_coverage:'Couverture planning',daily_tasks:'Tâches du jour',critical_alerts:'Alertes critiques',deliveries:'Livraisons attendues',priorities:'Priorités immédiates',planning_view:'Vue magasin aujourd’hui',team_service:'Équipe en service',operations_followup:'Suivi opérationnel',priority_messages:'Messages prioritaires',quick_actions:'Actions rapides'
};
function renderDesktopDashboardWidgetEditor(){
 let host=$('desktopDashboardWidgetEditor');
 if(!host){
  const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
  const block=document.createElement('div');block.className='operationsWidgetAdmin desktopDashboardWidgetAdmin';
  block.innerHTML='<div class="quickPlanningAdminHead"><div><span class="eyebrow">DESKTOP · STRUCTURE COMPLÈTE</span><h3>Tableau de bord point de vente</h3><p>Entête, barre latérale, widgets, raccourcis et style. Les droits réels restent séparés dans Utilisateurs & accès.</p></div><button class="btn secondaryBtn mini" type="button" onclick="renderDesktopDashboardWidgetEditor()">↻ Actualiser</button></div><div id="desktopDashboardWidgetEditor"></div>';
  panel.appendChild(block);host=$('desktopDashboardWidgetEditor')
 }
 const w=ensureDesktopDashboardWidgetConfig(),sidebarLabels={home:'Accueil',planning:'Planning',chat:'Chat',management:'Gestion',settings:'Paramètres'};
 host.innerHTML='<div class="operationsWidgetAdminCard">'+
  '<div class="operationsWidgetAdminSummary"><div><strong>Structure Desktop de référence</strong><small>Reproduit la hiérarchie visuelle de la maquette : navigation fixe, entête compact et tableau de bord opérationnel.</small></div><label class="toggleChip"><input type="checkbox" data-dd-root="enabled" '+(w.enabled?'checked':'')+'> Tableau de bord actif</label></div>'+
  '<div class="ddAdminSection"><div class="ddAdminTitle"><strong>Entête Desktop</strong><small>Uniquement les éléments de la référence : point de vente, date/heure, notifications et compte.</small></div>'+
   '<div class="ddAdminGrid"><div class="field"><label>Nom du point de vente</label><input maxlength="90" value="'+attr(w.header.store_name)+'" data-dd-header="store_name"></div><div class="field"><label>Sous-titre</label><input maxlength="90" value="'+attr(w.header.store_subtitle)+'" data-dd-header="store_subtitle"></div><div class="field full"><label>Fiche Google / destination du point de vente</label><input maxlength="700" value="'+attr(w.header.store_url)+'" data-dd-header="store_url"><small>Par défaut : fiche Google Maps officielle de Netto Le Thor.</small></div></div>'+
   (()=>{const asset=desktopStoreImageEffective(),own=!!String(w.header.store_image_url||'').trim();return '<div class="desktopStoreImageAdmin"><div class="desktopStoreImagePreview '+(asset.url?'hasImage':'')+'" '+(asset.url?'style="background-image:url(&quot;'+attr(asset.url)+'&quot;)"':'')+'></div><div class="desktopStoreImageCopy"><strong>Photo du point de vente</strong><small>Image affichée à gauche de « '+esc(w.header.store_name)+' ». Si aucune photo spécifique n’est définie, la bannière magasin reste utilisée en secours.</small><span>'+(own?esc(w.header.store_image_name||'Image personnalisée'):asset.url?'Photo de la bannière utilisée':'Aucune image')+'</span></div><div class="desktopStoreImageActions"><button class="btn secondaryBtn mini" type="button" onclick="chooseDesktopStoreImage()">Changer</button>'+(asset.url?'<button class="btn secondaryBtn mini" type="button" onclick="downloadDesktopStoreImage()">Télécharger</button>':'')+(own?'<button class="btn secondaryBtn mini" type="button" onclick="removeDesktopStoreImage()">Revenir à la bannière</button>':'')+'</div><input id="desktopStoreImageFile" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" hidden onchange="uploadDesktopStoreImage(this)"></div>'})()+
   '<div class="operationsWidgetAdminToggles">'+
    [['show_store','Point de vente'],['show_store_image','Image du magasin'],['show_datetime','Date & heure'],['show_admin_logs','Logs connexions (admin)'],['show_mobile_preview','Visualiser mobile'],['show_update','Mise à jour Nethor'],['show_notifications','Notifications'],['show_user','Compte utilisateur']].map(x=>'<label class="operationsWidgetToggle"><span><strong>'+x[1]+'</strong><small>Afficher dans l’entête Desktop.</small></span><input type="checkbox" data-dd-header="'+x[0]+'" '+(w.header[x[0]]?'checked':'')+'></label>').join('')+
   '</div></div>'+
  '<div class="ddAdminSection"><div class="ddAdminTitle"><strong>Barre latérale</strong><small>Navigation : Accueil, Planning, Chat, Gestion et Paramètres. Les logos du mode complet et du mode compact se personnalisent dans Gestion → Desktop.</small></div>'+
   '<div class="ddAdminGrid"><label class="toggleChip ddSidebarToggle"><input type="checkbox" data-dd-sidebar="enabled" '+(w.sidebar.enabled?'checked':'')+'> Afficher la barre latérale</label><div class="field"><label>Largeur</label><input type="number" min="180" max="280" value="'+attr(w.sidebar.width)+'" data-dd-sidebar="width"><small>px</small></div></div>'+
   '<div class="ddSidebarEditor">'+Object.entries(sidebarLabels).map(([key,label])=>{const x=w.sidebar.items[key];return'<div class="ddSidebarRow"><label class="ddEnabled"><input type="checkbox" data-dd-sidebar-item="'+key+'" data-dd-sidebar-key="enabled" '+(x.enabled?'checked':'')+'><span>'+esc(label)+'</span></label><input aria-label="Libellé '+attr(label)+'" value="'+attr(x.label)+'" data-dd-sidebar-item="'+key+'" data-dd-sidebar-key="label"><input aria-label="Destination '+attr(label)+'" value="'+attr(x.url)+'" data-dd-sidebar-item="'+key+'" data-dd-sidebar-key="url"></div>'}).join('')+'</div></div>'+
  '<div class="ddAdminSection"><div class="ddAdminTitle"><strong>Widgets du tableau de bord</strong><small>Afficher/masquer et renommer chaque bloc sans modifier les permissions.</small></div>'+
   '<div class="ddWidgetEditor">'+Object.entries(DESKTOP_DASHBOARD_WIDGET_LABELS).map(([key,label])=>{const x=w.widgets[key];return'<div class="ddWidgetRow"><label class="ddEnabled"><input type="checkbox" data-dd-widget="'+key+'" data-dd-widget-key="enabled" '+(x.enabled?'checked':'')+'><span>'+esc(label)+'</span></label><input aria-label="Titre '+attr(label)+'" value="'+attr(x.label)+'" data-dd-widget="'+key+'" data-dd-widget-key="label">'+(('max_items' in x)?'<input class="ddMax" type="number" min="1" max="12" aria-label="Nombre maximum" value="'+attr(x.max_items)+'" data-dd-widget="'+key+'" data-dd-widget-key="max_items">':key==='planning_view'?'<label class="ddTinyToggle"><input type="checkbox" data-dd-widget="'+key+'" data-dd-widget-key="show_all_day" '+(x.show_all_day!==false?'checked':'')+'> Journée</label>':'<span class="ddMaxSpacer"></span>')+'</div>'}).join('')+'</div><label class="operationsWidgetToggle ddPlanningModeToggle"><span><strong>Vue planning · journée complète</strong><small>Affiche les personnes planifiées sur la journée, même lorsqu’elles ne sont pas encore en poste ou ont déjà terminé.</small></span><input type="checkbox" data-dd-widget="planning_view" data-dd-widget-key="show_all_day" '+(w.widgets.planning_view.show_all_day!==false?'checked':'')+'></label></div>'+
  '<div class="ddAdminSection"><div class="ddAdminTitle"><strong>Actions rapides</strong><small>Libellé, destination et visibilité de chaque raccourci.</small></div>'+
   '<div class="ddSidebarEditor">'+Object.entries(w.quick_actions).map(([key,x])=>'<div class="ddSidebarRow"><label class="ddEnabled"><input type="checkbox" data-dd-action="'+key+'" data-dd-action-key="enabled" '+(x.enabled?'checked':'')+'><span>'+esc(key)+'</span></label><input aria-label="Libellé action" value="'+attr(x.label)+'" data-dd-action="'+key+'" data-dd-action-key="label"><input aria-label="Destination action" value="'+attr(x.url)+'" data-dd-action="'+key+'" data-dd-action-key="url"></div>').join('')+'</div></div>'+
  '<div class="ddAdminSection"><div class="ddAdminTitle"><strong>Style général</strong><small>Réglages partagés entre le tableau de bord et sa navigation Desktop.</small></div><div class="ddAdminGrid"><div class="field"><label>Couleur d’accent</label><input type="color" value="'+attr(w.style.accent)+'" data-dd-style="accent"></div><div class="field"><label>Arrondi</label><input type="number" min="10" max="28" value="'+attr(w.style.radius)+'" data-dd-style="radius"></div><div class="field"><label>Espacement</label><input type="number" min="8" max="24" value="'+attr(w.style.gap)+'" data-dd-style="gap"></div><div class="field"><label>Texte barre latérale</label><input type="number" min="70" max="160" step="5" value="'+attr(w.style.sidebar_text_scale)+'" data-dd-style="sidebar_text_scale"><small>% · 100 = taille actuelle</small></div><div class="field"><label>Texte widgets + contenu</label><input type="number" min="70" max="160" step="5" value="'+attr(w.style.widget_text_scale)+'" data-dd-style="widget_text_scale"><small>% · 100 = taille actuelle</small></div></div>'+
   '<label class="operationsWidgetToggle ddLegacyToggle"><span><strong>Afficher aussi l’ancien module Pilotage magasin</strong><small>Désactivé par défaut car ses informations sont désormais réparties dans les nouveaux widgets.</small></span><input type="checkbox" data-dd-root="legacy_operations_hub" '+(w.legacy_operations_hub?'checked':'')+'></label></div>'+
  '<div class="operationsWidgetAdminNote"><b>Architecture :</b> les réglages de cette carte ne donnent aucun droit supplémentaire. Les destinations protégées continuent d’être contrôlées par Rôles & permissions et par les politiques serveur.</div>'+
 '</div>';
 host.querySelectorAll('[data-dd-root]').forEach(el=>el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig();node[el.dataset.ddRoot]=el.checked;markDirty()});
 host.querySelectorAll('[data-dd-header]').forEach(el=>el.oninput=el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig(),key=el.dataset.ddHeader;node.header[key]=el.type==='checkbox'?el.checked:el.value;markDirty()});
 host.querySelectorAll('[data-dd-sidebar]').forEach(el=>el.oninput=el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig(),key=el.dataset.ddSidebar;node.sidebar[key]=el.type==='checkbox'?el.checked:Math.max(180,Math.min(280,Number(el.value)||210));markDirty()});
 host.querySelectorAll('[data-dd-sidebar-item]').forEach(el=>el.oninput=el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig(),item=node.sidebar.items[el.dataset.ddSidebarItem],key=el.dataset.ddSidebarKey;item[key]=el.type==='checkbox'?el.checked:el.value;markDirty()});
 host.querySelectorAll('[data-dd-widget]').forEach(el=>el.oninput=el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig(),item=node.widgets[el.dataset.ddWidget],key=el.dataset.ddWidgetKey;item[key]=el.type==='checkbox'?el.checked:key==='max_items'?Math.max(1,Math.min(12,Number(el.value)||1)):el.value;markDirty()});
 host.querySelectorAll('[data-dd-action]').forEach(el=>el.oninput=el.onchange=()=>{const node=ensureDesktopDashboardWidgetConfig(),item=node.quick_actions[el.dataset.ddAction],key=el.dataset.ddActionKey;item[key]=el.type==='checkbox'?el.checked:el.value;markDirty()});
 host.querySelectorAll('[data-dd-style]').forEach(el=>el.oninput=el.onchange=()=>{
  const node=ensureDesktopDashboardWidgetConfig(),key=el.dataset.ddStyle;
  if(key==='accent')node.style[key]=el.value;
  else if(key==='radius')node.style[key]=Math.max(10,Math.min(28,Number(el.value)||16));
  else if(key==='gap')node.style[key]=Math.max(8,Math.min(24,Number(el.value)||14));
  else if(key==='sidebar_text_scale'||key==='widget_text_scale')node.style[key]=Math.max(70,Math.min(160,Number(el.value)||100));
  markDirty();
  try{window.NethorDesktopShell?.applyDesktopShellConfig?.(config)}catch(_){}
 })
}

const MOBILE_HOME_WIDGET_DEFS=[
 {id:'welcome',label:'Bonjour / espace de travail',description:'Accueil personnalisé et date du jour.',icon:'home'},
 {id:'next_shift',label:'Prise de poste',description:'Prochaine plage horaire issue du planning.',icon:'planning'},
 {id:'hours',label:'Mes heures',description:'Total des heures planifiées cette semaine.',icon:'planning'},
 {id:'absences',label:'Congés',description:'Congés et absence à venir.',icon:'planning'},
 {id:'next_rest',label:'Prochain repos',description:'Premier jour de repos à venir.',icon:'planning'},
 {id:'tasks',label:'Tâches du jour',description:'Missions quotidiennes et validation.',icon:'articles'},
 {id:'important_info',label:'Informations importantes',description:'Informations et notifications prioritaires.',icon:'notifications'},
 {id:'team_today',label:'Équipe aujourd’hui',description:'Personnes planifiées sur la journée.',icon:'accounts'},
 {id:'quick_access',label:'Accès rapides',description:'Raccourcis vers les principaux outils.',icon:'home'}
];
const KNOWN_MANAGED_WIDGET_KEYS=new Set(['store_info_widget','quick_planning_widget','desktop_dashboard_widget']);
function ensureMobileHomeWidgetDisplayConfig(){
 config.home_widgets=config.home_widgets&&typeof config.home_widgets==='object'?config.home_widgets:{};
 for(const def of MOBILE_HOME_WIDGET_DEFS){
  const node=config.home_widgets[def.id]=config.home_widgets[def.id]&&typeof config.home_widgets[def.id]==='object'?config.home_widgets[def.id]:{};
  node.enabled=node.enabled!==false;
  node.platform='mobile';
  node.category='home';
  delete node.roles;delete node.subroles
 }
 return config.home_widgets
}
function managementWidgetIcon(def){
 const fn=window.NettoProfileUI?.mobileNavIcon;
 return typeof fn==='function'?fn(def.icon||'home'):'•'
}
function renderMobileHomeWidgetEditor(){
 const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
 let section=$('mobileHomeWidgetSection');
 if(!section){
  section=document.createElement('div');section.id='mobileHomeWidgetSection';section.className='widgetPlatformSection';
  const toolbar=panel.querySelector(':scope > .toolbar');toolbar?.insertAdjacentElement('afterend',section)
 }
 const nodes=ensureMobileHomeWidgetDisplayConfig(),enabled=MOBILE_HOME_WIDGET_DEFS.filter(x=>nodes[x.id]?.enabled!==false).length;
 section.innerHTML='<div class="widgetPlatformHead"><div><span>ACCUEIL · MOBILE UNIQUEMENT</span><strong>Widgets de l’accueil mobile</strong><small>Ces blocs ne sont jamais créés sur Desktop. Ici, on règle uniquement leur affichage global.</small></div><div class="widgetBulkActions"><button type="button" data-mobile-widget-bulk="on">Tout afficher</button><button type="button" data-mobile-widget-bulk="off">Tout masquer</button><b class="widgetPlatformBadge mobile">'+enabled+'/'+MOBILE_HOME_WIDGET_DEFS.length+' visibles</b></div></div>'+
 '<div class="mobileWidgetGrid">'+MOBILE_HOME_WIDGET_DEFS.map(def=>{const node=nodes[def.id]||{};return'<label class="mobileWidgetCard"><span class="mobileWidgetIcon">'+managementWidgetIcon(def)+'</span><span class="mobileWidgetCopy"><strong>'+esc(def.label)+'</strong><small>'+esc(def.description)+'</small></span><span class="mobileWidgetSwitch"><input type="checkbox" data-mobile-home-widget="'+attr(def.id)+'" '+(node.enabled!==false?'checked':'')+'> '+(node.enabled!==false?'Affiché':'Masqué')+'</span></label>'}).join('')+'</div>'+
 '<div class="widgetLegacyClean"><b>Règle claire :</b> aucun rôle ni sous-rôle ici. Les préférences individuelles peuvent encore masquer un widget pour un utilisateur, mais l’administrateur définit uniquement s’il existe ou non sur l’accueil Mobile.</div>';
 section.querySelectorAll('[data-mobile-home-widget]').forEach(input=>input.onchange=()=>{
  const node=ensureMobileHomeWidgetDisplayConfig()[input.dataset.mobileHomeWidget];node.enabled=input.checked;markDirty();renderMobileHomeWidgetEditor()
 });
 section.querySelectorAll('[data-mobile-widget-bulk]').forEach(btn=>btn.onclick=()=>{
  const value=btn.dataset.mobileWidgetBulk==='on';const nodes=ensureMobileHomeWidgetDisplayConfig();
  MOBILE_HOME_WIDGET_DEFS.forEach(def=>nodes[def.id].enabled=value);markDirty();renderMobileHomeWidgetEditor()
 })
}
function inferManagedWidgetPlatform(id,node={},root='home_widgets'){
 const explicit=String(node?.management?.platform||node?.platform||'').toLowerCase();
 if(['mobile','desktop','all'].includes(explicit))return explicit;
 if(MOBILE_HOME_WIDGET_DEFS.some(x=>x.id===id))return'mobile';
 if(root==='store_info_widget'||root==='quick_planning_widget'||/(desktop|banner|store_info|quick_planning)/i.test(id))return'desktop';
 if(/mobile/i.test(id))return'mobile';
 return'all'
}
function inferManagedWidgetCategory(id,node={}){
 const explicit=String(node?.management?.category||node?.category||'').toLowerCase();
 if(explicit)return explicit;
 return /(operations|pilot|service|order|delivery|hub)/i.test(id)?'operations':'home'
}
function discoverManagedWidgets(){
 const rows=[];
 const knownHome=new Set([...MOBILE_HOME_WIDGET_DEFS.map(x=>x.id),'operations_hub']);
 for(const [id,node] of Object.entries(config.home_widgets||{})){
  if(knownHome.has(id))continue;
  rows.push({id,root:'home_widgets',node:node&&typeof node==='object'?node:{},platform:inferManagedWidgetPlatform(id,node,'home_widgets'),category:inferManagedWidgetCategory(id,node)})
 }
 for(const [key,node] of Object.entries(config||{})){
  if(!/_widget$/.test(key)||KNOWN_MANAGED_WIDGET_KEYS.has(key))continue;
  rows.push({id:key,root:key,node:node&&typeof node==='object'?node:{},platform:inferManagedWidgetPlatform(key,node,key),category:inferManagedWidgetCategory(key,node)})
 }
 const registry=window.NethorWidgetRegistry;
 const external=Array.isArray(registry)?registry:(typeof registry?.items==='function'?registry.items():[]);
 for(const item of external||[]){
  const id=String(item?.id||'').trim();if(!id||rows.some(x=>x.id===id)||knownHome.has(id)||KNOWN_MANAGED_WIDGET_KEYS.has(id))continue;
  rows.push({id,root:String(item.root||'registry'),node:item,platform:inferManagedWidgetPlatform(id,item,item.root),category:inferManagedWidgetCategory(id,item)})
 }
 return rows
}
function setDiscoveredWidgetEnabled(row,value){
 if(row.root==='home_widgets'){
  config.home_widgets=config.home_widgets&&typeof config.home_widgets==='object'?config.home_widgets:{};
  const node=config.home_widgets[row.id]=config.home_widgets[row.id]&&typeof config.home_widgets[row.id]==='object'?config.home_widgets[row.id]:{};
  node.enabled=value;node.platform=row.platform;node.category=row.category
 }else if(row.root!=='registry'){
  const node=config[row.root]=config[row.root]&&typeof config[row.root]==='object'?config[row.root]:{};
  node.enabled=value;
  node.management=node.management&&typeof node.management==='object'?node.management:{};
  node.management.platform=row.platform;node.management.category=row.category
 }
 markDirty()
}
function renderAutoDiscoveredWidgets(){
 const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
 let section=$('autoDiscoveredWidgetSection');
 if(!section){section=document.createElement('div');section.id='autoDiscoveredWidgetSection';section.className='widgetPlatformSection';panel.appendChild(section)}
 const rows=discoverManagedWidgets();
 section.classList.toggle('hidden',!rows.length);
 if(!rows.length){section.innerHTML='';return}
 const label=p=>p==='mobile'?'Mobile':p==='desktop'?'Desktop':'Mobile + Desktop';
 section.innerHTML='<div class="widgetPlatformHead"><div><span>CLASSEMENT AUTOMATIQUE</span><strong>Widgets détectés automatiquement</strong><small>Tout nouveau widget déclaré dans la configuration est classé selon sa plateforme et sa catégorie. Les métadonnées platform/category sont prioritaires.</small></div><b class="widgetPlatformBadge">'+rows.length+' détecté'+(rows.length>1?'s':'')+'</b></div>'+
 '<div class="autoWidgetGrid">'+rows.map((row,index)=>'<label class="autoWidgetCard"><span class="autoWidgetIcon">'+managementWidgetIcon({icon:row.category==='operations'?'planning':'home'})+'</span><span class="autoWidgetCopy"><strong>'+esc(row.node?.label||row.node?.title||row.id)+'</strong><small>'+esc(label(row.platform)+' · '+row.category+' · '+row.id)+'</small></span><span class="mobileWidgetSwitch"><input type="checkbox" data-auto-widget-index="'+index+'" '+(row.node?.enabled!==false?'checked':'')+'> '+(row.node?.enabled!==false?'Actif':'Inactif')+'</span></label>').join('')+'</div>';
 section.querySelectorAll('[data-auto-widget-index]').forEach(input=>input.onchange=()=>{const row=rows[Number(input.dataset.autoWidgetIndex)];if(row)setDiscoveredWidgetEnabled(row,input.checked);renderAutoDiscoveredWidgets()})
}
function ensureWidgetArchitectureIntro(){
 const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
 let note=$('widgetArchitectureIntro');
 if(!note){
  note=document.createElement('div');note.id='widgetArchitectureIntro';
  note.innerHTML='<div class="managementArchitectureNote"><span>≡</span><div><strong>Affichage ≠ permissions</strong><small>Cette page décide uniquement quels widgets existent et comment ils apparaissent. Les droits d’accès aux fonctions restent dans Utilisateurs & accès.</small></div></div><div class="managementArchitectureRule"><div><span>1 · MOBILE</span><strong>Accueil terrain</strong><small>Widgets personnels, planning, équipe et raccourcis.</small></div><div><span>2 · DESKTOP</span><strong>Accueil point de vente</strong><small>Bannière, vue planning et futurs widgets ordinateur.</small></div><div><span>3 · ACCÈS</span><strong>Fonctions sécurisées</strong><small>Les droits réels sont gérés séparément par rôle.</small></div></div>';
  const toolbar=panel.querySelector(':scope > .toolbar');toolbar?.insertAdjacentElement('afterend',note)
 }
}
function organizeWidgetEditorDom(){
 const panel=document.querySelector('#tab-blocks .panel');if(!panel)return;
 ensureWidgetArchitectureIntro();renderMobileHomeWidgetEditor();
 const ensureBucket=(id,kicker,title,desc,badge)=>{
  let bucket=$(id);
  if(!bucket){bucket=document.createElement('div');bucket.id=id;bucket.className='widgetEditorBucket widgetPlatformSection';bucket.innerHTML='<div class="widgetPlatformHead"><div><span>'+esc(kicker)+'</span><strong>'+esc(title)+'</strong><small>'+esc(desc)+'</small></div><b class="widgetPlatformBadge '+(badge==='Desktop'?'desktop':'')+'">'+esc(badge)+'</b></div><div data-widget-bucket-body></div>';panel.appendChild(bucket)}
  return bucket.querySelector('[data-widget-bucket-body]')
 };
 const desktop=ensureBucket('desktopWidgetBucket','ACCUEIL · DESKTOP','Widgets Desktop','Composants destinés uniquement à l’accueil ordinateur.','Desktop');
 const secured=ensureBucket('securedWidgetBucket','FONCTIONNALITÉ SÉCURISÉE','Pilotage magasin','Affichage global ici ; accès aux données et actions dans Utilisateurs & accès.','Accès contrôlé');
 const dash=$('desktopDashboardWidgetEditor')?.closest('.desktopDashboardWidgetAdmin'),store=$('storeInfoWidgetEditor')?.closest('.storeInfoWidgetAdmin'),quick=$('quickPlanningWidgetEditor')?.closest('.quickPlanningWidgetAdmin'),ops=$('operationsWidgetEditor')?.closest('.operationsWidgetAdmin');
 if(dash&&dash.parentElement!==desktop)desktop.prepend(dash);
 if(store&&store.parentElement!==desktop)desktop.appendChild(store);
 if(quick&&quick.parentElement!==desktop)desktop.appendChild(quick);
 if(ops&&ops.parentElement!==secured)secured.appendChild(ops);
 const opHead=ops?.querySelector('.operationsWidgetAdminHead p');if(opHead)opHead.textContent='Contenu et présentation du module. Les droits d’accès restent dans Utilisateurs & accès → Rôles & permissions.';
 renderAutoDiscoveredWidgets()
}

function ensurePersonalizationConfig(){
 config.personalization=config.personalization&&typeof config.personalization==='object'?config.personalization:{};
 if(typeof config.personalization.home_menus_enabled!=='boolean')config.personalization.home_menus_enabled=true;
 return config.personalization
}
function renderHomeMenuPersonalizationControl(){
 const panel=document.querySelector('#tab-system .pagesEditorPanel');if(!panel)return;
 let host=$('homeMenuPersonalizationControl');
 if(!host){
  host=document.createElement('div');
  host.id='homeMenuPersonalizationControl';
  host.className='managementSettingList';
  host.style.margin='12px 0 14px';
  const anchor=panel.querySelector('.pagesEditorHead');
  if(anchor)anchor.insertAdjacentElement('afterend',host);else panel.prepend(host)
 }
 const prefs=ensurePersonalizationConfig(),enabled=prefs.home_menus_enabled!==false;
 host.innerHTML='<div class="managementSettingRow"><div class="managementSettingIcon" aria-hidden="true">⌂</div><div class="managementSettingText"><strong>Personnalisation des menus de l’accueil</strong><span>Autorise les utilisateurs à afficher ou masquer leurs cartes depuis Menu utilisateur → Personnalisation. Les préférences déjà enregistrées sont conservées si cette option est masquée.</span><small class="managementSettingStatus"><b>Administrateur :</b> l’accès reste toujours disponible pour ton propre compte.</small></div><div class="managementSettingControl"><span id="homeMenusPersonalizationState" class="managementSettingState '+(enabled?'active':'')+'">'+(enabled?'Visible':'Masqué')+'</span><label class="adminSwitch" title="Afficher ou masquer Menus de l’accueil pour les utilisateurs"><input id="homeMenusPersonalizationEnabled" type="checkbox" '+(enabled?'checked':'')+'><span></span></label></div></div>';
 const input=$('homeMenusPersonalizationEnabled');
 if(input)input.onchange=()=>{
  ensurePersonalizationConfig().home_menus_enabled=input.checked;
  const state=$('homeMenusPersonalizationState');
  if(state){state.textContent=input.checked?'Visible':'Masqué';state.classList.toggle('active',input.checked)}
  markDirty();window.NettoSounds?.play?.('switch')
 }
}
function renderSystem(){
 ensurePages();
 renderHomeMenuPersonalizationControl();
 const host=$('systemModules'),mods=builtinModules();
 if(!host)return;
 renderOperationsWidgetEditor();
 renderDesktopDashboardWidgetEditor();
 renderStoreInfoWidgetEditor();
 renderQuickPlanningWidgetEditor();
 renderMobileHomeWidgetEditor();
 organizeWidgetEditorDom();
 refreshSystemStats(mods);
 const q=String($('systemPageSearch')?.value||'').trim().toLocaleLowerCase('fr');
 const filter=String($('systemPageFilter')?.value||'all');
 const indexed=mods.map((m,index)=>({m,index,p:config.pages[m.id]})).filter(({m,p})=>{
  if(!systemFilterMatch(m,p,filter))return false;
  if(!q)return true;
  return [m.id,m.label,m.homeLabel,m.subtitle,m.url,PAGE_GROUP_LABELS[pageGroup(m)],...(PAGE_FEATURES[m.id]||[]),p.label,p.nav_label,p.subtitle,p.description,p.url].some(v=>String(v||'').toLocaleLowerCase('fr').includes(q))
 });
 if(!indexed.length){host.innerHTML='<div class="moduleEmpty">Aucune page ne correspond à cette recherche.</div>';return}
 host.innerHTML=PAGE_GROUP_ORDER.map(group=>{
  const rows=indexed.filter(x=>pageGroup(x.m)===group).sort((a,b)=>(Number(a.p.order)||999)-(Number(b.p.order)||999)||a.index-b.index);
  if(!rows.length)return'';
  return '<section class="moduleGroup"><div class="moduleGroupHead"><strong>'+esc(PAGE_GROUP_LABELS[group])+'</strong><span>'+rows.length+' page'+(rows.length>1?'s':'')+'</span></div>'+rows.map(x=>systemModuleCard(x.m,x.index)).join('')+'</section>'
 }).join('');
 bindPageInputs()
}
function refreshModuleCardSummary(id){
 const m=builtinModules().find(x=>x.id===id),p=config.pages[id],card=$('moduleCard_'+id);if(!m||!p||!card)return;
 const name=card.querySelector('.moduleDisplayName'),meta=card.querySelector('.moduleHeadMeta'),badges=card.querySelector('.moduleHeadBadges');
 if(name)name.textContent=p.label||m.label;
 if(meta)meta.textContent=m.id+' · '+(p.url||m.url||'')+' · '+pagePlatformLabel(m);
 if(badges)badges.innerHTML=moduleBadgesHtml(m,p);
 refreshSystemStats()
}
function bindPageInputs(){
 document.querySelectorAll('[data-page][data-key]').forEach(el=>{
  el.oninput=el.onchange=()=>{
   const p=config.pages[el.dataset.page];if(!p)return;
   let v=el.type==='checkbox'?el.checked:el.value;
   if(el.dataset.key==='order')v=Math.max(1,Number(v)||1);
   p[el.dataset.key]=v;markDirty();refreshModuleCardSummary(el.dataset.page)
  }
 });
 document.querySelectorAll('[data-role-page]:not(:disabled)').forEach(el=>el.onchange=()=>{
  const id=el.dataset.rolePage,role=el.dataset.role,p=config.pages[id];if(!p)return;
  p.roles=[...document.querySelectorAll('[data-role-page="'+CSS.escape(id)+'"]:checked')].map(x=>x.dataset.role);
  config.role_permissions=config.role_permissions&&typeof config.role_permissions==='object'?config.role_permissions:{};
  config.role_permissions[id]=config.role_permissions[id]&&typeof config.role_permissions[id]==='object'?config.role_permissions[id]:{};
  const previous=config.role_permissions[id][role];
  config.role_permissions[id][role]=el.checked?(previous&&previous!=='none'?previous:(role==='admin'?'manage':'view')):'none';
  markDirty();refreshModuleCardSummary(id)
 })
}
function openSystemPage(id,event){
 event?.preventDefault?.();event?.stopPropagation?.();
 const m=builtinModules().find(x=>x.id===id),p=config.pages[id];const url=String(p?.url||m?.url||'').trim();
 if(!url||!validUrl(url))return alert('La destination de cette page est invalide.');
 window.open(new URL(url,location.href).href,'_blank','noopener')
}
function resetSystemPage(id,event){
 event?.preventDefault?.();event?.stopPropagation?.();
 const mods=builtinModules(),index=mods.findIndex(x=>x.id===id),m=mods[index];if(!m)return;
 if(!confirm('Réinitialiser les réglages d’affichage de « '+(config.pages[id]?.label||m.label)+' » ? Les droits utilisateurs seront conservés.'))return;
 const current=config.pages[id]||{},keptRoles=Array.isArray(current.roles)?[...current.roles]:null;
 config.pages[id]=defaultPage(m,Math.max(0,index));
 if(keptRoles)config.pages[id].roles=keptRoles;
 ensurePages();markDirty();renderSystem();window.NettoSounds?.play?.('confirm')
}
function collapseAllSystemPages(){
 document.querySelectorAll('#systemModules .moduleBody').forEach(x=>x.classList.add('collapsed'));
 document.querySelectorAll('#systemModules .moduleCard').forEach(x=>x.classList.remove('open'));
 window.NettoSounds?.play?.('menuClose')
}

const MOBILE_DEFAULTS=['home','planning','chat'];
const MOBILE_SHORT={home:'Accueil',planning:'Planning',chat:'Chat',profile:'Menu utilisateur',notifications:'Notifications'};
function mobileModules(){
 const allowed=new Set(MOBILE_DEFAULTS);
 return builtinModules().filter(m=>allowed.has(m.id)&&moduleMobileAvailable(m))
}
function ensureMobileBar(){
 const allowed=new Set(MOBILE_DEFAULTS),raw=Array.isArray(config.mobile_bar?.items)?config.mobile_bar.items:[],seen=new Set(),items=[];
 const push=id=>{
  id=String(id||'').trim();if(!allowed.has(id)||seen.has(id))return;
  seen.add(id);const previous=raw.find(x=>String(x?.id||'')===id);
  items.push({id,enabled:true,label:String(previous?.label||MOBILE_SHORT[id]||'').trim().slice(0,18)})
 };
 raw.forEach(x=>push(x?.id));MOBILE_DEFAULTS.forEach(push);
 config.mobile_bar={enabled:config.mobile_bar?.enabled!==false,items:items.slice(0,3)}
}
function renderMobileBar(){
 const host=$('mobileBarEditor');if(!host)return;ensureMobileBar();
 const items=config.mobile_bar.items,moduleFor=id=>builtinModules().find(m=>m.id===id);
 const navPreview=items.map(x=>{
  const m=moduleFor(x.id),label=pagePlatformValue(m,'mobile','nav_label')||MOBILE_SHORT[x.id],image=ensurePagePlatformOverride(x.id,'mobile').image_url,icon=image?'<img src="'+attr(image)+'" alt="">':(window.NettoProfileUI?.mobileNavIcon?.(x.id)||'•');
  return '<div class="mobilePreviewItem actual"><span class="mobilePreviewIcon">'+icon+'</span><small>'+esc(label)+'</small></div>'
 }).join('');
 const topIcon=(id,fallback)=>{
  const o=ensurePagePlatformOverride(id,'mobile'),url=String(o.image_url||'').trim();
  return url?'<img src="'+attr(url)+'" alt="">':fallback
 };
 host.innerHTML=
 '<div class="mobileBarTop"><div><strong>Coque Mobile actuelle</strong><span>La navigation réelle de Nethor est maintenant composée de 2 actions dans l’entête et de 3 boutons fixes dans la barre basse. L’ancien modèle à 5 raccourcis + Notifications automatiques est retiré.</span></div><label class="adminSwitch" title="Afficher la barre basse"><input id="mobileBarEnabled" type="checkbox" '+(config.mobile_bar.enabled!==false?'checked':'')+'><span></span></label></div>'+
 '<div class="mobileShellMap"><div class="mobileShellMapHead"><strong>Entête</strong><span>Actions toujours accessibles</span></div><div class="mobileShellTopActions"><div><span>'+topIcon('notifications','◇')+'</span><strong>Notifications</strong><small>Centre d’activité</small></div><div><span>'+topIcon('profile','☺')+'</span><strong>Menu utilisateur</strong><small>Profil & réglages</small></div></div></div>'+
 '<div class="mobileShellMap"><div class="mobileShellMapHead"><strong>Barre basse · 3 colonnes</strong><span>Ordre réel affiché dans mobile.html</span></div><div class="mobileBarPreview mobileBarPreviewThree">'+navPreview+'</div></div>'+
 '<div class="mobileBarList">'+items.map((x,i)=>{
  const m=moduleFor(x.id),label=pagePlatformValue(m,'mobile','nav_label')||MOBILE_SHORT[x.id];
  return '<div class="mobileBarRow actual"><div class="mobileRowIcon">'+(window.NettoProfileUI?.mobileNavIcon?.(x.id)||'•')+'</div><div class="mobileBarActualCopy"><strong>'+esc(label)+'</strong><small>'+esc(x.id)+' · destination native Mobile</small></div><div class="mobileBarMove"><button type="button" class="btn secondaryBtn mini" data-mobile-move="'+i+'" data-dir="-1" '+(i===0?'disabled':'')+' aria-label="Monter">↑</button><button type="button" class="btn secondaryBtn mini" data-mobile-move="'+i+'" data-dir="1" '+(i===items.length-1?'disabled':'')+' aria-label="Descendre">↓</button></div></div>'
 }).join('')+'</div>'+
 '<div class="notifNotice"><b>Personnalisation visuelle :</b> les noms, icônes, images et couleurs de ces boutons se règlent plus bas dans <b>Menus & boutons Mobile</b>. Notifications et Menu utilisateur restent dans l’entête afin de respecter la nouvelle architecture Mobile.</div>';
 $('mobileBarEnabled').onchange=e=>{config.mobile_bar.enabled=e.target.checked;markDirty();window.NettoSounds?.play?.('switch')};
 host.querySelectorAll('[data-mobile-move]').forEach(btn=>btn.onclick=()=>{
  const i=Number(btn.dataset.mobileMove),j=i+Number(btn.dataset.dir);if(j<0||j>=config.mobile_bar.items.length)return;
  [config.mobile_bar.items[i],config.mobile_bar.items[j]]=[config.mobile_bar.items[j],config.mobile_bar.items[i]];
  markDirty();renderMobileBar();window.NettoSounds?.play?.('navigate')
 })
}
function mobileUserMenuCatalog(){
 return builtinModules().filter(m=>{
  if(!m||['profile','settings'].includes(m.id)||!moduleMobileAvailable(m))return false;
  const roles=maxRoles(m);
  return roles.some(r=>r!=='admin')
 }).sort((a,b)=>(Number(config.pages?.[a.id]?.order)||999)-(Number(config.pages?.[b.id]?.order)||999)||String(a.label).localeCompare(String(b.label),'fr'))
}
function mobileUserMenuDefault(id,module=null){
 if(['profile','settings','theme','update','logout'].includes(id))return true;
 return module?.userMenu===true
}
function ensureMobileUserMenu(){
 config.mobile_user_menu=config.mobile_user_menu&&typeof config.mobile_user_menu==='object'?config.mobile_user_menu:{};
 const items=config.mobile_user_menu.items=config.mobile_user_menu.items&&typeof config.mobile_user_menu.items==='object'?config.mobile_user_menu.items:{};
 const byId=new Map(builtinModules().map(m=>[m.id,m]));
 for(const id of ['profile','settings','theme','update']){
  if(typeof items[id]!=='boolean')items[id]=mobileUserMenuDefault(id,byId.get(id))
 }
 for(const m of mobileUserMenuCatalog()){
  if(typeof items[m.id]!=='boolean')items[m.id]=mobileUserMenuDefault(m.id,m)
 }
 items.logout=true;
 return items
}
function mobileUserMenuIcon(id,module=null){
 if(id==='theme')return'☾';
 if(id==='update')return'↻';
 if(id==='logout')return'↪';
 return window.NettoProfileUI?.mobileNavIcon?.(module?.id||id)||'•'
}
function ensureMobileUserMenuPanel(){
 const tab=$('tab-mobile');if(!tab)return null;
 let panel=$('mobileUserMenuAdminPanel');
 if(!panel){
  panel=document.createElement('div');
  panel.id='mobileUserMenuAdminPanel';
  panel.className='panel';
  panel.innerHTML='<div class="toolbar"><div><h2>Menu utilisateur mobile</h2><p>Définis ce que les utilisateurs peuvent voir lorsqu’ils ouvrent leur menu sur mobile. Les rôles et permissions restent prioritaires.</p></div><div class="panelTools"><button class="btn secondaryBtn mini" type="button" onclick="setMobileUserMenuAll(true)">Tout afficher</button><button class="btn secondaryBtn mini" type="button" onclick="setMobileUserMenuAll(false)">Tout masquer</button></div></div><div class="notifNotice"><b>Portée :</b> ce réglage concerne uniquement les comptes utilisateurs sur mobile. Ton menu Administrateur conserve ses accès de gestion. Déconnexion reste toujours disponible.</div><div id="mobileUserMenuEditor" class="managementSettingList"></div>';
  const barPanel=$('mobileBarEditor')?.closest('.panel');
  if(barPanel)barPanel.insertAdjacentElement('afterend',panel);else tab.appendChild(panel)
 }
 return $('mobileUserMenuEditor')
}
function mobileUserMenuAdminRow(id,label,description,module=null,locked=false){
 const items=ensureMobileUserMenu(),enabled=locked?true:items[id]!==false;
 return '<div class="managementSettingRow"><div class="managementSettingIcon" aria-hidden="true">'+mobileUserMenuIcon(id,module)+'</div><div class="managementSettingText"><strong>'+esc(label)+'</strong><span>'+esc(description)+'</span>'+(module?'<small class="managementSettingStatus">Page : '+esc(module.id)+' · accès selon rôle et permissions.</small>':'')+'</div><div class="managementSettingControl"><span class="managementSettingState '+(enabled?'active':'')+'">'+(enabled?'Visible':'Masqué')+'</span><label class="adminSwitch" title="'+(locked?'Toujours visible':'Afficher ou masquer dans le menu utilisateur mobile')+'"><input type="checkbox" data-mobile-user-menu="'+attr(id)+'" '+(enabled?'checked':'')+' '+(locked?'disabled':'')+'><span></span></label></div></div>'
}
function renderMobileUserMenu(){
 const host=ensureMobileUserMenuPanel();if(!host)return;
 ensureMobileUserMenu();
 const catalog=mobileUserMenuCatalog(),profileModule=builtinModules().find(m=>m.id==='profile'),settingsModule=builtinModules().find(m=>m.id==='settings');
 const rows=[
  mobileUserMenuAdminRow('profile','Mon profil','Accès au profil personnel, à l’avatar et aux réglages du compte.',profileModule),
  mobileUserMenuAdminRow('settings','Personnalisation','Accès aux préférences personnelles de l’utilisateur.',settingsModule),
  ...catalog.map(m=>mobileUserMenuAdminRow(m.id,m.label||m.id,m.subtitle||m.description||'Page Nethor.',m)),
  mobileUserMenuAdminRow('theme','Mode clair / sombre','Permet à l’utilisateur de changer l’apparence de son interface.'),
  mobileUserMenuAdminRow('update','Mise à jour','Permet de rechercher et appliquer la dernière version de Nethor.'),
  mobileUserMenuAdminRow('logout','Déconnexion','Toujours disponible pour permettre de quitter la session.',null,true)
 ];
 host.innerHTML=rows.join('');
 host.querySelectorAll('[data-mobile-user-menu]:not(:disabled)').forEach(input=>input.onchange=()=>{
  ensureMobileUserMenu()[input.dataset.mobileUserMenu]=input.checked;
  markDirty();renderMobileUserMenu();window.NettoSounds?.play?.('switch')
 });
 enhanceCompactPortal()
}
function setMobileUserMenuAll(value){
 const items=ensureMobileUserMenu();
 for(const id of Object.keys(items))if(id!=='logout')items[id]=!!value;
 items.logout=true;markDirty();renderMobileUserMenu();window.NettoSounds?.play?.('switch')
}
function toggleModuleBody(id,event){
 if(event?.target?.closest('button,a,input,label,select,textarea'))return;
 const body=$('moduleBody_'+id),card=$('moduleCard_'+id);if(!body)return;
 const opening=body.classList.contains('collapsed');body.classList.toggle('collapsed',!opening);card?.classList.toggle('open',opening);window.NettoSounds?.play?.(opening?'menuOpen':'menuClose')
}

const MOBILE_NOTIFICATION_VISUAL_DEFS=Object.freeze([
 {key:'manual_edit',label:'Planning modifié',group:'Planning',icon:'🗓️'},
 {key:'import_new',label:'Nouveau planning',group:'Planning',icon:'📥'},
 {key:'import_replace',label:'Planning remplacé',group:'Planning',icon:'🔄'},
 {key:'reset_day',label:'Réinitialisation journée',group:'Planning',icon:'↩️'},
 {key:'reset_week',label:'Réinitialisation semaine',group:'Planning',icon:'↩️'},
 {key:'absence_request',label:'Demande congé / indisponibilité',group:'Planning',icon:'🏖️'},
 {key:'absence_decision',label:'Décision congé',group:'Planning',icon:'✅'},
 {key:'chat_message',label:'Message équipe',group:'Messages',icon:'💬'},
 {key:'chat_direct',label:'Message direct',group:'Messages',icon:'💬'},
 {key:'chat_group',label:'Message groupe',group:'Messages',icon:'👥'},
 {key:'chat_general',label:'Message général',group:'Messages',icon:'👥'},
 {key:'admin_message',label:'Information administrateur',group:'Système',icon:'📣'},
 {key:'app_update',label:'Mise à jour Nethor',group:'Système',icon:'⬆️'},
 {key:'maintenance',label:'Maintenance',group:'Système',icon:'🛠️'},
 {key:'password_reset_request',label:'Sécurité / mot de passe',group:'Système',icon:'🔑'}
]);
const MOBILE_NOTIFICATION_DEFAULT_OUTER='#24292F';
const MOBILE_NOTIFICATION_DEFAULT_ACCENT='#FF5A2A';
function normalizeMobileNotificationVisual(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const shape=['circle','rounded','square'].includes(String(raw.shape||''))?String(raw.shape):'circle';
 return{
  url:String(raw.url||''),
  path:String(raw.path||''),
  name:String(raw.name||''),
  outer_color:validColor(raw.outer_color,MOBILE_NOTIFICATION_DEFAULT_OUTER),
  accent_color:validColor(raw.accent_color,MOBILE_NOTIFICATION_DEFAULT_ACCENT),
  shape
 }
}
function ensurePlatformUiConfig(){
 config.platform_ui=config.platform_ui&&typeof config.platform_ui==='object'?config.platform_ui:{};
 for(const kind of ['mobile','desktop']){
  const current=config.platform_ui[kind]&&typeof config.platform_ui[kind]==='object'?config.platform_ui[kind]:{};
  const cleanAsset=x=>{x=x&&typeof x==='object'?x:{};return{url:String(x.url||''),path:String(x.path||''),name:String(x.name||''),tag:String(x.tag||''),api:String(x.api||'')}};
  const themedAsset=key=>{const x=current[key]&&typeof current[key]==='object'?current[key]:{},legacy=cleanAsset(x),light=cleanAsset(x.light),dark=cleanAsset(x.dark);return{light:light.url||light.path||light.name?light:legacy,dark}};
  const simpleAsset=key=>cleanAsset(current[key]);
  const currentControls=current.controls&&typeof current.controls==='object'?current.controls:{},controls={};
  for(const key of ['notifications','user_menu','theme','update','logout']){
   const x=currentControls[key]&&typeof currentControls[key]==='object'?currentControls[key]:{};
   controls[key]={label:String(x.label||''),subtitle:String(x.subtitle||''),url:String(x.url||''),path:String(x.path||''),name:String(x.name||'')}
  }
  const notificationVisuals={};
  if(kind==='mobile'){
   const source=current.notification_visuals&&typeof current.notification_visuals==='object'?current.notification_visuals:{};
   for(const def of MOBILE_NOTIFICATION_VISUAL_DEFS)notificationVisuals[def.key]=normalizeMobileNotificationVisual(source[def.key])
  }
  const headerLogoScale=Math.max(60,Math.min(160,Math.round(Number(current.header_logo_scale)||100)));
  const headerLayout=['logo_only','logo_logo','text_logo','logo_text'].includes(current.header_layout)?current.header_layout:'logo_only';
  const headerText=String(current.header_text||'').slice(0,80);
  config.platform_ui[kind]={
   header_layout:headerLayout,
   header_text:headerText,
   header_logo:themedAsset('header_logo'),
   header_logo_secondary:themedAsset('header_logo_secondary'),
   header_themes:kind==='mobile'?normalizeMobileHeaderThemes(current.header_themes):{},
   header_logo_mode:kind==='desktop'&&current.header_logo_mode==='animation'?'animation':'image',
   header_logo_animation:themedAsset('header_logo_animation'),
   header_logo_scale:kind==='desktop'?headerLogoScale:100,
   login_logo:themedAsset('login_logo'),
   welcome_media:{...themedAsset('welcome_media'),type:current.welcome_media?.type==='animation'?'animation':'image'},
   welcome_media_themes:kind==='mobile'?normalizeMobileWelcomeThemeAssets(current.welcome_media_themes):{},
   home_screen_icon:simpleAsset('home_screen_icon'),
   browser_icon:themedAsset('browser_icon'),
   desktop_shortcut_icon:simpleAsset('desktop_shortcut_icon'),
   update_logo:simpleAsset('update_logo'),
   controls,
   notification_visuals:kind==='mobile'?notificationVisuals:{},
   home_banner:kind==='mobile'?normalizeMobileHomeBanner(current.home_banner):{}
  }
 }
 return config.platform_ui
}
function platformUiNode(kind){ensurePlatformUiConfig();return config.platform_ui[kind==='desktop'?'desktop':'mobile']}
function platformLabel(kind){return kind==='desktop'?'Desktop':'Mobile'}
function platformKindActiveInCurrentView(kind){
 const expected=kind==='desktop'?'desktop':'mobile';
 try{
  const current=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'').toLowerCase();
  if(current==='mobile-preview')return expected==='mobile';
  if(current==='mobile'||current==='desktop')return current===expected
 }catch(_){}
 return expected===(window.matchMedia?.('(max-width: 760px)')?.matches?'mobile':'desktop')
}
function applyPlatformHeaderPreview(kind){
 if(!platformKindActiveInCurrentView(kind))return;
 try{
  if(window.NettoProfileUI){window.NettoProfileUI.siteConfig=config;window.NettoProfileUI.applyHeaderLogo?.(config)}
 }catch(_){}
}
function platformDefaultAsset(kind,key){
 if(key==='header_logo')return String(config?.brand?.header_logo_url||'').trim()||'assets/nethor-mark.svg';
 if(key==='header_logo_secondary')return '';
 if(key==='header_logo_animation')return '';
 if(key==='login_logo')return kind==='mobile'?'assets/app-icon-mobile-v71.svg?v=72':'assets/app-icon-v63.svg';
 if(key==='home_screen_icon')return 'assets/app-icon-mobile-v74.svg?v=74';
 if(key==='browser_icon')return 'assets/app-icon-v63.svg';
 if(key==='desktop_shortcut_icon')return 'assets/app-icon-v63.svg';
 if(key==='update_logo')return 'assets/app-icon-v63.svg';
 return 'assets/nethor-mark.svg'
}
function platformAssetNode(kind,key){const node=platformUiNode(kind);return node[key]}
function platformAssetVariantNode(kind,key,theme){
 const node=platformAssetNode(kind,key);if(!node)return{};
 theme=theme==='dark'?'dark':'light';
 node[theme]=node[theme]&&typeof node[theme]==='object'?node[theme]:{url:'',path:'',name:''};
 return node[theme]
}
function platformAssetUrl(kind,key,theme='light'){
 const node=platformAssetNode(kind,key)||{},variant=node[theme]||{},light=node.light||{};
 return String(variant.url||((theme==='dark')?light.url:'')||node.url||'').trim()||platformDefaultAsset(kind,key)
}
function platformAssetIsVideo(url){return /\.(mp4|webm)(?:$|\?)/i.test(String(url||''))}
function platformAssetIsScript(url){return /\.js(?:$|\?)/i.test(String(url||''))}
function platformWelcomeAnimationHost(url,theme='light',tag='',name='Utilisateur',api=''){
 const q=new URLSearchParams({src:String(url||''),theme:theme==='dark'?'dark':'light',mode:'media',name:String(name||'Utilisateur')});
 if(tag)q.set('tag',String(tag));
 if(api)q.set('api',String(api));
 return 'welcome-animation-host.html?v=4&'+q.toString()
}
function platformAssetPreview(kind,key,theme){
 const asset=platformAssetNode(kind,key)||{},url=platformAssetUrl(kind,key,theme),isWelcome=key==='welcome_media',isHeaderAnimation=key==='header_logo_animation',variant=platformAssetVariantNode(kind,key,theme),animated=isWelcome||isHeaderAnimation;
 if(animated&&platformAssetIsScript(url)){
  const host=platformWelcomeAnimationHost(url,theme,variant?.tag||'','Utilisateur',variant?.api||'');
  return '<iframe class="platformWelcomeAnimationFrame" src="'+attr(host)+'" title="'+(isHeaderAnimation?'Aperçu de l’animation d’entête':'Aperçu de l’animation de bienvenue')+'" sandbox="allow-scripts" loading="lazy"></iframe>'
 }
 if(animated&&platformAssetIsVideo(url))return '<video src="'+attr(url)+'" autoplay muted loop playsinline></video>';
 if(!url&&animated)return '<span class="platformAssetEmptyPreview">Aucune animation</span>';
 if(!url)return '<span class="platformAssetEmptyPreview">'+(key==='header_logo_secondary'?'Aucun logo 2':'Aucun visuel')+'</span>';
 return '<img src="'+attr(url)+'" alt="">'
}
function platformAssetAccept(key){
 return key==='welcome_media'||key==='header_logo_animation'
  ?'.js,.png,.webp,.svg,.gif,.mp4,.webm,application/javascript,text/javascript,image/png,image/webp,image/svg+xml,image/gif,video/mp4,video/webm'
  :'.png,.webp,.svg,.ico,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon'
}
function platformThemeVariant(kind,key,theme){
 const asset=platformAssetVariantNode(kind,key,theme),custom=!!String(asset.url||'').trim(),dark=theme==='dark';
 const status=custom?esc(asset.name||'Fichier personnalisé'):(dark?'Hérite du thème clair':'Valeur Nethor par défaut');
 return '<div class="platformThemeVariant">'+
  '<div class="platformThemeVariantHead"><strong>'+(dark?'Thème sombre':'Thème clair')+'</strong><small>'+status+'</small></div>'+
  '<div class="platformAssetPreview">'+platformAssetPreview(kind,key,theme)+'</div>'+
  '<div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="choosePlatformAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Importer</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="downloadPlatformAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Télécharger</button>'+
   (custom?'<button class="btn secondaryBtn mini" type="button" onclick="removePlatformAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Réinitialiser</button>':'')+
  '</div>'+
  '<input id="platformAssetFile_'+kind+'_'+key+'_'+theme+'" type="file" accept="'+platformAssetAccept(key)+'" hidden onchange="uploadPlatformAsset(\''+kind+'\',\''+key+'\',\''+theme+'\',this)">'+
 '</div>'
}
function platformAssetRow(kind,key,title,description){
 const asset=platformAssetNode(kind,key)||{},welcome=key==='welcome_media';
 return '<div class="platformAssetRow themed">'+
  '<div class="platformAssetCopy"><strong>'+esc(title)+'</strong><span>'+esc(description)+'</span>'+
   (welcome?'<label class="platformMediaMode">Type <select data-platform-welcome-mode="'+attr(kind)+'"><option value="image" '+(asset.type!=='animation'?'selected':'')+'>Logo / image</option><option value="animation" '+(asset.type==='animation'?'selected':'')+'>Animation</option></select></label><small class="platformMediaHint">Animation : fichier .js autonome Nethor, GIF, MP4 ou WebM.</small>':'')+
  '</div>'+
  '<div class="platformThemeVariants">'+platformThemeVariant(kind,key,'light')+platformThemeVariant(kind,key,'dark')+'</div>'+
 '</div>'
}
function platformSimpleAssetNode(kind,key){
 const ui=platformUiNode(kind);ui[key]=ui[key]&&typeof ui[key]==='object'?ui[key]:{url:'',path:'',name:''};return ui[key]
}
function platformSimpleAssetUrl(kind,key){const node=platformSimpleAssetNode(kind,key);return String(node.url||'').trim()||platformDefaultAsset(kind,key)}
function platformSimpleAssetRow(kind,key,title,description,note){
 const asset=platformSimpleAssetNode(kind,key),custom=!!String(asset.url||'').trim(),url=platformSimpleAssetUrl(kind,key);
 return '<div class="platformAssetRow platformSystemAssetRow">'+
  '<div class="platformAssetPreview"><img src="'+attr(url)+'" alt=""></div>'+
  '<div class="platformAssetCopy"><strong>'+esc(title)+'</strong><span>'+esc(description)+'</span><small>'+esc(custom?(asset.name||'Fichier personnalisé'):(note||'Valeur Nethor par défaut'))+'</small></div>'+
  '<div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="choosePlatformSimpleAsset(\''+kind+'\',\''+key+'\')">Importer</button><button class="btn secondaryBtn mini" type="button" onclick="downloadPlatformSimpleAsset(\''+kind+'\',\''+key+'\')">Télécharger</button>'+(custom?'<button class="btn secondaryBtn mini" type="button" onclick="removePlatformSimpleAsset(\''+kind+'\',\''+key+'\')">Réinitialiser</button>':'')+'</div>'+
  '<input id="platformSimpleAssetFile_'+kind+'_'+key+'" type="file" accept=".png,.webp,.svg,.ico,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" hidden onchange="uploadPlatformSimpleAsset(\''+kind+'\',\''+key+'\',this)">'+
 '</div>'
}
function renderPlatformSystemAssets(kind){
 if(kind==='mobile')return '<section class="platformSystemAssetsSection"><div class="platformSubhead"><div><h3>Icône d’application & mise à jour</h3><p>Personnalise les visuels système propres à la version Mobile, dont le logo affiché dans la fenêtre de mise à jour Nethor.</p></div></div><div class="platformAssetList">'+platformSimpleAssetRow(kind,'update_logo','Mise à jour Nethor · logo','Logo affiché au centre de la fenêtre de mise à jour sur Mobile. Ce réglage ne modifie aucun autre logo de Nethor.','Icône Nethor officielle par défaut.')+platformSimpleAssetRow(kind,'home_screen_icon','Écran d’accueil · Safari / application','Icône utilisée pour « Ajouter à l’écran d’accueil » et pour l’installation de l’application sur Mobile.','PNG carré 512 × 512 recommandé.')+'</div></section>';
 return '<section class="platformSystemAssetsSection"><div class="platformSubhead"><div><h3>Navigateur, raccourci & mise à jour</h3><p>Gère les icônes système propres à la version Desktop, dont le logo affiché dans la fenêtre de mise à jour Nethor.</p></div></div><div class="platformAssetList">'+
  platformSimpleAssetRow(kind,'update_logo','Mise à jour Nethor · logo','Logo affiché au centre de la fenêtre de mise à jour sur ordinateur. Ce réglage ne modifie aucun autre logo de Nethor.','Icône Nethor officielle par défaut.')+
  platformAssetRow(kind,'browser_icon','Onglet navigateur Desktop','Favicon affiché dans l’onglet. Les versions claire et sombre suivent le thème Nethor.')+
  platformSimpleAssetRow(kind,'desktop_shortcut_icon','Raccourci bureau · application installée','Icône utilisée lors de l’installation de Nethor comme application/raccourci sur ordinateur.','PNG ou SVG carré 512 × 512 recommandé.')+
 '</div></section>'
}

const PLATFORM_CONTROL_DEFAULTS={
 notifications:{label:'Notifications',subtitle:'Centre d’activité Nethor',glyph:'🔔'},
 user_menu:{label:'Menu utilisateur',subtitle:'Profil, préférences et réglages',glyph:'☺'},
 theme:{label:'Mode sombre',subtitle:'Changer l’apparence',glyph:'◐'},
 update:{label:'Mise à jour',subtitle:'Rechercher une nouvelle version',glyph:'↓'},
 login_logs:{label:'Connexions',subtitle:'Historique des connexions administrateur',glyph:'◷'},
 mobile_preview:{label:'Visualiser mobile',subtitle:'Ouvrir l’aperçu mobile',glyph:'▯'},
 logout:{label:'Déconnexion',subtitle:'Quitter la session',glyph:'↪'}
};
function platformControlDefs(kind){
 const keys=kind==='mobile'?['notifications','user_menu','theme','update','logout']:['notifications','user_menu','login_logs','mobile_preview','update','theme','logout'];
 return keys.map(key=>({key,...PLATFORM_CONTROL_DEFAULTS[key]}))
}
function platformControlNode(kind,key){
 const ui=platformUiNode(kind);ui.controls=ui.controls&&typeof ui.controls==='object'?ui.controls:{};
 const x=ui.controls[key]&&typeof ui.controls[key]==='object'?ui.controls[key]:{};
 ui.controls[key]={label:String(x.label||''),subtitle:String(x.subtitle||''),url:String(x.url||''),path:String(x.path||''),name:String(x.name||'')};
 return ui.controls[key]
}
function platformControlValue(kind,key,field){
 const node=platformControlNode(kind,key),d=PLATFORM_CONTROL_DEFAULTS[key]||{};
 return String(node[field]||d[field]||'')
}
function platformControlIcon(kind,key){
 const node=platformControlNode(kind,key),d=PLATFORM_CONTROL_DEFAULTS[key]||{},url=String(node.url||'').trim();
 return url?'<img src="'+attr(url)+'" alt="">':'<span>'+esc(d.glyph||'•')+'</span>'
}
function platformControlRow(kind,def){
 const node=platformControlNode(kind,def.key),custom=!!String(node.url||'').trim();
 return '<article class="platformControlRow">'+
  '<div class="platformControlIcon">'+platformControlIcon(kind,def.key)+'</div>'+
  '<div class="platformControlFields">'+
   '<div class="field"><label>Libellé</label><input value="'+attr(platformControlValue(kind,def.key,'label'))+'" data-platform-control-kind="'+kind+'" data-platform-control-key="'+def.key+'" data-platform-control-field="label"></div>'+
   '<div class="field"><label>Sous-texte</label><input value="'+attr(platformControlValue(kind,def.key,'subtitle'))+'" data-platform-control-kind="'+kind+'" data-platform-control-key="'+def.key+'" data-platform-control-field="subtitle"></div>'+
  '</div>'+
  '<div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="choosePlatformControlAsset(\''+kind+'\',\''+def.key+'\')">Importer</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="downloadPlatformControlAsset(\''+kind+'\',\''+def.key+'\')" '+(custom?'':'disabled')+'>Télécharger</button>'+
   (custom?'<button class="btn secondaryBtn mini" type="button" onclick="removePlatformControlAsset(\''+kind+'\',\''+def.key+'\')">Retirer le visuel</button>':'')+
  '</div>'+
  '<input id="platformControlFile_'+kind+'_'+def.key+'" type="file" accept=".png,.webp,.svg,.ico,.gif,image/png,image/webp,image/svg+xml,image/gif,image/x-icon,image/vnd.microsoft.icon" hidden onchange="uploadPlatformControlAsset(\''+kind+'\',\''+def.key+'\',this)">'+
 '</article>'
}
function renderPlatformControls(kind){
 return '<section class="platformControlsSection"><div class="platformSubhead"><div><h3>Commandes d’interface</h3><p>Personnalise aussi les commandes de coque : libellé, sous-texte et visuel. Les actions de sécurité restent inchangées.</p></div></div><div class="platformControlList">'+platformControlDefs(kind).map(def=>platformControlRow(kind,def)).join('')+'</div></section>'
}
function bindPlatformControlFields(host){
 host.querySelectorAll('[data-platform-control-kind][data-platform-control-key][data-platform-control-field]').forEach(el=>{
  el.oninput=()=>{const node=platformControlNode(el.dataset.platformControlKind,el.dataset.platformControlKey);node[el.dataset.platformControlField]=el.value;markDirty()}
 })
}
function choosePlatformControlAsset(kind,key){$('platformControlFile_'+kind+'_'+key)?.click()}
async function uploadPlatformControlAsset(kind,key,input){
 const state=$('saveState'),file=input?.files?.[0];if(!file)return;
 try{
  const ext=platformAssetExtension(file),allowed=['png','webp','svg','ico','gif'];
  if(!ext||!allowed.includes(ext))throw new Error('Format refusé. Utilise PNG, WebP, SVG, ICO ou GIF.');
  if(file.size>5*1024*1024)throw new Error('Visuel trop lourd : 5 Mo maximum.');
  state.className='saveState';state.textContent='Import commande '+platformLabel(kind)+'…';
  const storagePath='platform/'+kind+'/controls/'+key+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=platformControlNode(kind,key);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;
  markDirty();renderPlatformIdentity(kind);state.textContent='Visuel prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur visuel : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function downloadPlatformControlAsset(kind,key){
 const node=platformControlNode(kind,key),url=String(node.url||'').trim();if(url)downloadAssetUrl(url,node.name||('Nethor-'+kind+'-'+key))
}
function removePlatformControlAsset(kind,key){
 const node=platformControlNode(kind,key);node.url='';node.path='';node.name='';markDirty();renderPlatformIdentity(kind)
}

function platformHeaderCompositionControl(kind){
 const ui=platformUiNode(kind),layout=['logo_only','logo_logo','text_logo','logo_text'].includes(ui.header_layout)?ui.header_layout:'logo_only',textValue=String(ui.header_text||'');
 return '<div class="platformHeaderComposition">'+
  '<div class="platformHeaderCompositionCopy"><strong>Composition de l’en-tête</strong><span>Choisis la combinaison affichée dans la zone d’identité '+platformLabel(kind)+'. « Logo seul » conserve l’affichage actuel.</span></div>'+
  '<div class="platformHeaderCompositionFields">'+
   '<label class="field"><span>Disposition</span><select data-platform-header-layout="'+esc(kind)+'">'+
    '<option value="logo_only" '+(layout==='logo_only'?'selected':'')+'>Logo seul</option>'+
    '<option value="logo_logo" '+(layout==='logo_logo'?'selected':'')+'>Logo + Logo</option>'+
    '<option value="text_logo" '+(layout==='text_logo'?'selected':'')+'>Texte + Logo</option>'+
    '<option value="logo_text" '+(layout==='logo_text'?'selected':'')+'>Logo + Texte</option>'+
   '</select></label>'+
   '<label class="field"><span>Texte d’en-tête</span><input type="text" maxlength="80" value="'+esc(textValue)+'" placeholder="'+esc(config?.brand?.name||'Nethor')+'" data-platform-header-text="'+esc(kind)+'"></label>'+
  '</div>'+
  '<small class="platformMediaHint">Le deuxième logo ci-dessus est utilisé uniquement avec « Logo + Logo ». Sans texte personnalisé, le nom de marque est repris automatiquement.</small>'+
 '</div>'
}
function bindPlatformHeaderComposition(host,kind){
 const layout=host.querySelector('[data-platform-header-layout="'+CSS.escape(kind)+'"]'),textInput=host.querySelector('[data-platform-header-text="'+CSS.escape(kind)+'"]');
 const apply=()=>{
  const ui=platformUiNode(kind);
  if(layout)ui.header_layout=['logo_only','logo_logo','text_logo','logo_text'].includes(layout.value)?layout.value:'logo_only';
  if(textInput)ui.header_text=String(textInput.value||'').slice(0,80);
  markDirty();
  applyPlatformHeaderPreview(kind)
 };
 if(layout)layout.onchange=apply;
 if(textInput){textInput.oninput=apply;textInput.onchange=apply}
}

function platformHeaderLogoAnimationControl(kind){
 if(kind!=='desktop')return'';
 const ui=platformUiNode('desktop'),mode=ui.header_logo_mode==='animation'?'animation':'image',animLight=String(ui.header_logo_animation?.light?.url||'').trim(),animDark=String(ui.header_logo_animation?.dark?.url||'').trim(),hasAnimation=!!(animLight||animDark);
 return '<div class="platformHeaderLogoAnimationControl '+(mode==='animation'?'isAnimationMode':'isImageMode')+'">'+
  '<div class="platformAssetCopy"><strong>Affichage du logo Desktop · barre latérale</strong><span>Le logo autrefois affiché dans l’entête est maintenant placé en haut de la barre latérale. En mode Animation, il reste fixe au repos puis s’anime au survol.</span>'+
   '<label class="platformMediaMode">Type <select data-desktop-header-logo-mode><option value="image" '+(mode==='image'?'selected':'')+'>Logo / image</option><option value="animation" '+(mode==='animation'?'selected':'')+'>Animation au survol</option></select></label>'+
   (mode==='animation'?'<small class="platformMediaHint">Formats animation : JS autonome Nethor, GIF, MP4 ou WebM. L’animation ne démarre qu’au survol.</small>':'')+
   (mode==='animation'&&!hasAnimation?'<small class="platformMediaWarning">Animation au survol sélectionnée : importe au moins une animation claire ou sombre pour l’activer.</small>':'')+
   (mode==='animation'&&hasAnimation?'<small class="platformMediaReady">Animation au survol active.</small>':'')+
  '</div>'+
  (mode==='animation'?'<div class="platformHeaderAnimationAssets"><div class="platformSubhead"><div><h3>Animation au survol</h3><p>Le logo statique ci-dessus reste l’état de repos.</p></div></div><div class="platformThemeVariants">'+platformThemeVariant(kind,'header_logo_animation','light')+platformThemeVariant(kind,'header_logo_animation','dark')+'</div></div>':'')+
 '</div>'
}
function platformHeaderLogoSizeControl(kind){
 if(kind!=='desktop')return'';
 const ui=platformUiNode('desktop'),value=Math.max(60,Math.min(160,Math.round(Number(ui.header_logo_scale)||100)));
 return '<div class="platformHeaderLogoSize">'+
  '<div class="platformHeaderLogoSizeCopy"><strong>Taille du logo de la barre latérale</strong><span>Ajuste uniquement la taille du logo Nethor affiché en haut de la barre latérale Desktop.</span></div>'+
  '<div class="platformHeaderLogoSizeControls">'+
   '<input type="range" min="60" max="160" step="5" value="'+value+'" data-desktop-header-logo-scale-range aria-label="Taille du logo d’entête Desktop">'+
   '<div class="platformHeaderLogoSizeNumber"><input type="number" min="60" max="160" step="5" value="'+value+'" data-desktop-header-logo-scale-number><span>%</span></div>'+
   '<button class="btn secondaryBtn mini" type="button" data-desktop-header-logo-scale-reset>100 %</button>'+
  '</div>'+
 '</div>'
}
function bindPlatformHeaderLogoSize(host,kind){
 if(kind!=='desktop')return;
 const range=host.querySelector('[data-desktop-header-logo-scale-range]'),number=host.querySelector('[data-desktop-header-logo-scale-number]'),reset=host.querySelector('[data-desktop-header-logo-scale-reset]');
 if(!range||!number)return;
 const apply=raw=>{
  const value=Math.max(60,Math.min(160,Math.round((Number(raw)||100)/5)*5));
  platformUiNode('desktop').header_logo_scale=value;
  range.value=String(value);number.value=String(value);
  markDirty();
  applyPlatformHeaderPreview(kind)
 };
 range.oninput=()=>apply(range.value);
 number.oninput=()=>apply(number.value);
 number.onchange=()=>apply(number.value);
 if(reset)reset.onclick=()=>apply(100)
}
function renderPlatformIdentity(kind){
 const host=$('platformIdentity_'+kind);if(!host)return;
 if(kind==='mobile'){
  host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Réglages Mobile généraux</h2><p>Ces éléments sont communs à tous les thèmes. L’entête, la bannière et l’animation d’ouverture se règlent désormais dans « Apparence par thème ».</p></div></div>'+
  '<div class="platformAssetList">'+
   platformAssetRow(kind,'login_logo','Logo de connexion','Icône carrée affichée à gauche de « Nethor » sur la page de connexion Mobile. Sans fichier personnalisé, Nethor utilise son icône officielle.')+
  '</div>'+renderPlatformSystemAssets(kind)+renderPlatformControls(kind);
  bindPlatformControlFields(host);
  return
 }
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Identité '+platformLabel(kind)+'</h2><p>Les logos principaux disposent d’une version Thème clair et Thème sombre. Sans variante sombre, Nethor reprend automatiquement la version claire.</p></div></div>'+
 '<div class="platformAssetList">'+
 platformAssetRow(kind,'header_logo','Emplacement Logo 1','Premier emplacement de l’identité d’en-tête '+platformLabel(kind)+'. Ce logo reste entièrement indépendant de l’autre plateforme.')+
 platformAssetRow(kind,'header_logo_secondary','Emplacement Logo 2','Deuxième emplacement, utilisé avec « Logo + Logo ». Il est propre à '+platformLabel(kind)+' et possède ses variantes claire et sombre.')+
 platformHeaderCompositionControl(kind)+
 platformHeaderLogoAnimationControl(kind)+platformHeaderLogoSizeControl(kind)+
 platformAssetRow(kind,'login_logo','Logo de connexion','Icône carrée affichée à gauche de « Nethor » sur la page de connexion '+platformLabel(kind)+'. Sans fichier personnalisé, Nethor utilise automatiquement son icône officielle de connexion.')+
 platformAssetRow(kind,'welcome_media','Après connexion · Bienvenue utilisateur','Logo ou animation affiché après authentification, avant l’ouverture du portail.')+
 '</div>'+renderPlatformSystemAssets(kind)+renderPlatformControls(kind);
 host.querySelectorAll('[data-platform-welcome-mode]').forEach(el=>el.onchange=()=>{platformUiNode(kind).welcome_media.type=el.value==='animation'?'animation':'image';markDirty();renderPlatformIdentity(kind)});
 const headerMode=host.querySelector('[data-desktop-header-logo-mode]');
 if(headerMode)headerMode.onchange=()=>{
  const ui=platformUiNode('desktop');ui.header_logo_mode=headerMode.value==='animation'?'animation':'image';
  markDirty();
  applyPlatformHeaderPreview(kind);
  renderPlatformIdentity(kind)
 };
 bindPlatformControlFields(host);
 bindPlatformHeaderComposition(host,kind);
 bindPlatformHeaderLogoSize(host,kind)
}
function choosePlatformAsset(kind,key,theme){$('platformAssetFile_'+kind+'_'+key+'_'+(theme==='dark'?'dark':'light'))?.click()}
function platformAssetExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['js','png','webp','svg','ico','gif','mp4','webm'].includes(ext)?ext:''
}
async function inspectPlatformAnimationScript(file,{strict=false}={}){
 const source=await file.text();
 try{new Function(source)}catch(e){throw new Error('Animation JS invalide : '+(e?.message||'syntaxe incorrecte'))}
 const tagMatch=
  source.match(/const\s+TAG\s*=\s*["'`]([a-z][a-z0-9.-]*-[a-z0-9.-]+)["'`]/i)||
  source.match(/customElements\.define\s*\(\s*["'`]([a-z][a-z0-9.-]*-[a-z0-9.-]+)["'`]/i);
 const tag=String(tagMatch?.[1]||'').toLowerCase();
 const apiPatterns=[
  /(?:global|window)\.([A-Za-z_$][\w$]*)\s*=\s*api\b/,
  /(?:global|window)\.([A-Za-z_$][\w$]*)\s*=\s*Object\.freeze\s*\(/,
  /(?:globalThis)\.([A-Za-z_$][\w$]*)\s*=\s*api\b/,
  /(?:globalThis)\.([A-Za-z_$][\w$]*)\s*=\s*Object\.freeze\s*\(/
 ];
 let api='';for(const rx of apiPatterns){const m=source.match(rx);if(m?.[1]){api=String(m[1]);break}}
 const mountCapable=/\bfunction\s+mount\s*\(|\bmount\s*\([^)]*\)\s*\{|\bmount\s*[,:(]/.test(source);
 if(strict&&!tag&&!mountCapable)throw new Error('Animation JS incompatible avec le lecteur Nethor.');
 return{tag,api:mountCapable?api:'',mountCapable}
}
async function uploadPlatformAsset(kind,key,theme,input){
 const file=input?.files?.[0],state=$('saveState');if(!file)return;
 theme=theme==='dark'?'dark':'light';
 try{
  const ext=platformAssetExtension(file),welcome=key==='welcome_media',headerAnimation=key==='header_logo_animation',animated=welcome||headerAnimation;
  const allowed=animated?['js','png','webp','svg','gif','mp4','webm']:['png','webp','svg','ico'];
  if(!ext||!allowed.includes(ext))throw new Error('Format non compatible avec cet emplacement.');
  const limit=animated?12*1024*1024:5*1024*1024;if(file.size>limit)throw new Error('Fichier trop lourd : '+(animated?'12':'5')+' Mo maximum.');
  const scriptMeta=animated&&ext==='js'?await inspectPlatformAnimationScript(file,{strict:welcome&&!headerAnimation}):null;
  state.className='saveState';state.textContent='Import '+platformLabel(kind)+' · '+(theme==='dark'?'sombre':'clair')+'…';
  const storagePath='platform/'+kind+'/'+key+'/'+theme+'-'+Date.now()+'.'+ext;
  const contentType=ext==='js'?'application/javascript':(file.type||undefined);
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=platformAssetVariantNode(kind,key,theme);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;node.tag=scriptMeta?.tag||'';node.api=scriptMeta?.api||'';
  if(welcome&&['js','gif','mp4','webm'].includes(ext))platformAssetNode(kind,key).type='animation';
  if(headerAnimation&&kind==='desktop')platformUiNode('desktop').header_logo_mode='animation';
  markDirty();renderPlatformIdentity(kind);applyPlatformHeaderPreview(kind);state.textContent='Média '+(theme==='dark'?'sombre':'clair')+' prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur média : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
async function downloadAssetUrl(url,name){
 if(!url)return;
 try{
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Téléchargement impossible');
  const blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name||'nethor-media';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1200)
 }catch(_){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.download=name||'nethor-media';document.body.appendChild(a);a.click();a.remove()}
}
function downloadPlatformAsset(kind,key,theme='light'){
 const node=platformAssetVariantNode(kind,key,theme),url=platformAssetUrl(kind,key,theme),name=node?.name||('Nethor-'+kind+'-'+key+'-'+theme+'.svg');downloadAssetUrl(url,name)
}
function removePlatformAsset(kind,key,theme='light'){
 const node=platformAssetVariantNode(kind,key,theme);node.url='';node.path='';node.name='';node.tag='';node.api='';markDirty();renderPlatformIdentity(kind);applyPlatformHeaderPreview(kind)
}
function choosePlatformSimpleAsset(kind,key){$('platformSimpleAssetFile_'+kind+'_'+key)?.click()}
async function uploadPlatformSimpleAsset(kind,key,input){
 const file=input?.files?.[0],state=$('saveState');if(!file)return;
 try{
  const ext=platformAssetExtension(file),allowed=['png','webp','svg','ico'];
  if(!ext||!allowed.includes(ext))throw new Error('Format refusé. Utilise PNG, WebP, SVG ou ICO.');
  if(file.size>5*1024*1024)throw new Error('Icône trop lourde : 5 Mo maximum.');
  state.className='saveState';state.textContent='Import icône '+platformLabel(kind)+'…';
  const storagePath='platform/'+kind+'/'+key+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=platformSimpleAssetNode(kind,key);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;
  markDirty();renderPlatformIdentity(kind);state.textContent='Icône prête à être enregistrée'
 }catch(e){state.className='saveState err';state.textContent='Erreur icône : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function downloadPlatformSimpleAsset(kind,key){
 const node=platformSimpleAssetNode(kind,key),url=platformSimpleAssetUrl(kind,key);downloadAssetUrl(url,node.name||('Nethor-'+kind+'-'+key))
}
function removePlatformSimpleAsset(kind,key){
 const node=platformSimpleAssetNode(kind,key);node.url='';node.path='';node.name='';markDirty();renderPlatformIdentity(kind)
}
function ensurePagePlatformOverride(id,kind){
 const p=config.pages[id];if(!p)return{};
 p.platform_overrides=p.platform_overrides&&typeof p.platform_overrides==='object'?p.platform_overrides:{};
 p.platform_overrides[kind]=p.platform_overrides[kind]&&typeof p.platform_overrides[kind]==='object'?p.platform_overrides[kind]:{};
 return p.platform_overrides[kind]
}
function pagePlatformValue(m,kind,key){
 const p=config.pages[m.id]||{},o=ensurePagePlatformOverride(m.id,kind),fallback={
  label:p.label||m.homeLabel||m.label,nav_label:p.nav_label||m.label,subtitle:p.subtitle||m.subtitle||'',description:p.description||m.description||'',
  url:p.url||m.url||'',action:p.action||m.action||'Ouvrir',icon:p.icon||m.icon||'',image_url:p.image_url||m.asset||'',
  color:p.color||config.theme.primary,accent:p.accent||config.theme.secondary
 };
 return o[key]!==undefined&&o[key]!==null&&String(o[key])!==''?o[key]:fallback[key]
}
function platformModulesFor(kind){return builtinModules().filter(m=>kind==='mobile'?moduleMobileAvailable(m):moduleDesktopAvailable(m))}
function platformComponentCard(m,kind){
 const o=ensurePagePlatformOverride(m.id,kind),image=String(pagePlatformValue(m,kind,'image_url')||'');
 return '<article class="platformComponentCard" data-platform-component="'+attr(m.id)+'">'+
  '<div class="platformComponentTop"><div class="platformComponentVisual">'+visualHtml(image,pagePlatformValue(m,kind,'icon'))+'</div><div><strong>'+esc(pagePlatformValue(m,kind,'nav_label')||m.label)+'</strong><small>'+esc(m.id)+' · '+esc(pagePlatformLabel(m))+'</small></div><button class="btn secondaryBtn mini" type="button" onclick="resetPlatformPage(\''+kind+'\',\''+attr(m.id)+'\')">Réinitialiser</button></div>'+
  '<div class="platformComponentFields">'+
   fieldPlatform('Nom accueil',pagePlatformValue(m,kind,'label'),'label',m.id,kind)+
   fieldPlatform('Nom navigation',pagePlatformValue(m,kind,'nav_label'),'nav_label',m.id,kind)+
   fieldPlatform('Sous-titre',pagePlatformValue(m,kind,'subtitle'),'subtitle',m.id,kind)+
   fieldPlatform('Texte du bouton',pagePlatformValue(m,kind,'action'),'action',m.id,kind)+
   fieldPlatform('Icône / emoji',pagePlatformValue(m,kind,'icon'),'icon',m.id,kind)+
   fieldPlatform('Destination',pagePlatformValue(m,kind,'url'),'url',m.id,kind)+
  '</div>'+
  '<div class="platformImageEditor"><div class="platformImagePreview">'+visualHtml(image,pagePlatformValue(m,kind,'icon'))+'</div><div><strong>Logo / image de ce menu</strong><small>Cette image remplace uniquement le visuel '+platformLabel(kind)+'. La barre mobile utilise aussi ce visuel lorsqu’il est personnalisé.</small></div><div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="choosePlatformPageImage(\''+kind+'\',\''+attr(m.id)+'\')">Importer</button>'+(image?'<button class="btn secondaryBtn mini" type="button" onclick="downloadPlatformPageImage(\''+kind+'\',\''+attr(m.id)+'\')">Télécharger</button>':'')+(o.image_url?'<button class="btn secondaryBtn mini" type="button" onclick="removePlatformPageImage(\''+kind+'\',\''+attr(m.id)+'\')">Réinitialiser</button>':'')+'</div><input id="platformPageFile_'+kind+'_'+attr(m.id)+'" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden onchange="uploadPlatformPageImage(\''+kind+'\',\''+attr(m.id)+'\',this)"></div>'+
  '<div class="platformColorRow"><label>Couleur <input type="color" value="'+attr(validColor(pagePlatformValue(m,kind,'color'),config.theme.primary))+'" data-platform-kind="'+kind+'" data-platform-page="'+attr(m.id)+'" data-platform-key="color"></label><label>Accent <input type="color" value="'+attr(validColor(pagePlatformValue(m,kind,'accent'),config.theme.secondary))+'" data-platform-kind="'+kind+'" data-platform-page="'+attr(m.id)+'" data-platform-key="accent"></label></div>'+
 '</article>'
}
function fieldPlatform(label,value,key,id,kind){return '<div class="field"><label>'+esc(label)+'</label><input value="'+attr(value||'')+'" data-platform-kind="'+kind+'" data-platform-page="'+attr(id)+'" data-platform-key="'+attr(key)+'"></div>'}
function renderPlatformComponents(kind){
 const host=$('platformComponents_'+kind);if(!host)return;
 const mods=platformModulesFor(kind);
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Menus & boutons '+platformLabel(kind)+'</h2><p>Modifie le libellé, l’icône, l’image, le bouton et la destination pour cette plateforme uniquement. Les droits et l’activation restent centralisés dans Pages & menus.</p></div></div>'+
 PAGE_GROUP_ORDER.map(group=>{const rows=mods.filter(m=>pageGroup(m)===group);return rows.length?'<section class="platformComponentGroup"><div class="moduleGroupHead"><strong>'+esc(PAGE_GROUP_LABELS[group])+'</strong><span>'+rows.length+' élément'+(rows.length>1?'s':'')+'</span></div>'+rows.map(m=>platformComponentCard(m,kind)).join('')+'</section>':''}).join('');
 host.querySelectorAll('[data-platform-kind][data-platform-page][data-platform-key]').forEach(el=>el.oninput=el.onchange=()=>{
  const o=ensurePagePlatformOverride(el.dataset.platformPage,el.dataset.platformKind),key=el.dataset.platformKey;o[key]=el.value;markDirty()
 })
}
function choosePlatformPageImage(kind,id){$('platformPageFile_'+kind+'_'+id)?.click()}
async function uploadPlatformPageImage(kind,id,input){
 const state=$('saveState');try{state.textContent='Import du visuel '+platformLabel(kind)+'…';const r=await uploadAsset(input.files?.[0],'page-'+kind+'-'+id);if(!r)return;const o=ensurePagePlatformOverride(id,kind);o.image_path=r.path;o.image_url=r.url;markDirty();renderPlatformComponents(kind)}catch(e){state.className='saveState err';state.textContent='Erreur image : '+e.message}finally{if(input)input.value=''}
}
function downloadPlatformPageImage(kind,id){
 const m=builtinModules().find(x=>x.id===id);if(!m)return;const o=ensurePagePlatformOverride(id,kind),url=String(o.image_url||pagePlatformValue(m,kind,'image_url')||'');downloadAssetUrl(url,o.image_name||('Nethor-'+kind+'-'+id))
}
function removePlatformPageImage(kind,id){const o=ensurePagePlatformOverride(id,kind);delete o.image_url;delete o.image_path;delete o.image_name;markDirty();renderPlatformComponents(kind)}
function resetPlatformPage(kind,id){
 if(!confirm('Réinitialiser les réglages '+platformLabel(kind)+' de cette page ?'))return;
 const p=config.pages[id];if(!p)return;p.platform_overrides=p.platform_overrides||{};p.platform_overrides[kind]={};markDirty();renderPlatformComponents(kind);window.NettoSounds?.play?.('confirm')
}
const SOUND_ADMIN_DEFS=[
 {key:'loginSuccess',label:'Connexion',description:'Joué lorsque l’authentification réussit.',group:'primary'},
 {key:'welcome',label:'Bienvenue utilisateur',description:'Joué pendant l’écran de bienvenue après connexion.',group:'primary'},
 {key:'logout',label:'Déconnexion',description:'Joué juste avant de fermer la session.',group:'primary'},
 {key:'update',label:'Mise à jour',description:'Confirmation sonore liée aux mises à jour.',group:'interface'},
 {key:'tap',label:'Appui / tap',description:'Retour sonore court pour une interaction simple.',group:'interface'},
 {key:'menuOpen',label:'Ouverture de menu',description:'Ouverture d’un menu ou d’un panneau.',group:'interface'},
 {key:'menuClose',label:'Fermeture de menu',description:'Fermeture d’un menu ou d’un panneau.',group:'interface'},
 {key:'navigate',label:'Navigation',description:'Navigation entre deux vues ou retour.',group:'interface'},
 {key:'switch',label:'Interrupteur',description:'Activation ou désactivation d’une option.',group:'interface'},
 {key:'confirm',label:'Confirmation',description:'Validation d’une action.',group:'interface'},
 {key:'success',label:'Succès',description:'Action terminée avec succès.',group:'interface'},
 {key:'error',label:'Erreur',description:'Erreur ou action refusée.',group:'interface'},
 {key:'warning',label:'Avertissement',description:'Alerte nécessitant l’attention.',group:'interface'},
 {key:'notification',label:'Notification',description:'Réception ou affichage d’une notification.',group:'interface'},
 {key:'message',label:'Message',description:'Événement lié au Chat ou à un message.',group:'interface'},
 {key:'delete',label:'Suppression',description:'Suppression ou action destructive.',group:'interface'}
];
const SOUND_ADMIN_DEFAULT_ENABLED=Object.freeze({loginSuccess:true,logout:true,update:true,welcome:false});
const PORTAL_SOUND_EQ_BANDS=Object.freeze([
 {key:'bass',label:'Basses',freq:'80 Hz'},
 {key:'warmth',label:'Chaleur',freq:'250 Hz'},
 {key:'mid',label:'Médiums',freq:'1 kHz'},
 {key:'presence',label:'Présence',freq:'4 kHz'},
 {key:'treble',label:'Aigus',freq:'10 kHz'}
]);
const PORTAL_SOUND_EQ_PRESETS=Object.freeze({
 flat:{bass:0,warmth:0,mid:0,presence:0,treble:0},
 bass:{bass:6,warmth:3,mid:0,presence:-1,treble:0},
 clear:{bass:-1,warmth:0,mid:1,presence:4,treble:3},
 soft:{bass:2,warmth:2,mid:0,presence:-2,treble:-3}
});
function normalizePortalSoundEq(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const out={};
 for(const band of PORTAL_SOUND_EQ_BANDS){
  const n=Number(raw[band.key]);
  out[band.key]=Number.isFinite(n)?Math.max(-12,Math.min(12,Math.round(n*10)/10)):0
 }
 return out
}
function portalSoundEqActive(eq){
 const node=normalizePortalSoundEq(eq);
 return PORTAL_SOUND_EQ_BANDS.some(b=>Math.abs(node[b.key])>=.05)
}
function ensureSoundConfig(){
 config.sounds=config.sounds&&typeof config.sounds==='object'?config.sounds:{};
 config.sounds.items=config.sounds.items&&typeof config.sounds.items==='object'?config.sounds.items:{};
 for(const def of SOUND_ADMIN_DEFS){
  const raw=config.sounds.items[def.key]&&typeof config.sounds.items[def.key]==='object'?config.sounds.items[def.key]:{};
  const volume=Number(raw.volume),trimStart=Number(raw.trim_start),trimEnd=Number(raw.trim_end);
  config.sounds.items[def.key]={
   enabled:typeof raw.enabled==='boolean'?raw.enabled:!!SOUND_ADMIN_DEFAULT_ENABLED[def.key],
   volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1,
   url:String(raw.url||''),
   path:String(raw.path||''),
   name:String(raw.name||''),
   trim_start:Number.isFinite(trimStart)&&trimStart>0?trimStart:0,
   trim_end:Number.isFinite(trimEnd)&&trimEnd>0?trimEnd:null,
   eq:normalizePortalSoundEq(raw.eq)
  }
 }
 return config.sounds
}
function portalSoundNode(key){ensureSoundConfig();return config.sounds.items[key]||null}
function portalSoundDef(key){return SOUND_ADMIN_DEFS.find(x=>x.key===key)||null}
function soundStatusText(node){
 const source=String(node?.url||'').trim()?(node.name||'Fichier audio personnalisé'):'Son Nethor par défaut';
 const start=Math.max(0,Number(node?.trim_start)||0),end=Number(node?.trim_end);
 const trim=start>0||Number.isFinite(end)&&end>0?' · calage '+soundTimeLabel(start)+' → '+(Number.isFinite(end)&&end>0?soundTimeLabel(end):'fin'):'';
 const eq=portalSoundEqActive(node?.eq)?' · EQ personnalisé':'';
 return source+trim+eq
}
function soundTimeLabel(value){
 const n=Math.max(0,Number(value)||0),m=Math.floor(n/60),sec=n-m*60;
 return m?m+':'+sec.toFixed(sec<10?2:1).padStart(5,'0'):sec.toFixed(n<10?2:1)+' s'
}
function soundCard(def){
 const node=portalSoundNode(def.key),custom=!!String(node?.url||'').trim(),volume=Math.round((node?.volume??1)*100);
 return '<article class="soundEditorCard '+(def.group==='primary'?'primary':'')+'" data-sound-key="'+attr(def.key)+'">'+
  '<div class="soundEditorIcon" aria-hidden="true">'+(def.key==='loginSuccess'?'↗':def.key==='welcome'?'♪':def.key==='logout'?'↘':'♫')+'</div>'+
  '<div class="soundEditorCopy"><div class="soundEditorTitle"><strong>'+esc(def.label)+'</strong><span class="soundSourceBadge '+(custom?'custom':'')+'">'+esc(custom?'Personnalisé':'Nethor')+'</span></div><span>'+esc(def.description)+'</span><small>'+esc(soundStatusText(node))+'</small></div>'+
  '<div class="soundEditorSettings">'+
   '<label class="soundEnabledControl"><span>Actif</span><span class="adminSwitch"><input type="checkbox" data-sound-enabled="'+attr(def.key)+'" '+(node.enabled?'checked':'')+'><span></span></span></label>'+
   '<label class="soundVolumeControl"><span>Volume <b data-sound-volume-label="'+attr(def.key)+'">'+volume+' %</b></span><input type="range" min="0" max="100" step="1" value="'+volume+'" data-sound-volume="'+attr(def.key)+'"></label>'+
  '</div>'+
  '<div class="soundEditorActions">'+
   '<button class="btn secondaryBtn mini" type="button" onclick="previewPortalSound(\''+def.key+'\')">▶ Écouter</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="openPortalSoundManager(\''+def.key+'\')">⏱ Gérer</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="choosePortalSound(\''+def.key+'\')">Importer</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="downloadPortalSound(\''+def.key+'\')">Télécharger</button>'+
   (custom?'<button class="btn secondaryBtn mini" type="button" onclick="resetPortalSound(\''+def.key+'\')">Réinitialiser</button>':'')+
  '</div>'+
  '<input id="portalSoundFile_'+attr(def.key)+'" type="file" accept=".mp3,.wav,.ogg,.m4a,.aac,.webm,.mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac,audio/webm" hidden onchange="uploadPortalSound(\''+def.key+'\',this)">'+
 '</article>'
}
function renderSoundEditor(){
 const host=$('soundEditorPanel');if(!host)return;
 ensureSoundConfig();
 const primary=SOUND_ADMIN_DEFS.filter(x=>x.group==='primary'),others=SOUND_ADMIN_DEFS.filter(x=>x.group!=='primary');
 host.innerHTML='<div class="toolbar soundEditorHead"><div><h2>Sons & audio</h2><p>Personnalise les sons de Nethor. Les réglages globaux définis ici sont ensuite modulés par le volume et l’activation audio propres à chaque utilisateur.</p></div></div>'+
  '<div class="soundEditorNotice"><b>Formats :</b> MP3, WAV, OGG, M4A/AAC, WebM ou MP4 audio · 8 Mo maximum. Le bouton Télécharger exporte le fichier personnalisé ou génère le son Nethor d’origine en WAV.</div>'+
  '<section class="soundEditorGroup"><div class="platformSubhead"><div><h3>Session & bienvenue</h3><p>Les trois moments principaux demandés : connexion, écran de bienvenue et déconnexion.</p></div></div><div class="soundEditorGrid primary">'+primary.map(soundCard).join('')+'</div></section>'+
  '<section class="soundEditorGroup"><div class="platformSubhead"><div><h3>Sons d’interface</h3><p>Tous les sons déjà définis dans le moteur Nethor. Les sons qui n’étaient pas actifs restent désactivés par défaut jusqu’à ce que tu les actives.</p></div></div><div class="soundEditorGrid">'+others.map(soundCard).join('')+'</div></section>';
 host.querySelectorAll('[data-sound-enabled]').forEach(input=>input.onchange=()=>{const node=portalSoundNode(input.dataset.soundEnabled);node.enabled=input.checked;markDirty();window.NettoSounds?.preview?.(input.dataset.soundEnabled,node)});
 host.querySelectorAll('[data-sound-volume]').forEach(input=>input.oninput=()=>{const key=input.dataset.soundVolume,node=portalSoundNode(key),value=Math.max(0,Math.min(100,Number(input.value)||0));node.volume=value/100;const label=host.querySelector('[data-sound-volume-label="'+CSS.escape(key)+'"]');if(label)label.textContent=Math.round(value)+' %';markDirty()})
}
function choosePortalSound(key){$('portalSoundFile_'+key)?.click()}
function portalSoundExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['mp3','wav','ogg','m4a','aac','webm','mp4'].includes(ext)?ext:''
}
async function uploadPortalSound(key,input){
 const state=$('saveState'),file=input?.files?.[0],def=portalSoundDef(key);if(!file||!def)return;
 try{
  const ext=portalSoundExtension(file);if(!ext)throw new Error('Format audio non compatible.');
  if(file.size>8*1024*1024)throw new Error('Fichier audio trop lourd : 8 Mo maximum.');
  state.className='saveState';state.textContent='Import du son « '+def.label+' »…';
  const contentType=file.type||({mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',webm:'audio/webm',mp4:'audio/mp4'}[ext]);
  const storagePath='audio/'+key+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=portalSoundNode(key);
  node.url=data?.publicUrl||'';node.path=storagePath;node.name=file.name;node.enabled=true;node.trim_start=0;node.trim_end=null;node.eq=normalizePortalSoundEq(null);
  markDirty();renderSoundEditor();window.NettoSounds?.preview?.(key,node);state.textContent='Son prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur audio : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function previewPortalSound(key){
 const node=portalSoundNode(key);window.NettoSounds?.unlock?.();window.NettoSounds?.preview?.(key,node)
}
let portalSoundManagerState=null;
function closePortalSoundManager(){
 const overlay=$('portalSoundManagerOverlay');if(overlay)overlay.remove();
 portalSoundManagerState=null
}
function portalSoundManagerDuration(key,node){
 if(String(node?.url||'').trim())return 0;
 return Math.max(.01,Number(window.NettoSounds?.duration?.(key))||.5)
}
function portalSoundManagerClamp(state){
 const step=state.duration<=1?.005:.01,duration=Math.max(step,Number(state.duration)||step);
 state.start=Math.max(0,Math.min(duration-step,Number(state.start)||0));
 state.end=Math.max(state.start+step,Math.min(duration,Number(state.end)||duration));
 state.start=Math.round(state.start/step)*step;state.end=Math.round(state.end/step)*step;
 return{step,duration}
}
function portalSoundManagerSync(){
 const state=portalSoundManagerState,overlay=$('portalSoundManagerOverlay');if(!state||!overlay)return;
 const {step,duration}=portalSoundManagerClamp(state),startRange=overlay.querySelector('[data-audio-trim-start-range]'),endRange=overlay.querySelector('[data-audio-trim-end-range]'),startInput=overlay.querySelector('[data-audio-trim-start-input]'),endInput=overlay.querySelector('[data-audio-trim-end-input]'),selection=overlay.querySelector('[data-audio-trim-selection]'),summary=overlay.querySelector('[data-audio-trim-summary]'),durationLabel=overlay.querySelector('[data-audio-trim-duration]');
 [startRange,endRange].forEach(el=>{if(el){el.max=String(duration);el.step=String(step)}});
 if(startRange)startRange.value=String(state.start);
 if(endRange)endRange.value=String(state.end);
 if(startInput){startInput.max=String(duration);startInput.step=String(step);startInput.value=state.start.toFixed(step<.01?3:2)}
 if(endInput){endInput.max=String(duration);endInput.step=String(step);endInput.value=state.end.toFixed(step<.01?3:2)}
 if(selection){
  const left=Math.max(0,Math.min(100,state.start/duration*100)),right=Math.max(left,Math.min(100,state.end/duration*100));
  selection.style.left=left+'%';selection.style.width=(right-left)+'%'
 }
 if(summary)summary.textContent='Lecture : '+soundTimeLabel(state.start)+' → '+soundTimeLabel(state.end)+' · '+soundTimeLabel(state.end-state.start);
 if(durationLabel)durationLabel.textContent='Durée source : '+soundTimeLabel(duration);
 state.eq=normalizePortalSoundEq(state.eq);
 PORTAL_SOUND_EQ_BANDS.forEach(band=>{
  const input=overlay.querySelector('[data-audio-eq-band="'+band.key+'"]'),label=overlay.querySelector('[data-audio-eq-value="'+band.key+'"]'),value=state.eq[band.key]||0;
  if(input&&document.activeElement!==input)input.value=String(value);
  if(label)label.textContent=(value>0?'+':'')+Number(value).toFixed(value%1?1:0)+' dB'
 });
 const active=portalSoundEqActive(state.eq),status=overlay.querySelector('[data-audio-eq-status]');
 if(status)status.textContent=active?'Égalisation personnalisée active':'Courbe neutre · aucun traitement tonal'
}
function portalSoundManagerSetEq(band,value){
 const state=portalSoundManagerState;if(!state||!PORTAL_SOUND_EQ_BANDS.some(x=>x.key===band))return;
 const n=Number(value);if(!Number.isFinite(n))return;
 state.eq=normalizePortalSoundEq({...state.eq,[band]:n});
 portalSoundManagerSync()
}
function setManagedPortalEqPreset(name){
 const state=portalSoundManagerState,preset=PORTAL_SOUND_EQ_PRESETS[name];if(!state||!preset)return;
 state.eq=normalizePortalSoundEq(preset);portalSoundManagerSync();previewManagedPortalSound()
}
function portalSoundManagerSet(which,value){
 const state=portalSoundManagerState;if(!state)return;
 const n=Number(value);if(!Number.isFinite(n))return;
 if(which==='start')state.start=n;else state.end=n;
 portalSoundManagerSync()
}
function previewManagedPortalSound(){
 const state=portalSoundManagerState;if(!state)return;
 const node=portalSoundNode(state.key);window.NettoSounds?.unlock?.();
 window.NettoSounds?.preview?.(state.key,{...node,trim_start:state.start,trim_end:state.end,eq:normalizePortalSoundEq(state.eq)})
}
function resetManagedPortalSound(){
 const state=portalSoundManagerState;if(!state)return;
 state.start=0;state.end=Math.max(.01,state.duration||.01);portalSoundManagerSync();previewManagedPortalSound()
}
function applyManagedPortalSound(){
 const state=portalSoundManagerState,node=state?portalSoundNode(state.key):null;if(!state||!node)return;
 portalSoundManagerClamp(state);
 node.trim_start=Math.max(0,Number(state.start.toFixed(3)));
 node.trim_end=state.end>=state.duration-.002?null:Math.max(node.trim_start+.001,Number(state.end.toFixed(3)));
 node.eq=normalizePortalSoundEq(state.eq);
 markDirty();closePortalSoundManager();renderSoundEditor();
 $('saveState').textContent='Réglages audio modifiés — enregistrer pour confirmer'
}
function openPortalSoundManager(key){
 const node=portalSoundNode(key),def=portalSoundDef(key);if(!node||!def)return;
 closePortalSoundManager();
 const custom=!!String(node.url||'').trim(),baseDuration=portalSoundManagerDuration(key,node),rawStart=Math.max(0,Number(node.trim_start)||0),rawEnd=Number(node.trim_end),initialEq=normalizePortalSoundEq(node.eq);
 const eqHtml=PORTAL_SOUND_EQ_BANDS.map(band=>{
  const value=initialEq[band.key]||0;
  return '<label class="audioEqBand">'+
   '<span><strong>'+esc(band.label)+'</strong><small>'+esc(band.freq)+'</small></span>'+
   '<input type="range" min="-12" max="12" step=".5" value="'+value+'" data-audio-eq-band="'+attr(band.key)+'">'+
   '<b data-audio-eq-value="'+attr(band.key)+'">'+(value>0?'+':'')+value+' dB</b>'+
  '</label>'
 }).join('');
 const overlay=document.createElement('div');overlay.id='portalSoundManagerOverlay';overlay.className='audioTrimOverlay';
 overlay.innerHTML='<section class="audioTrimDialog" role="dialog" aria-modal="true" aria-labelledby="audioTrimTitle">'+
  '<div class="audioTrimHeader"><div><span class="audioTrimEyebrow">Gestion audio</span><h3 id="audioTrimTitle">'+esc(def.label)+'</h3><p>'+esc(custom?(node.name||'Fichier audio personnalisé'):'Son Nethor par défaut')+'</p></div><button class="audioTrimClose" type="button" aria-label="Fermer" onclick="closePortalSoundManager()">×</button></div>'+
  '<div class="audioTrimNotice">Le fichier original n’est pas modifié. Nethor mémorise le calage et l’égalisation utilisés lors de la lecture.</div>'+
  '<div class="audioTrimTimeline">'+
   '<div class="audioTrimSectionHead"><div><strong>Calage</strong><span>Choisis la portion du son à lire.</span></div></div>'+
   '<div class="audioTrimTrack" aria-hidden="true"><i data-audio-trim-selection></i></div>'+
   '<div class="audioTrimRangeRow"><label><span>Début</span><b data-audio-trim-start-label>0 s</b></label><input data-audio-trim-start-range type="range" min="0" max="1" step=".01" value="0"></div>'+
   '<div class="audioTrimRangeRow"><label><span>Fin</span><b data-audio-trim-end-label>0 s</b></label><input data-audio-trim-end-range type="range" min="0" max="1" step=".01" value="1"></div>'+
  '</div>'+
  '<div class="audioTrimFields"><label><span>Démarre à</span><div><input data-audio-trim-start-input type="number" min="0" step=".01"><em>s</em></div></label><label><span>Se termine à</span><div><input data-audio-trim-end-input type="number" min="0" step=".01"><em>s</em></div></label></div>'+
  '<div class="audioTrimReadout"><strong data-audio-trim-summary>Chargement…</strong><span data-audio-trim-duration>'+esc(custom?'Lecture de la durée du fichier…':'')+'</span></div>'+
  '<section class="audioEqPanel">'+
   '<div class="audioEqHead"><div><span class="audioEqIcon" aria-hidden="true">≋</span><div><strong>Égaliseur</strong><small data-audio-eq-status>Courbe neutre · aucun traitement tonal</small></div></div><b>5 bandes</b></div>'+
   '<div class="audioEqPresets" aria-label="Préréglages égaliseur">'+
    '<button type="button" onclick="setManagedPortalEqPreset(\'flat\')">Neutre</button>'+
    '<button type="button" onclick="setManagedPortalEqPreset(\'bass\')">Basses +</button>'+
    '<button type="button" onclick="setManagedPortalEqPreset(\'clear\')">Clarté</button>'+
    '<button type="button" onclick="setManagedPortalEqPreset(\'soft\')">Doux</button>'+
   '</div>'+
   '<div class="audioEqBands">'+eqHtml+'</div>'+
   '<div class="audioEqHint"><span>−12 dB</span><span>0 dB</span><span>+12 dB</span></div>'+
  '</section>'+
  '<div class="audioTrimActions"><button class="btn secondaryBtn" type="button" onclick="previewManagedPortalSound()">▶ Écouter les réglages</button><button class="btn secondaryBtn" type="button" onclick="resetManagedPortalSound()">Réinitialiser le calage</button><span></span><button class="btn secondaryBtn" type="button" onclick="closePortalSoundManager()">Annuler</button><button class="btn primary" data-audio-trim-apply type="button" onclick="applyManagedPortalSound()"'+(custom?' disabled':'')+'>Appliquer</button></div>'+
 '</section>';
 document.body.appendChild(overlay);
 portalSoundManagerState={key,start:rawStart,end:Number.isFinite(rawEnd)&&rawEnd>0?rawEnd:(baseDuration||.01),duration:baseDuration||.01,loading:custom,eq:initialEq};
 overlay.addEventListener('click',e=>{if(e.target===overlay)closePortalSoundManager()});
 const startRange=overlay.querySelector('[data-audio-trim-start-range]'),endRange=overlay.querySelector('[data-audio-trim-end-range]'),startInput=overlay.querySelector('[data-audio-trim-start-input]'),endInput=overlay.querySelector('[data-audio-trim-end-input]');
 startRange.oninput=()=>portalSoundManagerSet('start',startRange.value);
 endRange.oninput=()=>portalSoundManagerSet('end',endRange.value);
 startInput.oninput=()=>portalSoundManagerSet('start',startInput.value);
 endInput.oninput=()=>portalSoundManagerSet('end',endInput.value);
 overlay.querySelectorAll('[data-audio-eq-band]').forEach(input=>input.oninput=()=>portalSoundManagerSetEq(input.dataset.audioEqBand,input.value));
 const syncLabels=()=>{
  const state=portalSoundManagerState;if(!state)return;
  const a=overlay.querySelector('[data-audio-trim-start-label]'),b=overlay.querySelector('[data-audio-trim-end-label]');
  if(a)a.textContent=soundTimeLabel(state.start);if(b)b.textContent=soundTimeLabel(state.end)
 };
 [startRange,endRange,startInput,endInput].forEach(el=>el.addEventListener('input',syncLabels));
 if(custom){
  const audio=new Audio();audio.preload='metadata';audio.src=String(node.url||'');
  audio.addEventListener('loadedmetadata',()=>{
   if(!portalSoundManagerState||portalSoundManagerState.key!==key)return;
   const duration=Number(audio.duration);if(!Number.isFinite(duration)||duration<=0)return;
   const st=portalSoundManagerState;st.duration=duration;st.start=Math.min(st.start,Math.max(0,duration-.01));
   st.end=Number.isFinite(rawEnd)&&rawEnd>st.start?Math.min(rawEnd,duration):duration;st.loading=false;
   portalSoundManagerSync();syncLabels();const apply=overlay.querySelector('[data-audio-trim-apply]');if(apply)apply.disabled=false
  },{once:true});
  audio.addEventListener('error',()=>{
   const state=$('saveState');state.className='saveState err';state.textContent='Impossible de lire la durée du fichier audio.'
  },{once:true});
  audio.load()
 }else{portalSoundManagerSync();syncLabels()}
}
async function downloadPortalSound(key){
 const node=portalSoundNode(key),def=portalSoundDef(key);if(!node||!def)return;
 const url=String(node.url||'').trim();
 if(url){downloadAssetUrl(url,node.name||('Nethor-'+key));return}
 try{await window.NettoSounds?.downloadDefault?.(key,'Nethor-'+key+'.wav')}
 catch(e){const state=$('saveState');state.className='saveState err';state.textContent='Export audio impossible : '+(e?.message||e)}
}
function resetPortalSound(key){
 const def=portalSoundDef(key);if(!def)return;
 config.sounds.items[key]={enabled:!!SOUND_ADMIN_DEFAULT_ENABLED[key],volume:1,url:'',path:'',name:'',trim_start:0,trim_end:null,eq:normalizePortalSoundEq(null)};
 markDirty();renderSoundEditor();$('saveState').textContent='Son « '+def.label+' » réinitialisé — enregistrer pour confirmer'
}




const MOBILE_PROFILE_FRAME_THEME_KEYS=Object.freeze(['light','dark','mineral','sage','plum','halloween']);
function normalizeMobileProfileFrames(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const src=raw.themes&&typeof raw.themes==='object'?raw.themes:{},themes={};
 for(const theme of MOBILE_PROFILE_FRAME_THEME_KEYS){
  const list=Array.isArray(src[theme])?src[theme]:[];
  themes[theme]=list.slice(0,40).map(item=>{
   item=item&&typeof item==='object'?item:{};
   const id=String(item.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
   return{id,name:String(item.name||'Cadre').trim().slice(0,60),url:String(item.url||''),path:String(item.path||''),file_name:String(item.file_name||'')}
  }).filter(x=>x.id&&x.url)
 }
 return{themes}
}
function emptyMobileThemeProfileFrames(){return{light:[],dark:[],mineral:[],sage:[],plum:[],halloween:[]}}
async function loadMobileThemeProfileFrames(){
 const {data,error}=await db.from('mobile_theme_profile_frames').select('id,theme,name,asset_url,storage_path,file_name,created_at').order('created_at',{ascending:true});
 if(error){console.warn('[Nethor Gestion] cadres profil',error);return mobileThemeProfileFramesCache}
 const next=emptyMobileThemeProfileFrames();
 for(const row of Array.isArray(data)?data:[]){
  const theme=MOBILE_PROFILE_FRAME_THEME_KEYS.includes(row?.theme)?row.theme:'light';
  if(!row?.id||!row?.asset_url)continue;
  next[theme].push({id:String(row.id),name:String(row.name||'Cadre'),url:String(row.asset_url),path:String(row.storage_path||''),file_name:String(row.file_name||'')})
 }
 mobileThemeProfileFramesCache=next;
 return next
}
function mobileProfileFramesNode(){
 return{themes:mobileThemeProfileFramesCache}
}
function mobileProfileFramesFor(theme){
 const key=MOBILE_PROFILE_FRAME_THEME_KEYS.includes(theme)?theme:'light';
 return mobileThemeProfileFramesCache[key]||[]
}
function cacheMobileThemeProfileFrame(row){
 const theme=MOBILE_PROFILE_FRAME_THEME_KEYS.includes(row?.theme)?row.theme:'light';
 const list=mobileThemeProfileFramesCache[theme]||(mobileThemeProfileFramesCache[theme]=[]);
 const normalized={id:String(row?.id||''),name:String(row?.name||'Cadre'),url:String(row?.asset_url||row?.url||''),path:String(row?.storage_path||row?.path||''),file_name:String(row?.file_name||'')};
 if(!normalized.id||!normalized.url)return;
 const index=list.findIndex(x=>x.id===normalized.id);
 if(index>=0)list[index]=normalized;else list.push(normalized)
}
function uncacheMobileThemeProfileFrame(theme,id){
 const key=MOBILE_PROFILE_FRAME_THEME_KEYS.includes(theme)?theme:'light',list=mobileThemeProfileFramesCache[key]||[],index=list.findIndex(x=>x.id===id);
 if(index>=0)list.splice(index,1)
}
const MOBILE_HEADER_THEME_KEYS=Object.freeze(['light','dark','mineral','sage','plum','halloween']);
function normalizeMobileHeaderThemeAsset(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 return{url:String(raw.url||''),path:String(raw.path||''),name:String(raw.name||'')}
}
function normalizeMobileHeaderThemes(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const out={};
 for(const key of MOBILE_HEADER_THEME_KEYS){
  const node=raw[key]&&typeof raw[key]==='object'?raw[key]:{};
  out[key]={
   layout:['logo_only','logo_logo','text_logo','logo_text'].includes(node.layout)?node.layout:'',
   text:String(node.text||'').slice(0,80),
   logo1:normalizeMobileHeaderThemeAsset(node.logo1),
   logo2:normalizeMobileHeaderThemeAsset(node.logo2)
  }
 }
 return out
}
function mobileHeaderThemeBase(theme){return ['dark','plum','halloween'].includes(theme)?'dark':'light'}
function mobileHeaderThemeNode(theme){
 const key=MOBILE_HEADER_THEME_KEYS.includes(theme)?theme:'light',ui=platformUiNode('mobile');
 ui.header_themes=normalizeMobileHeaderThemes(ui.header_themes);
 return ui.header_themes[key]
}
function mobileHeaderThemeEffective(theme){
 const key=MOBILE_HEADER_THEME_KEYS.includes(theme)?theme:'light',ui=platformUiNode('mobile'),node=mobileHeaderThemeNode(key),base=mobileHeaderThemeBase(key);
 const legacy1=platformAssetVariantNode('mobile','header_logo',base),legacy2=platformAssetVariantNode('mobile','header_logo_secondary',base);
 const logo1Url=String(node.logo1?.url||'').trim()||platformAssetUrl('mobile','header_logo',base);
 const logo2Url=String(node.logo2?.url||'').trim()||platformAssetUrl('mobile','header_logo_secondary',base);
 return{
  layout:node.layout||(['logo_only','logo_logo','text_logo','logo_text'].includes(ui.header_layout)?ui.header_layout:'logo_only'),
  text:String(node.text||ui.header_text||config?.brand?.name||'Nethor').trim().slice(0,80)||'Nethor',
  logo1:{...node.logo1,url:logo1Url,custom:!!String(node.logo1?.url||'').trim(),fallbackName:String(legacy1?.name||'')},
  logo2:{...node.logo2,url:logo2Url,custom:!!String(node.logo2?.url||'').trim(),fallbackName:String(legacy2?.name||'')},
  inheritedFrom:base
 }
}
function mobileHeaderThemeAssetNode(theme,slot){
 const node=mobileHeaderThemeNode(theme),key=slot==='logo2'?'logo2':'logo1';
 node[key]=normalizeMobileHeaderThemeAsset(node[key]);
 return node[key]
}

const MOBILE_WELCOME_THEME_KEYS=Object.freeze(['light','dark','mineral','sage','plum','halloween']);
function normalizeMobileWelcomeThemeAssets(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const out={};
 for(const key of MOBILE_WELCOME_THEME_KEYS){
  const node=raw[key]&&typeof raw[key]==='object'?raw[key]:{};
  out[key]={
   url:String(node.url||''),path:String(node.path||''),name:String(node.name||''),
   tag:String(node.tag||''),api:String(node.api||''),
   type:String(node.type||'animation')==='image'?'image':'animation'
  }
 }
 return out
}
function mobileWelcomeThemeBase(theme){return ['dark','plum','halloween'].includes(theme)?'dark':'light'}
function mobileWelcomeThemeNode(theme){
 ensurePlatformUiConfig();
 const key=MOBILE_WELCOME_THEME_KEYS.includes(theme)?theme:'light',ui=platformUiNode('mobile');
 ui.welcome_media_themes=normalizeMobileWelcomeThemeAssets(ui.welcome_media_themes);
 return ui.welcome_media_themes[key]
}
function mobileWelcomeThemeEffective(theme){
 const node=mobileWelcomeThemeNode(theme),base=mobileWelcomeThemeBase(theme),fallbackNode=platformAssetVariantNode('mobile','welcome_media',base);
 const url=String(node.url||'').trim()||platformAssetUrl('mobile','welcome_media',base);
 const fallbackType=platformAssetNode('mobile','welcome_media')?.type==='animation'?'animation':'image';
 return{
  url,
  name:String(node.name||'').trim()||String(fallbackNode?.name||'').trim(),
  tag:String(node.tag||'').trim()||String(fallbackNode?.tag||'').trim(),
  api:String(node.api||'').trim()||String(fallbackNode?.api||'').trim(),
  type:String(node.url||'').trim()?(node.type==='image'?'image':'animation'):fallbackType,
  custom:!!String(node.url||'').trim(),
  inheritedFrom:base
 }
}
function mobileWelcomeThemePreview(theme){
 const item=mobileWelcomeThemeEffective(theme),url=item.url;
 if(!url)return'<div class="mobileLaunchThemeEmpty">Aucun média</div>';
 if(platformAssetIsScript(url)){
  const host=platformWelcomeAnimationHost(url,item.inheritedFrom,item.tag,'Utilisateur',item.api);
  return '<iframe src="'+attr(host)+'" title="Aperçu animation '+attr(theme)+'" sandbox="allow-scripts" loading="lazy"></iframe>'
 }
 if(platformAssetIsVideo(url))return '<video src="'+attr(url)+'" autoplay muted loop playsinline></video>';
 return '<img src="'+attr(url)+'" alt="" loading="lazy">'
}
function renderMobileWelcomeThemeEditor(){
 const host=$('mobileWelcomeThemeEditor');if(!host)return;
 ensurePlatformUiConfig();
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Animation d’ouverture par thème</h2><p>Attribue un média d’ouverture spécifique à chaque thème Mobile. Sans fichier personnalisé, le thème hérite automatiquement de l’animation claire ou sombre existante.</p></div></div>'+
 '<div class="mobileLaunchThemeGrid">'+MOBILE_HOME_BANNER_THEMES.map(def=>{
  const item=mobileWelcomeThemeEffective(def.key);
  return '<article class="mobileLaunchThemeCard">'+
   '<div class="mobileLaunchThemeCardHead"><div><strong>'+esc(def.label)+'</strong><small>'+esc(def.description)+(def.private?' · Privé':'')+'</small></div><span class="mobileLaunchThemeBadge '+(item.custom?'custom':'')+'">'+(item.custom?'Personnalisée':'Héritée '+(item.inheritedFrom==='dark'?'sombre':'claire'))+'</span></div>'+
   '<div class="mobileLaunchThemePreview">'+mobileWelcomeThemePreview(def.key)+'</div>'+
   '<div class="mobileLaunchThemeMeta"><span>'+(item.custom?esc(item.name||'Média personnalisé'):'Animation Nethor '+(item.inheritedFrom==='dark'?'sombre':'claire'))+'</span><small>JS · GIF · MP4 · WebM · PNG · WebP · SVG</small></div>'+
   '<div class="platformAssetActions mobileLaunchThemeActions">'+
    '<button class="btn secondaryBtn mini" type="button" onclick="chooseMobileWelcomeThemeAsset(\''+attr(def.key)+'\')">Importer</button>'+
    '<button class="btn secondaryBtn mini" type="button" onclick="downloadMobileWelcomeThemeAsset(\''+attr(def.key)+'\')">Télécharger</button>'+
    '<button class="btn secondaryBtn mini" type="button" onclick="resetMobileWelcomeThemeAsset(\''+attr(def.key)+'\')">Réinitialiser</button>'+
   '</div>'+
   '<input id="mobileWelcomeThemeFile_'+attr(def.key)+'" type="file" accept=".js,.gif,.mp4,.webm,.png,.webp,.svg,application/javascript,text/javascript,image/gif,video/mp4,video/webm,image/png,image/webp,image/svg+xml" hidden onchange="uploadMobileWelcomeThemeAsset(\''+attr(def.key)+'\',this)">'+
  '</article>'
 }).join('')+'</div>'
}
function chooseMobileWelcomeThemeAsset(theme){$('mobileWelcomeThemeFile_'+theme)?.click()}
function mobileWelcomeThemeExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['js','gif','mp4','webm','png','webp','svg'].includes(ext)?ext:''
}
async function uploadMobileWelcomeThemeAsset(theme,input){
 const file=input?.files?.[0],state=$('saveState');if(!file)return;
 try{
  const ext=mobileWelcomeThemeExtension(file);if(!ext)throw new Error('Format refusé. Utilise JS, GIF, MP4, WebM, PNG, WebP ou SVG.');
  if(file.size>15*1024*1024)throw new Error('Fichier trop lourd : 15 Mo maximum.');
  state.className='saveState';state.textContent='Import de l’animation « '+mobileHomeBannerThemeDef(theme).label+' »…';
  const storagePath='platform/mobile/welcome-theme/'+theme+'/opening-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=mobileWelcomeThemeNode(theme);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;node.tag='';node.api='';
  node.type=['js','gif','mp4','webm'].includes(ext)?'animation':'image';
  markDirty();renderMobileAppearanceThemeEditor();state.className='saveState';state.textContent='Animation prête à être enregistrée'
 }catch(e){state.className='saveState err';state.textContent='Erreur animation : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function downloadMobileWelcomeThemeAsset(theme){
 const item=mobileWelcomeThemeEffective(theme);
 if(!item.url)return;
 const fallback='Nethor-ouverture-'+theme+(platformAssetIsScript(item.url)?'.js':platformAssetIsVideo(item.url)?'.mp4':'.svg');
 downloadAssetUrl(item.url,item.name||fallback)
}
function resetMobileWelcomeThemeAsset(theme){
 const node=mobileWelcomeThemeNode(theme);node.url='';node.path='';node.name='';node.tag='';node.api='';node.type='animation';
 markDirty();renderMobileAppearanceThemeEditor();$('saveState').textContent='Animation « '+mobileHomeBannerThemeDef(theme).label+' » réinitialisée — enregistrer pour confirmer'
}

const MOBILE_HOME_BANNER_THEMES=Object.freeze([
 {key:'light',label:'Clair',description:'Thème clair classique',bg1:'#ffffff',bg2:'#fff1e9',accent:'#ff6a3d',secondary:'#ffb18e'},
 {key:'dark',label:'Sombre',description:'Mode sombre classique',bg1:'#1d2228',bg2:'#30221e',accent:'#ff5b2a',secondary:'#7c2d20'},
 {key:'mineral',label:'Bleu minéral',description:'Bleu ardoise professionnel',bg1:'#ffffff',bg2:'#d9eaf7',accent:'#245f8c',secondary:'#9ebfd7'},
 {key:'sage',label:'Sauge',description:'Vert doux et naturel',bg1:'#ffffff',bg2:'#e0eddf',accent:'#356d53',secondary:'#a8c7b0'},
 {key:'plum',label:'Prune nocturne',description:'Violet profond et feutré',bg1:'#29253d',bg2:'#473259',accent:'#cbb8f4',secondary:'#79548d'},
 {key:'halloween',label:'Halloween',description:'Thème privé saisonnier',bg1:'#2b111c',bg2:'#18101d',accent:'#ff7a1a',secondary:'#7f3d8e',private:true}
]);
const MOBILE_HOME_BANNER_LAYER_DEFS=Object.freeze([
 {key:'background',label:'Fond',description:'Image ou texture qui couvre la bannière.',x:50,y:50,width:116,opacity:100},
 {key:'back',label:'Décor arrière',description:'Décor secondaire derrière le contenu principal.',x:87,y:56,width:42,opacity:58},
 {key:'main',label:'Décor principal',description:'Élément visuel principal à droite de la bannière.',x:87,y:62,width:42,opacity:100}
]);
let mobileHomeBannerEditorTheme='light';
function mobileHomeBannerThemeDef(theme){return MOBILE_HOME_BANNER_THEMES.find(x=>x.key===theme)||MOBILE_HOME_BANNER_THEMES[0]}
function mobileHomeBannerLayerDef(layer){return MOBILE_HOME_BANNER_LAYER_DEFS.find(x=>x.key===layer)||MOBILE_HOME_BANNER_LAYER_DEFS[0]}
function mobileHomeBannerLayerDefaults(theme,layer){
 const d=mobileHomeBannerLayerDef(layer),h=theme==='halloween';
 if(layer==='background')return{url:'',path:'',name:'',x:50,y:50,width:116,opacity:100,visible:true};
 if(layer==='back')return{url:'',path:'',name:'',x:h?82:87,y:h?27:56,width:h?34:42,opacity:h?62:58,visible:true};
 return{url:'',path:'',name:'',x:h?86:87,y:h?66:62,width:h?46:42,opacity:100,visible:true}
}
function normalizeMobileHomeBannerLayer(raw,theme,layer){
 raw=raw&&typeof raw==='object'?raw:{};
 const d=mobileHomeBannerLayerDefaults(theme,layer);
 return{
  url:String(raw.url||''),path:String(raw.path||''),name:String(raw.name||''),
  x:Math.max(0,Math.min(100,Number.isFinite(Number(raw.x))?Number(raw.x):d.x)),
  y:Math.max(0,Math.min(100,Number.isFinite(Number(raw.y))?Number(raw.y):d.y)),
  width:Math.max(layer==='background'?70:8,Math.min(layer==='background'?240:140,Number.isFinite(Number(raw.width))?Number(raw.width):d.width)),
  opacity:Math.max(0,Math.min(100,Number.isFinite(Number(raw.opacity))?Number(raw.opacity):d.opacity)),
  visible:raw.visible!==false
 }
}
function normalizeMobileHomeBanner(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const source=raw.themes&&typeof raw.themes==='object'?raw.themes:{},themes={};
 for(const theme of MOBILE_HOME_BANNER_THEMES){
  const node=source[theme.key]&&typeof source[theme.key]==='object'?source[theme.key]:{},layers=node.layers&&typeof node.layers==='object'?node.layers:{};
  themes[theme.key]={enabled:node.enabled!==false,layers:{}};
  for(const layer of MOBILE_HOME_BANNER_LAYER_DEFS)themes[theme.key].layers[layer.key]=normalizeMobileHomeBannerLayer(layers[layer.key],theme.key,layer.key)
 }
 return{enabled:raw.enabled!==false,themes}
}
function mobileHomeBannerNode(){
 ensurePlatformUiConfig();
 const ui=platformUiNode('mobile');ui.home_banner=normalizeMobileHomeBanner(ui.home_banner);return ui.home_banner
}
function mobileHomeBannerThemeNode(theme){
 const banner=mobileHomeBannerNode(),key=mobileHomeBannerThemeDef(theme).key;
 banner.themes[key]=banner.themes[key]||normalizeMobileHomeBanner({}).themes[key];
 return banner.themes[key]
}
function mobileHomeBannerLayerNode(theme,layer){
 const t=mobileHomeBannerThemeNode(theme),key=mobileHomeBannerLayerDef(layer).key;
 t.layers[key]=normalizeMobileHomeBannerLayer(t.layers[key],theme,key);
 return t.layers[key]
}
function mobileHomeBannerDefaultSvg(theme,layer){
 const t=mobileHomeBannerThemeDef(theme),safe=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
 if(layer==='background')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+safe(t.bg1)+'"/><stop offset="1" stop-color="'+safe(t.bg2)+'"/></linearGradient><radialGradient id="r" cx=".84" cy=".38" r=".48"><stop stop-color="'+safe(t.accent)+'" stop-opacity=".16"/><stop offset="1" stop-color="'+safe(t.accent)+'" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="360" fill="url(#g)"/><rect width="1200" height="360" fill="url(#r)"/></svg>';
 if(theme==='halloween'&&layer==='back')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220"><g fill="#09060c" opacity=".95"><path d="M25 96c24-32 51-42 83-35-12 12-15 27-8 45 14-13 31-17 51-10-20 12-31 30-33 54-19-15-37-18-55-8-5-18-18-33-38-46z"/><path d="M205 45c18-24 39-31 63-26-9 9-11 21-6 34 11-10 24-13 39-7-15 9-23 22-25 40-14-11-28-13-41-6-4-14-13-25-30-35z"/><path d="M293 127c13-18 28-23 46-19-7 7-8 15-4 25 8-7 18-9 29-5-11 7-17 16-18 29-11-8-21-10-31-4-3-10-10-19-22-26z"/></g></svg>';
 if(layer==='back')return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300"><circle cx="210" cy="174" r="112" fill="'+safe(t.secondary)+'" opacity=".66"/><circle cx="120" cy="230" r="72" fill="'+safe(t.accent)+'" opacity=".20"/></svg>';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300"><circle cx="190" cy="154" r="118" fill="'+safe(t.accent)+'" opacity=".72"/><circle cx="226" cy="118" r="82" fill="'+safe(t.secondary)+'" opacity=".38"/></svg>'
}
function mobileHomeBannerDefaultUrl(theme,layer){
 if(theme==='halloween'&&layer==='main')return'assets/halloween-pumpkin.svg';
 return'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(mobileHomeBannerDefaultSvg(theme,layer))
}
function mobileHomeBannerEffectiveUrl(theme,layer){
 const node=mobileHomeBannerLayerNode(theme,layer);
 return String(node.url||'').trim()||mobileHomeBannerDefaultUrl(theme,layer)
}
function mobileHomeBannerPreviewLayer(theme,layer,index){
 const node=mobileHomeBannerLayerNode(theme,layer);if(node.visible===false)return'';
 const url=mobileHomeBannerEffectiveUrl(theme,layer),z=layer==='background'?0:index+1;
 return '<img class="mobileHomeBannerPreviewLayer layer-'+attr(layer)+'" src="'+attr(url)+'" alt="" style="--mb-x:'+node.x+'%;--mb-y:'+node.y+'%;--mb-w:'+node.width+'%;--mb-o:'+(node.opacity/100).toFixed(2)+';--mb-z:'+z+'">'
}
function mobileHomeBannerPreviewHtml(theme){
 const def=mobileHomeBannerThemeDef(theme),layers=MOBILE_HOME_BANNER_LAYER_DEFS.map((x,i)=>mobileHomeBannerPreviewLayer(theme,x.key,i)).join('');
 return '<div class="mobileHomeBannerPreview theme-'+attr(theme)+'">'+layers+'<div class="mobileHomeBannerPreviewCopy"><strong>Bon après-midi Enzo 👋</strong><span>mercredi 07 octobre 2026</span><small>Ta journée de travail est terminée.</small></div><b>'+esc(def.label)+'</b></div>'
}
function mobileHomeBannerLayerCard(theme,layer){
 const def=mobileHomeBannerLayerDef(layer),node=mobileHomeBannerLayerNode(theme,layer),url=mobileHomeBannerEffectiveUrl(theme,layer),custom=!!node.url;
 const min=layer==='background'?70:8,max=layer==='background'?240:140;
 return '<article class="mobileHomeBannerLayerCard" data-mobile-banner-layer-card="'+attr(layer)+'">'+
  '<div class="mobileHomeBannerLayerHead"><div class="mobileHomeBannerLayerThumb"><img src="'+attr(url)+'" alt=""></div><div><strong>'+esc(def.label)+'</strong><small>'+esc(def.description)+'</small><em>'+(custom?esc(node.name||'Image personnalisée'):'Visuel Nethor par défaut')+'</em></div><label class="adminSwitch" title="Afficher ce calque"><input type="checkbox" data-mobile-banner-visible="'+attr(layer)+'" '+(node.visible!==false?'checked':'')+'><span></span></label></div>'+
  '<div class="mobileHomeBannerLayerActions"><button class="btn secondaryBtn mini" type="button" onclick="chooseMobileHomeBannerLayer(\''+attr(theme)+'\',\''+attr(layer)+'\')">Changer l’image</button><button class="btn secondaryBtn mini" type="button" onclick="downloadMobileHomeBannerLayer(\''+attr(theme)+'\',\''+attr(layer)+'\')">Télécharger</button><button class="btn secondaryBtn mini" type="button" onclick="resetMobileHomeBannerLayer(\''+attr(theme)+'\',\''+attr(layer)+'\')">Réinitialiser</button></div>'+
  '<input id="mobileHomeBannerFile_'+attr(theme)+'_'+attr(layer)+'" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.avif,image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif" hidden onchange="uploadMobileHomeBannerLayer(\''+attr(theme)+'\',\''+attr(layer)+'\',this)">'+
  '<div class="mobileHomeBannerLayerControls">'+
   '<label><span>Taille</span><div><input type="range" min="'+min+'" max="'+max+'" step="1" value="'+node.width+'" data-mobile-banner-field="width" data-mobile-banner-layer="'+attr(layer)+'"><output>'+Math.round(node.width)+' %</output></div></label>'+
   '<label><span>Position X</span><div><input type="range" min="0" max="100" step="1" value="'+node.x+'" data-mobile-banner-field="x" data-mobile-banner-layer="'+attr(layer)+'"><output>'+Math.round(node.x)+' %</output></div></label>'+
   '<label><span>Position Y</span><div><input type="range" min="0" max="100" step="1" value="'+node.y+'" data-mobile-banner-field="y" data-mobile-banner-layer="'+attr(layer)+'"><output>'+Math.round(node.y)+' %</output></div></label>'+
   '<label><span>Opacité</span><div><input type="range" min="0" max="100" step="1" value="'+node.opacity+'" data-mobile-banner-field="opacity" data-mobile-banner-layer="'+attr(layer)+'"><output>'+Math.round(node.opacity)+' %</output></div></label>'+
  '</div>'+
 '</article>'
}
function renderMobileHomeBannerEditor(){
 const host=$('mobileHomeBannerEditor');if(!host)return;
 const banner=mobileHomeBannerNode(),theme=mobileHomeBannerThemeDef(mobileHomeBannerEditorTheme).key,node=mobileHomeBannerThemeNode(theme),def=mobileHomeBannerThemeDef(theme);
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Bannière d’accueil Mobile</h2><p>Édite la bannière par thème, calque par calque. Les réglages d’un thème n’affectent jamais les autres.</p></div><label class="toggleChip"><input type="checkbox" data-mobile-banner-master '+(banner.enabled!==false?'checked':'')+'> Activer</label></div>'+
  '<div class="mobileHomeBannerThemeTabs">'+MOBILE_HOME_BANNER_THEMES.map(x=>'<button type="button" class="'+(x.key===theme?'active':'')+'" onclick="setMobileHomeBannerEditorTheme(\''+attr(x.key)+'\')"><strong>'+esc(x.label)+'</strong><small>'+esc(x.description)+(x.private?' · Privé':'')+'</small></button>').join('')+'</div>'+
  '<div class="mobileHomeBannerThemeHead"><div><span class="eyebrow">THÈME · '+esc(def.label.toUpperCase())+'</span><h3>Composition de la bannière</h3><p>Fond → décor arrière → décor principal → texte. Tu peux masquer, déplacer ou remplacer chaque image.</p></div><div><label class="toggleChip"><input type="checkbox" data-mobile-banner-theme-enabled '+(node.enabled!==false?'checked':'')+'> Thème actif</label><button class="btn secondaryBtn mini" type="button" onclick="resetMobileHomeBannerTheme(\''+attr(theme)+'\')">Réinitialiser le thème</button></div></div>'+
  '<div id="mobileHomeBannerLivePreview">'+mobileHomeBannerPreviewHtml(theme)+'</div>'+
  '<div class="mobileHomeBannerLayerGrid">'+MOBILE_HOME_BANNER_LAYER_DEFS.map(x=>mobileHomeBannerLayerCard(theme,x.key)).join('')+'</div>';
 const master=host.querySelector('[data-mobile-banner-master]');if(master)master.onchange=()=>{mobileHomeBannerNode().enabled=master.checked;markDirty()};
 const enabled=host.querySelector('[data-mobile-banner-theme-enabled]');if(enabled)enabled.onchange=()=>{mobileHomeBannerThemeNode(theme).enabled=enabled.checked;markDirty()};
 host.querySelectorAll('[data-mobile-banner-visible]').forEach(el=>el.onchange=()=>{mobileHomeBannerLayerNode(theme,el.dataset.mobileBannerVisible).visible=el.checked;markDirty();renderMobileHomeBannerPreview(theme)});
 host.querySelectorAll('[data-mobile-banner-field]').forEach(el=>el.oninput=()=>{
  const layer=el.dataset.mobileBannerLayer,field=el.dataset.mobileBannerField,node=mobileHomeBannerLayerNode(theme,layer);
  node[field]=Number(el.value);
  const output=el.parentElement?.querySelector('output');if(output)output.textContent=Math.round(Number(el.value))+' %';
  markDirty();renderMobileHomeBannerPreview(theme)
 })
}
function renderMobileHomeBannerPreview(theme=mobileHomeBannerEditorTheme){
 const host=$('mobileHomeBannerLivePreview');if(host)host.innerHTML=mobileHomeBannerPreviewHtml(theme)
}
function setMobileHomeBannerEditorTheme(theme){
 mobileHomeBannerEditorTheme=mobileHomeBannerThemeDef(theme).key;renderMobileHomeBannerEditor()
}
function chooseMobileHomeBannerLayer(theme,layer){$('mobileHomeBannerFile_'+theme+'_'+layer)?.click()}
function mobileHomeBannerAssetExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['jpg','jpeg','png','webp','svg','gif','avif'].includes(ext)?ext:''
}
async function uploadMobileHomeBannerLayer(theme,layer,input){
 const file=input?.files?.[0],state=$('saveState');if(!file)return;
 try{
  const ext=mobileHomeBannerAssetExtension(file);if(!ext)throw new Error('Format refusé. Utilise JPG, PNG, WebP, SVG, GIF ou AVIF.');
  if(file.size>12*1024*1024)throw new Error('Image trop lourde : 12 Mo maximum.');
  state.className='saveState';state.textContent='Import du calque « '+mobileHomeBannerLayerDef(layer).label+' »…';
  const storagePath='platform/mobile/home-banner/'+theme+'/'+layer+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=mobileHomeBannerLayerNode(theme,layer);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;node.visible=true;
  markDirty();renderMobileAppearanceThemeEditor();state.className='saveState';state.textContent='Calque prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur bannière : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function downloadMobileHomeBannerLayer(theme,layer){
 const node=mobileHomeBannerLayerNode(theme,layer),url=String(node.url||'').trim()||mobileHomeBannerDefaultUrl(theme,layer);
 downloadAssetUrl(url,node.name||('Nethor-banniere-'+theme+'-'+layer+'.svg'))
}
function resetMobileHomeBannerLayer(theme,layer){
 mobileHomeBannerThemeNode(theme).layers[layer]=normalizeMobileHomeBannerLayer(null,theme,layer);
 markDirty();renderMobileAppearanceThemeEditor();$('saveState').textContent='Calque réinitialisé — enregistrer pour confirmer'
}
function resetMobileHomeBannerTheme(theme){
 if(!confirm('Réinitialiser les trois calques de la bannière « '+mobileHomeBannerThemeDef(theme).label+' » ?'))return;
 const fresh=normalizeMobileHomeBanner(null);mobileHomeBannerNode().themes[theme]=fresh.themes[theme];
 markDirty();renderMobileAppearanceThemeEditor();$('saveState').textContent='Bannière '+mobileHomeBannerThemeDef(theme).label+' réinitialisée — enregistrer pour confirmer'
}

function mobileNotificationVisualNode(kind){
 ensurePlatformUiConfig();
 const defs=platformUiNode('mobile').notification_visuals||{};
 defs[kind]=normalizeMobileNotificationVisual(defs[kind]);
 platformUiNode('mobile').notification_visuals=defs;
 return defs[kind]
}
function mobileNotificationVisualDef(kind){return MOBILE_NOTIFICATION_VISUAL_DEFS.find(x=>x.key===kind)||null}
function mobileNotificationRadius(shape){return shape==='square'?'8px':shape==='rounded'?'14px':'50%'}
function mobileNotificationPreview(def,node){
 const visual=node.url
  ?'<img src="'+attr(node.url)+'" alt="" loading="lazy">'
  :'<span>'+esc(def.icon)+'</span>';
 return '<div class="mobileNotifVisualPreview">'+
  '<div class="mobileNotifVisualIcon"><i>'+visual+'</i></div>'+
  '<div class="mobileNotifVisualSample"><strong>'+esc(def.label)+'</strong><span>Logo seul · fond transparent</span></div>'+
 '</div>'
}
function renderMobileNotificationVisualEditor(){
 const host=$('mobileNotificationVisuals');if(!host)return;
 ensurePlatformUiConfig();
 const groups=['Planning','Messages','Système'];
 host.innerHTML='<div class="toolbar platformEditorHead"><div><h2>Visuels des notifications Mobile</h2><p>Contrôle individuellement le logo de chaque type de notification Mobile. Le visuel est affiché seul, sans cercle noir ni fond orange.</p></div></div>'+
 groups.map(group=>{
  const defs=MOBILE_NOTIFICATION_VISUAL_DEFS.filter(x=>x.group===group);
  return '<section class="mobileNotifVisualGroup"><div class="platformSubhead"><div><h3>'+esc(group)+'</h3><p>'+defs.length+' type'+(defs.length>1?'s':'')+' de notification</p></div></div><div class="mobileNotifVisualGrid">'+
   defs.map(def=>{
    const node=mobileNotificationVisualNode(def.key),custom=!!node.url;
    return '<article class="mobileNotifVisualCard" data-mobile-notif-kind="'+attr(def.key)+'">'+
     '<div class="mobileNotifVisualCardHead"><div><strong>'+esc(def.label)+'</strong><small>'+esc(def.key)+'</small></div><span class="mobileNotifVisualBadge">'+(custom?'Personnalisé':'Nethor')+'</span></div>'+
     mobileNotificationPreview(def,node)+
     '<div class="platformAssetActions mobileNotifVisualActions">'+
      '<button class="btn secondaryBtn mini" type="button" onclick="chooseMobileNotificationVisual(\''+attr(def.key)+'\')">Importer</button>'+
      '<button class="btn secondaryBtn mini" type="button" onclick="downloadMobileNotificationVisual(\''+attr(def.key)+'\')">Télécharger</button>'+
      '<button class="btn secondaryBtn mini" type="button" onclick="resetMobileNotificationVisual(\''+attr(def.key)+'\')">Réinitialiser</button>'+
     '</div>'+
     '<input id="mobileNotifVisualFile_'+attr(def.key)+'" type="file" accept=".png,.webp,.svg,.gif,image/png,image/webp,image/svg+xml,image/gif" hidden onchange="uploadMobileNotificationVisual(\''+attr(def.key)+'\',this)">'+
    '</article>'
   }).join('')+
  '</div></section>'
 }).join('');
}
function chooseMobileNotificationVisual(kind){$('mobileNotifVisualFile_'+kind)?.click()}
function mobileNotificationVisualExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['png','webp','svg','gif'].includes(ext)?ext:''
}
async function uploadMobileNotificationVisual(kind,input){
 const file=input?.files?.[0],def=mobileNotificationVisualDef(kind),state=$('saveState');if(!file||!def)return;
 try{
  const ext=mobileNotificationVisualExtension(file);
  if(!ext)throw new Error('Format refusé. Utilise PNG, WebP, SVG ou GIF.');
  if(file.size>5*1024*1024)throw new Error('Visuel trop lourd : 5 Mo maximum.');
  state.className='saveState';state.textContent='Import du visuel « '+def.label+' »…';
  const storagePath='platform/mobile/notifications/'+kind+'/'+Date.now()+'.'+ext;
  const contentType=file.type||({png:'image/png',webp:'image/webp',svg:'image/svg+xml',gif:'image/gif'}[ext]);
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=mobileNotificationVisualNode(kind);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;
  markDirty();renderMobileNotificationVisualEditor();
  state.className='saveState';state.textContent='Visuel « '+def.label+' » prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur visuel notification : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function mobileNotificationSvg(def,node){
 const emoji=String(def.icon||'🔔').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><text x="64" y="82" text-anchor="middle" font-size="64" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">'+emoji+'</text></svg>'
}
function downloadMobileNotificationVisual(kind){
 const def=mobileNotificationVisualDef(kind),node=mobileNotificationVisualNode(kind);if(!def)return;
 if(node.url){downloadAssetUrl(node.url,node.name||('Nethor-mobile-notification-'+kind));return}
 const blob=new Blob([mobileNotificationSvg(def,node)],{type:'image/svg+xml;charset=utf-8'}),href=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=href;a.download='Nethor-mobile-notification-'+kind+'.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1200)
}
function resetMobileNotificationVisual(kind){
 const def=mobileNotificationVisualDef(kind);if(!def)return;
 platformUiNode('mobile').notification_visuals[kind]=normalizeMobileNotificationVisual(null);
 markDirty();renderMobileNotificationVisualEditor();$('saveState').textContent='Visuel « '+def.label+' » réinitialisé — enregistrer pour confirmer'
}


let mobileAppearanceEditorTheme='light';
function mobileAppearanceThemeKey(theme){return MOBILE_HOME_BANNER_THEMES.some(x=>x.key===theme)?theme:'light'}
function mobileAppearanceThemeTabs(theme){
 return '<div class="mobileAppearanceThemeTabs">'+MOBILE_HOME_BANNER_THEMES.map(def=>
  '<button type="button" class="'+(def.key===theme?'active':'')+'" onclick="setMobileAppearanceEditorTheme(\''+attr(def.key)+'\')" style="--theme-accent:'+attr(def.accent)+';--theme-bg:'+attr(def.bg1)+'">'+
   '<i></i><span><strong>'+esc(def.label)+'</strong><small>'+esc(def.description)+(def.private?' · Privé':'')+'</small></span>'+
  '</button>'
 ).join('')+'</div>'
}
function mobileHeaderThemePreviewHtml(theme){
 const def=mobileHomeBannerThemeDef(theme),eff=mobileHeaderThemeEffective(theme);
 const logo1=eff.logo1.url?'<img src="'+attr(eff.logo1.url)+'" alt="">':'<span class="mobileAppearanceHeaderFallback">nethor</span>';
 const logo2=eff.logo2.url?'<img src="'+attr(eff.logo2.url)+'" alt="">':'';
 const text='<span class="mobileAppearanceHeaderText">'+esc(eff.text)+'</span>';
 const nodes=eff.layout==='logo_logo'?[logo1,logo2]:eff.layout==='text_logo'?[text,logo1]:eff.layout==='logo_text'?[logo1,text]:[logo1];
 return '<div class="mobileAppearanceHeaderPreview" style="--appearance-bg:'+attr(def.bg1)+';--appearance-accent:'+attr(def.accent)+'">'+
  '<span class="mobileAppearanceMenuGlyph">☰</span><div class="mobileAppearanceHeaderBrand" data-layout="'+attr(eff.layout)+'">'+nodes.filter(Boolean).join('')+'</div>'+
  '<span class="mobileAppearanceBell">♢</span><span class="mobileAppearanceAvatar">E</span>'+
 '</div>'
}
function mobileHeaderThemeAssetCard(theme,slot){
 const label=slot==='logo2'?'Logo 2':'Logo 1',eff=mobileHeaderThemeEffective(theme),item=slot==='logo2'?eff.logo2:eff.logo1,node=mobileHeaderThemeAssetNode(theme,slot),custom=!!String(node.url||'').trim();
 return '<article class="mobileAppearanceAssetCard">'+
  '<div class="mobileAppearanceAssetHead"><div><strong>'+label+'</strong><small>'+(slot==='logo2'?'Deuxième emplacement pour « Logo + Logo ».':'Logo principal de l’entête.')+'</small></div><span class="'+(custom?'custom':'')+'">'+(custom?'Personnalisé':'Hérité')+'</span></div>'+
  '<div class="mobileAppearanceAssetPreview">'+(item.url?'<img src="'+attr(item.url)+'" alt="">':'<em>Aucun visuel</em>')+'</div>'+
  '<div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="chooseMobileHeaderThemeAsset(\''+attr(theme)+'\',\''+attr(slot)+'\')">Importer</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="downloadMobileHeaderThemeAsset(\''+attr(theme)+'\',\''+attr(slot)+'\')">Télécharger</button>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="resetMobileHeaderThemeAsset(\''+attr(theme)+'\',\''+attr(slot)+'\')">Réinitialiser</button></div>'+
  '<input id="mobileHeaderThemeFile_'+attr(theme)+'_'+attr(slot)+'" type="file" accept=".png,.webp,.svg,.ico,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" hidden onchange="uploadMobileHeaderThemeAsset(\''+attr(theme)+'\',\''+attr(slot)+'\',this)">'+
 '</article>'
}
function mobileHeaderThemeSection(theme){
 const node=mobileHeaderThemeNode(theme),eff=mobileHeaderThemeEffective(theme);
 return '<section class="mobileAppearanceGroup">'+
  '<div class="mobileAppearanceGroupHead"><div><span>ENTÊTE</span><h3>Logo + identité</h3><p>Logo 1, Logo 2 et composition sont propres au thème sélectionné.</p></div><button class="btn secondaryBtn mini" type="button" onclick="resetMobileHeaderTheme(\''+attr(theme)+'\')">Réinitialiser l’entête</button></div>'+
  '<div id="mobileAppearanceHeaderPreview">'+mobileHeaderThemePreviewHtml(theme)+'</div>'+
  '<div class="mobileAppearanceComposition">'+
   '<label class="field"><span>Composition</span><select data-mobile-theme-header-layout>'+
    '<option value="logo_only" '+(eff.layout==='logo_only'?'selected':'')+'>Logo seul</option>'+
    '<option value="logo_logo" '+(eff.layout==='logo_logo'?'selected':'')+'>Logo + Logo</option>'+
    '<option value="text_logo" '+(eff.layout==='text_logo'?'selected':'')+'>Texte + Logo</option>'+
    '<option value="logo_text" '+(eff.layout==='logo_text'?'selected':'')+'>Logo + Texte</option>'+
   '</select></label>'+
   '<label class="field"><span>Texte</span><input type="text" maxlength="80" value="'+attr(eff.text)+'" placeholder="Nethor" data-mobile-theme-header-text></label>'+
   '<small>'+(node.layout||node.text?'Réglage spécifique à ce thème.':'Hérite actuellement de l’identité Mobile générale.')+'</small>'+
  '</div>'+
  '<div class="mobileAppearanceAssetGrid">'+mobileHeaderThemeAssetCard(theme,'logo1')+mobileHeaderThemeAssetCard(theme,'logo2')+'</div>'+
 '</section>'
}
function mobileAppearanceBannerSection(theme){
 const banner=mobileHomeBannerNode(),node=mobileHomeBannerThemeNode(theme);
 return '<section class="mobileAppearanceGroup">'+
  '<div class="mobileAppearanceGroupHead"><div><span>BANNIÈRE</span><h3>Accueil Mobile</h3><p>Modifie les trois calques de la bannière pour ce thème uniquement.</p></div><div class="mobileAppearanceGroupActions">'+
   '<label class="toggleChip"><input type="checkbox" data-mobile-appearance-banner-master '+(banner.enabled!==false?'checked':'')+'> Bannière</label>'+
   '<label class="toggleChip"><input type="checkbox" data-mobile-appearance-banner-enabled '+(node.enabled!==false?'checked':'')+'> Thème actif</label>'+
   '<button class="btn secondaryBtn mini" type="button" onclick="resetMobileHomeBannerTheme(\''+attr(theme)+'\')">Réinitialiser</button></div></div>'+
  '<div id="mobileAppearanceBannerPreview">'+mobileHomeBannerPreviewHtml(theme)+'</div>'+
  '<div class="mobileHomeBannerLayerGrid">'+MOBILE_HOME_BANNER_LAYER_DEFS.map(x=>mobileHomeBannerLayerCard(theme,x.key)).join('')+'</div>'+
 '</section>'
}

function mobileAppearanceProfileFramesSection(theme){
 const frames=mobileProfileFramesFor(theme),def=mobileHomeBannerThemeDef(theme);
 const cards=frames.length?frames.map(frame=>
  '<article class="mobileProfileFrameCard">'+
   '<div class="mobileProfileFramePreview"><span>ET</span><img src="'+attr(frame.url)+'" alt=""></div>'+
   '<div class="mobileProfileFrameInfo"><strong>'+esc(frame.name)+'</strong><small>'+esc(def.label)+' uniquement</small></div>'+
   '<div class="mobileProfileFrameActions">'+
    '<button class="btn secondaryBtn mini" type="button" onclick="downloadMobileProfileFrame(\''+attr(theme)+'\',\''+attr(frame.id)+'\')">Télécharger</button>'+
    '<button class="btn secondaryBtn mini dangerMini" type="button" onclick="deleteMobileProfileFrame(\''+attr(theme)+'\',\''+attr(frame.id)+'\')">Supprimer</button>'+
   '</div>'+
  '</article>'
 ).join(''):'<div class="mobileProfileFramesEmpty">Aucun cadre créé pour ce thème.</div>';
 return '<section class="mobileAppearanceGroup">'+
  '<div class="mobileAppearanceGroupHead"><div><span>PROFIL</span><h3>Cadres de profil</h3><p>Les cadres créés ici sont visibles uniquement lorsque le thème « '+esc(def.label)+' » est actif.</p></div></div>'+
  '<div class="mobileProfileFrameCreate">'+
   '<label class="field"><span>Nom du cadre</span><input type="text" maxlength="60" placeholder="Ex. Cercle Halloween" data-mobile-profile-frame-name></label>'+
   '<label class="field"><span>Image du cadre</span><input type="file" accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml" data-mobile-profile-frame-file></label>'+
   '<button class="btn primaryBtn" type="button" onclick="createMobileProfileFrame(\''+attr(theme)+'\')">Créer le cadre</button>'+
   '<small>PNG, WebP ou SVG transparent · 5 Mo maximum. L’image est superposée autour de l’avatar rond.</small>'+
  '</div>'+
  '<div class="mobileProfileFrameGrid">'+cards+'</div>'+
 '</section>'
}
async function createMobileProfileFrame(theme){
 const host=$('mobileAppearanceThemeEditor'),nameInput=host?.querySelector('[data-mobile-profile-frame-name]'),fileInput=host?.querySelector('[data-mobile-profile-frame-file]'),state=$('saveState'),createBtn=host?.querySelector('.mobileProfileFrameCreate .primaryBtn');
 const name=String(nameInput?.value||'').trim(),file=fileInput?.files?.[0],key=mobileAppearanceThemeKey(theme);
 if(!name){state.className='saveState err';state.textContent='Donne un nom au cadre.';nameInput?.focus();return}
 if(!file){state.className='saveState err';state.textContent='Importe une image pour créer le cadre.';fileInput?.click();return}
 let storagePath='',row=null;
 if(createBtn)createBtn.disabled=true;
 try{
  const ext=platformAssetExtension(file),allowed=['png','webp','svg'];
  if(!ext||!allowed.includes(ext))throw new Error('Format refusé. Utilise PNG, WebP ou SVG.');
  if(file.size>5*1024*1024)throw new Error('Cadre trop lourd : 5 Mo maximum.');
  state.className='saveState';state.textContent='Création du cadre « '+name+' »…';
  const id='themeframe_'+key+'_'+Date.now().toString(36);
  storagePath='platform/mobile/profile-frames/'+key+'/'+id+'.'+ext;
  const uploaded=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(uploaded.error)throw uploaded.error;
  const {data:publicData}=db.storage.from('portal-assets').getPublicUrl(storagePath);
  const assetUrl=String(publicData?.publicUrl||'').trim();if(!assetUrl)throw new Error('URL du cadre indisponible après import.');
  const inserted=await db.from('mobile_theme_profile_frames').insert({
   id,theme:key,name:name.slice(0,60),asset_url:assetUrl,storage_path:storagePath,file_name:file.name,created_by:session.user.id
  }).select('id,theme,name,asset_url,storage_path,file_name,created_at').single();
  if(inserted.error)throw inserted.error;
  row=inserted.data;
  cacheMobileThemeProfileFrame(row);
  renderMobileAppearanceThemeEditor();
  state.className='saveState ok';state.textContent='✓ Cadre « '+name+' » créé et sauvegardé';
  await loadMobileThemeProfileFrames();
  renderMobileAppearanceThemeEditor()
 }catch(e){
  if(!row&&storagePath){try{await db.storage.from('portal-assets').remove([storagePath])}catch(_){}}
  state.className='saveState err';state.textContent='Erreur cadre : '+(e?.message||e)
 }finally{if(createBtn?.isConnected)createBtn.disabled=false}
}
function downloadMobileProfileFrame(theme,id){
 const frame=mobileProfileFramesFor(theme).find(x=>x.id===id);if(!frame?.url)return;
 downloadAssetUrl(frame.url,frame.file_name||('Nethor-cadre-'+theme+'-'+id+'.png'))
}
async function deleteMobileProfileFrame(theme,id){
 const key=mobileAppearanceThemeKey(theme),frame=mobileProfileFramesFor(key).find(x=>x.id===id),state=$('saveState');if(!frame)return;
 if(!confirm('Supprimer le cadre « '+frame.name+' » du thème '+mobileHomeBannerThemeDef(key).label+' ?'))return;
 state.className='saveState';state.textContent='Suppression du cadre…';
 try{
  const removed=await db.from('mobile_theme_profile_frames').delete().eq('id',id).eq('theme',key);
  if(removed.error)throw removed.error;
  uncacheMobileThemeProfileFrame(key,id);
  renderMobileAppearanceThemeEditor();
  state.className='saveState ok';state.textContent='✓ Cadre « '+frame.name+' » supprimé';
  if(frame.path){try{await db.storage.from('portal-assets').remove([frame.path])}catch(_){}}
  await loadMobileThemeProfileFrames();
  renderMobileAppearanceThemeEditor()
 }catch(e){
  state.className='saveState err';state.textContent='Erreur suppression : '+(e?.message||e)
 }
}
function mobileAppearanceOpeningSection(theme){
 const item=mobileWelcomeThemeEffective(theme);
 return '<section class="mobileAppearanceGroup">'+
  '<div class="mobileAppearanceGroupHead"><div><span>OUVERTURE</span><h3>Animation d’ouverture</h3><p>Média affiché au lancement de Nethor avec ce thème.</p></div><span class="mobileLaunchThemeBadge '+(item.custom?'custom':'')+'">'+(item.custom?'Personnalisée':'Héritée '+(item.inheritedFrom==='dark'?'sombre':'claire'))+'</span></div>'+
  '<div class="mobileAppearanceOpeningGrid"><div class="mobileLaunchThemePreview">'+mobileWelcomeThemePreview(theme)+'</div><div class="mobileAppearanceOpeningInfo">'+
   '<strong>'+(item.custom?esc(item.name||'Média personnalisé'):'Animation Nethor '+(item.inheritedFrom==='dark'?'sombre':'claire'))+'</strong>'+
   '<small>JS · GIF · MP4 · WebM · PNG · WebP · SVG</small>'+
   '<div class="platformAssetActions"><button class="btn secondaryBtn mini" type="button" onclick="chooseMobileWelcomeThemeAsset(\''+attr(theme)+'\')">Importer</button>'+
    '<button class="btn secondaryBtn mini" type="button" onclick="downloadMobileWelcomeThemeAsset(\''+attr(theme)+'\')">Télécharger</button>'+
    '<button class="btn secondaryBtn mini" type="button" onclick="resetMobileWelcomeThemeAsset(\''+attr(theme)+'\')">Réinitialiser</button></div>'+
   '<input id="mobileWelcomeThemeFile_'+attr(theme)+'" type="file" accept=".js,.gif,.mp4,.webm,.png,.webp,.svg,application/javascript,text/javascript,image/gif,video/mp4,video/webm,image/png,image/webp,image/svg+xml" hidden onchange="uploadMobileWelcomeThemeAsset(\''+attr(theme)+'\',this)">'+
  '</div></div>'+
 '</section>'
}
function renderMobileAppearanceThemeEditor(){
 const host=$('mobileAppearanceThemeEditor');if(!host)return;
 ensurePlatformUiConfig();
 const theme=mobileAppearanceThemeKey(mobileAppearanceEditorTheme),def=mobileHomeBannerThemeDef(theme);
 mobileAppearanceEditorTheme=theme;mobileHomeBannerEditorTheme=theme;
 host.innerHTML='<div class="toolbar platformEditorHead mobileAppearanceEditorHead"><div><h2>Apparence par thème · Mobile</h2><p>Choisis un thème puis règle tous ses éléments visuels au même endroit. Chaque thème reste totalement indépendant.</p></div><button class="btn secondaryBtn mini" type="button" onclick="resetMobileAppearanceTheme(\''+attr(theme)+'\')">Réinitialiser « '+esc(def.label)+' »</button></div>'+
  mobileAppearanceThemeTabs(theme)+
  '<div class="mobileAppearanceSelectedTheme"><i style="background:'+attr(def.accent)+'"></i><div><span>THÈME SÉLECTIONNÉ</span><strong>'+esc(def.label)+'</strong><small>'+esc(def.description)+(def.private?' · Visible uniquement pour les comptes autorisés':'')+'</small></div></div>'+
  mobileHeaderThemeSection(theme)+mobileAppearanceProfileFramesSection(theme)+mobileAppearanceBannerSection(theme)+mobileAppearanceOpeningSection(theme);
 bindMobileAppearanceThemeEditor(host,theme)
}
function bindMobileAppearanceThemeEditor(host,theme){
 const layout=host.querySelector('[data-mobile-theme-header-layout]'),textInput=host.querySelector('[data-mobile-theme-header-text]');
 const updateHeader=()=>{
  const node=mobileHeaderThemeNode(theme);
  if(layout)node.layout=['logo_only','logo_logo','text_logo','logo_text'].includes(layout.value)?layout.value:'';
  if(textInput)node.text=String(textInput.value||'').slice(0,80);
  markDirty();renderMobileAppearanceHeaderPreview(theme);applyPlatformHeaderPreview('mobile')
 };
 if(layout)layout.onchange=updateHeader;
 if(textInput){textInput.oninput=updateHeader;textInput.onchange=updateHeader}
 const bannerMaster=host.querySelector('[data-mobile-appearance-banner-master]');
 if(bannerMaster)bannerMaster.onchange=()=>{mobileHomeBannerNode().enabled=bannerMaster.checked;markDirty()};
 const bannerEnabled=host.querySelector('[data-mobile-appearance-banner-enabled]');
 if(bannerEnabled)bannerEnabled.onchange=()=>{mobileHomeBannerThemeNode(theme).enabled=bannerEnabled.checked;markDirty()};
 host.querySelectorAll('[data-mobile-banner-visible]').forEach(el=>el.onchange=()=>{mobileHomeBannerLayerNode(theme,el.dataset.mobileBannerVisible).visible=el.checked;markDirty();renderMobileAppearanceBannerPreview(theme)});
 host.querySelectorAll('[data-mobile-banner-field]').forEach(el=>el.oninput=()=>{
  const layer=el.dataset.mobileBannerLayer,field=el.dataset.mobileBannerField,node=mobileHomeBannerLayerNode(theme,layer);
  node[field]=Number(el.value);
  const output=el.parentElement?.querySelector('output');if(output)output.textContent=Math.round(Number(el.value))+' %';
  markDirty();renderMobileAppearanceBannerPreview(theme)
 })
}
function renderMobileAppearanceHeaderPreview(theme=mobileAppearanceEditorTheme){
 const host=$('mobileAppearanceHeaderPreview');if(host)host.innerHTML=mobileHeaderThemePreviewHtml(theme)
}
function renderMobileAppearanceBannerPreview(theme=mobileAppearanceEditorTheme){
 const host=$('mobileAppearanceBannerPreview');if(host)host.innerHTML=mobileHomeBannerPreviewHtml(theme)
}
function setMobileAppearanceEditorTheme(theme){
 mobileAppearanceEditorTheme=mobileAppearanceThemeKey(theme);
 mobileHomeBannerEditorTheme=mobileAppearanceEditorTheme;
 renderMobileAppearanceThemeEditor()
}
function chooseMobileHeaderThemeAsset(theme,slot){$('mobileHeaderThemeFile_'+theme+'_'+slot)?.click()}
async function uploadMobileHeaderThemeAsset(theme,slot,input){
 const file=input?.files?.[0],state=$('saveState');if(!file)return;
 try{
  const ext=platformAssetExtension(file),allowed=['png','webp','svg','ico'];
  if(!ext||!allowed.includes(ext))throw new Error('Format refusé. Utilise PNG, WebP, SVG ou ICO.');
  if(file.size>5*1024*1024)throw new Error('Logo trop lourd : 5 Mo maximum.');
  state.className='saveState';state.textContent='Import '+mobileHomeBannerThemeDef(theme).label+' · '+(slot==='logo2'?'Logo 2':'Logo 1')+'…';
  const storagePath='platform/mobile/header-theme/'+theme+'/'+slot+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=mobileHeaderThemeAssetNode(theme,slot);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;
  markDirty();renderMobileAppearanceThemeEditor();applyPlatformHeaderPreview('mobile');state.className='saveState';state.textContent='Logo prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur logo : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
function downloadMobileHeaderThemeAsset(theme,slot){
 const eff=mobileHeaderThemeEffective(theme),item=slot==='logo2'?eff.logo2:eff.logo1;if(!item.url)return;
 downloadAssetUrl(item.url,item.name||('Nethor-mobile-'+theme+'-'+slot+'.svg'))
}
function resetMobileHeaderThemeAsset(theme,slot){
 const node=mobileHeaderThemeAssetNode(theme,slot);node.url='';node.path='';node.name='';
 markDirty();renderMobileAppearanceThemeEditor();applyPlatformHeaderPreview('mobile');$('saveState').textContent='Logo réinitialisé — enregistrer pour confirmer'
}
function resetMobileHeaderTheme(theme){
 const ui=platformUiNode('mobile');ui.header_themes=normalizeMobileHeaderThemes(ui.header_themes);
 ui.header_themes[mobileAppearanceThemeKey(theme)]={layout:'',text:'',logo1:normalizeMobileHeaderThemeAsset(null),logo2:normalizeMobileHeaderThemeAsset(null)};
 markDirty();renderMobileAppearanceThemeEditor();applyPlatformHeaderPreview('mobile');$('saveState').textContent='Entête '+mobileHomeBannerThemeDef(theme).label+' réinitialisé — enregistrer pour confirmer'
}
function resetMobileAppearanceTheme(theme){
 theme=mobileAppearanceThemeKey(theme);
 if(!confirm('Réinitialiser l’entête, la bannière et l’animation d’ouverture du thème « '+mobileHomeBannerThemeDef(theme).label+' » ?'))return;
 const ui=platformUiNode('mobile');
 ui.header_themes=normalizeMobileHeaderThemes(ui.header_themes);
 ui.header_themes[theme]={layout:'',text:'',logo1:normalizeMobileHeaderThemeAsset(null),logo2:normalizeMobileHeaderThemeAsset(null)};
 const freshBanner=normalizeMobileHomeBanner(null);mobileHomeBannerNode().themes[theme]=freshBanner.themes[theme];
 const opening=mobileWelcomeThemeNode(theme);opening.url='';opening.path='';opening.name='';opening.tag='';opening.api='';opening.type='animation';
 markDirty();renderMobileAppearanceThemeEditor();applyPlatformHeaderPreview('mobile');$('saveState').textContent='Thème « '+mobileHomeBannerThemeDef(theme).label+' » réinitialisé — enregistrer pour confirmer'
}

function renderPlatformEditors(){
 ensurePlatformUiConfig();renderPlatformIdentity('mobile');renderMobileAppearanceThemeEditor();renderMobileNotificationVisualEditor();renderPlatformIdentity('desktop');renderDesktopSidebarLogoEditor();renderDesktopGlobalBackgroundEditor();renderPlatformComponents('mobile');renderPlatformComponents('desktop');renderSoundEditor()
}
function ensurePortalPlatformStructure(){
 restructureManagementOverview();
 const mobileTab=$('tab-mobile');
 if(mobileTab){
  if(!$('platformIdentity_mobile')){const p=document.createElement('div');p.id='platformIdentity_mobile';p.className='panel platformIdentityPanel';mobileTab.prepend(p)}
  $('mobileHomeBannerEditor')?.remove();$('mobileWelcomeThemeEditor')?.remove();
  if(!$('mobileAppearanceThemeEditor')){const p=document.createElement('div');p.id='mobileAppearanceThemeEditor';p.className='panel mobileAppearanceThemeEditorPanel';const identity=$('platformIdentity_mobile');identity?.insertAdjacentElement('afterend',p)}
  if(!$('mobileNotificationVisuals')){const p=document.createElement('div');p.id='mobileNotificationVisuals';p.className='panel mobileNotificationVisualPanel';const appearance=$('mobileAppearanceThemeEditor')||$('platformIdentity_mobile');appearance?.insertAdjacentElement('afterend',p)}
  if(!$('platformComponents_mobile')){const p=document.createElement('div');p.id='platformComponents_mobile';p.className='panel platformComponentsPanel';mobileTab.appendChild(p)}
  const barPanel=$('mobileBarEditor')?.closest('.panel'),bar=barPanel?.querySelector('.toolbar h2'),barDesc=barPanel?.querySelector('.toolbar p');
  if(bar)bar.textContent='Navigation mobile';
  if(barDesc)barDesc.textContent='Entête, actions et barre basse propres à la plateforme Mobile.'
 }
 if(!$('tab-desktop')){
  const section=document.createElement('section');section.id='tab-desktop';section.className='section';
  section.innerHTML='<div id="platformIdentity_desktop" class="panel platformIdentityPanel"></div><div id="platformComponents_desktop" class="panel platformComponentsPanel"></div>';
  const before=$('tab-blocks');before?.parentNode?.insertBefore(section,before)
 }
 if(!$('tab-sounds')){
  const section=document.createElement('section');section.id='tab-sounds';section.className='section';
  section.innerHTML='<div id="soundEditorPanel" class="panel soundEditorPanel"></div>';
  const before=$('tab-blocks');before?.parentNode?.insertBefore(section,before)
 }
 const pagesTitle=document.querySelector('#tab-system .pagesEditorHead h2'),pagesText=document.querySelector('#tab-system .pagesEditorHead p');
 if(pagesTitle)pagesTitle.textContent='Pages & fonctionnalités';
 if(pagesText)pagesText.textContent='Structure, activation, libellés et emplacements. Les droits d’accès sont gérés séparément dans Utilisateurs & accès.';
 const blockTitle=document.querySelector('#tab-blocks .toolbar h2'),blockText=document.querySelector('#tab-blocks .toolbar p');
 if(blockTitle)blockTitle.textContent='Widgets d’accueil';
 if(blockText)blockText.textContent='Affichage et personnalisation uniquement. Les permissions utilisateurs sont séparées.';
}

const MANAGEMENT_COMPACT_SECTIONS=new Set(['tab-general','tab-blocks','tab-media','tab-notifications']);
const MANAGEMENT_PANEL_ICONS={
 'Identité du portail':'◈','Couleurs générales':'◉','Barre de navigation mobile':'▣',
 'Blocs & widgets':'▥','Bibliothèque des logos Nethor':'▧','Envoyer une notification':'↗',
 'Notifications existantes':'♢','Autorisation par utilisateur':'♙'
};
function managementPanelIcon(title){return MANAGEMENT_PANEL_ICONS[String(title||'').trim()]||'•'}
function enhanceCompactPortal(){
 document.querySelectorAll('.workspace .section').forEach(section=>{
  section.classList.toggle('managementSettingsSection',MANAGEMENT_COMPACT_SECTIONS.has(section.id)||section.id==='tab-maintenance')
 });
 document.querySelectorAll('.workspace .section .panel').forEach((panel,index)=>{
  const section=panel.closest('.section');
  if(!section||!MANAGEMENT_COMPACT_SECTIONS.has(section.id))return;
  if(panel.dataset.compactReady==='1')return;
  panel.dataset.compactReady='1';panel.classList.add('compactPanel','managementSettingPanel');
  let head=panel.querySelector(':scope > .toolbar'),title=panel.querySelector(':scope > h2'),intro=panel.querySelector(':scope > .panelIntro'),txt=null;
  if(head){
   head.classList.add('compactPanelHead','managementSettingHead');
   txt=head.firstElementChild;
   if(txt)txt.classList.add('compactPanelHeadText','managementSettingHeadText');
  }else if(title){
   head=document.createElement('div');head.className='compactPanelHead managementSettingHead';
   txt=document.createElement('div');txt.className='compactPanelHeadText managementSettingHeadText';txt.appendChild(title);if(intro)txt.appendChild(intro);
   head.appendChild(txt);panel.insertBefore(head,panel.firstChild)
  }else return;
  const titleText=txt?.querySelector('h2')?.textContent||title?.textContent||'Réglage';
  const icon=document.createElement('span');icon.className='managementSettingHeadIcon';icon.setAttribute('aria-hidden','true');icon.textContent=managementPanelIcon(titleText);
  head.insertBefore(icon,txt);
  const chev=document.createElement('span');chev.className='compactPanelChevron managementSettingChevron';chev.textContent='⌄';chev.setAttribute('aria-hidden','true');head.appendChild(chev);
  head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','false');
  const body=document.createElement('div');body.className='compactPanelBody managementSettingBody';
  [...panel.children].filter(x=>x!==head).forEach(x=>body.appendChild(x));panel.appendChild(body);
  const toggle=()=>{
   const opening=!panel.classList.contains('open');panel.classList.toggle('open',opening);head.setAttribute('aria-expanded',opening?'true':'false');
   window.NettoSounds?.play?.(opening?'menuOpen':'menuClose')
  };
  head.addEventListener('click',e=>{if(e.target.closest('button,a,input,label,select,textarea'))return;toggle()});
  head.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,label,select,textarea')){e.preventDefault();toggle()}})
 })
}
function choosePageImage(id){$('pageFile_'+id)?.click()}
async function uploadAsset(file,prefix){
 if(!file)return null;if(file.size>5*1024*1024)throw new Error('Image trop lourde : 5 Mo maximum.');
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
 const path='menus/'+prefix+'-'+Date.now()+'.'+ext;
 const {error}=await db.storage.from('portal-assets').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;
 const {data}=db.storage.from('portal-assets').getPublicUrl(path);return{path,url:data?.publicUrl||''}
}
async function uploadPageImage(id,input){const state=$('saveState');try{state.textContent='Import de l’image…';const r=await uploadAsset(input.files?.[0],'page-'+id);if(!r)return;config.pages[id].image_path=r.path;config.pages[id].image_url=r.url;renderSystem();markDirty()}catch(e){state.className='saveState err';state.textContent='Erreur image : '+e.message}finally{input.value=''}}
function chooseHeaderLogo(){$('headerLogoFile')?.click()}
function headerLogoExtension(file){
 const ext=(String(file?.name||'').split('.').pop()||'').toLowerCase();
 return ['png','webp','svg','ico'].includes(ext)?ext:''
}
function renderHeaderLogoAsset(){
 const preview=$('headerLogoPreview'),download=$('headerLogoDownload'),remove=$('headerLogoRemove'),name=$('headerLogoFileName'),url=String(config?.brand?.header_logo_url||'').trim();
 if(preview)preview.innerHTML=url?'<img src="'+attr(url)+'" alt="Logo des en-têtes">':'<span class="headerLogoFallback">N</span>';
 download?.classList.toggle('hidden',!url);remove?.classList.toggle('hidden',!url);
 if(name)name.textContent=url?(config.brand.header_logo_name||'Logo personnalisé'):'Logo Nethor par défaut'
}
async function uploadHeaderLogo(input){
 const state=$('saveState'),file=input?.files?.[0];
 try{
  if(!file)return;
  const ext=headerLogoExtension(file);
  if(!ext)throw new Error('Format refusé. Utilise PNG, WebP, SVG ou ICO pour conserver la transparence.');
  if(file.size>5*1024*1024)throw new Error('Logo trop lourd : 5 Mo maximum.');
  const allowedMime=['image/png','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon',''];
  if(!allowedMime.includes(file.type))throw new Error('Format non compatible avec un logo transparent.');
  state.className='saveState';state.textContent='Import du logo…';
  const path='brand/header-logo-'+Date.now()+'.'+ext;
  const contentType=file.type||({png:'image/png',webp:'image/webp',svg:'image/svg+xml',ico:'image/x-icon'}[ext]);
  const {error}=await db.storage.from('portal-assets').upload(path,file,{upsert:false,contentType});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(path);
  config.brand.header_logo_path=path;config.brand.header_logo_url=data?.publicUrl||'';config.brand.header_logo_name=file.name;
  renderHeaderLogoAsset();paintGlobal();markDirty();
  state.className='saveState';state.textContent='Logo prêt à être enregistré'
 }catch(e){state.className='saveState err';state.textContent='Erreur logo : '+(e?.message||e)}
 finally{if(input)input.value=''}
}
async function downloadHeaderLogo(){
 const url=String(config?.brand?.header_logo_url||'').trim();if(!url)return;
 const fallbackName=config.brand.header_logo_name||('Nethor-logo-entete.'+(url.split('.').pop()?.split('?')[0]||'png'));
 try{
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Téléchargement impossible');
  const blob=await r.blob(),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download=fallbackName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),1200)
 }catch(_){
  const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.download=fallbackName;document.body.appendChild(link);link.click();link.remove()
 }
}
function removeHeaderLogo(){
 if(!config?.brand)return;
 config.brand.header_logo_url='';config.brand.header_logo_path='';config.brand.header_logo_name='';
 renderHeaderLogoAsset();paintGlobal();markDirty();$('saveState').textContent='Logo retiré — enregistrer pour confirmer'
}
function bindGlobal(){
 ['brandName','brandSubtitle','homeEyebrow','homeIntro','primaryColor','secondaryColor','inkColor'].forEach(id=>$(id).addEventListener('input',()=>{collectGlobal();paintGlobal();markDirty()}));$('maintenanceEnabled').addEventListener('change',()=>{collectGlobal();paintGlobal();markDirty();window.NettoSounds?.play?.('switch')})
}
function collectGlobal(){config.brand.name=$('brandName').value.trim()||'Nethor';config.brand.subtitle=$('brandSubtitle').value.trim();config.home.eyebrow=$('homeEyebrow').value.trim();config.home.intro=$('homeIntro').value.trim();config.theme.primary=$('primaryColor').value;config.theme.secondary=$('secondaryColor').value;config.theme.ink=$('inkColor').value;config.maintenance={enabled:!!$('maintenanceEnabled').checked}}
function paintGlobal(){document.documentElement.style.setProperty('--primary',config.theme.primary);document.documentElement.style.setProperty('--secondary',config.theme.secondary);document.documentElement.style.setProperty('--ink',config.theme.ink);$('previewName').textContent=config.brand.name;$('previewSubtitle').textContent=config.brand.subtitle;$('primaryHex').textContent=config.theme.primary;$('secondaryHex').textContent=config.theme.secondary;$('inkHex').textContent=config.theme.ink;const pm=$('previewMark'),logo=String(config.brand.header_logo_url||'').trim();if(pm){pm.classList.toggle('hasHeaderLogo',!!logo);pm.textContent=logo?'':'N';if(logo){pm.style.background='';pm.style.backgroundImage='url('+JSON.stringify(logo)+')'}else{pm.style.backgroundImage='';pm.style.background='linear-gradient(135deg,'+config.theme.primary+','+config.theme.secondary+')'}}renderHeaderLogoAsset();const enabled=!!config.maintenance?.enabled,mn=$('maintenanceNotice'),ml=$('maintenanceStateLabel');if(mn){mn.classList.toggle('active',enabled);mn.innerHTML=enabled?'<b>Maintenance activée.</b> Les utilisateurs non administrateurs sont redirigés vers la page de maintenance.':'<b>Maintenance désactivée.</b> Le portail reste accessible normalement.'}if(ml){ml.textContent=enabled?'Activée':'Désactivée';ml.classList.toggle('active',enabled)}}
function fillGlobal(){$('brandName').value=config.brand.name;$('brandSubtitle').value=config.brand.subtitle;$('homeEyebrow').value=config.home.eyebrow;$('homeIntro').value=config.home.intro;$('primaryColor').value=config.theme.primary;$('secondaryColor').value=config.theme.secondary;$('inkColor').value=config.theme.ink;$('maintenanceEnabled').checked=!!config.maintenance?.enabled;paintGlobal()}
function validateConfig(){
 const storeInfo=ensureStoreInfoWidgetConfig();
 if(storeInfo.photo_url&&!validUrl(storeInfo.photo_url))throw new Error('URL de photo invalide pour le widget point de vente.');
 for(const [id,p] of Object.entries(config.pages)){if(p?.url&&!validUrl(p.url))throw new Error('Destination invalide pour '+(p.label||id))}
 ensureMobileBar();const enabled=config.mobile_bar.items.filter(x=>x.enabled!==false),ids=enabled.map(x=>x.id);
 if(enabled.length>3)throw new Error('La barre mobile unifiée est limitée à 3 raccourcis.');
 if(new Set(ids).size!==ids.length)throw new Error('Un même menu ne peut apparaître qu’une fois dans la barre mobile.')
}
async function saveConfig(){
 const state=$('saveState');state.className='saveState';state.textContent='Enregistrement…';
 try{collectGlobal();ensureMobileBar();validateConfig();const {error}=await db.from('app_settings').upsert({key:'site_config',value:config,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;dirty=false;await loadMobileThemeProfileFrames();state.className='saveState ok';state.textContent='✓ Portail mis à jour';window.NettoSounds?.play?.('success');await window.NettoProfileUI?.refresh?.();renderSystem();renderMobileBar();renderMobileUserMenu();renderPlatformEditors();if($('tab-logs')?.classList.contains('active'))await loadPortalLogs()}catch(e){console.error(e);state.className='saveState err';state.textContent='Erreur : '+(e?.message||'enregistrement impossible');window.NettoSounds?.play?.('error')}
}
async function reloadConfig(){if(dirty&&!confirm('Annuler les modifications non enregistrées ?'))return;await loadConfig();window.NettoSounds?.play?.('confirm')}
async function loadConfig(){const {data,error}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();if(error)throw error;config=normalize(data?.value||{});await loadMobileThemeProfileFrames();ensurePages();ensureMobileBar();ensureMobileUserMenu();fillGlobal();renderSystem();renderMobileBar();renderMobileUserMenu();renderPlatformEditors();applyDesktopGlobalBackgroundPreview();dirty=false;$('saveState').className='saveState';$('saveState').textContent='À jour'}


function logDate(value){
 const common=window.NethorConnectionTimes;
 if(common?.stamp)return common.stamp(value,{seconds:true}).replace(' à ',' · ');
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return'Date indisponible';
 return d.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric'})+
  ' · '+d.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',second:'2-digit'})
}
const LOG_DETAIL_LABELS={changed_fields:'Éléments modifiés',page_id:'Page',menu_id:'Menu',section:'Section',commits:'Références Git',commit:'Référence Git',pwa_cache:'Cache PWA',cache:'Cache',profile_ui:'Interface globale',scope:'Portée',messages:'Messages',logos:'Logos',fallback:'Icône de secours',colors:'Couleurs',icon_pack:'Pack d’icônes',seeded_rows:'Entrées initiales',mobile_preview:'Aperçu mobile',login_log_delete:'Suppression des connexions'};
const LOG_FIELD_LABELS={label:'Nom',nav_label:'Navigation',subtitle:'Sous-titre',description:'Description',roles:'Rôles',image_path:'Image',image_url:'Image',icon:'Icône',color:'Couleur',accent:'Accent',contract_hours:'Heures contrat',home:'Accueil',user_menu:'Menu utilisateur',enabled:'Activation',url:'Destination',kicker:'Petit titre',action:'Action',default_home:'Accueil par défaut',default_user:'Menu utilisateur par défaut',items:'Contenu'};
function logDetailValue(key,value){
 if(key==='changed_fields'&&Array.isArray(value))return value.map(v=>LOG_FIELD_LABELS[v]||v).join(', ');
 if(Array.isArray(value))return value.map(v=>typeof v==='object'?JSON.stringify(v):String(v)).join(' · ');
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>(LOG_FIELD_LABELS[k]||k)+' : '+String(v)).join(' · ');
 if(typeof value==='boolean')return value?'Oui':'Non';
 return String(value??'')
}
function renderLogDetails(x){
 const d=x?.details;if(!d||typeof d!=='object'||Array.isArray(d))return'';
 const hidden=new Set(['version','label','importance','duplicate','duplicate_of','backfilled','target_user_id']);
 const entries=Object.entries(d).filter(([key,value])=>!hidden.has(key)&&value!==null&&value!==''&&!(Array.isArray(value)&&!value.length));
 if(!entries.length)return'';
 return '<details class="logDetails"><summary>Détails de la modification</summary><div class="logDetailsGrid">'+entries.map(([key,value])=>'<div class="logDetailKey">'+esc(LOG_DETAIL_LABELS[key]||key.replaceAll('_',' '))+'</div><div class="logDetailValue">'+esc(logDetailValue(key,value))+'</div>').join('')+'</div></details>'
}
function logVersionLabel(x){return String(x?.details?.label||'').trim()}
function isImportantPortalLog(x){
 if(!x)return false;
 if(x.details?.duplicate===true||x.details?.importance==='low')return false;
 if(x.source==='auto')return true;
 const title=String(x.title||'').toLowerCase(),area=String(x.area||'').toLowerCase();
 if(area==='notifications'&&/^notifications de /.test(title))return false;
 return true
}
function isDesktopJournal(){
 try{
  if(document.documentElement.dataset.nethorPageLayout==='desktop')return true;
  const p=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'').toLowerCase();
  return p==='desktop'
 }catch(_){return false}
}
function logExportRows(){return portalLogs.filter(isImportantPortalLog)}
function logExportSafeName(value,fallback='journal'){
 const s=String(value||fallback).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
 return (s||fallback).slice(0,96)
}
function logExportVersion(x){
 const label=String(x?.details?.label||'').trim();
 if(label)return label;
 const n=Number(x?.details?.version||0);
 return n>0?'build-'+n:''
}
function logExportFileName(x,index=0){
 const version=logExportVersion(x),title=logExportSafeName(x?.title||'modification','modification');
 const lead=version?logExportSafeName(version,'version'):('log-'+String(x?.id||index+1));
 return 'Nethor-'+lead+'-'+title+'.txt'
}
function logExportDetailLines(details){
 if(!details||typeof details!=='object'||Array.isArray(details))return[];
 const hidden=new Set(['duplicate','duplicate_of']);
 return Object.entries(details)
  .filter(([key,value])=>!hidden.has(key)&&value!==null&&value!==''&&!(Array.isArray(value)&&!value.length))
  .map(([key,value])=>'- '+(LOG_DETAIL_LABELS[key]||key.replaceAll('_',' '))+' : '+logDetailValue(key,value))
}
function portalLogAsText(x){
 const auto=x?.source==='auto',author=auto?'AUTO':(x?.actor_name||'Administrateur'),version=logExportVersion(x)||'—';
 const details=logExportDetailLines(x?.details);
 const date=x?.created_at?new Date(x.created_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'full',timeStyle:'medium'}):'—';
 const lines=[
  'NETHOR — JOURNAL DES MODIFICATIONS',
  '===================================',
  '',
  'Version : '+version,
  'Type : '+(x?.release_type==='maj'?'MAJ':'PATCH'),
  'Source : '+(auto?'AUTO':'MANUEL'),
  'Zone : '+(x?.area||'—'),
  'Date : '+date,
  'Auteur : '+author,
  'Identifiant : '+(x?.id??'—'),
  '',
  'TITRE',
  String(x?.title||'Modification'),
  '',
  'DESCRIPTION',
  String(x?.description||''),
 ];
 if(details.length)lines.push('','DÉTAILS',...details);
 lines.push('','---','Export généré depuis Nethor · Journal des modifications');
 return lines.join('\r\n')
}
function saveJournalBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function downloadPortalLog(id){
 if(!isDesktopJournal())return;
 const x=portalLogs.find(row=>String(row.id)===String(id));if(!x)return;
 const blob=new Blob(['\ufeff',portalLogAsText(x)],{type:'text/plain;charset=utf-8'});
 saveJournalBlob(blob,logExportFileName(x))
}
let nethorZipCrcTable=null;
function zipCrc32(bytes){
 if(!nethorZipCrcTable){
  nethorZipCrcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);nethorZipCrcTable[n]=c>>>0}
 }
 let crc=0xffffffff;
 for(const b of bytes)crc=nethorZipCrcTable[(crc^b)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0
}
function zipDosDateTime(value){
 const d=value instanceof Date&&!Number.isNaN(value.getTime())?value:new Date();
 const year=Math.max(1980,d.getFullYear()),month=d.getMonth()+1,day=d.getDate(),hour=d.getHours(),minute=d.getMinutes(),second=Math.floor(d.getSeconds()/2);
 return{date:((year-1980)<<9)|(month<<5)|day,time:(hour<<11)|(minute<<5)|second}
}
function zipStoreTextFiles(files){
 const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
 files.forEach(file=>{
  const name=enc.encode(file.name),data=enc.encode(file.text),crc=zipCrc32(data),dt=zipDosDateTime(file.date);
  const local=new Uint8Array(30+name.length+data.length),lv=new DataView(local.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
  lv.setUint16(10,dt.time,true);lv.setUint16(12,dt.date,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
  lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);local.set(name,30);local.set(data,30+name.length);
  locals.push(local);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);
  cv.setUint16(12,dt.time,true);cv.setUint16(14,dt.date,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
  cv.setUint16(28,name.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offset,true);
  central.set(name,46);centrals.push(central);offset+=local.length
 });
 const centralSize=centrals.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
 ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
 ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
 return new Blob([...locals,...centrals,end],{type:'application/zip'})
}
async function fetchAllPortalLogsForExport(){
 const all=[],step=1000,fields='id,source,release_type,title,description,area,actor_name,created_at,details';
 for(let from=0;;from+=step){
  const {data,error}=await db.from('portal_change_logs').select(fields).order('created_at',{ascending:false}).range(from,from+step-1);
  if(error)throw error;
  const batch=data||[];all.push(...batch);
  if(batch.length<step)break
 }
 return all.filter(isImportantPortalLog)
}
async function downloadAllPortalLogs(){
 if(!isDesktopJournal())return;
 const button=$('downloadAllLogsBtn'),original=button?.textContent||'↓ Tous (.zip)';
 if(button){button.disabled=true;button.textContent='Préparation…'}
 try{
  const rows=await fetchAllPortalLogsForExport();
  if(!rows.length){alert('Aucune entrée à télécharger.');return}
  const generated=new Date(),files=[];
  const summary=[
   'NETHOR — JOURNAL COMPLET DES MODIFICATIONS',
   '==========================================',
   '',
   'Export : '+logDate(generated),
   'Entrées : '+rows.length,
   '',
   ...rows.flatMap((x,i)=>[
    String(i+1).padStart(3,'0')+' · '+(logExportVersion(x)||('Log #'+(x.id??'?')))+' · '+(x.release_type==='maj'?'MAJ':'PATCH')+' · '+String(x.title||'Modification'),
    '    '+(x.created_at?logDate(x.created_at):'')+' · '+(x.source==='auto'?'AUTO':'MANUEL'),
    ''
   ])
  ].join('\r\n');
  files.push({name:'00-JOURNAL-COMPLET.txt',text:'\ufeff'+summary,date:generated});
  rows.forEach((x,i)=>files.push({name:String(i+1).padStart(3,'0')+'-'+logExportFileName(x,i),text:'\ufeff'+portalLogAsText(x),date:x.created_at?new Date(x.created_at):generated}));
  const blob=zipStoreTextFiles(files),stamp=generated.toISOString().slice(0,10);
  saveJournalBlob(blob,'Nethor-Journal-des-modifications-'+stamp+'.zip')
 }catch(e){
  console.error('Export journal complet:',e);
  alert('Impossible de préparer le pack du journal.')
 }finally{
  if(button){button.disabled=false;button.textContent=original}
 }
}

function renderPortalLogs(){
 const host=$('portalLogs');if(!host)return;
 const important=portalLogs.filter(isImportantPortalLog);
 $('logTotalCount').textContent=String(important.length);
 $('logAutoCount').textContent=String(important.filter(x=>x.source==='auto').length);
 $('logManualCount').textContent=String(important.filter(x=>x.source==='manual').length);
 const rows=important.filter(x=>(logSourceFilter==='all'||x.source===logSourceFilter)&&(logTypeFilter==='all'||x.release_type===logTypeFilter));
 if(!rows.length){host.innerHTML='<div class="logEmpty">Aucune entrée ne correspond à ces filtres.</div>';return}
 const desktop=isDesktopJournal();
 host.innerHTML=rows.map(x=>{
  const auto=x.source==='auto',author=auto?'AUTO':(x.actor_name||'Administrateur'),letter=auto?'A':String(author||'M').trim().charAt(0).toUpperCase(),version=logVersionLabel(x);
  const download=desktop?'<button class="logDownloadBtn" type="button" onclick="downloadPortalLog('+Number(x.id)+')" title="Télécharger cette entrée au format TXT">↓ TXT</button>':'';
  return '<article class="logEntry '+(auto?'auto':'manual')+'"><div class="logRail"><span class="logAvatar">'+esc(letter)+'</span></div><div class="logCard"><div class="logTop"><span class="logType '+esc(x.release_type)+'">'+(x.release_type==='maj'?'MAJ':'PATCH')+'</span><span class="logSource '+esc(x.source)+'">'+(auto?'AUTO':'MANUEL')+'</span>'+(x.area?'<span class="logArea">'+esc(x.area)+'</span>':'')+(version?'<span class="logVersion">'+esc(version)+'</span>':'')+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.description)+'</p>'+renderLogDetails(x)+'<div class="logMeta"><span>'+logDate(x.created_at)+'</span><span class="logMetaActions"><span class="logAuthor">'+esc(author)+'</span>'+download+'</span></div></div></article>'
 }).join('')
}
async function loadPortalLogs(){
 const host=$('portalLogs');if(!host)return;
 host.innerHTML='<div class="logEmpty">Synchronisation du journal…</div>';
 try{
  const syncRes=await db.rpc('sync_nethor_release_manifest');
  if(syncRes?.error)console.warn('Synchronisation version publiée:',syncRes.error);
  const {data,error}=await db.from('portal_change_logs').select('id,source,release_type,title,description,area,actor_name,created_at,details').order('created_at',{ascending:false}).limit(250);
  if(error)throw error;portalLogs=data||[];renderPortalLogs()
 }catch(e){console.error('Logs portail:',e);host.innerHTML='<div class="logEmpty">Impossible de charger le journal des modifications.</div>'}
}
function setLogSource(value,btn){logSourceFilter=value;document.querySelectorAll('[data-log-source]').forEach(x=>x.classList.toggle('active',x===btn));renderPortalLogs()}
function setLogType(value,btn){logTypeFilter=value;document.querySelectorAll('[data-log-type]').forEach(x=>x.classList.toggle('active',x===btn));renderPortalLogs()}
async function writeManualLog(type,title,description,area,details={}){
 try{
  await db.from('portal_change_logs').insert({source:'manual',release_type:type,title,description,area,actor_id:session.user.id,actor_name:profile?.display_name||'Administrateur',details})
 }catch(e){console.warn('Écriture log manuel:',e)}
}

function problemStatusLabel(status){return status==='resolved'?'Résolu':status==='in_progress'?'En cours':'Nouveau'}
function problemLegacyDeviceLabel(ua){
 const s=String(ua||'');
 if(/iPhone|iPod/i.test(s))return'iPhone';
 if(/iPad/i.test(s))return'iPad';
 if(/Android/i.test(s))return'Android';
 if(/Windows/i.test(s))return'Windows';
 if(/Macintosh|Mac OS X/i.test(s))return'Mac';
 return'Appareil'
}
function problemDiag(row){const d=row?.diagnostics;return d&&typeof d==='object'&&!Array.isArray(d)?d:{}}
function problemTextValue(v,fallback='Non disponible'){return v===null||v===undefined||v===''?fallback:String(v)}
function problemBool(v){return v===true?'Oui':v===false?'Non':'Non disponible'}
function problemDeviceSummary(row){
 const d=problemDiag(row),device=d.device||{},browser=d.browser||{};
 const kind=device.kind||problemLegacyDeviceLabel(row?.user_agent),model=device.model?(' · '+device.model):'',os=device.os?(' · '+device.os):'',b=browser.name?(' · '+browser.name+(browser.version?' '+browser.version:'')):'';
 return kind+model+os+b
}
function problemDiagItem(label,value,wide=false){
 return '<div class="problemDiagItem '+(wide?'problemDiagWide':'')+'"><span>'+esc(label)+'</span><b>'+esc(problemTextValue(value))+'</b></div>'
}
function problemDiagnosticHtml(row){
 const d=problemDiag(row),app=d.app||{},device=d.device||{},browser=d.browser||{},display=d.display||{},network=d.network||{},locale=d.locale||{},interaction=d.interaction||{},source=d.source||{};
 const screenSize=display.screen_width&&display.screen_height?display.screen_width+' × '+display.screen_height+' px':'Non disponible';
 const viewport=display.viewport_width&&display.viewport_height?display.viewport_width+' × '+display.viewport_height+' px':'Non disponible';
 const visual=display.visual_viewport_width&&display.visual_viewport_height?display.visual_viewport_width+' × '+display.visual_viewport_height+' px'+(display.visual_viewport_scale?' · zoom '+display.visual_viewport_scale:''):'Non disponible';
 const orientation=[display.orientation_type,display.orientation_angle!==null&&display.orientation_angle!==undefined?display.orientation_angle+'°':''].filter(Boolean).join(' · ');
 const net=[network.effective_type,network.downlink_mbps!==null&&network.downlink_mbps!==undefined?network.downlink_mbps+' Mb/s':'',network.rtt_ms!==null&&network.rtt_ms!==undefined?network.rtt_ms+' ms':''].filter(Boolean).join(' · ');
 const sw=app.service_worker_controlled?'Actif'+(app.service_worker_state?' · '+app.service_worker_state:''):'Non contrôlé';
 const caches=Array.isArray(app.cache_names)&&app.cache_names.length?app.cache_names.join(', '):'Non disponible';
 const ua=browser.user_agent||row.user_agent||'',origin=source.report_origin_path||null;
 return '<details class="problemDiagnostic"><summary>Diagnostic technique détaillé</summary><div class="problemDiagGrid">'+
  problemDiagItem('Page concernée',source.path||row.source_path)+
  (origin&&origin!==(source.path||row.source_path)?problemDiagItem('Formulaire ouvert depuis',origin):'')+
  problemDiagItem('Référent',source.referrer)+
  problemDiagItem('Version Nethor',row.app_version||app.label||(app.version!=null?'v'+app.version:null))+
  problemDiagItem('Mode d’utilisation',app.display_mode)+
  problemDiagItem('Type d’appareil',device.kind||problemLegacyDeviceLabel(row.user_agent))+
  problemDiagItem('Modèle exact',device.model||'Non exposé par le navigateur')+
  problemDiagItem('Système',device.os)+
  problemDiagItem('Plateforme',device.platform)+
  problemDiagItem('Navigateur',browser.name?browser.name+(browser.version?' '+browser.version:''):null)+
  problemDiagItem('Architecture',[device.architecture,device.bitness].filter(Boolean).join(' · '))+
  problemDiagItem('Écran',screenSize)+
  problemDiagItem('Viewport',viewport)+
  problemDiagItem('Viewport visuel',visual)+
  problemDiagItem('Orientation',orientation)+
  problemDiagItem('Densité pixels',display.pixel_ratio)+
  problemDiagItem('Points tactiles',device.max_touch_points)+
  problemDiagItem('Mémoire appareil',device.device_memory_gb!=null?device.device_memory_gb+' Go':null)+
  problemDiagItem('Processeurs logiques',device.logical_processors)+
  problemDiagItem('Connexion',net||null)+
  problemDiagItem('En ligne',problemBool(network.online))+
  problemDiagItem('Économie de données',problemBool(network.save_data))+
  problemDiagItem('Langue',locale.language)+
  problemDiagItem('Fuseau horaire',locale.timezone)+
  problemDiagItem('Service Worker',sw)+
  problemDiagItem('Cache Nethor',caches,true)+
  problemDiagItem('Interface tactile',problemBool(interaction.pointer_coarse))+
  problemDiagItem('Mode sombre système',problemBool(interaction.color_scheme_dark))+
  problemDiagItem('User-Agent',ua,true)+
  '</div></details>'
}
function problemSourceKey(row){
 return String(row?.source_path||row?.source_title||'general').split('?')[0]||'general'
}
function problemSourceLabel(row){
 return String(row?.source_title||row?.source_path||'Nethor')
}
function renderProblemPageFilter(){
 const select=$('problemPageFilter');if(!select)return;
 const pages=new Map();
 reportedProblems.forEach(row=>{
  const key=problemSourceKey(row),label=problemSourceLabel(row);
  if(!pages.has(key))pages.set(key,label)
 });
 const current=problemPageFilter;
 select.innerHTML='<option value="all">Toutes les pages</option>'+[...pages.entries()].sort((a,b)=>a[1].localeCompare(b[1],'fr')).map(([key,label])=>'<option value="'+attr(key)+'">'+esc(label)+'</option>').join('');
 select.value=pages.has(current)?current:'all';
 if(select.value!==current)problemPageFilter='all'
}
function renderReportedProblems(){
 const host=$('reportedProblems');if(!host)return;
 renderProblemPageFilter();
 $('problemTotalCount').textContent=String(reportedProblems.length);
 $('problemNewCount').textContent=String(reportedProblems.filter(x=>x.status==='new').length);
 $('problemProgressCount').textContent=String(reportedProblems.filter(x=>x.status==='in_progress').length);
 $('problemResolvedCount').textContent=String(reportedProblems.filter(x=>x.status==='resolved').length);
 const openCount=reportedProblems.filter(x=>x.status!=='resolved').length,badge=$('problemReportBadge');
 if(badge){badge.textContent=String(openCount);badge.classList.toggle('hidden',openCount<1)}
 const q=problemSearchFilter.trim().toLocaleLowerCase('fr');
 const rows=reportedProblems.filter(x=>{
  if(problemStatusFilter!=='all'&&x.status!==problemStatusFilter)return false;
  if(problemPageFilter!=='all'&&problemSourceKey(x)!==problemPageFilter)return false;
  if(!q)return true;
  const d=problemDiag(x);
  return [x.reporter_name,x.reporter_role,x.description,x.source_title,x.source_path,x.app_version,problemDeviceSummary(x),d?.device?.model,d?.device?.os,d?.browser?.name].some(v=>String(v||'').toLocaleLowerCase('fr').includes(q))
 });
 if(!rows.length){host.innerHTML='<div class="problemEmpty">Aucun problème ne correspond à ce filtre.</div>';return}
 host.innerHTML=rows.map(x=>{
  const status=x.status||'new',source=x.source_title||x.source_path||'Nethor',role=roleName(x.reporter_role),device=problemDeviceSummary(x),d=problemDiag(x),mode=d?.app?.display_mode||'Mode non disponible';
  const resolved=x.resolved_at?'<span class="problemResolvedInfo">Résolu le '+esc(logDate(x.resolved_at))+'</span>':'';
  return '<article class="problemCard"><div class="problemHead"><div class="problemIdentity"><strong>'+esc(x.reporter_name||'Utilisateur')+'</strong><small>'+esc(role)+' · '+esc(logDate(x.created_at))+' · #'+Number(x.id)+'</small></div><select class="problemStatusSelect" aria-label="État du signalement" onchange="updateReportedProblemStatus('+Number(x.id)+',this.value,this)"><option value="new" '+(status==='new'?'selected':'')+'>Nouveau</option><option value="in_progress" '+(status==='in_progress'?'selected':'')+'>En cours</option><option value="resolved" '+(status==='resolved'?'selected':'')+'>Résolu</option></select></div><div class="problemDescription">'+esc(x.description||'')+'</div><div class="problemMeta"><span><i class="problemStatusDot '+esc(status)+'"></i>'+esc(problemStatusLabel(status))+'</span><span>Page : '+esc(source)+'</span><span>'+esc(x.app_version||d?.app?.label||'Version inconnue')+'</span><span>'+esc(device)+'</span><span>'+esc(mode)+'</span></div>'+problemDiagnosticHtml(x)+'<div class="problemAdminBox"><label for="problem-note-'+Number(x.id)+'">Note administrateur</label><textarea class="problemAdminNote" id="problem-note-'+Number(x.id)+'" maxlength="2000" placeholder="Cause probable, test effectué, correctif appliqué…">'+esc(x.admin_note||'')+'</textarea><div class="problemActions"><button class="problemAction primary" type="button" onclick="saveReportedProblemNote('+Number(x.id)+',this)">Enregistrer la note</button><button class="problemAction" type="button" onclick="copyProblemDiagnostic('+Number(x.id)+',this)">Copier le diagnostic</button>'+resolved+'</div></div></article>'
 }).join('')
}
async function loadReportedProblems(){
 const host=$('reportedProblems');if(!host)return;
 host.innerHTML='<div class="problemEmpty">Chargement des signalements…</div>';
 try{
  const {data,error}=await db.from('reported_problems').select('id,reporter_id,reporter_name,reporter_role,description,source_path,source_title,user_agent,app_version,diagnostics,status,admin_note,resolved_by,created_at,updated_at,resolved_at').order('created_at',{ascending:false}).limit(250);
  if(error)throw error;reportedProblems=data||[];renderReportedProblems()
 }catch(e){console.error('Problèmes signalés:',e);host.innerHTML='<div class="problemEmpty">Impossible de charger les problèmes signalés.</div>'}
}
function setProblemFilter(value,btn){
 problemStatusFilter=['new','in_progress','resolved'].includes(value)?value:'all';
 document.querySelectorAll('[data-problem-status]').forEach(x=>x.classList.toggle('active',x===btn));
 renderReportedProblems()
}
function setProblemPageFilter(value){problemPageFilter=String(value||'all')||'all';renderReportedProblems()}
function setProblemSearch(value){problemSearchFilter=String(value||'');renderReportedProblems()}
async function updateReportedProblemStatus(id,status,input){
 if(!['new','in_progress','resolved'].includes(status))return;
 const row=reportedProblems.find(x=>Number(x.id)===Number(id));if(!row)return;
 const previous=row.status;if(input)input.disabled=true;
 try{
  const now=new Date().toISOString(),patch={status,updated_at:now,resolved_at:status==='resolved'?now:null,resolved_by:status==='resolved'?session.user.id:null};
  const {error}=await db.from('reported_problems').update(patch).eq('id',id);if(error)throw error;
  row.status=status;row.updated_at=now;row.resolved_at=patch.resolved_at;row.resolved_by=patch.resolved_by;renderReportedProblems();window.NettoSounds?.play?.('switch')
 }catch(e){console.error('Mise à jour signalement:',e);row.status=previous;renderReportedProblems();alert('Impossible de modifier l’état de ce signalement.')}
 finally{if(input)input.disabled=false}
}
async function saveReportedProblemNote(id,button){
 const row=reportedProblems.find(x=>Number(x.id)===Number(id)),field=$('problem-note-'+id);if(!row||!field)return;
 const note=String(field.value||'').trim().slice(0,2000),old=button?.textContent;if(button){button.disabled=true;button.textContent='Enregistrement…'}
 try{
  const now=new Date().toISOString(),{error}=await db.from('reported_problems').update({admin_note:note||null,updated_at:now}).eq('id',id);if(error)throw error;
  row.admin_note=note||null;row.updated_at=now;if(button)button.textContent='✓ Note enregistrée';window.NettoSounds?.play?.('success')
 }catch(e){console.error('Note signalement:',e);if(button)button.textContent='Erreur';window.NettoSounds?.play?.('error')}
 finally{if(button)setTimeout(()=>{button.disabled=false;button.textContent=old||'Enregistrer la note'},900)}
}
function problemDiagnosticText(row){
 const d=problemDiag(row),app=d.app||{},device=d.device||{},browser=d.browser||{},display=d.display||{},network=d.network||{},locale=d.locale||{},source=d.source||{};
 const line=(label,value)=>label+' : '+problemTextValue(value);
 return [
  'Signalement Nethor #'+row.id,
  line('Utilisateur',(row.reporter_name||'Utilisateur')+' ('+roleName(row.reporter_role)+')'),
  line('Date',logDate(row.created_at)),
  line('Statut',problemStatusLabel(row.status)),
  line('Page concernée',row.source_title||source.title||row.source_path),
  line('Chemin concerné',source.path||row.source_path),
  line('Formulaire ouvert depuis',source.report_origin_path&&source.report_origin_path!==(source.path||row.source_path)?source.report_origin_path:null),
  line('Version Nethor',row.app_version||app.label||(app.version!=null?'v'+app.version:null)),
  '',
  'Description :',
  row.description||'',
  '',
  line('Type appareil',device.kind||problemLegacyDeviceLabel(row.user_agent)),
  line('Modèle exact',device.model||'Non exposé par le navigateur'),
  line('Système',device.os),
  line('Plateforme',device.platform),
  line('Navigateur',browser.name?browser.name+(browser.version?' '+browser.version:''):null),
  line('Mode Web/PWA',app.display_mode),
  line('Écran',display.screen_width&&display.screen_height?display.screen_width+' x '+display.screen_height+' px':null),
  line('Viewport',display.viewport_width&&display.viewport_height?display.viewport_width+' x '+display.viewport_height+' px':null),
  line('Orientation',[display.orientation_type,display.orientation_angle!==null&&display.orientation_angle!==undefined?display.orientation_angle+'°':''].filter(Boolean).join(' · ')),
  line('Densité pixels',display.pixel_ratio),
  line('Points tactiles',device.max_touch_points),
  line('Mémoire appareil',device.device_memory_gb!=null?device.device_memory_gb+' Go':null),
  line('Processeurs logiques',device.logical_processors),
  line('Connexion',[network.effective_type,network.downlink_mbps!=null?network.downlink_mbps+' Mb/s':'',network.rtt_ms!=null?network.rtt_ms+' ms':''].filter(Boolean).join(' · ')),
  line('En ligne',problemBool(network.online)),
  line('Fuseau horaire',locale.timezone),
  line('Service Worker',app.service_worker_controlled?'Actif':'Non contrôlé'),
  line('Caches Nethor',Array.isArray(app.cache_names)&&app.cache_names.length?app.cache_names.join(', '):null),
  line('User-Agent',browser.user_agent||row.user_agent),
  '',
  'Note administrateur :',
  row.admin_note||'Aucune'
 ].join('\n')
}
async function copyProblemDiagnostic(id,button){
 const row=reportedProblems.find(x=>Number(x.id)===Number(id));if(!row)return;
 const textValue=problemDiagnosticText(row),old=button?.textContent;
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(textValue);
  else{
   const ta=document.createElement('textarea');ta.value=textValue;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()
  }
  if(button)button.textContent='✓ Diagnostic copié';window.NettoSounds?.play?.('success')
 }catch(e){console.error('Copie diagnostic:',e);if(button)button.textContent='Copie impossible'}
 finally{if(button)setTimeout(()=>button.textContent=old||'Copier le diagnostic',1000)}
}

function notificationRole(role){return roleName(role)}
function renderNotificationAdmin(){
 const usersHost=$('notificationUsers'),recipientsHost=$('notificationRecipients');
 if(!notificationUsers.length){
  if(usersHost)usersHost.innerHTML='<div class="empty">Aucun utilisateur trouvé.</div>';
  if(recipientsHost)recipientsHost.innerHTML='<div class="empty">Aucun destinataire disponible.</div>';
  return
 }
 if(usersHost)usersHost.innerHTML=notificationUsers.map(u=>'<div class="notifUser"><div class="notifUserName"><strong>'+esc(u.display_name||'Utilisateur')+'</strong><span>'+esc(notificationRole(u.role))+'</span></div><span class="deviceBadge '+(u.devices>0?'on':'')+'">'+(u.devices>0?u.devices+' appareil'+(u.devices>1?'s':'')+' Push':'Aucun appareil Push')+'</span><label class="adminSwitch" title="'+(u.enabled?'Notifications autorisées':'Notifications bloquées')+'"><input type="checkbox" '+(u.enabled?'checked':'')+' onchange="setUserNotifications(\''+attr(u.id)+'\',this.checked,this)"><span></span></label></div>').join('');
 if(recipientsHost)recipientsHost.innerHTML=notificationUsers.map(u=>'<label class="recipient"><input type="checkbox" data-notif-recipient="'+attr(u.id)+'" '+(u.enabled?'':'disabled')+'><span><strong>'+esc(u.display_name||'Utilisateur')+'</strong><small>'+esc(notificationRole(u.role))+' · '+(u.devices||0)+' appareil'+((u.devices||0)>1?'s':'')+' Push</small></span>'+(u.enabled?'':'<span class="blocked">Bloqué</span>')+'</label>').join('')
}
function notificationRuleBadge(r){
 const portal=r.portal_enabled!==false,push=r.push_allowed!==false&&r.push_enabled!==false;
 if(portal&&push)return'<span class="ruleBadge">Push + portail</span>';
 if(portal)return'<span class="ruleBadge appOnly">Portail uniquement</span>';
 if(push)return'<span class="ruleBadge pushOnly">Push uniquement</span>';
 return'<span class="ruleBadge off">Désactivée</span>'
}
function notificationRuleMode(r){
 const portal=r.portal_enabled!==false,push=r.push_allowed!==false&&r.push_enabled!==false;
 if(portal&&push)return'both';
 if(portal)return'portal';
 if(push)return'push';
 return'off'
}
function notificationModeControl(r){
 const current=notificationRuleMode(r),pushAvailable=r.push_allowed!==false;
 const options=pushAvailable?[['off','Aucun'],['portal','Portail'],['push','Push'],['both','Les deux']]:[['off','Aucun'],['portal','Portail']];
 return '<div class="notificationModeControl '+(pushAvailable?'':'two')+'" role="group" aria-label="Diffusion de '+attr(r.label)+'">'+options.map(([mode,label])=>'<button type="button" class="notificationModeOption '+(current===mode?'active':'')+'" data-mode="'+mode+'" aria-pressed="'+(current===mode?'true':'false')+'" onclick="setNotificationRuleMode(\''+attr(r.rule_key)+'\',\''+mode+'\',this)">'+label+'</button>').join('')+'</div>'
}
function renderNotificationRules(){
 const host=$('notificationRules');if(!host)return;
 if(!notificationRules.length){host.innerHTML='<div class="empty">Aucune règle disponible.</div>';return}
 host.innerHTML=notificationRules.map(r=>
  '<div class="notificationRule"><div><strong>'+esc(r.label)+notificationRuleBadge(r)+'</strong><p>'+esc(r.description||'')+'</p><small>Déclenchement : '+esc(r.trigger_text||'Non renseigné')+'</small></div>'+notificationModeControl(r)+'</div>'
 ).join('')
}
async function loadNotificationAdmin(){
 const usersHost=$('notificationUsers'),recipientsHost=$('notificationRecipients'),rulesHost=$('notificationRules');
 if(usersHost)usersHost.innerHTML='<div class="empty">Chargement des utilisateurs…</div>';
 if(recipientsHost)recipientsHost.innerHTML='<div class="empty">Chargement…</div>';
 if(rulesHost)rulesHost.innerHTML='<div class="empty">Chargement des règles…</div>';
 try{
  const [usersRes,rulesRes]=await Promise.all([db.rpc('admin_notification_users'),db.rpc('admin_notification_rules')]);
  if(usersRes.error)throw usersRes.error;if(rulesRes.error)throw rulesRes.error;
  notificationUsers=Array.isArray(usersRes.data)?usersRes.data:[];
  notificationRules=Array.isArray(rulesRes.data)?rulesRes.data:[];
  renderNotificationAdmin();renderNotificationRules()
 }catch(e){
  console.error('Chargement notifications admin:',e);
  if(usersHost)usersHost.innerHTML='<div class="empty">Impossible de charger les réglages de notifications.<br><small>'+esc(e?.message||'Erreur inconnue')+'</small></div>';
  if(recipientsHost)recipientsHost.innerHTML='<div class="empty">Impossible de charger les destinataires.</div>';
  if(rulesHost)rulesHost.innerHTML='<div class="empty">Impossible de charger les règles globales.</div>'
 }
}
async function setNotificationRuleMode(ruleKey,mode,button){
 const row=notificationRules.find(x=>x.rule_key===ruleKey);if(!row)return;
 const pushAllowed=row.push_allowed!==false;
 const portal=mode==='portal'||mode==='both';
 const push=pushAllowed&&(mode==='push'||mode==='both');
 if(!pushAllowed&&(mode==='push'||mode==='both'))return;
 const group=button?.closest('.notificationModeControl');
 group?.querySelectorAll('button').forEach(x=>x.disabled=true);
 try{
  const {data,error}=await db.rpc('admin_set_notification_channels',{p_rule_key:ruleKey,p_portal_enabled:portal,p_push_enabled:push});
  if(error||data!==true)throw error||new Error('Mise à jour refusée');
  row.portal_enabled=portal;row.push_enabled=push;row.enabled=portal||push;
  renderNotificationRules();window.NettoSounds?.play?.('switch')
 }catch(e){
  console.error(e);renderNotificationRules();
  alert('Impossible de modifier la diffusion de cette notification.')
 }
}
async function setNotificationRule(ruleKey,enabled,input){
 input.disabled=true;
 try{
  const {data,error}=await db.rpc('admin_set_notification_rule',{p_rule_key:ruleKey,p_enabled:enabled});
  if(error||data!==true)throw error||new Error('Mise à jour refusée');
  const row=notificationRules.find(x=>x.rule_key===ruleKey);if(row)row.enabled=enabled;
  renderNotificationRules();window.NettoSounds?.play?.('switch')
 }catch(e){console.error(e);input.checked=!enabled;alert('Impossible de modifier cette règle de notification.')}
 finally{input.disabled=false}
}
async function setUserNotifications(userId,enabled,input){
 input.disabled=true;
 try{
  const {data,error}=await db.rpc('admin_set_notification_control',{target_user:userId,new_enabled:enabled});
  if(error||data!==true)throw error||new Error('Mise à jour refusée');
  const u=notificationUsers.find(x=>x.id===userId);if(u)u.enabled=enabled;
  renderNotificationAdmin();window.NettoSounds?.play?.('switch');if($('tab-logs')?.classList.contains('active'))await loadPortalLogs()
 }catch(e){console.error(e);input.checked=!enabled;alert('Impossible de modifier les notifications de cet utilisateur.')}
 finally{input.disabled=false}
}
function selectRecipients(mode){
 document.querySelectorAll('[data-notif-recipient]').forEach(x=>{if(x.disabled)return;x.checked=mode==='all'||(mode==='me'&&x.dataset.notifRecipient===session?.user?.id)});
}
function applyNotificationPreset(){
 const kind=$('notificationKind')?.value||'admin_message';
 const presets={
  manual_edit:{title:'Planning modifié',target:'planning.html',hint:'Utilise le type “Planning modifié”. Il suit les préférences “Modifications planning” et peut être envoyé en Push.'},
  app_update:{title:'Nouvelle version de Nethor',target:'home.html',hint:'Annonce de mise à jour dans le portail uniquement. Conformément au réglage Nethor, aucune notification Push système n’est envoyée pour une mise à jour.'},
  admin_message:{title:'Information Nethor',target:'home.html',hint:'Message d’information Nethor envoyé manuellement. Les préférences utilisateur et les règles globales sont respectées.'},
  maintenance:{title:'Maintenance Nethor',target:'maintenance.html',hint:'Annonce liée à une maintenance. Elle respecte la règle globale Maintenance et les préférences de chaque utilisateur.'}
 };
 const p=presets[kind]||presets.admin_message;
 if($('notificationTitle'))$('notificationTitle').value=p.title;
 if($('notificationTarget'))$('notificationTarget').value=p.target;
 if($('notificationPresetHint'))$('notificationPresetHint').textContent=p.hint;
 previewAdminNotification()
}
function previewAdminNotification(){
 const title=$('notificationTitle')?.value.trim()||'Notification',message=$('notificationMessage')?.value.trim()||'Ton message apparaîtra ici.';
 if($('notificationPreviewTitle'))$('notificationPreviewTitle').textContent=title;
 if($('notificationPreviewMessage'))$('notificationPreviewMessage').textContent=message
}
async function sendAdminNotification(){
 const ids=[...document.querySelectorAll('[data-notif-recipient]:checked')].map(x=>x.dataset.notifRecipient),kind=$('notificationKind')?.value||'admin_message',title=$('notificationTitle').value.trim(),message=$('notificationMessage').value.trim(),target=$('notificationTarget').value.trim()||'home.html',btn=$('sendNotificationBtn'),state=$('notificationSendResult');
 state.className='sendResult';state.textContent='';
 if(!ids.length){state.className='sendResult err';state.textContent='Sélectionne au moins un destinataire.';return}
 if(!title||!message){state.className='sendResult err';state.textContent='Renseigne un titre et un message.';return}
 btn.disabled=true;state.textContent='Envoi en cours…';
 try{
  const {data,error}=await db.functions.invoke('planning-push',{body:{action:'admin-message',user_ids:ids,kind,title,message,target_url:target}});
  if(error||!data?.ok)throw error||new Error(data?.error||'Envoi impossible');
  const internal=Number(data?.internal||0),blocked=Number(data?.blocked||0),sent=Number(data?.push?.sent||0),failed=Number(data?.push?.failed||0),removed=Number(data?.push?.removed||0);
  state.className='sendResult ok';
  state.textContent='✓ '+internal+' notification'+(internal>1?'s':'')+' créée'+(internal>1?'s':'')+' dans le portail'+(kind==='app_update'?' · Push désactivé pour les mises à jour':' · '+sent+' Push envoyé'+(sent>1?'s':''))+(blocked?' · '+blocked+' compte'+(blocked>1?'s':'')+' exclu'+(blocked>1?'s':''):'')+(failed?' · '+failed+' échec'+(failed>1?'s':''):'')+(removed?' · '+removed+' appareil'+(removed>1?'s':'')+' expiré'+(removed>1?'s':'')+' retiré'+(removed>1?'s':''):'');
  window.NettoSounds?.play?.('success');await loadNotificationAdmin()
 }catch(e){
  console.error('Envoi notification admin:',e);
  state.className='sendResult err';
  state.textContent='Erreur pendant l’envoi : '+(e?.context?.body?.error||e?.message||'erreur inconnue');
  window.NettoSounds?.play?.('error')
 }
 finally{btn.disabled=false}
}


function normalizeManagementEan13(value){
 const digits=String(value||'').replace(/\D/g,'');
 if(!digits)return'';
 return digits.length<=13?digits.padStart(13,'0'):digits
}
function managementCategoryOptions(familyId,selectedId){
 const rows=managementCategories.filter(x=>String(x.family_id)===String(familyId||''));
 return '<option value="">Non répertorié</option>'+rows.map(x=>'<option value="'+attr(x.id)+'" '+(String(x.id)===String(selectedId||'')?'selected':'')+'>'+esc(x.name)+'</option>').join('')
}
async function loadManagementArticles(){
 const body=$('managementArticlesRows');if(body)body.innerHTML='<tr><td colspan="6" class="articleAdminEmpty">Chargement des fiches articles…</td></tr>';
 try{
  const [productsRes,familiesRes,categoriesRes]=await Promise.all([
   db.from('products').select('id,name,family_id,category_id,ean,on_sale,active').eq('active',true).order('name'),
   db.from('product_families').select('id,name,position').order('position').order('name'),
   db.from('product_categories').select('id,family_id,name,position').order('position').order('name')
  ]);
  if(productsRes.error)throw productsRes.error;if(familiesRes.error)throw familiesRes.error;if(categoriesRes.error)throw categoriesRes.error;
  managementArticles=productsRes.data||[];managementFamilies=familiesRes.data||[];managementCategories=categoriesRes.data||[];
  renderManagementArticles()
 }catch(e){
  console.error('Gestion fiches articles:',e);
  if(body)body.innerHTML='<tr><td colspan="6" class="articleAdminEmpty">Impossible de charger les fiches articles.</td></tr>'
 }
}
function syncManagementArticleDrafts(){
 document.querySelectorAll('#managementArticlesRows tr[data-article-id]').forEach(tr=>{
  const id=tr.dataset.articleId,row=managementArticles.find(x=>x.id===id);if(!row)return;
  const familyRaw=$('ma-family-'+id)?.value||'',categoryRaw=$('ma-category-'+id)?.value||'';
  row.name=String($('ma-name-'+id)?.value??row.name??'');
  row.family_id=familyRaw?Number(familyRaw):null;
  row.category_id=categoryRaw?Number(categoryRaw):null;
  row.ean=String($('ma-ean-'+id)?.value??row.ean??'').replace(/\D/g,'');
  row.on_sale=$('ma-status-'+id)?.value==='true'
 })
}
function compareManagementText(a,b){return String(a||'').localeCompare(String(b||''),'fr',{sensitivity:'base',numeric:true})}
function compareManagementEan(a,b){
 const av=String(a||'').replace(/\D/g,''),bv=String(b||'').replace(/\D/g,'');
 if(!av&&!bv)return 0;if(!av)return 1;if(!bv)return-1;
 if(av.length!==bv.length)return av.length-bv.length;
 return av.localeCompare(bv)
}
function sortManagementArticleRows(rows,familyName,categoryName){
 const key=managementArticleSort.key;if(!key)return rows;
 const dir=managementArticleSort.direction==='desc'?-1:1;
 return rows.map((row,index)=>({row,index})).sort((a,b)=>{
  const x=a.row,y=b.row;let cmp=0;
  if(key==='name')cmp=compareManagementText(x.name,y.name);
  else if(key==='family'){
   cmp=compareManagementText(familyName(x.family_id)||'Non répertorié',familyName(y.family_id)||'Non répertorié');
   if(!cmp)cmp=compareManagementText(categoryName(x.category_id)||'Non répertorié',categoryName(y.category_id)||'Non répertorié')
  }else if(key==='category'){
   cmp=compareManagementText(categoryName(x.category_id)||'Non répertorié',categoryName(y.category_id)||'Non répertorié');
   if(!cmp)cmp=compareManagementText(familyName(x.family_id)||'Non répertorié',familyName(y.family_id)||'Non répertorié')
  }else if(key==='ean'){
   const xe=String(x.ean||'').replace(/\D/g,''),ye=String(y.ean||'').replace(/\D/g,'');
   if(!xe||!ye){
    if(!xe&&!ye)cmp=0;
    else return !xe?1:-1
   }else cmp=compareManagementEan(xe,ye)
  }else if(key==='status')cmp=Number(x.on_sale!==false)-Number(y.on_sale!==false);
  if(!cmp)cmp=compareManagementText(x.name,y.name);
  return cmp*dir||a.index-b.index
 }).map(x=>x.row)
}
function updateManagementArticleSortHeaders(){
 document.querySelectorAll('.articleSortButton').forEach(btn=>{
  const active=btn.dataset.articleSort===managementArticleSort.key;
  btn.classList.toggle('active',active);
  const arrow=btn.querySelector('.articleSortArrow');
  if(arrow)arrow.textContent=active?(managementArticleSort.direction==='asc'?'↑':'↓'):'↓';
  btn.setAttribute('aria-pressed',active?'true':'false');
  btn.title=active?(managementArticleSort.direction==='asc'?'Ordre actuel — cliquer pour inverser':'Ordre inversé — cliquer pour inverser'):'Cliquer pour trier'
 })
}
function setManagementArticleSort(key){
 syncManagementArticleDrafts();
 if(managementArticleSort.key===key)managementArticleSort.direction=managementArticleSort.direction==='asc'?'desc':'asc';
 else managementArticleSort={key,direction:'asc'};
 renderManagementArticles()
}
function renderManagementArticles(){
 const body=$('managementArticlesRows');if(!body)return;
 const q=String($('managementArticleSearch')?.value||'').trim().toLocaleLowerCase('fr');
 const familyName=id=>managementFamilies.find(x=>String(x.id)===String(id))?.name||'';
 const categoryName=id=>managementCategories.find(x=>String(x.id)===String(id))?.name||'';
 let rows=managementArticles.filter(p=>!q||[p.name,p.ean,familyName(p.family_id),categoryName(p.category_id)].some(v=>String(v||'').toLocaleLowerCase('fr').includes(q)));
 rows=sortManagementArticleRows(rows,familyName,categoryName);
 $('managementArticleCount').textContent=rows.length;
 if(!rows.length){body.innerHTML='<tr><td colspan="6" class="articleAdminEmpty">Aucune fiche article ne correspond à cette recherche.</td></tr>';updateManagementArticleSortHeaders();return}
 body.innerHTML=rows.map(p=>{
  const ean=String(p.ean||''),eanValid=!ean||/^\d{13}$/.test(ean);
  return '<tr data-article-id="'+attr(p.id)+'">'+
   '<td><input class="articleName" id="ma-name-'+attr(p.id)+'" value="'+attr(p.name||'')+'" aria-label="Nom"></td>'+
   '<td><select id="ma-family-'+attr(p.id)+'" onchange="managementArticleFamilyChanged(\''+attr(p.id)+'\')"><option value="">Non répertorié</option>'+managementFamilies.map(f=>'<option value="'+attr(f.id)+'" '+(String(f.id)===String(p.family_id||'')?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></td>'+
   '<td><select id="ma-category-'+attr(p.id)+'">'+managementCategoryOptions(p.family_id,p.category_id)+'</select></td>'+
   '<td><input class="articleEan '+(eanValid?'':'invalid')+'" id="ma-ean-'+attr(p.id)+'" inputmode="numeric" maxlength="14" value="'+attr(ean)+'" aria-label="EAN13">'+(!eanValid?'<small class="articleAdminIssue">Valeur actuelle non EAN13</small>':'')+'</td>'+
   '<td><select id="ma-status-'+attr(p.id)+'"><option value="true" '+(p.on_sale!==false?'selected':'')+'>Actif</option><option value="false" '+(p.on_sale===false?'selected':'')+'>Inactif</option></select></td>'+
   '<td><button class="articleAdminSave" id="ma-save-'+attr(p.id)+'" type="button" onclick="saveManagementArticle(\''+attr(p.id)+'\')">Enregistrer</button></td>'+
  '</tr>'
 }).join('');
 updateManagementArticleSortHeaders()
}
function managementArticleFamilyChanged(id){
 const family=$('ma-family-'+id)?.value||'',category=$('ma-category-'+id);if(category)category.innerHTML=managementCategoryOptions(family,'')
}
async function saveManagementArticle(id){
 const row=managementArticles.find(x=>x.id===id);if(!row)return;
 const btn=$('ma-save-'+id),name=String($('ma-name-'+id)?.value||'').trim(),familyRaw=$('ma-family-'+id)?.value||'',categoryRaw=$('ma-category-'+id)?.value||'',eanRaw=String($('ma-ean-'+id)?.value||'').replace(/\D/g,''),onSale=$('ma-status-'+id)?.value==='true';
 if(!name){alert('Le nom de la fiche article est obligatoire.');return}
 if(eanRaw.length>13){alert('L’EAN13 doit contenir exactement 13 chiffres maximum avant normalisation. Cette valeur à 14 chiffres doit être corrigée manuellement.');return}
 const ean=eanRaw?eanRaw.padStart(13,'0'):null;
 btn.disabled=true;btn.textContent='Enregistrement…';
 try{
  const payload={name,family_id:familyRaw?Number(familyRaw):null,category_id:categoryRaw?Number(categoryRaw):null,ean,on_sale:onSale};
  const {error}=await db.from('products').update(payload).eq('id',id);
  if(error){if(error.code==='23505')throw new Error('Cet EAN13 est déjà utilisé par une autre fiche.');throw error}
  Object.assign(row,payload);
  const input=$('ma-ean-'+id);if(input){input.value=ean||'';input.classList.remove('invalid')}
  row.ean=ean;btn.textContent='✓ Enregistré';window.NettoSounds?.play?.('success');
  setTimeout(()=>{if(btn){btn.textContent='Enregistrer';btn.disabled=false}},900)
 }catch(e){
  console.error('Enregistrement fiche article:',e);btn.disabled=false;btn.textContent='Enregistrer';window.NettoSounds?.play?.('error');alert('Enregistrement impossible : '+(e?.message||'erreur inconnue'))
 }
}

async function boot(){
 const {data:{session:s}}=await db.auth.getSession();session=s;if(!s)return location.replace('index.html');
 const {data:p,error}=await db.from('profiles').select('display_name,role').eq('id',s.user.id).maybeSingle();if(error||!p||p.role!=='admin')return location.replace('home.html');profile=p;window.NethorPortalHealthClient=db;
 await waitProfileUI();await ensureAdminGlobalTools();ROLES=[...(window.NettoProfileUI?.allRoles||ROLES)];ensurePortalPlatformStructure();bindGlobal();await loadConfig();await ensureAdminGlobalTools();ROLES=[...(window.NettoProfileUI?.allRoles||ROLES)];applyNotificationPreset();enhanceCompactPortal();
 const qs=new URLSearchParams(location.search),saved=qs.get('tab')||localStorage.getItem('nettoManagementTab')||'overview';
 const validTabs=['overview','general','system','mobile','desktop','sounds','blocks','accounts','articles','media','notifications','problems','maintenance','logs'];
 const tab=validTabs.includes(saved)?saved:'overview';
 const requestedAccountView=qs.get('sub')||localStorage.getItem('nettoManagementAccountsView')||'accounts';
 accountSubview=['accounts','roles','logs'].includes(requestedAccountView)?requestedAccountView:'accounts';
 if(tab==='accounts')showAccountsView(accountSubview,managementButtonFor('accounts'),{sound:false});
 else showTab(tab,managementButtonFor(tab),{sound:false});
 window.dispatchEvent(new Event('nethor:admin-ready'))
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
setTimeout(boot,0);

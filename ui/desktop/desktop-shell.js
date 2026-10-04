(function(){
'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function navButton(icon,title,sub,url,cls=''){
 return '<button class="nettoNavBtn '+cls+'" data-url="'+esc(url||'')+'"><span>'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(sub||'')+'</small></span></button>'
}
function buildUserMenu(ctx){
 const {name='Utilisateur',role='',shortcuts='',settingsUrl='settings.html',settingsModule=null,settingsIcon='⚙',controls={}}=ctx||{};
 const control=(key,defaults)=>{const x=controls?.[key]&&typeof controls[key]==='object'?controls[key]:{};return{...defaults,...x,label:String(x.label||defaults.label),subtitle:String(x.subtitle||defaults.subtitle),url:String(x.url||'')}};
 const icon=(node,fallback)=>node.url?'<img src="'+esc(node.url)+'" alt="" style="display:block;width:22px;height:22px;object-fit:contain">':fallback;
 const theme=control('theme',{label:'Mode sombre',subtitle:'Changer l’apparence'}),logout=control('logout',{label:'Déconnexion',subtitle:'Quitter la session'});
 const themeCustom=!!String(controls?.theme?.label||'').trim();
 return '<div class="nettoUserDesktopMenu">'+
  '<div class="nettoUserHead"><span id="nettoMenuAvatar" class="nettoTopAvatar">U</span><span><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span></div>'+
  navButton(settingsIcon,settingsModule?.label||'Personnalisation',settingsModule?.subtitle||'Mon accueil et mes raccourcis',settingsModule?.url||settingsUrl)+
  (shortcuts?'<div class="nettoMenuSection">Raccourcis</div>'+shortcuts:'')+
  '<button id="nettoThemeBtn" class="nettoNavBtn"><span class="nettoThemeIcon" '+(theme.url?'data-static-theme-icon="1"':'')+'>'+icon(theme,'☾')+'</span><span><strong class="nettoThemeLabel" '+(themeCustom?'data-static-theme-label="1"':'')+'>'+esc(theme.label)+'</strong><small>'+esc(theme.subtitle)+'</small></span></button>'+
  '<button id="nettoLogoutBtn" class="nettoNavBtn nettoLogout"><span>'+icon(logout,'↪')+'</span><span><strong>'+esc(logout.label)+'</strong><small>'+esc(logout.subtitle)+'</small></span></button>'+
 '</div>'
}
const DESKTOP_SIDEBAR_DEFAULTS={
 home:{label:'Accueil',url:'home.html',icon:'home',enabled:true},
 activity:{label:'Activité magasin',url:'home.html#nethorDesktopStatsRow',icon:'activity',enabled:true},
 planning:{label:'Planning',url:'planning.html',icon:'planning',enabled:true},
 team:{label:'Équipe',url:'home.html#nethorDesktopTeamWidget',icon:'team',enabled:true},
 tasks:{label:'Tâches',url:'home.html#nethorDesktopPriorities',icon:'tasks',enabled:true},
 receptions:{label:'Réceptions',url:'home.html#nethorDesktopDeliveriesKpi',icon:'receptions',enabled:true},
 articles:{label:'Fiches articles',url:'articles.html',icon:'articles',enabled:true},
 chat:{label:'Chat',url:'chat.html',icon:'chat',enabled:true},
 incidents:{label:'Incidents',url:'report-problem.html',icon:'incidents',enabled:true},
 reports:{label:'Rapports',url:'admin-portal.html?tab=logs',icon:'reports',enabled:true},
 settings:{label:'Paramètres',url:'settings.html',icon:'settings',enabled:true}
};
function desktopDashboardConfig(site={}){
 const raw=site?.desktop_dashboard_widget&&typeof site.desktop_dashboard_widget==='object'?site.desktop_dashboard_widget:{};
 const header=raw.header&&typeof raw.header==='object'?raw.header:{};
 const sidebar=raw.sidebar&&typeof raw.sidebar==='object'?raw.sidebar:{},items=sidebar.items&&typeof sidebar.items==='object'?sidebar.items:{};
 const normalized={};
 Object.entries(DESKTOP_SIDEBAR_DEFAULTS).forEach(([key,def])=>normalized[key]={...def,...(items[key]&&typeof items[key]==='object'?items[key]:{})});
 return{
  enabled:raw.enabled!==false,
  header:{
   store_name:String(header.store_name||site?.store_info_widget?.store_name||'Netto Le Thor'),
   store_subtitle:String(header.store_subtitle||'Point de vente'),
   store_url:String(header.store_url||'home.html'),
   show_store:header.show_store!==false,
   show_datetime:header.show_datetime!==false,
   show_notifications:header.show_notifications!==false,
   show_user:header.show_user!==false,
   show_update:header.show_update!==false,
   show_mobile_preview:header.show_mobile_preview!==false,
   show_admin_logs:header.show_admin_logs!==false,
   show_store_image:header.show_store_image!==false
  },
  sidebar:{enabled:sidebar.enabled!==false,width:Math.max(180,Math.min(280,Number(sidebar.width)||210)),items:normalized},
  style:{accent:String(raw?.style?.accent||'#ff5a2a')}
 }
}
function desktopSidebarIcon(kind){
 const common='viewBox="0 0 24 24" aria-hidden="true"';
 const icons={
  home:'<svg '+common+'><path d="M3.5 10.7 12 3.5l8.5 7.2"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-6h5v6"/></svg>',
  activity:'<svg '+common+'><path d="M4 20V10M8 20V5M12 20v-8M16 20V8M20 20V3"/><path d="M2.5 20.5h19"/></svg>',
  planning:'<svg '+common+'><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"/><path d="M8 13h3M13 13h3M8 16.5h3"/></svg>',
  team:'<svg '+common+'><circle cx="9" cy="8" r="3"/><path d="M3.8 19c.4-3.3 2.1-5 5.2-5s4.8 1.7 5.2 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.2 14.2c3.2-.5 5 1.1 5.3 4.1"/></svg>',
  tasks:'<svg '+common+'><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="m8 12 2.2 2.2L16.5 8"/><path d="M8 7h.01M8 17h8"/></svg>',
  receptions:'<svg '+common+'><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  articles:'<svg '+common+'><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.3 7.7 7.7 4.2 7.7-4.2M12 12v9"/></svg>',
  chat:'<svg '+common+'><path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.8 3.2v-3.2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><path d="M7.5 9h9M7.5 12.5h6"/></svg>',
  incidents:'<svg '+common+'><path d="M12 3 21 20H3L12 3Z"/><path d="M12 9v5M12 17.2v.2"/></svg>',
  reports:'<svg '+common+'><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 15l2.4-3 2.5 1.8L16.5 9"/><path d="M8 18h8"/></svg>',
  settings:'<svg '+common+'><circle cx="12" cy="12" r="3"/><path d="M19 13.8a7.6 7.6 0 0 0 0-3.6l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-3.1-1.8L13.2 2H9.3L9 4.5a8.2 8.2 0 0 0-3.1 1.8l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.6l-2 1.5 2 3.4 2.4-1A8.2 8.2 0 0 0 9 19.5l.3 2.5h3.9l.3-2.5a8.2 8.2 0 0 0 3.1-1.8l2.4 1 2-3.4-2-1.5Z"/></svg>'
 };
 return icons[kind]||icons.home
}
function ensureDesktopSidebarStyle(){
 if(document.getElementById('nethorDesktopSidebarCss'))return;
 const link=document.createElement('link');
 link.id='nethorDesktopSidebarCss';
 link.rel='stylesheet';
 link.href='ui/desktop/desktop-sidebar.css?v=5';
 document.head.appendChild(link)
}
function desktopSidebarItem(key,def,active){
 return '<button class="nethorSidebarItem'+(active?' active':'')+'" data-sidebar-key="'+esc(key)+'" type="button" data-sidebar-url="'+esc(def.url)+'" onclick="window.location.href=this.dataset.sidebarUrl"'+(active?' aria-current="page"':'')+'><span class="nethorSidebarIcon">'+desktopSidebarIcon(def.icon)+'</span><span class="nethorSidebarLabel">'+esc(def.label)+'</span><span class="nethorSidebarBadge hidden" aria-hidden="true"></span></button>'
}
function sidebarActiveKey(page){
 const id=String(page||'').toLowerCase();
 if(['home'].includes(id))return'home';
 if(id==='planning')return'planning';
 if(id==='chat')return'chat';
 if(id==='articles')return'articles';
 if(id==='report-problem')return'incidents';
 if(['settings','notification-settings'].includes(id))return'settings';
 return''
}
function buildDesktopSidebar(page){
 ensureDesktopSidebarStyle();
 const active=sidebarActiveKey(page);
 const mainKeys=['home','activity','planning','team','tasks','receptions','articles','chat','incidents','reports'];
 return '<aside class="nethorDesktopSidebar" aria-label="Navigation principale Nethor">'+
  '<button class="nethorSidebarBrand" type="button" onclick="location.href=\'home.html\'" aria-label="Accueil Nethor"><span class="nethorSidebarWordmark nethorDesktopWordmark"><span>ne</span><b>thor</b></span></button>'+
  '<nav class="nethorDesktopSidebarNav">'+mainKeys.map(key=>desktopSidebarItem(key,DESKTOP_SIDEBAR_DEFAULTS[key],active===key)).join('')+'</nav>'+
  '<div class="nethorDesktopSidebarBottom">'+desktopSidebarItem('settings',DESKTOP_SIDEBAR_DEFAULTS.settings,active==='settings')+'</div>'+
 '</aside>'
}
function desktopHeaderStore(){
 return '<button class="nethorDesktopStoreSwitch" type="button" data-desktop-store-url="home.html" onclick="location.href=this.dataset.desktopStoreUrl"><span class="nethorStoreThumb" aria-hidden="true"></span><span class="nethorStoreCopy"><strong data-nethor-store-name>Netto Le Thor</strong><small data-nethor-store-subtitle>Point de vente</small></span><span class="nethorStoreChevron">⌄</span></button>'
}
function desktopHeaderDateTime(){
 return '<div class="nethorDesktopDateTime"><span class="nethorDateIcon">'+desktopSidebarIcon('planning')+'</span><span><small data-nethor-desktop-date>—</small><strong data-nethor-desktop-time>--:--</strong></span></div>'
}
function updateDesktopClock(){
 const date=document.querySelector('[data-nethor-desktop-date]'),time=document.querySelector('[data-nethor-desktop-time]');if(!date&&!time)return;
 const now=new Date();
 try{
  if(date)date.textContent=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(now).replace(/^./,c=>c.toUpperCase());
  if(time)time.textContent=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now)
 }catch(_){if(date)date.textContent=now.toLocaleDateString('fr-FR');if(time)time.textContent=now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
}
function startDesktopClock(){clearInterval(window.__nethorDesktopHeaderClock);updateDesktopClock();window.__nethorDesktopHeaderClock=setInterval(updateDesktopClock,30000)}
function applyDesktopShellConfig(site={}){
 if(String(document.documentElement.dataset.nethorPageLayout||document.documentElement.dataset.nethorPlatform||'').toLowerCase()!=='desktop')return;
 const c=desktopDashboardConfig(site);
 document.documentElement.style.setProperty('--nethor-sidebar-w',c.sidebar.width+'px');
 document.documentElement.style.setProperty('--nethor-sidebar-accent',c.style.accent||'#ff5a2a');
 document.documentElement.dataset.nethorDesktopSidebar=c.sidebar.enabled?'1':'0';
 document.documentElement.dataset.nethorDesktopStore=c.header.show_store?'1':'0';
 document.documentElement.dataset.nethorDesktopDatetime=c.header.show_datetime?'1':'0';
 document.documentElement.dataset.nethorDesktopNotifications=c.header.show_notifications?'1':'0';
 document.documentElement.dataset.nethorDesktopUser=c.header.show_user?'1':'0';
 document.documentElement.dataset.nethorDesktopUpdate=c.header.show_update?'1':'0';
 document.documentElement.dataset.nethorDesktopMobilePreview=c.header.show_mobile_preview?'1':'0';
 document.documentElement.dataset.nethorDesktopAdminLogs=c.header.show_admin_logs?'1':'0';
 const store=document.querySelector('.nethorDesktopStoreSwitch');if(store){store.dataset.desktopStoreUrl=c.header.store_url||'home.html';const n=store.querySelector('[data-nethor-store-name]'),s=store.querySelector('[data-nethor-store-subtitle]');if(n)n.textContent=c.header.store_name;if(s)s.textContent=c.header.store_subtitle;const thumb=store.querySelector('.nethorStoreThumb'),photo=c.header.show_store_image?String(site?.store_info_widget?.photo_url||'').trim():'';if(thumb){thumb.classList.toggle('hasPhoto',!!photo);thumb.style.backgroundImage=photo?'url("'+photo.replace(/"/g,'%22')+'")':''}}
 const sidebar=document.querySelector('.nethorDesktopSidebar');
 if(sidebar){
  const brand=sidebar.querySelector('.nethorSidebarBrand'),logoNode=site?.platform_ui?.desktop?.header_logo||{},hasCustomLogo=!!String(logoNode?.url||logoNode?.light?.url||logoNode?.dark?.url||site?.brand?.header_logo_url||'').trim();
  if(brand){brand.classList.toggle('customLogo',hasCustomLogo);brand.style.backgroundImage=hasCustomLogo?'var(--nethor-header-logo)':''}
 }
 if(sidebar)Object.entries(c.sidebar.items).forEach(([key,item])=>{const el=sidebar.querySelector('[data-sidebar-key="'+CSS.escape(key)+'"]');if(!el)return;el.classList.toggle('hidden',item.enabled===false);el.dataset.sidebarUrl=item.url||DESKTOP_SIDEBAR_DEFAULTS[key]?.url||'home.html';const label=el.querySelector('.nethorSidebarLabel');if(label)label.textContent=item.label||DESKTOP_SIDEBAR_DEFAULTS[key]?.label||key});
 startDesktopClock()
}
function buildPageLayout(page){
 const id=String(page||'').toLowerCase();
 const pages={
  home:{title:'Nethor',subtitle:'Portail opérationnel',back:false},
  profile:{title:'Mon profil',subtitle:'Identité & notifications',back:true},
  planning:{title:'Planning équipe',subtitle:'Organisation du magasin',back:true},
  settings:{title:'Personnalisation',subtitle:'Mon affichage et mes raccourcis',back:true},
  'notification-settings':{title:'Notifications',subtitle:'Préférences et canaux',back:true},
  'report-problem':{title:'Signaler un problème',subtitle:'Rapport à l’administration',back:true},
  notifications:{title:'Notifications',subtitle:'Centre d’activité Nethor',back:true},
  scanner:{title:'Scanner',subtitle:'Lecture EAN13',back:true},
  articles:{title:'Fiches articles',subtitle:'Référentiel produit interne',back:true},
  accounts:{title:'Gestion des comptes',subtitle:'Administration · Accès · Journal',back:true},
  'admin-portal':{title:'Gestion',subtitle:'Administration Nethor',back:true},
  'fl-assistant':{title:'Assistant Précommande F&L',subtitle:'Analyse dédiée',back:true},
  bakery:{title:'Boulangerie',subtitle:'Stock interne',back:true},
  rewards:{title:'Défis & Boutique',subtitle:'Missions et récompenses',back:true},
  chat:{title:'Chat',subtitle:'Messagerie interne',back:true},
  'user-menu':{title:'Menu utilisateur',subtitle:'Compte et raccourcis',back:true},
  stock:{title:'Stock Fruits & Légumes',subtitle:'Gestion opérationnelle',back:true}
 };
 const cfg=pages[id];if(!cfg)return null;
 if(id==='accounts'&&document.documentElement.classList.contains('embeddedAccounts'))return{platform:'desktop',handlesBack:true,header:'',lead:''};
 const header=buildDesktopChrome(id);
 return {platform:'desktop',handlesBack:!!cfg.back,header,lead:''}
}
function buildDesktopChrome(page){
 const id=String(page||'home').toLowerCase();
 const sidebar=buildDesktopSidebar(id);
 const header='<header data-nethor-page-chrome="desktop"><div class="top nethorDesktopReferenceHeader">'+desktopHeaderStore()+desktopHeaderDateTime()+'<span data-nethor-global-tools-host style="display:contents"></span></div></header>'+sidebar;
 setTimeout(()=>applyDesktopShellConfig(window.NettoProfileUI?.siteConfig||{}),0);
 return header
}
window.addEventListener('netto:profile',e=>applyDesktopShellConfig(e.detail?.siteConfig||window.NettoProfileUI?.siteConfig||{}));
document.addEventListener('nethor:page-layout-ready',()=>applyDesktopShellConfig(window.NettoProfileUI?.siteConfig||{}));
window.NethorDesktopShell=Object.freeze({buildUserMenu,buildPageLayout,buildDesktopChrome,applyDesktopShellConfig,desktopDashboardConfig});
})();
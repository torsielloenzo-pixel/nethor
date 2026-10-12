'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));

const corePages=[
 'home.html','planning.html','chat.html','team.html','promotions.html','articles.html',
 'report-problem.html','admin-portal.html','profile.html','settings.html',
 'notifications.html','notification-settings.html'
];

test('QA refonte : les écrans principaux existent et chargent le shell professionnel',()=>{
 for(const page of corePages){
  assert.ok(exists(page),'Page absente : '+page);
  const html=read(page);
  assert.match(html,/platform-resolver\.js\?v=3/,'Resolver absent : '+page);
  assert.match(html,/platform-assets\.js\?v=4/,'Assets platform absents : '+page);
  assert.match(html,/ui\/desktop\/desktop-shell\.css\?v=9/,'Shell CSS desktop obsolète : '+page);
  assert.match(html,/ui\/desktop\/desktop-shell\.js\?v=38/,'Shell JS desktop obsolète : '+page);
 }
});

test('QA refonte : les marqueurs visuels professionnels sont présents sur les modules centraux',()=>{
 const expectations=[
  ['ui/desktop/planning-layout.css','NETHOR PROFESSIONAL PLANNING V1'],
  ['ui/mobile/planning-layout.css','NETHOR PROFESSIONAL PLANNING V1'],
  ['ui/desktop/home-dashboard-v3.css','NETHOR PROFESSIONAL HOME V1'],
  ['ui/mobile/views/home/home-view.css','NETHOR PROFESSIONAL HOME V1'],
  ['ui/desktop/chat-layout.css','NETHOR PROFESSIONAL CHAT V1'],
  ['ui/mobile/chat-layout.css','NETHOR PROFESSIONAL CHAT V1'],
  ['ui/desktop/admin-portal-layout.css','NETHOR PROFESSIONAL ADMIN V2'],
  ['ui/mobile/admin-portal-layout.css','NETHOR PROFESSIONAL ADMIN V2'],
  ['ui/desktop/profile-layout.css','NETHOR PROFESSIONAL PROFILE V2'],
  ['ui/mobile/profile-layout.css','NETHOR PROFESSIONAL PROFILE V2'],
  ['ui/mobile/views/profile/profile-view.css','NETHOR PROFESSIONAL PROFILE V2'],
  ['ui/desktop/user-pages-layout.css','NETHOR PROFESSIONAL USER PAGES V2'],
  ['ui/mobile/user-pages-layout.css','NETHOR PROFESSIONAL USER PAGES V2'],
  ['ui/desktop/tool-pages-layout.css','NETHOR PROFESSIONAL NOTIFICATIONS V2'],
  ['ui/mobile/tool-pages-layout.css','NETHOR PROFESSIONAL NOTIFICATIONS V2'],
  ['ui/mobile/views/notifications/notifications-view.css','NETHOR PROFESSIONAL NOTIFICATIONS V2'],
  ['ui/desktop/desktop-sidebar.css','NETHOR PROFESSIONAL NAV V2'],
  ['ui/desktop/desktop-shell.css','NETHOR PROFESSIONAL GLOBAL FINISH V1'],
  ['ui/mobile/mobile-app.css','NETHOR PROFESSIONAL GLOBAL FINISH V1']
 ];
 for(const [file,marker] of expectations){
  assert.ok(exists(file),'Fichier absent : '+file);
  assert.ok(read(file).includes(marker),'Couche professionnelle absente : '+file);
 }
});

test('QA refonte : Équipe est un module autonome et les anciens raccourcis sont migrés',()=>{
 const team=read('team.html');
 const shell=read('ui/desktop/desktop-shell.js');
 const admin=read('runtime/admin-portal-runtime.js');
 const profile=read('profile-ui.js');
 assert.match(team,/class="teamShell"/);
 assert.match(team,/rpc\('list_team_members'\)/);
 assert.match(team,/account_enabled!==false/);
 assert.match(team,/data-filter="online"/);
 assert.match(team,/data-filter="management"/);
 assert.match(profile,/{id:'team'.*?url:'team\.html'/s);
 assert.match(shell,/team:\{label:'Équipe',url:'team\.html'/);
 assert.match(shell,/normalized\.team\?\.url==='home\.html#nethorDesktopTeamWidget'/);
 assert.match(admin,/normalizedItems\.team\?\.url==='home\.html#nethorDesktopTeamWidget'/);
});

test('QA rôles : les routes sensibles gardent leurs contrats et la Gestion reste contrôlée par permission',()=>{
 const profile=read('profile-ui.js');
 const shell=read('ui/desktop/desktop-shell.js');
 assert.match(profile,/{id:'portal_admin'.*?roles:\['admin'\]/s);
 assert.match(profile,/{id:'accounts'.*?roles:\['admin'\]/s);
 assert.match(profile,/{id:'rewards'.*?roles:\['admin'\]/s);
 assert.match(profile,/{id:'bakery'.*?roles:\['admin'\]/s);
 assert.match(profile,/{id:'fl_assistant'.*?roles:\['admin','responsable'\]/s);
 assert.match(profile,/{id:'team'.*?roles:null/s);
 assert.match(profile,/const explicit=config\?\.role_permissions\?\.\[module\.id\]\?\.\[role\]/);
 assert.match(profile,/const extra=api\?\.subrolePermissions\?\.\[module\.id\]/);
 assert.match(shell,/permissionModules=\{home:'home',planning:'planning',team:'team',promotions:'promotions',articles:'articles',chat:'chat',management:'portal_admin',signal:'problem_report',settings:'settings'\}/);
 assert.match(shell,/permissionLevel\?\.\(moduleId,user\)!=='none'/);
});

test('QA mobile : Promotions reste accessible depuis Outils et reconnu par le shell',()=>{
 const profile=read('profile-ui.js');
 const menu=read('ui/mobile/views/user-menu/user-menu-view.js');
 const shell=read('ui/mobile/mobile-shell.js');
 const runtime=read('runtime/promotions-page.js');
 const profileStart=profile.indexOf("{id:'promotions'");
 const menuStart=menu.indexOf("{id:'promotions'");
 assert.ok(profileStart>=0,'Module Promotions absent de profile-ui');
 assert.ok(menuStart>=0,'Module Promotions absent du menu mobile');
 const profilePromo=profile.slice(profileStart,profile.indexOf('},',profileStart)+2);
 const menuPromo=menu.slice(menuStart,menu.indexOf('},',menuStart)+2);
 for(const block of [profilePromo,menuPromo]){
  assert.ok(block.includes("url:'promotions.html'"));
  assert.ok(block.includes("userMenu:true"));
  assert.ok(block.includes("defaultUser:true"));
 }
 assert.match(menu,/promotions:'<svg/);
 assert.match(shell,/'articles','promotions','accounts'/);
 assert.match(shell,/id==='articles'\\|\\|id==='promotions'\\|\\|id==='accounts'/);
 assert.match(runtime,/\['admin','role_point-de-vente'\]\.includes\(state\.profile\?\.role\)/);
});

test('QA plateforme : les outils terrain conservent leur portée mobile explicite',()=>{
 const profile=read('profile-ui.js');
 assert.match(profile,/{id:'scanner'.*?platform:'mobile'/s);
 assert.match(profile,/{id:'problem_report'.*?platform:'mobile'/s);
 assert.match(profile,/DEFAULT_MOBILE_BAR_IDS=Object\.freeze\(\['home','planning','chat'\]\)/);
});

test('QA Chat : actions sensibles et canal Général restent cohérents',()=>{
 const chat=read('chat-v2.js');
 assert.match(chat,/const canArchive=isGroup;/);
 assert.match(chat,/archive\?\.classList\.toggle\('hidden',isGeneral\|\|isDirect\)/);
 assert.match(chat,/conv\?\.conversation_type==='general'\|\|conv\?\.conversation_type==='direct'/);
 assert.match(chat,/if\(state\.profile\?\.role!=='admin'\)return showToast\('Administrateur uniquement'\)/);
 assert.match(chat,/db\.rpc\('chat_admin_delete_message'/);
 assert.match(chat,/let deleteQuery=db\.from\('chat_messages'\)\.update/);
 assert.match(chat,/if\(!state\.canManage\)deleteQuery=deleteQuery\.eq\('user_id',state\.session\.user\.id\)/);
 assert.match(chat,/pin\?\.classList\.toggle\('hidden',!admin\)/);
 assert.match(chat,/if\(state\.profile\?\.role!=='admin'\)\{input\.value='';return showToast\('Administrateur uniquement'\)\}/);
});

test('QA compte personnel : Notifications et Profil restent limités au propriétaire, widgets admin masqués',()=>{
 const profile=read('profile.html');
 const settings=read('settings.html');
 assert.match(profile,/\.eq\('id',id\)\.eq\('user_id',session\.user\.id\)/);
 assert.match(profile,/\.eq\('user_id',session\.user\.id\)\.is\('read_at',null\)/);
 assert.match(profile,/function syncAdminProfileWidgets\(role\)[\s\S]*?role==='admin'/);
 assert.match(profile,/adminOnlyProfileWidget/);
 assert.match(settings,/\.update\(\{ui_preferences:prefs\}\)\.eq\('id',session\.user\.id\)/);
});

test('QA actions par rôle : Planning, Promotions et Articles restent alignés au backend',()=>{
 const planning=read('planning-runtime.js');
 const promotions=read('runtime/promotions-page.js');
 const articles=read('articles.html');
 assert.match(planning,/function canRequestPlanningAbsence\(\)\{\s*return absenceAccess==='request'\|\|\(absenceAccess==='manage'&&role==='admin'\)/);
 assert.match(planning,/absenceRequestBtn'\)\?\.classList\.toggle\('hidden',!canRequestPlanningAbsence\(\)/);
 assert.match(planning,/function openAbsenceRequest\(\)[\s\S]*?!canRequestPlanningAbsence\(\)/);
 assert.match(planning,/async function submitAbsenceRequest\(\)[\s\S]*?!canRequestPlanningAbsence\(\)/);
 assert.ok(!promotions.includes("location.replace('mobile.html')"),'Promotions ne doit plus renvoyer les mobiles vers l’accueil');
 assert.match(promotions,/const manager=\(\)=>\['admin','role_point-de-vente'\]\.includes\(state\.profile\?\.role\)/);
 assert.match(promotions,/state\.profile=data;\$\('promoImport'\)\.hidden=!manager\(\)/);
 assert.match(articles,/canManageArticles=permission==='manage';syncArticleActionVisibility\(\)/);
 assert.match(articles,/hub\.classList\.toggle\('hidden',!canManageArticles\)/);
 assert.match(articles,/familyButton\?\.classList\.toggle\('hidden',profile\?\.role!=='admin'\)/);
 assert.match(articles,/function openOptions\(kind\)\{if\(!canManageArticles\|\|\(kind==='family'&&profile\?\.role!=='admin'\)\)return/);
});

test('QA Gestion : Équipe et Promotions sont configurables dans la sidebar desktop',()=>{
 const admin=read('runtime/admin-portal-runtime.js');
 assert.match(admin,/team:\{enabled:true,label:'Équipe',url:'team\.html'\}/);
 assert.match(admin,/promotions:\{enabled:true,label:'Promotions',url:'promotions\.html'\}/);
});

test('QA desktop : la sidebar respecte les permissions et inclut Fiches articles',()=>{
 const shell=read('ui/desktop/desktop-shell.js');
 assert.match(shell,/const mainKeys=\['home','planning','team','promotions','articles','chat','management'\]/);
 assert.match(shell,/permissionModules=\{home:'home',planning:'planning',team:'team',promotions:'promotions',articles:'articles',chat:'chat',management:'portal_admin',signal:'problem_report',settings:'settings'\}/);
 assert.match(shell,/permissionLevel\?\.\(moduleId,user\)!=='none'/);
 assert.match(shell,/\['articles','management'\]\.includes\(key\)/);
});

test('QA navigation secondaire : aucun module opérationnel n’est orphelin',()=>{
 const nav=read('platform-navigation.js');
 const profile=read('profile-ui.js');
 const shell=read('ui/mobile/mobile-shell.js');
 for(const page of ['team.html','promotions.html','articles.html','scanner.html']){
  assert.ok(nav.includes("'"+page+"':{type:'url',value:'home.html'}"),'Retour desktop absent : '+page);
  assert.ok(nav.includes("'"+page+"':{type:'url',value:'user-menu.html'}"),'Retour mobile absent : '+page);
 }
 for(const page of ['settings.html','notification-settings.html']){
  assert.ok(nav.includes("'"+page+"':{type:'url',value:'home.html'}"),'Retour desktop absent : '+page);
  assert.ok(nav.includes("'"+page+"':{type:'url',value:'user-menu.html'}"),'Retour mobile absent : '+page);
 }
 assert.ok(nav.includes("'notifications.html':{type:'url',value:'home.html'}"));
 assert.ok(nav.includes("'report-problem':'report-problem.html'"));
 assert.match(profile,/team:'team\.html',/);
 assert.match(profile,/promotions:'promotions\.html',/);
 for(const id of ['report-problem','scanner','articles','promotions','team']){
  assert.ok(shell.includes("'"+id+"'")||shell.includes("id==='"+id+"'"),'Page non reconnue par le shell mobile : '+id);
 }
});

test('QA mobile : Équipe et Promotions exposent un retour visible',()=>{
 const team=read('team.html');
 const promotions=read('promotions.html');
 const promoCss=read('runtime/promotions-page.css');
 assert.match(team,/id="teamMobileBack"/);
 assert.match(team,/NethorNavigation\?\.navigateBack/);
 assert.match(promotions,/id="promoMobileBack"/);
 assert.match(promotions,/NethorNavigation\?\.navigateBack/);
 assert.match(promoCss,/\.promoMobileBack\{display:none\}/);
 assert.match(promoCss,/@media\(max-width:900px\)[\s\S]*?\.promoMobileBack\{display:grid/);
});

test('QA signalement : les nouveaux modules sont identifiables dans le contexte de diagnostic',()=>{
 const report=read('report-problem.html');
 assert.match(report,/'team\.html':'Équipe'/);
 assert.match(report,/'promotions\.html':'Promotions'/);
 assert.match(report,/'team\.html':'team'/);
 assert.match(report,/'promotions\.html':'promotions'/);
});

test('QA PWA : les assets critiques sont versionnés et le cache mobile est synchronisé',()=>{
 const worker=read('sw.js');
 const versioned=[
  ['home.html',/ui\/desktop\/home-dashboard-v3\.css\?v=\d+/],
  ['planning.html',/ui\/desktop\/planning-layout\.css\?v=\d+/],
  ['planning.html',/ui\/mobile\/planning-layout\.css\?v=\d+/],
  ['chat.html',/ui\/desktop\/chat-layout\.css\?v=\d+/],
  ['chat.html',/ui\/mobile\/chat-layout\.css\?v=\d+/],
  ['promotions.html',/runtime\/promotions-page\.css\?v=\d+/],
  ['profile.html',/ui\/desktop\/profile-layout\.css\?v=\d+/],
  ['profile.html',/ui\/mobile\/profile-layout\.css\?v=\d+/],
  ['notifications.html',/ui\/desktop\/tool-pages-layout\.css\?v=\d+/],
  ['notifications.html',/ui\/mobile\/tool-pages-layout\.css\?v=\d+/]
 ];
 for(const [page,rx] of versioned){
  const asset=read(page).match(rx)?.[0];
  assert.ok(asset,'Asset introuvable dans '+page+' : '+rx);
  assert.ok(exists(asset.split('?')[0]),'Fichier versionné absent : '+asset);
 }
 for(const [page,rx] of [
  ['home.html',/ui\/desktop\/home-dashboard-v3\.css\?v=\d+/],
  ['promotions.html',/runtime\/promotions-page\.css\?v=\d+/],
  ['profile.html',/ui\/mobile\/profile-layout\.css\?v=\d+/],
  ['notifications.html',/ui\/mobile\/tool-pages-layout\.css\?v=\d+/]
 ]){
  const asset=read(page).match(rx)?.[0];
  assert.ok(worker.includes('./'+asset),'Asset PWA attendu mais non synchronisé : '+asset);
 }
 const mobile=read('mobile.html');
 for(const rx of [
  /ui\/mobile\/mobile-app\.css\?v=\d+/,
  /ui\/mobile\/views\/profile\/profile-view\.css\?v=\d+/,
  /ui\/mobile\/views\/settings\/settings-view\.css\?v=\d+/,
  /ui\/mobile\/views\/notifications\/notifications-view\.css\?v=\d+/,
  /ui\/mobile\/views\/notification-settings\/notification-settings-view\.css\?v=\d+/
 ]){
  const asset=mobile.match(rx)?.[0];
  assert.ok(asset,'Asset mobile absent : '+rx);
  assert.ok(worker.includes('./'+asset),'Asset mobile non synchronisé PWA : '+asset);
 }
});

test('QA finition : les versions obsolètes critiques ne sont plus chargées par les pages refondues',()=>{
 const all=corePages.map(read).join('\n');
 for(const obsolete of [
  'ui/desktop/desktop-shell.css?v=8',
  'ui/desktop/desktop-shell.js?v=35',
  'ui/desktop/desktop-shell.js?v=36',
  'profile-ui.js?v=227'
 ]){
  assert.ok(!all.includes(obsolete),'Référence obsolète encore chargée : '+obsolete);
 }
});

test('QA responsive : les protections de largeur et les états système communs sont présents',()=>{
 const desktop=read('ui/desktop/desktop-shell.css');
 const mobile=read('ui/mobile/mobile-app.css');
 assert.match(desktop,/@media\(max-width:1024px\)/);
 assert.match(desktop,/overflow-x:hidden!important/);
 assert.match(desktop,/\.teamEmpty,\.notificationsEmpty,\.npEmpty,\.moduleEmpty,\.absenceEmpty/);
 assert.match(mobile,/\.npvLoading,\.nsvLoading,\.nnsLoading,\.teamEmpty,\.npEmpty/);
});

/* Nethor — éditeur dédié de l'écran de connexion
   Extension de Gestion > Éditeur du portail.
   Les versions claire/sombre partagent volontairement la même géométrie côté connexion. */
(function(){
'use strict';

const requestedLoginAtLoad=(()=>{try{return new URLSearchParams(location.search).get('tab')==='login'||localStorage.getItem('nettoManagementTab')==='login'}catch(_){return false}})();
const LOGIN_ASSET_KEYS=[
 'login_logo','login_wordmark','login_background',
 'login_icon_user','login_icon_password',
 'login_icon_management','login_icon_planning','login_icon_stock','login_icon_team'
];
const LOGIN_DEFAULTS=Object.freeze({
 brand_text:'Nethor',
 email_placeholder:'Identifiant',
 password_placeholder:'Mot de passe',
 submit_text:'Se connecter',
 forgot_text:'Mot de passe oublié ?',
 footer_text:'Accès réservé aux utilisateurs autorisés',
 feature_management:'Gestion',
 feature_planning:'Planning',
 feature_stock:'Stock',
 feature_team:'Équipe',
 background_opacity:100,
 primary_logo_visible:true,
 secondary_logo_visible:true,
 secondary_display:'text'
});
function cleanAsset(x){
 x=x&&typeof x==='object'?x:{};
 return{url:String(x.url||''),path:String(x.path||''),name:String(x.name||'')}
}
function cleanThemedAsset(x){
 x=x&&typeof x==='object'?x:{};
 const legacy=cleanAsset(x),light=cleanAsset(x.light),dark=cleanAsset(x.dark);
 return{light:(light.url||light.path||light.name)?light:legacy,dark}
}
function cleanTheme(x,fallback){
 x=x&&typeof x==='object'?x:{};fallback=fallback&&typeof fallback==='object'?fallback:LOGIN_DEFAULTS;
 const n=Number(x.background_opacity);
 const val=(key)=>x[key]===undefined?String(fallback[key]??LOGIN_DEFAULTS[key]??''):String(x[key]);
 const bool=(key)=>x[key]===undefined?(fallback[key]!==false):(x[key]!==false);
 const displayRaw=String(x.secondary_display===undefined?(fallback.secondary_display||''):x.secondary_display).toLowerCase();
 return{
  brand_text:val('brand_text'),
  email_placeholder:val('email_placeholder'),
  password_placeholder:val('password_placeholder'),
  submit_text:val('submit_text'),
  forgot_text:val('forgot_text'),
  footer_text:val('footer_text'),
  feature_management:val('feature_management'),
  feature_planning:val('feature_planning'),
  feature_stock:val('feature_stock'),
  feature_team:val('feature_team'),
  background_opacity:Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):Math.max(0,Math.min(100,Number.isFinite(Number(fallback.background_opacity))?Number(fallback.background_opacity):100)),
  primary_logo_visible:bool('primary_logo_visible'),
  secondary_logo_visible:bool('secondary_logo_visible'),
  secondary_display:displayRaw==='logo'?'logo':displayRaw==='text'?'text':'text'
 }
}
function ensureLoginConfigOnPlatform(dst,src){
 dst=dst&&typeof dst==='object'?dst:{};src=src&&typeof src==='object'?src:{};
 for(const key of LOGIN_ASSET_KEYS){
  const incoming=src[key]!==undefined?src[key]:dst[key];
  dst[key]=cleanThemedAsset(incoming)
 }
 const raw=src.login_settings&&typeof src.login_settings==='object'?src.login_settings:(dst.login_settings||{});
 const rawLight=raw.light&&typeof raw.light==='object'?raw.light:{},rawDark=raw.dark&&typeof raw.dark==='object'?raw.dark:{};
 const light=cleanTheme(rawLight,LOGIN_DEFAULTS),dark=cleanTheme(rawDark,light);
 if(rawLight.secondary_display===undefined)light.secondary_display=String(dst.login_wordmark?.light?.url||'').trim()?'logo':'text';
 if(rawDark.secondary_display===undefined)dark.secondary_display=String(dst.login_wordmark?.dark?.url||dst.login_wordmark?.light?.url||'').trim()?'logo':'text';
 dst.login_settings={light,dark};
 return dst
}

/* Préserve les nouveaux réglages à travers les normaliseurs historiques. */
const baseNormalize=window.normalize;
if(typeof baseNormalize==='function'){
 window.normalize=function(raw){
  const out=baseNormalize(raw),source=raw&&typeof raw==='object'?raw:{};
  out.platform_ui=out.platform_ui&&typeof out.platform_ui==='object'?out.platform_ui:{};
  for(const kind of ['mobile','desktop']){
   out.platform_ui[kind]=ensureLoginConfigOnPlatform(out.platform_ui[kind],source?.platform_ui?.[kind])
  }
  return out
 }
}
const baseEnsurePlatformUiConfig=window.ensurePlatformUiConfig;
if(typeof baseEnsurePlatformUiConfig==='function'){
 window.ensurePlatformUiConfig=function(){
  const saved={};
  try{
   for(const kind of ['mobile','desktop']){
    const src=config?.platform_ui?.[kind]||{};
    saved[kind]={};
    for(const key of LOGIN_ASSET_KEYS)saved[kind][key]=clone(src[key]||{});
    saved[kind].login_settings=clone(src.login_settings||{})
   }
  }catch(_){}
  const out=baseEnsurePlatformUiConfig();
  for(const kind of ['mobile','desktop']){
   config.platform_ui[kind]=ensureLoginConfigOnPlatform(config.platform_ui[kind],saved[kind])
  }
  return out
 }
}
function ui(kind){
 ensurePlatformUiConfig();
 const k=kind==='desktop'?'desktop':'mobile';
 config.platform_ui[k]=ensureLoginConfigOnPlatform(config.platform_ui[k],config.platform_ui[k]);
 return config.platform_ui[k]
}
function themeNode(kind,theme){
 const u=ui(kind),t=theme==='dark'?'dark':'light';
 const fallback=t==='dark'?u.login_settings.light:LOGIN_DEFAULTS;
 u.login_settings[t]=cleanTheme(u.login_settings[t],fallback);
 return u.login_settings[t]
}
function assetNode(kind,key,theme){
 const u=ui(kind),t=theme==='dark'?'dark':'light';
 u[key]=cleanThemedAsset(u[key]);
 u[key][t]=cleanAsset(u[key][t]);
 return u[key][t]
}
function defaultAsset(kind,key){
 if(key==='login_logo')return kind==='mobile'?'assets/app-icon-mobile-v71.svg?v=72':'assets/app-icon-v63.svg';
 if(key==='login_background')return kind==='desktop'?'assets/nethor-login-premium.webp':'assets/fl-background.svg';
 return''
}
function assetUrl(kind,key,theme){
 const u=ui(kind),t=theme==='dark'?'dark':'light',node=cleanThemedAsset(u[key]),variant=node[t],light=node.light;
 return String(variant.url||(t==='dark'?light.url:'')||defaultAsset(kind,key)||'').trim()
}
function themeLabel(theme){return theme==='dark'?'Sombre':'Clair'}
function assetAccept(key){
 return key==='login_background'
  ?'.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
  :'.png,.webp,.svg,.ico,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon'
}
function assetFallback(kind,key,theme){
 if(key==='login_wordmark')return '<span class="loginEditorWordmarkFallback">'+esc(themeNode(kind,theme).brand_text||'nethor')+'</span>';
 if(key.startsWith('login_icon_'))return '<span class="loginEditorIconFallback">◇</span>';
 return '<span class="loginEditorEmpty">Nethor</span>'
}
const ASSET_META={
 login_logo:['Logo principal','Carré Nethor principal, sans modifier sa position.'],
 login_wordmark:['Logo en dessous','Wordmark sous le logo principal. Sans fichier, Nethor affiche le texte configuré.'],
 login_background:['Écran de fond','Photo ou visuel plein écran derrière la carte de connexion.'],
 login_icon_user:['Identifiant','Icône placée dans le champ Identifiant.'],
 login_icon_password:['Mot de passe','Icône placée dans le champ Mot de passe.'],
 login_icon_management:['Gestion','Icône du raccourci Gestion.'],
 login_icon_planning:['Planning','Icône du raccourci Planning.'],
 login_icon_stock:['Stock','Icône du raccourci Stock.'],
 login_icon_team:['Équipe','Icône du raccourci Équipe.']
};
function assetEditor(kind,key,theme,compact=false){
 const node=assetNode(kind,key,theme),url=assetUrl(kind,key,theme),custom=!!String(node.url||'').trim(),meta=ASSET_META[key]||[key,''];
 const inherited=theme==='dark'&&!custom&&!!String(assetNode(kind,key,'light').url||'').trim();
 const status=custom?(node.name||'Média personnalisé'):(inherited?'Hérite de la version claire':'Valeur Nethor par défaut');
 return '<div class="loginEditorAsset '+(compact?'compact':'')+'">'+
  '<div class="loginEditorAssetPreview '+(key==='login_background'?'background':'')+'">'+(url?'<img src="'+attr(url)+'" alt="">':assetFallback(kind,key,theme))+'</div>'+
  '<div class="loginEditorAssetCopy"><strong>'+esc(meta[0])+'</strong><span>'+esc(meta[1])+'</span><small>'+esc(status)+'</small></div>'+
  '<div class="loginEditorAssetActions">'+
   '<button class="btn secondaryBtn mini" type="button" onclick="chooseLoginAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Importer</button>'+
   (url?'<button class="btn secondaryBtn mini" type="button" onclick="downloadLoginAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Télécharger</button>':'')+
   (custom?'<button class="btn secondaryBtn mini" type="button" onclick="removeLoginAsset(\''+kind+'\',\''+key+'\',\''+theme+'\')">Réinitialiser</button>':'')+
  '</div>'+
  '<input id="loginAssetFile_'+kind+'_'+key+'_'+theme+'" type="file" accept="'+assetAccept(key)+'" hidden onchange="uploadLoginAsset(\''+kind+'\',\''+key+'\',\''+theme+'\',this)">'+
 '</div>'
}
function textField(kind,theme,key,label,value){
 return '<label class="loginEditorField"><span>'+esc(label)+'</span><input type="text" value="'+attr(value)+'" data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="'+key+'"></label>'
}
function secondaryDisplayControl(kind,theme,value){
 const mode=value==='logo'?'logo':'text';
 return '<div class="loginSecondaryDisplayControl"><div><strong>Contenu sous le logo principal</strong><small>Choisis si cette zone affiche le logo importé ou le texte configuré.</small></div>'+
  '<div class="loginSecondaryDisplayChoice" role="group" aria-label="Affichage sous le logo principal">'+
   '<label class="'+(mode==='logo'?'active':'')+'"><input type="radio" name="login-secondary-'+kind+'-'+theme+'" value="logo" '+(mode==='logo'?'checked':'')+' data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="secondary_display"><span>Logo</span></label>'+
   '<label class="'+(mode==='text'?'active':'')+'"><input type="radio" name="login-secondary-'+kind+'-'+theme+'" value="text" '+(mode==='text'?'checked':'')+' data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="secondary_display"><span>Texte</span></label>'+
  '</div>'+
 '</div>'
}
function preview(kind,theme){
 const s=themeNode(kind,theme),bg=assetUrl(kind,'login_background',theme),logo=assetUrl(kind,'login_logo',theme),wordmark=assetUrl(kind,'login_wordmark',theme);
 return '<div class="loginEditorPreview" style="--login-preview-bg:url('+JSON.stringify(bg)+');--login-preview-opacity:'+(s.background_opacity/100)+'">'+
  '<div class="loginEditorPreviewBg"></div>'+
  '<div class="loginEditorPreviewCard">'+
   (s.primary_logo_visible?'<img class="loginEditorPreviewPrimary" src="'+attr(logo)+'" alt="">':'')+
   (s.secondary_logo_visible
      ?(s.secondary_display==='logo'
        ?(wordmark?'<img class="loginEditorPreviewWordmark" src="'+attr(wordmark)+'" alt="">':'')
        :'<strong class="loginEditorPreviewSecondaryText">'+esc(s.brand_text)+'</strong>')
      :'')+
   '<div class="loginEditorPreviewField"><span>○</span>'+esc(s.email_placeholder)+'</div>'+
   '<div class="loginEditorPreviewField"><span>□</span>'+esc(s.password_placeholder)+'</div>'+
   '<b>'+esc(s.submit_text)+'</b>'+
  '</div>'+
 '</div>'
}
function themeEditor(kind,theme){
 const s=themeNode(kind,theme),dark=theme==='dark';
 return '<section class="loginThemeEditor '+(dark?'dark':'light')+'">'+
  '<div class="loginThemeEditorHead"><div><span class="loginThemeBadge">'+themeLabel(theme)+'</span><h3>Version '+(dark?'sombre':'claire')+'</h3><p>À éléments actifs identiques, les dimensions et emplacements restent les mêmes.</p></div>'+
   (dark?'<button class="btn secondaryBtn mini" type="button" onclick="copyLoginTheme(\''+kind+'\',\'light\',\'dark\')">Copier le clair</button>':'')+
  '</div>'+
  preview(kind,theme)+
  '<div class="loginEditorGroup"><h4>Identité & fond</h4>'+
   assetEditor(kind,'login_logo',theme)+
   '<label class="loginVisibilityToggle"><input type="checkbox" '+(s.primary_logo_visible?'checked':'')+' data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="primary_logo_visible"><span><strong>Logo principal visible</strong><small>Masque le logo et libère immédiatement l’espace occupé.</small></span></label>'+
   assetEditor(kind,'login_wordmark',theme)+
   secondaryDisplayControl(kind,theme,s.secondary_display)+
   '<label class="loginVisibilityToggle"><input type="checkbox" '+(s.secondary_logo_visible?'checked':'')+' data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="secondary_logo_visible"><span><strong>Élément sous le logo visible</strong><small>Masque le logo secondaire ou le texte et supprime son espace.</small></span></label>'+
   assetEditor(kind,'login_background',theme)+
   '<label class="loginOpacityControl"><span>Opacité de l’écran de fond <b data-login-opacity-label="'+kind+'-'+theme+'">'+s.background_opacity+' %</b></span><input type="range" min="0" max="100" step="1" value="'+s.background_opacity+'" data-login-kind="'+kind+'" data-login-theme="'+theme+'" data-login-key="background_opacity"></label>'+
  '</div>'+
  '<div class="loginEditorGroup"><h4>Textes</h4><div class="loginEditorFields">'+
   textField(kind,theme,'brand_text','Texte sous le logo principal',s.brand_text)+
   textField(kind,theme,'email_placeholder','Identifiant',s.email_placeholder)+
   textField(kind,theme,'password_placeholder','Mot de passe',s.password_placeholder)+
   textField(kind,theme,'submit_text','Bouton de connexion',s.submit_text)+
   textField(kind,theme,'forgot_text','Mot de passe oublié',s.forgot_text)+
   textField(kind,theme,'footer_text','Texte de pied',s.footer_text)+
   textField(kind,theme,'feature_management','Libellé Gestion',s.feature_management)+
   textField(kind,theme,'feature_planning','Libellé Planning',s.feature_planning)+
   textField(kind,theme,'feature_stock','Libellé Stock',s.feature_stock)+
   textField(kind,theme,'feature_team','Libellé Équipe',s.feature_team)+
  '</div></div>'+
  '<div class="loginEditorGroup"><h4>Icônes associées</h4><div class="loginIconEditorGrid">'+
   assetEditor(kind,'login_icon_user',theme,true)+
   assetEditor(kind,'login_icon_password',theme,true)+
   assetEditor(kind,'login_icon_management',theme,true)+
   assetEditor(kind,'login_icon_planning',theme,true)+
   assetEditor(kind,'login_icon_stock',theme,true)+
   assetEditor(kind,'login_icon_team',theme,true)+
  '</div></div>'+
 '</section>'
}
function bindEditor(host){
 host.querySelectorAll('[data-login-kind][data-login-theme][data-login-key]').forEach(el=>{
  const update=()=>{
   const s=themeNode(el.dataset.loginKind,el.dataset.loginTheme),key=el.dataset.loginKey;
   if(el.type==='range'){
    s[key]=Math.max(0,Math.min(100,Math.round(Number(el.value)||0)));
    const out=host.querySelector('[data-login-opacity-label="'+el.dataset.loginKind+'-'+el.dataset.loginTheme+'"]');if(out)out.textContent=s[key]+' %';const preview=el.closest('.loginThemeEditor')?.querySelector('.loginEditorPreview');if(preview)preview.style.setProperty('--login-preview-opacity',String(s[key]/100))
   }else if(el.type==='checkbox'){
    s[key]=el.checked;
    const themeEl=el.closest('.loginThemeEditor');
    const preview=themeEl?.querySelector('.loginEditorPreview');
    if(preview&&(key==='primary_logo_visible'||key==='secondary_logo_visible'))renderLoginScreenEditor()
   }else if(el.type==='radio'&&key==='secondary_display'){
    if(!el.checked)return;
    s[key]=el.value==='logo'?'logo':'text';
    const group=el.closest('.loginSecondaryDisplayChoice');
    group?.querySelectorAll('label').forEach(label=>label.classList.toggle('active',label.contains(el)&&el.checked));
    const themeEl=el.closest('.loginThemeEditor'),previewCard=themeEl?.querySelector('.loginEditorPreviewCard');
    if(previewCard){
      const current=previewCard.querySelector('.loginEditorPreviewWordmark,.loginEditorPreviewSecondaryText');
      if(!s.secondary_logo_visible){current?.remove()}
      else if(s[key]==='logo'){
        const src=assetUrl(el.dataset.loginKind,'login_wordmark',el.dataset.loginTheme)||'';
        if(src){const img=document.createElement('img');img.className='loginEditorPreviewWordmark';img.alt='';img.src=src;current?.replaceWith(img)}
        else current?.remove()
      }else{
        const text=document.createElement('strong');text.className='loginEditorPreviewSecondaryText';text.textContent=s.brand_text;current?.replaceWith(text)
      }
    }
   }else s[key]=el.value;
   markDirty()
  };
  el.addEventListener((el.type==='checkbox'||el.type==='radio')?'change':'input',update)
 })
}
window.renderLoginScreenEditor=function(){
 const host=document.getElementById('loginScreenEditor');if(!host)return;
 ensurePlatformUiConfig();
 host.innerHTML='<div class="toolbar loginEditorHead"><div><h2>Écran de connexion</h2><p>Logo principal, logo secondaire, textes, icônes, fond et opacité. Mobile et Desktop sont séparés. Un élément désactivé est retiré de la mise en page afin de ne laisser aucun espace vide.</p></div></div>'+
 ['mobile','desktop'].map(kind=>'<div class="loginPlatformEditor"><div class="loginPlatformHead"><span>'+platformLabel(kind)+'</span><div><strong>Connexion '+platformLabel(kind)+'</strong><small>Même structure tant que les mêmes éléments sont actifs.</small></div></div><div class="loginThemeGrid">'+themeEditor(kind,'light')+themeEditor(kind,'dark')+'</div></div>').join('');
 bindEditor(host)
};

/* Actions médias */
window.chooseLoginAsset=(kind,key,theme)=>document.getElementById('loginAssetFile_'+kind+'_'+key+'_'+theme)?.click();
window.uploadLoginAsset=async function(kind,key,theme,input){
 const file=input?.files?.[0],state=document.getElementById('saveState');if(!file)return;
 try{
  const ext=(String(file.name||'').split('.').pop()||'').toLowerCase();
  const background=key==='login_background',allowed=background?['jpg','jpeg','png','webp']:['png','webp','svg','ico'];
  if(!allowed.includes(ext))throw new Error(background?'Utilise JPG, PNG ou WebP.':'Utilise PNG, WebP, SVG ou ICO.');
  const limit=background?12*1024*1024:5*1024*1024;if(file.size>limit)throw new Error('Fichier trop lourd : '+(background?'12':'5')+' Mo maximum.');
  if(state){state.className='saveState';state.textContent='Import connexion '+platformLabel(kind)+' · '+themeLabel(theme)+'…'}
  const storagePath='platform/'+kind+'/login/'+key+'/'+theme+'-'+Date.now()+'.'+ext;
  const {error}=await db.storage.from('portal-assets').upload(storagePath,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;
  const {data}=db.storage.from('portal-assets').getPublicUrl(storagePath),node=assetNode(kind,key,theme);
  node.path=storagePath;node.url=data?.publicUrl||'';node.name=file.name;
  markDirty();renderLoginScreenEditor();if(state)state.textContent='Média de connexion prêt à être enregistré'
 }catch(e){if(state){state.className='saveState err';state.textContent='Erreur média : '+(e?.message||e)}}
 finally{if(input)input.value=''}
};
window.removeLoginAsset=function(kind,key,theme){
 const node=assetNode(kind,key,theme);node.url='';node.path='';node.name='';markDirty();renderLoginScreenEditor()
};
window.downloadLoginAsset=async function(kind,key,theme){
 const node=assetNode(kind,key,theme),url=assetUrl(kind,key,theme);if(!url)return;
 if(typeof downloadAssetUrl==='function')return downloadAssetUrl(url,node.name||('Nethor-'+kind+'-'+key+'-'+theme));
 const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.download=node.name||'nethor-login-media';document.body.appendChild(a);a.click();a.remove()
};
window.copyLoginTheme=function(kind,from,to){
 const u=ui(kind);u.login_settings[to]=clone(themeNode(kind,from));
 for(const key of LOGIN_ASSET_KEYS)u[key][to]=clone(assetNode(kind,key,from));
 markDirty();renderLoginScreenEditor();
 const state=document.getElementById('saveState');if(state)state.textContent='Version claire copiée vers sombre — enregistrer pour confirmer'
};

/* Ajoute l'entrée Gestion > Apparence & médias > Écran de connexion. */
function installLoginStructure(){
 const nav=document.querySelector('.managementNavGroup[data-nav-group="appearance"] .managementNavChildren')||document.querySelector('.managementNavGroup[data-nav-group="portal"] .managementNavChildren');
 const identity=nav?.querySelector('[data-tab="general"]');
 if(nav&&!nav.querySelector('[data-tab="login"]')){
  const btn=document.createElement('button');btn.className='managementNavChild';btn.dataset.tab='login';btn.type='button';btn.textContent='Écran de connexion';btn.setAttribute('onclick',"showTab('login',this)");
  identity?.insertAdjacentElement('afterend',btn)
 }
 if(!document.getElementById('tab-login')){
  const section=document.createElement('section');section.id='tab-login';section.className='section';
  section.innerHTML='<div id="loginScreenEditor" class="panel loginScreenEditorPanel"></div>';
  const before=document.getElementById('tab-blocks');before?.parentNode?.insertBefore(section,before)
 }

}
const baseStructure=window.ensurePortalPlatformStructure;
if(typeof baseStructure==='function')window.ensurePortalPlatformStructure=function(){baseStructure();installLoginStructure()};

const baseManagementButtonFor=window.managementButtonFor;
if(typeof baseManagementButtonFor==='function')window.managementButtonFor=function(name){
 if(name==='login')return document.querySelector('.managementSide [data-tab="login"]');
 return baseManagementButtonFor(name)
};

const baseShowTab=window.showTab;
if(typeof baseShowTab==='function')window.showTab=function(name,btn,opts={}){
 if(name!=='login')return baseShowTab(name,btn,opts);
 installLoginStructure();renderLoginScreenEditor();
 btn=btn||document.querySelector('.managementSide [data-tab="login"]');
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id==='tab-login'));
 if(typeof activateManagementNav==='function')activateManagementNav(btn);
 document.querySelector('.stickySave')?.classList.remove('hidden');
 document.querySelector('.adminPortalMobileSave')?.classList.remove('hidden');
 try{localStorage.setItem('nettoManagementTab','login')}catch(_){}
 const u=new URL(location.href);u.searchParams.set('tab','login');u.searchParams.delete('sub');history.replaceState({},'',u);
 const crumb=document.getElementById('managementBreadcrumb'),title=document.getElementById('managementHeroTitle'),desc=document.getElementById('managementHeroText');
 if(crumb)crumb.innerHTML='Gestion <span>›</span> Apparence & médias <span>›</span> Écran de connexion';
 if(title)title.textContent='Écran de connexion';
 if(desc)desc.textContent='Personnalise complètement la connexion Mobile et Desktop, séparément pour les thèmes clair et sombre.';
 if(typeof enhanceCompactPortal==='function')enhanceCompactPortal();
 if(opts.sound!==false)window.NettoSounds?.play?.('menuOpen')
};

const baseRenderPlatformIdentity=window.renderPlatformIdentity;
if(typeof baseRenderPlatformIdentity==='function')window.renderPlatformIdentity=function(kind){
 baseRenderPlatformIdentity(kind);
 document.querySelectorAll('#platformIdentity_'+kind+' .platformAssetRow').forEach(row=>{
  if(row.querySelector('.platformAssetCopy strong')?.textContent?.trim()==='Logo de connexion')row.classList.add('hidden')
 })
};

const baseRenderPlatformEditors=window.renderPlatformEditors;
if(typeof baseRenderPlatformEditors==='function')window.renderPlatformEditors=function(){
 baseRenderPlatformEditors();
 /* Centralise le logo de connexion dans ce nouvel écran pour éviter deux réglages concurrents. */
 document.querySelectorAll('#platformIdentity_mobile .platformAssetRow,#platformIdentity_desktop .platformAssetRow').forEach(row=>{
  if(row.querySelector('.platformAssetCopy strong')?.textContent?.trim()==='Logo de connexion')row.classList.add('hidden')
 });
 renderLoginScreenEditor()
};

/* Le boot historique ne connaît pas encore l'onglet login dans sa liste persistée.
   On restaure donc cet onglet juste après le chargement si l'URL ou le stockage le demande. */
setTimeout(()=>{
 installLoginStructure();
 if(requestedLoginAtLoad)window.showTab?.('login',document.querySelector('.managementSide [data-tab="login"]'),{sound:false})
},700);
})();

/* Nethor Promotions — dépôt PDF local, prévisualisation et confirmation avant enregistrement. */
(function(){
'use strict';
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const PUBLIC_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={user:null,profile:null,busy:false,catalogs:[],last:null,selectedCatalogId:null,reviewBusy:false,draft:null,review:null};
const manager=()=>['admin','role_point-de-vente'].includes(state.profile?.role);
function notify(msg,type=''){
 const el=$('promoAlert');el.textContent=msg;el.className='promoAlert '+type;el.hidden=!msg
}
function loading(title,message){
 const el=$('promoAutoProgress');
 el.hidden=false;$('promoProgressTitle').textContent=title;$('promoProgressText').textContent=message;
}
function dateFr(v){
 if(!v)return'—';
 try{return new Date(v+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
 catch(_){return v}
}
function dateRange(obj){return dateFr(obj.valid_from)+' → '+dateFr(obj.valid_until)}
function isoWeekLabel(row){
 const n=row.iso_week;return n?'Semaine '+String(n).padStart(2,'0')+(row.iso_year?' · '+row.iso_year:''):'Semaine non classée'
}
async function pdfJs(){
 if(window.pdfjsLib)return window.pdfjsLib;
 if(!window.__nethorPdfLoader)window.__nethorPdfLoader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.crossOrigin='anonymous';script.onload=()=>{
   if(!window.pdfjsLib)return reject(new Error('Moteur de lecture PDF non disponible'));
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   resolve(window.pdfjsLib)
  };
  script.onerror=()=>reject(new Error('Chargement du moteur PDF impossible. Vérifie ta connexion.'));
  document.head.appendChild(script)
 }).catch(e=>{window.__nethorPdfLoader=null;throw e});
 return window.__nethorPdfLoader
}
async function sha256(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')
}
/* Les résultats de l'extraction restent un brouillon : aucune checklist publiée ici. */
function autoSummary(result,meta,reports){
 const el=$('promoAutoSummary');el.hidden=false;
 el.innerHTML='<div class="promoAutoSummaryHead"><strong>Prospectus enregistré pour contrôle</strong><span class="promoAutoGood">✓</span></div>'+
 '<h3>'+escapeHtml(result.title)+'</h3>'+
 '<p><strong>Semaine :</strong> '+dateFr(result.week_start)+' au '+dateFr(result.week_end)+'</p>'+
 '<p><strong>Offres valables :</strong> '+dateFr(meta.from)+' au '+dateFr(meta.until)+'</p>'+
 '<div class="promoAutoMetrics"><span><strong>'+result.products+'</strong> produits provisoires</span>'+
 '<span><strong>'+reports.length+'</strong> pages parcourues</span>'+
 '<span><strong>'+result.uncertain+'</strong> à contrôler</span></div>'+
 '<p class="promoAutoWarning">Les produits détectés ne sont pas encore validés ni ajoutés à la liste d’installation.</p>';
}
function renderDraft(){
 const draft=state.draft,review=$('promoImportReview');
 if(!draft){review.hidden=true;return}
 const {analysis,file}=draft;
 $('promoDraftCount').textContent=file.name+' · '+analysis.reports.length+' pages · '+
  analysis.products.length+' produits proposés';
 $('promoValidFrom').value=analysis.meta?.from||'';
 $('promoValidUntil').value=analysis.meta?.until||'';
 const diagnostics=analysis.diagnostics||{},warnings=[];
 if(!analysis.meta)warnings.push('Dates non détectées avec certitude : indique la période exacte du catalogue.');
 if(diagnostics.unreadable_pages?.length)warnings.push('Pages sans texte exploitable : '+diagnostics.unreadable_pages.join(', ')+'. Vérification du PDF obligatoire.');
 if(diagnostics.ocr_failures)warnings.push('La reconnaissance OCR a rencontré '+diagnostics.ocr_failures+' erreur(s). Certaines offres peuvent manquer.');
 if(diagnostics.pages_without_detected_products?.length)
  warnings.push('Aucun produit détecté sur '+diagnostics.pages_without_detected_products.length+
   ' page(s) : '+diagnostics.pages_without_detected_products.join(', ')+'. Certaines pages sont purement publicitaires.');
 if(diagnostics.special_validity_pages?.length)
  warnings.push('Certaines rubriques ont leurs propres dates : pages '+diagnostics.special_validity_pages.join(', ')+'.');
 warnings.push('Les informations sont des propositions : les références non relues ne sont jamais publiées pour la mise en place.');
 $('promoDraftWarnings').innerHTML=warnings.map(w=>'<p>⚠ '+escapeHtml(w)+'</p>').join('');
 const offers=(diagnostics.general_offers||[]);
 const overview=$('promoDraftOfferOverview');
 if(overview){
  overview.hidden=!offers.length;
  overview.innerHTML=offers.length?'<strong>Opérations générales distinctes des articles individuels ('+offers.length+')</strong>'+
   '<p class="promoMuted">Elles peuvent concerner des marques ou rayons entiers : ce ne sont pas automatiquement des produits à installer.</p>'+
   '<ul>'+offers.slice(0,9).map(o=>'<li>'+escapeHtml(o.title)+' <small>page '+escapeHtml(o.page)+'</small></li>').join('')+'</ul>':'';
 }
 const preview=analysis.products.slice(0,12);
 $('promoDraftItems').innerHTML='<strong>Extrait des produits détectés ('+preview.length+
  ' premiers)</strong><div class="promoDraftList">'+
  preview.map(p=>'<div><span>'+escapeHtml(p.product_name)+' <small>p. '+p.source_page+
  '</small></span><b>'+escapeHtml(p.price_or_benefit)+'</b></div>').join('')+
  '</div>'+(analysis.products.length>12?'<p class="promoMuted">… et '+(analysis.products.length-12)+
  ' autres références à contrôler après enregistrement.</p>':'');
 review.hidden=false;
 review.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function importAutomatic(file){
 if(state.busy||!manager())return;
 if(!file||!/\.pdf$/i.test(file.name)||!['application/pdf',''].includes(file.type)){
  notify('Choisis un fichier PDF valide.','error');return
 }
 if(file.size>30*1024*1024){notify('Ce PDF dépasse la limite de 30 Mo.','error');return}
 if(state.draft&&!window.confirm('Remplacer le brouillon en cours ? Il n’a pas encore été enregistré.'))return;
 state.busy=true;state.draft=null;$('promoImportReview').hidden=true;
 $('promoDrop').setAttribute('aria-busy','true');
 $('promoDrop').classList.add('processing');$('promoDropTitle').textContent=file.name;
 $('promoAutoSummary').hidden=true;notify('');
 try{
  loading('Lecture PDF locale','Ouverture et lecture du prospectus…');
  const bytes=await file.arrayBuffer();
  if(String.fromCharCode(...new Uint8Array(bytes.slice(0,5)))!=='%PDF-')
   throw Error('Structure PDF non valide');
  const hash=await sha256(bytes);
  const previous=await db.from('promotion_catalogs').select('id,title').eq('file_sha256',hash).maybeSingle();
  if(previous.error)throw previous.error;
  if(previous.data){
   notify('PDF déjà enregistré : '+previous.data.title,'ok');
   await loadCatalogs();await openCatalog(previous.data.id);return
  }
  const analysis=await window.NethorPromotionsLocal.analyze({
   bytes,filename:file.name,pdfjs:await pdfJs(),
   onProgress:p=>loading('Extraction locale · page '+p.page+'/'+p.total,
    p.step+' · '+p.products+' produit(s) proposés')
  });
  // Les règles mémorisées améliorent les libellés sans recopier d'anciens prix.
  try{
   const feedback=await db.from('promotion_analysis_feedback')
    .select('id,source_key,source_excerpt,action,corrected_name,corrected_category,created_at')
    .order('created_at',{ascending:false}).limit(1500);
   if(!feedback.error&&window.NethorPromotionsFeedback){
    const learned=window.NethorPromotionsFeedback.useRules(analysis.products,feedback.data||[]);
    analysis.products=learned.products;analysis.diagnostics.feedback=learned.stats;
   }
  }catch(_){}
  if(!analysis.products.length)throw Error('Aucun produit exploitable après les exclusions.');
  analysis.diagnostics.uncertain_count=analysis.products.filter(p=>p.auto_uncertain).length;
  analysis.diagnostics.high_readability_count=analysis.products.length-analysis.diagnostics.uncertain_count;
  state.draft={file,hash,analysis};renderDraft();
  notify('Extraction locale terminée : vérifie les dates, puis enregistre les références pour contrôle.','ok');
 }catch(error){
  notify('Lecture PDF interrompue : '+(error?.message||String(error)),'error');
 }finally{
  state.busy=false;$('promoAutoProgress').hidden=true;
  $('promoDrop').classList.remove('processing');$('promoDrop').removeAttribute('aria-busy');
  $('promoFile').value='';
  $('promoDropTitle').textContent='Dépose un catalogue PDF pour préparer les produits';
 }
}
async function saveDraft(){
 if(state.busy||!manager()||!state.draft)return;
 let dates;
 try{dates=window.NethorPromotionsLocal.validateDates(
  $('promoValidFrom').value,$('promoValidUntil').value
 )}catch(e){notify(e.message,'error');return}
 const draft=state.draft,{file,hash,analysis}=draft,diagnostics=analysis.diagnostics;
 if(diagnostics.unreadable_pages?.length&&!window.confirm(
  'Attention : '+diagnostics.unreadable_pages.length+' page(s) n’ont pas pu être lues. Enregistrer ce catalogue incomplet pour correction manuelle ?'
 ))return;
 state.busy=true;$('promoConfirmImport').disabled=true;
 let storagePath=null,saved=false;
 try{
  loading('Enregistrement','Sauvegarde du PDF privé et des références provisoires…');
  const previous=await db.from('promotion_catalogs').select('id,title').eq('file_sha256',hash).maybeSingle();
  if(previous.error)throw previous.error;
  if(previous.data)throw Error('Ce PDF a déjà été enregistré : '+previous.data.title);
  storagePath=state.user.id+'/'+crypto.randomUUID()+'.pdf';
  const upload=await db.storage.from('promotion-pdfs').upload(storagePath,file,{
   contentType:'application/pdf',cacheControl:'3600',upsert:false
  });
  if(upload.error)throw upload.error;
  const {data,error}=await db.rpc('import_promotion_catalog_auto',{
   p_filename:file.name,p_storage_path:storagePath,p_file_sha256:hash,
   p_valid_from:dates.from,p_valid_until:dates.until,p_pages:analysis.reports.length,
   p_products:analysis.products.map(p=>({
    product_name:p.product_name,technical_details:p.technical_details,
    price_or_benefit:p.price_or_benefit,source_page:p.source_page,
    source_excerpt:p.source_excerpt,extraction_confidence:p.extraction_confidence||'review',
    category:p.category,auto_uncertain:!!p.auto_uncertain,price_unit:p.price_unit||'',
    additional_info:p.additional_info||'',source_block:p.source_block||{}
   })),p_diagnostics:diagnostics
  });
  if(error)throw error;
  saved=true;state.last=data;state.draft=null;$('promoImportReview').hidden=true;
  autoSummary(data,dates,analysis.reports);
  notify('Catalogue conservé pour validation : '+data.products+' produits, aucun publié pour installation.','ok');
  await loadCatalogs();await openCatalog(data.id);
 }catch(e){
  notify('Enregistrement impossible : '+(e?.message||String(e)),'error');
  if(storagePath&&!saved){
   try{await db.storage.from('promotion-pdfs').remove([storagePath])}catch(_){}
  }
 }finally{
  state.busy=false;$('promoConfirmImport').disabled=false;
  $('promoAutoProgress').hidden=true
 }
}

function collapseCatalog(){
 state.review?.destroy();state.review=null;
 state.selectedCatalogId=null;
 $('promoCatalogDetail').hidden=true;
 $('promoCatalogDetail').replaceChildren();
 reflectCatalogExpansion()
}
function reflectCatalogExpansion(){
 document.querySelectorAll('[data-promo-catalog]').forEach(button=>{
  const open=button.dataset.promoCatalog===state.selectedCatalogId;
  button.setAttribute('aria-expanded',String(open));
  const chevron=button.querySelector('.promoCatalogCaret');
  if(chevron)chevron.textContent=open?'⌃':'⌄'
 })
}
async function loadCatalogs(){
 const {data,error}=await db.from('promotion_catalogs')
  .select('id,title,source_filename,storage_path,valid_from,valid_until,week_start,week_end,iso_year,iso_week,extraction_state,unclassified_count,pages_total,imported_at')
  .order('imported_at',{ascending:false}).limit(100);
 if(error){$('promoCatalogList').innerHTML='<p class="promoMuted">Impossible de charger les promotions : '+escapeHtml(error.message)+'</p>';return}
 state.catalogs=data||[];
 if(state.selectedCatalogId&&!state.catalogs.some(p=>p.id===state.selectedCatalogId))collapseCatalog();
 $('promoCatalogList').innerHTML=state.catalogs.length?state.catalogs.map(p=>
  '<div class="promoCatalog">'+
  '<button class="promoCatalogToggle" type="button" data-promo-catalog="'+escapeHtml(p.id)+'" aria-expanded="'+(state.selectedCatalogId===p.id)+'" aria-controls="promoCatalogDetail">'+
  '<span><strong>'+escapeHtml(p.title)+'</strong>'+
  '<small>'+escapeHtml(isoWeekLabel(p))+' · Lundi '+dateFr(p.week_start)+' au '+dateFr(p.week_end)+'</small>'+
  '<small>Offres valables du '+dateRange(p)+' · '+p.pages_total+' pages'+
  (p.extraction_state==='partial'?' · Extraction partielle':'')+
  (p.extraction_state==='automatic_uncertain'?' · Contrôle nécessaire':'')+
  (p.unclassified_count?' · '+p.unclassified_count+' produit(s) incertain(s)':'')+
  '</small></span><span class="promoCatalogCaret" aria-hidden="true">'+(state.selectedCatalogId===p.id?'⌃':'⌄')+'</span></button>'+
  (manager()?'<button class="promoCatalogDelete" type="button" data-promo-delete-catalog="'+escapeHtml(p.id)+'" aria-label="Supprimer '+escapeHtml(p.title)+'">Supprimer</button>':'')+
  '</div>').join(''):
  '<p class="promoMuted">Aucun catalogue pour le moment. Dépose un PDF pour préparer une liste de produits à vérifier.</p>'
}
async function deleteCatalog(id){
 if(!manager()||state.reviewBusy)return;
 const cat=state.catalogs.find(x=>x.id===id);if(!cat)return;
 if(!window.confirm('Supprimer définitivement « '+cat.title+' » et toutes ses références ? Cette action est irréversible. La mémoire des corrections sera conservée.'))return;
 state.reviewBusy=true;
 try{
  const {data,error}=await db.rpc('delete_promotion_catalog',{p_catalog_id:id});
  if(error)throw error;
  if(state.selectedCatalogId===id)collapseCatalog();
  await loadCatalogs();
  const path=data?.storage_path;
  if(path){
   const removed=await db.storage.from('promotion-pdfs').remove([path]);
   if(removed.error){
    notify('Catalogue supprimé, mais le PDF privé n’a pas pu être nettoyé : '+removed.error.message,'error');
    return
   }
  }
  notify('Catalogue « '+cat.title+' » et '+(data?.products||0)+' référence(s) supprimés.','ok')
 }catch(e){notify('Suppression impossible : '+(e.message||String(e)),'error')}
 finally{state.reviewBusy=false}
}
async function toggleCatalog(id){
 if(state.selectedCatalogId===id){collapseCatalog();return}
 await openCatalog(id)
}
/* Étape 3 : atelier de validation, indépendant de l'import PDF. */
async function openCatalog(id){
 const cat=state.catalogs.find(x=>x.id===id);if(!cat)return;
 state.review?.destroy();state.review=null;
 state.selectedCatalogId=id;
 reflectCatalogExpansion();
 const detail=$('promoCatalogDetail');detail.hidden=false;
 detail.innerHTML='<p class="promoMuted">Chargement de l’atelier de contrôle…</p>';
 const {data,error}=await db.from('promotion_products')
  .select('*').eq('catalog_id',id).order('position').limit(2000);
 if(state.selectedCatalogId!==id)return;
 if(error){detail.textContent='Erreur : '+error.message;return}
 if(!window.NethorPromotionsReview){detail.textContent='Atelier indisponible : recharge la page.';return}
 state.review=window.NethorPromotionsReview.mount({
  detail,cat,rows:data||[],db,canManage:manager(),pdfJs,notify,onCollapse:collapseCatalog
 });
}

async function boot(){
 if(!window.supabase||!window.NethorPromotionsLocal||!window.NethorPromotionsBlocks||!window.NethorPromotionParser||!window.NethorPromotionsReview){notify('Le module Promotions n’a pas été chargé. Recharge la page.','error');return}
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError||!session){location.replace('index.html');return}
 state.user=session.user;
 const {data,error}=await db.from('profiles').select('display_name,role,account_enabled').eq('id',session.user.id).maybeSingle();
 if(error||!data||data.account_enabled===false){location.replace('home.html');return}
 state.profile=data;$('promoImport').hidden=!manager();
 if(manager()){
  const drop=$('promoDrop');
  drop.addEventListener('click',event=>{if(event.target!==$('promoFile')&&!state.busy)$('promoFile').click()});
  drop.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!state.busy){e.preventDefault();$('promoFile').click()}});
  drop.addEventListener('dragover',e=>{e.preventDefault();if(!state.busy)drop.classList.add('dragover')});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');if(!state.busy)importAutomatic(e.dataTransfer?.files?.[0])});
  $('promoFile').addEventListener('change',e=>{if(!state.busy)importAutomatic(e.target.files?.[0])})
  $('promoConfirmImport').addEventListener('click',saveDraft);
  $('promoCancelImport').addEventListener('click',()=>{
   if(state.busy)return;
   state.draft=null;$('promoImportReview').hidden=true;notify('Brouillon abandonné. Aucun catalogue enregistré.');
  });
 }
 $('promoCatalogList').addEventListener('click',e=>{
  const deleteButton=e.target.closest('[data-promo-delete-catalog]');
  if(deleteButton){deleteCatalog(deleteButton.dataset.promoDeleteCatalog);return}
  const button=e.target.closest('[data-promo-catalog]');if(button)toggleCatalog(button.dataset.promoCatalog)
 });
 await loadCatalogs()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>notify(e.message,'error')),{once:true});
else boot().catch(e=>notify(e.message,'error'))
})();

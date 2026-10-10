/* Nethor Promotions — import PDF entièrement automatique, indexé par semaine ISO. */
(function(){
'use strict';
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const PUBLIC_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=window.supabase.createClient(SUPABASE_URL,PUBLIC_KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={user:null,profile:null,busy:false,catalogs:[],last:null,selectedCatalogId:null,reviewBusy:false};
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
async function extractPDF(bytes){
 const pdf=await pdfJs();
 if(String.fromCharCode(...new Uint8Array(bytes).slice(0,5))!=='%PDF-')
  throw new Error('Ce fichier ne présente pas un en-tête PDF valide.');
 const task=pdf.getDocument({data:new Uint8Array(bytes.slice(0))});
 try{
  const doc=await task.promise;
  if(doc.numPages<1||doc.numPages>150)
   throw new Error('Le module accepte les catalogues de 1 à 150 pages.');
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
   loading('Extraction des références','Analyse de la page '+n+' sur '+doc.numPages+'…');
   const page=await doc.getPage(n),viewport=page.getViewport({scale:1});
   const {items}=await page.getTextContent();
   let lines=window.NethorPromotionParser.linesForPage(items,viewport.width,viewport.height);
   let source_mode='pdf-text',ocr_error='';
   // Les cartouches promotionnels peuvent être des images dans un PDF textuel.
   // Si les glyphes sélectionnables sont absents ou ne contiennent aucun prix,
   // compléter avec l'OCR français local en conservant la géométrie des mots.
   const hasPrice=lines.some(l=>/[€]|\d+[.,]\d{2}/.test(l.text));
   if((lines.length<10||!hasPrice)&&window.NethorPromotionsOCR){
    try{
     const scanned=await window.NethorPromotionsOCR.scanPage(
      page,viewport,window.NethorPromotionParser,
      message=>loading('Reconnaissance des encadrés',message+' · page '+n+'/'+doc.numPages));
     if(scanned.length>=5&&(scanned.length>lines.length||!hasPrice)){
      lines=scanned;source_mode='ocr-local'
     }
    }catch(e){ocr_error=String(e?.message||e).slice(0,200)}
   }
   pages.push({number:n,width:viewport.width,height:viewport.height,
    lines,source_mode,ocr_error});
   page.cleanup()
  }
  return pages
 }finally{
  await task.destroy().catch(()=>{});
  await window.NethorPromotionsOCR?.close?.().catch(()=>{})
 }
}
function autoSummary(result,meta,report){
 const warnings=report.filter(x=>!x.hasText),unmatched=report.reduce((n,x)=>n+x.unmatched,0);
 const el=$('promoAutoSummary');
 el.hidden=false;
 el.innerHTML='<div class="promoAutoSummaryHead"><strong>Catalogue enregistré automatiquement</strong><span class="promoAutoGood">✓</span></div>'+
  '<h3>'+escapeHtml(result.title)+'</h3>'+
  '<p><strong>Semaine de rattachement :</strong> '+dateFr(result.week_start)+' au '+dateFr(result.week_end)+'</p>'+
  '<p><strong>Validité réelle :</strong> '+dateFr(meta.from)+' au '+dateFr(meta.until)+'</p>'+
  '<div class="promoAutoMetrics"><span><strong>'+result.products+'</strong> références</span>'+
  '<span><strong>'+result.uncertain+'</strong> à affiner</span><span><strong>'+report.length+'</strong> pages analysées</span></div>'+
  (warnings.length?'<p class="promoAutoWarning">Pages sans texte : '+warnings.map(x=>x.number).join(', ')+'. Ces pages peuvent nécessiter un OCR.</p>':'')+
  (unmatched?'<p class="promoAutoInfo">'+unmatched+' passages non associés à une référence : ces informations sont conservées dans le diagnostic du catalogue.</p>':'')
}
function classifyDiagnostics(reports,products){
 const textless=reports.filter(p=>!p.hasText);
 return {
  engine:'nethor-pdf-spatial-tiles-ocr-v3',
  total_pages:reports.length,textless_pages:textless.length,
  textless_page_numbers:textless.map(p=>p.number),
  candidate_count:products.length,
  uncertain_count:products.filter(p=>p.auto_uncertain).length,
  unmatched_passage_count:reports.reduce((n,p)=>n+p.unmatched,0),
  pages:reports.map(p=>({page:p.number,lines:p.lines,products:p.detected,
   blocks:p.blocks_detected||0,analysis_mode:p.analysis_mode||'unknown',
   source_mode:p.source_mode||'pdf-text',ocr_error:p.ocr_error||'',
   uncertain:p.uncertain,unmatched:p.unmatched,has_text:p.hasText}))
 }
}
async function importAutomatic(file){
 if(state.busy||!manager())return;
 if(!file||!/\.pdf$/i.test(file.name)||!['application/pdf',''].includes(file.type)){
  notify('Le fichier doit être un PDF.','error');return
 }
 if(file.size>30*1024*1024){notify('PDF trop volumineux : 30 Mo maximum.','error');return}
 state.busy=true;$('promoDrop').setAttribute('aria-busy','true');
 $('promoDrop').classList.add('processing');
 $('promoDropTitle').textContent=file.name;
 $('promoAutoSummary').hidden=true;notify('');
 let storagePath=null,imported=false;
 try{
  loading('Analyse automatique','Lecture du catalogue et recherche des références…');
  const bytes=await file.arrayBuffer();
  const hash=await sha256(bytes);
  // Empêche deux importations du même PDF, quel que soit son nom.
  const previous=await db.from('promotion_catalogs').select('id,title')
    .eq('file_sha256',hash).maybeSingle();
  if(previous.error)throw previous.error;
  if(previous.data){
   notify('Ce PDF est déjà enregistré : '+previous.data.title+'.','ok');
   await loadCatalogs();await openCatalog(previous.data.id);
   return
  }
  const pages=await extractPDF(bytes);
  if(!pages.some(page=>page.lines.some(x=>x.text.length>=4)))
   throw new Error('Ce PDF ne contient pas de texte exploitable. Un OCR est nécessaire pour lire un catalogue scanné ; aucune référence fictive n’est créée.');
  loading('Détection des dates','Recherche de la période de promotion dans le catalogue…');
  const meta=window.NethorPromotionParser.extractMetadata(pages,file.name);
  if(!meta)throw new Error('Impossible de trouver des dates de début et fin fiables dans ce catalogue. Aucun calendrier ou titre inventé : le PDF ne sera pas enregistré.');
  const {products,reports}=window.NethorPromotionsBlocks.parsePages(pages,window.NethorPromotionParser);
  reports.forEach(report=>{
   const matching=pages.find(page=>page.number===report.number);
   report.source_mode=matching?.source_mode||'pdf-text';
   report.ocr_error=matching?.ocr_error||''
  });
  if(!products.length)throw new Error('Aucun produit identifiable dans ce PDF. Import interrompu sans créer de fausses références.');
  if(products.length>2000)throw new Error('Plus de 2 000 références détectées : limite du module actuel.');
  const diagnostics=classifyDiagnostics(reports,products);
  let selectedProducts=products;
  try{
   const feedback=await db.from('promotion_analysis_feedback')
    .select('id,source_key,source_excerpt,action,corrected_name,corrected_category,created_at')
    .order('created_at',{ascending:false}).limit(1500);
   if(!feedback.error){
    const learned=window.NethorPromotionsFeedback.useRules(products,feedback.data||[]);
    selectedProducts=learned.products;
    diagnostics.feedback=learned.stats
   }else diagnostics.feedback_error='Mémoire des corrections indisponible'
  }catch(_){diagnostics.feedback_error='Mémoire des corrections indisponible'}
  if(!selectedProducts.length)throw new Error('Toutes les propositions ont été écartées par des corrections antérieures. Aucune référence enregistrée.');
  loading('Catégorisation automatique',selectedProducts.length+' produits détectés · '+meta.title);
  storagePath=state.user.id+'/'+crypto.randomUUID()+'.pdf';
  const saved=await db.storage.from('promotion-pdfs').upload(storagePath,file,{
   contentType:'application/pdf',cacheControl:'3600',upsert:false
  });
  if(saved.error)throw saved.error;
  loading('Enregistrement sécurisé','Rattachement à la semaine '+meta.iso_week+' du '+dateFr(meta.week_start)+'…');
  const result=await db.rpc('import_promotion_catalog_auto',{
   p_filename:file.name,p_storage_path:storagePath,p_file_sha256:hash,
   p_valid_from:meta.from,p_valid_until:meta.until,p_pages:reports.length,
   p_products:selectedProducts.map(p=>({
    product_name:p.product_name,technical_details:p.technical_details,
    price_or_benefit:p.price_or_benefit,source_page:p.source_page,
    source_excerpt:p.source_excerpt,extraction_confidence:p.extraction_confidence,
    category:p.category,auto_uncertain:p.auto_uncertain,
    price_unit:p.price_unit||'',additional_info:p.additional_info||'',
    source_block:p.source_block||{}
   })),
   p_diagnostics:diagnostics
  });
  if(result.error)throw result.error;
  imported=true;state.last=result.data;
  autoSummary(result.data,meta,reports);
  notify('Import terminé : '+result.data.products+' références enregistrées sous '+result.data.title+'.','ok');
  await loadCatalogs();
  await openCatalog(result.data.id)
 }catch(error){
  notify('Import interrompu : '+(error?.message||String(error)),'error');
  // Ne laisser aucun fichier orphelin lorsqu'une transaction DB échoue.
  if(storagePath&&!imported){try{await db.storage.from('promotion-pdfs').remove([storagePath])}catch(_){}}
 }finally{
  state.busy=false;$('promoAutoProgress').hidden=true;
  $('promoDrop').classList.remove('processing');
  $('promoDrop').removeAttribute('aria-busy');
  $('promoFile').value='';
  if(!imported)$('promoDropTitle').textContent='Dépose ton catalogue PDF pour lancer l’analyse'
 }
}

function collapseCatalog(){
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
  (p.unclassified_count?' · '+p.unclassified_count+' produit(s) incertain(s)':'')+
  '</small></span><span class="promoCatalogCaret" aria-hidden="true">'+(state.selectedCatalogId===p.id?'⌃':'⌄')+'</span></button>'+
  (manager()?'<button class="promoCatalogDelete" type="button" data-promo-delete-catalog="'+escapeHtml(p.id)+'" aria-label="Supprimer '+escapeHtml(p.title)+'">Supprimer</button>':'')+
  '</div>').join(''):
  '<p class="promoMuted">Aucun catalogue pour le moment. Dépose un PDF pour démarrer automatiquement l’analyse.</p>'
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
const promoStatusLabels={pending:'À vérifier',validated:'Validé',reworked:'Retravaillé',rejected:'Refusé'};
async function openCatalog(id){
 const cat=state.catalogs.find(x=>x.id===id);if(!cat)return;
 state.selectedCatalogId=id;
 reflectCatalogExpansion();
 const detail=$('promoCatalogDetail');
 detail.hidden=false;
 detail.innerHTML='<p class="promoMuted">Chargement des références…</p>';
 const {data,error}=await db.from('promotion_products')
  .select('id,position,product_name,technical_details,price_or_benefit,price_unit,additional_info,source_excerpt,source_block,category,auto_uncertain,review_status,reviewed_at,source_page')
  .eq('catalog_id',id).order('position').limit(2000);
 if(state.selectedCatalogId!==id)return;
 if(error){detail.textContent='Erreur : '+error.message;return}
 const products=data||[];
 const totals={pending:0,validated:0,reworked:0,rejected:0};
 products.forEach(p=>{const key=p.review_status||'pending';if(Object.hasOwn(totals,key))totals[key]++});
 const categories=[...new Set(['Fruits et légumes','Frais et crémerie','Surgelés','Boissons','Animaux',
  'Hygiène et entretien','Épicerie sucrée','Épicerie salée','Boulangerie','Maison','À classer',
  ...products.map(p=>p.category||'À classer')])].sort((a,b)=>a.localeCompare(b,'fr'));
 const options=categories.map(s=>'<option value="'+escapeHtml(s)+'">'+escapeHtml(s)+'</option>').join('');
 detail.innerHTML='<div class="promoDetailsHead"><div><h3>'+escapeHtml(cat.title)+'</h3>'+
  '<p>'+products.length+' références · du '+dateRange(cat)+'</p>'+
  '<p>Semaine '+cat.iso_week+' ('+dateFr(cat.week_start)+' au '+dateFr(cat.week_end)+')</p>'+
  '<p class="promoReviewCounts">'+totals.validated+' validées · '+totals.reworked+' retravaillées · '+
  totals.rejected+' refusées · '+totals.pending+' à vérifier</p></div>'+
  '<div class="promoDetailsActions">'+
   (manager()?'<button type="button" class="promoSecondary" id="promoHistoricPdf">PDF source ↗</button>':'')+
   '<button type="button" class="promoSecondary" id="promoCollapse">Replier ↑</button>'+
   '<input type="search" id="promoCatalogSearch" placeholder="Rechercher une référence…" aria-label="Rechercher une référence">'+
   '<select id="promoCategoryFilter" aria-label="Filtrer par catégorie"><option value="">Toutes les catégories</option>'+
   options+'</select></div></div>'+
  (manager()?'<label class="promoRejectedSwitch"><input type="checkbox" id="promoShowRejected"> Afficher les produits refusés ('+totals.rejected+')</label>':'')+
  '<div id="promoProductEditor" class="promoProductEditor" hidden></div>'+
  '<div class="promoTableWrap"><table class="promoProductTable"><thead><tr><th>Référence</th>'+
  '<th>Informations techniques</th><th>Prix ou avantage</th><th>Catégorie</th><th>Page</th>'+
  (manager()?'<th>Contrôle</th>':'')+'</tr></thead><tbody id="promoCatalogRows"></tbody></table></div>';
 const search=$('promoCatalogSearch'),category=$('promoCategoryFilter'),
  rejected=$('promoShowRejected'),rows=$('promoCatalogRows'),editor=$('promoProductEditor');
 function render(){
  const needle=search.value.trim().toLocaleLowerCase('fr');
  const filter=category.value,showRejected=Boolean(rejected?.checked);
  const visible=products.filter(p=>(p.review_status!=='rejected'||showRejected)&&
   (!filter||(p.category||'À classer')===filter)&&
   [p.product_name,p.technical_details,p.price_or_benefit,p.price_unit,p.additional_info]
    .some(value=>String(value||'').toLocaleLowerCase('fr').includes(needle)));
  rows.innerHTML=visible.map(p=>'<tr class="'+(p.review_status==='rejected'?'promoRowRejected':'')+'"><td>'+
   '<strong>'+escapeHtml(p.product_name)+'</strong>'+
   '<small class="promoReviewBadge promoStatus-'+escapeHtml(p.review_status||'pending')+'">'+
   escapeHtml(promoStatusLabels[p.review_status]||promoStatusLabels.pending)+'</small>'+
   (p.auto_uncertain&&p.review_status==='pending'?'<small class="promoUncertain">À affiner</small>':'')+
   '</td><td>'+escapeHtml(p.technical_details||'—')+'</td><td><strong>'+escapeHtml(p.price_or_benefit)+'</strong>'+
   (p.price_unit?'<small class="promoItemUnit">'+escapeHtml(p.price_unit)+'</small>':'')+
   (p.additional_info?'<small class="promoItemExtra">'+escapeHtml(p.additional_info)+'</small>':'')+
   '</td><td>'+escapeHtml(p.category||'À classer')+'</td><td>'+p.source_page+'</td>'+
   (manager()?'<td><div class="promoReviewButtons">'+
     '<button type="button" class="promoReviewValidate" data-promo-action="validated" data-product-id="'+escapeHtml(p.id)+'">Valider</button>'+
     '<button type="button" class="promoReviewEdit" data-promo-action="edit" data-product-id="'+escapeHtml(p.id)+'">Retravailler</button>'+
     '<button type="button" class="promoReviewReject" data-promo-action="rejected" data-product-id="'+escapeHtml(p.id)+'">Refuser</button>'+
     '</div></td>':'')+'</tr>').join('')||
    '<tr><td colspan="'+(manager()?6:5)+'" class="promoMuted">Aucun produit à afficher pour ce filtre.</td></tr>'
 }
 function editProduct(product){
  editor.hidden=false;
  editor.innerHTML='<h4>Retravailler : '+escapeHtml(product.product_name)+'</h4>'+
   '<p>Corrige la fiche. Le nom et le rayon pourront être appris lors des prochaines analyses ; les prix resteront propres à chaque catalogue.</p>'+
   '<form id="promoEditForm" class="promoEditFields">'+
   '<label>Nom complet<input name="product_name" maxlength="500" required value="'+escapeHtml(product.product_name)+'"></label>'+
   '<label>Rayon<select name="category">'+options+'</select></label>'+
   '<label>Informations techniques<textarea name="technical_details" maxlength="1200">'+escapeHtml(product.technical_details)+'</textarea></label>'+
   '<label>Prix ou avantage<textarea name="price_or_benefit" maxlength="1200" required>'+escapeHtml(product.price_or_benefit)+'</textarea></label>'+
   '<label>Unité de prix<input name="price_unit" maxlength="120" value="'+escapeHtml(product.price_unit||'')+'"></label>'+
   '<label>Informations supplémentaires<textarea name="additional_info" maxlength="1200">'+escapeHtml(product.additional_info||'')+'</textarea></label>'+
   '<div class="promoEditActions"><button type="button" class="promoSecondary" id="promoEditCancel">Annuler</button>'+
   '<button type="submit" class="promoPrimary">Enregistrer les corrections</button></div></form>';
  editor.querySelector('select[name="category"]').value=product.category||'À classer';
  editor.querySelector('#promoEditCancel').onclick=()=>{editor.hidden=true;editor.replaceChildren()};
  editor.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const form=event.currentTarget;
   const fields={};
   for(const name of ['product_name','category','technical_details','price_or_benefit','price_unit','additional_info'])
    fields[name]=form.elements.namedItem(name)?.value?.trim()||'';
   if(fields.product_name.length<2||!fields.category||!fields.price_or_benefit){
    notify('Nom, rayon et prix/avantage sont obligatoires.','error');return
   }
   await reviewProduct(product.id,'reworked',fields)
  };
  editor.scrollIntoView({behavior:'smooth',block:'nearest'})
 }
 async function reviewProduct(productId,action,fields={}){
  if(!manager()||state.reviewBusy)return;
  if(action==='rejected'&&!window.confirm('Refuser ce produit ? Il sera masqué de la liste courante et le moteur mémorisera cette décision.'))return;
  state.reviewBusy=true;
  try{
   const {error}=await db.rpc('review_promotion_product',{
    p_product_id:productId,p_action:action,p_fields:fields
   });
   if(error)throw error;
   notify(action==='validated'?'Produit validé.':
    action==='reworked'?'Produit corrigé. Ses informations serviront aux prochaines analyses.':
    'Produit refusé. Il est masqué et la décision est mémorisée.','ok');
   await openCatalog(id)
  }catch(e){notify('Impossible de modifier la référence : '+(e.message||String(e)),'error')}
  finally{state.reviewBusy=false}
 }
 render();
 search.addEventListener('input',render);
 category.addEventListener('change',render);
 rejected?.addEventListener('change',render);
 detail.onclick=async event=>{
  if(event.target.closest('#promoCollapse')){collapseCatalog();return}
  const button=event.target.closest('[data-promo-action]');if(!button)return;
  const product=products.find(p=>p.id===button.dataset.productId);
  if(!product)return;
  if(button.dataset.promoAction==='edit')return editProduct(product);
  await reviewProduct(product.id,button.dataset.promoAction)
 };
 if(manager())$('promoHistoricPdf')?.addEventListener('click',async()=>{
  const {data,error}=await db.storage.from('promotion-pdfs').createSignedUrl(cat.storage_path,90);
  if(error||!data?.signedUrl){notify('Impossible d’ouvrir le PDF original : '+(error?.message||'lien indisponible'),'error');return}
  window.open(data.signedUrl,'_blank','noopener')
 })
}
async function boot(){
 if(window.NethorPlatform?.isMobile?.()){location.replace('mobile.html');return}
 if(!window.supabase||!window.NethorPromotionParser){notify('Le module Promotions n’a pas été chargé. Recharge la page.','error');return}
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError||!session){location.replace('index.html');return}
 state.user=session.user;
 const {data,error}=await db.from('profiles').select('display_name,role,account_enabled').eq('id',session.user.id).maybeSingle();
 if(error||!data||data.account_enabled===false){location.replace('home.html');return}
 state.profile=data;$('promoImport').hidden=!manager();
 if(manager()){
  const drop=$('promoDrop');
  drop.addEventListener('click',()=>{if(!state.busy)$('promoFile').click()});
  drop.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!state.busy){e.preventDefault();$('promoFile').click()}});
  drop.addEventListener('dragover',e=>{e.preventDefault();if(!state.busy)drop.classList.add('dragover')});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');if(!state.busy)importAutomatic(e.dataTransfer?.files?.[0])});
  $('promoFile').addEventListener('change',e=>{if(!state.busy)importAutomatic(e.target.files?.[0])})
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

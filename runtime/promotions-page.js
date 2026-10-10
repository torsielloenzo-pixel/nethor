/* Nethor · Promotions : import PDF, relecture et catalogues Supabase. */
(function(){
'use strict';
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co',KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={user:null,profile:null,file:null,originalUrl:null,products:[],reports:[],catalogs:[],filter:0,busy:false};
const manager=()=>['admin','role_point-de-vente'].includes(state.profile?.role);
function alertText(message,kind=''){const node=$('promoAlert');node.textContent=message;node.className='promoAlert '+kind;node.hidden=!message}
function dateFr(date){if(!date)return'';try{return new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}catch(_){return date}}
function busy(toggle){state.busy=toggle;for(const id of ['promoExtract','promoSave','promoAdd']){const b=$(id);if(b)b.disabled=toggle||id==='promoExtract'&&!state.file}if(!toggle)updateSaveState()}
async function pdfJs(){
 if(window.pdfjsLib)return window.pdfjsLib;
 if(!window.__nethorPdfLoader){
  window.__nethorPdfLoader=new Promise((resolve,reject)=>{
   const s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
   s.crossOrigin='anonymous';s.onload=()=>{
    if(!window.pdfjsLib)return reject(new Error('Librairie PDF indisponible'));
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    resolve(window.pdfjsLib)
   };
   s.onerror=()=>reject(new Error('Impossible de charger la lecture PDF. Vérifie la connexion.'));
   document.head.appendChild(s)
  }).catch(e=>{window.__nethorPdfLoader=null;throw e})
 }
 return window.__nethorPdfLoader
}
function pickFile(file){
 if(!file)return;
 if(!(/\.pdf$/i.test(file.name))||!['application/pdf',''].includes(file.type)){
  alertText('Choisis un document PDF valide.','error');return
 }
 if(file.size>30*1024*1024){alertText('Le PDF dépasse la limite de 30 Mo.','error');return}
 if(state.originalUrl)URL.revokeObjectURL(state.originalUrl);
 state.file=file;state.originalUrl=URL.createObjectURL(file);
 $('promoDropTitle').textContent=file.name+' · '+(file.size/1024/1024).toFixed(1)+' Mo';
 if(!$('promoTitle').value.trim())$('promoTitle').value=file.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ');
 $('promoExtract').disabled=false;resetReview();alertText('')
}
function resetReview(){
 state.products=[];state.reports=[];state.filter=0;$('promoReview').hidden=true;updateSaveState()
}
async function extractPdf(){
 if(state.busy||!state.file)return;
 busy(true);resetReview();
 try{
  alertText('Ouverture et analyse du PDF…');
  const pdf=await pdfJs();
  const bytes=new Uint8Array(await state.file.arrayBuffer());
  if(String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('Le fichier ne contient pas une structure PDF reconnue.');
  const task=pdf.getDocument({data:bytes});
  const doc=await task.promise;
  if(doc.numPages<1||doc.numPages>150)throw Error('Ce premier module accepte les catalogues de 1 à 150 pages.');
  const pages=[],topTexts=[];let chars=0;
  for(let p=1;p<=doc.numPages;p++){
   alertText('Lecture du PDF · page '+p+' / '+doc.numPages+'…');
   const page=await doc.getPage(p),view=page.getViewport({scale:1}),text=await page.getTextContent();
   const lines=window.NethorPromotionParser.linesForPage(text.items,view.width,view.height);
   pages.push({number:p,lines});
   const count=lines.reduce((n,x)=>n+x.text.length,0);chars+=count;
   if(p<=3)topTexts.push(lines.map(x=>x.text).join(' '));
   page.cleanup()
  }
  await task.destroy();
  if(chars<30||pages.every(p=>p.lines.length===0))throw Error('Ce PDF semble être un scan ou une image. L’extraction du texte est impossible sans OCR : aucune référence n’a été inventée.');
  const parsed=window.NethorPromotionParser.parsePages(pages);
  state.products=parsed.products;state.reports=parsed.reports;
  const dates=window.NethorPromotionParser.suggestDates(topTexts.join(' '));
  if(dates){if(!$('promoStart').value)$('promoStart').value=dates.from;if(!$('promoEnd').value)$('promoEnd').value=dates.until}
  $('promoReview').hidden=false;
  state.filter=1;renderReview();
  const empty=parsed.reports.filter(p=>!p.hasText).map(p=>p.number);
  alertText(empty.length
   ?'Attention : pages sans texte détecté ('+empty.join(', ')+'). Un OCR est nécessaire pour garantir que ces pages ne contiennent pas de références oubliées. Enregistrement bloqué.':'Extraction terminée : '+parsed.products.length+' propositions de référence. Relis chaque page et complète les produits ou offres manquants avant enregistrement.',empty.length?'error':'');
  $('promoReview').scrollIntoView({behavior:'smooth',block:'start'})
 }catch(error){resetReview();alertText(error.message||'Impossible de lire ce PDF.','error')}
 finally{busy(false)}
}
function updateSaveState(){
 const good=state.reports.length>0&&state.reports.every(p=>p.checked&&p.hasText)
  &&state.products.length>0&&state.products.every(p=>String(p.product_name).trim().length>=2&&String(p.price_or_benefit).trim().length>=1&&p.source_page>=1);
 $('promoSave').disabled=state.busy||!good;
 $('promoSave').title=good?'Enregistrer le catalogue et ses références':'Vérifie toutes les pages et renseigne le nom ainsi que le prix / avantage de chaque produit.'
}
function renderReview(){
 const n=state.products.length,reviewed=state.reports.filter(p=>p.checked).length,total=state.reports.length;
 $('promoStats').innerHTML='<span class="promoStat"><strong>'+n+'</strong> références à vérifier</span>'+
  '<span class="promoStat"><strong>'+reviewed+'/'+total+'</strong> pages vérifiées</span>'+
  '<span class="promoStat"><strong>'+state.reports.reduce((s,p)=>s+p.review.length,0)+'</strong> passages non associés</span>';
 $('promoPages').innerHTML=state.reports.map(p=>'<label class="promoPageRow"><span>Page '+p.number+' · '+state.products.filter(x=>x.source_page===p.number).length+' réf.'+(p.hasText?'':' · OCR requis')+'</span><input type="checkbox" data-promo-review-page="'+p.number+'" '+(p.checked?'checked':'')+' '+(!p.hasText?'disabled':'')+' aria-label="Page '+p.number+' relue"></label>').join('');
 $('promoPageFilter').innerHTML=state.reports.map(p=>'<option value="'+p.number+'" '+(p.number===state.filter?'selected':'')+'>Page '+p.number+' · '+state.products.filter(x=>x.source_page===p.number).length+' référence(s)</option>').join('');
 renderItems();updateSaveState()
}
function renderItems(){
 const filtered=state.products.map((p,i)=>({...p,i})).filter(p=>p.source_page===state.filter);
 $('promoItems').innerHTML=filtered.length?filtered.map(p=>
  '<article class="promoItem" data-item="'+p.i+'">'+
   '<div class="promoItemHead"><strong>Référence '+(p.i+1)+' · Page '+p.source_page+'</strong><span>'+({review:'Extraction à contrôler',manual:'Ajout manuel',high:'Extraction'}[p.extraction_confidence]||'À contrôler')+'</span></div>'+
   '<div class="promoItemFields"><label>1. Référence · Nom complet<input data-promo-field="product_name" data-index="'+p.i+'" maxlength="500" value="'+esc(p.product_name)+'" aria-label="Nom du produit"></label>'+
   '<label>2. Informations techniques · Grammage, prix au kilo…<textarea data-promo-field="technical_details" data-index="'+p.i+'" maxlength="1200">'+esc(p.technical_details)+'</textarea></label>'+
   '<label>3. Prix ou avantage · Condition, caisse, carte…<textarea data-promo-field="price_or_benefit" data-index="'+p.i+'" maxlength="1200">'+esc(p.price_or_benefit)+'</textarea></label></div>'+
   '<div class="promoItemActions"><span>Source PDF : page '+p.source_page+'</span><button type="button" class="promoDelete" data-promo-delete="'+p.i+'">Retirer cette proposition</button></div></article>').join('')
   :'<p class="promoMuted">Aucune référence détectée sur cette page. Vérifie-la dans le PDF et ajoute les produits manuellement.</p>';
 const report=state.reports.find(p=>p.number===state.filter);
 const unresolved=report?.review||[];
 $('promoUnresolved').innerHTML=unresolved.slice(0,120).map((line,i)=>'<div class="promoReviewPassage"><span>'+esc(line.text)+'</span><button data-promo-from-line="'+i+'" type="button">Ajouter comme référence</button></div>').join('')+
  (unresolved.length>120?'<p class="promoMuted">+'+(unresolved.length-120)+' autres passages : consulte le PDF original.</p>':'');
}
function addProduct(text='',page=state.filter){
 if(!state.reports.find(p=>p.number===page))return;
 state.products.push({product_name:text||'',technical_details:'',price_or_benefit:'',source_page:page,source_excerpt:text,
  extraction_confidence:'manual'});
 const report=state.reports.find(x=>x.number===page);if(report)report.checked=false;
 state.filter=page;renderReview();
 $('promoItems').lastElementChild?.querySelector('input')?.focus();
}
function bindReview(){
 $('promoPageFilter').addEventListener('change',e=>{state.filter=Number(e.target.value);renderItems()});
 $('promoAdd').addEventListener('click',()=>addProduct());
 $('promoPages').addEventListener('change',e=>{
  const n=Number(e.target.dataset.promoReviewPage);const p=state.reports.find(x=>x.number===n);
  if(p&&p.hasText)p.checked=e.target.checked;renderReview()
 });
 $('promoItems').addEventListener('input',e=>{
  const field=e.target.dataset.promoField,index=Number(e.target.dataset.index);
  if(!['product_name','technical_details','price_or_benefit'].includes(field)||!state.products[index])return;
  state.products[index][field]=e.target.value;state.products[index].extraction_confidence='manual';
  const sourcePage=state.products[index].source_page;
  state.reports.find(x=>x.number===sourcePage).checked=false;
  const checkbox=document.querySelector('input[data-promo-review-page="'+sourcePage+'"]');
  if(checkbox)checkbox.checked=false;
  updateSaveState()
 });
 $('promoItems').addEventListener('click',e=>{
  const button=e.target.closest('[data-promo-delete]');
  if(!button)return;
  state.products.splice(Number(button.dataset.promoDelete),1);const report=state.reports.find(x=>x.number===state.filter);
  if(report)report.checked=false;renderReview()
 });
 $('promoUnresolved').addEventListener('click',e=>{
  const button=e.target.closest('[data-promo-from-line]');if(!button)return;
  const report=state.reports.find(p=>p.number===state.filter);const passage=report?.review.splice(Number(button.dataset.promoFromLine),1)[0];
  if(passage)addProduct(passage.text,state.filter)
 });
 $('promoCancel').addEventListener('click',()=>{resetReview();alertText('Analyse annulée ; aucun produit n’a été enregistré.')});
 $('promoSourceView').addEventListener('click',()=>{if(state.originalUrl)window.open(state.originalUrl+'#page='+state.filter,'_blank','noopener')});
 $('promoSave').addEventListener('click',saveImport);
}
async function saveImport(){
 if(state.busy||!manager())return;
 updateSaveState();if($('promoSave').disabled)return;
 const title=$('promoTitle').value.trim(),from=$('promoStart').value,to=$('promoEnd').value;
 if(title.length<2||!from||!to||to<from){alertText('Indique un nom de catalogue et des dates valides.','error');return}
 if(!window.confirm('As-tu bien contrôlé chaque page du PDF, les noms complets et toutes les conditions de prix ou de carte ? Confirmer l’enregistrement de '+state.products.length+' références ?'))return;
 busy(true);
 try{
  const path=state.user.id+'/'+crypto.randomUUID()+'.pdf';
  alertText('Enregistrement du PDF original dans l’espace privé…');
  const upload=await db.storage.from('promotion-pdfs').upload(path,state.file,{contentType:'application/pdf',cacheControl:'3600',upsert:false});
  if(upload.error)throw upload.error;
  alertText('Création atomique du catalogue et de ses références…');
  const payload=state.products.map(p=>({
   product_name:p.product_name.trim(),technical_details:p.technical_details.trim(),
   price_or_benefit:p.price_or_benefit.trim(),source_page:p.source_page,
   source_excerpt:String(p.source_excerpt||'').slice(0,1500),
   extraction_confidence:p.extraction_confidence||'review'
  }));
  const {data,error}=await db.rpc('import_promotion_catalog',{
   p_title:title,p_filename:state.file.name,p_storage_path:path,
   p_valid_from:from,p_valid_until:to,
   p_pages:state.reports.length,p_unclassified:state.reports.reduce((n,r)=>n+r.review.length,0),
   p_reviewed_pages:state.reports.map(r=>r.number),p_products:payload
  });
  if(error)throw error;
  alertText('Catalogue enregistré : '+payload.length+' références dans la base Promotions.','ok');
  resetReview();state.file=null;$('promoFile').value='';$('promoDropTitle').textContent='Glisser le catalogue PDF ici';
  if(state.originalUrl)URL.revokeObjectURL(state.originalUrl);state.originalUrl=null;
  await loadCatalogs();
  const item=state.catalogs.find(x=>x.id===data);
  if(item)await openCatalog(item.id)
 }catch(error){alertText('Enregistrement impossible : '+(error.message||String(error))+'. Vérifie le catalogue et réessaie si nécessaire.','error')}
 finally{busy(false)}
}
async function loadCatalogs(){
 const {data,error}=await db.from('promotion_catalogs').select('id,title,source_filename,storage_path,valid_from,valid_until,pages_total,imported_at').order('imported_at',{ascending:false}).limit(80);
 if(error){$('promoCatalogList').innerHTML='<p class="promoMuted">Impossible de charger les catalogues : '+esc(error.message)+'</p>';return}
 state.catalogs=data||[];
 $('promoCatalogList').innerHTML=state.catalogs.length?state.catalogs.map(p=>
  '<div class="promoCatalog"><button type="button" data-promo-catalog="'+esc(p.id)+'"><span><strong>'+esc(p.title)+'</strong>'+
  '<small>'+dateFr(p.valid_from)+' → '+dateFr(p.valid_until)+' · '+p.pages_total+' pages · '+esc(p.source_filename)+'</small></span><span class="promoCatalogCount" aria-hidden="true">%</span></button></div>').join(''):
  '<p class="promoMuted">Aucun catalogue importé pour le moment. Les futures références apparaîtront ici.</p>'
}
async function openCatalog(id){
 const p=state.catalogs.find(x=>x.id===id);if(!p)return;
 $('promoCatalogDetail').hidden=false;
 $('promoCatalogDetail').innerHTML='<p class="promoMuted">Chargement des références…</p>';
 const {data,error}=await db.from('promotion_products')
  .select('position,product_name,technical_details,price_or_benefit,source_page')
  .eq('catalog_id',id).order('position').limit(2000);
 if(error){$('promoCatalogDetail').textContent='Erreur : '+error.message;return}
 const all=data||[];
 $('promoCatalogDetail').innerHTML='<div class="promoDetailsHead"><div><h3>'+esc(p.title)+'</h3>'+
  '<p>'+all.length+' références · '+dateFr(p.valid_from)+' au '+dateFr(p.valid_until)+'</p></div>'+
  '<div class="promoDetailsActions">'+(manager()?'<button type="button" class="promoSecondary" id="promoHistoricPdf">Voir le PDF ↗</button>':'')+'<input type="search" id="promoCatalogSearch" placeholder="Rechercher une référence…" aria-label="Rechercher dans ce catalogue"></div></div>'+
  '<div style="overflow-x:auto"><table class="promoProductTable"><thead><tr><th>Référence / Nom complet</th><th>Informations techniques</th><th>Prix ou avantage</th><th>Page</th></tr></thead><tbody id="promoCatalogRows"></tbody></table></div>';
 const render=(q='')=>{
  const needle=q.trim().toLocaleLowerCase('fr');
  const filtered=all.filter(x=>[x.product_name,x.technical_details,x.price_or_benefit].some(s=>String(s||'').toLocaleLowerCase('fr').includes(needle)));
  $('promoCatalogRows').innerHTML=filtered.map(x=>'<tr><td>'+esc(x.product_name)+'</td><td>'+esc(x.technical_details||'—')+'</td><td>'+esc(x.price_or_benefit)+'</td><td>'+x.source_page+'</td></tr>').join('')
 };
 render();$('promoCatalogSearch').addEventListener('input',e=>render(e.target.value));
 if(manager())$('promoHistoricPdf')?.addEventListener('click',async()=>{
  const {data,error}=await db.storage.from('promotion-pdfs').createSignedUrl(p.storage_path,90);
  if(error||!data?.signedUrl)return alertText('PDF privé indisponible : '+(error?.message||'lien impossible'),'error');
  window.open(data.signedUrl,'_blank','noopener')
 });
 $('promoCatalogDetail').scrollIntoView({behavior:'smooth',block:'nearest'})
}
async function boot(){
 if(window.NethorPlatform?.isMobile?.()){location.replace('mobile.html');return}
 if(!window.supabase||!window.NethorPromotionParser){alertText('Les composants Promotions n’ont pas été chargés. Recharge la page.','error');return}
 const {data:{session},error:authError}=await db.auth.getSession();
 if(authError||!session){location.replace('index.html');return}
 state.user=session.user;
 const {data,error}=await db.from('profiles').select('display_name,role,account_enabled').eq('id',session.user.id).maybeSingle();
 if(error||!data||data.account_enabled===false){location.replace('home.html');return}
 state.profile=data;$('promoImport').hidden=!manager();
 bindReview();
 $('promoDrop').addEventListener('click',()=>{$('promoFile').click()});
 $('promoDrop').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('promoFile').click()}});
 $('promoDrop').addEventListener('dragover',e=>{e.preventDefault();$('promoDrop').classList.add('dragover')});
 $('promoDrop').addEventListener('dragleave',()=>{$('promoDrop').classList.remove('dragover')});
 $('promoDrop').addEventListener('drop',e=>{e.preventDefault();$('promoDrop').classList.remove('dragover');pickFile(e.dataTransfer?.files?.[0])});
 $('promoFile').addEventListener('change',e=>pickFile(e.target.files?.[0]));
 $('promoExtract').addEventListener('click',extractPdf);
 $('promoCatalogList').addEventListener('click',e=>{const btn=e.target.closest('[data-promo-catalog]');if(btn)openCatalog(btn.dataset.promoCatalog)});
 await loadCatalogs()
}
window.addEventListener('pagehide',()=>{if(state.originalUrl)URL.revokeObjectURL(state.originalUrl)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>alertText(e.message,'error')),{once:true});
else boot().catch(e=>alertText(e.message,'error'))
})();

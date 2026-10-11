/* Nethor Promotions — étape 3 : atelier de revue et comparaison avec le prospectus.
   Lecture publique soumise aux règles RLS existantes ; seules les RPC serveur
   autorisées peuvent modifier les références. Aucun ajout automatique en checklist. */
(function(root){
'use strict';
const statusLabels=Object.freeze({
 pending:'À vérifier',validated:'Validé',reworked:'Retravaillé',rejected:'Refusé'
});
const standardCategories=[
 'Fruits et légumes','Frais et crémerie','Surgelés','Boissons','Animaux',
 'Hygiène et entretien','Épicerie sucrée','Épicerie salée','Boulangerie','Maison','À classer'
];
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function counts(products){
 const result={pending:0,validated:0,reworked:0,rejected:0};
 for(const p of products||[])if(Object.hasOwn(result,p.review_status||'pending'))
  result[p.review_status||'pending']++;
 return result;
}
function filterProducts(products,{status='pending',query='',category=''}={}){
 const needle=String(query).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return(products||[]).filter(p=>{
  if(status!=='all'&&(p.review_status||'pending')!==status)return false;
  if(category&&(p.category||'À classer')!==category)return false;
  const source=[p.product_name,p.technical_details,p.price_or_benefit,
   p.price_unit,p.additional_info,p.category,p.source_excerpt].join(' ');
  return source.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(needle);
 }).sort((a,b)=>(a.source_page||0)-(b.source_page||0)||(a.position||0)-(b.position||0));
}
/* Supports original vision boxes (0–1000 coordinates) and PDF text extraction
   boxes (PDF point coordinates with explicit dimensions). Never estimates
   a region when the source geometry is absent or implausible. */
function regionPercent(box){
 if(!box||typeof box!=='object')return null;
 let x=Number(box.x),y=Number(box.y),w,h,maxX,maxY;
 if(Number.isFinite(Number(box.page_width))&&Number(box.page_width)>0&&
  Number.isFinite(Number(box.page_height))&&Number(box.page_height)>0){
  w=Number(box.width);h=Number(box.height);
  maxX=Number(box.page_width);maxY=Number(box.page_height);
 }else if(box.engine==='vision-v1'||(box.w!==undefined&&box.h!==undefined)){
  w=Number(box.w);h=Number(box.h);maxX=1000;maxY=1000;
 }else return null;
 if(![x,y,w,h,maxX,maxY].every(Number.isFinite)||w<=0||h<=0||x<0||y<0||
  x>=maxX||y>=maxY||x+w>maxX+2||y+h>maxY+2)return null;
 const left=Math.max(0,x/maxX*100),top=Math.max(0,y/maxY*100);
 return{left,top,width:Math.min(100-left,w/maxX*100),height:Math.min(100-top,h/maxY*100)};
}
function mount({detail,cat,rows,db,canManage=false,pdfJs,notify,onCollapse}){
 let products=(rows||[]).slice(),destroyed=false,busy=false,sourceToken=0;
 let pdfTask=null,pdfDoc=null,pdfLoading=null;
 let filter=canManage&&counts(products).pending>0?'pending':'all',query='',category='',selectedId=null;
 let editing=false;
 const getSelected=()=>products.find(p=>p.id===selectedId)||null;
 const totals=()=>counts(products);
 const statuses=()=>['pending','validated','reworked','rejected','all'];
 const labelFor=s=>s==='all'?'Tous':statusLabels[s];
 const countFor=s=>s==='all'?products.length:totals()[s];
 const categoryOptions=[...new Set([...standardCategories,...products.map(p=>p.category||'À classer')])]
   .sort((a,b)=>a.localeCompare(b,'fr'));
 detail.innerHTML='<div class="promoReviewWorkspace">'+
  '<div class="promoReviewHeader"><div><span class="promoEyebrow">ATELIER DE CONTRÔLE</span>'+
  '<h3>'+escapeHtml(cat.title)+'</h3>'+
  '<p>'+products.length+' références · '+escapeHtml(cat.valid_from)+' au '+escapeHtml(cat.valid_until)+
  ' · semaine '+escapeHtml(cat.iso_week||'—')+'</p></div>'+
  '<div class="promoReviewHeaderActions">'+
  (canManage?'<button type="button" class="promoSecondary" data-review-open-pdf>Voir le PDF original ↗</button>':'')+
  '<button type="button" class="promoSecondary" data-review-collapse>Replier ↑</button></div></div>'+
  '<div class="promoReviewProgress"><div class="promoReviewProgressInfo" id="promoReviewProgressInfo"></div>'+
  '<div class="promoReviewProgressBar"><span id="promoReviewProgressFill"></span></div></div>'+
  '<div class="promoReviewTabs" id="promoReviewTabs" aria-label="Statut des produits"></div>'+
  '<div class="promoReviewToolbarNew"><input id="promoReviewSearch" type="search" autocomplete="off" placeholder="Rechercher un nom, une quantité, un prix…" aria-label="Rechercher dans les références">'+
  '<select id="promoReviewCategory" aria-label="Filtrer par catégorie"><option value="">Toutes les catégories</option>'+
  categoryOptions.map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join('')+
  '</select></div>'+
  '<div class="promoReviewColumns"><div class="promoReviewItems" id="promoReviewItems" aria-label="Produits du catalogue"></div>'+
  '<aside class="promoReviewInspector" id="promoReviewInspector" aria-label="Contrôle du produit sélectionné"></aside></div></div>';
 const node=id=>detail.querySelector('#'+id);
 function updateCounters(){
  const t=totals(),done=t.validated+t.reworked,remainder=t.pending;
  node('promoReviewProgressInfo').innerHTML=
   '<strong>'+done+' contrôlé(s) sur '+products.length+
   '</strong><span>'+remainder+' à vérifier · '+t.rejected+' refusé(s)</span>';
  const bar=node('promoReviewProgressFill');
  bar.style.width=(products.length?done/products.length*100:0)+'%';
  node('promoReviewTabs').innerHTML=statuses().map(s=>
   '<button type="button" data-review-filter="'+s+'" aria-pressed="'+String(filter===s)+'">'+
   escapeHtml(labelFor(s))+' <span>'+countFor(s)+'</span></button>').join('');
 }
 function listItems(){
  const shown=filterProducts(products,{status:filter,query,category});
  if(!shown.some(p=>p.id===selectedId)){
   selectedId=shown[0]?.id||null;editing=false;
  }
  node('promoReviewItems').innerHTML=shown.length?shown.map(p=>{
   const status=p.review_status||'pending';
   return'<button type="button" class="promoReviewItem'+(p.id===selectedId?' isSelected':'')+
    '" data-review-select="'+escapeHtml(p.id)+'" aria-pressed="'+String(p.id===selectedId)+'">'+
    '<span class="promoReviewItemTitle">'+escapeHtml(p.product_name)+'</span>'+
    '<span class="promoReviewItemSub">'+escapeHtml(p.technical_details||p.additional_info||'Informations techniques à contrôler')+'</span>'+
    '<span class="promoReviewItemBottom"><strong>'+escapeHtml(p.price_or_benefit||'Prix manquant')+
    '</strong><span class="promoReviewBadge promoStatus-'+status+'">'+
    escapeHtml(statusLabels[status]||statusLabels.pending)+'</span>'+
    '<small>p. '+escapeHtml(p.source_page)+'</small></span></button>'
  }).join(''):'<p class="promoMuted promoReviewEmpty">Aucun produit pour ces filtres.</p>';
  return shown;
 }
 function editorFor(p){
  return '<form id="promoReviewEditForm" class="promoReviewEditFields">'+
   '<p class="promoMuted">Compare les informations au PDF. Les prix et avantages ne sont jamais repris d’un ancien catalogue.</p>'+
   '<label>Nom du produit<input required name="product_name" minlength="2" maxlength="500" value="'+escapeHtml(p.product_name)+'"></label>'+
   '<label>Rayon<select name="category" required>'+categoryOptions.map(c=>
    '<option value="'+escapeHtml(c)+'"'+(p.category===c?' selected':'')+'>'+escapeHtml(c)+'</option>').join('')+
   '</select></label>'+
   '<label>Prix ou avantage<input required name="price_or_benefit" maxlength="1200" value="'+escapeHtml(p.price_or_benefit)+'"></label>'+
   '<label>Unité du prix<input name="price_unit" maxlength="120" value="'+escapeHtml(p.price_unit||'')+'"></label>'+
   '<label>Calibre, format et caractéristiques<textarea name="technical_details" maxlength="1200">'+escapeHtml(p.technical_details||'')+'</textarea></label>'+
   '<label>Informations complémentaires<textarea name="additional_info" maxlength="1200">'+escapeHtml(p.additional_info||'')+'</textarea></label>'+
   '<div class="promoReviewEditActions"><button type="button" class="promoSecondary" data-review-cancel>Annuler</button>'+
   '<button class="promoPrimary" type="submit"'+(busy?' disabled':'')+'>Enregistrer la correction</button></div></form>';
 }
 function renderInspect(){
  const p=getSelected(),inspect=node('promoReviewInspector');
  sourceToken++;
  if(!p){inspect.innerHTML='<p class="promoMuted">Sélectionne une référence pour la contrôler.</p>';return}
  inspect.innerHTML='<div class="promoReviewInspectorHead"><span class="promoEyebrow">RÉFÉRENCE N° '+escapeHtml(p.position||'—')+'</span>'+
   '<span class="promoReviewBadge promoStatus-'+escapeHtml(p.review_status||'pending')+'">'+
   escapeHtml(statusLabels[p.review_status||'pending'])+'</span></div>'+
   '<h4>'+escapeHtml(p.product_name)+'</h4>'+
   '<div class="promoReviewFacts"><div><small>Prix / avantage</small><strong>'+escapeHtml(p.price_or_benefit)+'</strong></div>'+
   '<div><small>Unité</small><span>'+escapeHtml(p.price_unit||'À préciser')+'</span></div>'+
   '<div><small>Calibre / caractéristiques</small><span>'+escapeHtml(p.technical_details||'À contrôler')+'</span></div>'+
   '<div><small>Catégorie</small><span>'+escapeHtml(p.category||'À classer')+'</span></div>'+
   (p.additional_info?'<div><small>Informations</small><span>'+escapeHtml(p.additional_info)+'</span></div>':'')+
   '</div>'+
   '<div class="promoReviewEvidence"><strong>Extrait de l’analyse</strong><p>'+
   escapeHtml(p.source_excerpt||'Aucun extrait textuel conservé.')+'</p></div>'+
   '<div class="promoReviewSourceHead"><strong>Prospectus · page '+escapeHtml(p.source_page)+'</strong>'+
   (canManage?'<button type="button" data-review-open-pdf class="promoReviewTextButton">Ouvrir le PDF ↗</button>':'')+
   '</div><div class="promoReviewSource" id="promoReviewSource" role="status">'+
   '<span>'+(canManage?'Chargement de la page d’origine…':'Aperçu PDF réservé aux responsables autorisés.')+'</span>'+
   '</div>'+
   (p.reviewed_at?'<p class="promoReviewReviewDate">Dernier contrôle : '+escapeHtml(new Date(p.reviewed_at).toLocaleString('fr-FR'))+'</p>':'')+
   (canManage?'<div class="promoReviewDecision">'+
    (editing?editorFor(p):'<div class="promoReviewDecisionButtons">'+
     '<button type="button" class="promoReviewValidate" data-review-action="validated"'+(busy?' disabled':'')+'>✓ Valider</button>'+
     '<button type="button" class="promoReviewEdit" data-review-edit'+(busy?' disabled':'')+'>✎ Retravailler</button>'+
     '<button type="button" class="promoReviewReject" data-review-action="rejected"'+(busy?' disabled':'')+'>✕ Refuser</button></div>')+
   '</div>':'')+
   '<p class="promoReviewFootnote">Une validation de fiche ne publie pas la promotion et ne la place pas automatiquement dans la checklist.</p>';
  if(canManage)void renderSource(p,sourceToken);
 }
 async function documentFor(){
  if(pdfDoc)return pdfDoc;
  if(pdfLoading)return pdfLoading;
  pdfLoading=(async()=>{
   const response=await db.storage.from('promotion-pdfs').createSignedUrl(cat.storage_path,120);
   if(response.error||!response.data?.signedUrl)throw Error('Lien du PDF privé indisponible.');
   const pdfjs=await pdfJs();
   pdfTask=pdfjs.getDocument({url:response.data.signedUrl});
   pdfDoc=await pdfTask.promise;
   return pdfDoc
  })().catch(e=>{pdfLoading=null;throw e});
  return pdfLoading;
 }
 async function renderSource(p,token){
  const target=node('promoReviewSource');
  if(!target)return;
  try{
   const pdf=await documentFor();
   if(destroyed||token!==sourceToken)return;
   if(!Number.isInteger(Number(p.source_page))||Number(p.source_page)<1||Number(p.source_page)>pdf.numPages)
    throw Error('Page source indisponible.');
   const page=await pdf.getPage(Number(p.source_page));
   if(destroyed||token!==sourceToken)return;
   const natural=page.getViewport({scale:1});
   const scale=Math.min(1.75,880/natural.width);
   const viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Prévisualisation canvas indisponible.');
   await page.render({canvasContext:ctx,viewport}).promise;
   if(destroyed||token!==sourceToken)return;
   const wrap=document.createElement('div');wrap.className='promoReviewSourceCanvas';
   wrap.appendChild(canvas);
   const box=regionPercent(p.source_block);
   if(box){
    const marker=document.createElement('div');marker.className='promoReviewSourceMarker';
    marker.style.left=box.left+'%';marker.style.top=box.top+'%';
    marker.style.width=box.width+'%';marker.style.height=box.height+'%';
    marker.title='Zone du produit détectée automatiquement';
    wrap.appendChild(marker);
   }
   target.replaceChildren(wrap);
   if(!box){
    const note=document.createElement('small');
    note.textContent='Position exacte indisponible : contrôle visuel de la page entière.';
    target.appendChild(note);
   }
  }catch(e){
   if(destroyed||token!==sourceToken)return;
   target.replaceChildren();
   const note=document.createElement('p');note.className='promoMuted';
   note.textContent='Aperçu indisponible : '+String(e?.message||e)+
     '. Utilise « Ouvrir le PDF » pour vérifier la référence.';
   target.appendChild(note);
  }
 }
 async function openPdf(){
  if(!canManage)return;
  // The window is created synchronously from the user gesture to avoid popup blocking.
  const tab=window.open('about:blank','_blank');
  try{
   const response=await db.storage.from('promotion-pdfs').createSignedUrl(cat.storage_path,90);
   if(response.error||!response.data?.signedUrl)throw Error('PDF privé indisponible');
   if(tab)tab.location.replace(response.data.signedUrl);
   else notify('Autorise les fenêtres pour ouvrir le prospectus.','error');
  }catch(e){if(tab)tab.close();notify('Impossible d’ouvrir le PDF : '+String(e?.message||e),'error')}
 }
 async function act(action,fields={}){
  if(!canManage||busy)return;
  const p=getSelected();if(!p)return;
  if(action==='validated'&&(!p.price_or_benefit||
    /^prix non d[eé]tect[eé]$/i.test(p.price_or_benefit.trim()))){
   notify('Prix manquant : corrige la fiche avant de la valider.','error');return
  }
  if(action==='rejected'&&!window.confirm('Refuser « '+p.product_name+' » ? Tu pourras le retrouver dans « Refusés ».'))return;
  busy=true;
  try{
   const res=await db.rpc('review_promotion_product',{
    p_product_id:p.id,p_action:action,p_fields:fields
   });
   if(res.error)throw res.error;
   const fresh=await db.from('promotion_products').select('*').eq('id',p.id).single();
   if(fresh.error||!fresh.data)throw fresh.error||Error('Actualisation impossible');
   const index=products.findIndex(x=>x.id===p.id);
   if(index>=0)products[index]=fresh.data;
   editing=false;
   notify(action==='validated'?'Produit validé.':action==='reworked'?
    'Fiche corrigée et correction enregistrée.':'Produit refusé et conservé dans l’historique.','ok');
   const currentList=filterProducts(products,{status:filter,query,category});
   if(!currentList.some(x=>x.id===p.id))selectedId=currentList[0]?.id||null;
   updateCounters();listItems();renderInspect()
  }catch(e){notify('Contrôle non enregistré : '+String(e?.message||e),'error');renderInspect()}
  finally{busy=false}
 }
 function redraw(){
  updateCounters();listItems();renderInspect()
 }
 node('promoReviewSearch').addEventListener('input',e=>{
  query=e.target.value;
  const before=selectedId;
  listItems();
  if(before!==selectedId)renderInspect();
 });
 node('promoReviewCategory').addEventListener('change',e=>{
  category=e.target.value;redraw()
 });
 detail.addEventListener('click',onClick);
 detail.addEventListener('submit',onSubmit);
 async function onClick(e){
  const button=e.target.closest('button');if(!button||!detail.contains(button))return;
  if(button.hasAttribute('data-review-collapse')){onCollapse?.();return}
  if(button.hasAttribute('data-review-open-pdf')){void openPdf();return}
  if(busy)return;
  if(button.hasAttribute('data-review-filter')){
   filter=button.dataset.reviewFilter;editing=false;redraw();return
  }
  if(button.hasAttribute('data-review-select')){
   if(selectedId===button.dataset.reviewSelect)return;
   selectedId=button.dataset.reviewSelect;editing=false;listItems();renderInspect();return
  }
  if(button.hasAttribute('data-review-edit')){editing=true;renderInspect();return}
  if(button.hasAttribute('data-review-cancel')){editing=false;renderInspect();return}
  if(button.hasAttribute('data-review-action')){void act(button.dataset.reviewAction)}
 }
 async function onSubmit(e){
  if(e.target.id!=='promoReviewEditForm')return;
  e.preventDefault();
  if(busy)return;
  const data=new FormData(e.target),fields={};
  for(const name of ['product_name','category','technical_details','price_or_benefit','price_unit','additional_info'])
   fields[name]=String(data.get(name)||'').trim();
  if(fields.product_name.length<2||!fields.category||!fields.price_or_benefit||
    /^prix non d[eé]tect[eé]$/i.test(fields.price_or_benefit)){
   notify('Corrige au minimum le nom, le rayon et le prix réel du catalogue.','error');return
  }
  void act('reworked',fields)
 }
 // The callback is provided by the host page: it must retain catalog collapse behavior.
 redraw();
 return{destroy(){
  destroyed=true;sourceToken++;
  detail.removeEventListener('click',onClick);
  detail.removeEventListener('submit',onSubmit);
  if(pdfTask)void pdfTask.destroy().catch(()=>{});
 }};
}
root.NethorPromotionsReview=Object.freeze({mount,counts,filterProducts,regionPercent});
})(window);
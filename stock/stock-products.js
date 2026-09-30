/* Nethor Stock — fiches et produits, Phase 4.19 */
function renderInfoView(p){
 const visual=p.photo_url?'<div class="infoHero"><img src="'+esc(p.photo_url)+'" alt="" loading="lazy" decoding="async"></div>':'<div class="infoHero"><div class="infoHeroEmpty">'+esc(meta[p.category]?.emoji||'📦')+'</div></div>';
 const val=v=>v?esc(v):'<span style="color:#aaa">Non renseigné</span>';
 const count=p.packaging_count?esc(p.packaging_count)+' pièce'+(Number(p.packaging_count)>1?'s':''):'<span style="color:#aaa">Non renseigné</span>';const stockBadge=Number(p.quantity)===0?'<div class="infoStockAlert">Rupture de stock</div>':'';
 $('infoView').innerHTML=visual+stockBadge+'<div class="infoViewTitle">'+esc(p.name||'Article')+'</div><div class="infoViewSub">'+esc(p.category||'Sans catégorie')+(p.packaging?' • '+esc(p.packaging):'')+'</div><div class="infoFacts"><div class="infoFact"><span>Référence EAN13</span><strong>'+val(p.ean)+'</strong></div><div class="infoFact"><span>Code article</span><strong>'+val(p.article_code)+'</strong></div><div class="infoFact"><span>Type de conditionnement</span><strong>'+val(p.packaging)+'</strong></div><div class="infoFact"><span>Nombre par unité de stock</span><strong>'+count+'</strong></div><div class="infoFact"><span>Capacité rayon</span><strong>'+(p.shelf_capacity!==null&&p.shelf_capacity!==undefined?esc(p.shelf_capacity)+' unité'+(Number(p.shelf_capacity)>1?'s':''):'<span style="color:#aaa">Non renseignée</span>')+'</strong></div></div>';
}
function setEditTab(tab){const order=tab==='order';$('editTabInfo').classList.toggle('active',!order);$('editTabOrder').classList.toggle('active',order);$('editPanelInfo').classList.toggle('hidden',order);$('editPanelOrder').classList.toggle('hidden',!order);playUISound('tick')}
function setInfoEdit(edit){if(!canManageFL)edit=false;$('infoView').classList.toggle('hidden',edit);$('infoEditFields').classList.toggle('hidden',!edit);$('editInfoBtn').classList.toggle('hidden',edit||!canManageFL);$('saveInfoBtn').classList.toggle('hidden',!edit);$('cancelInfoEdit').classList.toggle('hidden',!edit);if(edit)setEditTab('info')}
function openInfo(id){
 const p=products.find(x=>x.id===id);if(!p)return;refreshSelects();const cfg=getOrderConfig(p.id);
 $('infoId').value=p.id;$('infoName').value=p.name||'';fillFamilySelect('infoFamily',p.family_id);refreshCategorySelect('infoFamily','infoCat',p.category_id);$('infoPackaging').value=p.packaging_id?String(p.packaging_id):'';$('infoPackagingCount').value=p.packaging_count||'';$('infoShelfCapacity').value=p.shelf_capacity??'';$('infoCode').value=p.article_code||'';$('infoEan').value=p.ean||'';
 $('infoPhoto').value='';$('infoPhotoStatus').textContent=p.photo_url?'Photo actuelle enregistrée':'Aucune photo';$('infoOnSale').value=String(p.on_sale!==false);
 $('infoLossLeader').value=String(cfg.lossLeader);$('infoSeason').value=String(cfg.season);$('infoSensitive').checked=cfg.sensitive;$('infoBlocked').checked=cfg.blocked;
 renderInfoView(p);setInfoEdit(false);$('infoDialog').showModal()
}
async function saveInfo(e){
 e.preventDefault();if(!canManageFL)return;const id=$('infoId').value,btn=$('saveInfoBtn');btn.disabled=true;btn.textContent='Enregistrement…';
 try{
  const current=products.find(x=>x.id===id);let photoUrl=current?.photo_url||null;const file=$('infoPhoto').files[0];
  if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=crypto.randomUUID()+'.'+ext;const {error:upErr}=await db.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});if(upErr)throw upErr;const {data:urlData}=db.storage.from('product-images').getPublicUrl(path);photoUrl=urlData.publicUrl}
  const pc=Number($('infoPackagingCount').value),scRaw=$('infoShelfCapacity').value.trim(),sc=scRaw===''?null:Number(scRaw),rawEan=$('infoEan').value.replace(/\D/g,'');
  if(rawEan.length>13)throw new Error('L’EAN13 doit contenir au maximum 13 chiffres.');
  const ean=rawEan?rawEan.padStart(13,'0'):'';
  const family_id=$('infoFamily').value?Number($('infoFamily').value):null,category_id=$('infoCat').value?Number($('infoCat').value):null,packaging_id=$('infoPackaging').value?Number($('infoPackaging').value):null;const changes={name:$('infoName').value.trim(),family_id,category_id,packaging_id,packaging_count:Number.isInteger(pc)&&pc>=1?pc:null,shelf_capacity:Number.isInteger(sc)&&sc>=0?sc:null,photo_url:photoUrl,article_code:$('infoCode').value.trim()||null,ean:ean||null,on_sale:$('infoOnSale').value==='true'};
  const {error}=await db.from('products').update(changes).eq('id',id);if(error){if(error.code==='23505')throw new Error('Cet EAN13 est déjà associé à une autre fiche article.');throw error}
  saveOrderConfig(id,{lossLeader:$('infoLossLeader').value==='true',season:$('infoSeason').value==='true',sensitive:$('infoSensitive').checked,blocked:$('infoBlocked').checked});
  $('infoDialog').close();await loadProducts()
 }catch(err){alert('Modification impossible : '+err.message)}
 finally{btn.disabled=false;btn.textContent='Enregistrer'}
}

function openAdd(){if(!canManageFL)return;refreshSelects();if(flFamilyId)$('pFamily').value=String(flFamilyId);refreshCategorySelect('pFamily','pCat');$('addDialog').showModal()}
async function saveProduct(e){
e.preventDefault();
const btn=e.submitter;if(btn){btn.disabled=true;btn.textContent='Ajout…'}
try{
 let photoUrl=null,file=$('pPhoto').files[0];
 if(file){
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
   const path=crypto.randomUUID()+'.'+ext;
   const {error:upErr}=await db.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});
   if(upErr)throw upErr;
   const {data:urlData}=db.storage.from('product-images').getPublicUrl(path);
   photoUrl=urlData.publicUrl;
 }
 const max=products.reduce((m,p)=>Math.max(m,p.position||0),0);
 const family_id=flFamilyId,category_id=$('pCat').value?Number($('pCat').value):null,packaging_id=$('pPackaging').value?Number($('pPackaging').value):null;const {error}=await db.from('products').insert({name:$('pName').value.trim(),family_id,category_id,packaging_id,quantity:Math.max(0,Number($('pQty').value)||0),photo_url:photoUrl,position:max+1});
 if(error)throw error;
 e.target.reset();$('pQty').value=0;$('addDialog').close();await loadProducts();
}catch(err){alert('Ajout impossible : '+err.message)}
finally{if(btn){btn.disabled=false;btn.textContent='Ajouter'}}
}

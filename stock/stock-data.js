/* Nethor Stock — données et filtres, Phase 4.19 */
async function loadProducts(){const {data,error}=await db.from('products').select('*,product_families(id,name,slug),product_categories(id,name,icon,color,family_id),product_packagings(id,name)').eq('active',true).order('position').order('name');if(error){stockDataFresh=false;if(!allProducts.length)$('app').innerHTML='<div class="error">Impossible de charger le stock.</div>';return}allProducts=(data||[]).map(p=>({...p,family_name:p.product_families?.name||'Non répertorié',category:p.category_id?(p.product_categories?.name||p.category||'Non répertorié'):'Non répertorié',packaging:p.packaging_id?(p.product_packagings?.name||p.packaging||'Non répertorié'):'Non répertorié'}));products=flFamilyId?allProducts.filter(p=>String(p.family_id)===String(flFamilyId)&&p.category_id!==null):[];stockDataFresh=true;saveStockCache();render();if($('stockModeTitle'))applyStockModeUI()}
function toggleOffSale(){showOffSale=!showOffSale;const b=$('showOffSaleToggle');b.classList.toggle('on',showOffSale);b.setAttribute('aria-pressed',String(showOffSale));render();playUISound('tick')}
function findProductByEan(ean){const ref=String(ean||'').replace(/\s+/g,'');return products.find(p=>String(p.ean||'')===ref)||null}
function openInfoByEan(ean){const p=findProductByEan(ean);if(!p)return false;openInfo(p.id);return true}
function setSearch(v){searchTerm=v.trim().toLocaleLowerCase('fr');$('clearSearch').classList.toggle('hidden',!searchTerm);render()} function clearSearch(){$('searchInput').value='';setSearch('');$('searchInput').focus()}
function toggleCategory(cat){collapsed[cat]=!collapsed[cat];playUISound(collapsed[cat]?'close':'open');render()}
function resetSuggestionView(){const d=$('suggestDialog');if(d?.open)renderSuggestions()}

function stockVisibleProducts(){
 return products.filter(p=>(stockMode==='consult'?(p.on_sale!==false||showOffSale):p.on_sale!==false)&&(!searchTerm||[p.name,p.packaging,p.origin,p.caliber,p.article_code,p.ean,p.category].some(v=>String(v||'').toLocaleLowerCase('fr').includes(searchTerm)))&&(stockCategory==='Tous'||p.category===stockCategory))
}
function renderQuickCats(){
 const bar=$('quickCatBar');if(!bar)return;const base=products.filter(p=>p.on_sale!==false),cats=['Tous',...Object.keys(meta).filter(cat=>base.some(p=>p.category===cat))];
 bar.innerHTML=cats.map(cat=>{const n=cat==='Tous'?base.length:base.filter(p=>p.category===cat).length,icon=cat==='Tous'?'☷':esc(meta[cat]?.emoji||'📦');return '<button class="quickCat '+(stockCategory===cat?'active':'')+'" onclick="setStockCategory(decodeURIComponent(\''+encodeURIComponent(cat)+'\'))">'+icon+' '+esc(cat)+' <b>'+n+'</b></button>'}).join('')
}
function setStockCategory(cat){stockCategory=cat;renderQuickCats();render();playUISound('tick')}

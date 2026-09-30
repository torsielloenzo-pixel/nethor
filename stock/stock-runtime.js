/* Nethor Stock — runtime partagé, Phase 4.19 */
document.addEventListener('click',e=>{const d=e.target instanceof HTMLDialogElement?e.target:null;if(d&&d.open){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co', SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let searchTerm='',optionType=null,suggestActiveTab='Tous',stockMode='stock',stockCategory='Tous';
let families=[],categories=[],packagings=[],products=[],allProducts=[],profile=null,showOffSale=false,flFamilyId=null,canOperateFL=false,canManageFL=false,stockDataFresh=false;
const collapsed={},meta={};
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])), safeColor=s=>/^#[0-9a-f]{6}$/i.test(String(s||''))?String(s):'#777777', fmt=n=>Number(n)%1?String(Number(n)).replace('.',','):String(Number(n));
function familyById(id){return families.find(x=>String(x.id)===String(id))||null}
const STOCK_CACHE_KEY='nettoStockFLCacheV1';
function saveStockCache(){
 try{localStorage.setItem(STOCK_CACHE_KEY,JSON.stringify({saved_at:Date.now(),families,categories,packagings,allProducts}))}catch(_){}
}
function hydrateStockCache(){
 try{
  const x=JSON.parse(localStorage.getItem(STOCK_CACHE_KEY)||'null');if(!x||Date.now()-Number(x.saved_at||0)>86400000)return false;
  if(!Array.isArray(x.families)||!Array.isArray(x.categories)||!Array.isArray(x.allProducts))return false;
  families=x.families;categories=x.categories;packagings=Array.isArray(x.packagings)?x.packagings:[];allProducts=x.allProducts;
  flFamilyId=(families.find(x=>x.slug==='fruits-legumes')||families.find(x=>x.name==='Fruits & Légumes'))?.id||null;
  products=flFamilyId?allProducts.filter(p=>String(p.family_id)===String(flFamilyId)&&p.category_id!==null):[];
  rebuildMeta();refreshSelects();stockDataFresh=false;return true
 }catch(_){return false}
}

function categoryById(id){return categories.find(x=>String(x.id)===String(id))||null}
function packagingById(id){return packagings.find(x=>String(x.id)===String(id))||null}
function rebuildMeta(){
 Object.keys(meta).forEach(k=>delete meta[k]);Object.keys(collapsed).forEach(k=>delete collapsed[k]);
 categories.filter(x=>String(x.family_id)===String(flFamilyId)).sort((a,b)=>(a.position||0)-(b.position||0)||(a.name||'').localeCompare(b.name||'','fr')).forEach(x=>{meta[x.name]={color:safeColor(x.color),emoji:x.icon||'📦',id:x.id};collapsed[x.name]=true})
}
async function loadOptions(){
 const [fr,cr,pr]=await Promise.all([
  db.from('product_families').select('*').order('position').order('name'),
  db.from('product_categories').select('*').order('position').order('name'),
  db.from('product_packagings').select('*').order('position').order('name')
 ]);
 if(fr.error||cr.error||pr.error)throw new Error('Impossible de charger les familles et catégories.');
 families=fr.data||[];categories=cr.data||[];packagings=pr.data||[];
 flFamilyId=(families.find(x=>x.slug==='fruits-legumes')||families.find(x=>x.name==='Fruits & Légumes'))?.id||null;
 rebuildMeta();refreshSelects();saveStockCache()
}
function fillFamilySelect(id,preferred){
 const el=$(id);if(!el)return;const old=preferred??el.value;
 el.innerHTML=families.map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('');
 if(families.some(f=>String(f.id)===String(old)))el.value=String(old);else if(flFamilyId)el.value=String(flFamilyId)
}
function refreshCategorySelect(familySelectId,categorySelectId,preferred){
 const fam=$(familySelectId),cat=$(categorySelectId);if(!fam||!cat)return;
 const old=preferred??cat.value,items=categories.filter(x=>String(x.family_id)===String(fam.value)).sort((a,b)=>(a.position||0)-(b.position||0)||(a.name||'').localeCompare(b.name||'','fr'));
 cat.innerHTML=items.length?items.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join(''):'<option value="">Non répertorié</option>';
 if(items.some(x=>String(x.id)===String(old)))cat.value=String(old)
}
function refreshSelects(){
 fillFamilySelect('pFamily',flFamilyId);fillFamilySelect('infoFamily');
 refreshCategorySelect('pFamily','pCat');refreshCategorySelect('infoFamily','infoCat');
 [['pPackaging',false],['infoPackaging',true]].forEach(([id,optional])=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML=(optional?'<option value="">Non répertorié</option>':'')+packagings.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');if(packagings.some(x=>String(x.id)===String(old)))el.value=old})
}

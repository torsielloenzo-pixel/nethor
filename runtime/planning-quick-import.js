(function(){
'use strict';
if(window.NethorPlanningQuickImport)return;

const INPUT_ID='nethorHomePlanningExcel';
let picker=null,modal=null,frame=null,enginePromise=null,active=false,success=false,showing=false;
let observeState=null;

function makePicker(){
 if(picker?.isConnected)return picker;
 picker=document.createElement('input');
 picker.id=INPUT_ID;
 picker.type='file';
 picker.accept='.xls,.xlsx,.xlsm';
 picker.multiple=true;
 picker.hidden=true;
 picker.setAttribute('aria-label','Choisir un ou plusieurs fichiers Excel de planning');
 picker.addEventListener('change',()=>{
  const files=Array.from(picker.files||[]);
  picker.value='';
  if(files.length)void importFiles(files);
 });
 document.body.appendChild(picker);
 return picker;
}

function setStatus(message,kind=''){
 if(!modal)return;
 const box=modal.querySelector('[data-planning-quick-status]');
 box.textContent=String(message||'');
 box.dataset.kind=kind;
}
function setBusy(value){
 active=Boolean(value);
 if(!modal)return;
 modal.querySelectorAll('button').forEach(b=>{b.disabled=active});
 modal.classList.toggle('is-busy',active);
}
function makeModal(){
 if(modal?.isConnected)return modal;
 modal=document.createElement('div');
 modal.className='nethorHomeImportBackdrop';
 modal.id='nethorHomeImportDialog';
 modal.innerHTML='<section class="nethorHomeImportPanel" role="dialog" aria-modal="true" aria-labelledby="nethorHomeImportTitle">'+
  '<div class="nethorHomeImportHead"><span class="nethorHomeImportIcon" aria-hidden="true">▦</span><div><small>PLANNING · IMPORT EXCEL</small><h2 id="nethorHomeImportTitle">Importer un planning</h2></div></div>'+
  '<p class="nethorHomeImportExplanation">Même importateur que dans la page Planning : lecture des fichiers, remplacement confirmé, archivage et notifications.</p>'+
  '<div class="nethorHomeImportStatus" role="status" aria-live="polite" data-planning-quick-status>Préparation de l’import…</div>'+
  '<div class="nethorHomeImportEngine" data-planning-quick-engine></div>'+
  '<div class="nethorHomeImportButtons"><button type="button" class="nethorHomeImportAgain">Choisir des fichiers Excel</button><button type="button" class="nethorHomeImportClose">Fermer</button></div>'+
  '</section>';
 document.body.appendChild(modal);
 modal.querySelector('.nethorHomeImportAgain').addEventListener('click',()=>{if(!active)makePicker().click()});
 modal.querySelector('.nethorHomeImportClose').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 return modal;
}
function showModal(){
 makeModal().classList.add('is-open');
 showing=true;
 document.documentElement.classList.add('nethorHomeImportOpen');
}
function close(){
 if(active||!modal)return;
 const reload=success;
 modal.remove();modal=null;showing=false;
 document.documentElement.classList.remove('nethorHomeImportOpen');
 observeState?.disconnect();observeState=null;
 frame?.remove();frame=null;enginePromise=null;
 success=false;
 if(reload)window.location.reload();
}
function frameContentCSS(){
 return [
  'html,body{background:transparent!important;overflow:hidden!important;margin:0!important;padding:0!important;min-height:0!important}',
  'body>:not(#planningApp):not(script):not(style){display:none!important}',
  '#planningApp{display:block!important;position:static!important;overflow:hidden!important;min-height:0!important;height:auto!important;padding:0!important;margin:0!important;max-width:none!important;width:100%!important;background:transparent!important}',
  '#planningApp > :not(#weekView){display:none!important}',
  '#weekView{display:block!important;overflow:hidden!important;min-height:0!important;margin:0!important;padding:0!important;background:transparent!important}',
  '#weekView > :not(.readerHead){display:none!important}',
  '.readerHead{display:block!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
  '.readerHead > :first-child{display:none!important}',
  '.sourceActions{display:block!important;margin:0!important;padding:0!important;min-height:0!important;width:100%!important}',
  '.sourceActions > :not([data-nethor-planning-source-actions]){display:none!important}',
  '[data-nethor-planning-source-actions],.planningPlatformSourceActions{display:block!important;margin:0!important;padding:0!important;width:100%!important}',
  '#editPlanningBtn,.excelDrop{display:none!important}',
  '#importPanel.hidden{display:none!important}',
  '#importPanel:not(.hidden){display:block!important;width:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}',
  '#importState{display:block!important;margin:0!important;padding:8px 0!important;background:transparent!important;border:0!important;min-height:26px!important;font:600 12px/1.35 system-ui,sans-serif!important;white-space:normal!important}',
  '#planningToast{display:none!important}'
 ].join('\n');
}
function injectFrameCSS(){
 if(!frame)return;
 try{
  const d=frame.contentDocument;
  if(!d?.head||d.getElementById('nethorHomeImportFrameCSS'))return;
  // Browser dialogs inside an embedded document may be suppressed. Keep the
  // Planning code's exact confirmation text, but show it in the main window.
  frame.contentWindow.confirm=message=>window.confirm(String(message||''));
  const style=d.createElement('style');
  style.id='nethorHomeImportFrameCSS';
  style.textContent=frameContentCSS();
  d.head.appendChild(style);
 }catch(e){console.warn('Import planning : affichage du moteur',e)}
}
function connectStatus(){
 const d=frame?.contentDocument,source=d?.getElementById('importState');
 if(!source)return;
 modal?.classList.add('is-engine-ready');
 observeState?.disconnect();
 const update=()=>{
  const label=(source.textContent||'').trim();
  if(label)setStatus(label,source.classList.contains('err')?'error':source.classList.contains('warn')?'warn':source.classList.contains('ok')?'ok':'');
 };
 observeState=new MutationObserver(update);
 observeState.observe(source,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
 update();
}
function loadEngine(){
 if(enginePromise)return enginePromise;
 enginePromise=new Promise((resolve,reject)=>{
  const host=modal.querySelector('[data-planning-quick-engine]');
  frame=document.createElement('iframe');
  frame.className='nethorHomeImportIframe';
  frame.title='Moteur officiel d’import Excel de Nethor';
  frame.setAttribute('aria-hidden','true');
  frame.src='planning.html?quick-import=1';
  let complete=false,loaded=false;
  const stop=(error)=>{
   if(complete)return;
   complete=true;clearInterval(check);clearTimeout(timeout);
   if(error)reject(error);else resolve(frame.contentWindow);
  };
  frame.addEventListener('load',()=>{
   loaded=true;
   try{
    const path=frame.contentWindow.location.pathname.split('/').pop();
    if(path!=='planning.html'){stop(new Error('Accès au planning indisponible.'));return}
    injectFrameCSS();
   }catch(_){stop(new Error('Le module Planning ne peut pas être ouvert.'))}
  });
  const check=setInterval(()=>{
   if(!loaded||!frame?.isConnected)return;
   try{
    const w=frame.contentWindow,d=frame.contentDocument,root=d?.documentElement;
    if(!d||!root)return;
    if(w.location.pathname.split('/').pop()!=='planning.html'){
     stop(new Error('Accès au planning indisponible.'));return
    }
    if(!d.body?.classList.contains('planningReady'))return;
    if(root.dataset.planningCanEdit!=='1'||typeof w.importPlanningFiles!=='function'||!d.getElementById('importPanel')||!d.getElementById('excelFile')){
     stop(new Error('Votre compte ne dispose pas de l’autorisation de gérer les imports du planning.'));return
    }
    connectStatus();stop();
   }catch(e){stop(new Error('Impossible de charger l’importateur du planning.'))}
  },120);
  const timeout=setTimeout(()=>stop(new Error('Impossible de préparer l’importateur Excel. Vérifiez votre connexion puis réessayez.')),28000);
  host.appendChild(frame);
 }).catch(err=>{frame?.remove();frame=null;enginePromise=null;throw err});
 return enginePromise;
}
async function importFiles(files){
 if(active||!files?.length)return;
 if(navigator.onLine===false){
  showModal();setStatus('Import impossible hors connexion.','error');return;
 }
 showModal();setBusy(true);
 setStatus('Ouverture de l’importateur Excel du planning…');
 try{
  const w=await loadEngine();
  if(!w||!frame?.isConnected)throw new Error('Importateur Excel indisponible.');
  setStatus('Traitement de '+files.length+' fichier'+(files.length>1?'s':'')+' Excel…');
  const result=await w.importPlanningFiles(files);
  const state=frame.contentDocument?.getElementById('importState');
  const message=(state?.textContent||'').trim();
  const imported=Number(result?.ok||0),failed=Number(result?.errors||0),cancelled=Number(result?.cancelled||0);
  if(imported>0)success=true;
  if(message)setStatus(message,failed?'error':result?.unverified||cancelled||!imported?'warn':'ok');
  else if(imported>0)setStatus('✓ Planning importé.','ok');
  else setStatus('Aucun planning importé.', 'warn');
 }catch(e){
  console.error('Raccourci import Excel :',e);
  modal?.classList.remove('is-engine-ready');
  setStatus(e?.message||'Impossible de lancer l’import Excel.', 'error');
 }finally{setBusy(false)}
}
function open(){
 if(active)return;
 const api=window.NettoProfileUI,profile=api?.profile;
 const level=profile&&typeof api.permissionLevel==='function'?api.permissionLevel('planning',profile):null;
 if(profile?.role!=='admin'&&level&&level!=='manage'){
  showModal();setStatus('Vous ne disposez pas de l’autorisation d’importer un planning.','error');return;
 }
 if(navigator.onLine===false){
  showModal();setStatus('Import impossible hors connexion.','error');return;
 }
 // Must be synchronous with the user's click to preserve file-picker activation.
 makePicker().click();
}
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&showing&&!active)close();
});
window.NethorPlanningQuickImport=Object.freeze({open});
})();
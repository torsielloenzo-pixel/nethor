/* Nethor Scanner runtime — partagé page legacy / vue SPA mobile */
const SCANNER_SPA_MODE=document.documentElement.dataset.nethorMobileApp==='1';
let scannerRuntimeActive=!SCANNER_SPA_MODE;
const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co',SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
let db=null;
async function waitForSupabase(ms=8000){
 const started=Date.now();
 while(Date.now()-started<ms){
  if(window.supabase?.createClient)return window.supabase;
  await new Promise(r=>setTimeout(r,40))
 }
 throw new Error('Supabase indisponible')
}
const $=id=>document.getElementById(id);
let scanner=null,scannerRunning=false,scannerStarting=false,cameraStartPromise=null,visibilityStopTimer=null,searchBusy=false,lastCode='',lastCodeAt=0,currentProduct=null,sessionUserId='',cameraRemembered=false,cameraPreferenceLoaded=false,cameraPermissionState='unknown',assistTimer=null,assistBusy=false,assistCycle=0,nativeDetectorPromise=null,zxingLibraryPromise=null,zxingReader=null,hypothesisProducts=[],activeCameraTrack=null,torchEnabled=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function cameraPreferenceKey(){return sessionUserId?'nethorScannerCamera:'+sessionUserId:'nethorScannerCamera'}
function readLocalCameraPreference(){
 try{
  const raw=localStorage.getItem(cameraPreferenceKey());
  if(raw==='1')return true;
  const parsed=raw?JSON.parse(raw):null;
  return parsed?.granted===true
 }catch(_){return false}
}
function writeLocalCameraPreference(granted){
 try{
  if(granted)localStorage.setItem(cameraPreferenceKey(),JSON.stringify({granted:true,at:Date.now()}));
  else localStorage.removeItem(cameraPreferenceKey())
 }catch(_){}
}
function hydrateCameraPreferenceFromCache(){
 cameraRemembered=readLocalCameraPreference();
 return cameraRemembered
}
async function queryCameraPermission(){
 if(!navigator.permissions?.query)return'unknown';
 try{
  const status=await navigator.permissions.query({name:'camera'});
  cameraPermissionState=status.state||'unknown';
  status.onchange=()=>{
   cameraPermissionState=status.state||'unknown';
   if(cameraPermissionState==='granted'&&!cameraRemembered)rememberCameraPermission(true)
  };
  if(cameraPermissionState==='granted'&&!cameraRemembered)rememberCameraPermission(true);
  return cameraPermissionState
 }catch(_){
  cameraPermissionState='unknown';
  return'unknown'
 }
}
async function loadCameraPreference(){
 hydrateCameraPreferenceFromCache();
 if(!sessionUserId){cameraPreferenceLoaded=true;return cameraRemembered}
 try{
  const {data,error}=await db.from('profiles').select('ui_preferences').eq('id',sessionUserId).maybeSingle();
  if(error)throw error;
  const prefs=data?.ui_preferences&&typeof data.ui_preferences==='object'?data.ui_preferences:{};
  if(prefs.scanner_camera_authorized===true){
   cameraRemembered=true;
   writeLocalCameraPreference(true)
  }else if(prefs.scanner_camera_authorized===false&&cameraPermissionState==='denied'){
   cameraRemembered=false;
   writeLocalCameraPreference(false)
  }
 }catch(e){console.warn('Préférence caméra:',e)}
 cameraPreferenceLoaded=true;
 return cameraRemembered
}
async function rememberCameraPermission(granted){
 const next=granted===true;
 cameraRemembered=next;
 writeLocalCameraPreference(next);
 if(!sessionUserId||!db)return;
 try{
  const {data,error}=await db.from('profiles').select('ui_preferences').eq('id',sessionUserId).maybeSingle();
  if(error)throw error;
  const prefs=data?.ui_preferences&&typeof data.ui_preferences==='object'?{...data.ui_preferences}:{};
  if(prefs.scanner_camera_authorized===next&&(!next||prefs.scanner_camera_authorized_at))return;
  prefs.scanner_camera_authorized=next;
  if(next){
   prefs.scanner_camera_authorized_at=prefs.scanner_camera_authorized_at||new Date().toISOString();
   prefs.scanner_camera_last_confirmed_at=new Date().toISOString()
  }else{
   delete prefs.scanner_camera_authorized_at;
   delete prefs.scanner_camera_last_confirmed_at
  }
  const {error:updateError}=await db.from('profiles').update({ui_preferences:prefs}).eq('id',sessionUserId);
  if(updateError)throw updateError
 }catch(e){console.warn('Enregistrement préférence caméra:',e)}
}
function cameraErrorInfo(error){
 const name=String(error?.name||'').toLowerCase(),msg=String(error?.message||error||'').toLowerCase();
 const denied=name==='notallowederror'||name==='permissiondeniederror'||msg.includes('permission denied')||msg.includes('not allowed');
 const busy=name==='notreadableerror'||name==='trackstarterror'||name==='aborterror'||msg.includes('could not start video source')||msg.includes('device in use')||msg.includes('not readable');
 const constraints=name==='overconstrainederror'||name==='constraintnotsatisfiederror'||msg.includes('constraint');
 const missing=name==='notfounderror'||name==='devicesnotfounderror'||msg.includes('no camera')||msg.includes('not found');
 return{name,msg,denied,busy,constraints,missing,retryable:busy||constraints}
}
function permissionDenied(error){return cameraErrorInfo(error).denied}
function releaseReaderTracks(){
 try{
  const videos=[...document.querySelectorAll('#reader video')];
  for(const video of videos){
   const stream=video.srcObject;
   stream?.getTracks?.().forEach(track=>{try{track.stop()}catch(_){}});
   try{video.srcObject=null}catch(_){}
  }
 }catch(_){}
}
function goBack(){
  if(SCANNER_SPA_MODE&&window.NethorMobileRouter?.replace)return window.NethorMobileRouter.replace('user-menu',{source:'scanner-back'});
  if(window.NethorNavigation?.navigateBack)return window.NethorNavigation.navigateBack();
  location.href='user-menu.html'
}
function isMobileView(){
 const mobile=window.NethorPlatform?.isMobile?.()??new URLSearchParams(location.search).get('mobile_preview')==='1';
 return !!mobile&&(!SCANNER_SPA_MODE||scannerRuntimeActive)
}
function setCameraState(text){const el=$('cameraStateText');if(el)el.textContent=text}
function showCameraFallback(message){
  $('cameraFallbackText').textContent=message||'Impossible d’ouvrir la caméra.';
  $('cameraFallback').classList.add('show');
  setCameraState('Caméra indisponible')
}
function hideCameraFallback(){$('cameraFallback').classList.remove('show')}
function normalizeEan(value){return String(value||'').replace(/\D/g,'').slice(0,14)}
function validEanLength(v){return v.length===8||v.length===12||v.length===13||v.length===14}
function gs1CheckDigitForBody(body){
 const digits=normalizeEan(body);if(!digits)return'';
 let sum=0,weight=3;
 for(let i=digits.length-1;i>=0;i--){sum+=Number(digits[i])*weight;weight=weight===3?1:3}
 return String((10-(sum%10))%10)
}
function gs1CheckDigitValid(value){
 const v=normalizeEan(value);
 if(![8,12,13,14].includes(v.length))return false;
 return gs1CheckDigitForBody(v.slice(0,-1))===v.slice(-1)
}
function eanCandidates(v){
 v=normalizeEan(v);if(!v)return[];
 const out=[v];
 if(v.length===12){
  out.push('0'+v);
  out.push(v+gs1CheckDigitForBody(v))
 }
 if(v.length===13&&v.startsWith('0'))out.push(v.slice(1));
 if(v.length===14&&v.startsWith('0'))out.push(v.slice(1));
 if(v.length<13)out.push(v.padStart(13,'0'));
 return [...new Set(out.filter(Boolean))]
}
function manualEanCandidates(v){
 v=normalizeEan(v);if(!v)return[];
 const out=eanCandidates(v);
 if(v.length===7)out.push(v+gs1CheckDigitForBody(v));
 if(v.length===11)out.push(v+gs1CheckDigitForBody(v));
 if(v.length===13)out.push(v+gs1CheckDigitForBody(v));
 return [...new Set(out.filter(Boolean))]
}
function scannerFormats(){
 const F=window.Html5QrcodeSupportedFormats||{};
 return ['EAN_13','EAN_8','UPC_A','UPC_E','ITF'].map(k=>F[k]).filter(v=>v!==undefined&&v!==null)
}
async function nativeBarcodeDetector(){
 if(nativeDetectorPromise)return nativeDetectorPromise;
 nativeDetectorPromise=(async()=>{
  if(!('BarcodeDetector'in window))return null;
  try{
   const supported=typeof BarcodeDetector.getSupportedFormats==='function'?await BarcodeDetector.getSupportedFormats():[];
   const wanted=['ean_13','ean_8','upc_a','upc_e','itf'].filter(x=>!supported.length||supported.includes(x));
   if(!wanted.length)return null;
   return new BarcodeDetector({formats:wanted})
  }catch(e){console.debug('BarcodeDetector indisponible:',e);return null}
 })();
 return nativeDetectorPromise
}
function captureVideoFrame(video,maxSide=500){
 const vw=video?.videoWidth||0,vh=video?.videoHeight||0;if(!vw||!vh)return null;
 const scale=Math.min(1,maxSide/Math.max(vw,vh)),canvas=document.createElement('canvas');
 canvas.width=Math.max(2,Math.round(vw*scale));canvas.height=Math.max(2,Math.round(vh*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,canvas.width,canvas.height);
 return canvas
}
function centerZoomCapture(source,scale=.74){
 const s=Math.max(.55,Math.min(.95,scale)),sw=Math.round(source.width*s),sh=Math.round(source.height*s);
 const sx=Math.max(0,Math.round((source.width-sw)/2)),sy=Math.max(0,Math.round((source.height-sh)/2));
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,sx,sy,sw,sh,0,0,canvas.width,canvas.height);return canvas
}
function padQuietZoneCapture(source,ratio=.08){
 const pad=Math.max(8,Math.round(Math.max(source.width,source.height)*ratio));
 const canvas=document.createElement('canvas');canvas.width=source.width+pad*2;canvas.height=source.height+pad*2;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,pad,pad);return canvas
}
function binaryBarcodeCapture(source){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 const img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,hist=new Uint32Array(256);let total=0,sum=0;
 for(let i=0;i<d.length;i+=4){const y=Math.max(0,Math.min(255,Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114)));hist[y]++;total++;sum+=y}
 let sumB=0,wB=0,max=0,threshold=128;
 for(let t=0;t<256;t++){
  wB+=hist[t];if(!wB)continue;
  const wF=total-wB;if(!wF)break;
  sumB+=t*hist[t];
  const mB=sumB/wB,mF=(sum-sumB)/wF,between=wB*wF*(mB-mF)*(mB-mF);
  if(between>max){max=between;threshold=t}
 }
 for(let i=0;i<d.length;i+=4){const y=d[i]*.299+d[i+1]*.587+d[i+2]*.114,v=y>threshold?255:0;d[i]=d[i+1]=d[i+2]=v}
 ctx.putImageData(img,0,0);return canvas
}
function averageLuma(source){
 try{
  const ctx=source.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,source.width,source.height).data;
  let sum=0,n=0,step=Math.max(4,Math.floor(img.length/(4*2500))*4);
  for(let i=0;i<img.length;i+=step){sum+=img[i]*.299+img[i+1]*.587+img[i+2]*.114;n++}
  return n?sum/n:128
 }catch(_){return 128}
}
function rotateCapture(source,deg){
 if(!deg)return source;
 const swap=deg===90||deg===270,canvas=document.createElement('canvas');
 canvas.width=swap?source.height:source.width;canvas.height=swap?source.width:source.height;
 const ctx=canvas.getContext('2d');ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(source,-source.width/2,-source.height/2);
 return canvas
}
function enhanceBarcodeCapture(source){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 const img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,hist=new Uint32Array(256);let pixels=0;
 for(let i=0;i<d.length;i+=4){const y=Math.max(0,Math.min(255,Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114)));hist[y]++;pixels++}
 const percentile=p=>{const target=pixels*p;let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=target)return i}return p<.5?0:255};
 const lo=percentile(.04),hi=Math.max(lo+24,percentile(.96)),gain=255/(hi-lo);
 for(let i=0;i<d.length;i+=4){
  const y=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
  const v=Math.max(0,Math.min(255,Math.round((y-lo)*gain)));
  d[i]=d[i+1]=d[i+2]=v
 }
 ctx.putImageData(img,0,0);return canvas
}
function assistProfileKey(){return sessionUserId?'nethorScannerAssist:'+sessionUserId:'nethorScannerAssist'}
function readAssistProfile(){
 try{
  const raw=JSON.parse(localStorage.getItem(assistProfileKey())||'{}');
  return{
   rotations:raw.rotations&&typeof raw.rotations==='object'?raw.rotations:{},
   enhanced:Number(raw.enhanced||0),
   normal:Number(raw.normal||0)
  }
 }catch(_){return{rotations:{},enhanced:0,normal:0}}
}
function recordAssistSuccess(meta={}){
 if(!['native','zxing'].includes(meta.source))return;
 try{
  const p=readAssistProfile(),key=String(Number(meta.rotation)||0);
  p.rotations[key]=Number(p.rotations[key]||0)+1;
  if(meta.enhanced)p.enhanced++;else p.normal++;
  localStorage.setItem(assistProfileKey(),JSON.stringify(p))
 }catch(_){}
}
function assistRotationOrder(){
 const p=readAssistProfile(),base=[0,180,90,270],priority={0:0,180:1,90:2,270:3};
 return base.sort((a,b)=>(Number(p.rotations[String(b)]||0)-Number(p.rotations[String(a)]||0))||(priority[a]-priority[b]))
}
async function detectAssistSet(detector,source,enhanced){
 for(const deg of assistRotationOrder()){
  const rotated=rotateCapture(source,deg);
  if(detector){
   try{
    const hits=await detector.detect(rotated);
    const hit=(hits||[]).find(x=>normalizeEan(x.rawValue).length>=6);
    if(hit){await onScanSuccess(hit.rawValue,{source:'native',rotation:deg,enhanced});return true}
   }catch(_){}
  }
  const zxingText=zxingDecodeCanvas(rotated);
  if(zxingText&&normalizeEan(zxingText).length>=6){
   await onScanSuccess(zxingText,{source:'zxing',rotation:deg,enhanced});
   return true
  }
 }
 return false
}
async function runRobustAssist(){
 if(assistBusy||!scannerRunning||searchBusy||currentProduct||document.hidden)return;
 const detector=await nativeBarcodeDetector();
 if(!detector&&!window.ZXing?.BrowserMultiFormatReader){
  try{await loadZxingLibrary()}catch(_){}
 }
 if(!detector&&!window.ZXing?.BrowserMultiFormatReader)return;
 const video=$('reader')?.querySelector('video'),base=captureVideoFrame(video,640);if(!base)return;
 assistBusy=true;assistCycle++;
 try{
  const luma=averageLuma(base);
  if(luma<58&&activeCameraTrack?.getCapabilities?.()?.torch&&!torchEnabled)setCameraState('Lumière faible · lampe disponible');
  const narrow=centerZoomCapture(base,.72);
  const first=assistCycle%2?narrow:base;
  if(await detectAssistSet(detector,first,false))return;
  if(assistCycle%2===0){
   const enhanced=enhanceBarcodeCapture(first);
   if(await detectAssistSet(detector,enhanced,true))return
  }
  if(assistCycle%4===0){
   const quiet=padQuietZoneCapture(enhanceBarcodeCapture(narrow),.09);
   if(await detectAssistSet(detector,quiet,true))return
  }
  if(assistCycle%6===0){
   const binary=padQuietZoneCapture(binaryBarcodeCapture(narrow),.08);
   if(await detectAssistSet(detector,binary,true))return
  }
 }catch(e){console.debug('Lecture assistée:',e)}
 finally{assistBusy=false}
}
function startAssistLoop(){
 stopAssistLoop();
 assistTimer=setInterval(()=>{runRobustAssist()},850);
 setTimeout(()=>{runRobustAssist()},280)
}
function stopAssistLoop(){
 if(assistTimer){clearInterval(assistTimer);assistTimer=null}
 assistBusy=false
}
function safeStop(){
  stopAssistLoop();
  torchEnabled=false;paintTorchButton();
  const track=activeCameraTrack;activeCameraTrack=null;
  if(track?.applyConstraints){try{track.applyConstraints({advanced:[{torch:false}]})}catch(_){}}
  releaseReaderTracks();
  if(!scanner||(!scannerRunning&&!scannerStarting))return Promise.resolve();
  scannerRunning=false;scannerStarting=false;
  return Promise.resolve(scanner.stop?.()).catch(()=>{}).then(()=>{try{scanner.clear()}catch(_){}});
}
function paintTorchButton(){
 const btn=$('scannerTorchBtn');if(!btn)return;
 let supported=false;
 try{supported=!!activeCameraTrack?.getCapabilities?.()?.torch}catch(_){}
 btn.classList.toggle('show',supported);
 btn.classList.toggle('on',supported&&torchEnabled);
 btn.textContent=torchEnabled?'Lampe ON':'Lampe'
}
async function toggleScannerTorch(){
 if(!activeCameraTrack?.applyConstraints)return;
 try{
  const caps=activeCameraTrack.getCapabilities?.()||{};
  if(!caps.torch)return;
  torchEnabled=!torchEnabled;
  await activeCameraTrack.applyConstraints({advanced:[{torch:torchEnabled}]});
  paintTorchButton()
 }catch(e){torchEnabled=false;paintTorchButton();console.debug('Lampe caméra:',e)}
}
async function tuneActiveCamera(){
 try{
  const video=$('reader')?.querySelector('video');
  if(!video)return;
  video.setAttribute('playsinline','');video.muted=true;
  const track=video.srcObject?.getVideoTracks?.()[0];activeCameraTrack=track||null;
  if(!track?.getCapabilities||!track?.applyConstraints){paintTorchButton();return}
  const caps=track.getCapabilities(),advanced={};
  if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous'))advanced.focusMode='continuous';
  if(Array.isArray(caps.exposureMode)&&caps.exposureMode.includes('continuous'))advanced.exposureMode='continuous';
  if(Array.isArray(caps.whiteBalanceMode)&&caps.whiteBalanceMode.includes('continuous'))advanced.whiteBalanceMode='continuous';
  const constraints={};
  if(caps.width)constraints.width={ideal:1280};
  if(caps.height)constraints.height={ideal:720};
  if(caps.frameRate)constraints.frameRate={ideal:30};
  if(Object.keys(advanced).length)constraints.advanced=[advanced];
  if(Object.keys(constraints).length)await track.applyConstraints(constraints).catch(()=>{});
  paintTorchButton()
 }catch(e){console.debug('Optimisation caméra non appliquée:',e);paintTorchButton()}
}
function lockScannerViewport(){
 try{window.scrollTo(0,0)}catch(_){}
 const input=$('eanInput');if(input){input.blur();input.setAttribute('readonly','');input.setAttribute('tabindex','-1');input.setAttribute('inputmode','none')}
}
function activateManualInput(input,event){
 if(!input)return;
 event?.preventDefault?.();
 input.removeAttribute('readonly');
 input.setAttribute('tabindex','0');
 input.setAttribute('inputmode','numeric');
 input.focus({preventScroll:true});
 try{input.setSelectionRange(input.value.length,input.value.length)}catch(_){}
}
function resetManualInputLock(){
 const input=$('eanInput');if(!input)return;
 input.blur();input.setAttribute('readonly','');input.setAttribute('tabindex','-1');input.setAttribute('inputmode','none')
}


let qrLibraryPromise=null;
function loadQrLibrary(){
  if(window.Html5Qrcode&&window.Html5QrcodeSupportedFormats)return Promise.resolve(true);
  if(qrLibraryPromise)return qrLibraryPromise;
  setCameraState('Chargement du scanner…');
  qrLibraryPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-nethor-qr-runtime="1"]');
    const ready=()=>window.Html5Qrcode&&window.Html5QrcodeSupportedFormats?resolve(true):reject(new Error('Module scanner indisponible'));
    if(existing){
      existing.addEventListener('load',ready,{once:true});
      existing.addEventListener('error',()=>reject(new Error('Chargement scanner impossible')),{once:true});
      return
    }
    const script=document.createElement('script');
    script.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async=true;
    script.dataset.nethorQrRuntime='1';
    script.onload=ready;
    script.onerror=()=>reject(new Error('Chargement scanner impossible'));
    document.head.appendChild(script)
  }).catch(err=>{qrLibraryPromise=null;throw err});
  return qrLibraryPromise
}
function loadZxingLibrary(){
 if(window.ZXing?.BrowserMultiFormatReader)return Promise.resolve(true);
 if(zxingLibraryPromise)return zxingLibraryPromise;
 zxingLibraryPromise=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-nethor-zxing-runtime="1"]');
  const ready=()=>window.ZXing?.BrowserMultiFormatReader?resolve(true):reject(new Error('ZXing indisponible'));
  if(existing){
   existing.addEventListener('load',ready,{once:true});
   existing.addEventListener('error',()=>reject(new Error('Chargement ZXing impossible')),{once:true});
   return
  }
  const script=document.createElement('script');
  script.src='https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
  script.async=true;
  script.dataset.nethorZxingRuntime='1';
  script.onload=ready;
  script.onerror=()=>reject(new Error('Chargement ZXing impossible'));
  document.head.appendChild(script)
 }).catch(err=>{zxingLibraryPromise=null;throw err});
 return zxingLibraryPromise
}
function getZxingReader(){
 if(zxingReader)return zxingReader;
 const Z=window.ZXing;if(!Z?.BrowserMultiFormatReader)return null;
 try{
  const hints=new Map();
  const formats=[
   Z.BarcodeFormat?.EAN_13,
   Z.BarcodeFormat?.EAN_8,
   Z.BarcodeFormat?.UPC_A,
   Z.BarcodeFormat?.UPC_E,
   Z.BarcodeFormat?.ITF,
   Z.BarcodeFormat?.CODE_128
  ].filter(v=>v!==undefined&&v!==null);
  if(Z.DecodeHintType?.POSSIBLE_FORMATS!==undefined)hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,formats);
  if(Z.DecodeHintType?.TRY_HARDER!==undefined)hints.set(Z.DecodeHintType.TRY_HARDER,true);
  if(Z.DecodeHintType?.ALSO_INVERTED!==undefined)hints.set(Z.DecodeHintType.ALSO_INVERTED,true);
  if(Z.DecodeHintType?.ALLOWED_LENGTHS!==undefined)hints.set(Z.DecodeHintType.ALLOWED_LENGTHS,new Int32Array([8,12,13,14]));
  if(Z.DecodeHintType?.ASSUME_GS1!==undefined)hints.set(Z.DecodeHintType.ASSUME_GS1,true);
  zxingReader=new Z.BrowserMultiFormatReader(hints);
  return zxingReader
 }catch(e){
  console.debug('Initialisation ZXing:',e);
  return null
 }
}
function zxingDecodeCanvas(canvas){
 const reader=getZxingReader();if(!reader)return null;
 try{
  const result=reader.decodeFromCanvas(canvas);
  const text=typeof result?.getText==='function'?result.getText():result?.text;
  return text?String(text):null
 }catch(_){return null}
}
async function createAndStartScanner(){
 const config={
  fps:24,
  qrbox:(w,h)=>{
   const size=Math.max(220,Math.min(330,w*.82,h*.78));
   return{width:size,height:size}
  },
  aspectRatio:1.777778,
  disableFlip:true
 };
 const sources=[
  {facingMode:'environment'},
  {facingMode:{ideal:'environment'}}
 ];
 let lastError=null;
 for(let attempt=0;attempt<3;attempt++){
  const source=sources[Math.min(attempt,sources.length-1)];
  try{
   releaseReaderTracks();
   if(scanner){try{await scanner.stop()}catch(_){ }try{scanner.clear()}catch(_){}}
   scanner=new Html5Qrcode('reader',{
    formatsToSupport:scannerFormats(),
    experimentalFeatures:{useBarCodeDetectorIfSupported:true},
    verbose:false
   });
   if(attempt)setCameraState('Nouvelle tentative caméra…');
   await scanner.start(source,config,onScanSuccess,()=>{});
   return true
  }catch(e){
   lastError=e;
   const info=cameraErrorInfo(e);
   releaseReaderTracks();
   try{scanner?.clear?.()}catch(_){}
   if(info.denied||info.missing)break;
   if(attempt<2)await new Promise(r=>setTimeout(r,attempt===0?450:900))
  }
 }
 throw lastError||new Error('Camera start failed')
}
async function startCamera(){
  if(!isMobileView())return;
  if(cameraStartPromise)return cameraStartPromise;
  cameraStartPromise=(async()=>{
    if(scannerRunning)return;
    hideCameraFallback();
    // La permission navigateur est une information, pas un verrou :
    // Safari/iOS peut renvoyer un état incomplet ou "prompt" même après accord.
    queryCameraPermission().catch(()=>{});
    try{await loadQrLibrary()}catch(e){
      console.warn('Scanner module:',e);
      showCameraFallback('Le module de lecture n’a pas pu être chargé. Tu peux saisir l’EAN13 manuellement.');
      return
    }
    if(!window.Html5Qrcode||!window.Html5QrcodeSupportedFormats){
      showCameraFallback('Le module de lecture n’a pas pu être chargé. Tu peux saisir l’EAN13 manuellement.');
      return
    }
    if(scannerRunning)return;
    try{
      scannerStarting=true;
      setCameraState(cameraRemembered?'Ouverture de la caméra…':'Autorisation caméra…');
      await createAndStartScanner();
      scannerStarting=false;
      scannerRunning=true;
      assistCycle=0;
      setCameraState('Prêt à scanner');
      await tuneActiveCamera();
      startAssistLoop();
      rememberCameraPermission(true)
    }catch(e){
      scannerStarting=false;
      scannerRunning=false;
      releaseReaderTracks();
      console.warn('Scanner camera:',e);
      const info=cameraErrorInfo(e);
      if(info.denied)await rememberCameraPermission(false);
      if(info.denied){
       showCameraFallback('L’accès caméra est refusé par iOS ou le navigateur. Autorise la caméra pour ce site puis touche « Réessayer ».')
      }else if(info.missing){
       showCameraFallback('Aucune caméra utilisable n’a été détectée sur cet appareil.')
      }else if(info.busy){
       showCameraFallback('La caméra n’a pas pu redémarrer correctement. Nethor a libéré le flux automatiquement : touche « Réessayer ».')
      }else{
       showCameraFallback('Impossible d’ouvrir la caméra pour le moment. Touche « Réessayer ».')
      }
    }
  })().finally(()=>{cameraStartPromise=null});
  return cameraStartPromise
}

async function onScanSuccess(decodedText,meta={}){
  const code=normalizeEan(decodedText),now=Date.now();
  if(code.length<6||searchBusy)return;
  if(code===lastCode&&now-lastCodeAt<1500)return;
  lastCode=code;lastCodeAt=now;
  try{navigator.vibrate?.(45)}catch(_){}
  const gs1Valid=gs1CheckDigitValid(code);
  setCameraState(validEanLength(code)?(gs1Valid?'Code GS1 reconnu':'Code reconnu'):'Code partiel détecté');
  if(validEanLength(code))await findProduct(code,true,{...meta,gs1Valid});
  else await findHypotheses(code,true,meta)
}

async function findProduct(raw,fromCamera=false,meta={}){
  const code=normalizeEan(raw);
  $('eanInput').value=code;
  if(fromCamera&&!validEanLength(code)){
    renderNotFound(code,'Le code-barres doit contenir 8, 12, 13 ou 14 chiffres.');
    return
  }
  if(!fromCamera&&!code){
    renderNotFound(code,'Saisis au moins un chiffre.');
    return
  }
  searchBusy=true;
  setCameraState('Recherche de la fiche…');
  const candidates=fromCamera?eanCandidates(code):manualEanCandidates(code);
  const {data,error}=await db.rpc('scan_products_by_ean',{lookup_eans:candidates});
  searchBusy=false;
  if(error){
    console.error(error);
    renderNotFound(code,'Impossible de rechercher la fiche pour le moment.');
    if(fromCamera)setTimeout(()=>startCamera(),1200);
    return
  }
  const rows=(data||[]).map(p=>({
    ...p,
    product_families:p.family_name?{name:p.family_name,slug:p.family_slug}:null,
    product_categories:p.category_name?{name:p.category_name}:null,
    product_packagings:p.packaging_name?{name:p.packaging_name}:null
  }));
  const product=candidates.map(candidate=>rows.find(p=>String(p.ean||'')===candidate)).find(Boolean)||rows[0]||null;
  if(!product){
    const proposed=await findHypotheses(code,fromCamera,meta);
    if(proposed)return;
    await safeStop();
    renderNotFound(code,'Aucune correspondance suffisamment fiable dans les fiches articles.');
    setCameraState('Article introuvable');
    return
  }
  currentProduct=product;
  recordAssistSuccess(meta);
  await safeStop();
  renderProduct(product);
  setCameraState('Fiche trouvée')
}

async function findHypotheses(raw,fromCamera=false,meta={}){
 const code=normalizeEan(raw);if(code.length<6||searchBusy)return false;
 searchBusy=true;setCameraState('Analyse de la meilleure correspondance…');
 try{
  const {data,error}=await db.rpc('scan_product_hypotheses',{observed:code,max_results:3});
  if(error)throw error;
  const rows=(data||[]).map(p=>({
   ...p,
   confidence:Number(p.confidence||0),
   product_families:p.family_name?{name:p.family_name,slug:p.family_slug}:null,
   product_categories:p.category_name?{name:p.category_name}:null,
   product_packagings:p.packaging_name?{name:p.packaging_name}:null
  }));
  if(!rows.length)return false;
  hypothesisProducts=rows;
  await safeStop();
  renderHypotheses(code,rows,meta);
  setCameraState('Correspondance à confirmer');
  return true
 }catch(e){console.error('Hypothèses Scanner:',e);return false}
 finally{searchBusy=false}
}
function renderHypotheses(observed,rows,meta={}){
 document.body.classList.add('scannerResultOpen');
 const result=$('result');if(!result)return;
 const best=rows[0],bestPct=Math.round(Number(best.confidence||0)*100);
 result.className='result show resultModal';
 result.innerHTML=
  '<button class="resultModalBackdrop" type="button" aria-label="Fermer" onclick="closeProductModal()"></button>'+
  '<article class="resultModalCard" role="dialog" aria-modal="true" aria-labelledby="scannerProductTitle">'+
   '<div class="resultModalTop"><div class="resultModalTitle"><strong id="scannerProductTitle">Correspondance probable</strong><small>Code observé : '+esc(observed)+'</small></div><button class="resultModalClose" type="button" onclick="closeProductModal()" aria-label="Fermer">×</button></div>'+
   '<p class="hypothesisIntro">Le code n’a pas donné de correspondance exacte. Nethor compare uniquement avec les fiches réellement enregistrées et te propose les correspondances les plus plausibles.</p>'+
   '<div class="hypothesisList">'+rows.map((p,i)=>{
    const pct=Math.round(Number(p.confidence||0)*100),path=[p.family_name,p.category_name].filter(Boolean).join(' · ');
    return '<button class="hypothesisRow" type="button" onclick="chooseHypothesis('+i+')">'+
      '<span class="hypothesisPhoto">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="">':'📦')+'</span>'+
      '<span class="hypothesisCopy"><strong>'+esc(p.name||'Article')+'</strong><small>'+esc(path||'Fiche article')+'<br>EAN '+esc(p.ean||'—')+' · '+esc(p.match_reason||'Correspondance')+'</small></span>'+
      '<span class="hypothesisScore">Score '+pct+' %</span>'+
     '</button>'
   }).join('')+'</div>'+
   '<div class="hypothesisWarning">Aucune fiche n’est validée automatiquement sur une hypothèse. Sélectionne uniquement le produit qui correspond réellement à l’article devant toi.</div>'+
   '<div class="resultActions"><button class="secondary" type="button" onclick="closeProductModal()">Reprendre le scan</button><button class="primary" type="button" onclick="chooseHypothesis(0)">Meilleure hypothèse · score '+bestPct+' %</button></div>'+
  '</article>'
}
function chooseHypothesis(index){
 const p=hypothesisProducts[Number(index)];if(!p)return;
 currentProduct=p;
 renderProduct(p,{hypothesis:true,confidence:p.confidence,reason:p.match_reason})
}
function renderProduct(p,match={}){
  document.body.classList.add('scannerResultOpen');
  const family=p.product_families?.name||'Non répertorié';
  const category=p.product_categories?.name||'Non répertorié';
  const packaging=p.product_packagings?.name||'Non répertorié';
  const pack=packaging+(p.packaging_count?' · '+p.packaging_count:'');
  const result=$('result');
  result.className='result show resultModal';
  result.innerHTML=
    '<button class="resultModalBackdrop" type="button" aria-label="Fermer la fiche" onclick="closeProductModal()"></button>'+
    '<article class="resultModalCard" role="dialog" aria-modal="true" aria-labelledby="scannerProductTitle">'+
      '<div class="resultModalTop"><div class="resultModalTitle"><strong id="scannerProductTitle">Fiche article</strong><small>'+(match.hypothesis?'Fiche sélectionnée depuis une hypothèse':'EAN reconnu par le scanner')+'</small></div><button class="resultModalClose" type="button" onclick="closeProductModal()" aria-label="Fermer">×</button></div>'+
      '<div class="resultStatus"><span class="resultStatusDot"></span>'+(match.hypothesis?('Hypothèse confirmée · '+Math.round(Number(match.confidence||0)*100)+' %'):'Fiche article trouvée')+'</div>'+
      '<div class="product">'+
        '<div class="productPhoto">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="">':'📦')+'</div>'+
        '<div class="productCopy"><h3>'+esc(p.name||'Article')+'</h3><div class="path">'+esc(family)+' · '+esc(category)+'</div><span class="statusBadge '+(p.on_sale?'on':'off')+'">'+(p.on_sale?'EN VENTE':'HORS VENTE')+'</span></div>'+
      '</div>'+
      '<div class="facts">'+
        '<div class="fact wide"><span>EAN13</span><strong>'+esc(p.ean||'—')+'</strong></div>'+
        '<div class="fact"><span>Code article</span><strong>'+esc(p.article_code||'—')+'</strong></div>'+
        '<div class="fact"><span>Conditionnement</span><strong>'+esc(pack)+'</strong></div>'+
      '</div>'+
      '<div class="resultActions"><button class="secondary" type="button" onclick="closeProductModal()">Fermer</button><button class="primary" type="button" onclick="openArticle()">Ouvrir la fiche article</button></div>'+
    '</article>';
  resetManualInputLock()
}
function renderNotFound(code,message){
  currentProduct=null;
  $('result').className='result show';
  $('result').innerHTML=
    '<div class="resultStatus notFound"><span class="resultStatusDot"></span>Fiche introuvable</div>'+
    '<div class="notFoundBox"><strong>'+esc(code||'EAN13 non reconnu')+'</strong><p>'+esc(message||'Aucune fiche article trouvée.')+'</p></div>'+
    '<div class="resultActions"><button class="secondary" type="button" onclick="scanAnother()">Réessayer</button><button class="primary" type="button" onclick="focusManual()">Saisir un EAN13</button></div>';
  $('result').scrollTop=0
}
function closeProductModal(){
  const result=$('result');
  currentProduct=null;hypothesisProducts=[];
  document.body.classList.remove('scannerResultOpen');
  if(result){result.className='result';result.innerHTML=''}
  $('eanInput').value='';lastCode='';resetManualInputLock();
  setCameraState('Prêt à scanner');
  if(isMobileView()&&!scannerRunning)setTimeout(startCamera,90)
}
function scanAnother(){
  document.body.classList.remove('scannerResultOpen');
  currentProduct=null;hypothesisProducts=[];$('result').className='result';$('result').innerHTML='';$('eanInput').value='';lastCode='';resetManualInputLock();startCamera()
}
function focusManual(){const input=$('eanInput');if(!input)return;input.removeAttribute('readonly');input.setAttribute('tabindex','0');input.setAttribute('inputmode','numeric');input.focus({preventScroll:true});input.select()}
function manualSearch(e){e.preventDefault();safeStop().then(()=>findProduct($('eanInput').value,false))}
function openArticle(){
  if(!currentProduct?.ean)return;
  location.href='articles.html?ean='+encodeURIComponent(currentProduct.ean)+'&source=scanner'
}

function scannerPageAccess(role,cfg){
  const page=cfg.pages?.scanner&&typeof cfg.pages.scanner==='object'?cfg.pages.scanner:{};
  if(page.enabled===false)return false;
  const explicit=cfg.role_permissions?.scanner?.[role];
  if(['none','view','operate','manage'].includes(explicit))return explicit!=='none';
  if(Array.isArray(page.roles))return page.roles.includes(role);
  return true
}
function applyScannerPageConfig(cfg){
  const p=cfg?.pages?.scanner;if(!p||typeof p!=='object')return;
  const title=String(p.nav_label||p.label||'Scanner').trim()||'Scanner';
  const visibleTitle=title.replace(/\s*\(?b[êe]ta\)?\s*$/i,'').trim()||'Scanner';
  const subtitle=String(p.subtitle||'Scanne un code-barres pour retrouver sa fiche article EAN13.').trim();
  const h1=document.querySelector('.title h1'),sub=document.querySelector('.title p');
  if(h1)h1.textContent=visibleTitle;if(sub&&subtitle)sub.textContent=subtitle;
  document.title=title+' · Nethor'
}
async function boot(){
  if(isMobileView()){
   loadQrLibrary().catch(()=>{});
   loadZxingLibrary().catch(()=>{})
  }
  await waitForSupabase();
  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await db.auth.getSession();
  if(!session)return location.replace('index.html');
  const [{data:profile},{data:setting}]=await Promise.all([
    db.from('profiles').select('role').eq('id',session.user.id).maybeSingle(),
    db.from('app_settings').select('value').eq('key','site_config').maybeSingle()
  ]);
  const cfg=setting?.value&&typeof setting.value==='object'?setting.value:{};
  applyScannerPageConfig(cfg);
  if(!profile||!scannerPageAccess(profile.role,cfg))return location.replace('home.html');
  sessionUserId=session.user.id;
  if(!isMobileView())return;
  lockScannerViewport();
  hydrateCameraPreferenceFromCache();
  const preferenceSync=loadCameraPreference();
  lockScannerViewport();
  startCamera();
  queryCameraPermission().catch(()=>{});
  preferenceSync.catch(()=>{})
}
window.addEventListener('pagehide',()=>{if(visibilityStopTimer)clearTimeout(visibilityStopTimer);safeStop()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('result')?.classList.contains('resultModal'))closeProductModal()});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){
  if(visibilityStopTimer)clearTimeout(visibilityStopTimer);
  visibilityStopTimer=setTimeout(()=>{if(document.hidden)safeStop()},1800);
  return
 }
 if(visibilityStopTimer){clearTimeout(visibilityStopTimer);visibilityStopTimer=null}
 if(isMobileView()&&!currentProduct&&!scannerRunning&&!scannerStarting)setTimeout(startCamera,80)
});
document.addEventListener('gesturestart',e=>{if(isMobileView())e.preventDefault()},{passive:false});
document.addEventListener('gesturechange',e=>{if(isMobileView())e.preventDefault()},{passive:false});
document.addEventListener('touchmove',e=>{if(isMobileView()&&e.touches?.length>1)e.preventDefault()},{passive:false});
window.addEventListener('resize',()=>{if(isMobileView()&&!document.activeElement?.matches?.('#eanInput'))lockScannerViewport()});

async function scannerRuntimeMount(){
 scannerRuntimeActive=true;
 try{
  await boot();
  return true
 }catch(e){
  scannerRuntimeActive=false;
  console.error('[Nethor ScannerRuntime] mount',e);
  throw e
 }
}
async function scannerRuntimeUnmount(){
 scannerRuntimeActive=false;
 if(visibilityStopTimer){clearTimeout(visibilityStopTimer);visibilityStopTimer=null}
 try{stopAssistLoop()}catch(_){}
 try{await safeStop()}catch(_){}
 document.body.classList.remove('scannerResultOpen');
 currentProduct=null;hypothesisProducts=[];lastCode='';lastCodeAt=0;searchBusy=false;scannerStarting=false;
 return true
}
Object.assign(window,{
 goBack,startCamera,toggleScannerTorch,manualSearch,activateManualInput,closeProductModal,chooseHypothesis,scanAnother,focusManual,openArticle
});
window.NethorScannerRuntime=Object.freeze({
 mount:scannerRuntimeMount,
 unmount:scannerRuntimeUnmount,
 get active(){return scannerRuntimeActive},
 get running(){return scannerRunning}
});
if(!SCANNER_SPA_MODE)void scannerRuntimeMount();

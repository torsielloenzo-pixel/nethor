(function(){
"use strict";
var STORAGE_KEY="nethor:caisse-rush-best-v1";
var current=null;
function q(root,sel){return root.querySelector(sel)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rnd(min,max){return min+Math.random()*(max-min)}
function safeBest(){
 try{
  var raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
  return {score:Number(raw.score)||0,combo:Number(raw.combo)||0,articles:Number(raw.articles)||0};
 }catch(_){return {score:0,combo:0,articles:0}}
}
function saveBest(best){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(best))}catch(_){}}
function shell(){
 return [
  '<div class="cashShell">',
   '<div class="cashGameHead">',
    '<div><span class="cashGameEyebrow">MINI-JEU · BÊTA ADMIN</span><h2>Caisse Rush</h2><p>Scanne au bon moment, garde ton combo et tiens la caisse quand la file s’accélère.</p></div>',
    '<div class="cashBestCard"><span>Record local</span><strong data-cash-best>0 pts</strong><small data-cash-best-combo>Combo ×0</small></div>',
   '</div>',
   '<div class="cashDevice">',
    '<div class="cashHud">',
     '<div class="cashMetric"><span>Score</span><strong data-cash-score>0</strong></div>',
     '<div class="cashMetric"><span>Combo</span><strong data-cash-combo>×1</strong></div>',
     '<div class="cashMetric"><span>Articles</span><strong data-cash-items>0</strong></div>',
     '<div class="cashLives" data-cash-lives aria-label="Erreurs restantes">● ● ●</div>',
     '<button class="cashPause" type="button" data-cash-pause aria-label="Mettre en pause" disabled>Ⅱ</button>',
    '</div>',
    '<div class="cashPhaseBar"><strong data-cash-phase>Ouverture · 08:30</strong><span data-cash-speed>File tranquille</span></div>',
    '<div class="cashStage" data-cash-stage tabindex="0" role="application" aria-label="Caisse Rush. Touchez la caisse, cliquez ou appuyez sur Espace pour scanner.">',
     '<div class="cashBackdrop" aria-hidden="true"><span class="cashLaneSign">CAISSE 3</span><span class="cashCustomer">●</span><span class="cashBasket">▱</span></div>',
     '<div class="cashCounter" aria-hidden="true"><span class="cashScreen">N</span><span class="cashScanner"><i></i></span></div>',
     '<div class="cashBelt" data-cash-belt aria-hidden="true"><span class="cashBeltLine"></span></div>',
     '<div class="cashScanZone" data-cash-zone aria-hidden="true"><span>SCAN</span></div>',
     '<div class="cashToast" data-cash-toast aria-live="polite"></div>',
     '<div class="cashOverlay" data-cash-overlay>',
      '<span class="cashOverlayBadge" data-cash-overlay-badge>CAISSE RUSH</span>',
      '<strong data-cash-overlay-title>Prêt à ouvrir la caisse ?</strong>',
      '<p data-cash-overlay-text>Scanne quand le produit passe sous la zone orange. Espace fonctionne aussi sur ordinateur.</p>',
      '<button type="button" data-cash-start>Ouvrir la caisse</button>',
     '</div>',
    '</div>',
    '<div class="cashControls">',
     '<button type="button" class="cashScanButton" data-cash-scan><span class="cashScanIcon">▥</span><strong>SCANNER</strong><small>Toucher · cliquer · Espace</small></button>',
    '</div>',
   '</div>',
   '<div class="cashLegend"><span>🥚 fragile</span><span>💧 pack lourd</span><span>🥐 sans EAN</span><span>🏷️ à rescanner</span></div>',
   '<div class="cashGameFoot"><button type="button" data-cash-restart>Recommencer</button></div>',
   '<p class="cashRules">3 erreurs maximum. Le record reste enregistré uniquement sur cet appareil pendant la bêta et n’est pas envoyé à Nethor.</p>',
  '</div>'
 ].join("");
}
var TYPES={
 normal:{emoji:"🥫",label:"Conserve",className:"normal",bonus:0},
 bottle:{emoji:"🥤",label:"Boisson",className:"bottle",bonus:10},
 eggs:{emoji:"🥚",label:"Œufs",className:"eggs",bonus:20},
 heavy:{emoji:"💧",label:"Pack d’eau",className:"heavy",bonus:30},
 produce:{emoji:"🥐",label:"Sans EAN",className:"produce",bonus:35},
 unreadable:{emoji:"🏷️",label:"Étiquette",className:"unreadable",bonus:45}
};
function CashGame(root){
 this.root=root;
 this.stage=q(root,"[data-cash-stage]");
 this.belt=q(root,"[data-cash-belt]");
 this.zone=q(root,"[data-cash-zone]");
 this.pauseBtn=q(root,"[data-cash-pause]");
 this.startBtn=q(root,"[data-cash-start]");
 this.scanBtn=q(root,"[data-cash-scan]");
 this.restartBtn=q(root,"[data-cash-restart]");
 this.overlay=q(root,"[data-cash-overlay]");
 this.overlayBadge=q(root,"[data-cash-overlay-badge]");
 this.overlayTitle=q(root,"[data-cash-overlay-title]");
 this.overlayText=q(root,"[data-cash-overlay-text]");
 this.toast=q(root,"[data-cash-toast]");
 this.scoreEl=q(root,"[data-cash-score]");
 this.comboEl=q(root,"[data-cash-combo]");
 this.itemsEl=q(root,"[data-cash-items]");
 this.livesEl=q(root,"[data-cash-lives]");
 this.bestEl=q(root,"[data-cash-best]");
 this.bestComboEl=q(root,"[data-cash-best-combo]");
 this.phaseEl=q(root,"[data-cash-phase]");
 this.speedEl=q(root,"[data-cash-speed]");
 this.best=safeBest();
 this.mode="ready";
 this.raf=0;
 this.toastTimer=0;
 this.width=0;
 this.boundKey=this.onKey.bind(this);
 this.boundPointer=this.onPointer.bind(this);
 this.boundVisibility=this.onVisibility.bind(this);
 this.boundPause=this.togglePause.bind(this);
 this.boundStart=this.onStart.bind(this);
 this.boundScan=this.scan.bind(this);
 this.boundRestart=this.restart.bind(this);
 this.boundResize=this.onResize.bind(this);
 this.stage.addEventListener("pointerdown",this.boundPointer,{passive:false});
 document.addEventListener("keydown",this.boundKey);
 document.addEventListener("visibilitychange",this.boundVisibility);
 window.addEventListener("resize",this.boundResize);
 this.pauseBtn.addEventListener("click",this.boundPause);
 this.startBtn.addEventListener("click",this.boundStart);
 this.scanBtn.addEventListener("click",this.boundScan);
 this.restartBtn.addEventListener("click",this.boundRestart);
 this.resetState();
 this.updateBest();
 this.updateHud();
 this.onResize();
}
CashGame.prototype.destroy=function(){
 cancelAnimationFrame(this.raf);
 clearTimeout(this.toastTimer);
 this.stage.removeEventListener("pointerdown",this.boundPointer);
 document.removeEventListener("keydown",this.boundKey);
 document.removeEventListener("visibilitychange",this.boundVisibility);
 window.removeEventListener("resize",this.boundResize);
 this.pauseBtn.removeEventListener("click",this.boundPause);
 this.startBtn.removeEventListener("click",this.boundStart);
 this.scanBtn.removeEventListener("click",this.boundScan);
 this.restartBtn.removeEventListener("click",this.boundRestart);
 this.clearProducts();
};
CashGame.prototype.clearProducts=function(){
 for(var i=0;i<this.products.length;i++)this.products[i].el.remove();
 this.products=[];
};
CashGame.prototype.resetState=function(){
 this.elapsed=0;
 this.scoreValue=0;
 this.combo=0;
 this.maxCombo=0;
 this.articles=0;
 this.errors=0;
 this.spawnTimer=.7;
 this.eventTimer=rnd(19,27);
 this.boostUntil=0;
 this.phaseKey="";
 this.last=0;
 this.speed=120;
 this.products=this.products||[];
 this.clearProducts();
 this.updateHud();
};
CashGame.prototype.restart=function(){this.start(false)};
CashGame.prototype.onStart=function(){
 if(this.mode==="paused"){this.resume();return}
 this.start(false);
};
CashGame.prototype.start=function(scanNow){
 cancelAnimationFrame(this.raf);
 this.resetState();
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.disabled=false;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();
 this.showToast("Caisse ouverte · on garde le rythme !");
 this.spawnProduct();
 if(scanNow)this.scan();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
CashGame.prototype.pause=function(){
 if(this.mode!=="running")return;
 this.mode="paused";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.textContent="▶";
 this.pauseBtn.setAttribute("aria-label","Reprendre");
 this.showOverlay("PAUSE","Caisse en pause","La file t’attend. Reprends quand tu veux.","Reprendre");
};
CashGame.prototype.resume=function(){
 if(this.mode!=="paused")return;
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
CashGame.prototype.togglePause=function(e){
 if(e)e.stopPropagation();
 if(this.mode==="running")this.pause();
 else if(this.mode==="paused")this.resume();
};
CashGame.prototype.onVisibility=function(){if(document.hidden&&this.mode==="running")this.pause()};
CashGame.prototype.onPointer=function(e){
 if(e.target.closest("button"))return;
 e.preventDefault();
 this.stage.focus({preventScroll:true});
 if(this.mode==="ready"||this.mode==="over"){this.start(false);return}
 if(this.mode==="paused"){this.resume();return}
 this.scan();
};
CashGame.prototype.onKey=function(e){
 var scanKey=e.code==="Space"||e.code==="Enter"||e.code==="KeyS";
 if(scanKey){
  e.preventDefault();
  if(this.mode==="ready"||this.mode==="over"){this.start(false);return}
  if(this.mode==="paused"){this.resume();return}
  this.scan();
  return;
 }
 if((e.code==="KeyP"||e.code==="Escape")&&(this.mode==="running"||this.mode==="paused")){
  e.preventDefault();
  this.togglePause();
 }
};
CashGame.prototype.onResize=function(){
 var next=this.stage.clientWidth||520;
 if(this.width&&this.products.length){
  var ratio=next/this.width;
  for(var i=0;i<this.products.length;i++)this.products[i].x*=ratio;
 }
 this.width=next;
 this.renderProducts();
};
CashGame.prototype.phase=function(){
 if(this.elapsed<22)return {key:"open",label:"Ouverture · 08:30",pace:"File tranquille",mult:1};
 if(this.elapsed<48)return {key:"day",label:"Matinée · 11:30",pace:"Ça s’allonge",mult:1.12};
 if(this.elapsed<78)return {key:"rush",label:"Rush · 12:30",pace:"Ça accélère",mult:1.28};
 return {key:"saturday",label:"Samedi · 18:00",pace:"MODE CHAOS",mult:1.46};
};
CashGame.prototype.loop=function(now){
 if(this.mode!=="running")return;
 var dt=Math.min((now-this.last)/1000,.04);
 this.last=now;
 this.update(dt);
 if(this.mode==="running")this.raf=requestAnimationFrame(this.loop.bind(this));
};
CashGame.prototype.update=function(dt){
 this.elapsed+=dt;
 var phase=this.phase();
 if(phase.key!==this.phaseKey){
  this.phaseKey=phase.key;
  if(this.elapsed>.5)this.showToast(phase.label+" · "+phase.pace+" !");
 }
 var boost=this.elapsed<this.boostUntil?1.22:1;
 this.speed=Math.min(320,118+this.elapsed*2.05)*phase.mult*boost;
 this.spawnTimer-=dt;
 if(this.spawnTimer<=0)this.spawnProduct();
 this.eventTimer-=dt;
 if(this.eventTimer<=0)this.triggerEvent();
 var scanner=this.scannerX();
 for(var i=this.products.length-1;i>=0;i--){
  var p=this.products[i];
  p.x-=this.speed*dt;
  if(!p.scanned&&!p.failed&&p.x+p.w<scanner-58)this.failProduct(p,"Article non scanné");
  if(p.x+p.w<-90){p.el.remove();this.products.splice(i,1)}
 }
 this.renderProducts();
 this.updateHud();
};
CashGame.prototype.scannerX=function(){return (this.width||this.stage.clientWidth||520)*.31};
CashGame.prototype.scanWindow=function(p){return p.type==="heavy"?72:p.type==="eggs"?42:58};
CashGame.prototype.scan=function(e){
 if(e&&e.stopPropagation)e.stopPropagation();
 if(this.mode!=="running")return;
 var scanner=this.scannerX(),target=null,bestDistance=Infinity;
 for(var i=0;i<this.products.length;i++){
  var p=this.products[i];
  if(p.scanned||p.failed)continue;
  var center=p.x+p.w/2;
  var distance=Math.abs(center-scanner);
  if(distance<=this.scanWindow(p)&&distance<bestDistance){target=p;bestDistance=distance}
 }
 this.stage.classList.remove("cashScanFlash");
 void this.stage.offsetWidth;
 this.stage.classList.add("cashScanFlash");
 if(!target){this.registerError("Bip dans le vide · combo perdu");return}
 if(target.type==="unreadable"&&!target.armed){
  target.armed=true;
  target.el.classList.add("cashNeedsRescan");
  target.el.querySelector("small").textContent="RESCAN";
  this.showToast("Étiquette illisible · rescane !");
  return;
 }
 this.success(target,bestDistance);
};
CashGame.prototype.success=function(p,distance){
 p.scanned=true;
 p.el.classList.remove("cashNeedsRescan");
 p.el.classList.add("cashScanned");
 this.combo+=1;
 this.maxCombo=Math.max(this.maxCombo,this.combo);
 this.articles+=1;
 var multiplier=Math.min(5,1+Math.floor((this.combo-1)/7));
 var precision=distance<20?35:distance<38?15:0;
 var points=100*multiplier+TYPES[p.type].bonus+precision;
 this.scoreValue+=points;
 var text=p.type==="heavy"?"Pack scanné dans le chariot":p.type==="produce"?"PLU trouvé · +"+points:p.type==="eggs"&&precision?"Œufs parfaits · +"+points:p.type==="unreadable"?"Code retrouvé · +"+points:"Bip ! +"+points;
 if(this.combo>1)text+=" · combo "+this.combo;
 this.showToast(text);
};
CashGame.prototype.registerError=function(text){
 this.combo=0;
 this.errors+=1;
 this.showToast(text);
 this.stage.classList.remove("cashErrorFlash");
 void this.stage.offsetWidth;
 this.stage.classList.add("cashErrorFlash");
 this.updateHud();
 if(this.errors>=3)this.gameOver();
};
CashGame.prototype.failProduct=function(p,text){
 if(p.failed||p.scanned)return;
 p.failed=true;
 p.el.classList.add("cashMissed");
 p.el.querySelector("small").textContent="RATÉ";
 this.registerError(text);
};
CashGame.prototype.spawnProduct=function(forcedType){
 var choices=["normal","normal","bottle","normal","eggs","heavy","produce","unreadable"];
 var type=forcedType||choices[Math.floor(Math.random()*choices.length)];
 var info=TYPES[type],el=document.createElement("div");
 var w=type==="heavy"?96:type==="produce"?74:68;
 el.className="cashProduct cashProduct-"+info.className;
 el.innerHTML='<span>'+info.emoji+'</span><small>'+info.label+'</small>';
 this.belt.appendChild(el);
 var p={type:type,x:(this.width||this.stage.clientWidth||520)+rnd(45,95),w:w,el:el,scanned:false,failed:false,armed:false};
 this.products.push(p);
 var phase=this.phase();
 var base=Math.max(.72,1.45-(this.speed-118)/260);
 this.spawnTimer=base+rnd(.28,.62);
 if(phase.key==="saturday")this.spawnTimer*=.86;
 this.renderProduct(p);
};
CashGame.prototype.triggerEvent=function(){
 var events=[
  {text:"RENFORT CAISSE · le tapis accélère !",boost:true,type:null},
  {text:"Client pressé · attention au rythme !",boost:true,type:"normal"},
  {text:"Pack d’eau dans le chariot !",boost:false,type:"heavy"},
  {text:"Étiquette récalcitrante !",boost:false,type:"unreadable"}
 ];
 var ev=events[Math.floor(Math.random()*events.length)];
 this.showToast(ev.text);
 if(ev.boost)this.boostUntil=this.elapsed+5.5;
 if(ev.type)this.spawnProduct(ev.type);
 this.eventTimer=rnd(21,31);
};
CashGame.prototype.renderProduct=function(p){
 p.el.style.transform="translate3d("+Math.round(p.x)+"px,0,0)";
 p.el.style.width=p.w+"px";
};
CashGame.prototype.renderProducts=function(){for(var i=0;i<this.products.length;i++)this.renderProduct(this.products[i])};
CashGame.prototype.gameOver=function(){
 if(this.mode!=="running")return;
 this.mode="over";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.disabled=true;
 var isBest=this.scoreValue>this.best.score;
 if(isBest){
  this.best={score:this.scoreValue,combo:this.maxCombo,articles:this.articles};
  saveBest(this.best);
  this.updateBest();
 }
 this.showOverlay(isBest?"NOUVEAU RECORD":"CAISSE FERMÉE",isBest?"Nouveau record !":"Trop d’erreurs","Score : "+this.scoreValue.toLocaleString("fr-FR")+" · "+this.articles+" articles · meilleur combo "+this.maxCombo,"Rejouer");
};
CashGame.prototype.showOverlay=function(badge,title,text,button){
 this.overlayBadge.textContent=badge;
 this.overlayTitle.textContent=title;
 this.overlayText.textContent=text;
 this.startBtn.textContent=button;
 this.overlay.hidden=false;
};
CashGame.prototype.showToast=function(text){
 clearTimeout(this.toastTimer);
 this.toast.textContent=text;
 this.toast.classList.add("show");
 var self=this;
 this.toastTimer=setTimeout(function(){self.toast.classList.remove("show")},1500);
};
CashGame.prototype.updateBest=function(){
 this.bestEl.textContent=this.best.score.toLocaleString("fr-FR")+" pts";
 this.bestComboEl.textContent="Combo ×"+this.best.combo;
};
CashGame.prototype.updateHud=function(){
 var phase=this.phase();
 var multiplier=Math.min(5,1+Math.floor(Math.max(0,this.combo-1)/7));
 this.scoreEl.textContent=this.scoreValue.toLocaleString("fr-FR");
 this.comboEl.textContent="×"+multiplier+(this.combo?" · "+this.combo:"");
 this.itemsEl.textContent=String(this.articles);
 var left=Math.max(0,3-this.errors),dots="";
 for(var i=0;i<3;i++)dots+=i<left?"● ":"○ ";
 this.livesEl.textContent=dots.trim();
 this.livesEl.setAttribute("aria-label",left+" erreur"+(left>1?"s":"")+" restante"+(left>1?"s":""));
 this.phaseEl.textContent=phase.label;
 this.speedEl.textContent=phase.pace;
};
function mount(id){
 unmount();
 var root=document.getElementById(id||"content");
 if(!root)return;
 root.innerHTML=shell();
 current=new CashGame(root);
}
function unmount(){if(current){current.destroy();current=null}}
window.CaisseRush={mount:mount,unmount:unmount};
})();

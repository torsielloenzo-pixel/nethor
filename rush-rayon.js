(function(){
"use strict";
var STORAGE_KEY="nethor:rush-rayon-best-v1";
var current=null;
var W=900,H=1180,GROUND=972;
function q(root,sel){return root.querySelector(sel)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rnd(min,max){return min+Math.random()*(max-min)}
function rounded(ctx,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);
 ctx.arcTo(x,y,x+w,y,r);
 ctx.closePath();
}
function safeBest(){
 try{
  var raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
  return {score:Number(raw.score)||0,distance:Number(raw.distance)||0,articles:Number(raw.articles)||0};
 }catch(_){return {score:0,distance:0,articles:0}}
}
function saveBest(best){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(best))}catch(_){}
}
function shell(){
 return [
  '<div class="rushShell">',
   '<div class="rushGameHead">',
    '<div><span class="rushGameEyebrow">MINI-JEU · BÊTA ADMIN</span><h2>Rush Rayon</h2><p>Un bouton, un réflexe : saute les obstacles, récupère les bonus et tiens le plus longtemps possible dans le rayon.</p></div>',
    '<div class="rushBestCard"><span>Record local</span><strong data-rush-best>0 pts</strong></div>',
   '</div>',
   '<div class="rushDevice">',
    '<div class="rushHud">',
     '<div class="rushMetric"><span>Score</span><strong data-rush-score>0</strong></div>',
     '<div class="rushMetric"><span>Articles</span><strong data-rush-items>0</strong></div>',
     '<div class="rushMetric"><span>Distance</span><strong data-rush-distance>0 m</strong></div>',
     '<button class="rushPause" type="button" data-rush-pause aria-label="Mettre en pause" disabled>Ⅱ</button>',
    '</div>',
    '<div class="rushPhaseBar"><strong data-rush-phase>Ouverture · 06:00</strong><span data-rush-speed>Tranquille</span></div>',
    '<div class="rushStage" data-rush-stage tabindex="0" role="application" aria-label="Rush Rayon. Touchez, cliquez ou appuyez sur Espace pour sauter.">',
     '<canvas class="rushCanvas" data-rush-canvas width="900" height="1180">Ton navigateur ne prend pas en charge le jeu.</canvas>',
     '<div class="rushToast" data-rush-toast aria-live="polite"></div>',
     '<div class="rushOverlay" data-rush-overlay>',
      '<span class="rushOverlayBadge" data-rush-overlay-badge>RUSH RAYON</span>',
      '<strong data-rush-overlay-title>Prêt pour le rayon ?</strong>',
      '<p data-rush-overlay-text>Touchez l’écran, cliquez ou utilisez Espace / ↑ pour sauter.</p>',
      '<button type="button" data-rush-start>Jouer</button>',
     '</div>',
    '</div>',
    '<div class="rushHint"><span class="rushJumpIcon">↑</span><strong>Toucher pour sauter</strong><small>Évite cartons, chariots, palettes, flaques et autres surprises du magasin.</small></div>',
   '</div>',
   '<div class="rushGameFoot"><button type="button" data-rush-restart>Recommencer</button></div>',
   '<p class="rushRules">Le record est enregistré uniquement sur cet appareil pendant la bêta. Aucun score n’est envoyé à la base Nethor.</p>',
  '</div>'
 ].join("");
}
function RushGame(root){
 this.root=root;
 this.canvas=q(root,"[data-rush-canvas]");
 this.ctx=this.canvas.getContext("2d");
 this.stage=q(root,"[data-rush-stage]");
 this.pauseBtn=q(root,"[data-rush-pause]");
 this.startBtn=q(root,"[data-rush-start]");
 this.restartBtn=q(root,"[data-rush-restart]");
 this.overlay=q(root,"[data-rush-overlay]");
 this.overlayBadge=q(root,"[data-rush-overlay-badge]");
 this.overlayTitle=q(root,"[data-rush-overlay-title]");
 this.overlayText=q(root,"[data-rush-overlay-text]");
 this.toast=q(root,"[data-rush-toast]");
 this.scoreEl=q(root,"[data-rush-score]");
 this.itemsEl=q(root,"[data-rush-items]");
 this.distanceEl=q(root,"[data-rush-distance]");
 this.bestEl=q(root,"[data-rush-best]");
 this.phaseEl=q(root,"[data-rush-phase]");
 this.speedEl=q(root,"[data-rush-speed]");
 this.best=safeBest();
 this.mode="ready";
 this.raf=0;
 this.toastTimer=0;
 this.boundKey=this.onKey.bind(this);
 this.boundPointer=this.onPointer.bind(this);
 this.boundVisibility=this.onVisibility.bind(this);
 this.boundPause=this.togglePause.bind(this);
 this.boundStart=this.onStart.bind(this);
 this.boundRestart=this.restart.bind(this);
 this.stage.addEventListener("pointerdown",this.boundPointer,{passive:false});
 document.addEventListener("keydown",this.boundKey);
 document.addEventListener("visibilitychange",this.boundVisibility);
 this.pauseBtn.addEventListener("click",this.boundPause);
 this.startBtn.addEventListener("click",this.boundStart);
 this.restartBtn.addEventListener("click",this.boundRestart);
 this.resetState();
 this.updateBest();
 this.updateHud();
 this.draw();
}
RushGame.prototype.destroy=function(){
 cancelAnimationFrame(this.raf);
 clearTimeout(this.toastTimer);
 this.stage.removeEventListener("pointerdown",this.boundPointer);
 document.removeEventListener("keydown",this.boundKey);
 document.removeEventListener("visibilitychange",this.boundVisibility);
 this.pauseBtn.removeEventListener("click",this.boundPause);
 this.startBtn.removeEventListener("click",this.boundStart);
 this.restartBtn.removeEventListener("click",this.boundRestart);
};
RushGame.prototype.resetState=function(){
 this.elapsed=0;
 this.distance=0;
 this.articles=0;
 this.bonusScore=0;
 this.currentSpeed=390;
 this.spawnTimer=1.1;
 this.eventTimer=rnd(18,28);
 this.eventBoostUntil=0;
 this.phaseKey="";
 this.obstacles=[];
 this.collectibles=[];
 this.player={x:132,y:GROUND-118,w:74,h:118,vy:0,grounded:true};
 this.last=0;
 this.updateHud();
};
RushGame.prototype.restart=function(){
 this.start(false);
};
RushGame.prototype.onStart=function(){
 if(this.mode==="paused"){this.resume();return}
 this.start(false);
};
RushGame.prototype.start=function(jumpNow){
 cancelAnimationFrame(this.raf);
 this.resetState();
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.disabled=false;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();
 this.showToast("Ouverture · 06:00 — on prépare le magasin !");
 if(jumpNow)this.jump();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.pause=function(){
 if(this.mode!=="running")return;
 this.mode="paused";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.textContent="▶";
 this.pauseBtn.setAttribute("aria-label","Reprendre");
 this.showOverlay("PAUSE","Petite pause ?","Le rayon t’attend. Reprends quand tu veux.","Reprendre");
};
RushGame.prototype.resume=function(){
 if(this.mode!=="paused")return;
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.togglePause=function(e){
 if(e)e.stopPropagation();
 if(this.mode==="running")this.pause();
 else if(this.mode==="paused")this.resume();
};
RushGame.prototype.onVisibility=function(){
 if(document.hidden&&this.mode==="running")this.pause();
};
RushGame.prototype.onPointer=function(e){
 if(e.target.closest("button"))return;
 e.preventDefault();
 this.stage.focus({preventScroll:true});
 if(this.mode==="ready"||this.mode==="over"){this.start(true);return}
 if(this.mode==="paused"){this.resume();return}
 this.jump();
};
RushGame.prototype.onKey=function(e){
 var jumpKey=e.code==="Space"||e.code==="ArrowUp";
 if(jumpKey){
  e.preventDefault();
  if(this.mode==="ready"||this.mode==="over"){this.start(true);return}
  if(this.mode==="paused"){this.resume();return}
  this.jump();
  return;
 }
 if((e.code==="KeyP"||e.code==="Escape")&&(this.mode==="running"||this.mode==="paused")){
  e.preventDefault();
  this.togglePause();
 }
};
RushGame.prototype.jump=function(){
 if(this.mode!=="running"||!this.player.grounded)return;
 this.player.vy=-1000;
 this.player.grounded=false;
};
RushGame.prototype.loop=function(now){
 if(this.mode!=="running")return;
 var dt=Math.min((now-this.last)/1000,.034);
 this.last=now;
 this.update(dt);
 this.draw();
 if(this.mode==="running")this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.phase=function(){
 if(this.elapsed<24)return {key:"open",label:"Ouverture · 06:00",pace:"Tranquille",mult:1};
 if(this.elapsed<52)return {key:"day",label:"Matinée · 10:00",pace:"Ça s’active",mult:1.035};
 if(this.elapsed<86)return {key:"rush",label:"Rush · 12:00",pace:"Ça accélère",mult:1.09};
 return {key:"evening",label:"Rush du soir · 18:00",pace:"Plein régime",mult:1.14};
};
RushGame.prototype.update=function(dt){
 this.elapsed+=dt;
 var phase=this.phase();
 if(phase.key!==this.phaseKey){
  this.phaseKey=phase.key;
  if(this.elapsed>.5)this.showToast(phase.label+" — "+phase.pace+" !");
 }
 var base=Math.min(720,390+this.elapsed*5.7);
 var eventBoost=this.elapsed<this.eventBoostUntil?1.12:1;
 this.currentSpeed=base*phase.mult*eventBoost;
 this.distance+=this.currentSpeed*dt*.038;
 this.player.vy+=2550*dt;
 this.player.y+=this.player.vy*dt;
 var floorY=GROUND-this.player.h;
 if(this.player.y>=floorY){
  this.player.y=floorY;
  this.player.vy=0;
  this.player.grounded=true;
 }
 this.spawnTimer-=dt;
 if(this.spawnTimer<=0)this.spawnWave();
 this.eventTimer-=dt;
 if(this.eventTimer<=0)this.triggerEvent();
 var dx=this.currentSpeed*dt;
 var i;
 for(i=this.obstacles.length-1;i>=0;i--){
  var o=this.obstacles[i];
  o.x-=dx;
  if(!o.passed&&o.x+o.w<this.player.x){
   o.passed=true;
   this.bonusScore+=18;
  }
  if(o.x+o.w<-80){this.obstacles.splice(i,1);continue}
  if(this.hitPlayer(o)){this.gameOver();return}
 }
 for(i=this.collectibles.length-1;i>=0;i--){
  var c=this.collectibles[i];
  c.x-=dx;
  c.spin+=dt*3;
  if(c.x+c.w<-70){this.collectibles.splice(i,1);continue}
  if(this.hitCollectible(c)){
   this.collectibles.splice(i,1);
   this.articles+=1;
   this.bonusScore+=120;
   this.showToast(c.kind==="coffee"?"Pause café récupérée ☕":c.kind==="promo"?"Promo attrapée · +120":"Article récupéré · +120");
  }
 }
 this.updateHud();
};
RushGame.prototype.spawnWave=function(){
 var types=["box","box","cart","puddle","pallet","banana"];
 var type=types[Math.floor(Math.random()*types.length)];
 this.spawnObstacle(type,W+rnd(70,130));
 var pace=clamp(1.78-(this.currentSpeed-390)/620,1.0,1.78);
 this.spawnTimer=pace+rnd(.24,.68);
 if(Math.random()<.52){
  var obstacle=this.obstacles[this.obstacles.length-1];
  var kind=["coffee","promo","article"][Math.floor(Math.random()*3)];
  this.collectibles.push({kind:kind,x:obstacle.x+obstacle.w+rnd(115,230),y:GROUND-rnd(225,320),w:58,h:58,spin:0});
 }
};
RushGame.prototype.spawnObstacle=function(type,x){
 var d={
  box:{w:105,h:86},
  cart:{w:170,h:102},
  puddle:{w:150,h:24},
  pallet:{w:155,h:64},
  banana:{w:78,h:34}
 }[type];
 this.obstacles.push({type:type,x:x,y:GROUND-d.h,w:d.w,h:d.h,passed:false});
};
RushGame.prototype.triggerEvent=function(){
 var events=[
  {label:"Livraison en avance !",type:"pallet",boost:false},
  {label:"Casse rayon 4 !",type:"puddle",boost:false},
  {label:"Inventaire surprise !",type:"box",boost:true},
  {label:"Cliente de 19h59 !",type:"cart",boost:true}
 ];
 var ev=events[Math.floor(Math.random()*events.length)];
 this.showToast(ev.label);
 this.spawnObstacle(ev.type,W+120);
 if(ev.boost)this.eventBoostUntil=this.elapsed+4.5;
 this.eventTimer=rnd(23,36);
};
RushGame.prototype.hitPlayer=function(o){
 var p={x:this.player.x+11,y:this.player.y+12,w:this.player.w-22,h:this.player.h-16};
 var h={x:o.x+5,y:o.y+3,w:o.w-10,h:o.h-3};
 return p.x<h.x+h.w&&p.x+p.w>h.x&&p.y<h.y+h.h&&p.y+p.h>h.y;
};
RushGame.prototype.hitCollectible=function(c){
 var p={x:this.player.x+5,y:this.player.y+5,w:this.player.w-10,h:this.player.h-10};
 return p.x<c.x+c.w&&p.x+p.w>c.x&&p.y<c.y+c.h&&p.y+p.h>c.y;
};
RushGame.prototype.score=function(){
 return Math.floor(this.distance*2)+this.articles*120+this.bonusScore;
};
RushGame.prototype.gameOver=function(){
 if(this.mode!=="running")return;
 this.mode="over";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.disabled=true;
 var score=this.score();
 var isBest=score>this.best.score;
 if(isBest){
  this.best={score:score,distance:Math.floor(this.distance),articles:this.articles};
  saveBest(this.best);
  this.updateBest();
 }
 this.updateHud();
 this.showOverlay(isBest?"NOUVEAU RECORD":"FIN DU RUSH",isBest?"Nouveau record !":"Oups, obstacle !","Score : "+score+" · "+Math.floor(this.distance)+" m · "+this.articles+" article"+(this.articles>1?"s":""),"Rejouer");
};
RushGame.prototype.showOverlay=function(badge,title,text,button){
 this.overlayBadge.textContent=badge;
 this.overlayTitle.textContent=title;
 this.overlayText.textContent=text;
 this.startBtn.textContent=button;
 this.overlay.hidden=false;
};
RushGame.prototype.showToast=function(text){
 clearTimeout(this.toastTimer);
 this.toast.textContent=text;
 this.toast.classList.add("show");
 var self=this;
 this.toastTimer=setTimeout(function(){self.toast.classList.remove("show")},1800);
};
RushGame.prototype.updateBest=function(){
 this.bestEl.textContent=this.best.score.toLocaleString("fr-FR")+" pts";
};
RushGame.prototype.updateHud=function(){
 var phase=this.phase();
 this.scoreEl.textContent=this.score().toLocaleString("fr-FR");
 this.itemsEl.textContent=String(this.articles);
 this.distanceEl.textContent=Math.floor(this.distance).toLocaleString("fr-FR")+" m";
 this.phaseEl.textContent=phase.label;
 this.speedEl.textContent=phase.pace;
};
RushGame.prototype.draw=function(){
 var ctx=this.ctx;
 ctx.clearRect(0,0,W,H);
 this.drawBackground(ctx);
 for(var i=0;i<this.collectibles.length;i++)this.drawCollectible(ctx,this.collectibles[i]);
 for(i=0;i<this.obstacles.length;i++)this.drawObstacle(ctx,this.obstacles[i]);
 this.drawRunner(ctx);
};
RushGame.prototype.drawBackground=function(ctx){
 var dark=document.documentElement.dataset.theme==="dark";
 var scroll=(this.distance*7)%180;
 ctx.fillStyle=dark?"#1d222a":"#f7f8fa";
 ctx.fillRect(0,0,W,H);
 ctx.fillStyle=dark?"#2a3039":"#e8ebef";
 ctx.fillRect(0,0,W,168);
 ctx.fillStyle=dark?"#353c46":"#ffffff";
 for(var l=-80-scroll*.18;l<W+120;l+=230){
  rounded(ctx,l,46,142,24,10);ctx.fill();
 }
 ctx.fillStyle=dark?"#222831":"#eef1f4";
 ctx.fillRect(0,168,W,650);
 var signNames=["ÉPICERIE","BOISSONS","DPH"];
 for(var s=0;s<3;s++){
  var sx=50+s*295;
  ctx.fillStyle=dark?"#37404b":"#293646";
  rounded(ctx,sx,192,210,58,10);ctx.fill();
  ctx.fillStyle="#ffffff";
  ctx.font="700 20px system-ui,sans-serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(signNames[s],sx+105,221);
 }
 var productColors=["#e85d4a","#f2b94b","#4e85d8","#56a86e","#885db8","#ef8b50","#4cb6b2"];
 for(var row=0;row<4;row++){
  var sy=326+row*118;
  ctx.fillStyle=dark?"#59616d":"#aeb6c1";
  ctx.fillRect(0,sy+80,W,10);
  for(var x=-80-scroll;x<W+100;x+=58){
   var idx=Math.abs(Math.floor((x+row*91)/58))%productColors.length;
   ctx.fillStyle=productColors[idx];
   rounded(ctx,x,sy+rnd(8,18),42,66-rnd(0,14),5);ctx.fill();
   ctx.fillStyle="#ffffff99";
   ctx.fillRect(x+7,sy+27,28,5);
  }
 }
 ctx.fillStyle=dark?"#252b33":"#dfe3e8";
 ctx.fillRect(0,818,W,H-818);
 ctx.strokeStyle=dark?"#3a424d":"#c7cdd5";
 ctx.lineWidth=2;
 for(var fy=850;fy<H;fy+=76){ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke()}
 for(var fx=-120;fx<W+120;fx+=150){ctx.beginPath();ctx.moveTo(fx,818);ctx.lineTo(fx+70,H);ctx.stroke()}
 ctx.fillStyle=dark?"#171b20":"#b7bec7";
 ctx.fillRect(0,GROUND,W,8);
};
RushGame.prototype.drawRunner=function(ctx){
 var p=this.player;
 var run=this.mode==="running"&&p.grounded?Math.sin(this.elapsed*16):0;
 ctx.save();
 ctx.fillStyle="#00000022";
 ctx.beginPath();ctx.ellipse(p.x+38,GROUND+8,48,12,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#242a32";ctx.lineWidth=15;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(p.x+34,p.y+76);ctx.lineTo(p.x+23+run*12,p.y+111);ctx.lineTo(p.x+9-run*13,p.y+119);ctx.stroke();
 ctx.beginPath();ctx.moveTo(p.x+46,p.y+76);ctx.lineTo(p.x+58-run*12,p.y+106);ctx.lineTo(p.x+71+run*13,p.y+114);ctx.stroke();
 ctx.fillStyle="#252b33";rounded(ctx,p.x+19,p.y+38,48,52,15);ctx.fill();
 ctx.fillStyle="#ff6a1a";rounded(ctx,p.x+24,p.y+43,8,40,4);ctx.fill();
 ctx.fillStyle="#ffffff";rounded(ctx,p.x+43,p.y+49,14,11,3);ctx.fill();
 ctx.fillStyle="#ff6a1a";ctx.font="900 9px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",p.x+50,p.y+55);
 ctx.strokeStyle="#252b33";ctx.lineWidth=12;
 ctx.beginPath();ctx.moveTo(p.x+24,p.y+49);ctx.lineTo(p.x+8-run*8,p.y+71);ctx.stroke();
 ctx.beginPath();ctx.moveTo(p.x+62,p.y+49);ctx.lineTo(p.x+76+run*8,p.y+67);ctx.stroke();
 ctx.fillStyle="#f2b38d";
 ctx.beginPath();ctx.arc(p.x+45,p.y+24,22,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#49352d";
 ctx.beginPath();ctx.arc(p.x+43,p.y+17,22,Math.PI,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(p.x+25,p.y+21,10,19,-.4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#202124";ctx.beginPath();ctx.arc(p.x+53,p.y+24,2.2,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#8c4d34";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x+53,p.y+31,6,0.15,1.2);ctx.stroke();
 ctx.restore();
};
RushGame.prototype.drawObstacle=function(ctx,o){
 ctx.save();
 if(o.type==="box"){
  ctx.fillStyle="#c78a49";rounded(ctx,o.x,o.y,o.w,o.h,7);ctx.fill();
  ctx.fillStyle="#e4b26f";ctx.fillRect(o.x+o.w*.45,o.y,o.w*.12,o.h);
  ctx.strokeStyle="#986230";ctx.lineWidth=3;ctx.strokeRect(o.x+5,o.y+5,o.w-10,o.h-10);
  ctx.fillStyle="#fff8";ctx.fillRect(o.x+12,o.y+48,35,16);
 }else if(o.type==="cart"){
  ctx.strokeStyle="#59616c";ctx.lineWidth=8;ctx.lineJoin="round";
  ctx.beginPath();ctx.moveTo(o.x+18,o.y+17);ctx.lineTo(o.x+42,o.y+72);ctx.lineTo(o.x+141,o.y+72);ctx.lineTo(o.x+158,o.y+22);ctx.stroke();
  ctx.strokeStyle="#ff5b42";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(o.x+4,o.y+12);ctx.lineTo(o.x+53,o.y+12);ctx.stroke();
  ctx.strokeStyle="#8a929d";ctx.lineWidth=3;
  for(var cx=o.x+52;cx<o.x+145;cx+=22){ctx.beginPath();ctx.moveTo(cx,o.y+27);ctx.lineTo(cx-9,o.y+68);ctx.stroke()}
  ctx.fillStyle="#343a42";ctx.beginPath();ctx.arc(o.x+58,o.y+94,11,0,Math.PI*2);ctx.arc(o.x+135,o.y+94,11,0,Math.PI*2);ctx.fill();
 }else if(o.type==="puddle"){
  ctx.fillStyle="#4da9e9aa";ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#a9dcff";ctx.beginPath();ctx.ellipse(o.x+48,o.y+8,28,5,0,0,Math.PI*2);ctx.fill();
 }else if(o.type==="pallet"){
  ctx.fillStyle="#356fb0";rounded(ctx,o.x,o.y+o.h-19,o.w,19,4);ctx.fill();
  ctx.fillStyle="#ad7a45";
  for(var py=0;py<3;py++){rounded(ctx,o.x+5+py*50,o.y,44,o.h-24,3);ctx.fill()}
  ctx.fillStyle="#c9985e";ctx.fillRect(o.x,o.y+13,o.w,9);
 }else if(o.type==="banana"){
  ctx.strokeStyle="#f4c52f";ctx.lineWidth=14;ctx.lineCap="round";
  ctx.beginPath();ctx.bezierCurveTo(o.x+6,o.y+5,o.x+22,o.y+35,o.x+50,o.y+21,o.x+70,o.y+7);ctx.stroke();
  ctx.strokeStyle="#8d6b1d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.x+67,o.y+8);ctx.lineTo(o.x+73,o.y+3);ctx.stroke();
 }
 ctx.restore();
};
RushGame.prototype.drawCollectible=function(ctx,c){
 ctx.save();
 var cx=c.x+c.w/2,cy=c.y+c.h/2;
 ctx.shadowColor="#ffb11b";ctx.shadowBlur=28;ctx.fillStyle="#fff8dc";
 ctx.beginPath();ctx.arc(cx,cy,31,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;
 if(c.kind==="coffee"){
  ctx.fillStyle="#6b442d";rounded(ctx,c.x+16,c.y+19,27,28,5);ctx.fill();
  ctx.fillStyle="#f2eee8";ctx.fillRect(c.x+13,c.y+15,34,7);
  ctx.strokeStyle="#6b442d";ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x+44,c.y+31,8,-1.2,1.2);ctx.stroke();
  ctx.strokeStyle="#9b7b67";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c.x+23,c.y+12);ctx.bezierCurveTo(c.x+18,c.y+5,c.x+31,c.y+3,c.x+27,c.y-3);ctx.stroke();
 }else if(c.kind==="promo"){
  ctx.fillStyle="#ef473d";ctx.beginPath();ctx.moveTo(c.x+12,c.y+11);ctx.lineTo(c.x+46,c.y+11);ctx.lineTo(c.x+51,c.y+31);ctx.lineTo(c.x+29,c.y+50);ctx.lineTo(c.x+7,c.y+30);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.font="900 25px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("%",c.x+29,c.y+29);
 }else{
  ctx.fillStyle="#e8f1ff";rounded(ctx,c.x+15,c.y+11,29,38,4);ctx.fill();
  ctx.fillStyle="#3d79c8";ctx.fillRect(c.x+15,c.y+18,29,20);
  ctx.fillStyle="#ffffff";ctx.font="900 13px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",c.x+30,c.y+28);
 }
 ctx.restore();
};
function mount(id){
 unmount();
 var root=document.getElementById(id||"content");
 if(!root)return;
 root.innerHTML=shell();
 current=new RushGame(root);
}
function unmount(){
 if(current){current.destroy();current=null}
}
window.RushRayon={mount:mount,unmount:unmount};
})();

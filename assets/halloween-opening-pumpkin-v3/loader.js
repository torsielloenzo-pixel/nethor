(function(){
'use strict';
const root=document.documentElement;
if(root.dataset.nethorMobileTheme!=='halloween')return;
const base='assets/halloween-opening-pumpkin-v3/';
const files=Array.from({length:5},(_,i)=>base+String(i).padStart(2,'0')+'.txt?v=1');
Promise.all(files.map(src=>fetch(src,{cache:'force-cache'}).then(r=>{
 if(!r.ok)throw new Error('pumpkin_part_'+r.status);
 return r.text()
}))).then(parts=>{
 const b64=parts.join('').replace(/\s+/g,'');
 if(!b64.startsWith('UklGR')||b64.length<19000)throw new Error('pumpkin_payload');
 root.style.setProperty('--nethor-halloween-opening-pumpkin','url("data:image/webp;base64,'+b64+'")');
 root.dataset.halloweenOpeningPumpkin='ready'
}).catch(()=>{
 root.dataset.halloweenOpeningPumpkin='unavailable'
})
})();
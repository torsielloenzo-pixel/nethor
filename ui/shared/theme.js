/* Nethor — thème partagé, Phase 4.21 */
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function applyTheme(theme){theme=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('nettoTheme',theme)}catch(e){}document.querySelectorAll('.themeIcon').forEach(x=>x.textContent=theme==='dark'?'☀':'☾');document.querySelectorAll('.themeLabel').forEach(x=>x.textContent=theme==='dark'?'Mode clair':'Mode sombre');document.querySelectorAll('.themeSub').forEach(x=>x.textContent=theme==='dark'?'Revenir au thème clair':'Passer au thème sombre');const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=theme==='dark'?'#111214':'#f4f4f6'}
function toggleTheme(e){e?.stopPropagation();applyTheme(currentTheme()==='dark'?'light':'dark')}
document.addEventListener('DOMContentLoaded',()=>applyTheme(currentTheme()));

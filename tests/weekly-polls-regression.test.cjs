'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Page dédiée aux sondages enregistrée dans le routeur et ouverte depuis le menu Mobile',()=>{
 const html=read('mobile.html'),router=read('ui/mobile/mobile-router.js'),menu=read('ui/mobile/views/user-menu/user-menu-view.js');
 assert.match(html,/surveys\/surveys-view\.js\?v=1/);
 assert.match(html,/surveys\/surveys-view\.css\?v=1/);
 assert.match(router,/surveys:\{label:'Sondages de l’équipe'\}/);
 assert.match(menu,/id:'surveys'.*mobile\.html\?view=surveys/);
 assert.match(menu,/shellView.*router\(\)\?\.registered/);
 assert.match(read('ui/mobile/views/surveys/surveys-view.js'),/register\?\.\('surveys',api\)/);
});
test('Sondages : base protégée et 8 semaines renseignées',()=>{
 const sql=read('database/2026-10-10-mobile-weekly-polls.sql');
 for(let i=1;i<=8;i++)assert.ok(sql.includes("'nethor_2026_q4',"+i+","),"Semaine "+i+" manquante");
 assert.match(sql,/alter table public\.weekly_poll_votes enable row level security/);
 assert.match(sql,/weekly poll votes own insert/);
 assert.match(sql,/weekly poll votes own update/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/n<5/);
 assert.match(sql,/revoke all on function public\.weekly_poll_results\(uuid\) from public,anon/);
});
test('Les thèmes Mobile et le cache PWA couvrent la nouvelle page',()=>{
 const css=read('ui/mobile/views/surveys/surveys-view.css'),sw=read('sw.js');
 assert.match(css,/data-theme="dark"/);
 assert.match(css,/data-nethor-mobile-theme/);
 assert.match(css,/var\(--nmt-bg\)/);
 assert.match(sw,/surveys\/surveys-view\.js\?v=1/);
 assert.match(sw,/surveys\/surveys-view\.css\?v=1/);
});

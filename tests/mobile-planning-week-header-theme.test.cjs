'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('Le titre et la plage de dates du planning mobile restent présents',()=>{
 const markup=read('planning-agenda-v2.js');
 assert.match(markup,/id="agendaTitle"/);
 assert.match(markup,/id="agendaSubtitle"/);
 assert.match(markup,/Semaine '\+isoWeekNumber\(a\)/);
 assert.match(markup,/mobileWeekRangeLabel\(a\)/);
});
test('Le panneau de semaine est transparent sur toutes les variantes de thème Mobile',()=>{
 const css=read('ui/mobile/mobile-themes.css');
 const rule=css.match(/html\[data-nethor-mobile-app="1"\] body\.agendaLayout \.agendaHeader\s*\{([^}]+)\}/);
 assert.ok(rule,'Correctif isolé dans la SPA mobile');
 for(const value of ['background:transparent!important','background-color:transparent!important','border:0!important','box-shadow:none!important']){
  assert.ok(rule[1].includes(value),'Propriété manquante : '+value)
 }
 const halloween=css.indexOf('html[data-nethor-mobile-theme="halloween"] .agendaHeader');
 assert.ok(halloween>=0);
 assert.ok(css.lastIndexOf('html[data-nethor-mobile-app="1"] body.agendaLayout .agendaHeader')>halloween,
  'La règle transparente doit prendre le dessus sur le thème Halloween');
 assert.match(css,/html\[data-nethor-mobile-theme\] \.agendaHeader/);
 assert.ok(!rule[1].includes('color:'),'Conserver les couleurs de texte de chaque thème');
});
test('Version mobile et cache du thème cohérents',()=>{
 const html=read('mobile.html'),sw=read('sw.js'),meta=JSON.parse(read('app-version.json'));
 const asset=html.match(/ui\/mobile\/mobile-themes\.css\?v=\d+/)?.[0];
 assert.ok(asset);
 assert.ok(sw.includes('./'+asset));
 assert.equal(Number(sw.match(/APP_VERSION=(\d+)/)[1]),meta.version);
 assert.equal(Number(sw.match(/netto-tools-v(\d+)/)[1]),meta.version);
});

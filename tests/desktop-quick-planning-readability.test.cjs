'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const runtime=source('runtime/home-runtime.js');
const style=source('runtime/quick-planning-widget.css');
const dashboard=source('ui/desktop/home-dashboard-v3.css');
const home=source('home.html');
const worker=source('sw.js');
function pureHelper(name){
 const match=runtime.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));
 assert.ok(match,'fonction manquante : '+name);
 return vm.runInNewContext('('+match[0]+')');
}
test('Les services de matin et après-midi ont des équipes et des couleurs distinctes',()=>{
 const shift=pureHelper('homeQuickPlanningShiftFor');
 assert.equal(shift([{a:6,b:12}]),'morning');
 assert.equal(shift([{a:9,b:13},{a:15,b:18}]),'morning');
 assert.equal(shift([{a:12,b:18}]),'afternoon');
 assert.equal(shift([{a:14,b:20.5}]),'afternoon');
 assert.ok(runtime.includes("person.shift==='morning'?'Morning':'Afternoon'"));
 assert.match(runtime,/class="qplanTrack qplanShift/);
 assert.match(style,/--qp-morning:#21875e/);
 assert.match(style,/--qp-afternoon:#2677c3/);
 assert.match(style,/\.qplanShiftMorning\{--qp-person:var\(--qp-morning\)\}/);
 assert.match(style,/\.qplanShiftAfternoon\{--qp-person:var\(--qp-afternoon\)\}/);
});
test('Axe lisible de 06:00 à 20:30 sans étiquette 20:00 qui chevauche la fin',()=>{
 const ticks=pureHelper('homeQuickPlanningTicks')({start:6,end:20.5,span:14.5});
 assert.equal(ticks[0],6);
 assert.equal(ticks.at(-1),20.5);
 assert.ok(!ticks.includes(20));
 assert.match(runtime,/\.replace\('h',':'\)/);
 assert.match(style,/\.qplanTick>span/);
 assert.match(dashboard,/\.qplanTick>span\{font-size:10\.5px\}/);
});
test('Barres épaisses et repère Maintenant continu avec son horodatage',()=>{
 assert.match(style,/height:25px;border-radius:9px/);
 assert.match(style,/top:var\(--qp-axis-h\);bottom:0;border-left:3px solid var\(--qp-now\)/);
 assert.match(style,/\.qplanLegend \.now:before\{\s*width:20px;flex:none;border-top:3px solid/);
 assert.ok(runtime.includes("Maintenant · '+homeEsc(clock)"));
 assert.match(runtime,/liveLabel\.textContent='Maintenant · '/);
 assert.match(runtime,/En poste · matin/);
 assert.match(runtime,/En poste · après-midi/);
 assert.match(runtime,/Pause \/ coupure/);
 assert.match(style,/@container \(max-width:820px\)/);
 assert.match(style,/@container \(max-width:600px\)/);
});
test('Desktop : fichiers à jour et Service Worker cohérent',()=>{
 for(const asset of [
 'runtime/quick-planning-widget.css?v=8',
 'ui/desktop/home-dashboard-v3.css?v=6',
 'runtime/home-runtime.js?v=16'
 ]){
  assert.ok(home.includes(asset),'home.html manque '+asset);
  assert.ok(worker.includes('./'+asset),'PWA manque '+asset);
 }
 const version=JSON.parse(source('app-version.json')).version;
 assert.equal(Number(worker.match(/APP_VERSION=(\d+)/)[1]),version);
 assert.equal(Number(worker.match(/netto-tools-v(\d+)/)[1]),version);
 assert.ok(!home.includes('runtime/quick-planning-widget.css?v=7'));
});

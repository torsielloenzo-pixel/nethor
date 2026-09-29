(function(){
'use strict';
function mobileActions(){
 return '<div id="mobilePlanningActionsDock" class="mobilePlanningActionsDock"><div id="importPanel" class="importPanel compactImport hidden"><input id="excelFile" type="file" accept=".xls,.xlsx,.xlsm" multiple hidden onchange="importPlanningFiles(this.files)"><div class="excelDrop" onclick="document.getElementById(\'excelFile\').click()" ondragover="excelDrag(event,true)" ondragleave="excelDrag(event,false)" ondrop="excelDropFile(event)"><span class="excelIcon">▦</span><div><strong>Importer Excel</strong><small>Un ou plusieurs fichiers à la fois</small></div></div><div id="importState" class="importState"></div></div><button id="editPlanningBtn" class="btn dark hidden" type="button" onclick="toggleEditMode()">✎ Modifier le planning</button></div>'
}
function build(){
 return {
  platform:'mobile',
  top:'<div class="planningViewBar mobilePlanningViewBar"><div class="mobilePlanningViewGroup"><div class="viewTabs"><button id="weekViewBtn" class="viewTab active" type="button" onclick="setPlanningView(\'week\')">Semaine</button><button id="yearViewBtn" class="viewTab yearMenuBtn" type="button" onclick="setPlanningView(\'year\')" aria-label="Ouvrir le calendrier annuel"><span class="yearTabMobile"><span>Calendrier</span><small id="planningDeviceLabel">Mobile</small></span></button></div></div><div class="weekNav mobileWeekNav"><button class="btn light miniNav" type="button" onclick="changeWeek(-1)">←</button><button class="btn light" type="button" onclick="goCurrentWeek()">Cette semaine</button><button class="btn light miniNav" type="button" onclick="changeWeek(1)">→</button><span id="weekLabel" class="weekLabel"></span></div></div>',
  toolbar:'<div id="planningToolbar" class="toolbar mobilePlanningToolbar"><div class="mobilePlanningDayGroup"><div id="days" class="days"></div></div><div id="planningActions" class="planningActions mobilePlanningStatus"><span id="saveState" class="saveState passive">Lecture seule</span></div></div>',
  sourceActions:'',
  mobileActions:mobileActions(),
  mobileSchedule:'<div id="mobileSchedule" class="mobileSchedule hidden"></div>'
 }
}
window.NethorMobilePlanningLayout=Object.freeze({build});
})();
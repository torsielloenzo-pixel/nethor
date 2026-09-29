(function(){
'use strict';
function importControls(){
 return '<div id="importPanel" class="importPanel compactImport hidden"><input id="excelFile" type="file" accept=".xls,.xlsx,.xlsm" multiple hidden onchange="importPlanningFiles(this.files)"><div class="excelDrop" onclick="document.getElementById(\'excelFile\').click()" ondragover="excelDrag(event,true)" ondragleave="excelDrag(event,false)" ondrop="excelDropFile(event)"><span class="excelIcon">▦</span><div><strong>Importer Excel</strong><small>Un ou plusieurs fichiers à la fois</small></div></div><div id="importState" class="importState"></div></div><button id="editPlanningBtn" class="btn dark hidden" type="button" onclick="toggleEditMode()">✎ Modifier le planning</button>'
}
function build(){
 return {
  platform:'desktop',
  top:'<div class="planningViewBar desktopPlanningViewBar"><div class="desktopPlanningViewGroup"><span class="desktopPlanningMenuLabel">Vue</span><div class="viewTabs"><button id="weekViewBtn" class="viewTab active" type="button" onclick="setPlanningView(\'week\')">Semaine</button><button id="yearViewBtn" class="viewTab yearMenuBtn" type="button" onclick="setPlanningView(\'year\')" aria-label="Ouvrir le calendrier annuel"><span class="yearTabDesktop">Année</span></button></div></div><div class="weekNav desktopWeekNav"><button class="btn light miniNav" type="button" onclick="changeWeek(-1)">←</button><button class="btn light" type="button" onclick="goCurrentWeek()">Cette semaine</button><button class="btn light miniNav" type="button" onclick="changeWeek(1)">→</button><span id="weekLabel" class="weekLabel"></span></div></div>',
  toolbar:'<div id="planningToolbar" class="toolbar desktopPlanningToolbar"><div class="desktopPlanningDayGroup"><span class="desktopPlanningMenuLabel">Jour</span><div id="days" class="days"></div></div><div id="planningActions" class="planningActions"><span id="saveState" class="saveState passive">Lecture seule</span></div></div>',
  sourceActions:'<div class="planningPlatformSourceActions planningDesktopSourceActions">'+importControls()+'</div>',
  mobileActions:'',
  mobileSchedule:''
 }
}
window.NethorDesktopPlanningLayout=Object.freeze({build});
})();
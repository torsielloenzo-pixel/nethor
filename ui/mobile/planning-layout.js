(function(){
'use strict';
function mobileActions(){
 return '<div id="mobilePlanningActionsDock" class="mobilePlanningActionsDock"><div id="importPanel" class="importPanel compactImport hidden"><input id="excelFile" type="file" accept=".xls,.xlsx,.xlsm" multiple hidden onchange="importPlanningFiles(this.files)"><div class="excelDrop" onclick="document.getElementById(\'excelFile\').click()" ondragover="excelDrag(event,true)" ondragleave="excelDrag(event,false)" ondrop="excelDropFile(event)"><span class="excelIcon" aria-hidden="true">▦</span><div><strong>Importer</strong><small>Planning Excel</small></div></div><div id="importState" class="importState"></div></div><button id="editPlanningBtn" class="btn dark hidden" type="button" onclick="toggleEditMode()">✎ Modifier</button></div>'
}
function build(){
 return {
  platform:'mobile',
  top:'<section class="planningViewBar mobilePlanningViewBar nethorMobilePlanningCommand" aria-label="Planning"><div class="mobilePlanningViewGroup"><div class="nethorMobilePlanningTitle"><span>Organisation</span><strong>Planning</strong><small>Horaires et présence de l’équipe</small></div><div class="viewTabs" aria-label="Période affichée"><button id="weekViewBtn" class="viewTab active" type="button" onclick="setPlanningView(\'week\')">Semaine</button><button id="yearViewBtn" class="viewTab yearMenuBtn" type="button" onclick="setPlanningView(\'year\')" aria-label="Ouvrir le calendrier annuel"><span class="yearTabMobile"><span>Année</span><small id="planningDeviceLabel">Mobile</small></span></button></div></div><div class="weekNav mobileWeekNav" aria-label="Navigation entre les semaines"><span id="weekLabel" class="weekLabel"></span><button class="btn light miniNav" type="button" onclick="changeWeek(-1)" aria-label="Semaine précédente">←</button><button class="btn light" type="button" onclick="goCurrentWeek()">Aujourd’hui</button><button class="btn light miniNav" type="button" onclick="changeWeek(1)" aria-label="Semaine suivante">→</button></div></section>',
  toolbar:'<div id="planningToolbar" class="toolbar mobilePlanningToolbar"><div class="mobilePlanningDayGroup"><div id="days" class="days" aria-label="Jours de la semaine"></div></div><div id="planningActions" class="planningActions mobilePlanningStatus"><span id="saveState" class="saveState passive">Lecture seule</span></div></div>',
  sourceActions:'',
  mobileActions:mobileActions(),
  mobileSchedule:'<div id="mobileSchedule" class="mobileSchedule hidden"></div>'
 }
}
window.NethorMobilePlanningLayout=Object.freeze({build});
})();
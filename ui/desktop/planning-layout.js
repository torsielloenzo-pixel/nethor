(function(){
'use strict';
function importControls(){
 return '<div id="importPanel" class="importPanel compactImport hidden"><input id="excelFile" type="file" accept=".xls,.xlsx,.xlsm" multiple hidden onchange="importPlanningFiles(this.files)"><div class="excelDrop" onclick="document.getElementById(\'excelFile\').click()" ondragover="excelDrag(event,true)" ondragleave="excelDrag(event,false)" ondrop="excelDropFile(event)"><span class="excelIcon" aria-hidden="true">▦</span><div><strong>Importer un planning</strong><small>Excel · plusieurs fichiers acceptés</small></div></div><div id="importState" class="importState"></div></div><button id="editPlanningBtn" class="btn dark hidden" type="button" onclick="toggleEditMode()">✎ Modifier</button>'
}
function build(){
 return {
  platform:'desktop',
  top:'<section class="planningViewBar desktopPlanningViewBar nethorPlanningCommandBar" aria-label="Pilotage du planning"><div class="desktopPlanningViewGroup nethorPlanningCommandIdentity"><div class="nethorPlanningCommandCopy"><span class="nethorPlanningEyebrow">Organisation</span><strong class="nethorPlanningCommandTitle">Planning</strong><small>Équipe, horaires et couverture du magasin</small></div><div class="viewTabs" aria-label="Période affichée"><button id="weekViewBtn" class="viewTab active" type="button" onclick="setPlanningView(\'week\')">Semaine</button><button id="yearViewBtn" class="viewTab yearMenuBtn" type="button" onclick="setPlanningView(\'year\')" aria-label="Ouvrir la vue annuelle"><span class="yearTabDesktop">Année</span></button></div></div><div class="weekNav desktopWeekNav" aria-label="Navigation entre les semaines"><span id="weekLabel" class="weekLabel"></span><button class="btn light miniNav" type="button" onclick="changeWeek(-1)" aria-label="Semaine précédente">←</button><button class="btn light" type="button" onclick="goCurrentWeek()">Aujourd’hui</button><button class="btn light miniNav" type="button" onclick="changeWeek(1)" aria-label="Semaine suivante">→</button></div></section>',
  toolbar:'<div id="planningToolbar" class="toolbar desktopPlanningToolbar nethorPlanningDayBar"><div class="desktopPlanningDayGroup"><span class="desktopPlanningMenuLabel">Journée</span><div id="days" class="days" aria-label="Jours de la semaine"></div></div><div id="planningActions" class="planningActions"><span id="saveState" class="saveState passive">Lecture seule</span></div></div>',
  sourceActions:'<div class="planningPlatformSourceActions planningDesktopSourceActions">'+importControls()+'</div>',
  mobileActions:'',
  mobileSchedule:''
 }
}
window.NethorDesktopPlanningLayout=Object.freeze({build});
})();
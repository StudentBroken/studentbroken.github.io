// --- CONFIGURATION & GLOBAL STATE ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1CoMUIieKjENe1jE-5It-pIEi7qiU2Mv6ian-3yDNs6uz383wlQYmCdDNXXHAgLjpGw/exec';
const subjectNames = { 'ART':"Arts", 'MUS':"Musique", 'DRM':"Art Dram.", 'CAT':"Tech", 'FRA':"Français", 'ELA':"Anglais", 'EESL':"Anglais Enrichi", 'ESL':"Anglais Second", 'SN':"Math SN", 'CST':"Math CST", 'ST':"Science", 'STE':"Science (STE)", 'HQC':"Histoire", 'CCQ':"Citoyenneté", 'EPS':"É. Phys.", 'CHI':"Chimie", 'PHY':"Physique", 'MON':"Monde Cont.", 'MED':"Média", 'ENT':"Entreprenariat", 'INF':"Informatique", 'PSY':"Psychologie", 'FIN':"Finance" };
const TERM_WEIGHTS = { etape1:0.20, etape2:0.20, etape3:0.60 };

let mbsData = {};
let rankingData = { status: 'idle', data: null, error: null };
let activeGauges = {};
let activeWidgetCharts = {};
let activeExpandedCharts = {};
let currentRankingInfo = { widget: null, key: null };

// --- DOM ELEMENTS ---
const widgetGrid = document.getElementById('widget-grid');
const expandedViewOverlay = document.getElementById('expanded-view-overlay');
const expandedViewGrid = document.getElementById('expanded-view-grid');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    init();
});

function init() {
    mbsData = JSON.parse(localStorage.getItem('mbsData')) || {};
    if (!mbsData.valid) {
        widgetGrid.innerHTML = `<p style="text-align:center; grid-column: 1 / -1;">Aucune donnée. Veuillez <a href="data.html">importer vos données</a>.</p>`;
        return;
    }
    mbsData.settings = mbsData.settings || {};
    mbsData.settings.chartViewPrefs = mbsData.settings.chartViewPrefs || {};
    mbsData.settings.historyMode = mbsData.settings.historyMode || {};
    mbsData.settings.assignmentOrder = mbsData.settings.assignmentOrder || {};
    mbsData.historique = mbsData.historique || {};
    setupEventListeners();
    fetchRankingData();
    renderWidgets('generale');
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelector('.tab-btn.active').classList.remove('active');
        btn.classList.add('active');
        renderWidgets(btn.dataset.etape);
    }));
    expandedViewOverlay.addEventListener('click', e => {
        if (e.target === expandedViewOverlay) closeExpandedView();
    });
}

// --- THEME LOGIC ---
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const toggleIcon = themeToggle.querySelector('i');
    const THEME_KEY = 'mbs-theme';
    const updateTheme = (theme) => { html.setAttribute('data-theme', theme); localStorage.setItem(THEME_KEY, theme); toggleIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'; };
    const storedTheme = localStorage.getItem(THEME_KEY);
    const initialTheme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    updateTheme(initialTheme);
    themeToggle.addEventListener('click', () => { const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; updateTheme(newTheme); });
}

// --- DATA CALCULATION HELPERS ---
const getNumericGrade = (result) => {
    if (!result) return null;
    const gradeMap = {'A+':100,'A':95,'A-':90,'B+':85,'B':80,'B-':75,'C+':70,'C':65,'C-':60,'D+':55,'D':50,'E':45};
    const trimmed = result.trim();
    if(gradeMap[trimmed]) return gradeMap[trimmed];
    const scoreMatch = trimmed.match(/(\d+[,.]?\d*)\s*\/\s*(\d+[,.]?\d*)/);
    if (scoreMatch) { const score = parseFloat(scoreMatch[1].replace(',', '.')); const max = parseFloat(scoreMatch[2].replace(',', '.')); return (max > 0) ? (score / max) * 100 : null; }
    return null;
};
const calculateAverage = (assignments) => {
    let totalWeightedGrade = 0, totalWeight = 0;
    (assignments || []).forEach(assign => { const grade = getNumericGrade(assign.result); const weight = parseFloat(assign.pond); if (grade !== null && !isNaN(weight) && weight > 0) { totalWeightedGrade += grade * weight; totalWeight += weight; } });
    return totalWeight > 0 ? { average: totalWeightedGrade / totalWeight, weight: totalWeight } : null;
};
const calculateSubjectAverage = (subject) => {
    let totalWeightedCompetencyScore = 0, totalCompetencyWeight = 0;
    (subject?.competencies || []).forEach(comp => { const compWeightMatch = comp.name.match(/\((\d+)%\)/); if (!compWeightMatch) return; const competencyWeight = parseFloat(compWeightMatch[1]); const compResult = calculateAverage(comp.assignments); if (compResult) { totalWeightedCompetencyScore += compResult.average * competencyWeight; totalCompetencyWeight += competencyWeight; } });
    return totalCompetencyWeight > 0 ? totalWeightedCompetencyScore / totalCompetencyWeight : null;
};

// --- MAIN WIDGET RENDERING ---
function renderWidgets(etapeKey) {
    widgetGrid.innerHTML = '';
    Object.values(activeGauges).forEach(chart => chart.destroy());
    Object.values(activeWidgetCharts).forEach(chart => chart.destroy());
    const allSubjectsAcrossEtapes = new Map();
    ['etape1', 'etape2', 'etape3'].forEach(etape => {
        (mbsData[etape] || []).forEach(subject => { if (!allSubjectsAcrossEtapes.has(subject.code)) { allSubjectsAcrossEtapes.set(subject.code, { ...subject, competencies: [] }); } });
        (mbsData[etape] || []).forEach(subject => { allSubjectsAcrossEtapes.get(subject.code)?.competencies.push(...subject.competencies); });
    });
    let subjectsToRender = (etapeKey === 'generale') ? Array.from(allSubjectsAcrossEtapes.values()) : (mbsData[etapeKey] || []);
    subjectsToRender = subjectsToRender.map(subject => ({ ...subject, average: calculateSubjectAverage(subject) })).filter(s => s.average !== null);
    renderGeneralAverageWidget(subjectsToRender, etapeKey);
    subjectsToRender.forEach(subject => {
        const overallSubject = allSubjectsAcrossEtapes.get(subject.code);
        const history = mbsData.historique[subject.code] || [];
        let trend;
        if (history.length < 2) { trend = { direction: '—', change: '0.00%', class: 'neutral' }; }
        else { const [prev, curr] = history.slice(-2); const change = curr - prev; trend = change < 0 ? { direction: '▼', change: `${change.toFixed(2)}%`, class: 'down' } : { direction: '▲', change: `+${change.toFixed(2)}%`, class: 'up' }; }
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        const chartCanvasId = `dist-chart-${subject.code.replace(/\s+/g, '')}`;
        widget.innerHTML = `<div class="widget-top-section"><div class="widget-info"><h3 class="widget-title">${subject.name}</h3><p class="widget-average">${subject.average.toFixed(2)}%</p><div class="widget-trend ${trend.class}"><span>${trend.direction}</span><span>${trend.change}</span></div></div><div class="gauge-container"><canvas id="gauge-${chartCanvasId}"></canvas></div></div><div class="widget-chart-controls"><button class="chart-toggle-btn order-edit-btn" title="Ordonner les travaux"><i class="fa-solid fa-list-ol"></i></button><button class="chart-toggle-btn chart-view-toggle-btn" title="Changer de vue"><i class="fa-solid fa-chart-line"></i></button></div><div class="histogram-container"><canvas id="${chartCanvasId}"></canvas></div>`;
        widget.addEventListener('click', () => openExpandedView(overallSubject));
        widgetGrid.appendChild(widget);
        renderGauge(`gauge-${chartCanvasId}`, subject.average);
        const preferredView = mbsData.settings.chartViewPrefs[subject.code] || 'histogram';
        if (preferredView === 'line') { renderLineGraph(chartCanvasId, overallSubject); } else { renderHistogram(chartCanvasId, overallSubject); }
        widget.querySelector('.chart-view-toggle-btn').addEventListener('click', (e) => { e.stopPropagation(); const currentView = mbsData.settings.chartViewPrefs[subject.code] || 'histogram'; const newView = currentView === 'histogram' ? 'line' : 'histogram'; mbsData.settings.chartViewPrefs[subject.code] = newView; localStorage.setItem('mbsData', JSON.stringify(mbsData)); if (activeWidgetCharts[chartCanvasId]) activeWidgetCharts[chartCanvasId].destroy(); if (newView === 'line') renderLineGraph(chartCanvasId, overallSubject); else renderHistogram(chartCanvasId, overallSubject); });
        widget.querySelector('.order-edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openOrderEditor(overallSubject); });
    });
}
function renderGeneralAverageWidget(subjects, etapeKey) {
    if (subjects.length === 0) return;
    const totalAverage = subjects.reduce((sum, s) => sum + s.average, 0) / subjects.length;
    const historyKey = `general-${etapeKey}`;
    const history = mbsData.historique[historyKey] || [];
    if(history.length === 0 || history[history.length-1].toFixed(2) !== totalAverage.toFixed(2)) { history.push(totalAverage); if (history.length > 10) history.shift(); mbsData.historique[historyKey] = history; localStorage.setItem('mbsData', JSON.stringify(mbsData)); }
    let trend;
    if (history.length < 2) { trend = { direction: '—', change: '0.00%', class: 'neutral' }; }
    else { const [prev, curr] = history.slice(-2); const change = curr - prev; trend = change < 0 ? { direction: '▼', change: `${change.toFixed(2)}%`, class: 'down' } : { direction: '▲', change: `+${change.toFixed(2)}%`, class: 'up' }; }
    const widget = document.createElement('div');
    widget.className = 'subject-widget';
    const chartCanvasId = `general-chart-${etapeKey}`;
    widget.innerHTML = `<div class="widget-top-section"><div class="widget-info"><h3 class="widget-title">Moyenne Générale (${etapeKey === 'generale' ? 'Toutes' : etapeKey.replace('etape', 'Étape ')})</h3><p class="widget-average">${totalAverage.toFixed(2)}%</p><div class="widget-trend ${trend.class}"><span>${trend.direction}</span><span>${trend.change}</span></div></div><div class="gauge-container"><canvas id="gauge-${chartCanvasId}"></canvas></div></div><div class="widget-chart-controls"><button class="chart-toggle-btn" title="Changer de vue"><i class="fa-solid fa-chart-line"></i></button></div><div class="histogram-container"><canvas id="${chartCanvasId}"></canvas></div>`;
    widget.addEventListener('click', () => openExpandedViewForGeneral(subjects, etapeKey, totalAverage, history));
    widgetGrid.prepend(widget);
    renderGauge(`gauge-${chartCanvasId}`, totalAverage);
    const preferredView = mbsData.settings.chartViewPrefs[historyKey] || 'histogram';
    const toggleBtn = widget.querySelector('.chart-toggle-btn');
    if (preferredView === 'line') { renderGeneralAverageHistoryGraph(chartCanvasId, history); toggleBtn.innerHTML = '<i class="fa-solid fa-chart-column"></i>'; }
    else { renderSubjectDistributionHistogram(chartCanvasId, subjects); toggleBtn.innerHTML = '<i class="fa-solid fa-chart-line"></i>'; }
    toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); const currentView = mbsData.settings.chartViewPrefs[historyKey] || 'histogram'; const newView = currentView === 'histogram' ? 'line' : 'histogram'; mbsData.settings.chartViewPrefs[historyKey] = newView; localStorage.setItem('mbsData', JSON.stringify(mbsData)); if (activeWidgetCharts[chartCanvasId]) activeWidgetCharts[chartCanvasId].destroy(); if (newView === 'line') renderGeneralAverageHistoryGraph(chartCanvasId, history); else renderSubjectDistributionHistogram(chartCanvasId, subjects); });
}

// --- EXPANDED VIEW LOGIC ---
function openExpandedView(subject) {
    expandedViewGrid.innerHTML = '';
    const subjectAverage = calculateSubjectAverage(subject);
    const summaryWidget = document.createElement('div');
    summaryWidget.className = 'subject-widget';
    summaryWidget.style.cssText = 'display: flex; flex-direction: column;';
    summaryWidget.innerHTML = `<div class="widget-top-section" style="flex: 1;"><div class="widget-info"><h3 class="widget-title">${subject.name} (Résumé)</h3><p class="widget-average">${subjectAverage.toFixed(2)}%</p></div><div class="gauge-container"><canvas id="expanded-gauge-chart"></canvas></div></div><div class="histogram-container" style="flex: 1; margin-top: 10px;"><canvas id="expanded-hist-chart"></canvas></div><div class="histogram-container" style="flex: 1; margin-top: 10px;"><canvas id="expanded-line-chart"></canvas></div>`;
    const detailsWidget = document.createElement('div');
    detailsWidget.className = 'subject-widget';
    detailsWidget.style.cssText = 'display: flex; flex-direction: column;';
    detailsWidget.innerHTML = `<h3 class="widget-title" style="margin-bottom:20px; flex-shrink: 0;">Détails & Planificateur</h3><div class="details-widget-body" style="flex-grow: 1; min-height: 0;"><div class="competency-widgets"></div><div class="graph-container" style="height: 250px; margin-top: 20px; position: relative;"><canvas id="assignmentsChart"></canvas></div><div class="calculator-container"></div></div><a href="projection.html?subject=${encodeURIComponent(subject.name)}" class="btn-secondary" style="margin-top: 20px; text-align: center; flex-shrink: 0;">Plus d'information</a>`;
    const rankingWidget = document.createElement('div');
    rankingWidget.className = 'subject-widget';
    rankingWidget.innerHTML = `<h3 class="widget-title">Classement de la matière</h3><div id="ranking-content" style="height: calc(100% - 40px); display: flex; flex-direction: column;"></div>`;
    expandedViewGrid.append(summaryWidget, detailsWidget, rankingWidget);
    expandedViewOverlay.classList.add('active');
    renderGauge('expanded-gauge-chart', subjectAverage);
    renderHistogram('expanded-hist-chart', subject, activeExpandedCharts);
    renderLineGraph('expanded-line-chart', subject, activeExpandedCharts);
    populateDetailsWidget(detailsWidget, subject);
    const rankingKey = subject.code.substring(0, 3);
    currentRankingInfo = { widget: rankingWidget, key: rankingKey };
    populateRankingWidget(rankingWidget, rankingKey);
}
function openExpandedViewForGeneral(subjects, etapeKey, average, history) {
    expandedViewGrid.innerHTML = '';
    const title = `Moyenne Générale (${etapeKey === 'generale' ? 'Toutes' : etapeKey.replace('etape', 'Étape ')})`;
    const summaryWidget = document.createElement('div');
    summaryWidget.className = 'subject-widget';
    summaryWidget.style.cssText = 'display: flex; flex-direction: column;';
    summaryWidget.innerHTML = `<div class="widget-top-section" style="flex: 1;"><div class="widget-info"><h3 class="widget-title">${title} (Résumé)</h3><p class="widget-average">${average.toFixed(2)}%</p></div><div class="gauge-container"><canvas id="expanded-gauge-chart"></canvas></div></div><div class="histogram-container" style="flex: 1; margin-top: 10px;"><canvas id="expanded-hist-chart"></canvas></div><div class="histogram-container" style="flex: 1; margin-top: 10px;"><canvas id="expanded-line-chart"></canvas></div>`;
    const detailsWidget = document.createElement('div');
    detailsWidget.className = 'subject-widget';
    detailsWidget.style.cssText = 'display: flex; flex-direction: column;';
    detailsWidget.innerHTML = `<h3 class="widget-title" style="margin-bottom:20px; flex-shrink: 0;">Détail par Matière</h3><div class="details-widget-body" style="flex-grow: 1; min-height: 0;"><div class="competency-widgets"></div><div class="graph-container" style="height: 250px; margin-top: 20px; position: relative;"><canvas id="assignmentsChart"></canvas></div><div class="calculator-container"><p>Le planificateur est disponible uniquement pour les matières individuelles.</p></div></div><a href="projection.html" class="btn-secondary" style="margin-top: 20px; text-align: center; flex-shrink: 0;">Plus d'information</a>`;
    const rankingWidget = document.createElement('div');
    rankingWidget.className = 'subject-widget';
    rankingWidget.innerHTML = `<h3 class="widget-title">Classement de la Moyenne</h3><div id="ranking-content" style="height: calc(100% - 40px); display: flex; flex-direction: column;"></div>`;
    expandedViewGrid.append(summaryWidget, detailsWidget, rankingWidget);
    expandedViewOverlay.classList.add('active');
    renderGauge('expanded-gauge-chart', average);
    renderSubjectDistributionHistogram('expanded-hist-chart', subjects, activeExpandedCharts);
    renderGeneralAverageHistoryGraph('expanded-line-chart', history, activeExpandedCharts);
    populateGeneralDetailsWidget(detailsWidget, subjects, average);
    const rankingKey = etapeKey === 'generale' ? 'GlobalAverage' : `Etape${etapeKey.slice(-1)}Average`;
    currentRankingInfo = { widget: rankingWidget, key: rankingKey };
    populateRankingWidget(rankingWidget, rankingKey);
}
function closeExpandedView() {
    expandedViewOverlay.classList.remove('active');
    Object.values(activeExpandedCharts).forEach(chart => chart.destroy());
    activeExpandedCharts = {};
    currentRankingInfo = { widget: null, key: null };
}
function populateDetailsWidget(widget, subject) {
    const competencyContainer = widget.querySelector('.competency-widgets');
    const uniqueCompetencies = new Map();
    (subject.competencies || []).forEach(comp => { if (!uniqueCompetencies.has(comp.name)) { uniqueCompetencies.set(comp.name, { name: comp.name, assignments: [] }); } uniqueCompetencies.get(comp.name).assignments.push(...(comp.assignments || [])); });
    const compsForChart = Array.from(uniqueCompetencies.values());
    compsForChart.forEach((comp, index) => { const compResult = calculateAverage(comp.assignments); if (!compResult) return; const compWidget = document.createElement('div'); compWidget.className = 'comp-widget'; compWidget.dataset.index = index; compWidget.innerHTML = `<h4>${comp.name.split('(')[0].trim()}</h4><div class="avg">${compResult.average.toFixed(1)}%</div>`; competencyContainer.appendChild(compWidget); });
    const compWidgets = competencyContainer.querySelectorAll('.comp-widget');
    compWidgets.forEach(w => { w.addEventListener('click', () => { compWidgets.forEach(el => el.classList.remove('active')); w.classList.add('active'); const compIndex = parseInt(w.dataset.index, 10); const selectedComp = compsForChart[compIndex]; renderAssignmentsChart((selectedComp.assignments || []).filter(a => getNumericGrade(a.result) !== null)); }); });
    if (compsForChart.length > 0 && compWidgets.length > 0) { compWidgets[0].click(); } else { widget.querySelector('.graph-container').style.display = 'none'; }
    setupGoalFramework(subject, widget.querySelector('.calculator-container'));
}
function populateGeneralDetailsWidget(widget, subjects, average) {
    const subjectContainer = widget.querySelector('.competency-widgets');
    const summaryWidget = document.createElement('div');
    summaryWidget.className = 'comp-widget active';
    summaryWidget.style.flexBasis = '100%';
    summaryWidget.innerHTML = `<h4>Toutes les matières</h4><div class="avg">${average.toFixed(1)}%</div>`;
    subjectContainer.appendChild(summaryWidget);
    renderSubjectAveragesChart(subjects);
}

// --- RANKING LOGIC ---
async function fetchRankingData() {
    if (rankingData.status === 'loading' || rankingData.status === 'loaded') return;
    rankingData.status = 'loading';
    try {
        if (!mbsData?.nom || !mbsData?.settings?.niveau) throw new Error("Nom ou niveau manquant.");
        const localAvgs = calculateAveragesFromRawData(mbsData);
        const encodedName = btoa(unescape(encodeURIComponent(mbsData.nom)));
        const formData = new FormData();
        formData.append('encodedName', encodedName);
        formData.append('secondaryLevel', mbsData.settings.niveau);
        for (const key in localAvgs.term) formData.append(key, localAvgs.term[key]?.toFixed(2) ?? '');
        for (const key in localAvgs.subjects) formData.append(key, localAvgs.subjects[key]?.toFixed(2) ?? '');
        fetch(SCRIPT_URL, { method: 'POST', body: formData, mode: 'no-cors' });
        const getResponse = await fetch(`${SCRIPT_URL}?level=${mbsData.settings.niveau}`);
        if (!getResponse.ok) throw new Error(`Erreur réseau: ${getResponse.statusText}`);
        const allData = await getResponse.json();
        if (allData.result === 'error') throw new Error(allData.error);
        rankingData = { status: 'loaded', data: allData, error: null };
        if (currentRankingInfo.widget && currentRankingInfo.key) {
            populateRankingWidget(currentRankingInfo.widget, currentRankingInfo.key);
        }
    } catch (error) {
        console.error("Ranking Fetch Error:", error);
        rankingData = { status: 'error', data: null, error: error.message };
        if (currentRankingInfo.widget) {
             populateRankingWidget(currentRankingInfo.widget, currentRankingInfo.key);
        }
    }
}
function populateRankingWidget(widget, rankingKey) {
    const contentEl = widget.querySelector('#ranking-content');
    if (rankingData.status === 'loading') { contentEl.innerHTML = `<p>Synchronisation des classements...</p><div class="ghost-item"></div><div class="ghost-item"></div><div class="ghost-item"></div>`; return; }
    if (rankingData.status === 'error') { contentEl.innerHTML = `<p style="color:var(--danger-color)">Erreur de chargement: ${rankingData.error}</p>`; return; }
    const encodedName = btoa(unescape(encodeURIComponent(mbsData.nom)));
    const levelData = rankingData.data;
    const currentUserData = levelData.find(d => d.encodedName === encodedName);
    if (!currentUserData || !(rankingKey in currentUserData) || currentUserData[rankingKey] === null) { contentEl.innerHTML = `<p>Aucune donnée de classement pour cette catégorie.</p>`; return; }
    const { rank, total, percentile } = getRank(levelData, rankingKey, encodedName);
    const getTrophy = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);
    const leaderboardItemsHTML = levelData.filter(u => u[rankingKey] && !isNaN(parseFloat(u[rankingKey]))).sort((a, b) => b[rankingKey] - a[rankingKey]).map((user, index) => { const r = index + 1; const isCurrentUser = user.encodedName === encodedName; const name = isCurrentUser ? 'Vous' : `Anonyme #${r}`; return `<li class="leaderboard-item ${isCurrentUser ? 'is-user' : ''}"><span class="item-rank">${getTrophy(r)}</span><span class="item-name">${name}</span><span class="item-grade">${parseFloat(user[rankingKey]).toFixed(1)}%</span></li>`; }).join('');
    contentEl.innerHTML = `<div class="widget-rank">${rank} sur ${total} <span style="margin-left: 8px;">(Top ${percentile}%)</span></div><div class="mini-leaderboard-container" style="max-height: 200px; overflow-y: auto; flex-shrink: 0;"><ul class="leaderboard-list">${leaderboardItemsHTML}</ul></div><div class="histogram-container" style="flex-grow: 1; margin-top:20px;"><canvas id="ranking-comparison-chart"></canvas></div>`;
    const userItem = contentEl.querySelector('.is-user');
    if(userItem) userItem.parentElement.parentElement.scrollTop = userItem.offsetTop - 50;
    renderRankingComparisonChart('ranking-comparison-chart', levelData, currentUserData);
}

// --- GOAL FRAMEWORK (FIXED) ---
function setupGoalFramework(subject, container) {
    container.innerHTML = `<h3>Planificateur d'Objectifs</h3><div class="goal-input"><label for="objective-input">Objectif :</label><input type="number" id="objective-input" min="0" max="100" value="">%</div><div id="calculator-content"></div>`;
    const objectiveInput = container.querySelector('#objective-input');
    const calculatorContent = container.querySelector('#calculator-content');
    const hasFutureWork = (subject.competencies || []).some(comp => (comp.assignments || []).some(a => getNumericGrade(a.result) === null && parseFloat(a.pond) > 0));
    if (hasFutureWork) {
        setupIntraSubjectCalculator(subject, calculatorContent, objectiveInput);
    } else {
        calculatorContent.innerHTML = `<p>Tous les travaux pour cette matière ont été notés.</p>`;
    }
}

function setupIntraSubjectCalculator(subject, container, goalInput) {
    container.innerHTML = `<p id="calc-info"></p><div id="goal-result" class="goal-result"></div>`;
    const goalResult = container.querySelector('#goal-result');
    const calcInfo = container.querySelector('#calc-info');
    
    const calculate = () => {
        let sumOfWeightedGrades = 0, sumOfCompletedWeights = 0, sumOfFutureWeights = 0;
        (subject.competencies || []).forEach(comp => {
            const compWeightMatch = comp.name.match(/\((\d+)%\)/);
            if (!compWeightMatch) return;
            const competencyWeight = parseFloat(compWeightMatch[1]);
            (comp.assignments || []).forEach(assign => {
                const weight = parseFloat(assign.pond);
                if (isNaN(weight) || weight <= 0) return;
                const finalWeight = (weight / 100) * competencyWeight;
                const grade = getNumericGrade(assign.result);
                if (grade !== null) {
                    sumOfWeightedGrades += grade * finalWeight;
                    sumOfCompletedWeights += finalWeight;
                } else {
                    sumOfFutureWeights += finalWeight;
                }
            });
        });

        if (sumOfFutureWeights < 0.0001) {
            calcInfo.textContent = 'Tous les travaux ont été notés.';
            goalResult.style.display = 'none';
            return;
        }

        const currentAverage = sumOfCompletedWeights > 0 ? (sumOfWeightedGrades / sumOfCompletedWeights) : 0;
        calcInfo.innerHTML = `Moyenne actuelle : <strong>${currentAverage.toFixed(2)}%</strong> (sur les travaux complétés).`;

        const targetAvg = parseFloat(goalInput.value);
        if (isNaN(targetAvg) || targetAvg < 0 || targetAvg > 100) {
            goalResult.innerHTML = 'Veuillez entrer un objectif valide.';
            goalResult.className = 'goal-result';
            return;
        }

        // --- FIXED FORMULA ---
        // New Formula: Required = Target + (Target - Current) * (CompletedWeight / FutureWeight)
        const requiredAvgOnFuture = targetAvg + (targetAvg - currentAverage) * (sumOfCompletedWeights / sumOfFutureWeights);

        let message, resultClass;
        if (requiredAvgOnFuture > 100.01) { message = `Il faudrait <strong>${requiredAvgOnFuture.toFixed(1)}%</strong> sur les travaux restants. Objectif impossible.`; resultClass = 'danger'; }
        else if (requiredAvgOnFuture < 0) { message = `Félicitations ! Objectif déjà atteint.`; resultClass = 'success'; }
        else { message = `Il vous faut une moyenne de <strong>${requiredAvgOnFuture.toFixed(1)}%</strong> sur les travaux restants.`; resultClass = 'warning'; }
        goalResult.innerHTML = message;
        goalResult.className = `goal-result ${resultClass}`;
    }
    
    goalInput.addEventListener('input', calculate);
    calculate();
}


// --- UNCHANGED HELPER & CHART FUNCTIONS ---
// (Omitted for brevity, but they are the same as the previous version)
function openOrderEditor(subject) { const existingModal = document.getElementById('order-editor-modal'); if(existingModal) existingModal.remove(); const modal = document.createElement('div'); modal.id = 'order-editor-modal'; modal.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:2000; display:flex; align-items:center; justify-content:center;`; const allAssignments = (subject.competencies || []).flatMap((c, i) => (c.assignments || []).map((a, j) => ({ ...a, uniqueId: `${subject.code}-${i}-${j}` }))).filter(a => getNumericGrade(a.result) !== null); const currentOrder = mbsData.settings.assignmentOrder[subject.code] || []; if (currentOrder.length > 0) { const orderMap = new Map(currentOrder.map((id, index) => [id, index])); allAssignments.sort((a, b) => (orderMap.get(a.uniqueId) ?? Infinity) - (orderMap.get(b.uniqueId) ?? Infinity)); } modal.innerHTML = `<div style="background:var(--widget-background); color:var(--text-color); padding:25px; border-radius:12px; width:90%; max-width:600px;"><h3>Ordonner les Travaux pour le Graphique</h3><p style="color:var(--text-secondary-color); text-align:center;">Glissez-déposez pour réorganiser l'ordre des points sur le graphique.</p><ul id="order-list" style="list-style:none; padding:0; margin: 0 0 20px 0; max-height: 40vh; overflow-y: auto;">${allAssignments.map(assign => `<li draggable="true" data-id="${assign.uniqueId}" style="background:var(--background-color); margin-bottom:8px; padding:10px 15px; border-radius:5px; display:flex; align-items:center; cursor:grab; border:1px solid var(--border-color);"><i class="fa-solid fa-grip-vertical" style="margin-right:15px;"></i>${assign.work.replace('<br>', ' ')} <span style="margin-left:auto; background:var(--widget-background); padding:3px 8px; border-radius:10px; font-size:0.8em; border:1px solid var(--border-color);">${assign.result}</span></li>`).join('')}</ul><div style="display:flex; justify-content:space-between; align-items:center;"><button id="reset-mode-btn" class="btn-secondary">Mode moyenne auto</button><div><button id="close-order-editor" class="btn-secondary">Annuler</button><button id="save-order" class="btn-secondary" style="background-color:var(--success-color); margin-left:10px;">Sauvegarder</button></div></div></div>`; document.body.appendChild(modal); const content = modal.querySelector('div'); content.addEventListener('click', e => e.stopPropagation()); const list = modal.querySelector('#order-list'); let draggedItem = null; list.addEventListener('dragstart', e => { draggedItem = e.target; setTimeout(() => e.target.style.opacity = '0.5', 0); }); list.addEventListener('dragend', e => { setTimeout(() => { if(draggedItem) { draggedItem.style.opacity = '1'; draggedItem = null; } }, 0); }); list.addEventListener('dragover', e => { e.preventDefault(); const afterElement = [...list.querySelectorAll('li:not(.dragging)')].reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2; return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element; if (draggedItem) { if (afterElement == null) { list.appendChild(draggedItem); } else { list.insertBefore(draggedItem, afterElement); } } }); const closeModal = () => { modal.remove(); renderWidgets(document.querySelector('.tab-btn.active').dataset.etape); }; modal.addEventListener('click', closeModal); modal.querySelector('#save-order').addEventListener('click', () => { const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.id); mbsData.settings.assignmentOrder[subject.code] = newOrder; mbsData.settings.historyMode[subject.code] = 'assignment'; localStorage.setItem('mbsData', JSON.stringify(mbsData)); closeModal(); }); modal.querySelector('#reset-mode-btn').addEventListener('click', () => { delete mbsData.settings.assignmentOrder[subject.code]; delete mbsData.settings.historyMode[subject.code]; localStorage.setItem('mbsData', JSON.stringify(mbsData)); closeModal(); }); modal.querySelector('#close-order-editor').addEventListener('click', closeModal); }
function calculateAveragesFromRawData(data) { let termAverages = { GlobalAverage:null, Etape1Average: null, Etape2Average: null, Etape3Average: null }; let allSubjectAverages = {}; ['etape1', 'etape2', 'etape3'].forEach(etape => { let termSubjectAvgs = []; (data[etape] || []).forEach(subject => { const subjectAverage = calculateSubjectAverage(subject); if (subjectAverage !== null) { termSubjectAvgs.push(subjectAverage); const code = subject.code.substring(0, 3); if (!allSubjectAverages[code]) allSubjectAverages[code] = { total: 0, count: 0 }; allSubjectAverages[code].total += subjectAverage; allSubjectAverages[code].count++; } }); if (termSubjectAvgs.length > 0) { const etapeKey = 'Etape' + etape.slice(-1) + 'Average'; termAverages[etapeKey] = termSubjectAvgs.reduce((a, b) => a + b, 0) / termSubjectAvgs.length; } }); const finalSubjectAvgs = {}; for (const code in allSubjectAverages) { finalSubjectAvgs[code] = allSubjectAverages[code].total / allSubjectAverages[code].count; } let globalTotal = 0, globalWeight = 0; if(termAverages.Etape1Average !== null) {globalTotal += termAverages.Etape1Average * TERM_WEIGHTS.etape1; globalWeight += TERM_WEIGHTS.etape1}; if(termAverages.Etape2Average !== null) {globalTotal += termAverages.Etape2Average * TERM_WEIGHTS.etape2; globalWeight += TERM_WEIGHTS.etape2}; if(termAverages.Etape3Average !== null) {globalTotal += termAverages.Etape3Average * TERM_WEIGHTS.etape3; globalWeight += TERM_WEIGHTS.etape3}; if (globalWeight > 0) termAverages.GlobalAverage = globalTotal / globalWeight; return { term: termAverages, subjects: finalSubjectAvgs }; }
function getRank(levelData, key, currentUserEncodedName) { const scores = levelData.map(row => parseFloat(row[key])).filter(score => !isNaN(score)); scores.sort((a, b) => b - a); const currentUser = levelData.find(d => d.encodedName === currentUserEncodedName); const currentUserValue = currentUser ? parseFloat(currentUser[key]) : NaN; const rank = scores.indexOf(currentUserValue) + 1; const percentile = (scores.length > 0) ? (1 - ((rank - 1) / scores.length)) * 100 : 0; return { rank: rank > 0 ? rank : null, total: scores.length, percentile: rank > 0 ? (percentile).toFixed(1) : null }; }
function renderGauge(canvasId, value) { const ctx = document.getElementById(canvasId).getContext('2d'); const gradient = ctx.createLinearGradient(0, 0, 120, 0); gradient.addColorStop(0, '#e74c3c'); gradient.addColorStop(0.6, '#f39c12'); gradient.addColorStop(1, '#27ae60'); activeGauges[canvasId] = new Chart(ctx, { type: 'doughnut', data: { datasets: [{ data: [100], backgroundColor: [gradient], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, circumference: 180, rotation: -90, cutout: '60%', plugins: { tooltip: { enabled: false } } }, plugins: [{ id: 'gaugeNeedle', afterDraw: chart => { const { ctx, chartArea } = chart; const angle = Math.PI + (value / 100) * Math.PI; const cx = chartArea.left + chartArea.width / 2; const cy = chartArea.top + chartArea.height; const needleRadius = chart.getDatasetMeta(0).data[0].outerRadius; ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(needleRadius - 10, 0); ctx.lineTo(0, 5); ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#2c3e50'; ctx.fill(); ctx.restore(); } }] }); }
function renderHistogram(canvasId, subject, chartStore = activeWidgetCharts) { const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark'; const colors = isDarkMode ? ['#ff5252', '#ff9800', '#cddc39', '#4caf50'] : ['#e74c3c', '#f39c12', '#a0c800', '#27ae60']; const grades = (subject.competencies || []).flatMap(comp => (comp.assignments || []).map(a => getNumericGrade(a.result)).filter(g => g !== null)); const bins = { 'Echec (<60)': 0, 'C (60-69)': 0, 'B (70-89)': 0, 'A (90+)': 0 }; grades.forEach(g => { if (g < 60) bins['Echec (<60)']++; else if (g < 70) bins['C (60-69)']++; else if (g < 90) bins['B (70-89)']++; else bins['A (90+)']++; }); const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx) return; chartStore[canvasId] = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(bins), datasets: [{ data: Object.values(bins), backgroundColor: colors }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false }, title: { display: true, text: 'Distribution des notes' } } } }); const widget = ctx.canvas.closest('.subject-widget'); if (widget && chartStore === activeWidgetCharts) { widget.querySelector('.chart-view-toggle-btn').innerHTML = '<i class="fa-solid fa-chart-line"></i>'; const orderBtn = widget.querySelector('.order-edit-btn'); if (orderBtn) orderBtn.style.display = 'none'; } }
function renderLineGraph(canvasId, subject, chartStore = activeWidgetCharts) { const mode = mbsData.settings.historyMode[subject.code] || 'average'; let chartData; if (mode === 'assignment') { const allAssignments = (subject.competencies || []).flatMap((c, i) => (c.assignments || []).map((a, j) => ({ ...a, uniqueId: `${subject.code}-${i}-${j}` }))).filter(a => getNumericGrade(a.result) !== null); const order = mbsData.settings.assignmentOrder[subject.code] || []; if (order.length > 0) { const orderMap = new Map(order.map((id, index) => [id, index])); allAssignments.sort((a, b) => (orderMap.get(a.uniqueId) ?? Infinity) - (orderMap.get(b.uniqueId) ?? Infinity)); } chartData = { labels: allAssignments.map(a => a.work.replace('<br>', ' ')), datasets: [{ label: 'Note', data: allAssignments.map(a => getNumericGrade(a.result)), borderColor: '#3498db', pointBackgroundColor: '#3498db', pointRadius: 5 }] }; } else { const history = (mbsData.historique[subject.code] || []).filter(h => h !== null); chartData = { labels: history.map((_, i) => `Moyenne ${i + 1}`), datasets: [{ label: 'Moyenne', data: history, borderColor: '#3498db', pointBackgroundColor: '#3498db', pointRadius: 5 }] }; } const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx) return; chartStore[canvasId] = new Chart(ctx, { type: 'line', data: chartData, options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 50, suggestedMax: 100 }, x: { ticks: { display: false }, grid: { display: false } } }, plugins: { legend: { display: false }, title: { display: true, text: mode === 'assignment' ? 'Ordre des travaux' : 'Historique des moyennes' } } } }); const widget = ctx.canvas.closest('.subject-widget'); if (widget && chartStore === activeWidgetCharts) { widget.querySelector('.chart-view-toggle-btn').innerHTML = '<i class="fa-solid fa-chart-column"></i>'; const orderBtn = widget.querySelector('.order-edit-btn'); if (orderBtn) orderBtn.style.display = 'flex'; } }
function renderAssignmentsChart(assignments) { if (activeExpandedCharts['assignmentsChart']) activeExpandedCharts['assignmentsChart'].destroy(); const ctx = document.getElementById('assignmentsChart').getContext('2d'); activeExpandedCharts['assignmentsChart'] = new Chart(ctx, { type: 'bar', data: { labels: assignments.map(a => a.work.replace('<br>', ' ')), datasets: [{ label: 'Note', data: assignments.map(a => getNumericGrade(a.result)), backgroundColor: assignments.map(a => (getNumericGrade(a.result) ?? 0) < 60 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(41, 128, 185, 0.7)'), }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 50, suggestedMax: 100, beginAtZero: false } }, plugins: { legend: { display: false }, title: { display: true, text: 'Notes des travaux' } } } }); }
function renderSubjectAveragesChart(subjects) { if (activeExpandedCharts['assignmentsChart']) activeExpandedCharts['assignmentsChart'].destroy(); const ctx = document.getElementById('assignmentsChart').getContext('2d'); activeExpandedCharts['assignmentsChart'] = new Chart(ctx, { type: 'bar', data: { labels: subjects.map(s => s.name), datasets: [{ label: 'Moyenne', data: subjects.map(s => s.average), backgroundColor: subjects.map(s => (s.average < 60 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(41, 128, 185, 0.7)')), }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 50, suggestedMax: 100, beginAtZero: false } }, plugins: { legend: { display: false }, title: { display: true, text: 'Moyennes par Matière' } } } }); }
function renderSubjectDistributionHistogram(canvasId, subjects, chartStore = activeWidgetCharts) { const bins = { 'Echec (<60)': 0, 'C (60-69)': 0, 'B (70-89)': 0, 'A (90+)': 0 }; subjects.forEach(s => { const avg = s.average; if (avg < 60) bins['Echec (<60)']++; else if (avg < 70) bins['C (60-69)']++; else if (avg < 90) bins['B (70-89)']++; else bins['A (90+)']++; }); const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark'; const colors = isDarkMode ? ['#ff5252', '#ff9800', '#cddc39', '#4caf50'] : ['#e74c3c', '#f39c12', '#a0c800', '#27ae60']; const ctx = document.getElementById(canvasId).getContext('2d'); chartStore[canvasId] = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(bins), datasets: [{ data: Object.values(bins), backgroundColor: colors }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false }, title: { display: true, text: 'Distribution des moyennes' } } } }); }
function renderGeneralAverageHistoryGraph(canvasId, history, chartStore = activeWidgetCharts) { const chartData = { labels: history.map((_, i) => `Sync ${i + 1}`), datasets: [{ label: 'Moyenne Générale', data: history, borderColor: '#3498db', tension: 0.1 }] }; const ctx = document.getElementById(canvasId).getContext('2d'); chartStore[canvasId] = new Chart(ctx, { type: 'line', data: chartData, options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 60, suggestedMax: 100 }, x: { display: false } }, plugins: { legend: { display: false }, title: { display: true, text: 'Historique de la moyenne' } } } }); }
function renderRankingComparisonChart(canvasId, levelData, currentUserData) { const calculateGroupAvg = (etapeKey) => { const validGrades = levelData.map(u => parseFloat(u[etapeKey])).filter(g => !isNaN(g) && g > 0); return validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null; }; const parseUserGrade = (grade) => (parseFloat(grade) > 0 ? parseFloat(grade) : null); const userData = [parseUserGrade(currentUserData.Etape1Average), parseUserGrade(currentUserData.Etape2Average), parseUserGrade(currentUserData.Etape3Average)]; const groupData = [calculateGroupAvg('Etape1Average'), calculateGroupAvg('Etape2Average'), calculateGroupAvg('Etape3Average')]; const ctx = document.getElementById(canvasId).getContext('2d'); activeExpandedCharts[canvasId] = new Chart(ctx, { type: 'line', data: { labels: ['Étape 1', 'Étape 2', 'Étape 3'], datasets: [ { label: 'Votre Moyenne', data: userData, borderColor: '#27ae60', tension: 0.1 }, { label: 'Moyenne du Niveau', data: groupData, borderColor: '#e74c3c', tension: 0.1 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 50, max: 100 } }, plugins: { legend: { position: 'top' } } } }); }

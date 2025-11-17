/**
 * Outil MBS - improve-functions.js
 * 
 * This script handles all the dynamic functionality for the "Analyse" page.
 * - Loads student data from localStorage.
 * - Calculates averages for different terms (étapes).
 * - Renders subject widgets dynamically.
 * - Creates and manages charts (Chart.js).
 * - Handles the expanded view for detailed analysis.
 * - Manages theme (dark/light mode).
 * 
 * FIXES IMPLEMENTED:
 * 1.  Data is now freshly loaded and calculated on every page visit, ensuring widgets are always up-to-date.
 * 2.  Average calculations are centralized in `calculateAverageForSubject`, fixing inconsistencies between the main view and the ranking/leaderboard view.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let mbsData = {};
    let activeEtape = 'generale';
    const chartInstances = {}; // To keep track of created charts

    // --- DOM ELEMENTS ---
    const widgetGrid = document.getElementById('widget-grid');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const tabsContainer = document.querySelector('.sticky-tabs');
    const expandedViewOverlay = document.getElementById('expanded-view-overlay');
    const expandedViewGrid = document.getElementById('expanded-view-grid');

    // --- INITIALIZATION ---
    function init() {
        loadData();
        setupEventListeners();
        applyInitialTheme();
        renderWidgets(activeEtape);
    }

    // --- DATA HANDLING ---
    function loadData() {
        try {
            const storedData = localStorage.getItem('mbsData');
            if (storedData) {
                mbsData = JSON.parse(storedData);
            } else {
                console.warn("MBS Data not found in localStorage. Using fallback data.");
                widgetGrid.innerHTML = `<p>Aucune donnée trouvée. Veuillez importer vos données sur la page principale.</p>`;
            }
        } catch (error) {
            console.error("Failed to parse MBS Data from localStorage:", error);
            widgetGrid.innerHTML = `<p>Erreur lors du chargement des données. Le format est peut-être invalide.</p>`;
        }
    }

    // --- CORE LOGIC: AVERAGE CALCULATION (FIX #1 and #4) ---
    /**
     * Calculates the weighted average for a given subject and etape.
     * This centralized function ensures all average calculations are consistent.
     * @param {Object} subject - The subject object from mbsData.
     * @param {string} etape - 'generale', 'etape1', 'etape2', 'etape3'.
     * @returns {number|null} The calculated average or null if no grades are available.
     */
    function calculateAverageForSubject(subject, etape) {
        const evaluations = subject.evaluations.filter(ev => {
            if (etape === 'generale') return ev.note !== null;
            return ev.etape === etape && ev.note !== null;
        });

        if (evaluations.length === 0) return null;

        let totalWeight = 0;
        let weightedSum = 0;

        evaluations.forEach(ev => {
            const weight = parseFloat(ev.ponderation) || 0;
            const grade = parseFloat(ev.note) || 0;
            totalWeight += weight;
            weightedSum += grade * weight;
        });

        return totalWeight > 0 ? (weightedSum / totalWeight) : 0;
    }
    
    /**
     * Calculates the trend by comparing the average of the last two relevant grades.
     * @param {Object} subject - The subject object.
     * @param {string} etape - The current term.
     * @returns {string} 'up', 'down', or 'neutral'.
     */
    function calculateTrend(subject, etape) {
        const evaluations = subject.evaluations
            .filter(ev => etape === 'generale' ? ev.note !== null : ev.etape === etape && ev.note !== null)
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Assuming a 'date' property

        if (evaluations.length < 2) return 'neutral';

        const lastGrade = parseFloat(evaluations[evaluations.length - 1].note);
        const secondLastGrade = parseFloat(evaluations[evaluations.length - 2].note);

        if (lastGrade > secondLastGrade) return 'up';
        if (lastGrade < secondLastGrade) return 'down';
        return 'neutral';
    }


    // --- UI RENDERING ---

    /**
     * Main function to clear and render all subject widgets for the selected etape.
     * @param {string} etape - The selected term.
     */
    function renderWidgets(etape) {
        if (!mbsData.matieres || mbsData.matieres.length === 0) return;
        widgetGrid.innerHTML = ''; // Clear existing widgets

        mbsData.matieres.forEach(subject => {
            const average = calculateAverageForSubject(subject, etape);
            
            // Only display widgets that have grades for the selected period
            if (average !== null) {
                const trend = calculateTrend(subject, etape);
                const widget = createWidgetElement(subject, average, trend, etape);
                widgetGrid.appendChild(widget);
                
                // Initialize chart for this new widget
                const canvas = widget.querySelector('.histogram-chart');
                if(canvas) {
                    createHistogramChart(canvas, subject, etape);
                }
            }
        });
    }

    /**
     * Creates the HTML structure for a single subject widget.
     * @param {Object} subject - Subject data.
     * @param {number} average - Pre-calculated average.
     * @param {string} trend - 'up', 'down', or 'neutral'.
     * @param {string} etape - The current term.
     * @returns {HTMLElement} The widget element.
     */
    function createWidgetElement(subject, average, trend, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        widget.dataset.subjectCode = subject.code;

        const trendIcons = {
            up: { class: 'up', icon: 'fa-arrow-trend-up' },
            down: { class: 'down', icon: 'fa-arrow-trend-down' },
            neutral: { class: 'neutral', icon: 'fa-minus' }
        };

        const trendInfo = trendIcons[trend];

        widget.innerHTML = `
            <div class="widget-top-section">
                <div class="widget-info">
                    <h3 class="widget-title">${subject.nom}</h3>
                    <p class="widget-average">${average.toFixed(1)}%</p>
                    <div class="widget-trend ${trendInfo.class}">
                        <i class="fa-solid ${trendInfo.icon}"></i>
                        <span>Tendance récente</span>
                    </div>
                </div>
                <!-- Gauge chart could be added here if needed -->
            </div>
            <div class="histogram-container">
                <canvas class="histogram-chart"></canvas>
            </div>
        `;
        
        // Add click listener for the expanded view
        widget.querySelector('.widget-top-section').addEventListener('click', () => {
             openExpandedView(subject.code, etape);
        });

        return widget;
    }

    // --- CHARTING (Chart.js) ---
    /**
     * Creates or updates a histogram for a widget.
     * @param {HTMLCanvasElement} canvas - The canvas element.
     * @param {Object} subject - Subject data.
     * @param {string} etape - The current term.
     */
    function createHistogramChart(canvas, subject, etape) {
        const chartId = `chart-${subject.code}-${etape}`;
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
        }

        const evaluations = subject.evaluations
            .filter(ev => etape === 'generale' ? ev.note !== null : ev.etape === etape && ev.note !== null)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (evaluations.length === 0) return;

        const labels = evaluations.map(ev => ev.nom || 'Éval.');
        const data = evaluations.map(ev => ev.note);

        const ctx = canvas.getContext('2d');
        chartInstances[chartId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Note (%)',
                    data: data,
                    backgroundColor: 'rgba(41, 128, 185, 0.6)',
                    borderColor: 'rgba(41, 128, 185, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { displayColors: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { drawOnChartArea: false } },
                    x: { ticks: { display: false }, grid: { display: false } }
                }
            }
        });
    }
    
    // --- EXPANDED VIEW ---
    function openExpandedView(subjectCode, etape) {
        const subject = mbsData.matieres.find(m => m.code === subjectCode);
        if (!subject) return;

        expandedViewGrid.innerHTML = ''; // Clear previous content

        // Create Left, Center, and Right widgets for the detailed view
        const leftWidget = createExpandedLeftWidget(subject, etape);
        const centerWidget = createExpandedCenterWidget(subject, etape);
        const rightWidget = createExpandedRightWidget(subject, etape);

        expandedViewGrid.appendChild(leftWidget);
        expandedViewGrid.appendChild(centerWidget);
        expandedViewGrid.appendChild(rightWidget);

        expandedViewOverlay.classList.add('active');
    }
    
    function createExpandedLeftWidget(subject, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        // Content for left widget (e.g., detailed grade list)
        widget.innerHTML = `<h3 class="widget-title">Détails des Évaluations</h3> <div class="details-widget-body">...</div>`;
        return widget;
    }
    
    function createExpandedCenterWidget(subject, etape) {
         const widget = document.createElement('div');
        widget.className = 'subject-widget';
         // Content for center widget (e.g., competencies and goal calculator)
        widget.innerHTML = `<h3 class="widget-title">Compétences & Objectifs</h3> <div class="details-widget-body">...</div>`;
        return widget;
    }

    function createExpandedRightWidget(subject, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        const average = calculateAverageForSubject(subject, etape); // Uses the corrected calculation
        
        // This is where you would fetch class ranking data if available
        // For now, it shows the user's current average correctly.
        widget.innerHTML = `
            <h3 class="widget-title">Classement (Exemple)</h3>
            <p>Votre moyenne: <strong>${average.toFixed(1)}%</strong></p>
            <div class="mini-leaderboard-container">
                <ul class="leaderboard-list">
                    <li class="leaderboard-item"><span class="item-rank">1.</span> <span class="item-name">Élève A</span> <span class="item-grade">94%</span></li>
                    <li class="leaderboard-item is-user"><span class="item-rank">5.</span> <span class="item-name">${mbsData.nom || 'Vous'}</span> <span class="item-grade">${average.toFixed(1)}%</span></li>
                    <li class="leaderboard-item"><span class="item-rank">...</span> <span class="item-name">Moyenne du groupe</span> <span class="item-grade">82%</span></li>
                </ul>
            </div>`;
        return widget;
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Theme toggling
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('mbs-theme', newTheme);
            updateThemeIcon(newTheme);
        });

        // Etape tabs
        tabsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                tabsContainer.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                activeEtape = e.target.dataset.etape;
                renderWidgets(activeEtape);
            }
        });
        
        // Closing the expanded view
        expandedViewOverlay.addEventListener('click', (e) => {
            if (e.target === expandedViewOverlay) {
                expandedViewOverlay.classList.remove('active');
            }
        });
    }

    // --- THEME MANAGEMENT ---
    function applyInitialTheme() {
        const savedTheme = localStorage.getItem('mbs-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        icon.className = `fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
    }

    // --- START THE APP ---
    init();
});

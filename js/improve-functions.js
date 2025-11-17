
document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & DOM ELEMENTS ---
    let mbsData = null; // Stores parsed data from 'mbsData'
    let mbsClassement = null; // Stores parsed data from 'mbsClassementCache'
    let charts = {}; // Cache for Chart.js instances
    let activeEtape = 'generale';

    const widgetGrid = document.getElementById('widget-grid');
    const tabs = document.querySelectorAll('.tab-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const expandedViewOverlay = document.getElementById('expanded-view-overlay');
    const expandedViewGrid = document.getElementById('expanded-view-grid');

    // --- INITIALIZATION ---
    function init() {
        loadDataFromStorage();
        setupEventListeners();

        // Initial render
        if (mbsData) {
            renderWidgets(activeEtape);
        } else {
            widgetGrid.innerHTML = `<p style="text-align: center; color: var(--text-secondary-color);">
                                      Aucune donnée trouvée. Veuillez importer vos données depuis la page principale.
                                   </p>`;
        }

        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.querySelector('i').className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    /**
     * [FIX #1 & #4] Load ALL necessary data from localStorage.
     * This function is central to ensuring fresh data is always available.
     */
    function loadDataFromStorage() {
        try {
            mbsData = JSON.parse(localStorage.getItem('mbsData'));
            mbsClassement = JSON.parse(localStorage.getItem('mbsClassementCache'));
        } catch (error) {
            console.error("Error parsing data from localStorage:", error);
            mbsData = null;
            mbsClassement = null;
        }
    }

    function setupEventListeners() {
        // Tab click event for Étape switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // [FIX #1] Crucial: Reload data and re-render on tab change for reactivity
                activeEtape = tab.dataset.etape;
                loadDataFromStorage(); 
                renderWidgets(activeEtape);
            });
        });

        // Theme toggle
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.querySelector('i').className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            
            // Re-render to apply theme changes to charts
            renderWidgets(activeEtape); 
        });

        // Close expanded view
        expandedViewOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'expanded-view-overlay') {
                expandedViewOverlay.classList.remove('active');
            }
        });
    }

    /**
     * [FIX #1] Main function to render all subject widgets for a given 'etape'.
     * It clears the grid and rebuilds it with fresh data.
     */
    function renderWidgets(etape) {
        // Clear old charts
        Object.values(charts).forEach(chart => chart.destroy());
        charts = {};
        
        widgetGrid.innerHTML = '';
        
        if (!mbsData || !mbsData.courses) {
            widgetGrid.innerHTML = "<p style='text-align: center; color: var(--text-secondary-color);'>Données de cours non disponibles.</p>";
            return;
        }

        mbsData.courses.forEach(course => {
            const average = getAverageForEtape(course, etape);
            if (average === null) return;

            const widget = document.createElement('div');
            widget.className = 'subject-widget';
            widget.dataset.courseId = course.id;
            widget.dataset.courseName = course.name; // For expanded view lookup

            const trend = calculateTrend(course);
            
            widget.innerHTML = `
                <div class="widget-top-section">
                    <div class="widget-info">
                        <h3 class="widget-title">${course.name}</h3>
                        <p class="widget-average">${average.toFixed(1)}%</p>
                        <div class="widget-trend ${trend.class}">
                            <i class="fa-solid ${trend.icon}"></i>
                            <span>${trend.text}</span>
                        </div>
                    </div>
                    <div class="gauge-container">
                        <canvas id="gauge-${course.id}-${etape}"></canvas>
                    </div>
                </div>
                <div class="histogram-container">
                    <canvas id="hist-${course.id}-${etape}"></canvas>
                </div>
            `;

            widgetGrid.appendChild(widget);

            // Create charts
            createGaugeChart(`gauge-${course.id}-${etape}`, average);
            createHistogram(`hist-${course.id}-${etape}`, course.assignments.filter(a => a.etape === etape || etape === 'generale'));
            
            // Add click listener to open expanded view
            widget.querySelector('.widget-top-section').addEventListener('click', () => {
                showExpandedView(course, etape);
            });
        });
    }

    // --- EXPANDED VIEW LOGIC (Incorporating Fix #4) ---

    function showExpandedView(course, etape) {
        expandedViewGrid.innerHTML = '';
        expandedViewOverlay.classList.add('active');

        // Center Widget: Details, Competencies, and Calculator
        expandedViewGrid.appendChild(createExpandedCenterWidget(course, etape));
        
        // Left Widget: Main Info and Chart
        expandedViewGrid.appendChild(createExpandedLeftWidget(course, etape));

        // Right Widget: Classement (Leaderboard)
        expandedViewGrid.appendChild(createExpandedRightWidget(course, etape));
    }
    
    function createExpandedLeftWidget(course, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        widget.style.gridColumn = '1';
        widget.style.gridRow = '1';
        const average = getAverageForEtape(course, etape);
        const trend = calculateTrend(course);
        
        widget.innerHTML = `
            <div class="widget-top-section" style="cursor: default;">
                <div class="widget-info">
                    <h3 class="widget-title">${course.name} (${etape.toUpperCase().replace('E', 'É')})</h3>
                    <p class="widget-average">${average.toFixed(1)}%</p>
                    <div class="widget-trend ${trend.class}">
                        <i class="fa-solid ${trend.icon}"></i>
                        <span>${trend.text}</span>
                    </div>
                </div>
                <div class="gauge-container">
                    <canvas id="expanded-gauge-${course.id}"></canvas>
                </div>
            </div>
            <div class="histogram-container" style="height: 200px; margin-top: 25px;">
                <canvas id="expanded-hist-${course.id}"></canvas>
            </div>
        `;
        
        setTimeout(() => {
            createGaugeChart(`expanded-gauge-${course.id}`, average);
            createHistogram(`expanded-hist-${course.id}`, course.assignments.filter(a => a.etape === etape || etape === 'generale'));
        }, 0); 
        
        return widget;
    }

    function createExpandedCenterWidget(course, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        widget.style.gridColumn = '2';
        widget.style.gridRow = '1';

        // Placeholder for details content
        widget.innerHTML = `
            <h3 class="widget-title">Détails et Amélioration</h3>
            <div class="details-widget-body">
                <p><strong>Compétences:</strong></p>
                <div class="competency-widgets">
                    <!-- Competency widgets logic would go here -->
                    <div class="comp-widget">C1<br>85%</div>
                    <div class="comp-widget active">C2<br>72%</div>
                    <div class="comp-widget">C3<br>90%</div>
                </div>
                
                <h4>Calculateur d'objectif de note</h4>
                <div class="calculator-container">
                    <p>Si vous voulez atteindre <strong>90%</strong> globalement:</p>
                    <div class="goal-input">
                        <span>Note actuelle: ${getAverageForEtape(course, etape).toFixed(1)}%</span>
                        <label>Objectif:</label>
                        <input type="number" id="goal-target" value="90" min="50" max="100">
                        <label>% Restant:</label>
                        <input type="number" id="goal-weight" value="30" min="1" max="100">
                        <button class="btn-save" id="calculate-goal">Calculer</button>
                    </div>
                    <div id="goal-result" class="goal-result warning">Note requise: 95%</div>
                </div>
                
                <h4 style="margin-top: 25px;">Plan d'Action</h4>
                <p>Consultez l'Assistant MBS pour obtenir des stratégies personnalisées basées sur cette matière.</p>
                
                <!-- Assignment grades list (Fix #1: Data is fresh as it comes from reloaded mbsData) -->
                <h4 style="margin-top: 25px;">Notes des Devoirs (${etape.toUpperCase().replace('E', 'É')})</h4>
                <ul id="assignment-list" style="list-style: none; padding: 0;">
                    ${course.assignments
                        .filter(a => a.etape === etape || etape === 'generale')
                        .map(a => `
                            <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                                <span>${a.name}</span>
                                <span class="grade-pill">${a.grade}%</span>
                            </li>
                        `).join('')}
                </ul>

            </div>
        `;
        
        // Placeholder calculation logic (must be re-attached every time the widget is created)
        setTimeout(() => {
            const calculateGoal = () => {
                const currentAverage = getAverageForEtape(course, etape);
                const targetGrade = parseFloat(document.getElementById('goal-target').value);
                const remainingWeight = parseFloat(document.getElementById('goal-weight').value) / 100;
                
                if (isNaN(targetGrade) || isNaN(remainingWeight) || remainingWeight <= 0 || remainingWeight > 1) {
                    document.getElementById('goal-result').textContent = "Veuillez entrer des valeurs valides.";
                    document.getElementById('goal-result').className = "goal-result danger";
                    return;
                }

                const currentWeight = 1 - remainingWeight;
                // Target = (Current * Current_W) + (Required * Remaining_W)
                // Required = (Target - (Current * Current_W)) / Remaining_W
                const requiredGrade = (targetGrade - (currentAverage * currentWeight)) / remainingWeight;

                const resultDiv = document.getElementById('goal-result');
                resultDiv.textContent = `Note requise: ${requiredGrade.toFixed(1)}%`;
                
                if (requiredGrade > 100) {
                    resultDiv.className = "goal-result danger";
                    resultDiv.textContent += " (Impossible d'atteindre l'objectif)";
                } else if (requiredGrade > 90) {
                    resultDiv.className = "goal-result warning";
                } else {
                    resultDiv.className = "goal-result success";
                }
            };

            document.getElementById('calculate-goal')?.addEventListener('click', calculateGoal);
        }, 0);

        return widget;
    }

    /**
     * [FIX #4] Creates the leaderboard widget using the pre-calculated averages.
     */
    function createExpandedRightWidget(course, etape) {
        const widget = document.createElement('div');
        widget.className = 'subject-widget';
        widget.style.gridColumn = '3';
        widget.style.gridRow = '1';
        
        const courseClassement = mbsClassement ? mbsClassement.find(c => c.courseName === course.name) : null;
        const user = mbsData?.user;
        const userAverage = getAverageForEtape(course, etape);

        if (!courseClassement || !user) {
            widget.innerHTML = `<h3 class="widget-title">Classement du Groupe</h3><p>Classement non disponible.</p>`;
            return widget;
        }

        // Filter ranks for the current etape average
        const filteredRanks = courseClassement.ranks.map(rank => {
            // [FIX #4] Retrieve the correct étape average from the rank data
            const etapeAverage = rank[etape + 'Average'] !== undefined ? rank[etape + 'Average'] : rank.average;
            return {
                ...rank,
                average: etapeAverage,
                rank: rank[etape + 'Rank'] !== undefined ? rank[etape + 'Rank'] : rank.rank // Use specific rank if available
            };
        }).filter(r => r.average !== null).sort((a, b) => b.average - a.average); // Sort by the selected average

        // Find the user's position in the newly sorted list for the current etape
        const userRankData = filteredRanks.find(r => r.name === `${user.firstName} ${user.lastName}`) || { rank: 'N/A', average: userAverage };

        let leaderboardHtml = '<ul class="leaderboard-list">';
        filteredRanks.forEach(rank => {
            const isUser = rank.name === `${user.firstName} ${user.lastName}`;
            leaderboardHtml += `
                <li class="leaderboard-item ${isUser ? 'is-user' : ''}">
                    <span class="item-rank">${rank.rank}.</span>
                    <span class="item-name">${isUser ? 'Vous' : rank.name}</span>
                    <span class="item-grade">${rank.average.toFixed(1)}%</span>
                </li>`;
        });
        leaderboardHtml += '</ul>';

        let userRankHtml = userRankData.rank !== 'N/A'
            ? `<p class="widget-rank">Votre Rang : <strong>${userRankData.rank}/${filteredRanks.length}</strong> avec <strong>${userAverage.toFixed(1)}%</strong></p>`
            : `<p class="widget-rank">Votre classement pour cette étape n'est pas disponible.</p>`;

        widget.innerHTML = `
            <h3 class="widget-title">Classement du Groupe (${etape.toUpperCase().replace('E', 'É')})</h3>
            ${userRankHtml}
            <div class="mini-leaderboard-container">${leaderboardHtml}</div>
        `;
        
        return widget;
    }


    // --- UTILITY & HELPER FUNCTIONS ---

    function getAverageForEtape(course, etape) {
        // [FIX #4] Returns the pre-calculated average stored in the course object.
        switch (etape) {
            case 'generale': return course.average !== undefined ? course.average : null;
            case 'etape1': return course.etape1Average !== undefined ? course.etape1Average : null;
            case 'etape2': return course.etape2Average !== undefined ? course.etape2Average : null;
            case 'etape3': return course.etape3Average !== undefined ? course.etape3Average : null;
            default: return null;
        }
    }

    function calculateTrend(course) {
        // Simple trend calculation: compare last two assignments in overall list
        const assignments = course.assignments.sort((a, b) => a.id - b.id);
        if (assignments.length < 2) {
            return { class: 'neutral', icon: 'fa-minus', text: 'Données insuffisantes' };
        }
        const lastTwo = assignments.slice(-2);
        const diff = lastTwo[1].grade - lastTwo[0].grade;
        if (diff > 2) return { class: 'up', icon: 'fa-arrow-trend-up', text: 'En hausse' };
        if (diff < -2) return { class: 'down', icon: 'fa-arrow-trend-down', text: 'En baisse' };
        return { class: 'neutral', icon: 'fa-minus', text: 'Stable' };
    }

    // --- CHART CREATION ---

    function createGaugeChart(canvasId, value) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [value, 100 - value],
                    backgroundColor: [value > 85 ? '#27ae60' : value > 70 ? '#f39c12' : '#e74c3c', isDarkMode ? '#333' : '#e0e6eb'],
                    borderColor: 'transparent',
                    circumference: 180,
                    rotation: 270,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: { tooltip: { enabled: false }, legend: { display: false } },
            }
        });
    }

    function createHistogram(canvasId, assignments) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: assignments.map((a, i) => `${a.name.substring(0, 10)}...`),
                datasets: [{
                    label: 'Résultats',
                    data: assignments.map(a => a.grade),
                    backgroundColor: '#3498db',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true, max: 100,
                        grid: { color: gridColor },
                        ticks: { color: isDarkMode ? '#a0a0a0' : '#34495e' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: isDarkMode ? '#a0a0a0' : '#34495e', autoSkip: false, maxRotation: 45, minRotation: 45 }
                    }
                }
            }
        });
    }


    // --- START THE APP ---
    init();
});

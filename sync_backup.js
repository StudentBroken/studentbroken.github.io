/**
 * js/auto-sync.js - Visual Feedback Version
 * Displays a status box on screen since console is inaccessible.
 */

(function () {
    // --- CONFIGURATION ---
    // --- CONFIGURATION ---
    // Matches ranking.html URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1CoMUIieKjENe1jE-5It-pIEi7qiU2Mv6ian-3yDNs6uz383wlQYmCdDNXXHAgLjpGw/exec';
    const TERM_WEIGHTS = { etape1: 0.20, etape2: 0.20, etape3: 0.60 };

    // --- VISUAL FEEDBACK HELPER ---
    function showStatus(message, color = '#333') {
        let statusBox = document.getElementById('sync-status-box');
        // UI creation code commented out as per user request
        /*
        if (!statusBox) {
            statusBox = document.createElement('div');
            statusBox.id = 'sync-status-box';
            statusBox.style.cssText = `
                position: fixed; bottom: 10px; right: 10px;
                background: ${color}; color: white; padding: 10px 15px;
                border-radius: 5px; font-family: sans-serif; font-size: 12px;
                z-index: 9999; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(statusBox);
        }
        */
        // If statusBox is not created (because the above code is commented out),
        // then the following lines will cause an error.
        // To prevent this, we can add a check or simply return if no statusBox exists.
        // For now, assuming the user wants to disable the visual feedback entirely,
        // we can make this function a no-op if statusBox isn't found.
        if (!statusBox) {
            console.log(`Sync Status: ${message} (Color: ${color})`);
            return;
        }

        statusBox.style.background = color;
        statusBox.innerText = message;

        // Hide success messages after 5 seconds
        if (color === '#27ae60') {
            setTimeout(() => { statusBox.remove(); }, 5000);
        }
    }

    // --- MAIN SYNC LOGIC ---
    function initSync() {

        // CHECK 0: Check if sync is needed (Smart Sync)
        const needsSync = localStorage.getItem('mbs_needs_sync');
        if (needsSync !== 'true') {
            console.log("Auto-Sync: No new data to sync. Skipping.");
            return;
        }

        // showStatus("Sync: Initialisation...", "#f39c12"); // Orange (Working)

        try {
            const rawData = localStorage.getItem('mbsData');

            // CHECK 1: LocalStorage Data
            if (!rawData) {
                showStatus("Erreur Sync: Aucune donnée locale (mbsData)", "#c0392b");
                return;
            }

            const mbsData = JSON.parse(rawData);

            // CHECK 2: Name and Level
            if (!mbsData.nom) {
                showStatus("Erreur Sync: Nom manquant. Allez dans 'Mise à jour'.", "#c0392b");
                return;
            }
            if (!mbsData.settings || !mbsData.settings.niveau) {
                showStatus("Erreur Sync: Niveau (Sec 4/5) non sélectionné.", "#c0392b");
                return;
            }

            // CHECK 3: Calculation
            showStatus("Sync: Calcul des moyennes...", "#2980b9"); // Blue
            const calculatedData = calculateAveragesFromRawData(mbsData);

            // CHECK 4: Preparation
            const encodedName = btoa(unescape(encodeURIComponent(mbsData.nom)));
            const formData = new FormData();

            formData.append('encodedName', encodedName);
            formData.append('secondaryLevel', mbsData.settings.niveau);

            for (const key in calculatedData.term) {
                const val = calculatedData.term[key];
                formData.append(key, val !== null ? val.toFixed(2) : '');
            }

            for (const key in calculatedData.subjects) {
                const val = calculatedData.subjects[key];
                formData.append(key, val !== null ? val.toFixed(2) : '');
            }

            // CHECK 5: Sending
            showStatus("Sync: Envoi vers Google Sheets...", "#8e44ad"); // Purple

            fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            }).then(() => {
                showStatus("Sync: Données envoyées avec succès !", "#27ae60"); // Green

                // --- SUCCESS: Reset the flag ---
                localStorage.setItem('mbs_needs_sync', 'false');
                console.log("Auto-Sync: Success. Flag reset to FALSE.");

            }).catch(err => {
                showStatus("Erreur Réseau: " + err.message, "#c0392b");
                // Do NOT reset flag on error, so it tries again next time.
            });

        } catch (e) {
            showStatus("Erreur Script: " + e.message, "#c0392b");
        }
    }

    // --- CALCULATION HELPERS (Exact copy needed for standalone file) ---
    const getNumericGrade = (result) => {
        if (!result) return null;
        const gradeMap = { 'A+': 100, 'A': 95, 'A-': 90, 'B+': 85, 'B': 80, 'B-': 75, 'C+': 70, 'C': 65, 'C-': 60, 'D+': 55, 'D': 50, 'E': 45 };
        const trimmed = result.trim();
        if (gradeMap[trimmed]) return gradeMap[trimmed];
        const scoreMatch = trimmed.match(/(\d+[,.]?\d*)\s*\/\s*(\d+[,.]?\d*)/);
        if (scoreMatch) {
            const score = parseFloat(scoreMatch[1].replace(',', '.'));
            const max = parseFloat(scoreMatch[2].replace(',', '.'));
            return (max > 0) ? (score / max) * 100 : null;
        }
        return null;
    };

    const calculateAverage = (assignments) => {
        let totalWeightedGrade = 0, totalWeight = 0;
        (assignments || []).forEach(assign => {
            const grade = getNumericGrade(assign.result);
            const weight = parseFloat(assign.pond);
            if (grade !== null && !isNaN(weight) && weight > 0) {
                totalWeightedGrade += grade * weight;
                totalWeight += weight;
            }
        });
        return totalWeight > 0 ? { average: totalWeightedGrade / totalWeight, weight: totalWeight } : null;
    };

    const calculateSubjectAverage = (subject) => {
        let totalWeightedCompetencyScore = 0, totalCompetencyWeight = 0;
        (subject?.competencies || []).forEach(comp => {
            const compWeightMatch = comp.name.match(/\((\d+)%\)/);
            if (!compWeightMatch) return;
            const competencyWeight = parseFloat(compWeightMatch[1]);
            const compResult = calculateAverage(comp.assignments);
            if (compResult) {
                totalWeightedCompetencyScore += compResult.average * competencyWeight;
                totalCompetencyWeight += competencyWeight;
            }
        });
        return totalCompetencyWeight > 0 ? totalWeightedCompetencyScore / totalCompetencyWeight : null;
    };

    const calculateAveragesFromRawData = (data) => {
        let termAverages = { GlobalAverage: null, Etape1Average: null, Etape2Average: null, Etape3Average: null };
        let allSubjectAverages = {};

        ['etape1', 'etape2', 'etape3'].forEach(etape => {
            let termSubjectAvgs = [];
            (data[etape] || []).forEach(subject => {
                const subjectAverage = calculateSubjectAverage(subject);
                if (subjectAverage !== null) {
                    termSubjectAvgs.push(subjectAverage);
                    const code = subject.code.substring(0, 3);
                    if (!allSubjectAverages[code]) allSubjectAverages[code] = { total: 0, count: 0 };
                    allSubjectAverages[code].total += subjectAverage;
                    allSubjectAverages[code].count++;
                }
            });
            if (termSubjectAvgs.length > 0) {
                const etapeKey = 'Etape' + etape.slice(-1) + 'Average';
                termAverages[etapeKey] = termSubjectAvgs.reduce((a, b) => a + b, 0) / termSubjectAvgs.length;
            }
        });

        const finalSubjectAvgs = {};
        for (const code in allSubjectAverages) {
            finalSubjectAvgs[code] = allSubjectAverages[code].total / allSubjectAverages[code].count;
        }

        let globalTotal = 0, globalWeight = 0;
        if (termAverages.Etape1Average !== null) { globalTotal += termAverages.Etape1Average * TERM_WEIGHTS.etape1; globalWeight += TERM_WEIGHTS.etape1 };
        if (termAverages.Etape2Average !== null) { globalTotal += termAverages.Etape2Average * TERM_WEIGHTS.etape2; globalWeight += TERM_WEIGHTS.etape2 };
        if (termAverages.Etape3Average !== null) { globalTotal += termAverages.Etape3Average * TERM_WEIGHTS.etape3; globalWeight += TERM_WEIGHTS.etape3 };

        if (globalWeight > 0) termAverages.GlobalAverage = globalTotal / globalWeight;

        return { term: termAverages, subjects: finalSubjectAvgs };
    };

    // --- TRIGGER ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initSync, 1000));
    } else {
        setTimeout(initSync, 1000);
    }
})();

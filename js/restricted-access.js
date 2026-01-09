/**
 * restricted-access.js
 * 
 * This script checks if the current user is on a "Restricted List".
 * If they are, they are immediately redirected to the main dashboard
 * and denied access to advanced features (Projection, Ranking, Improve).
 */

(function () {
    // --- CONFIGURATION ---
    // HARDCODED BLACKLIST of names (Case insensitive)
    const RESTRICTED_USERS = [
        "Mia He",
        "Mathilde Turcotte",
        "Félicia Beauregard",
        "Emma Boissinot",
        "Amilia Bonneau",
        "Maxence Caria-Durocher",
        "Thomas Caron",
        "Ambre Chane Waye",
        "Donovan Charles",
        "Mathis Coallier",
        "Alexandre D'Aoust",
        "Laurier Dubuc",
        "Adam Gauvin",
        "Philippe Grimard",
        "Julien Hovington",
        "Katerina Kartsonakis",
        "Samuel Labateya",
        "Loïk Lacasse",
        "Alexandre Laurin",
        "Edouard Morin",
        "Maxime Sahakian",
        "Charles-Xavier Toussaint",
        "Roy Zorayan",
        "Ramy Hadjout",
        "Jonathan Lamothe"
    ];
    // ---------------------

    try {
        const mbsDataString = localStorage.getItem('mbsData');
        if (!mbsDataString) return; // No data, no identity, cannot block.

        const mbsData = JSON.parse(mbsDataString);
        if (!mbsData.nom) return;

        // Helper to normalize strings: lowercase + remove spaces, underscores, AND hyphens
        const normalize = (str) => str.toLowerCase().replace(/[-\s_]+/g, '');

        const userName = normalize(mbsData.nom);

        // Check if user is in the restricted list
        const isRestricted = RESTRICTED_USERS.some(blockedName =>
            normalize(blockedName) === userName
        );

        if (isRestricted) {
            console.warn(`Access Denied for user: ${mbsData.nom}`);
            // Redirect to main.html with an error flag
            // Use replace() so they can't hit "Back" to return here
            window.location.replace("main.html?error=restricted");
        }

    } catch (e) {
        console.error("Error in restriction check:", e);
    }
})();

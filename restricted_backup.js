/**
 * restricted-access.js
 * 
 * HYBRID RESTRICTION SYSTEM
 * 1. Hardcoded List (Immediate Fallback)
 * 2. Remote List (Google Sheets API)
 * 3. Persistent Lockout (localStorage 'permblacklist')
 */

(async function () {
    // --- CONFIGURATION ---
    const REMOTE_BLACKLIST_URL = 'https://script.google.com/macros/s/AKfycbyNhGaZvsiar-kHmk8Hg0wFpPYo42KJCZ25SspufcS8IeroeyNUs_fQfJviqL7AQQBShA/exec';

    // HARDCODED BLACKLIST
    const LOCAL_RESTRICTED_USERS = [
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

    function triggerGlitchMode() {
        // Prevent multiple triggers
        if (document.getElementById('brainrot-bg')) return;

        // 1. Inject CSS for Blackout
        const style = document.createElement('style');
        style.innerHTML = `
            body, html { 
                margin: 0 !important; padding: 0 !important; 
                width: 100% !important; height: 100% !important;
                overflow: hidden !important; background-color: black !important;
            }
            #brainrot-bg {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                object-fit: fill !important; z-index: 2147483647; pointer-events: none;
            }
            #brainrot-caption {
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                color: red !important; font-family: Impact, 'Arial Black', sans-serif !important;
                font-size: 5vw !important; text-align: center !important;
                text-transform: uppercase !important; font-weight: bold !important;
                z-index: 2147483647; width: 100%;
                text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
            }
            body > *:not(#brainrot-bg):not(#brainrot-caption):not(style) { display: none !important; }
        `;
        document.head.appendChild(style);

        // 2. Inject Image and Text
        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";

        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = " "; // Empty caption as requested

        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    function lockPermBlacklist() {
        localStorage.setItem('permblacklist', 'true');
        Object.defineProperty(localStorage, 'permblacklist', {
            value: 'true', writable: false, configurable: false
        });
    }

    // Helper: Normalize String (Ignore case, spaces, underscores, hyphens)
    const normalize = (str) => str ? str.toLowerCase().replace(/[-\s_]+/g, '') : '';

    // --- MAIN LOGIC ---
    try {
        // 1. IMMEDIATE VISUAL BLOCK: Check if previously banned
        // We trigger the visual glitch immediately to prevent usage, 
        // BUT we do not lock the storage yet, in case we need to unban.
        if (localStorage.getItem('permblacklist') === 'true') {
            triggerGlitchMode();
        }

        // 2. Get User Identity
        const mbsDataString = localStorage.getItem('mbsData');
        if (!mbsDataString) return;

        const mbsData = JSON.parse(mbsDataString);
        if (!mbsData.nom) return;

        const userName = normalize(mbsData.nom);

        // 3. Fetch Remote List
        let remoteList = [];
        try {
            const response = await fetch(REMOTE_BLACKLIST_URL);
            if (response.ok) {
                remoteList = await response.json();
                if (!Array.isArray(remoteList)) remoteList = [];
            }
        } catch (err) {
            console.warn("Could not fetch remote blacklist, relying on local list.");
        }

        // 4. Combine and Check
        const isLocallyBanned = LOCAL_RESTRICTED_USERS.some(u => normalize(u) === userName);
        const isRemotelyBanned = remoteList.some(u => normalize(u) === userName);

        if (isLocallyBanned || isRemotelyBanned) {
            // CONFIRMED BAN
            console.warn(`User ${mbsData.nom} is restricted.`);
            // Now we lock it for this session to prevent tampering
            lockPermBlacklist();
            triggerGlitchMode();
        } else {
            // NOT BANNED (or No Longer Banned)
            if (localStorage.getItem('permblacklist') === 'true') {
                console.log(`User ${mbsData.nom} is no longer restricted. Unbanning...`);
                localStorage.removeItem('permblacklist');
                // Optional: Reload to clear the glitch visuals if they started
                if (document.getElementById('brainrot-bg')) {
                    window.location.reload();
                }
            }
        }

    } catch (e) {
        console.error("Restriction check error:", e);
    }
})();


(async function() {
    // --- PASTE YOUR NEW DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbwWiUCkwO8pPyafHbOs_f5uf6dMmtl6jMszdZSdvAV7CPx_zHb-BDD0r1x-xbPsfVNaRQ/exec'; 
    // ----------------------------------------

    const KEYS = {
        PERM_BAN: 'blacklist_perm_ban',
        TRUSTED: 'blacklist_trusted_user',
        FAILURES: 'blacklist_fail_count'
    };
    
    const MAX_ATTEMPTS = 5;

    // --- LOGGING HELPER ---
    function log(msg) {
        console.log(`%c[Blacklist System] ${msg}`, 'color: cyan; font-weight: bold;');
    }

    // --- VISUAL EFFECTS ---
    function nukeWebsite() {
        if (document.getElementById('brainrot-style')) return;
        const style = document.createElement('style');
        style.id = 'brainrot-style';
        style.innerHTML = `
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: black; }
            #brainrot-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: fill; z-index: 999999; pointer-events: none; }
            #brainrot-caption { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: red; font-family: Impact, sans-serif; font-size: 5vw; z-index: 1000000; text-align: center; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
            body > *:not(#brainrot-bg):not(#brainrot-caption):not(#brainrot-style) { display: none !important; }
        `;
        document.head.appendChild(style);
        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        img.src = "https://media.tenor.com/p_PSprNhLkkAAAAj/monkey-tongue-out.gif";
        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = "Nuh uh - Verification Required";
        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    function triggerPermBan() {
        log("Triggering Permanent Ban");
        localStorage.clear();
        localStorage.setItem(KEYS.PERM_BAN, 'true');
        document.body.innerHTML = ''; 
        const style = document.createElement('style');
        style.innerHTML = `body, html { margin:0; padding:0; background: black; height: 100%; overflow: hidden; }`;
        document.head.appendChild(style);
        const img = document.createElement('img');
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        img.style.width = "100vw";
        img.style.height = "100vh";
        img.style.objectFit = "cover";
        document.body.appendChild(img);
    }

    function restoreWebsite() {
        log("Access Granted. Restoring website.");
        const bg = document.getElementById('brainrot-bg');
        const cap = document.getElementById('brainrot-caption');
        const style = document.getElementById('brainrot-style');
        if (bg) bg.remove();
        if (cap) cap.remove();
        if (style) style.remove();
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // --- MAIN LOGIC ---
    async function checkSecurity() {
        log("Initializing check...");

        // 1. Perm Ban Check
        if (localStorage.getItem(KEYS.PERM_BAN) === 'true') {
            triggerPermBan();
            return;
        }

        // 2. Identify User
        let userName = null;
        try {
            const mbs = JSON.parse(localStorage.getItem('mbsData'));
            if (mbs && mbs.nom) userName = mbs.nom.trim().toLowerCase();
        } catch (e) {}

        if (!userName) {
            try {
                const jdlm = JSON.parse(localStorage.getItem('jdlmData'));
                if (jdlm && jdlm.nom) userName = jdlm.nom.trim().toLowerCase();
            } catch (e) {}
        }

        if (!userName) {
            log("No user name found in Local Storage (mbsData/jdlmData). Exiting script.");
            // If you want the script to RUN even for unknown users, remove the return below.
            return; 
        }

        log(`Identified user: ${userName}`);

        // 3. Check Local Trust
        if (localStorage.getItem(KEYS.TRUSTED) === 'true') {
            log("User is already trusted locally. Skipping backend check.");
            return; 
        }

        // 4. Fetch Data from Backend
        log("Fetching blacklist data from Google Sheets...");
        let data;
        try {
            // Using standard GET
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            data = await res.json();
            log("Data received successfully.");
        } catch (e) {
            console.error("[Blacklist System] Fetch failed:", e);
            alert("Security System Error: Could not connect to database. Please check console.");
            return;
        }

        const { trusted, secondary, nono, password } = data;

        // 5. Check White Lists
        if (trusted.includes(userName) || secondary.includes(userName)) {
            log("User found in Trusted lists. Storing local trust.");
            localStorage.setItem(KEYS.TRUSTED, 'true');
            return;
        }

        // 6. User NOT Trusted - NUKE
        log("User not trusted. Nuking website.");
        nukeWebsite();

        // 7. Check "No No" List logic
        let currentFailures = parseInt(localStorage.getItem(KEYS.FAILURES) || '0');
        if (currentFailures >= MAX_ATTEMPTS) {
            triggerPermBan();
            return;
        }

        // 8. Password Prompt
        let success = false;
        await new Promise(r => setTimeout(r, 200)); // Wait for GIF to render

        while (currentFailures < MAX_ATTEMPTS) {
            const attempt = prompt(`Security Check.\nUser: ${userName}\nEnter Password to verify identity.\nAttempts remaining: ${MAX_ATTEMPTS - currentFailures}`);
            
            // Allow user to cancel, but it counts as a failure (or you can just re-prompt)
            if (attempt === null) {
                // If they click cancel, we just loop again or count failure. 
                // Let's count failure to prevent infinite loop annoyance.
                // currentFailures++; 
                // continue;
                // Actually, if they cancel, just sit on the nuke screen?
                // For now, treat as wrong password:
            }

            if (attempt === password) {
                success = true;
                break;
            } else {
                currentFailures++;
                localStorage.setItem(KEYS.FAILURES, currentFailures);
                if (currentFailures >= MAX_ATTEMPTS) {
                    triggerPermBan();
                    return;
                }
                alert("Incorrect Password.");
            }
        }

        // 9. Success Logic
        if (success) {
            log("Password correct. Restoring and updating backend.");
            restoreWebsite();
            localStorage.setItem(KEYS.TRUSTED, 'true');
            localStorage.removeItem(KEYS.FAILURES);

            // SEND TO BACKEND (The fix for POST)
            try {
                log("Sending 'add_secondary' request to backend...");
                await fetch(API_URL, {
                    method: 'POST',
                    redirect: "follow", // Important for GAS
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8', // Bypass preflight
                    },
                    body: JSON.stringify({
                        action: 'add_secondary',
                        name: userName
                    })
                });
                log("Backend update sent.");
            } catch (e) {
                console.error("Failed to update backend (user is still locally trusted though):", e);
            }
        }
    }

    // Run
    checkSecurity();

})();

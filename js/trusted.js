--- START OF FILE blacklist.js ---

(async function() {
    // --- PASTE YOUR NEW DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbx1zib3LDFjnBZzcOkxHRpXk_8nPD2ZeSGaL7jWtb71Xcfjl_N_GyOCg_NCP3y3p8KC6g/exec'; 
    // ----------------------------------------

    const KEYS = {
        PERM_BAN: 'blacklist_perm_ban',
        TRUSTED: 'blacklist_trusted_user', // Local override if they passed previously
        FAILURES: 'blacklist_fail_count'
    };
    
    const MAX_ATTEMPTS = 5;

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
        localStorage.clear();
        localStorage.setItem(KEYS.PERM_BAN, 'true');
        
        document.body.innerHTML = ''; // Clear DOM
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
        const bg = document.getElementById('brainrot-bg');
        const cap = document.getElementById('brainrot-caption');
        const style = document.getElementById('brainrot-style');
        if (bg) bg.remove();
        if (cap) cap.remove();
        if (style) style.remove();
        
        // Restore visibility
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // --- LOGIC ---

    async function checkSecurity() {
        // 1. Immediate Perm Ban Check
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

        // If no name found, we assume they are a guest (or not logged in) and do nothing?
        // OR if you want to lock out unknown users, uncomment the else block.
        if (!userName) return; 

        // 3. Check Local "Trusted" Status (Optimization to skip fetch)
        if (localStorage.getItem(KEYS.TRUSTED) === 'true') {
            return; // Proceed normally
        }

        // 4. Fetch Data from Backend
        let data;
        try {
            const res = await fetch(API_URL);
            data = await res.json();
        } catch (e) {
            console.error("Security fetch failed", e);
            return; // Fail safe?
        }

        const { trusted, secondary, nono, password } = data;

        // 5. Check White Lists (Column A & B)
        if (trusted.includes(userName) || secondary.includes(userName)) {
            // Add local trusted flag for speed next time
            localStorage.setItem(KEYS.TRUSTED, 'true');
            return;
        }

        // 6. User is NOT Trusted - Nuke Logic
        nukeWebsite();

        // 7. Check "No No" List logic (Column C)
        // Even if they aren't on Col C, they aren't trusted, so they face the password wall.
        // But we track failures globally for this session.

        let currentFailures = parseInt(localStorage.getItem(KEYS.FAILURES) || '0');
        if (currentFailures >= MAX_ATTEMPTS) {
            triggerPermBan();
            return;
        }

        // Password Loop
        let success = false;
        
        // We delay slightly to ensure the Monkey GIF renders before the alert blocks thread
        await new Promise(r => setTimeout(r, 100));

        while (currentFailures < MAX_ATTEMPTS) {
            const attempt = prompt(`Security Check.\nUser: ${userName}\nEnter Password to verify identity.\nAttempts remaining: ${MAX_ATTEMPTS - currentFailures}`);
            
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

        // 8. Success Handling
        if (success) {
            // Restore Site
            restoreWebsite();
            
            // Mark as trusted locally
            localStorage.setItem(KEYS.TRUSTED, 'true');
            localStorage.removeItem(KEYS.FAILURES); // Reset failures

            // 9. Send to Backend (Column B) - "Secondary Trusted"
            try {
                // We use no-cors mode or text/plain to avoid CORS preflight issues with GAS
                await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify({
                        action: 'add_secondary',
                        name: userName
                    })
                });
                console.log("User added to secondary trusted list.");
            } catch (e) {
                console.error("Failed to update backend", e);
            }
        }
    }

    // Run
    checkSecurity();

})();

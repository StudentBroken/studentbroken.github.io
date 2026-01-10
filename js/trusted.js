--- START OF FILE blacklist.js ---

(async function() {
    // --- PASTE NEW DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbzbdDDE35laEjCj18frEtSaw0OP9bi6sQGU8HfABVnmbZ6CLWKQ3ixbTM00CmE26KQf5g/exec'; 
    // -----------------------------------

    const KEYS = {
        PERM_BAN: 'blacklist_browser_banned', // LocalStorage (Hard Ban)
        VIP_PASS: 'blacklist_vip_pass',       // LocalStorage (Row A - Perm)
        SESSION_PASS: 'blacklist_session_pass', // SessionStorage (Row B - Temp)
        FAILURES: 'blacklist_fail_count'      // LocalStorage (Track fails)
    };
    
    const MAX_ATTEMPTS = 5;

    // --- VISUALS ---
    function nukeWebsite() {
        if (document.getElementById('brainrot-style')) return;
        const style = document.createElement('style');
        style.id = 'brainrot-style';
        style.innerHTML = `
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: black !important; }
            #brainrot-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: fill; z-index: 2147483647; pointer-events: none; }
            #brainrot-caption { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: red; font-family: Impact, sans-serif; font-size: 5vw; z-index: 2147483647; text-align: center; text-transform: uppercase; text-shadow: 2px 2px 0 #000; }
            body > *:not(#brainrot-bg):not(#brainrot-caption):not(#brainrot-style) { display: none !important; }
        `;
        document.head.appendChild(style);
        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        img.src = "https://media.tenor.com/p_PSprNhLkkAAAAj/monkey-tongue-out.gif";
        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = "Nuh uh - Restricted Access";
        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    function triggerPermBan() {
        console.log("Applying Permanent Browser Ban");
        localStorage.clear(); // Wipe their data
        sessionStorage.clear(); 
        
        // This is the "Burn the Browser" flag. 
        // It stays even if they change their MBS/JDLM name.
        localStorage.setItem(KEYS.PERM_BAN, 'true');
        
        document.body.innerHTML = ''; 
        const style = document.createElement('style');
        style.innerHTML = `body, html { margin:0; padding:0; background: black; height: 100%; overflow: hidden; }`;
        document.head.appendChild(style);
        const img = document.createElement('img');
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        img.style.width = "100vw"; img.style.height = "100vh"; img.style.objectFit = "cover";
        document.body.appendChild(img);
    }

    function restoreWebsite() {
        const bg = document.getElementById('brainrot-bg');
        const cap = document.getElementById('brainrot-caption');
        const style = document.getElementById('brainrot-style');
        if (bg) bg.remove();
        if (cap) cap.remove();
        if (style) style.remove();
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    async function updateBackend(action, name) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: action, name: name })
            });
        } catch (e) { console.error("Sync Error:", e); }
    }

    // --- LOGIC ---
    async function runSecurity() {
        // 1. CHECK HARD BAN (Browser Level)
        // This happens before we even check their username.
        if (localStorage.getItem(KEYS.PERM_BAN) === 'true') {
            triggerPermBan();
            return;
        }

        // 2. CHECK ROW A VIP (Local Storage - Permanent)
        if (localStorage.getItem(KEYS.VIP_PASS) === 'true') {
            console.log("VIP (Row A) detected. Skipping checks.");
            return; 
        }

        // 3. CHECK ROW B SESSION (Session Storage - Temp)
        if (sessionStorage.getItem(KEYS.SESSION_PASS) === 'true') {
            console.log("Semi-Trusted (Row B) session active. Skipping checks.");
            return;
        }

        // 4. IDENTIFY USER
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
        
        if (!userName) return; // Unknown user (guest?) - or handle as you wish

        // 5. FETCH DATA (Only if not locally trusted)
        let data;
        try {
            const res = await fetch(API_URL);
            data = await res.json();
        } catch (e) {
            console.error("Connection failed");
            nukeWebsite(); // Fail Secure
            return;
        }

        const { vip, semiTrusted, banned, password } = data;

        // 6. CHECK ROW C (BAN)
        if (banned.includes(userName)) {
            triggerPermBan(); // Sets KEYS.PERM_BAN
            return;
        }

        // 7. CHECK ROW A (VIP)
        if (vip.includes(userName)) {
            console.log("User is VIP (Row A). Setting permanent pass.");
            localStorage.setItem(KEYS.VIP_PASS, 'true');
            return;
        }

        // 8. CHECK ROW B (SEMI-TRUSTED)
        if (semiTrusted.includes(userName)) {
            console.log("User is Semi-Trusted (Row B). Setting session pass.");
            // Only Session Storage!
            sessionStorage.setItem(KEYS.SESSION_PASS, 'true');
            return;
        }

        // 9. UNKNOWN USER -> CHALLENGE
        nukeWebsite();
        
        let currentFailures = parseInt(localStorage.getItem(KEYS.FAILURES) || '0');
        await new Promise(r => setTimeout(r, 200));

        while (currentFailures < MAX_ATTEMPTS) {
            const attempt = prompt(`Security Verification.\nUser: ${userName}\nEnter Password.\nAttempts: ${MAX_ATTEMPTS - currentFailures}`);

            if (attempt === password) {
                // SUCCESS
                restoreWebsite();
                localStorage.removeItem(KEYS.FAILURES);
                
                // Add to Row B (Sheet)
                updateBackend('trust', userName);
                
                // Grant Session Pass (Row B status)
                sessionStorage.setItem(KEYS.SESSION_PASS, 'true');
                return;
            } else {
                // FAILURE
                currentFailures++;
                localStorage.setItem(KEYS.FAILURES, currentFailures);
                
                if (currentFailures >= MAX_ATTEMPTS) {
                    // FAILED TOO MANY TIMES
                    // Add to Row C (Sheet)
                    updateBackend('ban', userName);
                    // Burn Browser (Local Storage)
                    triggerPermBan();
                    return;
                }
                alert("Incorrect Password.");
            }
        }
        
        // Loop exit (fails)
        updateBackend('ban', userName);
        triggerPermBan();
    }

    runSecurity();
})();

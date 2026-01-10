(async function() {
    // --- CONFIGURATION ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0nC6F3F5UHvLLGC1MxlB9RgfyHEGQ1wXCCc75FE3wBjBkLYZ7Ek3VLGJu2czidkpksQ/exec'; 
    // ---------------------

    // --- 0. INSTANT CHECKS ---
    
    function isDeviceBanned() {
        if (localStorage.getItem('perm_banned_user') === 'true') return true;
        if (sessionStorage.getItem('perm_banned_user') === 'true') return true;
        if (document.cookie.indexOf('perm_banned_user=true') > -1) {
            localStorage.setItem('perm_banned_user', 'true');
            return true;
        }
        return false;
    }

    // 1. VIP (Row A) -> STOP SCRIPT (Let site load normally)
    if (localStorage.getItem('vip_safe_user') === 'true') return;

    // 2. Trusted Session (Row B) -> STOP SCRIPT
    if (sessionStorage.getItem('temp_safe_user') === 'true') return;

    // 3. Banned? -> Continue (We will nuke below)
    const isBanned = isDeviceBanned();


    // --- 1. THE "WAITING" NUKE (Visual Hide) ---
    // This hides the site while we check. We can't delete it yet in case they are innocent.
    
    function applyLoadingScreen() {
        if (document.getElementById('security-overlay')) return;

        // 1. Inject Styles to HIDE everything else
        const style = document.createElement('style');
        style.id = 'security-style';
        style.innerHTML = `
            /* GLOBAL FREEZE */
            html, body { 
                margin: 0 !important; padding: 0 !important; 
                width: 100% !important; height: 100% !important; 
                overflow: hidden !important; 
                background: #ffffff !important; /* Professional White */
            }

            /* HIDE ACTUAL SITE CONTENT */
            /* This targets all direct children of body except our security tools */
            body > *:not(#security-overlay):not(#security-style) { 
                display: none !important; 
            }

            /* SECURITY OVERLAY CONTAINER */
            #security-overlay { 
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                z-index: 2147483647; 
                background-color: #ffffff; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                pointer-events: auto !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            /* CLEAN SPINNER */
            .clean-spinner {
                width: 40px; height: 40px;
                border: 3px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: #333; /* Dark Grey Professional */
                animation: spin 0.8s ease-in-out infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);

        // 2. Create the White Overlay
        const overlay = document.createElement('div');
        overlay.id = 'security-overlay';
        
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'clean-spinner';

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

    // --- 2. THE "TOTAL" NUKE (Destructive Delete) ---
    // Used when we confirm they are banned. Deletes the website HTML entirely.

    function triggerPermBan() {
        // 1. Set Flags
        localStorage.setItem('perm_banned_user', 'true');
        Object.defineProperty(localStorage, 'perm_banned_user', { value: 'true', writable: false });
        sessionStorage.setItem('perm_banned_user', 'true');
        const d = new Date(); d.setTime(d.getTime() + (365*24*60*60*1000));
        document.cookie = "perm_banned_user=true; expires=" + d.toUTCString() + "; path=/";

        // 2. DESTROY DOM (The Full Nuke)
        document.body.innerHTML = ''; 

        // 3. Re-inject strictly minimal Ban UI
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        document.body.style.display = "flex";
        document.body.style.alignItems = "center";
        document.body.style.justifyContent = "center";
        document.body.style.height = "100vh";
        document.body.style.margin = "0";

        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            </div>
            <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0 0 10px 0;">Access Restricted</h1>
            <p style="color: #666; font-size: 14px; max-width: 300px; margin: 0 auto;">Your access to this resource has been permanently revoked.</p>
        `;
        document.body.appendChild(container);
        
        throw new Error("Banned"); // Stop all JS execution
    }

    function restoreSite() {
        const overlay = document.getElementById('security-overlay');
        const style = document.getElementById('security-style');
        if (overlay) overlay.remove();
        if (style) style.remove();
        
        // Make body children visible again
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // --- 3. PASSWORD UI ---

    function promptPasswordCustom(correctPassword, startFails) {
        return new Promise((resolve, reject) => {
            const spinner = document.getElementById('loading-spinner');
            if(spinner) spinner.remove(); // Remove spinner to make room for card
            
            const overlay = document.getElementById('security-overlay');
            
            // Professional Card
            const card = document.createElement('div');
            card.style.cssText = `
                background: white; 
                padding: 40px; 
                border-radius: 12px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
                width: 320px; 
                text-align: center;
                animation: fadeIn 0.4s ease-out;
                border: 1px solid #f0f0f0;
            `;

            card.innerHTML = `
                <style>
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .sec-input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; background: #fafafa; color: #333; }
                    .sec-input:focus { border-color: #333; background: #fff; }
                    .sec-btn { width: 100%; padding: 12px; background: #111; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: 0.2s; box-sizing: border-box; }
                    .sec-btn:hover { background: #333; }
                    .sec-link { margin-top: 20px; font-size: 13px; color: #666; cursor: pointer; text-decoration: none; display: inline-block; }
                    .sec-link:hover { color: #111; text-decoration: underline; }
                </style>
                
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #111;">Security Verification</h2>
                <p style="margin: 0 0 25px 0; font-size: 13px; color: #666; line-height: 1.5;">This session requires authorization.</p>
                
                <input type="password" id="sec-pass" class="sec-input" placeholder="Password" autofocus>
                <div id="sec-error" style="height: 15px; font-size: 12px; color: #d32f2f; margin-bottom: 10px; opacity: 0; font-weight: 500;"></div>
                
                <button id="sec-submit" class="sec-btn">Continue</button>
                <br>
                <a id="sec-request" class="sec-link">Request Access</a>
            `;

            overlay.appendChild(card);

            const input = document.getElementById('sec-pass');
            const submitBtn = document.getElementById('sec-submit');
            const requestBtn = document.getElementById('sec-request');
            const errorMsg = document.getElementById('sec-error');
            let fails = startFails;

            const checkPass = () => {
                if (input.value === correctPassword) {
                    resolve(true);
                } else {
                    fails++;
                    localStorage.setItem('fail_count', fails);
                    input.value = '';
                    
                    if (fails >= 5) {
                        reject(fails);
                    } else {
                        errorMsg.innerText = `Incorrect password. Attempts: ${5 - fails}`;
                        errorMsg.style.opacity = '1';
                    }
                }
            };

            submitBtn.onclick = checkPass;
            requestBtn.onclick = () => { window.location.href = 'ticket.html'; };
            input.onkeydown = (e) => { if (e.key === 'Enter') checkPass(); };
            
            input.focus();
        });
    }

    // --- 4. EXECUTION FLOW ---

    try {
        // APPLY "WAITING" NUKE (Visual Hide)
        applyLoadingScreen();

        // 1. Check if actually banned (Cookie/Local)
        if (isBanned) triggerPermBan();

        // 2. Identify User
        let userName = null;
        try {
            const mbs = JSON.parse(localStorage.getItem('mbsData'));
            if (mbs && mbs.nom) userName = mbs.nom.trim().toLowerCase();
        } catch(e){}
        
        if (!userName) {
             try {
                const jdlm = JSON.parse(localStorage.getItem('jdlmData'));
                if (jdlm && jdlm.nom) userName = jdlm.nom.trim().toLowerCase();
            } catch(e){}
        }

        if (!userName) {
            restoreSite(); return;
        }

        // 3. Fetch Data
        const response = await fetch(API_URL);
        if (!response.ok) { restoreSite(); return; }
        const data = await response.json();

        // 4. Validate User
        if (data.banned && data.banned.includes(userName)) triggerPermBan();
        
        if (data.vip && data.vip.includes(userName)) {
            localStorage.setItem('vip_safe_user', 'true');
            restoreSite();
            return;
        }

        if (data.trusted && data.trusted.includes(userName)) {
            sessionStorage.setItem('temp_safe_user', 'true');
            restoreSite();
            return;
        }

        // 5. Challenge Unknown
        let fails = parseInt(localStorage.getItem('fail_count') || '0');
        if (fails >= 5) triggerPermBan();

        try {
            await promptPasswordCustom(data.password, fails);
            
            // SUCCESS
            restoreSite(); // Un-hide content
            localStorage.removeItem('fail_count');
            sessionStorage.setItem('temp_safe_user', 'true');
            
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'trust' })
            });

        } catch (finalFails) {
            // FAILURE -> TOTAL NUKE
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'ban' })
            });
            triggerPermBan();
        }

    } catch (e) {
        // Fallback
        restoreSite();
    }
})();

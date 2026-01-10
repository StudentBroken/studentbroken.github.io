(async function() {
    // --- CONFIGURATION ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0nC6F3F5UHvLLGC1MxlB9RgfyHEGQ1wXCCc75FE3wBjBkLYZ7Ek3VLGJu2czidkpksQ/exec'; 
    // ---------------------

    // --- 0. INSTANT CHECKS (Before showing ANY UI) ---
    
    function isDeviceBanned() {
        if (localStorage.getItem('perm_banned_user') === 'true') return true;
        if (sessionStorage.getItem('perm_banned_user') === 'true') return true;
        if (document.cookie.indexOf('perm_banned_user=true') > -1) {
            localStorage.setItem('perm_banned_user', 'true');
            return true;
        }
        return false;
    }

    // 1. If VIP (Row A) -> STOP SCRIPT (No UI)
    if (localStorage.getItem('vip_safe_user') === 'true') return;

    // 2. If Trusted Session (Row B) -> STOP SCRIPT (No UI)
    if (sessionStorage.getItem('temp_safe_user') === 'true') return;

    // 3. If Banned -> Proceed to lock
    const isBanned = isDeviceBanned();


    // --- 1. CLEAN LOADING SCREEN ---
    
    function applyLoadingScreen() {
        if (document.getElementById('security-overlay')) return;

        const style = document.createElement('style');
        style.id = 'security-style';
        style.innerHTML = `
            /* FREEZE INTERACTION */
            body, html { 
                margin: 0 !important; padding: 0 !important; 
                width: 100% !important; height: 100% !important; 
                overflow: hidden !important; 
            }
            
            /* WHITE OVERLAY */
            #security-overlay { 
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                z-index: 2147483647; 
                background-color: #ffffff; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                pointer-events: auto !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }

            /* CLEAN SPINNER */
            .clean-spinner {
                width: 40px; height: 40px;
                border: 3px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: #333;
                animation: spin 0.8s ease-in-out infinite;
                margin-bottom: 20px;
            }

            @keyframes spin { to { transform: rotate(360deg); } }

            /* HIDE SITE CONTENT */
            body > *:not(#security-overlay):not(#security-style) { display: none !important; }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'security-overlay';
        
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'clean-spinner';

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

    // --- 2. TRANSITION & UTILS ---

    function setBanStatus() {
        localStorage.setItem('perm_banned_user', 'true');
        Object.defineProperty(localStorage, 'perm_banned_user', { value: 'true', writable: false });
        sessionStorage.setItem('perm_banned_user', 'true');
        const d = new Date(); d.setTime(d.getTime() + (365*24*60*60*1000));
        document.cookie = "perm_banned_user=true; expires=" + d.toUTCString() + "; path=/";
    }

    // Switch from Spinner to Input Form (No background change, just content swap)
    function showContentContainer() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.remove();
    }

    function triggerPermBan() {
        applyLoadingScreen(); // Ensure UI exists
        setBanStatus();
        showContentContainer(); // Clear spinner

        const overlay = document.getElementById('security-overlay');
        overlay.innerHTML = ''; // Clear everything
        
        // Professional Ban Message
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.innerHTML = `
            <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 10px;">Access Restricted</h1>
            <p style="color: #666; font-size: 14px;">Your device has been permanently blocked from accessing this resource.</p>
        `;
        overlay.appendChild(container);
        
        throw new Error("Banned");
    }

    function restoreSite() {
        const overlay = document.getElementById('security-overlay');
        const style = document.getElementById('security-style');
        if (overlay) overlay.remove();
        if (style) style.remove();
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // --- 3. PROFESSIONAL PASSWORD PROMPT ---

    function promptPasswordCustom(correctPassword, startFails) {
        return new Promise((resolve, reject) => {
            showContentContainer(); // Remove spinner
            
            const overlay = document.getElementById('security-overlay');
            
            // Clean Card
            const card = document.createElement('div');
            card.style.cssText = `
                background: white; 
                padding: 40px; 
                border-radius: 12px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.08); 
                width: 320px; 
                text-align: center;
                animation: fadeIn 0.4s ease-out;
            `;

            // Inner HTML (Clean Inputs)
            card.innerHTML = `
                <style>
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .sec-input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
                    .sec-input:focus { border-color: #333; }
                    .sec-btn { width: 100%; padding: 12px; background: #111; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: 0.2s; box-sizing: border-box; }
                    .sec-btn:hover { background: #333; }
                    .sec-link { margin-top: 15px; font-size: 12px; color: #666; cursor: pointer; text-decoration: none; display: inline-block; }
                    .sec-link:hover { color: #111; }
                </style>
                
                <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111;">Security Check</h2>
                <p style="margin: 0 0 25px 0; font-size: 13px; color: #666;">Please verify your identity to continue.</p>
                
                <input type="password" id="sec-pass" class="sec-input" placeholder="Password" autofocus>
                <div id="sec-error" style="height: 15px; font-size: 12px; color: #d32f2f; margin-bottom: 10px; opacity: 0;"></div>
                
                <button id="sec-submit" class="sec-btn">Verify</button>
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
                        // Shake effect or error msg
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

    // --- 4. EXECUTION ---

    try {
        // Apply White Loading Screen Immediately (unless trusted)
        applyLoadingScreen();

        // 1. Check if actually banned
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
            
            // Success
            restoreSite();
            localStorage.removeItem('fail_count');
            sessionStorage.setItem('temp_safe_user', 'true');
            
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'trust' })
            });

        } catch (finalFails) {
            // Failed
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'ban' })
            });
            triggerPermBan();
        }

    } catch (e) {
        // Silent fail
        restoreSite();
    }
})();

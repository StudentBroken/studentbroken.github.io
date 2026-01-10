(async function() {
    // --- CONFIGURATION ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0nC6F3F5UHvLLGC1MxlB9RgfyHEGQ1wXCCc75FE3wBjBkLYZ7Ek3VLGJu2czidkpksQ/exec'; 
    // ---------------------

    // --- 0. INSTANT CHECKS (Do not touch DOM if safe) ---
    
    // If VIP (Row A) -> STOP SCRIPT (Let site load)
    if (localStorage.getItem('vip_safe_user') === 'true') return;

    // If Trusted Session (Row B) -> STOP SCRIPT
    if (sessionStorage.getItem('temp_safe_user') === 'true') return;


    // --- 1. THE NUKE (Delete Everything) ---
    // If we are here, we are not safe yet. DESTROY the site content.
    try {
        document.body.innerHTML = ''; 
        // Stop any further loading if placed in head
        if (window.stop) window.stop();
    } catch(e) {
        // Fallback if body doesn't exist yet (script in head)
        document.documentElement.innerHTML = '<body></body>';
    }
    
    // Set basic professional styles for the "Void"
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#ffffff";
    document.body.style.height = "100vh";
    document.body.style.overflow = "hidden";
    document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // --- 2. BAN CHECKER ---
    
    function isDeviceBanned() {
        if (localStorage.getItem('perm_banned_user') === 'true') return true;
        if (sessionStorage.getItem('perm_banned_user') === 'true') return true;
        if (document.cookie.indexOf('perm_banned_user=true') > -1) {
            localStorage.setItem('perm_banned_user', 'true');
            return true;
        }
        return false;
    }

    // --- 3. UI GENERATORS ---

    // A. Loading Spinner (White/Professional)
    function renderLoading() {
        document.body.innerHTML = ''; // Clear
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; width: 100vw;";
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px; height: 40px;
            border: 3px solid rgba(0,0,0,0.1);
            border-radius: 50%;
            border-top-color: #333;
            animation: spin 0.8s ease-in-out infinite;
        `;
        
        // Add animation keyframes
        const style = document.createElement('style');
        style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);

        wrapper.appendChild(spinner);
        document.body.appendChild(wrapper);
    }

    // B. Ban Screen (Minimalist)
    function renderBan() {
        // Set Ban Flags
        localStorage.setItem('perm_banned_user', 'true');
        sessionStorage.setItem('perm_banned_user', 'true');
        const d = new Date(); d.setTime(d.getTime() + (365*24*60*60*1000));
        document.cookie = "perm_banned_user=true; expires=" + d.toUTCString() + "; path=/";

        document.body.innerHTML = ''; // Clear
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center;";
        
        wrapper.innerHTML = `
            <div style="margin-bottom: 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            </div>
            <h1 style="font-size: 24px; font-weight: 600; color: #111; margin: 0 0 10px 0;">Access Restricted</h1>
            <p style="color: #666; font-size: 14px; max-width: 300px;">No access</p>
        `;
        document.body.appendChild(wrapper);
    }

    // C. Password Prompt (Card)
    function promptPasswordCustom(correctPassword, startFails) {
        return new Promise((resolve, reject) => {
            document.body.innerHTML = ''; // Clear Spinner
            
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff;";
            
            const card = document.createElement('div');
            card.style.cssText = `
                background: white; padding: 40px; border-radius: 12px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.08); width: 320px; 
                text-align: center; border: 1px solid #f0f0f0;
                animation: fadeIn 0.4s ease-out;
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
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #111;"> Verification</h2>
                <p style="margin: 0 0 25px 0; font-size: 13px; color: #666;">     </p>
                <input type="password" id="sec-pass" class="sec-input" placeholder="Password" autofocus>
                <div id="sec-error" style="height: 15px; font-size: 12px; color: #d32f2f; margin-bottom: 10px; opacity: 0; font-weight: 500;"></div>
                <button id="sec-submit" class="sec-btn">Continue</button>
                <br>
                <a id="sec-request" class="sec-link">Request Access</a>
            `;

            wrapper.appendChild(card);
            document.body.appendChild(wrapper);

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
        // 1. Initial State: Nuke & Load
        renderLoading();

        // 2. Check Ban
        if (isDeviceBanned()) {
            renderBan(); return;
        }

        // 3. Identify User
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
            // No User -> Guest -> Reload to restore content?
            // Since we nuked it, we MUST reload to get it back, but we need a flag to prevent looping.
            // Assuming guests are allowed:
            // return location.reload(); -- This would loop. 
            // NOTE: If guests are allowed, you shouldn't have nuked it in Step 1 without a "guest" check.
            // Assuming Login Required:
            renderBan(); return;
        }

        // 4. Fetch Data
        const response = await fetch(API_URL);
        if (!response.ok) { renderBan(); return; }
        const data = await response.json();

        // 5. Validate User
        if (data.banned && data.banned.includes(userName)) {
            renderBan(); return;
        }
        
        // ROW A (VIP)
        if (data.vip && data.vip.includes(userName)) {
            localStorage.setItem('vip_safe_user', 'true');
            location.reload(); // RELOAD TO RESTORE SITE
            return;
        }

        // ROW B (Trusted)
        if (data.trusted && data.trusted.includes(userName)) {
            sessionStorage.setItem('temp_safe_user', 'true');
            location.reload(); // RELOAD TO RESTORE SITE
            return;
        }

        // 6. Challenge
        let fails = parseInt(localStorage.getItem('fail_count') || '0');
        if (fails >= 5) { renderBan(); return; }

        try {
            await promptPasswordCustom(data.password, fails);
            
            // SUCCESS
            localStorage.removeItem('fail_count');
            sessionStorage.setItem('temp_safe_user', 'true');
            
            // Update Backend
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'trust' })
            });

            // RELOAD TO RESTORE SITE
            location.reload();

        } catch (finalFails) {
            // FAILURE
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'ban' })
            });
            renderBan();
        }

    } catch (e) {
        // Fallback: If error, stay nuked or ban?
        console.log("Error");
    }
})();

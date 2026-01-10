(async function() {
    // --- PASTE YOUR DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0nC6F3F5UHvLLGC1MxlB9RgfyHEGQ1wXCCc75FE3wBjBkLYZ7Ek3VLGJu2czidkpksQ/exec'; 
    // ------------------------------------

    // --- 1. FINGERPRINTING & BAN MANAGEMENT ---
    
    function setBanStatus() {
        // 1. Local Storage
        localStorage.setItem('perm_banned_user', 'true');
        Object.defineProperty(localStorage, 'perm_banned_user', { value: 'true', writable: false });
        
        // 2. Session Storage
        sessionStorage.setItem('perm_banned_user', 'true');
        
        // 3. Cookies (Harder to clear via simple cache clear)
        const d = new Date();
        d.setTime(d.getTime() + (365*24*60*60*1000)); // 1 year
        document.cookie = "perm_banned_user=true; expires=" + d.toUTCString() + "; path=/";
    }

    function isDeviceBanned() {
        // Check all storage methods
        if (localStorage.getItem('perm_banned_user') === 'true') return true;
        if (sessionStorage.getItem('perm_banned_user') === 'true') return true;
        if (document.cookie.indexOf('perm_banned_user=true') > -1) {
            // If found in cookie but not local, re-apply local
            setBanStatus();
            return true;
        }
        return false;
    }

    // --- 2. VISUALS ---

    // The Monkey Background (Nuke)
    function triggerNuhUh() {
        if (document.getElementById('brainrot-bg')) return;
        
        const style = document.createElement('style');
        style.id = 'brainrot-style';
        style.innerHTML = `
            body, html { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; background-color: black !important; }
            #brainrot-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: fill !important; z-index: 2147483646; pointer-events: none; }
            /* Hide everything else */
            body > *:not(#brainrot-bg):not(#brainrot-style):not(#custom-lock-container) { display: none !important; }
        `;
        document.head.appendChild(style);

        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        document.body.appendChild(img);
    }

    // The Black Screen (Perm Ban)
    function triggerPermBan() {
        setBanStatus(); // Apply to all storage types
        
        document.body.innerHTML = ''; 
        const style = document.createElement('style');
        style.innerHTML = `body, html { margin:0; padding:0; background: black; height: 100%; overflow: hidden; }`;
        document.head.appendChild(style);

        const img = document.createElement('img');
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        img.style.width = "100vw"; img.style.height = "100vh"; img.style.objectFit = "cover";
        document.body.appendChild(img);
        
        throw new Error("Banned");
    }

    function restoreSite() {
        const elements = ['brainrot-bg', 'brainrot-style', 'custom-lock-container'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // Custom Password Overlay
    function promptPasswordCustom(correctPassword, startFails) {
        return new Promise((resolve, reject) => {
            // Create Container
            const container = document.createElement('div');
            container.id = 'custom-lock-container';
            container.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(10, 10, 10, 0.95); border: 2px solid red; 
                box-shadow: 0 0 20px red; color: red; padding: 30px; 
                z-index: 2147483647; font-family: 'Courier New', monospace; 
                text-align: center; width: 320px; border-radius: 10px;
            `;

            // Inner HTML
            container.innerHTML = `
                <h2 style="margin: 0 0 20px 0; text-transform: uppercase; font-size: 24px;">System Locked</h2>
                <input type="password" id="lock-input" style="
                    width: 100%; padding: 10px; margin-bottom: 10px; box-sizing: border-box;
                    background: #222; border: 1px solid #555; color: white; text-align: center; font-size: 18px;
                " placeholder="Enter Password" autofocus>
                
                <div id="lock-status" style="height: 20px; font-size: 12px; color: yellow; margin-bottom: 15px;"></div>
                
                <button id="lock-btn" style="
                    background: red; color: white; border: none; padding: 10px 20px; margin-bottom: 10px;
                    cursor: pointer; font-weight: bold; text-transform: uppercase; width: 100%; box-sizing: border-box;
                ">Unlock</button>

                <button id="request-btn" style="
                    background: transparent; color: #888; border: 1px solid #555; padding: 5px 10px; 
                    cursor: pointer; font-size: 12px; width: 100%; box-sizing: border-box;
                ">Request Access</button>
            `;

            document.body.appendChild(container);

            const input = document.getElementById('lock-input');
            const unlockBtn = document.getElementById('lock-btn');
            const requestBtn = document.getElementById('request-btn');
            const status = document.getElementById('lock-status');
            let fails = startFails;

            const checkPass = () => {
                const val = input.value;
                if (val === correctPassword) {
                    resolve(true); // Success
                } else {
                    fails++;
                    localStorage.setItem('fail_count', fails);
                    input.value = '';
                    
                    if (fails >= 5) {
                        reject(fails); // Fail Max
                    } else {
                        status.innerText = `ACCESS DENIED. Attempts: ${5 - fails}`;
                        status.style.color = 'red';
                    }
                }
            };

            // Event Listeners
            unlockBtn.onclick = checkPass;
            requestBtn.onclick = () => { window.location.href = 'ticket.html'; };
            input.onkeydown = (e) => { if (e.key === 'Enter') checkPass(); };
            
            // Initial Status
            status.innerText = `Attempts remaining: ${5 - fails}`;
        });
    }

    // --- MAIN LOGIC ---

    try {
        // 1. FAST CHECKS (Device Fingerprint & Cache)
        if (isDeviceBanned()) triggerPermBan();
        if (localStorage.getItem('vip_safe_user') === 'true') return;
        if (sessionStorage.getItem('temp_safe_user') === 'true') return;

        // 2. GET NAME
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

        if (!userName) return; // Exit if no user logged in

        // 3. FETCH
        const response = await fetch(API_URL);
        if (!response.ok) return; 
        const data = await response.json();

        // 4. LIST CHECK
        if (data.banned && data.banned.includes(userName)) triggerPermBan();
        
        if (data.vip && data.vip.includes(userName)) {
            localStorage.setItem('vip_safe_user', 'true');
            return;
        }

        if (data.trusted && data.trusted.includes(userName)) {
            sessionStorage.setItem('temp_safe_user', 'true');
            return;
        }

        // 5. UNKNOWN -> NUKE & CUSTOM PROMPT
        triggerNuhUh();

        let fails = parseInt(localStorage.getItem('fail_count') || '0');
        if (fails >= 5) triggerPermBan();

        // Wait for the custom UI to resolve or reject
        try {
            await promptPasswordCustom(data.password, fails);
            
            // SUCCESS (Promise Resolved)
            restoreSite();
            localStorage.removeItem('fail_count');
            sessionStorage.setItem('temp_safe_user', 'true');
            
            // Add to Row B
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'trust' })
            });

        } catch (finalFails) {
            // FAILURE (Promise Rejected)
            // Add to Row C
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'ban' })
            });
            triggerPermBan();
        }

    } catch (e) {
        console.log("System check bypassed or error", e);
    }
})();

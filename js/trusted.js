--- START OF FILE blacklist.js ---

(async function() {
    // --- PASTE YOUR NEW DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbx1zib3LDFjnBZzcOkxHRpXk_8nPD2ZeSGaL7jWtb71Xcfjl_N_GyOCg_NCP3y3p8KC6g/exec'; 
    // ----------------------------------------

    // --- 1. DEFINE VISUALS (NUKE & RESTORE) ---
    function triggerGlitchMode() {
        if (document.getElementById('brainrot-bg')) return; 
        const style = document.createElement('style');
        style.id = 'brainrot-style';
        style.innerHTML = `
            body, html { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; background-color: black !important; }
            #brainrot-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: fill !important; z-index: 2147483647; pointer-events: none; }
            #brainrot-caption { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: red !important; font-family: Impact, sans-serif !important; font-size: 5vw !important; text-align: center !important; text-transform: uppercase !important; font-weight: bold !important; z-index: 2147483647; text-shadow: 3px 3px 0 #000; width: 100%; }
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

    function triggerBlackScreen() {
        localStorage.clear(); 
        sessionStorage.clear();
        localStorage.setItem('permBan', 'true'); // Flag for next time

        document.body.innerHTML = ''; 
        const style = document.createElement('style');
        style.innerHTML = `body, html { margin:0; padding:0; background: black; height: 100%; overflow: hidden; }`;
        document.head.appendChild(style);
        const img = document.createElement('img');
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        img.style.width = "100vw"; img.style.height = "100vh"; img.style.objectFit = "cover";
        document.body.appendChild(img);
        throw new Error("Banned"); // Stop script
    }

    function restoreSite() {
        const bg = document.getElementById('brainrot-bg');
        const cap = document.getElementById('brainrot-caption');
        const style = document.getElementById('brainrot-style');
        if (bg) bg.remove();
        if (cap) cap.remove();
        if (style) style.remove();
        const hidden = document.querySelectorAll('body > *');
        hidden.forEach(el => el.style.removeProperty('display'));
    }

    // --- 2. IMMEDIATE CHECKS (LOCAL MEMORY) ---
    
    // A. Check for Permanent Ban (Browser Level)
    if (localStorage.getItem('permBan') === 'true') {
        triggerBlackScreen();
    }

    // B. Check for VIP Pass (Row A - Permanent)
    if (localStorage.getItem('vipPass') === 'true') {
        return; // Exit script, user is good forever
    }

    // C. Check for Session Pass (Row B - Temporary)
    if (sessionStorage.getItem('sessionPass') === 'true') {
        return; // Exit script, user is good for this tab
    }

    // --- 3. GET USER NAME ---
    let userName = null;
    try {
        const mbsData = JSON.parse(localStorage.getItem('mbsData'));
        if (mbsData && mbsData.nom) userName = mbsData.nom.trim().toLowerCase();
    } catch (e) {}
    
    if (!userName) {
        try {
            const jdlmData = JSON.parse(localStorage.getItem('jdlmData'));
            if (jdlmData && jdlmData.nom) userName = jdlmData.nom.trim().toLowerCase();
        } catch (e) {}
    }

    // If no name, we do nothing (or you can nuke here if you want login mandated)
    if (!userName) return; 

    // --- 4. FETCH DATA FROM GOOGLE SHEETS ---
    let data;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) return; // If server error, let them be?
        data = await response.json();
    } catch (e) {
        console.log("Offline or Error");
        return;
    }

    const rowA = data.rowA || []; // VIP
    const rowB = data.rowB || []; // Trusted
    const rowC = data.rowC || []; // Banned
    const password = data.password;

    // --- 5. LOGIC TREE ---

    // CHECK 1: Is he in Row C? (Banned) -> NUKE
    if (rowC.includes(userName)) {
        triggerBlackScreen();
    }

    // CHECK 2: Is he in Row A? (VIP) -> SAVE PASS & EXIT
    if (rowA.includes(userName)) {
        localStorage.setItem('vipPass', 'true');
        return;
    }

    // CHECK 3: Is he in Row B? (Trusted) -> SAVE SESSION & EXIT
    if (rowB.includes(userName)) {
        sessionStorage.setItem('sessionPass', 'true');
        return;
    }

    // --- 6. UNKNOWN USER -> CHALLENGE ---
    triggerGlitchMode();

    let fails = parseInt(localStorage.getItem('fails') || '0');
    if (fails >= 5) {
        // Failed too many times in previous loads
        triggerBlackScreen();
    }

    // Delay for GIF load
    await new Promise(r => setTimeout(r, 200)); 

    let success = false;
    for (let i = fails; i < 5; i++) {
        const input = prompt(`Security Check\nUser: ${userName}\nEnter Password (Attempt ${i+1}/5)`);
        
        if (input === password) {
            success = true;
            break;
        } else {
            fails++;
            localStorage.setItem('fails', fails);
            alert("Wrong Password");
        }
    }

    // --- 7. RESULTS ---

    if (success) {
        // A. Reset Fails
        localStorage.removeItem('fails');
        
        // B. Give Session Pass
        sessionStorage.setItem('sessionPass', 'true');
        
        // C. Restore Site
        restoreSite();

        // D. Write to Backend (Row B)
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'text/plain'},
            body: JSON.stringify({ name: userName, type: 'trust' })
        });

    } else {
        // Failed 5 times
        
        // A. Write to Backend (Row C)
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'text/plain'},
            body: JSON.stringify({ name: userName, type: 'ban' })
        });

        // B. Ban Browser
        triggerBlackScreen();
    }

})();

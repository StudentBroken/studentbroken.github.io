(async function() {
    // --- PASTE YOUR NEW DEPLOYED URL HERE ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbz0nC6F3F5UHvLLGC1MxlB9RgfyHEGQ1wXCCc75FE3wBjBkLYZ7Ek3VLGJu2czidkpksQ/exec'; 
    // ----------------------------------------

    // --- VISUALS ---

    // 1. The Monkey (For Password Prompt)
    function triggerNuhUh() {
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
        img.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgFGfSwMON8OjFNAGE56nmVTpoGxXB-hf75Q&s"; // Monkey
        
        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = " ";

        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    // 2. The Black Screen (For Perm Ban)
    function triggerPermBan() {
        // Lock the browser storage so they can't delete it easily
        localStorage.setItem('perm_banned_user', 'true');
        Object.defineProperty(localStorage, 'perm_banned_user', { value: 'true', writable: false });
        sessionStorage.clear();

        document.body.innerHTML = ''; // Wipe DOM
        const style = document.createElement('style');
        style.innerHTML = `body, html { margin:0; padding:0; background: black; height: 100%; overflow: hidden; }`;
        document.head.appendChild(style);

        const img = document.createElement('img');
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        img.style.width = "100vw"; img.style.height = "100vh"; img.style.objectFit = "cover";
        document.body.appendChild(img);
        
        throw new Error("Banned"); // Stop execution
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

    // --- LOGIC ---

    try {
        // 1. PRIORITY CHECK: Is browser already burned?
        if (localStorage.getItem('perm_banned_user') === 'true') {
            triggerPermBan();
        }

        // 2. VIP CHECK: Is user permanently safe? (Row A)
        if (localStorage.getItem('vip_safe_user') === 'true') {
            return; // Exit script, allow access
        }

        // 3. SESSION CHECK: Is user safe for this tab? (Row B)
        if (sessionStorage.getItem('temp_safe_user') === 'true') {
            return; // Exit script, allow access
        }

        // 4. GET USER NAME
        let userName = null;
        const mbsDataString = localStorage.getItem('mbsData');
        if (mbsDataString) {
            const mbsData = JSON.parse(mbsDataString);
            if (mbsData.nom) userName = mbsData.nom.trim().toLowerCase();
        }
        
        if (!userName) {
            // Also check JDLM
            const jdlmDataString = localStorage.getItem('jdlmData');
            if (jdlmDataString) {
                const jdlmData = JSON.parse(jdlmDataString);
                if (jdlmData.nom) userName = jdlmData.nom.trim().toLowerCase();
            }
        }

        // If no name found, we skip logic (or you can nuke here if you want strict mode)
        if (!userName) return; 

        // 5. FETCH DATA
        const response = await fetch(API_URL);
        if (!response.ok) return; 
        const data = await response.json();

        const rowA = data.vip || [];
        const rowB = data.trusted || [];
        const rowC = data.banned || [];
        const password = data.password;

        // 6. CHECK LISTS
        
        // A. Is he in Row C? (Banned)
        if (rowC.includes(userName)) {
            triggerPermBan();
        }

        // B. Is he in Row A? (VIP)
        if (rowA.includes(userName)) {
            localStorage.setItem('vip_safe_user', 'true');
            return;
        }

        // C. Is he in Row B? (Trusted)
        if (rowB.includes(userName)) {
            sessionStorage.setItem('temp_safe_user', 'true');
            return;
        }

        // 7. UNKNOWN USER -> CHALLENGE
        triggerNuhUh();

        let fails = parseInt(localStorage.getItem('fail_count') || '0');
        if (fails >= 5) triggerPermBan(); // Catch previous fails

        // Slight delay for UI
        await new Promise(r => setTimeout(r, 200));

        let success = false;
        
        // Loop for attempts
        while (fails < 5) {
            const attempt = prompt(`Security Verification\nUser: ${userName}\nEnter Password (Attempts left: ${5 - fails})`);
            
            if (attempt === password) {
                success = true;
                break;
            } else {
                fails++;
                localStorage.setItem('fail_count', fails);
                if (fails >= 5) {
                    // Update Backend -> Ban
                    fetch(API_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {'Content-Type': 'text/plain'},
                        body: JSON.stringify({ name: userName, type: 'ban' })
                    });
                    triggerPermBan();
                }
                alert("Incorrect Password");
            }
        }

        // 8. SUCCESS HANDLING
        if (success) {
            restoreSite();
            localStorage.removeItem('fail_count');
            
            // Set Session Pass
            sessionStorage.setItem('temp_safe_user', 'true');

            // Update Backend -> Trust (Row B)
            fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: JSON.stringify({ name: userName, type: 'trust' })
            });
        }

    } catch (e) {
        console.log("Check skipped or offline");
    }
})();

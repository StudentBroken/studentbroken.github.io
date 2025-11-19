(async function() {
    // --- CONFIGURATION ---
    const BLACKLIST_API_URL = 'https://script.google.com/macros/s/AKfycbzEjzjZhLkBbCBhnFhwV_BFgk561QdDKvifyHY6iKVw0q8eex0-cC4RhDDPcmrLeE_2cQ/exec'; 
    // ---------------------

    function triggerGlitchMode() {
        console.error("CRITICAL SYSTEM FAILURE: MEMORY CORRUPTION DETECTED at 0x8F4A2");
        
        // 1. Inject Chaos CSS
        const style = document.createElement('style');
        style.innerHTML = `
            body {
                background-color: #000 !important;
                color: #00ff00 !important;
                font-family: 'Courier New', monospace !important;
                overflow: hidden !important;
                cursor: not-allowed !important;
            }
            /* Glitch Animation */
            @keyframes glitch-anim {
                0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
                20% { clip-path: inset(92% 0 1% 0); transform: translate(0px, 0px); }
                40% { clip-path: inset(43% 0 1% 0); transform: translate(2px, -2px); }
                60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, 2px); }
                80% { clip-path: inset(54% 0 7% 0); transform: translate(-1px, -2px); }
                100% { clip-path: inset(58% 0 43% 0); transform: translate(0px, 0px); }
            }
            body > * {
                animation: glitch-anim 0.3s infinite linear alternate-reverse;
                opacity: 0.8;
                filter: contrast(200%) noise(100%);
                pointer-events: none;
            }
            /* Hide images and sensible data immediately */
            img, canvas, svg, .data-widget { display: none !important; }
        `;
        document.head.appendChild(style);

        // 2. Corrupt the DOM text
        const allElements = document.querySelectorAll('h1, h2, h3, p, span, div, a, button');
        allElements.forEach(el => {
            if(Math.random() > 0.5) {
                el.innerText = el.innerText.split('').map(c => Math.random() > 0.5 ? String.fromCharCode(33 + Math.random() * 93) : c).join('');
                el.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
                el.style.color = Math.random() > 0.5 ? 'red' : 'white';
            }
        });

        // 3. Final crash simulation after 2 seconds
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;background:black;color:red;text-align:center;">
                    <h1 style="font-size:5em;">FATAL ERROR</h1>
                    <p>0xC000021A - SYSTEM_INTEGRITY_COMPROMISED</p>
                    <p>User ID rejected by host controller.</p>
                    <small>Terminating session...</small>
                </div>
            `;
        }, 2000);
    }

    try {
        // 1. Check Local Storage for User Name
        const mbsDataString = localStorage.getItem('mbsData');
        if (!mbsDataString) return; // No data, safe to proceed

        const mbsData = JSON.parse(mbsDataString);
        if (!mbsData.nom) return;

        const userName = mbsData.nom.trim().toLowerCase();

        // 2. Fetch Blacklist (Silent fetch)
        const response = await fetch(BLACKLIST_API_URL);
        if (!response.ok) return; 

        const blacklist = await response.json();

        // 3. Compare
        if (blacklist.includes(userName)) {
            // 4. EXECUTE NUKE
            triggerGlitchMode();
            // Clear their data just to be mean/secure
            localStorage.clear();
        }

    } catch (e) {
        // Silently fail if API is down so normal users aren't affected
        console.warn("Integrity check skipped."); 
    }
})();

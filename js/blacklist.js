(async function() {
    // --- PASTE YOUR DEPLOYED URL HERE ---
    const BLACKLIST_API_URL = 'https://script.google.com/macros/s/AKfycbyNhGaZvsiar-kHmk8Hg0wFpPYo42KJCZ25SspufcS8IeroeyNUs_fQfJviqL7AQQBShA/exec'; 
    // ------------------------------------

    function triggerGlitchMode() {
        // 1. Inject CSS exactly matching your simulation
        const style = document.createElement('style');
        style.innerHTML = `
            /* Reset Body/HTML to black full screen */
            body, html { 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important; 
                background-color: black !important;
            }
             
            /* The Background Image - Forces stretching */
            #brainrot-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                object-fit: fill !important; 
                z-index: 2147483647; 
                pointer-events: none;
            }

            /* The Caption */
            #brainrot-caption {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: red !important;
                font-family: Impact, 'Arial Black', sans-serif !important;
                font-size: 5vw !important; 
                text-align: center !important;
                text-transform: uppercase !important;
                font-weight: bold !important;
                z-index: 2147483647;
                text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                width: 100%;
            }

            /* Hide all other site elements immediately */
            body > *:not(#brainrot-bg):not(#brainrot-caption):not(style) {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // 2. Inject the specific Black Image and Text
        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        
        // --- UPDATED IMAGE URL BELOW ---
        img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_colour.jpg/500px-Black_colour.jpg";
        
        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = " ";

        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    // Helper to lock the permblacklist value in the current session
    function lockPermBlacklist() {
        localStorage.setItem('permblacklist', 'true');
        // This prevents modification via JavaScript in the current session
        Object.defineProperty(localStorage, 'permblacklist', {
            value: 'true',
            writable: false,
            configurable: false
        });
    }

    try {
        // 1. PRIORITY CHECK: Check if the user is already permanently blacklisted
        if (localStorage.getItem('permblacklist') === 'true') {
            lockPermBlacklist(); 
            triggerGlitchMode();
            return; 
        }

        // 2. Check Local Storage for User Name
        const mbsDataString = localStorage.getItem('mbsData');
        if (!mbsDataString) return;

        const mbsData = JSON.parse(mbsDataString);
        if (!mbsData.nom) return;

        const userName = mbsData.nom.trim().toLowerCase();

        // 3. Fetch Blacklist
        const response = await fetch(BLACKLIST_API_URL);
        if (!response.ok) return; 

        const blacklist = await response.json();

        // 4. Check Match
        if (blacklist.includes(userName)) {
            // Clear other data
            localStorage.clear(); 
            
            // Set the permanent flag
            lockPermBlacklist();
            
            triggerGlitchMode();
        }

    } catch (e) {
        console.log("Blacklist check skipped.");
    }
})();

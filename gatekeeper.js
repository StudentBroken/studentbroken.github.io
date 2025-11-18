// File: /js/gatekeeper.js

// This function will run automatically and gatekeep any page it's included on.
(function() {
    'use strict';

    // --- CONFIGURATION ---
    // This is the list of users who are allowed to access the site.
    const APPROVED_USERS = [
        'Jianheng Ouyang', 
        'Michael Xu', 
        'Dan-Vinh Calvarese', 
        'Anton Cucereavii'
    ];

    // --- CORE GATEKEEPER LOGIC ---

    let isAllowed = false;

    try {
        // We check for 'jdlmData' as requested.
        const dataString = localStorage.getItem('jdlmData');
        if (dataString) {
            const jdlmData = JSON.parse(dataString);
            if (jdlmData && jdlmData.nom) {
                const currentUser = jdlmData.nom.trim();
                // Check if the current user's name is in our approved list.
                if (APPROVED_USERS.includes(currentUser)) {
                    isAllowed = true;
                }
            }
        }
    } catch (e) {
        console.error("Gatekeeper: Could not read or parse jdlmData from localStorage.", e);
        // If there's any error, we default to not allowing access.
        isAllowed = false;
    }

    // If the user is not on the approved list, we activate the lock.
    if (!isAllowed) {
        // 1. We create the overlay elements dynamically using JavaScript.
        const overlay = document.createElement('div');
        overlay.id = 'gatekeeper-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'white';
        overlay.style.zIndex = '10001';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = "'Playfair Display', serif";
        overlay.style.color = '#2c3e50';
        overlay.style.fontSize = '1.5em';

        overlay.innerHTML = `
            <div>
                <p style="font-size: 2em; margin-bottom: 15px;">🔒</p>
                <p>Accès Restreint</p>
            </div>
        `;

        // 2. We stop the rest of the page from loading its content to prevent any flashes.
        document.addEventListener('DOMContentLoaded', () => {
            // We attach the overlay to the body once the DOM is ready.
            document.body.appendChild(overlay);
            // We hide the main content of the page.
            const mainContent = document.querySelector('main');
            if(mainContent) mainContent.style.display = 'none';
        }, { once: true });

        // 3. We freeze the HTML and BODY tags to prevent scrolling on a locked page.
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = '

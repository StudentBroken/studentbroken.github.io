document.addEventListener('DOMContentLoaded', function() {
    /**
     * Checks local storage for the 'mbs_accept' key.
     * @returns {boolean} - True if terms and privacy are accepted, false otherwise.
     */
    const checkLocalStorage = () => {
        const storedData = localStorage.getItem('mbs_accept');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                return parsedData.terms === true && parsedData.privacy === true;
            } catch (e) {
                // If parsing fails, treat it as if no consent was given.
                console.error("Error parsing mbs_accept from localStorage:", e);
                return false;
            }
        }
        return false;
    };

    // If consent is already given, do nothing.
    if (checkLocalStorage()) {
        return;
    }

    /**
     * Creates and displays the consent widget.
     */
    const createWidget = () => {
        // --- Main Widget Container (Overlay) ---
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'mbs-widget-container';
        Object.assign(widgetContainer.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark semi-transparent overlay
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '10000',
            fontFamily: 'Arial, sans-serif'
        });

        // --- Widget Content Box ---
        const widgetContent = document.createElement('div');
        Object.assign(widgetContent.style, {
            backgroundColor: '#2c2f33', // Dark grey background
            color: '#ffffff', // White text
            padding: '40px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '550px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            borderTop: '5px solid #7289da' // Accent color
        });

        // --- Title ---
        const title = document.createElement('h1');
        title.textContent = 'Outil MBS';
        Object.assign(title.style, {
            fontSize: '2.5em',
            margin: '0 0 15px 0',
            color: '#ffffff'
        });

        // --- Warning Message ---
        const warningMessage = document.createElement('p');
        warningMessage.innerHTML = 'OUTIL MBS ne collecte <b>aucune</b> information personnelle sensible. Tous les calculs s’effectuent localement dans votre navigateur.';
        Object.assign(warningMessage.style, {
            backgroundColor: 'rgba(255, 82, 82, 0.1)',
            color: '#ff5252', // Bright Red
            fontWeight: 'bold',
            padding: '15px',
            borderRadius: '5px',
            border: '1px solid #ff5252',
            lineHeight: '1.5'
        });
        
        // --- No Data Collection Message ---
        const noDataCollectionMessage = document.createElement('p');
        noDataCollectionMessage.textContent = 'Ce site ne collecte ni mots de passe, ni noms, ni noms d’utilisateur.';
        Object.assign(noDataCollectionMessage.style, {
            fontSize: '0.9em',
            color: '#b9bbbe', // Lighter grey text
            marginTop: '20px'
        });

        // --- Checkboxes and Links Container ---
        const termsContainer = document.createElement('div');
        Object.assign(termsContainer.style, {
            margin: '30px 0',
            fontSize: '0.9em',
            color: '#b9bbbe'
        });

        const createCheckboxLine = (id, htmlContent) => {
            const line = document.createElement('div');
            Object.assign(line.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = id;
            checkbox.style.marginRight = '10px';

            const label = document.createElement('label');
            label.htmlFor = id;
            label.innerHTML = htmlContent;
            
            // Style for links within labels
            label.querySelectorAll('a').forEach(link => {
                Object.assign(link.style, {
                    color: '#7289da', // Branded blue/purple color
                    textDecoration: 'none'
                });
                link.onmouseover = () => link.style.textDecoration = 'underline';
                link.onmouseout = () => link.style.textDecoration = 'none';
            });
            
            line.appendChild(checkbox);
            line.appendChild(label);
            return { line, checkbox };
        };

        const { line: termsLine, checkbox: termsCheckbox } = createCheckboxLine('mbs-terms', 'J\'ai lu et j\'accepte les <a href="info/condition.html" target="_blank">termes et conditions</a>');
        const { line: privacyLine, checkbox: privacyCheckbox } = createCheckboxLine('mbs-privacy', 'J\'ai lu et j\'accepte la <a href="info/privacy.html" target="_blank">politique de confidentialité</a>.');
        
        termsContainer.appendChild(termsLine);
        termsContainer.appendChild(privacyLine);

        // --- Accept Button ---
        const acceptButton = document.createElement('button');
        acceptButton.textContent = 'Accepter et continuer';
        acceptButton.disabled = true;
        Object.assign(acceptButton.style, {
            width: '100%',
            padding: '15px',
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: '#7289da',
            border: 'none',
            borderRadius: '5px',
            cursor: 'not-allowed',
            opacity: '0.5',
            transition: 'background-color 0.3s ease, opacity 0.3s ease'
        });

        const updateButtonState = () => {
            if (termsCheckbox.checked && privacyCheckbox.checked) {
                acceptButton.disabled = false;
                acceptButton.style.opacity = '1';
                acceptButton.style.cursor = 'pointer';
            } else {
                acceptButton.disabled = true;
                acceptButton.style.opacity = '0.5';
                acceptButton.style.cursor = 'not-allowed';
            }
        };

        termsCheckbox.addEventListener('change', updateButtonState);
        privacyCheckbox.addEventListener('change', updateButtonState);

        acceptButton.addEventListener('mouseover', () => {
            if (!acceptButton.disabled) acceptButton.style.backgroundColor = '#677bc4';
        });
        acceptButton.addEventListener('mouseout', () => {
            if (!acceptButton.disabled) acceptButton.style.backgroundColor = '#7289da';
        });

        acceptButton.addEventListener('click', () => {
            if (acceptButton.disabled) return;
            localStorage.setItem('mbs_accept', JSON.stringify({ terms: true, privacy: true }));
            document.body.removeChild(widgetContainer);
        });

        // --- FAQ Link ---
        const faqLink = document.createElement('a');
        faqLink.href = '#';
        faqLink.textContent = 'Consulter la FAQ';
        Object.assign(faqLink.style, {
            display: 'block',
            marginTop: '20px',
            color: '#b9bbbe',
            textDecoration: 'none',
            fontSize: '0.9em'
        });
        faqLink.onmouseover = () => faqLink.style.textDecoration = 'underline';
        faqLink.onmouseout = () => faqLink.style.textDecoration = 'none';

        // --- Iframe Popup for FAQ ---
        const faqIframeContainer = document.createElement('div');
        Object.assign(faqIframeContainer.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'none', justifyContent: 'center', alignItems: 'center',
            zIndex: '10001'
        });

        const iframeContentWrapper = document.createElement('div');
        Object.assign(iframeContentWrapper.style, {
            position: 'relative',
            width: '80%',
            height: '80%',
            maxWidth: '1000px',
            backgroundColor: '#36393f',
            boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
        });

        const faqIframe = document.createElement('iframe');
        faqIframe.src = 'info/faq.html';
        Object.assign(faqIframe.style, {
            width: '100%', height: '100%', border: 'none'
        });

        const closeIframeButton = document.createElement('button');
        closeIframeButton.textContent = '×'; // A nice 'X' for closing
        Object.assign(closeIframeButton.style, {
            position: 'absolute', top: '10px', right: '15px',
            background: 'transparent', border: 'none',
            color: 'white', fontSize: '2.5em', cursor: 'pointer',
            lineHeight: '1'
        });
        
        iframeContentWrapper.appendChild(faqIframe);
        iframeContentWrapper.appendChild(closeIframeButton);
        faqIframeContainer.appendChild(iframeContentWrapper);

        faqLink.addEventListener('click', (e) => {
            e.preventDefault();
            faqIframeContainer.style.display = 'flex';
        });
        closeIframeButton.addEventListener('click', () => faqIframeContainer.style.display = 'none');
        
        // --- Assemble The Widget ---
        widgetContent.appendChild(title);
        widgetContent.appendChild(warningMessage);
        widgetContent.appendChild(noDataCollectionMessage);
        widgetContent.appendChild(termsContainer);
        widgetContent.appendChild(acceptButton);
        widgetContent.appendChild(faqLink);
        widgetContainer.appendChild(widgetContent);
        widgetContainer.appendChild(faqIframeContainer);
        document.body.appendChild(widgetContainer);
    };

    // Create the widget if consent is not found.
    createWidget();
});

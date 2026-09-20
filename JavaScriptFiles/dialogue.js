let dialogueBoxEl = null;
let portraitEl = null;
let contentEl = null;
let textEl = null;
let optionsEl = null;
let typewriterTimeout = null;
let startDelayTimeout = null;
let isDialogueActive = false;
let isTyping = false;

const DEFAULT_AVATAR = '../Images/korupixelartblacknwhite.jpg';

const DIALOGUE_SEQUENCE = {
    start: {
        type: 'text',
        text: "Howdy! I'm Koru, nice to see you here!",
        next: 'intro2',
    },
    intro2: {
        type: 'text',
        text: 'Welcome to my little world! Hope you have fun traveling around ^^',
        next: 'choice1',
    },
    choice1: {
        type: 'choice',
        text: 'Wanna know about the buildings out here?',
        options: [
            { label: 'Yes', next: 'tour1' },
            { label: 'No', next: 'soloIntro' },
        ],
    },
    tour1: {
        type: 'text',
        text: 'Each building reasembles one project that I\'ve made.',
        next: 'tour2',
    },
    tour2: {
        type: 'text',
        text: 'The more projects I make, the more filled this planet will be!',
        next: 'choice2',
    },
    soloIntro: {
        type: 'text',
        text: 'I see, if you are curious about this page, you can always talk with me :D',
        next: 'choice2',
    },
    choice2: {
        type: 'choice',
        text: 'Want to know more about my projects?',
        options: [
            { label: 'Yes', next: 'techAnswer1' },
            { label: 'No', next: 'ending' },
        ],
    },
    techAnswer1: {
        type: 'text',
        text: 'Each building has a "Show more" where you can see a more detailed explanation of the project.',
        next: 'techAnswer2',
    },
    techAnswer2: {
        type: 'text',
        text: 'Once clicked a "show detailed pdf" text will appear next to the title and close button.',
        next: 'techAnswer3',
    },
    techAnswer3: {
        type: 'text',
        text: 'That pdf will contain the whys and hows of the project if you are curious about it :P',
        next: 'ending',
    },
    ending: {
        type: 'text',
        text: "Well, that's it for now! Thanks for stopping by ^^",
        next: null, // last node, if we put null it will just reapeat
    },
};

// Node that will appear next in advanceDialogue().
// It will persist in the memory it self
let pendingNodeId = 'start';

// if its a choice dialogue, we set it as true, making it impossible to skip it
let awaitingChoice = false;

// Fast forward of the text
let currentTypingText = '';
let currentTypingOnComplete = null;

// When the rectangle is clicked, it will also trigger the animation of talking and skipping
let onAdvanceRequest = null;

export function setAdvanceRequestHandler(handler) {
    onAdvanceRequest = handler;
}

function injectDialogueStyles() {
    if (document.getElementById('character-dialogue-styles')) return;

    const style = document.createElement('style');
    style.id = 'character-dialogue-styles';
    style.textContent = `
        @font-face {
            font-family: 'DeterminationMono';
            src: url('../Webfonts/determinationmonoweb-webfont.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }

        #character-dialogue-box {
            position: fixed;
            bottom: 26px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 558px;
            height: 171px;
            background: #000000;
            border: 4px solid #ffffff;

            border-radius: 0px;
            box-shadow: none;

            padding: 16px 18px;
            box-sizing: border-box;

            display: flex;
            align-items: center; 
            gap: 18px;

            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            z-index: 30;

            cursor: pointer; 
        }

        #character-dialogue-box.visible {
            opacity: 1;
            pointer-events: auto;
        }

        #dialogue-portrait {
            width: 116px;
            height: 116px;
            object-fit: contain;
            image-rendering: pixelated;
            flex-shrink: 0;
        }

        #dialogue-content {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 9px;
            flex-grow: 1;
            height: 100%;
            overflow-y: auto;
            padding-right: 6px;
        }

        #dialogue-content::-webkit-scrollbar {
            width: 5px;
        }
        #dialogue-content::-webkit-scrollbar-track {
            background: transparent;
        }
        #dialogue-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.35);
            border-radius: 10px;
        }

        #dialogue-text {
            color: #ffffff;
            font-family: 'DeterminationMono', monospace;
            font-size: 25px;
            letter-spacing: 1.3px;
            line-height: 1.25;
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: normal;
            image-rendering: pixelated;
            position: relative;
            padding-left: 29px;
        }

        #dialogue-text::before {
            content: '*';
            position: absolute;
            left: 0;
            top: 0;
            color: #ffffff;
        }

        #dialogue-options {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 18px;
            padding-left: 29px;
        }

        #dialogue-options .dialogue-option {
            font-family: 'DeterminationMono', monospace;
            font-size: 25px;
            letter-spacing: 1.3px;
            color: #ffffff;
            background: transparent;
            border: none;
            padding: 2px 4px;
            cursor: pointer;
            transition: color 0.1s ease;
        }

        #dialogue-options .dialogue-option:hover,
        #dialogue-options .dialogue-option:focus {
            color: #ffca3a; 
            outline: none;
        }

        @media (max-width: 600px) {
            #character-dialogue-box {
                bottom: 64px;
                max-width: 92%;
                height: 148px;
                padding: 12px 14px;
                gap: 12px;
                border-width: 3px;
            }

            #dialogue-portrait {
                width: 88px;
                height: 88px;
            }

            #dialogue-text {
                font-size: 19px;
                letter-spacing: 1px;
                padding-left: 22px;
            }

            #dialogue-options {
                gap: 14px;
                padding-left: 22px;
            }

            #dialogue-options .dialogue-option {
                font-size: 19px;
                letter-spacing: 1px;
            }
        }
    `;
    document.head.appendChild(style);
}

function setupDismissListeners() {
    const handleDismiss = (e) => {
        if (!isDialogueActive) return;

        if (e.type === 'click' && dialogueBoxEl && dialogueBoxEl.contains(e.target)) {
            return;
        }

        hideDialogue();
    };

    window.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleDismiss, { passive: true });
}

// - If text is being written: the text will accelarate and finish, but you cant skip it, due to a bug with the animation itself.
// - If text has already been finished popping: it will trigger the next dialogue
function handleBoxClick(e) {
    if (e.target.closest && e.target.closest('.dialogue-option')) {
        return;
    }

    if (isTyping) {
        skipTypewriter();
        return;
    }

    if (onAdvanceRequest) {
        onAdvanceRequest();
    } else {
        advanceDialogue();
    }
}

function skipTypewriter() {
    clearTimeout(typewriterTimeout);
    isTyping = false;
    textEl.textContent = currentTypingText;
    if (currentTypingOnComplete) {
        const cb = currentTypingOnComplete;
        currentTypingOnComplete = null;
        cb();
    }
}

export function initDialogue() {
    injectDialogueStyles();

    dialogueBoxEl = document.createElement('div');
    dialogueBoxEl.id = 'character-dialogue-box';

    portraitEl = document.createElement('img');
    portraitEl.id = 'dialogue-portrait';

    contentEl = document.createElement('div');
    contentEl.id = 'dialogue-content';

    textEl = document.createElement('p');
    textEl.id = 'dialogue-text';

    optionsEl = document.createElement('div');
    optionsEl.id = 'dialogue-options';

    contentEl.appendChild(textEl);
    contentEl.appendChild(optionsEl);

    dialogueBoxEl.appendChild(portraitEl);
    dialogueBoxEl.appendChild(contentEl);
    document.body.appendChild(dialogueBoxEl);

    dialogueBoxEl.addEventListener('click', handleBoxClick);

    setupDismissListeners();
}

function clearOptions() {
    optionsEl.innerHTML = '';
}

function renderOptions(options, nodeId) {
    clearOptions();

    options.forEach((option) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dialogue-option';
        btn.textContent = option.label;
        btn.addEventListener('click', () => selectOption(option, nodeId));
        optionsEl.appendChild(btn);
    });
}

function typeWriter(texto, index, velocidad, onComplete) {
    if (index < texto.length) {
        textEl.textContent = texto.substring(0, index + 1) + '▮';

        typewriterTimeout = setTimeout(() => {
            typeWriter(texto, index + 1, velocidad, onComplete);
        }, velocidad);
    } else {
        isTyping = false;
        textEl.textContent = texto;
        if (onComplete) onComplete();
    }
}

function selectOption(option, resolvedNodeId) {
    if (pendingNodeId !== resolvedNodeId) return;

    awaitingChoice = false;
    clearOptions();

    if (onAdvanceRequest) {
        onAdvanceRequest();
    }

    displayNode(option.next);
}

function displayNode(nodeId, avatarOverride) {
    const node = DIALOGUE_SEQUENCE[nodeId];
    if (!node) {
        console.warn(`[dialogue] Node "${nodeId}" does not exist in DIALOGUE_SEQUENCE.`);
        return;
    }

    isDialogueActive = false;

    clearTimeout(typewriterTimeout);
    clearTimeout(startDelayTimeout);
    clearOptions();
    textEl.textContent = '';
    isTyping = false;
    currentTypingText = '';
    currentTypingOnComplete = null;

    pendingNodeId = nodeId;

    const avatarUrl = avatarOverride || node.avatar || DEFAULT_AVATAR;
    if (avatarUrl) {
        portraitEl.src = avatarUrl;
        portraitEl.style.display = 'block';
    } else {
        portraitEl.style.display = 'none';
    }

    const DURATION_MS = 2000;
    const CalculatedVelocity = node.text.length > 0 ? DURATION_MS / node.text.length : 0;

    startDelayTimeout = setTimeout(() => {
        dialogueBoxEl.classList.add('visible');

        setTimeout(() => {
            isDialogueActive = true;
        }, 100);

        isTyping = true;
        currentTypingText = node.text;
        currentTypingOnComplete = () => {
            if (node.type === 'choice') {
                awaitingChoice = true;
                renderOptions(node.options, nodeId);
            } else {
                awaitingChoice = false;
                //If theres no "next" like the last node, it will just trigger itself
                pendingNodeId = node.next || nodeId;
            }
        };

        typeWriter(node.text, 0, CalculatedVelocity, () => currentTypingOnComplete && currentTypingOnComplete());
    }, 500);
}

export function advanceDialogue() {
    if (!dialogueBoxEl) return;
    displayNode(pendingNodeId);
}

export function hideDialogue() {
    if (!dialogueBoxEl || !isDialogueActive) return;

    clearTimeout(typewriterTimeout);
    clearTimeout(startDelayTimeout);

    dialogueBoxEl.classList.remove('visible');
    isDialogueActive = false;
}   
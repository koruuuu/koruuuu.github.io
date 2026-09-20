import { model, mixer, mouthMaterial } from './character-loader.js';
import { camera, renderer } from './scene.js';
import { initDialogue, advanceDialogue, setAdvanceRequestHandler } from './dialogue.js'; // NUEVO: setAdvanceRequestHandler
import * as THREE from 'three';

let paused = false;
let currentAction = null;
let currentState = 'idle';

let hablando = false;
let bocaActual = null;
let bocaActualTiempo = 0;

let idleTimerId = null;

const CLIPS = {
    ENTRADA: 'flufwave',
    BREATHING: 'breathingfluf',
    TALKING: 'talkingfluf',
    IDLE_VARIANTS: [
        'fluflookingaway',
        'staringfluf'
    ]
};

const IDLE_MIN_MS = 2000;
const IDLE_MAX_MS = 7000;

//Max distance to interact with fluf
const MAX_INTERACTION_DISTANCE = 23; 

//This is just for the fluftalk anim
const secuenciaBocas = [
    { tiempo: 0.0, boca: 'cerrada' },
    { tiempo: 0.54, boca: 'abierta' },
    { tiempo: 2.67, boca: 'cerrada' }
];

const bocas = {
    cerrada: { x: 0, y: 0 },
    abierta: { x: 0, y: 0.277 },
    derp: { x: 0.488, y: 0.277 },
    blep: { x: 0.488, y: 0 }
};

export function setBoca(nombre) {
    if (!mouthMaterial || !mouthMaterial.map) {
        console.warn('mouthMaterial or its texture (.map) does not exist yet.');
        return;
    }

    const off = bocas[nombre];

    if (!off) {
        console.warn(`Mouth "${nombre}" does not exist.`);
        return;
    }

    mouthMaterial.map.offset.set(off.x, off.y);
}

function actualizarBocaPorSecuencia() {
    if (!hablando) return;

    const action =
        window.allActions &&
        window.allActions[CLIPS.TALKING];

    if (!action) return;

    const t = action.time;

    let bocaDeseada =
        secuenciaBocas[0] ? secuenciaBocas[0].boca : 'cerrada';

    for (let i = 0; i < secuenciaBocas.length; i++) {
        if (secuenciaBocas[i].tiempo <= t) {
            bocaDeseada = secuenciaBocas[i].boca;
        } else {
            break;
        }
    }

    if (t < (bocaActualTiempo || 0) - 0.05) {
        bocaActual = null;
    }

    bocaActualTiempo = t;

    if (bocaDeseada !== bocaActual) {
        setBoca(bocaDeseada);
        bocaActual = bocaDeseada;
    }
}

// Crossfade between clips
function fadeToAction( nombre,
    {
        loop = THREE.LoopOnce,
        fadeDuration = 0.3
    } = {}) 
    {
    if (!window.allActions || !window.allActions[nombre]) {
        console.warn(
            'No existe ese clip. Disponibles:',
            Object.keys(window.allActions || {})
        );

        return null;
    }

    const nextAction = window.allActions[nombre];
    const prevAction = currentAction;

    nextAction.setLoop(loop, Infinity);
    nextAction.clampWhenFinished = loop === THREE.LoopOnce;

    if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(fadeDuration);
    }

    nextAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(fadeDuration)
        .play();

    currentAction = nextAction;

    return nextAction;
}

function goToBreathing() {
    currentState = 'breathing';

    fadeToAction(
        CLIPS.BREATHING,
        {
            loop: THREE.LoopRepeat
        }
    );

    scheduleIdle();
}

function scheduleIdle() {
    clearTimeout(idleTimerId);

    const delay = THREE.MathUtils.randInt(
        IDLE_MIN_MS,
        IDLE_MAX_MS
    );

    idleTimerId = setTimeout(() => {
        if (currentState === 'breathing') {
            triggerIdleVariant();
        }
    }, delay);
}

function triggerIdleVariant() {
    const opciones = CLIPS.IDLE_VARIANTS;

    const elegido =
        opciones[
            Math.floor(
                Math.random() * opciones.length
            )
        ];

    currentState = 'idle-variant';

    fadeToAction(
        elegido,
        {
            loop: THREE.LoopOnce
        }
    );
}

function startTalking() {
    clearTimeout(idleTimerId);

    currentState = 'talking';

    hablando = true;
    bocaActual = null;
    bocaActualTiempo = 0;

    advanceDialogue();

    fadeToAction(
        CLIPS.TALKING,
        {
            loop: THREE.LoopOnce,
            fadeDuration: 0.2
        }
    );
}

function stopTalking() {
    hablando = false;
    setBoca('cerrada');

    goToBreathing();
}

function onAnimationFinished(e) {
    if (!currentAction || e.action !== currentAction) {
        return;
    }

    if (currentState === 'entering') {
        goToBreathing();

    } else if (currentState === 'idle-variant') {
        goToBreathing();

    } else if (currentState === 'talking') {
        stopTalking(); 
    }
}

function requestDialogueAdvanceFromBox() {
    if (currentState === 'talking') return;
    startTalking();
}

let markerWorldPoint = null;
let exclamationEl = null;

let exclamationDismissed = false;
let isHovering = false;

const tempVec3 = new THREE.Vector3();

const TARGET_MESH_NAME = 'Cylinder';

function computeMarkerPoint() {
    if (!model) return;

    model.updateMatrixWorld(true);

    let targetMesh = null;
    model.traverse((child) => {
        if (child.isMesh && child.name === TARGET_MESH_NAME) {
            targetMesh = child;
        }
    });

    if (!targetMesh) {
        console.warn(`Mesh "${TARGET_MESH_NAME}" not found.`);
        return;
    }

    if (!targetMesh.geometry.boundingBox) {
        targetMesh.geometry.computeBoundingBox();
    }

    const box = targetMesh.geometry.boundingBox.clone();
    box.applyMatrix4(targetMesh.matrixWorld);

    const centerX = ((box.min.x + box.max.x) / 2) - 1.61;
    const centerZ = ((box.min.z + box.max.z) / 2) - 6.23;
    const topY = ((box.min.y + box.max.y) / 2);

    markerWorldPoint = new THREE.Vector3(
        centerX,
        topY,
        centerZ
    );
}

function injectOverlayStyles() {
    if (
        document.getElementById(
            'character-overlay-styles'
        )
    ) {
        return;
    }

    const style =
        document.createElement('style');

    style.id =
        'character-overlay-styles';

    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap');

        #character-exclamation {
            position: fixed;
            transform: translate(-50%, -50%);
            font-family: 'Fredoka', sans-serif;
            font-weight: 700;
            font-size: 50px;
            color: #ffca3a;
            -webkit-text-stroke: 2px #3a2505;
            text-shadow: 
                0 3px 0px rgba(58, 37, 5, 0.5),
                0 0 12px rgba(255, 202, 58, 0.4);
            opacity: 0;
            transition: opacity 0.4s ease;
            animation: character-exclaim-bounce 1.4s ease-in-out infinite;
            pointer-events: none;
            z-index: 21;
        }

        #character-exclamation.visible {
            opacity: 1;
        }

        @keyframes character-exclaim-bounce {
            0%, 100% {
                transform: translate(-50%, -50%) translateY(0px);
            }
            50% {
                transform: translate(-50%, -50%) translateY(-8px);
            }
        }
    `;

    document.head.appendChild(style);
}

function createOverlayElements() {
    injectOverlayStyles();

    exclamationEl = document.createElement('div');
    exclamationEl.id = 'character-exclamation';
    exclamationEl.textContent = '!';
    document.body.appendChild(exclamationEl);
}

function isCameraTooFar() {
    if (!markerWorldPoint || !camera) return false;
    return camera.position.distanceTo(markerWorldPoint) > MAX_INTERACTION_DISTANCE;
}

function updateOverlayPositions() {
    if (!markerWorldPoint || !exclamationEl) {
        return;
    }

    if (isCameraTooFar() || exclamationDismissed) {
        exclamationEl.style.display = 'none';
        exclamationEl.classList.remove('visible');
        return;
    }

    tempVec3.copy(markerWorldPoint);
    tempVec3.project(camera);

    if (tempVec3.z > 1) {
        exclamationEl.style.display = 'none';
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();

    const x =
        rect.left +
        (tempVec3.x * 0.5 + 0.5) *
        rect.width;

    const y =
        rect.top +
        (-tempVec3.y * 0.5 + 0.5) *
        rect.height;

    exclamationEl.style.display = '';
    exclamationEl.style.left = `${x}px`;
    exclamationEl.style.top = `${y}px`;
    exclamationEl.classList.add('visible');
}

//Character-OC detection
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let pointerDownPos = null;
const DRAG_THRESHOLD = 6;

let lastHoverCheck = 0;
const HOVER_THROTTLE_MS = 50;

function getPointerNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();

    return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
}

function onPointerDown(event) {
    if (isCameraTooFar()) return;
    pointerDownPos = {
        x: event.clientX,
        y: event.clientY
    };
}

function checkTargetIntersection() {
    const intersects = raycaster.intersectObject(model, true);
    return intersects.some(intersect => intersect.object.name === TARGET_MESH_NAME);
}

function onPointerUp(event) {
    if (isCameraTooFar() || !pointerDownPos || !model) {
        return;
    }

    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    const movedDist = Math.sqrt(dx * dx + dy * dy);

    pointerDownPos = null;

    if (movedDist > DRAG_THRESHOLD) {
        return;
    }

    const ndc = getPointerNDC(event);
    pointer.set(ndc.x, ndc.y);
    raycaster.setFromCamera(pointer, camera);

    if (checkTargetIntersection()) {
        onCharacterClick();
    }
}

function onPointerMove(event) {
    if (!model) return;

    if (isCameraTooFar()) {
        renderer.domElement.style.cursor = 'default';
        isHovering = false;
        return;
    }

    const now = performance.now();

    if (now - lastHoverCheck < HOVER_THROTTLE_MS) {
        return;
    }

    lastHoverCheck = now;

    const ndc = getPointerNDC(event);
    pointer.set(ndc.x, ndc.y);
    raycaster.setFromCamera(pointer, camera);

    const hoveringNow = checkTargetIntersection();

    if (hoveringNow !== isHovering) {
        isHovering = hoveringNow;
    }

    renderer.domElement.style.cursor = isHovering ? 'pointer' : 'default';
}

function onCharacterClick() {
    if (isCameraTooFar()) return;

    if (!exclamationDismissed) {
        exclamationDismissed = true;
    }

    if (currentState === 'talking') {
        return;
    }

    startTalking();
}

export function initCharacterInteraction() {
    if (!mixer) {
        console.warn(
            'initCharacterInteraction: mixer no existe todavía.'
        );
        return;
    }

    mixer.addEventListener('finished', onAnimationFinished);

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    createOverlayElements();
    initDialogue();
    setAdvanceRequestHandler(requestDialogueAdvanceFromBox);
    computeMarkerPoint();

    currentState = 'entering';

    fadeToAction(
        CLIPS.ENTRADA,
        {
            loop: THREE.LoopOnce,
            fadeDuration: 0
        }
    );
}

export function updateCharacter(delta) {
    if (mixer) {
        mixer.update(delta);
    }

    actualizarBocaPorSecuencia();

    updateOverlayPositions();
}
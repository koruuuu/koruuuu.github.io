import * as THREE from 'three';
import { camera, renderer } from './scene.js';
import { model } from './character-loader.js';

//The keyframes are the main handler of the camera movement, we set xyz coordinates and a value from 0-1, the camera will move through them in a linear progress
const keyframes = [
    { progress: 0.00, position: new THREE.Vector3(6.07, 8.00, 16.32), target: new THREE.Vector3(6.13, 0.00, 16.45) },
    { progress: 0.12, position: new THREE.Vector3(5.12, 16.07, 14.10), target: new THREE.Vector3(6.13, 0.00, 16.45) },
    { progress: 0.24, position: new THREE.Vector3(3.18, 19.97, 7.77), target: new THREE.Vector3(6.72, 0.91, 17.88) },
    { progress: 0.36, position: new THREE.Vector3(0.76, 19.92, -5.34), target: new THREE.Vector3(7.87, 11.89, 23.60) }, //Start of 1st project
    { progress: 0.46, position: new THREE.Vector3(0.76, 19.92, -5.34), target: new THREE.Vector3(7.87, 11.89, 23.60) }, //End of 1st project
    { progress: 0.48, position: new THREE.Vector3(0.49, 18.48, -9.03), target: new THREE.Vector3(7.84, 12.16, 23.62) }, //Start of 2nd project
    { progress: 0.58, position: new THREE.Vector3(0.49, 18.48, -9.03), target: new THREE.Vector3(7.84, 12.16, 23.62) }, //End of 2nd project
    { progress: 0.76, position: new THREE.Vector3(-2.48, 18.37, -21.41), target: new THREE.Vector3(6.78, 15.48, 21.30) },
    { progress: 0.85, position: new THREE.Vector3(-4.26, -2.18, -35.58), target: new THREE.Vector3(2.11, 29.39, 13.68) },
    { progress: 0.90, position: new THREE.Vector3(-30.33, -27.54, -50.45), target: new THREE.Vector3(2.11, 29.39, 13.68) },
    { progress: 1.00, position: new THREE.Vector3(-65.41, -40.25, -60.38), target: new THREE.Vector3(2.11, 29.39, 13.68) },
];

//Values for determining if the device is a phone or a pc/laptop.
const isMobile = window.innerWidth < 768;
const MOBILE_DISTANCE_MULTIPLIER = 1.8;
const MAX_MOBILE_DISTANCE = 160; //Since the model will look buggy if we get too far, we limit the distante

function applyMobileDistanceAdjustment(position, target) {
    if (!isMobile) return;

    position.sub(target).multiplyScalar(MOBILE_DISTANCE_MULTIPLIER);

    if (position.length() > MAX_MOBILE_DISTANCE) {
        position.setLength(MAX_MOBILE_DISTANCE);
    }

    position.add(target);
}

//Target and position the  will be next following
const desiredPosition = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();

const currentTarget = new THREE.Vector3();
const timer = new THREE.Timer();
const CAMERA_SMOOTHNESS = 15;

export function getScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll <= 0) return 0;

    return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateDesiredFromProgress(progress) {
    //We try to find where the next progress-keyframe will be at
    let start = keyframes[0];
    let end = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
            start = keyframes[i];
            end = keyframes[i + 1];
            break;
        }
    }

    const range = end.progress - start.progress;
    const localT = range > 0 ? (progress - start.progress) / range : 0;
    const t = easeInOutCubic(localT);

    desiredPosition.lerpVectors(start.position, end.position, t);
    desiredTarget.lerpVectors(start.target, end.target, t);
    applyMobileDistanceAdjustment(desiredPosition, desiredTarget);
    updateEndOverlayVisibility(progress);
    updateProjectVisibility(progress);
}

//If its false, updateCamera() wont work
export let scrollCameraActive = true;
export function setScrollCameraActive(active) {
    scrollCameraActive = active;
    console.log(`[camera] scroll-camera ${active ? 'ACTIVATED' : 'DEACTIVATED'}`);
}

window.setScrollCameraActive = setScrollCameraActive;
//Manual scroll
let returnAnimationId = null;

function smoothScrollTo(targetY, duration = 2200) {
    if (returnAnimationId !== null) {
        cancelAnimationFrame(returnAnimationId);
        returnAnimationId = null;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) return;

    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(t);

        window.scrollTo(0, startY + distance * eased);
        if (t < 1) {
            returnAnimationId = requestAnimationFrame(step);
        } else {
            returnAnimationId = null;
        }
    }
    returnAnimationId = requestAnimationFrame(step);
}

function volverAlInicio() {
    smoothScrollTo(0, 2200);
}

//Ending overlay
const END_THRESHOLD = 0.93;
const END_TITLE = 'You\'ve reached the ending!';
const END_SUBTITLE = 'As you may\'ve noticed, this is still a really early version of the page! More planets and stuff will be added as time goes by ^^';

let endOverlayEl = null;
let endOverlayVisible = false;

//The only possible way of making this work was by injecting the css and html, since its dynamic and will appear and not appear, this is more simple than tinkering with the html and css file (at least for me)
function injectEndOverlayStyles() {
    if (document.getElementById('end-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'end-overlay-styles';

    style.textContent = `
        #end-overlay {
            position: fixed;
            top: 32%;
            right: 5%;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            text-align: center;
            opacity: 0;
            transform: translateY(-20px);
            pointer-events: none;
            transition: opacity 0.6s ease, transform 0.6s ease;
            z-index: 30;
        }

        #end-overlay.visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        #end-overlay h2 {
            margin: 0;
            font-family: 'Fredoka', cursive !important;
            font-size: 60px;
            color: #ffe066;
            -webkit-text-stroke: 3px #4a3200;
            paint-order: stroke fill;
            letter-spacing: 1px;
            text-shadow: 0 0 10px rgba(255, 224, 102, 0.5);
            line-height: 1.1;
            text-align: center;
            width: 100%;
        }

        #end-overlay p {
            margin: 0;
            font-family: 'Fredoka', cursive !important;
            color: rgba(218, 218, 218, 0.95);
            font-size: 16px;
            letter-spacing: 0.5px;
            -webkit-text-stroke: 1px #000;
            paint-order: stroke fill;
        }

        #end-overlay-link {
            margin-top: 16px;
            font-family: 'Luckiest Guy', cursive !important;
            font-size: 24px;
            color: rgba(214, 214, 214, 0.85);
            letter-spacing: 0.8px;
            cursor: pointer;
            align-self: center;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            user-select: none;
            -webkit-text-stroke: 1px #000;
            paint-order: stroke fill;
            text-shadow: 2px 2px 0px #000;
            transition: color 0.2s ease, transform 0.2s ease;
        }

        #end-overlay-link:hover {
            color: #ffffff;
            transform: translateX(-2px);
        }

        #end-overlay-link:active {
            transform: translateX(-2px) scale(0.98);
        }

        @media (max-width: 768px) {
            #end-overlay {
                top: 20%;
                left: 5%;
                right: 5%;
                align-items: center;
                width: 90%;
                margin: 0 auto;
            }

            #end-overlay h2 {
                font-size: 36px;
                -webkit-text-stroke: 2px #4a3200;
            }

            #end-overlay p {
                font-size: 14px;
            }

            #end-overlay-link {
                font-size: 20px;
                margin-top: 10px;
            }
        }
    `;

    document.head.appendChild(style);
}

function createEndOverlay() {
    if (endOverlayEl) return;

    injectEndOverlayStyles();

    endOverlayEl = document.createElement('div');
    endOverlayEl.id = 'end-overlay';

    endOverlayEl.innerHTML = `
        <h2>${END_TITLE}</h2>
        <p>${END_SUBTITLE}</p>
        <span id="end-overlay-link" role="button" tabindex="0">
            ⬅ Return to start
        </span>
    `;

    document.body.appendChild(endOverlayEl);

    const link = endOverlayEl.querySelector('#end-overlay-link');

    link.addEventListener('click', volverAlInicio);
}

function updateEndOverlayVisibility(progress) {
    if (!endOverlayEl) return;

    const shouldShow = progress >= END_THRESHOLD;

    if (shouldShow !== endOverlayVisible) {
        endOverlayVisible = shouldShow;
        endOverlayEl.classList.toggle('visible', shouldShow);
    }
}

//Overlay for projects
//Ive coded this in spanish and changing it will take a lot of time xdxdxdxdxdxdxdxdxdxdxdxd
const PROYECTOS = [
    {
        id: 'proyecto1',
        startProgress: 0.36,
        endProgress: 0.46,

        titulo: 'Web Portfolio',

        descripcion:
            'The site you\'re browsing right now! Built with custom 3D models from scratch including character animations and dynamic JavaScript effects.',

        detalleCompleto:
            'This web portfolio was mainly done with two technologies, those being Blender and Javascript. All models have been made from scratch using Blender as the 3D Software tool, as well as the animations, materials and colors of the models. All 3D assets have been loaded and configured using the JavaScript framework called Three.js, this framework has been used for the overall loading of the models, setting up the animations made in Blender and adding camera and lights as well as things like raycaster for the main character detection (but more technical things will be covered more in detail in the pdf). This page uses a basic HTML and CSS for the main structure of the page itself, but heavily relies in JavaScript due to it\'s dynamic style. If you want a technical and deep guide about the page creation process, technologies used and overall the whole creation process of this project you can check the pdf which can be accessed by clicking the "show detailed pdf" text.',

        pdfUrl: 'https://docs.google.com/document/d/18YDqI7iLxu77oz3wMdyr6a0WYbchcw_rI147Y_ZS-hQ/edit?usp=sharingf',

        tecnologias: [
            'Three.js',
            'JavaScript',
            'HTML',
            'CSS',
            'Blender'
        ],

        objetoPrefijo: 'Cylinder002',
    },

    {
        id: 'proyecto2',
        startProgress: 0.48,
        endProgress: 0.58,

        titulo: 'WIP',

        descripcion:
            'I currently have no more projects to showcase, nevertheless they are undergoing!',

        detalleCompleto: '',

        pdfUrl: '',

        tecnologias: [
            //si en un futuro se pone el proyecto poner las tecnologias
        ],

        objetoPrefijo: 'WIP_area',
    },
];

let projectOverlayEl = null;
let activeProject = null;

function injectProjectOverlayStyles() {
    if (document.getElementById('project-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'project-overlay-styles';

    style.textContent = `
        #project-overlay {
            position: fixed;
            left: 50%;
            bottom: 35%;

            width: min(480px, calc(100vw - 32px));

            max-height: 70vh;
            overflow-y: auto;

            box-sizing: border-box;

            padding: 18px 22px;

            background: #ffffff;
            border-radius: 16px;
            border: 2px solid #e5e7eb;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);

            text-align: center;
            opacity: 0;
            pointer-events: none;

            transform: translate(-50%, 10px);

            transition:
                opacity 0.4s ease,
                transform 0.4s ease;

            z-index: 25;
        }

        #project-overlay::-webkit-scrollbar {
            width: 6px;
        }

        #project-overlay::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 10px;
        }

        #project-overlay::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }

        #project-overlay.visible {
            opacity: 1;
            transform: translate(-50%, 0);
            pointer-events: auto;
        }

        #project-overlay h3 {
            margin: 0 0 8px 0;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-weight: 700;
            font-size: 32px;
            line-height: 1.2;

            color: #fcd743;
            -webkit-text-stroke: 1.2px #4a3200;
            paint-order: stroke fill;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        #project-overlay p {
            margin: 0;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-weight: 500;
            font-size: 14px;
            line-height: 1.45;

            color: #374151;
            word-break: break-word;
        }

        #project-overlay .project-technologies {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
        }

        #project-overlay .technology {
            display: inline-block;
            padding: 4px 9px;

            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-size: 11px;
            font-weight: 500;
            color: #4b5563;
            white-space: nowrap;
        }

        #project-overlay .show-more-link {
            margin-top: 14px;

            display: inline-flex;
            align-items: center;
            gap: 5px;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-weight: 500;
            font-size: 13px;
            color: #9a7b1a;

            cursor: pointer;
            user-select: none;
            transition: color 0.2s ease;
        }

        #project-overlay .show-more-link:hover {
            color: #4a3200;
        }

        #project-overlay .show-more-link .show-more-arrow {
            display: inline-block;
            font-size: 10px;
            line-height: 1;
            transform: translateY(1px);
        }

        @media (max-width: 600px) {
            #project-overlay {
                bottom: 18%;
                padding: 16px 18px;
            }

            #project-overlay h3 {
                font-size: 22px;
            }

            #project-overlay p {
                font-size: 13px;
            }

            #project-overlay .technology {
                font-size: 10px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #project-overlay {
                transition: opacity 0.2s ease;
            }
        }
    `;

    document.head.appendChild(style);
}

function createProjectOverlay() {
    if (projectOverlayEl) return;

    injectProjectOverlayStyles();

    projectOverlayEl = document.createElement('div');
    projectOverlayEl.id = 'project-overlay';

    projectOverlayEl.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="project-technologies"></div>
        <span class="show-more-link" role="button" tabindex="0">
            Show more
            <span class="show-more-arrow">▼</span>
        </span>
    `;

    document.body.appendChild(projectOverlayEl);

    const showMoreLink =
        projectOverlayEl.querySelector('.show-more-link');

    showMoreLink.addEventListener('click', () => {
        if (activeProject) {
            openDetailModal(activeProject);
        }
    });
}

// Big Screen + pdf thing
let detailModalEl = null;
let detailModalOpen = false;

function injectDetailModalStyles() {
    if (document.getElementById('detail-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'detail-modal-styles';

    style.textContent = `
        #detail-modal-backdrop {
            position: fixed;
            inset: 0;

            background: rgba(10, 10, 20, 0.65);
            backdrop-filter: blur(4px);

            display: flex;
            align-items: center;
            justify-content: center;

            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;

            z-index: 50;
        }

        #detail-modal-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
        }

        #detail-modal-panel {
            position: relative;

            width: min(720px, calc(100vw - 40px));
            max-height: min(80vh, 640px);
            overflow-y: auto;

            box-sizing: border-box;
            padding: 40px 36px;

            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);

            transform: scale(0.94);
            transition: transform 0.3s ease;
        }

        #detail-modal-backdrop.visible #detail-modal-panel {
            transform: scale(1);
        }

        #detail-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;

            width: 34px;
            height: 34px;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #f3f4f6;
            border: none;
            border-radius: 50%;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-size: 18px;
            font-weight: 700;
            color: #374151;

            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        #detail-modal-close:hover {
            background: #e5e7eb;
            transform: scale(1.08);
        }

        .modal-header-container {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
            padding-right: 36px;
        }

        .modal-header-container h3 {
            margin: 0;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-weight: 700;
            font-size: 34px;
            line-height: 1.2;

            color: #fcd743;
            -webkit-text-stroke: 1.2px #4a3200;
            paint-order: stroke fill;
        }

        #detail-pdf-link {
            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-size: 14px;
            font-weight: 500;
            color: #9a7b1a;
            text-decoration: underline;
            cursor: pointer;
            transition: color 0.2s ease;
            white-space: nowrap;
        }

        #detail-pdf-link:hover {
            color: #4a3200;
        }

        #detail-modal-panel p {
            margin: 0;

            font-family: 'Fredoka', 'Comic Sans MS', sans-serif !important;
            font-weight: 500;
            font-size: 15px;
            line-height: 1.6;

            color: #374151;
            white-space: pre-line;
        }

        @media (max-width: 600px) {
            #detail-modal-panel {
                padding: 32px 22px;
            }

            .modal-header-container {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }

            .modal-header-container h3 {
                font-size: 24px;
            }

            #detail-modal-panel p {
                font-size: 14px;
            }
        }
    `;

    document.head.appendChild(style);
}

function createDetailModal() {
    if (detailModalEl) return;

    injectDetailModalStyles();

    detailModalEl = document.createElement('div');
    detailModalEl.id = 'detail-modal-backdrop';

    detailModalEl.innerHTML = `
        <div id="detail-modal-panel">
            <button
                type="button"
                id="detail-modal-close"
                aria-label="Cerrar"
            >
                ✕
            </button>

            <div class="modal-header-container">
                <h3></h3>

                <a
                    id="detail-pdf-link"
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    show detailed pdf ⤓
                </a>
            </div>

            <p></p>
        </div>
    `;

    document.body.appendChild(detailModalEl);

    detailModalEl.addEventListener('click', (event) => {
        if (event.target === detailModalEl) {
            closeDetailModal();
        }
    });

    detailModalEl
        .querySelector('#detail-modal-close')
        .addEventListener('click', closeDetailModal);

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && detailModalOpen) {
            closeDetailModal();
        }
    });
}

function openDetailModal(proyecto) {
    if (!detailModalEl) return;

    const title = detailModalEl.querySelector('h3');
    const description = detailModalEl.querySelector('p');
    const pdfLink = detailModalEl.querySelector('#detail-pdf-link');

    title.textContent = proyecto.titulo;

    description.textContent = proyecto.detalleCompleto && proyecto.detalleCompleto.trim().length > 0 ? proyecto.detalleCompleto : proyecto.descripcion;
    if (proyecto.pdfUrl && proyecto.pdfUrl.trim().length > 0) {
        pdfLink.href = proyecto.pdfUrl;
        pdfLink.style.display = 'inline';
    } else {
        pdfLink.style.display = 'none';
    }

    detailModalEl.classList.add('visible');
    detailModalOpen = true;
}

function closeDetailModal() {
    if (!detailModalEl) return;

    detailModalEl.classList.remove('visible');
    detailModalOpen = false;
}

//Line going to the 3d object - building
const meshesCache = new Map();
const projBox = new THREE.Box3();
const projVec = new THREE.Vector3();

function getMeshesByPrefix(prefijo) {
    if (!model || !prefijo) return [];

    if (meshesCache.has(prefijo)) {
        return meshesCache.get(prefijo);
    }

    const meshes = [];

    model.traverse((child) => {
        if (
            child.isMesh &&
            child.name.startsWith(prefijo)
        ) {
            child.geometry.computeBoundingBox();
            meshes.push(child);
        }
    });

    meshesCache.set(prefijo, meshes);
    return meshes;
}

function computeObjectAnchor(prefijo) {
    const meshes = getMeshesByPrefix(prefijo);

    if (meshes.length === 0) return null;

    projBox.makeEmpty();

    meshes.forEach((mesh) => {
        const b = mesh.geometry.boundingBox.clone();

        b.applyMatrix4(mesh.matrixWorld);
        projBox.union(b);
    });

    const center = new THREE.Vector3();
    projBox.getCenter(center);

    return new THREE.Vector3(
        center.x,
        projBox.max.y + 0.3,
        center.z
    );
}

const SVG_NS = 'http://www.w3.org/2000/svg';

let connectorSvg = null;
let connectorLine = null;

function createConnector() {
    if (connectorSvg) return;

    connectorSvg = document.createElementNS(SVG_NS, 'svg');
    connectorSvg.setAttribute('id', 'project-connector');

    Object.assign(connectorSvg.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '24',
        opacity: '0',
        transition: 'opacity 0.5s ease',
    });

    connectorLine = document.createElementNS(
        SVG_NS,
        'line'
    );

    connectorLine.setAttribute(
        'stroke',
        '#ffe066'
    );

    connectorLine.setAttribute(
        'stroke-width',
        '2'
    );

    connectorSvg.appendChild(connectorLine);
    document.body.appendChild(connectorSvg);
}

function updateConnectorLine() {
    if (!connectorSvg) return;

    if (
        !activeProject ||
        !activeProject.objetoPrefijo
    ) {
        connectorSvg.style.opacity = '0';
        return;
    }

    const anchor = computeObjectAnchor(
        activeProject.objetoPrefijo
    );

    if (!anchor) {
        connectorSvg.style.opacity = '0';
        return;
    }

    projVec.copy(anchor).project(camera);

    if (projVec.z > 1) {
        connectorSvg.style.opacity = '0';
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();

    let targetX;
    let targetY;

    if (window.innerWidth < 768) {
        //phone
        targetX = (rect.left + (projVec.x * 0.5 + 0.5) * rect.width) - 7;
        targetY = (rect.top + (-projVec.y * 0.5 + 0.5) * rect.height) + 20;
    } else {
        targetX = (rect.left + (projVec.x * 0.5 + 0.5) * rect.width) - 85;
        targetY = (rect.top + (-projVec.y * 0.5 + 0.5) * rect.height) + 120;
    }

    const panelRect = projectOverlayEl.getBoundingClientRect();
    const startX = panelRect.left + panelRect.width / 2;
    const startY = panelRect.top + 5;

    connectorLine.setAttribute('x1', startX);
    connectorLine.setAttribute('y1', startY);
    connectorLine.setAttribute('x2', targetX);

    connectorLine.setAttribute('y2', targetY);

    connectorSvg.style.opacity = '1';
}

function updateProjectVisibility(progress) {
    if (!projectOverlayEl) return;

    const match = PROYECTOS.find(
        (p) =>
            progress >= p.startProgress &&
            progress <= p.endProgress
    );

    if (match !== activeProject) {
        activeProject = match || null;

        if (detailModalOpen) {
            closeDetailModal();
        }

        if (activeProject) {
            const title =
                projectOverlayEl.querySelector('h3');

            const description =
                projectOverlayEl.querySelector('p');

            const technologies =
                projectOverlayEl.querySelector(
                    '.project-technologies'
                );

            const showMoreLink =
                projectOverlayEl.querySelector(
                    '.show-more-link'
                );

            title.textContent =
                activeProject.titulo;

            description.textContent =
                activeProject.descripcion;

            technologies.innerHTML = '';

            activeProject.tecnologias.forEach(
                (tecnologia) => {
                    const tag =
                        document.createElement('span');

                    tag.className = 'technology';
                    tag.textContent = tecnologia;

                    technologies.appendChild(tag);
                }
            );

            //This hides the "Show more" if we have something that doesnt have any info like the WIP
            const hasDetail =
                activeProject.detalleCompleto &&
                activeProject.detalleCompleto.trim().length > 0;

            showMoreLink.style.display =
                hasDetail
                    ? 'inline-flex'
                    : 'none';

            projectOverlayEl.classList.add(
                'visible'
            );

        } else {
            projectOverlayEl.classList.remove(
                'visible'
            );

            if (connectorSvg) {
                connectorSvg.style.opacity = '0';
            }
        }
    }
}

export function initScrollCamera() {
    desiredPosition.copy(camera.position);

    desiredTarget.set(6.13, 0.00, 16.45);
    currentTarget.copy(desiredTarget);
    camera.lookAt(currentTarget);

    createEndOverlay();
    createProjectOverlay();
    createDetailModal();
    createConnector();

    window.addEventListener('scroll', () => {
        updateDesiredFromProgress(
            getScrollProgress()
        );
    });

    updateDesiredFromProgress(
        getScrollProgress()
    );
}

export function updateScrollCamera() {
    if (!scrollCameraActive) return;

    timer.update();

    const delta = Math.min(timer.getDelta(), 0.05);

    // Frame-rate independent smoothing
    const smoothing = 1 - Math.exp(-CAMERA_SMOOTHNESS * delta);

    camera.position.lerp(desiredPosition, smoothing);
    currentTarget.lerp(desiredTarget, smoothing);

    camera.lookAt(currentTarget);

    updateConnectorLine();
}

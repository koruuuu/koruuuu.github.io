import * as THREE from 'three';
import {scene, camera, renderer} from './scene.js';
import {createStarField, spawnShootingStars, updateShootingStars} from './background.js';
import { loadCharacter } from './character-loader.js';
import {initCharacterInteraction, updateCharacter} from './character-controller.js';
import {initScrollCamera, updateScrollCamera} from './camera.js';
import { updatePlanetRotation } from './planet-rotation.js';

createStarField();

loadCharacter(() => {
    initCharacterInteraction();
});

initScrollCamera();

const clock = new THREE.Timer();
const introText = document.getElementById('intro-text');

function updateIntroText() {
    if (!introText) return;

    if (!window.introLoaded) {
        introText.style.opacity = 0;
        introText.style.transform =
            'translate(-50%, -50%) translateY(40px)';

        return;
    }

    if (!window.introStartTime) {
        window.introStartTime = performance.now();
    }

    const introDuration = 3000;

    const elapsed = performance.now() - window.introStartTime;
    const introProgress = Math.min(elapsed / introDuration, 1);
    const smoothProgress = 1 - Math.pow(1 - introProgress, 3);
    const scroll = window.scrollY;
    const fadeDistance = window.innerHeight * 0.5;
    const scrollProgress = Math.min(scroll / fadeDistance, 1);
    const opacity = smoothProgress * (1 - scrollProgress);
    const y = 40 * (1 - smoothProgress) - 100 * scrollProgress;
    introText.style.opacity = opacity;
    introText.style.transform =
        `translate(-50%, -50%) translateY(${y}px)`;
}


function animate() {
    requestAnimationFrame(animate);
    clock.update();
    const delta = clock.getDelta();

    updateCharacter(delta);
    updateScrollCamera();
    updatePlanetRotation(delta);
    updateIntroText();

    spawnShootingStars();
    updateShootingStars();
    renderer.render(scene, camera);
}

animate();
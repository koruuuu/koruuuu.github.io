import * as THREE from 'three';
export const canvas = document.getElementById('experience-canvas');
export const scene = new THREE.Scene();

scene.background = new THREE.Color(0x000011);

export const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

export const camera = new THREE.PerspectiveCamera(
    50,
    sizes.width / sizes.height,
    0.01,
    1000
);

export const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Debug purposes
window.camera = camera;

const isMobile = window.innerWidth < 768;

if (isMobile) {
    camera.position.set(6.07, 11, 16.32);
} else {
    camera.position.set(6.07, 10, 16.32);
}

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

export function handleResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', handleResize);

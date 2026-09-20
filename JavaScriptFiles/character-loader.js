import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from './scene.js';

const info = document.getElementById('info');
const MODEL_ROUTE = '../Models/portofolio.glb';

export let model = null;
export let mixer = null;
export let mouthMaterial = null;

export function loadCharacter(onLoaded) {
    const loader = new GLTFLoader();
    loader.load(
        MODEL_ROUTE,
        (gltf) => {
            model = gltf.scene;
            scene.add(model);

            const introText = document.getElementById('intro-text');
            if (introText) {
                introText.classList.add('show');
                window.introLoaded = true; 
            }

            console.log('Model charged succesfully.');
            console.log('Available animations:', gltf.animations.map((a) => a.name));

            model.traverse((child) => {
                if (child.isMesh) {
                    console.log(
                        'Mesh found:', child.name, '-> materials:',
                        Array.isArray(child.material) ? child.material.map((m) => m.name) : child.material.name
                    );

                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    const found = materials.find((m) => m.name.toLowerCase().includes('mouth'));
                    if (found) {
                        mouthMaterial = found;
                        console.log('>>> Mouth material found:  "' + child.name + '":', found.name);
                    }
                }
            });

            if (!mouthMaterial) {
                console.error('No mesh with mouth name was found. Recheck.');
                if (info) info.innerHTML = 'ERROR: No mouth mesh was found, check console for more details.';
            } else {
                //if (info) info.innerHTML = 'Q = Wave | E = Talk | 1-4 Mouth Swap | Space = Stop';
            }

            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);

                window.allActions = {};
                gltf.animations.forEach((clip) => {
                    window.allActions[clip.name] = mixer.clipAction(clip);
                });
            }
            if (onLoaded) onLoaded(model, gltf);
        },
        (xhr) => {
            console.log('Loading: ' + ((xhr.loaded / xhr.total) * 100).toFixed(0) + '%');
        },
        (error) => {
            console.error('Error loading the model:', error);
            if (info) {
                info.innerHTML = 'ERROR loading "' + MODEL_ROUTE + '". Check the direction of the file again.';
            } else {
                console.warn('No #info was found');
            }
        }
    );
}

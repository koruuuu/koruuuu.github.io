import { model } from './character-loader.js';
import { getScrollProgress } from './camera.js';

// A partir de qué progress (0-1) empieza a girar. Ajusta esto al punto
// donde la cámara ya está lejos (ej. tu keyframe de 0.85 en camera.js).
const ROTATION_START = 0.85;

// Velocidad de giro en radianes por segundo. 0.3 ≈ una vuelta completa cada ~21s.
const ROTATION_SPEED = 0.3;

// Si prefieres que empiece despacio y acelere en vez de encender/apagar de
// golpe, puedes suavizar la velocidad según cuánto has pasado ROTATION_START.
const SMOOTH_RAMP = true;

// Velocidad con la que vuelve a su rotación original al hacer scroll hacia atrás
const RETURN_LERP = 0.05;

let initialRotationY = null;

// Interpola un ángulo hacia otro por el camino más corto, sin importar
// cuántas vueltas completas lleve acumuladas (evita "desenrollar" vuelta
// a vuelta cuando ha girado mucho).
function shortestAngleLerp(current, target, t) {
    const twoPi = Math.PI * 2;
    let delta = (target - current) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (delta < -Math.PI) delta += twoPi;
    return current + delta * t;
}

// Se llama cada frame desde el loop principal en main.js
export function updatePlanetRotation(delta) {
    if (!model) return;

    // Guardamos la rotación con la que llegó el modelo la primera vez que
    // tenemos referencia a él (por si no es exactamente 0)
    if (initialRotationY === null) {
        initialRotationY = model.rotation.y;
    }

    const progress = getScrollProgress();

    if (progress < ROTATION_START) {
        // Scroll hacia atrás / aún no llegamos al punto de giro:
        // volvemos suavemente a la rotación original por el camino más corto
        model.rotation.y = shortestAngleLerp(model.rotation.y, initialRotationY, RETURN_LERP);
        return;
    }

    let speed = ROTATION_SPEED;

    if (SMOOTH_RAMP) {
        // 0 justo en ROTATION_START, 1 al llegar al final del scroll (progress = 1)
        const ramp = (progress - ROTATION_START) / (1 - ROTATION_START);
        speed = ROTATION_SPEED * Math.min(ramp, 1);
    }

    model.rotation.y += delta * speed;
}

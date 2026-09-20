import * as THREE from 'three';
import { scene } from './scene.js';

let shootingStars = [];

export function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 2000;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        sizeAttenuation: true,
    });

    const stars = new THREE.Points(
        starGeometry,
        starMaterial
    );

    scene.add(stars);
    return stars;
}

function createShootingStar() {
    //We make it start at random points, then we add movement (finishing point) and make it travel
    const startX = (Math.random() - 0.5) * 1200;
    const startY = (Math.random() - 0.5) * 700;
    const startZ = -400 + Math.random() * 600;

    const start = new THREE.Vector3(startX, startY, startZ);
    const direction = new THREE.Vector3(-1, -0.35, 0).normalize(); //Direction the star will follow
    const tailLength = 25; //This is just the trail we see

    const end = start.clone().sub(direction.clone().multiplyScalar(tailLength));
    
    //Shape and color/material of the stars
    const geometry = new THREE.BufferGeometry().setFromPoints([end, start]);
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
    });

    const shootingStar = new THREE.Line(geometry, material);
    shootingStar.position.set(0, 0, 0);
    scene.add(shootingStar);

    shootingStars.push({
        object: shootingStar,
        velocity: direction.multiplyScalar(8),
        life: 0,
        maxLife: 80,
        start: start,
    });
}

//Function to make the stars actually move constantly 
export function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.life++;

        //Movement
        star.object.position.add(star.velocity);

        //Fade in
        if (star.life < 10) {
            star.object.material.opacity = star.life / 10;
        } else if (star.life > star.maxLife - 20) { //Fade out
            star.object.material.opacity = (star.maxLife - star.life) / 20;
        }

        //Once it reached the limit, we "eliminate" it
        if (star.life >= star.maxLife) {

            scene.remove(star.object);

            star.object.geometry.dispose();
            star.object.material.dispose();

            shootingStars.splice(i, 1);
        }
    }
}


//This is for a random generation of starts
let shootingStarTimer = 0;
export function spawnShootingStars() {
    shootingStarTimer--;

    if (shootingStarTimer <= 0) {
        createShootingStar();
        //Random star generator(life/timer) 
        shootingStarTimer = 60 + Math.random() * 180;
    }
}

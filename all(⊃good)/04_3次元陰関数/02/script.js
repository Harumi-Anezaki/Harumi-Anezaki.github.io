import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#myCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ここに陰関数の描画コードを追加します
const geometry = new THREE.BufferGeometry();
const vertices = [];

// 例として、単純な陰関数 x^2 + y^2 + z^2 - 1 = 0 の点を生成
for (let x = -1; x <= 1; x += 0.1) {
    for (let y = -1; y <= 1; y += 0.1) {
        for (let z = -1; z <= 1; z += 0.1) {
            if (Math.abs(x * x + y * y + z * z - 1) < 0.1) {
                vertices.push(x, y, z);
            }
        }
    }
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
const material = new THREE.PointsMaterial({ color: 0x00ff00 });
const points = new THREE.Points(geometry, material);
scene.add(points);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

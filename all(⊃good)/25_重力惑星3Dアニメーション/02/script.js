import * as THREE from 'https://threejs.org/build/three.module.js';

// ユーティリティ関数
function getRandomNeonColor() {
    const hue = Math.random() * 360;
    const color = new THREE.Color();
    color.setHSL(hue / 360, 1, 0.5);
    return color;
}

// 定数
const NUM_SPHERES = 20;
const GRAVITY = 0.05;
const NUM_PARTICLES = 10000;

// 1. 初期設定
let scene, camera, renderer;
let spheres = [];
let particles;
let targetSphere; // targetSphere をグローバルスコープで宣言

function init() {
    // 1.2. シーン、カメラ、レンダラーの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // 2. 球体の作成と配置
    for (let i = 0; i < NUM_SPHERES; i++) {
        // 2.1. 球体のジオメトリとマテリアルの作成
        const radius = Math.random() * 1.5 + 0.5;
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: getRandomNeonColor() });
        const sphere = new THREE.Mesh(geometry, material);

        // 2.2. 球体の配置
        sphere.position.x = Math.random() * 20 - 10;
        sphere.position.y = Math.random() * 20;
        sphere.position.z = Math.random() * 20 - 10;
        scene.add(sphere);

        spheres.push({
            mesh: sphere,
            velocity: 0,
            radius: radius,
            damping: 0.8 + Math.random() * 0.15 //0.8〜0.95
        });
    }

    // 3. 地面の作成
    // 3.1. 平面ジオメトリとマテリアルの作成
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });

    // 3.2. 平面の配置
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    scene.add(plane);

    // 7. 背景(星空)の作成
    // 7.1. パーティクルのジオメトリとマテリアルの作成
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NUM_PARTICLES * 3);
    const opacities = new Float32Array(NUM_PARTICLES); // 各パーティクルの opacity を格納する配列

    for (let i = 0; i < NUM_PARTICLES; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 1000;
        positions[i3 + 1] = (Math.random() - 0.5) * 1000;
        positions[i3 + 2] = (Math.random() - 0.5) * 1000;
        opacities[i] = 0.6 + (Math.random() - 0.5) * 0.4; // 初期 opacity を設定
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1)); // opacity 属性を追加


    const particleMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0xeeeeee,
        transparent: true,
        // opacity: 0.6, // ここは削除
        blending: THREE.AdditiveBlending,
        vertexColors: true, // これを追加
    });

    // 7.2. パーティクルシステムの作成
    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 5. カメラ(視点)の設定
    // 5.1. 特定の球体の選択
    targetSphere = spheres[0]; // グローバル変数の targetSphere を初期化

    // 5.2. カメラの位置設定
    camera.position.x = targetSphere.mesh.position.x;
    camera.position.z = targetSphere.mesh.position.z;
    camera.position.y = targetSphere.radius + 1;

    // 5.3. カメラの注視点設定
    camera.lookAt(new THREE.Vector3(targetSphere.mesh.position.x, targetSphere.mesh.position.y + 5, targetSphere.mesh.position.z));

    animate();
}

// 6. アニメーションループ
function animate() {
    requestAnimationFrame(animate);

    // 4. 重力シミュレーション
    spheres.forEach(sphere => {
        // 4.3. アニメーションループ内での処理
        sphere.velocity += GRAVITY;
        sphere.mesh.position.y -= sphere.velocity;

        if (sphere.mesh.position.y <= sphere.radius) {
            sphere.velocity *= -sphere.damping;
            sphere.mesh.position.y = sphere.radius;
        }
    });

    // 7.3 パーティクルのアニメーション
    const positions = particles.geometry.attributes.position.array;
    const opacities = particles.geometry.attributes.opacity.array; //opacity配列

    for (let i = 0; i < NUM_PARTICLES; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];

        const distance = Math.sqrt(
          Math.pow(x - camera.position.x, 2) +
          Math.pow(y - camera.position.y, 2) +
          Math.pow(z - camera.position.z, 2)
        );

        // 距離に応じた opacity の変化を調整
        let opacity = 1.0 / (distance * 0.02); // 0.01 を 0.02 に変更
        opacity = Math.max(0.1, Math.min(0.8, opacity)); // 0.1〜0.8 の範囲に制限
        opacity += (Math.random() - 0.5) * 0.05; // ランダムな変動
        opacity = Math.max(0, Math.min(1, opacity)); // 0〜1 の範囲にクランプ

        opacities[i] = opacity;
      }

    particles.geometry.attributes.opacity.needsUpdate = true; // opacity 属性の更新を通知

    // 5. カメラ(視点)の更新
    // targetSphere は更新しない

    camera.position.x = targetSphere.mesh.position.x;
    camera.position.z = targetSphere.mesh.position.z;
    camera.position.y = targetSphere.radius + 1;
    camera.lookAt(new THREE.Vector3(targetSphere.mesh.position.x, targetSphere.mesh.position.y + 5, targetSphere.mesh.position.z));

    renderer.render(scene, camera);
}

init();
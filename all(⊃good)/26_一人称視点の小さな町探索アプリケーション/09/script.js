let camera, scene, renderer, controls;
let player = {
    height: 1.7,
    speed: 5,
    turnSpeed: 0.02,
    flySpeed: 7
};

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

let gun;
let isReloading = false;
let ammo = 30;
let maxAmmo = 30;

// 弾丸関連
const bullets = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = player.height;

    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio );

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.addEventListener('click', function () {
        controls.lock();
        shoot();
    });

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    createTown();
    controls.getObject().position.set(0, player.height, 20);

    // 銃の作成 (少し複雑な形状)
    const gunGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        // グリップ
         -0.05, -0.2, -0.1,
         0.05, -0.2, -0.1,
         0.05, 0, -0.1,

         -0.05, -0.2, -0.1,
         0.05, 0, -0.1,
         -0.05, 0, -0.1,

        // 本体下部
        -0.1, 0, -0.1,
        0.1, 0, -0.1,
        0.1, 0.1, -0.1,

        -0.1, 0, -0.1,
        0.1, 0.1, -0.1,
        -0.1, 0.1, -0.1,

        // 本体上部
        -0.05, 0.1, -0.1,
        0.05, 0.1, -0.1,
        0.05, 0.1, 0.3,

        -0.05, 0.1, -0.1,
        0.05, 0.1, 0.3,
        -0.05, 0.1, 0.3,

        //銃口
        -0.02, 0.08, 0.3,
        0.02, 0.08, 0.3,
        0.02, 0.08, 0.5,

        -0.02, 0.08, 0.3,
        0.02, 0.08, 0.5,
        -0.02, 0.08, 0.5,

    ]);

    gunGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    gunGeometry.computeVertexNormals(); // 法線の計算

    const gunMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 }); // Phongマテリアル
    gun = new THREE.Mesh(gunGeometry, gunMaterial);

    camera.add(gun);
    gun.position.set(0.1, -0.15, -0.3);
    gun.rotation.set(0, 0, 0);

    window.addEventListener('resize', onWindowResize);

    // UI要素を作成
    const ui = document.createElement('div');
    ui.id = 'ui';
    document.body.appendChild(ui);
}

function createTown() {
    const buildingGeometry = new THREE.BoxGeometry(5, 5, 5);
    for (let i = 0; i < 10; i++) {
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Lambertマテリアル
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.x = Math.random() * 40 - 20;
        building.position.z = Math.random() * 40 - 20;
        building.position.y = 2.5;
        scene.add(building);
    }
    // ライトの追加
    const ambientLight = new THREE.AmbientLight(0x404040); // 環境光
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // 平行光源
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': moveUp = true; break;
        case 'ShiftLeft': moveDown = true; break;
        case 'KeyR': reload(); break; // Rキーでリロード
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'Space': moveUp = false; break;
        case 'ShiftLeft': moveDown = false; break;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const velocity = new THREE.Vector3();
    if (moveForward) velocity.z -= player.speed;
    if (moveBackward) velocity.z += player.speed;
    if (moveLeft) velocity.x -= player.speed;
    if (moveRight) velocity.x += player.speed;
    if (moveUp) velocity.y += player.flySpeed;
    if (moveDown) velocity.y -= player.flySpeed;

    controls.moveRight(velocity.x * 0.1);
    controls.moveForward(velocity.z * 0.1);
    controls.getObject().position.y += velocity.y * 0.1;

    // 銃の揺れ
    if (!isReloading) {
        gun.rotation.x = Math.sin(Date.now() * 0.002) * 0.01;
        gun.rotation.y = Math.cos(Date.now() * 0.003) * 0.01;
    }

    // 弾丸の移動と削除
    for (let i = 0; i < bullets.length; i++) {
        bullets[i].position.add(bullets[i].velocity);

        // 画面外に出たら削除
        if (bullets[i].position.distanceTo(camera.position) > 100) {
            scene.remove(bullets[i]);
            bullets.splice(i, 1);
            i--;
        }
    }

    renderer.render(scene, camera);

    // UIの更新
    updateUI();
}

function shoot() {
    if (isReloading || ammo <= 0) return;

    ammo--;

    // 弾丸の作成
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // 銃口から少し離れた位置に配置
    bullet.position.copy(gun.getWorldPosition(new THREE.Vector3()));

    // 銃口の向きに発射
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    bullet.velocity = direction.multiplyScalar(1); // 弾速

    bullets.push(bullet);
    scene.add(bullet);
}

function reload() {
    if (isReloading || ammo === maxAmmo) return;

    isReloading = true;

    // リロードアニメーション (簡単な例)
    gsap.to(gun.position, {
        duration: 0.5,
        y: -0.3,
        x: 0.3,
        z: -0.5,
        onComplete: () => {
            ammo = maxAmmo;
            isReloading = false;
            gsap.to(gun.position, {
                duration: 0.5,
                y: -0.15,
                x: 0.1,
                z: -0.3
            });
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// UIを更新する関数
function updateUI() {
    const ui = document.getElementById('ui');
    if (ui) {
        ui.textContent = `Ammo: ${ammo} / ${maxAmmo}`;
    }
}
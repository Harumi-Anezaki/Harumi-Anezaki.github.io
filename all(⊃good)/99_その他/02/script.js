let camera, scene, renderer, controls;
let player = {
    height: 1.7, // プレイヤーの身長（メートル）
    speed: 5,   // プレイヤーの移動速度
    turnSpeed: 0.02, //マウス感度
    flySpeed: 7 //飛行速度
};

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false; // 上昇フラグ
let moveDown = false; // 下降フラグ

let car; // 車の3Dオブジェクトを格納する変数
let gun; // 銃の3Dオブジェクトを格納する変数

init();
animate();

function init() {

    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // 空の色

    // カメラの作成
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = player.height;

    // レンダラーの作成
    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // 影を有効にする

    // ポインターロックコントロールの追加
    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject()); // これがカメラの親となり、移動を制御

    // ポインターロックの有効化/無効化
    document.addEventListener('click', function () {
        controls.lock();
    });

    // キーボードイベントリスナー
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // 環境光源 (全体を照らす)
    const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    //  指向性光源 (太陽光のようなもの)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // 地面の作成
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 }); // 緑色
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 水平に配置
    ground.position.y = 0;          // 地面の高さを0に
    ground.receiveShadow = true;   // 影を受け取る
    scene.add(ground);

    // 町の作成 (シンプルな立方体で家を表現)
    createTown();

    // モデルのロード
    loadModels();


    // 初期位置にカメラを配置（町の中心付近）
    controls.getObject().position.set(0, player.height, 20);
}
function createTown() {
    const buildingGeometry = new THREE.BoxGeometry(5, 5, 5); // 幅5, 高さ5, 奥行き5の立方体

    // 家を複数配置
    for (let i = 0; i < 10; i++) {
        const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // 茶色
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.castShadow = true;    // 影を落とす
        building.receiveShadow = true; // 影を受け取る

        // ランダムな位置に配置
        building.position.x = Math.random() * 40 - 20; // -20から20の範囲
        building.position.z = Math.random() * 40 - 20; // -20から20の範囲
        building.position.y = 2.5; //地面から少し浮かす。

        scene.add(building);
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': moveUp = true; break; // スペースキーで上昇
        case 'ShiftLeft': moveDown = true; break; // 左Shiftキーで下降
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

function loadModels() {
    const gltfLoader = new THREE.GLTFLoader();

    // 車のモデルをロード
    gltfLoader.load('car.glb', (gltf) => { // car.glb はモデルのファイル名に合わせてください。
        car = gltf.scene;
        car.scale.set(0.5, 0.5, 0.5); // スケール調整
        car.position.set(10, 0, 0); // 位置調整
        car.castShadow = true;
        car.receiveShadow = true;
        scene.add(car);
    }, undefined, (error) => {
        console.error('An error happened while loading the car model:', error);
    });

    // 銃のモデルをロード
    gltfLoader.load('gun.glb', (gltf) => { // gun.glb はモデルのファイル名に合わせてください。
        gun = gltf.scene;
        gun.scale.set(0.1, 0.1, 0.1); // スケール調整
        gun.position.set(0.5, -0.3, -0.5); // 位置調整（カメラの前）
        gun.rotation.y = Math.PI; // 180度回転
        camera.add(gun); // カメラの子にする
        scene.add(camera);  // カメラをシーンに追加し直す
    }, undefined, (error) => {
        console.error('An error happened while loading the gun model:', error);
    });
}

function animate() {
    requestAnimationFrame(animate);

    const velocity = new THREE.Vector3();
    if (moveForward) velocity.z -= player.speed;
    if (moveBackward) velocity.z += player.speed;
    if (moveLeft) velocity.x -= player.speed;
    if (moveRight) velocity.x += player.speed;
    if (moveUp) velocity.y += player.flySpeed;    // 上昇
    if (moveDown) velocity.y -= player.flySpeed;  // 下降


    // controls.moveRight/Forward は、カメラのローカル座標系での移動なので、velocityを適用
    controls.moveRight(velocity.x * 0.1);     //速度は適宜調整
    controls.moveForward(velocity.z * 0.1); //速度は適宜調整

    // カメラの位置に直接加算/減算して、上下移動を実現
    controls.getObject().position.y += velocity.y * 0.1;

    renderer.render(scene, camera);
}
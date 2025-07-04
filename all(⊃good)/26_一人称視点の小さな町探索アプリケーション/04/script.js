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

let cars = []; // 車の情報を格納する配列
const carSpeed = 0.1; // 車の速度

init();
animate();

function init() {

    // シーン
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // カメラ
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = player.height;

    // レンダラー
    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // ポインターロックコントロール
    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // ポインターロック
    document.addEventListener('click', function () {
        controls.lock();
    });

    // キーボード
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // 町
    createTown();

    // 道路
    createRoads();

    // 車
    createCars();

    // 初期位置
    controls.getObject().position.set(0, player.height, 20);
}

function createHouse(x, z) {
    const house = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(5, 4, 5);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xf0e68c });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    house.add(body);

    const roofGeometry = new THREE.ConeGeometry(4, 2, 4);
    const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xa0522d });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 5;
    house.add(roof);

    const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xadd8e6 });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(1, 2, 2.5);
    house.add(window1);

    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(-1, 2, 2.5);
    house.add(window2);

    const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
    const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1, 2.5);
    house.add(door);

    house.position.set(x, 0, z);
    scene.add(house);
}

function createTown() {
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 40 - 20;
        const z = Math.random() * 40 - 20;
        createHouse(x, z);
    }
}

function createRoads() {
    const roadWidth = 4;
    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x696969 });

    const roadXGeometry = new THREE.PlaneGeometry(100, roadWidth);
    const roadX = new THREE.Mesh(roadXGeometry, roadMaterial);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.y = 0.01;
    roadX.position.z = 0;
    scene.add(roadX);

    const roadZGeometry = new THREE.PlaneGeometry(roadWidth, 100);
    const roadZ = new THREE.Mesh(roadZGeometry, roadMaterial);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.y = 0.01;
    roadZ.position.x = 0;
    scene.add(roadZ);

    const roadDGeometry = new THREE.PlaneGeometry(roadWidth * 0.8, 50);
    const roadD = new THREE.Mesh(roadDGeometry, roadMaterial);
    roadD.rotation.x = -Math.PI / 2;
    roadD.rotation.z = -Math.PI / 4;
    roadD.position.y = 0.011;
    roadD.position.x = 15;
    roadD.position.z = 15;
    scene.add(roadD);
}

// 車の作成
function createCar() {
    const car = new THREE.Group();

    // 車体
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // 赤
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5; // 地面からの高さ
    car.add(body);

    // タイヤ
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
    const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // 黒

    const wheelPositions = [
        [-1, 0.3, 1.5],  // 左前
        [1, 0.3, 1.5],   // 右前
        [-1, 0.3, -1.5], // 左後
        [1, 0.3, -1.5]   // 右後
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2; // 横向き
        car.add(wheel);
    });

    return car;
}

// 複数台の車を作成、初期位置と進行方向を決定
function createCars() {
    // X軸方向
    const carX = createCar();
    carX.position.set(-50, 0, 0); // 道路の端からスタート
    carX.userData.direction = new THREE.Vector3(1, 0, 0); // X軸正方向
    cars.push(carX);
    scene.add(carX);

    //逆方向
    const carX_op = createCar();
    carX_op.position.set(50,0,2);
    carX_op.rotation.y = Math.PI; //逆向き
    carX_op.userData.direction = new THREE.Vector3(-1,0,0);
    cars.push(carX_op);
    scene.add(carX_op);

    // Z軸方向
    const carZ = createCar();
    carZ.position.set(0, 0, -50);
    carZ.rotation.y = Math.PI / 2; // 90度回転
    carZ.userData.direction = new THREE.Vector3(0, 0, 1); // Z軸正方向
    cars.push(carZ);
    scene.add(carZ);

    //斜め
    const carD = createCar();
    carD.position.set(35,0,35);
    carD.rotation.y = Math.PI*3/4; //さらに回転
    carD.userData.direction = new THREE.Vector3(-1,0,-1).normalize(); //正規化
    cars.push(carD);
    scene.add(carD);
}

// 車を動かす
function moveCars() {
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        car.position.add(car.userData.direction.clone().multiplyScalar(carSpeed));

        // 道路の端まで来たら反対向きにする
        if (car.position.x > 50 ) {
            car.position.x = -50;
        }
        if(car.position.x < -50){
            car.position.x = 50;
        }
        if (car.position.z > 50) {
            car.position.z = -50;
        }
        if(car.position.z < -50){
            car.position.z = 50;
        }
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': moveUp = true; break;
        case 'ShiftLeft': moveDown = true; break;
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

    moveCars(); // 車を動かす

    renderer.render(scene, camera);
}
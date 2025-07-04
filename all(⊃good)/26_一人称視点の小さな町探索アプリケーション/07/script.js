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

let cars = [];
const carSpeed = 0.1;

const range = 100; // 生成・削除範囲

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = player.height;

    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    document.addEventListener('click', () => controls.lock());
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // 初期地面 (十分な大きさ)
    const groundGeometry = new THREE.PlaneGeometry(range * 4, range * 4);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 初期オブジェクト生成
    createObjectsAroundPlayer();

    controls.getObject().position.set(0, player.height, 0); // 原点スタート
}

function createHouse(x, z) {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), new THREE.MeshBasicMaterial({ color: 0xf0e68c }));
    body.position.y = 2;
    house.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 2, 4), new THREE.MeshBasicMaterial({ color: 0xa0522d }));
    roof.position.y = 5;
    house.add(roof);
    const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xadd8e6 });
    [-1, 1].forEach(x => {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(x, 2, 2.5);
        house.add(window);
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.1), new THREE.MeshBasicMaterial({ color: 0x8b4513 }));
    door.position.set(0, 1, 2.5);
    house.add(door);
    house.position.set(x, 0, z);
    scene.add(house);
    return house;
}

function createRoad(x, z, isHorizontal = true) {
    const roadWidth = 4;
    const roadLength = 20;
    const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x696969 });
    const roadGeometry = isHorizontal
        ? new THREE.PlaneGeometry(roadLength, roadWidth)
        : new THREE.PlaneGeometry(roadWidth, roadLength);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, z);
    scene.add(road);
    return road;
}

function createCar() {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff }));
    body.position.y = 0.5;
    car.add(body);
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
    const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    [[-1, 0.3, 1.5], [1, 0.3, 1.5], [-1, 0.3, -1.5], [1, 0.3, -1.5]].forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.rotation.z = Math.PI / 2;
        car.add(wheel);
    });
    const angle = Math.random() * Math.PI * 2; // ランダムな方向
    car.userData.direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    car.rotation.y = angle;
    return car;
}

// プレイヤー周辺にオブジェクトを生成
function createObjectsAroundPlayer() {
    const playerX = controls.getObject().position.x;
    const playerZ = controls.getObject().position.z;

    // ハウス (確率と間隔を調整)
    for (let x = playerX - range; x <= playerX + range; x += 15) {
        for (let z = playerZ - range; z <= playerZ + range; z += 15) {
            if (Math.random() < 0.3) { // 30% の確率
                createHouse(x, z);
            }
        }
    }

    // 道路 (確率を調整)
    for (let x = playerX - range; x <= playerX + range; x += 20) {
        for (let z = playerZ - range; z <= playerZ + range; z += 20) {
            if (Math.random() < 0.5) {
                createRoad(x, z, Math.random() < 0.5); // 水平・垂直ランダム
            }
        }
    }

    // 車 (既存の車は一旦削除して再生成)
    cars.forEach(car => scene.remove(car));
    cars = [];
    for (let i = 0; i < 10; i++) { // 車の数を減らす
        const car = createCar();
        const x = Math.random() * range * 2 - range;
        const z = Math.random() * range * 2 - range;
        car.position.set(x, 0, z);
        cars.push(car);
        scene.add(car);
    }
}

// オブジェクトの削除
function removeDistantObjects() {
    const playerX = controls.getObject().position.x;
    const playerZ = controls.getObject().position.z;

    scene.children.forEach(object => {
        if (object instanceof THREE.Group) { // 家、車、道路 (Group のみ処理)
            const distance = Math.sqrt(
                Math.pow(object.position.x - playerX, 2) +
                Math.pow(object.position.z - playerZ, 2)
            );
            if (distance > range * 1.2) { // 削除範囲を少し広げる
                scene.remove(object);
            }
        }
    });
}

function moveCars() {
    const turnProbability = 0.02; // 方向転換の確率
    cars.forEach(car => {
        if (Math.random() < turnProbability) {
            const newAngle = car.rotation.y + (Math.random() - 0.5) * Math.PI / 2;
            car.userData.direction.set(Math.cos(newAngle), 0, Math.sin(newAngle));
            car.rotation.y = newAngle;
        }
        car.position.add(car.userData.direction.clone().multiplyScalar(carSpeed));
        // 範囲外に出たら反対側へ
        if (car.position.x > range) car.position.x = -range;
        if (car.position.x < -range) car.position.x = range;
        if (car.position.z > range) car.position.z = -range;
        if (car.position.z < -range) car.position.z = range;
    });
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

    moveCars();

    // オブジェクトの生成と削除 (一定間隔)
    if (!window.lastUpdate || Date.now() - window.lastUpdate > 2000) { // 2秒ごと
        createObjectsAroundPlayer();
        removeDistantObjects();
        window.lastUpdate = Date.now();
    }

    renderer.render(scene, camera);
}
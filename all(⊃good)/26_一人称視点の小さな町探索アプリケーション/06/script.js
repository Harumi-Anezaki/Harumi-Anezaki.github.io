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
const carSpeed = 0.05;
const turnProbability = 0.02;
const range = 200; // 生成範囲

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

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(range * 2, range * 2),
        new THREE.MeshBasicMaterial({ color: 0x228b22 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    createInfiniteObjects();

    controls.getObject().position.set(0, player.height, 20);
}

// オブジェクト生成の関数 (位置を完全にランダムにする)
function createObject(createFunction, ...args) {
    const x = Math.random() * range * 2 - range;
    const z = Math.random() * range * 2 - range;
    return createFunction(x, z, ...args);
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

function createSkyscraper(x, z, height) {
    const skyscraper = new THREE.Group();
    const bodyGeometry = new THREE.BoxGeometry(8, height, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = height / 2;
    skyscraper.add(body);
    const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let y = 2; y < height - 1; y += 3) {
        for (let x = -3; x <= 3; x += 3) {
            for (let z = -3; z <= 3; z += 3) {
                if (Math.abs(x) === 3 || Math.abs(z) === 3) {
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(x, y, z * 1.01);
                    skyscraper.add(window);
                }
            }
        }
    }
    skyscraper.position.set(x, 0, z);
    scene.add(skyscraper);
    return skyscraper;
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
    // 車の初期方向もランダムに
    const angle = Math.random() * Math.PI * 2;
    car.userData.direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    car.rotation.y = angle;
    return car;
}

function createInfiniteObjects() {
    let houses = [];
    let skyscrapers = [];
    let roads = [];

    function checkAndCreateObjects() {
        const playerX = controls.getObject().position.x;
        const playerZ = controls.getObject().position.z;

        // ハウス
        if (houses.length < 50) { // 生成数を制限
            if (Math.random() < 0.5) { // 生成確率
              const house = createObject(createHouse);
              houses.push(house);
            }
        }

        // ビル
        if (skyscrapers.length < 30) {
            if (Math.random() < 0.4) {
                const height = Math.random() * 60 + 20;
                const skyscraper = createObject(createSkyscraper, height);
                skyscrapers.push(skyscraper);
            }
        }

        // 道路
        if (roads.length < 40) {
            if (Math.random() < 0.5) {
                const isHorizontal = Math.random() < 0.5;
                const road = createObject(createRoad, isHorizontal);
                roads.push(road);
            }
        }

        // 車 (ここでも生成)
        if (cars.length < 20) {
            const car = createCar();
            const x = Math.random() * range * 2 - range;
            const z = Math.random() * range * 2 - range;
            car.position.set(x, 0, z);
            cars.push(car);
            scene.add(car);
        }

        // 削除処理 (プレイヤーからの距離で)
        houses = filterAndRemoveObjects(houses, playerX, playerZ);
        skyscrapers = filterAndRemoveObjects(skyscrapers, playerX, playerZ);
        roads = filterAndRemoveObjects(roads, playerX, playerZ);
    }

    function filterAndRemoveObjects(objects, playerX, playerZ) {
        return objects.filter(obj => {
            const distance = Math.sqrt(Math.pow(obj.position.x - playerX, 2) + Math.pow(obj.position.z - playerZ, 2));
            if (distance > range * 1.5) {
                scene.remove(obj);
                return false;
            }
            return true;
        });
    }

    checkAndCreateObjects();
    setInterval(checkAndCreateObjects, 5000);
}

function moveCars() {
    cars.forEach(car => {
        if (Math.random() < turnProbability) {
            const newAngle = car.rotation.y + (Math.random() - 0.5) * Math.PI / 2;
            car.userData.direction.set(Math.cos(newAngle), 0, Math.sin(newAngle));
            car.rotation.y = newAngle;
        }
        car.position.add(car.userData.direction.clone().multiplyScalar(carSpeed));
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
    renderer.render(scene, camera);
}
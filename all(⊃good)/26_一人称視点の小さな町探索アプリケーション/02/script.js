// 必要な変数を定義
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let player;
let town; // Townクラスのインスタンス
const infoElement = document.getElementById('info');

//当たり判定用のMeshの配列
let collisionMeshList = [];

// 定数
const PLAYER_HEIGHT = 10;
const PLAYER_RADIUS = 2;
const BODY_WIDTH = 3;
const BODY_HEIGHT = 4;
const HEAD_SIZE = 2;
const ARM_LENGTH = 3;
const ARM_WIDTH = 1;
const LEG_LENGTH = 4;
const LEG_WIDTH = 1;
const WALK_SPEED = 7;
const RUN_SPEED = 15;
const JUMP_HEIGHT = 250;
const CAMERA_OFFSET = new THREE.Vector3(0, 15, 25);

// テクスチャ
const textureLoader = new THREE.TextureLoader();
const windowTexture = createWindowsTexture(); // 窓のテクスチャ (自作)
const roadTexture = textureLoader.load('https://i.imgur.com/WGLbE3s.png'); //道路のテクスチャ
roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(4,4);

// Playerクラス (変更なし)
class Player {
    constructor(camera) {
        this.camera = camera;
        this.object = new THREE.Object3D();
        this.object.position.set(0, 10, 0); // 初期位置

        //当たり判定用のサイズ
        this.radius = PLAYER_RADIUS;
        this.height = PLAYER_HEIGHT;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.isOnGround = true; // 地面にいるかどうか
        this.isWalking = false; // 歩行中かどうか
        this.isRunning = false; // 走行中かどうか

        // カメラの位置（プレイヤーからの相対位置）
        this.cameraOffset = CAMERA_OFFSET;

        // プレイヤーの体のパーツを作成
        this.createBodyParts();

        //歩行アニメーション用のパラメータ
        this.walkCycle = 0; // 歩行サイクル (0-1)
        this.walkSpeed = WALK_SPEED;
        this.runSpeed = RUN_SPEED;
        this.jumpHeight = JUMP_HEIGHT;

        // ジャンプアニメーション用
        this.isJumping = false;
        this.jumpStartTime = 0;


        // キーボードイベントリスナー
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

  // プレイヤーの体のパーツを作成するメソッド (改良)
    createBodyParts() {
      // 胴体
      const bodyGeometry = new THREE.BoxGeometry(BODY_WIDTH, BODY_HEIGHT, PLAYER_RADIUS * 2);
      const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x007acc });
      this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      this.body.position.y = BODY_HEIGHT / 2 + LEG_LENGTH; // 脚の上に配置
      this.object.add(this.body);

      // 頭
      const headGeometry = new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE);
      const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
      this.head = new THREE.Mesh(headGeometry, headMaterial);
      this.head.position.y = this.body.position.y + BODY_HEIGHT / 2 + HEAD_SIZE / 2; // 胴体の上に配置
      this.object.add(this.head);

      // 腕 (関節付き)
      this.arm1 = this.createArm(-BODY_WIDTH / 2 - ARM_WIDTH / 2, this.body.position.y + BODY_HEIGHT/2 - ARM_LENGTH/2); // 左腕
      this.arm2 = this.createArm(BODY_WIDTH / 2 + ARM_WIDTH / 2, this.body.position.y + BODY_HEIGHT/2 - ARM_LENGTH/2);  // 右腕
      this.object.add(this.arm1, this.arm2);

      // 脚 (関節付き)
      this.leg1 = this.createLeg(-PLAYER_RADIUS,LEG_LENGTH / 2); // 左脚
      this.leg2 = this.createLeg(PLAYER_RADIUS, LEG_LENGTH/2); // 右脚
      this.object.add(this.leg1, this.leg2);
  }

    //腕の作成関数(関節付き)
    createArm(xOffset,yOffset) {

        const armGroup = new THREE.Group();

        const upperArmGeometry = new THREE.BoxGeometry(ARM_WIDTH, ARM_LENGTH /2, ARM_WIDTH);
        const upperArmMaterial = new THREE.MeshLambertMaterial({ color: 0x007acc });
        const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
        upperArm.position.set(0, -ARM_LENGTH / 4, 0); // 上腕の位置
        armGroup.add(upperArm);

        const lowerArmGeometry = new THREE.BoxGeometry(ARM_WIDTH, ARM_LENGTH / 2, ARM_WIDTH);
        const lowerArmMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const lowerArm = new THREE.Mesh(lowerArmGeometry, lowerArmMaterial);
        lowerArm.position.set(0, -ARM_LENGTH/2 , 0); //下腕の位置
        upperArm.add(lowerArm); // 上腕の子にする

        armGroup.position.set(xOffset,yOffset,0);

        return armGroup;
    }

    //足の作成関数（関節付き）
    createLeg(xOffset,yOffset) {
        const legGroup = new THREE.Group(); // 脚全体をグループ化

        // 上脚部分（太もも）
        const upperLegGeometry = new THREE.BoxGeometry(LEG_WIDTH, LEG_LENGTH / 2, LEG_WIDTH);
        const upperLegMaterial = new THREE.MeshLambertMaterial({ color: 0x007acc });
        const upperLeg = new THREE.Mesh(upperLegGeometry, upperLegMaterial);
        upperLeg.position.set(0, -LEG_LENGTH / 4, 0); // 上脚の位置
        legGroup.add(upperLeg);

        // 下脚部分（すね）
        const lowerLegGeometry = new THREE.BoxGeometry(LEG_WIDTH, LEG_LENGTH / 2, LEG_WIDTH);
        const lowerLegMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, lowerLegMaterial);
        lowerLeg.position.set(0, -LEG_LENGTH / 2, 0); // 下脚の位置 (上脚からの相対位置)
        upperLeg.add(lowerLeg); // 上脚の子にする

        // グループ全体の初期位置を設定
        legGroup.position.set(xOffset, yOffset, 0);
        return legGroup;
    }


    // キーボードが押されたときの処理
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'Space':
              if (this.isOnGround) {
                this.isJumping = true;
                this.jumpStartTime = performance.now(); // ジャンプ開始時間を記録
                this.velocity.y += this.jumpHeight;
                this.isOnGround = false;
              }
              break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = true;
                break;

        }
         this.isWalking = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    }

    // キーボードが離されたときの処理
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
             case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = false;
                break;
        }
        this.isWalking = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    }

    //当たり判定関数
    collisionDetection(position) {
        //球と直方体の衝突判定
        for(let i = 0 ; i < collisionMeshList.length; i++){

            let box = new THREE.Box3().setFromObject(collisionMeshList[i]);

            let sphere = new THREE.Sphere(position, this.radius);

            if(box.intersectsSphere(sphere)) return true;

        }

        return false;
    }

  // 歩行アニメーション (滑らかさと加減速)
  animateWalk(delta) {
    if (!this.isWalking) {
        this.walkCycle = 0;
        //腕と足の角度をリセット
        this.resetArmAndLegRotation();
        return;
    }

    const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
    this.walkCycle = (this.walkCycle + delta * speed) % 1;

    // イージング関数 (滑らかな加減速)
    const ease = (t) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const easedWalkCycle = ease(this.walkCycle);

    const angle = Math.sin(easedWalkCycle * Math.PI * 2) * Math.PI / 4; // 振れ幅

    //上腕
    this.leg1.children[0].rotation.x = angle;
    this.leg2.children[0].rotation.x = -angle;
    this.arm1.children[0].rotation.x = -angle;
    this.arm2.children[0].rotation.x = angle;
  }

  //腕と足の角度をリセット
  resetArmAndLegRotation(){
      this.leg1.children[0].rotation.x = 0;
      this.leg2.children[0].rotation.x = 0;
      this.arm1.children[0].rotation.x = 0;
      this.arm2.children[0].rotation.x = 0;
  }

  // ジャンプアニメーション
    animateJump(delta) {
      if (!this.isJumping) return;

      // ジャンプの経過時間を計算
      const elapsedTime = (performance.now() - this.jumpStartTime) / 1000; // 秒単位

      // ジャンプの高さ（放物線運動を模倣）
      const jumpHeight = -4.9 * elapsedTime * elapsedTime + 5 * elapsedTime; // -4.9は重力加速度の半分、3は初速

      if (jumpHeight <= 0) {
        // 着地
        this.isJumping = false;
        this.object.position.y = this.height; // 着地位置を修正（必要に応じて）
        return;
      }
    }


    // プレイヤーの更新処理
    update(delta) {

      // 重力
      this.velocity.y -= 9.8 * 50.0 * delta;

       // 移動方向の計算
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // ベクトルを正規化


        // 移動速度の適用（走行中なら加速）
        let speed = this.isRunning ? 400.0 * 1.8 : 400.0; // 走行時は1.8倍

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * delta;

         // 地面との距離をチェック (Raycasting)
        let raycaster = new THREE.Raycaster(this.object.position, new THREE.Vector3(0, -1, 0));
        let intersects = raycaster.intersectObjects(collisionMeshList);

        if (intersects.length > 0) {
            const distance = intersects[0].distance;
             // 地面との距離に応じてY座標を調整
            if (distance < this.height) {
              this.velocity.y = Math.max(0, this.velocity.y); // 下向きの速度を0にする
              this.object.position.y += (this.height - distance); // めり込みを修正
              this.isOnGround = true;
              this.isJumping = false; // ジャンプ中フラグもリセット
            } else {
                this.isOnGround = false; // 空中にいる
            }
        }

        //カメラの向きを元に、移動方向を決定
        let moveDirection = new THREE.Vector3(this.velocity.x * delta, 0, this.velocity.z * delta);
        moveDirection.applyQuaternion(this.camera.quaternion);

        //移動ベクトルを算出
        let newPosition = new THREE.Vector3();
        newPosition.copy(this.object.position);
        newPosition.add(moveDirection);
        newPosition.y += this.velocity.y * delta;

        //当たり判定
        if (!this.collisionDetection(newPosition)) {
            //スムーズな移動
            this.object.position.lerp(newPosition, 0.2); // 0.2 は補間の強さ（調整可能）

            //地面にめり込まないようにy座標を設定
            this.object.position.y = Math.max(this.object.position.y,newPosition.y);

        } else {
           //y方向の速度を持っている = ジャンプ中
           if(this.velocity.y != 0){
                this.velocity.y = 0; //Y方向の速度をリセット
           }
        }


        // カメラをプレイヤーに追従させる（スムーズに）
        let cameraTargetPosition = new THREE.Vector3().copy(this.object.position).add(this.cameraOffset);
        this.camera.position.lerp(cameraTargetPosition, 0.1); // 0.1は追従の強さ

        // プレイヤーの向きをカメラの向きに合わせる
        this.object.rotation.y = this.camera.rotation.y;

        //歩行アニメーション
        this.animateWalk(delta);

        // ジャンプアニメーション
        this.animateJump(delta);

        //速度の減衰
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        // 情報表示
        infoElement.innerText = `X:${this.object.position.x.toFixed(2)}, Y:${this.object.position.y.toFixed(2)}, Z:${this.object.position.z.toFixed(2)}`;
    }
}

// Buildingクラス (更新)
class Building {
  constructor(x, z, height, type) {
    this.x = x;
    this.z = z;
    this.height = height;
    this.type = type;

    this.width = 10;
    this.depth = 10;

    this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    this.geometry.translate(0, this.height / 2, 0);

    // マテリアル (種類ごとに色を変える、窓のテクスチャ)
    let baseColor;
    switch (this.type) {
      case 'high':
        baseColor = new THREE.Color(0xaaaaaa);
        break;
      case 'medium':
        baseColor = new THREE.Color(0xcc8844);
        break;
      case 'low':
        baseColor = new THREE.Color(0x8b4513);
        break;
    }

    // ランダムな明るさの変化を加える
    const brightness = 0.8 + Math.random() * 0.2; // 0.8-1.0
    this.color = baseColor.clone().multiplyScalar(brightness);

    // 窓の色も少し変える
    let emissiveColor;
    switch (this.type) {
      case 'high':
        emissiveColor = new THREE.Color(0xffffcc); // やや黄色っぽい
        break;
      case 'medium':
        emissiveColor = new THREE.Color(0xffddaa); // オレンジっぽい
        break;
      case 'low':
        emissiveColor = new THREE.Color(0xffcc88); // さらにオレンジっぽい
        break;
    }

    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: emissiveColor, // 発光色
      emissiveMap: windowTexture, // 発光マップ
      emissiveIntensity: 0.5, // 発光の強さ (調整可能)
      roughness: 0.8, // 粗さ (調整可能)
      metalness: 0.2, // 金属っぽさ (調整可能)
    });
  }
}

// Carクラス
class Car {
  constructor(x, z, direction) {
    this.x = x;
    this.z = z;
    this.direction = direction; // 進行方向 (1: 正, -1: 負)
    this.speed = 20 + Math.random() * 10; // 速度

    // 車のモデル (簡略化)
    this.geometry = new THREE.BoxGeometry(4, 2, 8); // 幅, 高さ, 長さ
    this.geometry.translate(0, 1, 0); // 原点を上に移動
    this.material = new THREE.MeshLambertMaterial({ color: this.getRandomColor() });
  }

  // ランダムな色を生成
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // 車の移動
  update(delta) {
    if (this.direction === 1) {
      this.x += this.speed * delta;
      if (this.x > 250) this.x = -250; //画面端で反対側へ
    } else {
      this.z += this.speed * delta;
      if (this.z > 250) this.z = -250;
    }
  }
}

// Townクラス
class Town {
  constructor() {
    this.buildings = [];
    this.roads = [];
    this.cars = [];
    this.gridSize = 10; // 区画の数 (例: 10x10)
    this.blockSize = 20; // 区画のサイズ
    this.roadWidth = 8; // 道路の幅

    this.createTown();
  }

  createTown() {
    // 建物の生成
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const x = (i - this.gridSize / 2) * this.blockSize;
        const z = (j - this.gridSize / 2) * this.blockSize;

        // 建物の種類をランダムに決定
        const buildingType = this.getRandomBuildingType();

        // 建物の高さをランダムに決定
        let buildingHeight;
        switch (buildingType) {
          case 'high':
            buildingHeight = 80 + Math.random() * 120;
            break;
          case 'medium':
            buildingHeight = 40 + Math.random() * 40;
            break;
          case 'low':
            buildingHeight = 10 + Math.random() * 20;
            break;
        }

        const building = new Building(x, z, buildingHeight, buildingType);
        this.buildings.push(building);
      }
    }

    // 道路の生成
    this.createRoads();

    // 車の生成
    this.createCars();

    // InstancedMeshの作成
    this.createInstancedBuildings();
    this.createInstancedRoads();
    this.createInstancedCars();
  }

  // ランダムな建物の種類を決定
  getRandomBuildingType() {
    const rand = Math.random();
    if (rand < 0.3) {
      return 'high'; // 30%の確率で高層ビル
    } else if (rand < 0.7) {
      return 'medium'; // 40%の確率で中層ビル
    } else {
      return 'low'; // 30%の確率で低層ビル
    }
  }

  // 道路の生成
  createRoads() {
    const roadGeometry = new THREE.PlaneGeometry(this.roadWidth, this.blockSize);
    roadGeometry.rotateX(-Math.PI / 2); // 水平にする
    roadGeometry.translate(0, 0.1, 0); // 少しだけ上に移動 (地面との重なりを防ぐ)

    // 横方向の道路
    for (let i = 0; i <= this.gridSize; i++) {
      const road = new THREE.Mesh(roadGeometry); // materialは後でInstancedMeshで設定
      road.position.x = (i - this.gridSize / 2) * this.blockSize + this.blockSize / 2 - this.roadWidth / 2;
      road.position.z = 0;
      this.roads.push(road);
    }
    // 縦方向の道路
    for (let j = 0; j <= this.gridSize; j++) {
      const road = new THREE.Mesh(roadGeometry); // materialは後でInstancedMeshで設定
      road.position.z = (j - this.gridSize / 2) * this.blockSize + this.blockSize / 2 - this.roadWidth / 2;
      road.position.x = 0;
      road.rotation.y = Math.PI / 2; // 90度回転
      this.roads.push(road);
    }
  }

  // 車の生成
  createCars() {
    const numCars = 20; // 車の数

    for (let i = 0; i < numCars; i++) {
      // ランダムな道路を選択
      const roadIndex = Math.floor(Math.random() * this.roads.length);
      const road = this.roads[roadIndex];

      // 車の初期位置と方向を決定
      let x, z, direction;
      if (road.rotation.y === 0) { // 横方向の道路
        x = road.position.x - this.blockSize / 2 + this.roadWidth / 2;
        z = road.position.z + (Math.random() * this.blockSize) - this.blockSize/2;
        direction = 1; // 正の方向に進む
      } else { // 縦方向の道路
        z = road.position.z - this.blockSize / 2 + this.roadWidth/2;
        x = road.position.x + (Math.random() * this.blockSize) - this.blockSize/2;
        direction = -1; // 負の方向に進む
      }

      const car = new Car(x, z, direction);
      this.cars.push(car);
    }
  }

  // InstancedMeshを作成 (建物)
  createInstancedBuildings() {
    // 種類ごとにグループ化
    const buildingGroups = {
      high: [],
      medium: [],
      low: [],
    };
    this.buildings.forEach((building) => {
      buildingGroups[building.type].push(building);
    });

    // 各グループごとにInstancedMeshを作成
    for (const type in buildingGroups) {
      const buildings = buildingGroups[type];
      if (buildings.length === 0) continue;

      const geometry = buildings[0].geometry;
      const material = buildings[0].material;
      const instancedMesh = new THREE.InstancedMesh(geometry, material, buildings.length);

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i];
        matrix.setPosition(building.x, 0, building.z);
        instancedMesh.setMatrixAt(i, matrix);
        instancedMesh.setColorAt(i, building.color); //色を設定

        //当たり判定
        const dummy = new THREE.Object3D();
        dummy.position.set(building.x, building.height / 2, building.z);
        dummy.scale.set(building.width, building.height, building.depth);
        collisionMeshList.push(dummy);
      }
      scene.add(instancedMesh);
    }
  }

  // InstancedMeshを作成 (道路)
  createInstancedRoads() {
    if (this.roads.length === 0) return;

    const geometry = this.roads[0].geometry; // 最初の道路のジオメトリを使用
    const material = new THREE.MeshLambertMaterial({ map: roadTexture }); // 道路のテクスチャ
    const instancedMesh = new THREE.InstancedMesh(geometry, material, this.roads.length);

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.roads.length; i++) {
      const road = this.roads[i];
      matrix.makeRotationFromEuler(road.rotation); // オイラー角から回転行列を作成
      matrix.setPosition(road.position);
      instancedMesh.setMatrixAt(i, matrix);
    }
    scene.add(instancedMesh);
  }

  // InstancedMeshを作成 (車)
  createInstancedCars() {
    if (this.cars.length === 0) return;

    const geometry = this.cars[0].geometry;
    const material = this.cars[0].material; // 任意
    const instancedMesh = new THREE.InstancedMesh(geometry, material, this.cars.length);

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      matrix.setPosition(car.x, 0, car.z);
      instancedMesh.setMatrixAt(i, matrix);
      //色を設定
      instancedMesh.setColorAt(i,car.material.color);
    }
    scene.add(instancedMesh);
  }

  // 車の更新
  updateCars(delta) {
    this.cars.forEach((car) => car.update(delta));
  }
}

// 初期化処理
function init() {
    // シーン
    scene = new THREE.Scene();

    // カメラ
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb);
    document.body.appendChild(renderer.domElement);

    // コントロール
    controls = new THREE.PointerLockControls(camera, document.body);
    document.body.addEventListener('click', () => {
        controls.lock();
    });
    document.addEventListener('pointerlockchange', () => {
       if (document.pointerLockElement !== document.body) {
           //マウスポインター表示時の処理
       } else {
           //マウスポインター非表示時の処理
       }
    });

    // 光源
    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    collisionMeshList.push(ground);

    // 街を生成
    town = new Town();

    // プレイヤー
    player = new Player(camera);
    scene.add(player.object);

    window.addEventListener('resize', onWindowResize);
}

// ウィンドウリサイズ時の処理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (controls.isLocked) {
        player.update(delta);
        town.updateCars(delta); // 車を更新
    }

    renderer.render(scene, camera);
}

// 窓のテクスチャを作成する関数 (自作)
function createWindowsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // 背景色
  ctx.fillStyle = '#000000'; // 黒
  ctx.fillRect(0, 0, 64, 64);

  // 窓のパターン
  ctx.fillStyle = '#ffffaa'; // 薄い黄色
  for (let y = 0; y < 64; y += 16) {
    for (let x = 0; x < 64; x += 16) {
      if (Math.random() > 0.5) { // ランダムに窓を光らせる
        ctx.fillRect(x + 2, y + 2, 12, 12);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 初期化処理を実行し、アニメーションを開始
init();
animate();
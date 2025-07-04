// 必要な変数を定義
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let player;
const infoElement = document.getElementById('info'); // 情報表示用要素

//当たり判定用のMeshの配列
let collisionMeshList = [];

// Playerクラス
class Player {
    constructor(camera) {
        this.camera = camera;
        this.object = new THREE.Object3D();
        this.object.position.set(0, 10, 0); // 初期位置

        //当たり判定用のサイズ
        this.radius = 2;
        this.height = 10;


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
        this.cameraOffset = new THREE.Vector3(0, 15, 25); // 調整可能

        // プレイヤーの体のパーツを作成
        this.createBodyParts();

        //歩行アニメーション用のパラメータ
        this.walkCycle = 0; // 歩行サイクル (0-1)
        this.walkSpeed = 7;  // 歩行速度 (調整可能)
        this.runSpeed = 15;    // 走行速度 (調整可能)
        this.jumpHeight = 250; // ジャンプの高さ

        // キーボードイベントリスナー
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    // プレイヤーの体のパーツを作成するメソッド
    createBodyParts() {
        // 胴体
        const bodyGeometry = new THREE.BoxGeometry(3, 5, 2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x007acc }); // 青色
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 2.5; // 地面からの高さを調整
        this.object.add(this.body);

        // 頭
        const headGeometry = new THREE.BoxGeometry(2, 2, 2);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // 金色
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 6;  // 胴体の上
        this.object.add(this.head);

        // 腕
        this.arm1 = this.createArm(-2); // 左腕
        this.arm2 = this.createArm(2);  // 右腕
        this.object.add(this.arm1, this.arm2);


        // 脚
        this.leg1 = this.createLeg(-1.5); // 左足
        this.leg2 = this.createLeg(1.5);  // 右足
        this.object.add(this.leg1, this.leg2);
    }


    //腕の作成関数
    createArm(xOffset) {
        const armGeometry = new THREE.BoxGeometry(1, 3, 1);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // 金色
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(xOffset, 2, 0); // 胴体からの相対位置
        return arm;
    }

    //足の作成関数
    createLeg(xOffset) {
        const legGeometry = new THREE.BoxGeometry(1, 5, 1);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(xOffset, -2.5, 0); // プレイヤーからの相対位置
        return leg;
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

    //歩行アニメーション(仮)
    animateWalk(delta) {
      if (!this.isWalking) {
            this.walkCycle = 0; // 歩いていないときはリセット
            return;
      }

        // 走行中ならアニメーション速度を上げる
        const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
        this.walkCycle = (this.walkCycle + delta * speed) % 1; // 0-1の範囲でサイクル

        const angle = Math.sin(this.walkCycle * Math.PI * 2) * Math.PI / 4; // 振れ幅
        this.leg1.rotation.x = angle;
        this.leg2.rotation.x = -angle;

        //腕も同様に
        this.arm1.rotation.x = -angle;
        this.arm2.rotation.x = angle;
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

        //速度の減衰
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;



        // 情報表示
        infoElement.innerText = `X:${this.object.position.x.toFixed(2)}, Y:${this.object.position.y.toFixed(2)}, Z:${this.object.position.z.toFixed(2)}`;
    }
}



// 初期化処理
function init() {

    // シーンの作成
    scene = new THREE.Scene();

    // カメラの作成
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // レンダラーの作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb); // 空の色
    document.body.appendChild(renderer.domElement);

    // ポインターロックコントロールの作成
    controls = new THREE.PointerLockControls(camera, document.body);

     //画面クリック時の処理
    document.body.addEventListener('click', () => {
        controls.lock();
    });

    //escキーでポインターロックを解除
    document.addEventListener('pointerlockchange', () => {
       if (document.pointerLockElement !== document.body) {
           //マウスポインター表示時の処理
       } else {
           //マウスポインター非表示時の処理
       }
    });


    // 光源の追加
    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // 地面の作成
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 }); // 緑色
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 水平に回転
    ground.position.y = 0;
    scene.add(ground);
    collisionMeshList.push(ground);

    // 建物の作成 (例: 3つの直方体)
    const buildingGeometry = new THREE.BoxGeometry(10, 20, 10);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // 茶色

    const building1 = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building1.position.set(15, 10, -20);
    scene.add(building1);
    collisionMeshList.push(building1);


    const building2 = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building2.position.set(-15, 10, -15);
    scene.add(building2);
    collisionMeshList.push(building2);


    const building3 = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building3.position.set(0, 10, -30);
    scene.add(building3);
    collisionMeshList.push(building3);


    // プレイヤーの初期化
    player = new Player(camera);
    scene.add(player.object);

    // ウィンドウリサイズイベントの処理
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

    const delta = clock.getDelta(); // 時間差分を取得

    if (controls.isLocked) {
        player.update(delta);
    }

    renderer.render(scene, camera);
}

// 初期化処理を実行し、アニメーションを開始
init();
animate();
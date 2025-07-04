const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isDrawing = false;
let currentPath = []; // 現在描画中のパスの頂点座標
let bodies = [];      // Matter.js の Body オブジェクトを格納する配列

// Matter.js の設定
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;


// エンジン、レンダラー、ワールドの作成
const engine = Engine.create();
const world = engine.world;

// // レンダラーをCanvasではなく、Matter.jsのデバッグレンダラーを使う場合（今回は使いません）
// const render = Render.create({
//     canvas: canvas,
//     engine: engine,
//     options: {
//         width: canvas.width,
//         height: canvas.height,
//         wireframes: false, // ワイヤーフレーム表示をオフ
//         background: 'white' //<-Matter.jsで背景を設定する場合
//     }
// });
// Render.run(render);

// マウスの制約
const mouse = Mouse.create(canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,  //マウスドラッグ時の剛性
      render: {
        visible: false // マウスの制約の描画を非表示
      }
    }
});
World.add(world, mouseConstraint);


// 地面、壁の作成
const ground = Bodies.rectangle(canvas.width / 2, canvas.height + 25 , canvas.width * 1.2, 50, { isStatic: true , label: 'ground'}); //地面はcanvasの外に作る
const leftWall = Bodies.rectangle(-25, canvas.height / 2, 50, canvas.height * 1.2, { isStatic: true });
const rightWall = Bodies.rectangle(canvas.width + 25, canvas.height / 2, 50, canvas.height * 1.2, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);



// 爆発モード関連の変数
let isExplosionMode = false; // 爆発モードが有効かどうか
const explosionForce = 0.5;    // 爆発の強さ
const explosionRadius = 150;   // 爆発の影響範囲

// 爆発モードの切り替えボタン (HTML に追加しても良い)
const explosionButton = document.createElement('button');
explosionButton.textContent = '爆発モード: OFF';
explosionButton.style.position = 'absolute';
explosionButton.style.top = '10px';
explosionButton.style.left = '10px';
explosionButton.style.zIndex = '1000'; //canvasより前面に
document.body.appendChild(explosionButton);

explosionButton.addEventListener('click', () => {
    isExplosionMode = !isExplosionMode;
    explosionButton.textContent = isExplosionMode ? '爆発モード: ON' : '爆発モード: OFF';
});


// マウスイベント (パスの取得)
// canvas.addEventListener('mousedown', startDrawing); //変更
canvas.addEventListener('mousemove', draw);
// canvas.addEventListener('mouseup', stopDrawing);   //変更
canvas.addEventListener('mouseout', stopDrawing);

// マウスイベントの変更 (mousedown イベントを修正)
canvas.addEventListener('mousedown', (e) => {
    if (isExplosionMode) {
        // 爆発モードが有効な場合は、爆発を発生させる
        explode(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
    } else {
        // 通常の描画モード
        startDrawing(e);
    }
});

// タッチイベント
// canvas.addEventListener('touchstart', (e) => { //変更
//     e.preventDefault();
//     const touch = e.touches[0];
//     startDrawing(touch);
// }, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw(touch);
}, { passive: false });
// canvas.addEventListener('touchend', (e) => {   //変更
//   e.preventDefault();
//   stopDrawing();
// }, { passive: false });

// タッチイベントの変更(touchstart イベントを修正)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (isExplosionMode) {
        explode(touch.clientX - canvas.offsetLeft, touch.clientY - canvas.offsetTop);
    } else {
        startDrawing(touch);
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
  });

function startDrawing(e) {
    isDrawing = true;
    currentPath = [];
    const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft;
    const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop;
    currentPath.push({ x, y });
}

function draw(e) {
    if (!isDrawing) return;
    const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft;
    const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop;
    currentPath.push({ x, y });

     // 描画中の線も表示（Matter.jsのレンダラーは使わない）
    ctx.beginPath();
    ctx.moveTo(currentPath[currentPath.length - 2].x, currentPath[currentPath.length - 2].y);
    ctx.lineTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
    ctx.stroke();
}


function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;

    // パスから凸包(Convex Hull)を計算してボディを作成 (パスが凹型だと正しく動作しないため)
    if(currentPath.length > 2){ //点が３つ以上ない場合は、ボディを作らない
        const hull = Matter.Vertices.hull(currentPath); // 凸包を計算
        const pathBody = Bodies.fromVertices(currentPath[0].x, currentPath[0].y, hull, { //最初の点を中心としてボディを作る
            friction: 0.8,
            restitution: 0.6,
            render: {
                fillStyle: '#4287f5', // ボディの色
                strokeStyle: '#2a58a8', // 枠線の色
                lineWidth: 2          // 枠線の太さ
            }
        }, true); //重複頂点を削除する
        if(pathBody){ //pathBodyがunderfindになる場合があるので、その場合はworldに追加しない
            World.add(world, pathBody);
            bodies.push(pathBody);
        }
    }

    currentPath = [];
}

// 爆発関数
function explode(x, y) {
    bodies.forEach(body => {
        // 爆発の中心からの距離を計算
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosionRadius) {
            // 爆発の影響範囲内にあるボディに力を加える
            const force = explosionForce * (1 - distance / explosionRadius); // 距離に応じて力を減衰
            const angle = Math.atan2(dy, dx);
            Matter.Body.applyForce(body, body.position, {
                x: Math.cos(angle) * force,
                y: Math.sin(angle) * force
            });

            //爆発エフェクトをcanvasに追加
            drawExplosion(x,y,explosionRadius)
        }
    });
}

//爆発エフェクト
function drawExplosion(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 165, 0, 0.5)'; // オレンジ色の半透明
  ctx.fill();

  // 爆発エフェクトはすぐに消えるようにする
  setTimeout(() => {
    ctx.clearRect(x - radius - 5, y - radius - 5, radius * 2 + 10, radius * 2 + 10);
  }, 100); // 100ミリ秒後にクリア
}

// アニメーションループ
function runAnimation() {
    Engine.update(engine);

    //canvasのクリア
    ctx.clearRect(0,0, canvas.width, canvas.height)

    // 全てのボディを描画 (Matter.js の Render ではなく、手動で描画)
    bodies.forEach(body => {
        ctx.beginPath();
        const vertices = body.vertices;
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        // 塗りつぶしと線のスタイル設定
        ctx.fillStyle = body.render.fillStyle;
        ctx.strokeStyle = body.render.strokeStyle;
        ctx.lineWidth = body.render.lineWidth;

        ctx.fill();
        ctx.stroke();
    });


    requestAnimationFrame(runAnimation);
}

runAnimation(); // アニメーション開始


// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 地面と壁の位置を更新
    Matter.Body.setPosition(ground, { x: canvas.width / 2, y: canvas.height + 25 });
    Matter.Body.setPosition(rightWall, { x: canvas.width + 25, y: canvas.height / 2 });

     // Matter.js のレンダラーを使う場合は、render.options も更新
    // render.options.width = canvas.width;
    // render.options.height = canvas.height;

});
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isDrawing = false;
let paths = [];  // 描画されたパスを保存する配列
let currentPath = []; // 現在描画中のパス

// 物理演算パラメータ (簡易版)
const gravity = 0.5;
const friction = 0.98; // 摩擦係数（地面との）
const restitution = 0.6; // 反発係数

// マウスイベント
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// タッチイベント（モバイル対応）
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // デフォルトのタッチイベントを無効化
    const touch = e.touches[0];
    startDrawing(touch);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw(touch);
});
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopDrawing();
});



function startDrawing(e) {
    isDrawing = true;
    currentPath = [];
    const x = e.clientX || e.touches[0].clientX;  //clientXがない場合はtouchを使う
    const y = e.clientY || e.touches[0].clientY;
    currentPath.push({ x: x - canvas.offsetLeft, y: y - canvas.offsetTop, vx: 0, vy: 0 }); // 初期位置と速度
    ctx.beginPath();
    ctx.moveTo(x - canvas.offsetLeft, y - canvas.offsetTop);
}

function draw(e) {
    if (!isDrawing) return;
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    currentPath.push({ x: x - canvas.offsetLeft, y: y - canvas.offsetTop, vx: 0, vy: 0 });
    ctx.lineTo(x - canvas.offsetLeft, y - canvas.offsetTop);
    ctx.stroke();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    paths.push(currentPath);
    ctx.closePath();
    animate(); // 描画終了時にアニメーションを開始/更新
}

function animate() {
    // 既存の描画をクリア (残像効果を出す場合は、薄い半透明の四角で塗りつぶす)
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // 半透明の白で塗りつぶすことで、残像効果を出す
      ctx.fillRect(0, 0, canvas.width, canvas.height);


    paths.forEach(path => {
        // パスの各点を更新（物理演算）
        for (let i = 0; i < path.length; i++) {
            let point = path[i];

            // 重力
            point.vy += gravity;

            // 摩擦（速度が十分小さい場合は停止）
            if (Math.abs(point.vx) < 0.1 && Math.abs(point.vy) < 0.1 && point.y >= canvas.height - 1) {
                point.vx = 0;
                point.vy = 0;
            } else {
                point.vx *= friction;
                point.vy *= friction;
            }
            // 床との衝突判定
            if (point.y + point.vy >= canvas.height) {
               point.y = canvas.height; //位置を床に固定
                point.vy *= -restitution; // 反発
                point.vx *= 0.8;        // x方向の摩擦も少し強める（跳ね返りすぎ防止）

            }

             //左右の壁との衝突判定
            if(point.x + point.vx <= 0 || point.x + point.vx >= canvas.width) {
                point.vx *= -restitution;
            }

            // 位置を更新
            point.x += point.vx;
            point.y += point.vy;


        }

        // 更新されたパスを描画
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
    });

   if (paths.some(path => path.some(point => point.vy !==0 || point.vx !==0))) {  //アニメーションを続けるか判定
        requestAnimationFrame(animate);
    }
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    //パスの位置を調整。リサイズ前のcanvasに対する相対位置を計算して、リサイズ適応
    paths.forEach(path => {
     path.forEach( point => {
        point.x = point.x * (canvas.width / canvas.width);
        point.y = point.y * (canvas.height / canvas.height);
      })
    });
});
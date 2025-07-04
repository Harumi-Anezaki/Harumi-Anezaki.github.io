const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;

// マウスの座標を取得するための補正値
let rect = canvas.getBoundingClientRect();

// 現在の描画スタイル
let currentColor = document.getElementById('color').value;
let currentSize = document.getElementById('size').value;

// イベントリスナーの設定
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseout', endPosition);

document.getElementById('color').addEventListener('change', function() {
    currentColor = this.value;
});

document.getElementById('size').addEventListener('change', function() {
    currentSize = this.value;
});

// 描画を開始
function startPosition(e) {
    drawing = true;
    draw(e);
}

// 描画を終了
function endPosition() {
    drawing = false;
    ctx.beginPath();
}

// 描画処理
function draw(e) {
    if (!drawing) return;

    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

// キャンバスをクリア
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// キャンバスを画像として保存
function saveCanvas() {
    const link = document.createElement('a');
    link.download = 'my_drawing.png';
    link.href = canvas.toDataURL();
    link.click();
}
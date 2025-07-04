const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');

let drawing = false;
let tool = 'pen';
let brushSize = 5;
let brushColor = '#000000';
let bgColor = '#FFFFFF';
let startX, startY;

const toolSelect = document.getElementById('tool');
const brushSizeInput = document.getElementById('brushSize');
const brushColorInput = document.getElementById('brushColor');
const bgColorInput = document.getElementById('bgColor');
const clearCanvasButton = document.getElementById('clearCanvas');

// 初期設定
context.lineCap = 'round';
context.lineJoin = 'round';
context.lineWidth = brushSize;
context.strokeStyle = brushColor;
canvas.style.backgroundColor = bgColor;

// ツールの変更
toolSelect.addEventListener('change', (e) => {
    tool = e.target.value;
});

// ブラシサイズの変更
brushSizeInput.addEventListener('input', (e) => {
    brushSize = e.target.value;
    context.lineWidth = brushSize;
});

// ブラシの色の変更
brushColorInput.addEventListener('input', (e) => {
    brushColor = e.target.value;
    context.strokeStyle = brushColor;
});

// 背景色の変更
bgColorInput.addEventListener('input', (e) => {
    bgColor = e.target.value;
    canvas.style.backgroundColor = bgColor;
});

// キャンバスのクリア
clearCanvasButton.addEventListener('click', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
});

// マウスダウンイベント
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    startX = getX(e);
    startY = getY(e);
    if (tool === 'pen') {
        context.beginPath();
        context.moveTo(startX, startY);
    }
});

// マウスムーブイベント
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const x = getX(e);
    const y = getY(e);

    if (tool === 'pen') {
        context.lineTo(x, y);
        context.stroke();
    }
});

// マウスアップイベント
canvas.addEventListener('mouseup', (e) => {
    if (!drawing) return;
    drawing = false;
    const endX = getX(e);
    const endY = getY(e);

    // 形状の描画
    switch (tool) {
        case 'line':
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
            break;
        case 'rectangle':
            const rectWidth = endX - startX;
            const rectHeight = endY - startY;
            context.beginPath();
            context.rect(startX, startY, rectWidth, rectHeight);
            context.stroke();
            break;
        case 'circle':
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            context.beginPath();
            context.arc(startX, startY, radius, 0, Math.PI * 2);
            context.stroke();
            break;
        default:
            break;
    }

    if (tool !== 'pen') {
        context.closePath();
    }
});

// マウスアウトイベント
canvas.addEventListener('mouseout', () => {
    drawing = false;
});

// 座標取得関数
function getX(e) {
    const rect = canvas.getBoundingClientRect();
    return e.clientX - rect.left;
}

function getY(e) {
    const rect = canvas.getBoundingClientRect();
    return e.clientY - rect.top;
}

/* モーダルの操作 */
const helpButton = document.getElementById('helpButton');
const helpModal = document.getElementById('helpModal');
const closeModal = document.getElementsByClassName('close')[0];

// モーダルを表示
helpButton.addEventListener('click', () => {
    helpModal.style.display = 'block';
});

// モーダルを閉じる
closeModal.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

// モーダル外をクリックした場合に閉じる
window.addEventListener('click', (e) => {
    if (e.target == helpModal) {
        helpModal.style.display = 'none';
    }
});
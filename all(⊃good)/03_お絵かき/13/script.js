const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');

let drawing = false;
let tool = 'pen';
let brushSize = 5;
let brushColor = '#000000';
let bgColor = '#FFFFFF';
let brushType = 'solid';
let startX, startY;

const toolSelect = document.getElementById('tool');
const brushSizeInput = document.getElementById('brushSize');
const brushColorInput = document.getElementById('brushColor');
const bgColorInput = document.getElementById('bgColor');
const brushTypeSelect = document.getElementById('brushType');
const undoButton = document.getElementById('undoButton');
const clearCanvasButton = document.getElementById('clearCanvas');
const saveButton = document.getElementById('saveButton');
const saveFormatSelect = document.getElementById('saveFormat');

// Undoスタック
let undoStack = [];

// 初期設定
context.lineCap = 'round';
context.lineJoin = 'round';
context.lineWidth = brushSize;
context.strokeStyle = brushColor;
updateBrushType();
canvas.style.backgroundColor = bgColor;

// ツールの変更
toolSelect.addEventListener('change', (e) => {
    tool = e.target.value;
});

// ブラシサイズの変更
brushSizeInput.addEventListener('input', (e) => {
    brushSize = e.target.value;
    context.lineWidth = brushSize;
    updateBrushType(); // ブラシサイズ変更時にラインのスタイルを更新
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

// ブラシタイプの変更
brushTypeSelect.addEventListener('change', (e) => {
    brushType = e.target.value;
    updateBrushType();
});

// ブラシタイプの更新
function updateBrushType() {
    switch (brushType) {
        case 'solid':
            context.setLineDash([]);
            break;
        case 'dotted':
            context.setLineDash([brushSize, brushSize]);
            break;
        case 'dashed':
            context.setLineDash([brushSize * 5, brushSize * 5]);
            break;
        default:
            context.setLineDash([]);
            break;
    }
}

// キャンバスのクリア
clearCanvasButton.addEventListener('click', () => {
    pushUndoStack();
    context.clearRect(0, 0, canvas.width, canvas.height);
});

// アンドゥボタン
undoButton.addEventListener('click', () => {
    if (undoStack.length > 0) {
        const imgData = undoStack.pop();
        context.putImageData(imgData, 0, 0);
    }
});

// 保存ボタン
saveButton.addEventListener('click', () => {
    const format = saveFormatSelect.value;
    let dataURL;
    if (format === 'png') {
        dataURL = canvas.toDataURL('image/png');
        downloadImage(dataURL, 'Pictura.png');
    } else if (format === 'jpg') {
        dataURL = canvas.toDataURL('image/jpeg', 1.0);
        downloadImage(dataURL, 'Pictura.jpg');
    } else if (format === 'bmp') {
        // BMP形式での保存
        dataURL = canvas.toDataURL('image/bmp');
        downloadImage(dataURL, 'Pictura.bmp');
    } else if (format === 'pdf') {
        // jsPDFを使用してPDFとして保存
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape');
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        pdf.save('Pictura.pdf');
    } else if (format === 'svg') {
        // SVG形式での保存（canvgライブラリなどが必要）
        alert('SVG形式での保存は現在サポートされていません。');
    } else if (format === 'html') {
        // HTMLファイルとして保存
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <body>
            <img src="${canvas.toDataURL()}">
            </body>
            </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Pictura.html';
        a.click();
        URL.revokeObjectURL(url);
    }
});

// 画像をダウンロード
function downloadImage(data, filename) {
    const a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// マウスダウンイベント
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    startX = getX(e);
    startY = getY(e);
    pushUndoStack(); // 描画前に現在の状態を保存
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
            context.closePath();
            break;
        case 'rectangle':
            const rectWidth = endX - startX;
            const rectHeight = endY - startY;
            context.beginPath();
            context.rect(startX, startY, rectWidth, rectHeight);
            context.stroke();
            context.closePath();
            break;
        case 'circle':
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            context.beginPath();
            context.arc(startX, startY, radius, 0, Math.PI * 2);
            context.stroke();
            context.closePath();
            break;
        default:
            break;
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

// Undoスタックに現在の状態を保存
function pushUndoStack() {
    if (undoStack.length >= 1) {
        undoStack.shift(); // 最大1つまで保持
    }
    undoStack.push(context.getImageData(0, 0, canvas.width, canvas.height));
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
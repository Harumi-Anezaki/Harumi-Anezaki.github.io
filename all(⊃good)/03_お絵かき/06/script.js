// グローバル変数や初期設定
const canvas = new fabric.Canvas('canvas', {
    selection: true
});

// 初期設定
let currentTool = document.getElementById('tool').value;
let currentBrush = document.getElementById('brush').value;
let currentColor = document.getElementById('color').value;
let currentSize = parseInt(document.getElementById('size').value, 10);
let bgColor = document.getElementById('bgColor').value;
let isDrawing = false;
let drawingObject;
let zoom = 1;
let gridVisible = false;
let layers = [];
let activeLayerIndex = 0;
let colorPalette = [];

canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));

// ブラシの設定
canvas.isDrawingMode = false;
updateBrush();

// イベントリスナーの設定
document.getElementById('tool').addEventListener('change', function() {
    currentTool = this.value;
    canvas.isDrawingMode = (currentTool === 'pen');
    if (canvas.isDrawingMode) {
        updateBrush();
    }
    canvas.selection = (currentTool === 'select');
});

document.getElementById('brush').addEventListener('change', function() {
    currentBrush = this.value;
    if (canvas.isDrawingMode) {
        updateBrush();
    }
});

document.getElementById('color').addEventListener('change', function() {
    currentColor = this.value;
    if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = currentColor;
    }
});

document.getElementById('size').addEventListener('change', function() {
    currentSize = parseInt(this.value, 10);
    if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.width = currentSize;
    }
});

document.getElementById('bgColor').addEventListener('change', function() {
    bgColor = this.value;
});

document.getElementById('setBgColor').addEventListener('click', function() {
    canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
});

document.getElementById('zoomIn').addEventListener('click', function() {
    zoom *= 1.1;
    canvas.setZoom(zoom);
});

document.getElementById('zoomOut').addEventListener('click', function() {
    zoom /= 1.1;
    canvas.setZoom(zoom);
});

document.getElementById('toggleGrid').addEventListener('click', function() {
    gridVisible = !gridVisible;
    if (gridVisible) {
        drawGrid();
    } else {
        canvas.backgroundImage = null;
        canvas.renderAll();
    }
});

document.getElementById('addToPalette').addEventListener('click', function() {
    if (!colorPalette.includes(currentColor)) {
        colorPalette.push(currentColor);
        updateColorPalette();
    }
});

// グリッド描画
function drawGrid() {
    const gridSize = 50;
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    const gridCtx = gridCanvas.getContext('2d');
    gridCtx.strokeStyle = '#ccc';
    gridCtx.lineWidth = 1;

    for (let i = 0; i <= canvas.width / gridSize; i++) {
        gridCtx.beginPath();
        gridCtx.moveTo(i * gridSize, 0);
        gridCtx.lineTo(i * gridSize, canvas.height);
        gridCtx.stroke();
    }

    for (let i = 0; i <= canvas.height / gridSize; i++) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, i * gridSize);
        gridCtx.lineTo(canvas.width, i * gridSize);
        gridCtx.stroke();
    }

    const gridDataUrl = gridCanvas.toDataURL('image/png');
    fabric.Image.fromURL(gridDataUrl, function(img) {
        img.selectable = false;
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
}

// ブラシの更新
function updateBrush() {
    switch (currentBrush) {
        case 'Pencil':
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            break;
        case 'Circle':
            canvas.freeDrawingBrush = new fabric.CircleBrush(canvas);
            break;
        case 'Spray':
            canvas.freeDrawingBrush = new fabric.SprayBrush(canvas);
            break;
        case 'Pattern':
            canvas.freeDrawingBrush = new fabric.PatternBrush(canvas);
            break;
        default:
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
    canvas.freeDrawingBrush.color = currentColor;
    canvas.freeDrawingBrush.width = currentSize;
}

// カラーパレットの更新
function updateColorPalette() {
    const paletteContainer = document.getElementById('colorPalette');
    paletteContainer.innerHTML = '<label>パレット:</label>';
    colorPalette.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.style.backgroundColor = color;
        colorButton.addEventListener('click', function() {
            currentColor = color;
            document.getElementById('color').value = color;
            if (canvas.isDrawingMode) {
                canvas.freeDrawingBrush.color = currentColor;
            }
        });
        paletteContainer.appendChild(colorButton);
    });
}

// レイヤー管理
function addLayer() {
    const newLayer = new fabric.Canvas();
    layers.push(newLayer);
    activeLayerIndex = layers.length - 1;
    updateLayerList();
}

function updateLayerList() {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';
    layers.forEach((layer, index) => {
        const layerItem = document.createElement('li');
        layerItem.textContent = `レイヤー ${index + 1}`;
        if (index === activeLayerIndex) {
            layerItem.classList.add('active');
        }
        layerItem.addEventListener('click', function() {
            activeLayerIndex = index;
            updateLayerList();
        });
        layerList.appendChild(layerItem);
    });
}

document.getElementById('addLayer').addEventListener('click', function() {
    addLayer();
});

// 初期レイヤーの追加
addLayer();

// 元に戻す・やり直しのためのスタック
let undoStack = [];
let redoStack = [];

function updateStacks() {
    redoStack = [];
    const canvasJson = JSON.stringify(canvas);
    undoStack.push(canvasJson);
    if (undoStack.length > 50) {
        undoStack.shift();
    }
}

// 初期状態をスタックに保存
updateStacks();

// オブジェクトの変更を監視
canvas.on('object:added', function() {
    updateStacks();
});

canvas.on('object:modified', function() {
    updateStacks();
});

canvas.on('object:removed', function() {
    updateStacks();
});

// 元に戻す
document.getElementById('undo').addEventListener('click', function() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        const canvasState = undoStack[undoStack.length - 1];
        canvas.loadFromJSON(canvasState, function() {
            canvas.renderAll();
        });
    }
});

// やり直し
document.getElementById('redo').addEventListener('click', function() {
    if (redoStack.length > 0) {
        const canvasState = redoStack.pop();
        undoStack.push(canvasState);
        canvas.loadFromJSON(canvasState, function() {
            canvas.renderAll();
        });
    }
});

// キャンバスをクリア
document.getElementById('clearCanvas').addEventListener('click', function() {
    canvas.clear();
    canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
    undoStack = [];
    redoStack = [];
    updateStacks();
});

// オブジェクトの追加処理
canvas.on('mouse:down', function(o) {
    let pointer = canvas.getPointer(o.e);
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'polygon' || currentTool === 'star') {
        isDrawing = true;
        let origX = pointer.x;
        let origY = pointer.y;

        if (currentTool === 'line') {
            drawingObject = new fabric.Line([origX, origY, origX, origY], {
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        } else if (currentTool === 'rectangle') {
            drawingObject = new fabric.Rect({
                left: origX,
                top: origY,
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        } else if (currentTool === 'circle') {
            drawingObject = new fabric.Circle({
                left: origX,
                top: origY,
                radius: 1,
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        } else if (currentTool === 'polygon') {
            // 多角形（五角形）の例
            drawingObject = new fabric.Polygon([
                { x: origX, y: origY },
                { x: origX, y: origY },
                { x: origX, y: origY },
                { x: origX, y: origY },
                { x: origX, y: origY }
            ], {
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        } else if (currentTool === 'star') {
            // 星形はカスタムで描画が必要
            drawingObject = new fabric.Polygon(createStar(origX, origY, 5, 0, 0), {
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        }
        canvas.add(drawingObject);
    } else if (currentTool === 'eraser') {
        // 消しゴムツール
        canvas.isDrawingMode = false;
        isDrawing = true;
        drawingObject = new fabric.EraserBrush(canvas);
        canvas.freeDrawingBrush = drawingObject;
        drawingObject.width = currentSize;
        drawingObject.color = bgColor;
        canvas.isDrawingMode = true;
    } else if (currentTool === 'text') {
        // テキスト入力用のモーダルを表示
        document.getElementById('textModal').style.display = 'block';
        let textX = pointer.x;
        let textY = pointer.y;

        document.getElementById('addText').onclick = function() {
            let text = document.getElementById('textInput').value;
            if (text) {
                let textObj = new fabric.IText(text, {
                    left: textX,
                    top: textY,
                    fill: currentColor,
                    fontSize: currentSize * 5
                });
                canvas.add(textObj);
                updateStacks();
            }
            document.getElementById('textModal').style.display = 'none';
            document.getElementById('textInput').value = '';
        };

        document.getElementById('closeTextModal').onclick = function() {
            document.getElementById('textModal').style.display = 'none';
            document.getElementById('textInput').value = '';
        };
    } else if (currentTool === 'image') {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            let file = e.target.files[0];
            let reader = new FileReader();
            reader.onload = function(f) {
                let data = f.target.result;
                fabric.Image.fromURL(data, function(img) {
                    img.set({
                        left: canvas.width / 2,
                        top: canvas.height / 2,
                        originX: 'center',
                        originY: 'center',
                        selectable: true
                    });
                    img.scaleToWidth(300);
                    canvas.add(img);
                    updateStacks();
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    } else if (currentTool === 'colorpicker') {
        let clickedObject = canvas.findTarget(o.e);
        if (clickedObject) {
            let objectColor = clickedObject.fill || clickedObject.stroke;
            if (objectColor) {
                currentColor = objectColor;
                document.getElementById('color').value = currentColor;
                if (canvas.isDrawingMode) {
                    canvas.freeDrawingBrush.color = currentColor;
                }
            }
        }
    }
});

canvas.on('mouse:move', function(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    if (currentTool === 'line') {
        drawingObject.set({ x2: pointer.x, y2: pointer.y });
    } else if (currentTool === 'rectangle') {
        drawingObject.set({
            width: Math.abs(pointer.x - drawingObject.left),
            height: Math.abs(pointer.y - drawingObject.top),
            left: Math.min(pointer.x, drawingObject.left),
            top: Math.min(pointer.y, drawingObject.top)
        });
    } else if (currentTool === 'circle') {
        let radius = Math.hypot(pointer.x - drawingObject.left, pointer.y - drawingObject.top) / 2;
        drawingObject.set({
            radius: radius,
            left: (drawingObject.left > pointer.x) ? pointer.x : drawingObject.left,
            top: (drawingObject.top > pointer.y) ? pointer.y : drawingObject.top
        });
    } else if (currentTool === 'polygon') {
        // 多角形の再計算は省略
    } else if (currentTool === 'star') {
        drawingObject.set({
            points: createStar(drawingObject.left, drawingObject.top, 5, pointer.x - drawingObject.left, pointer.y - drawingObject.top)
        });
    }
    canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
    if (isDrawing) {
        isDrawing = false;
        drawingObject.selectable = true;
        drawingObject = null;
        canvas.isDrawingMode = false;
        updateStacks();
    }
});

// 星形を生成する関数
function createStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    innerRadius = innerRadius / 2;
    let step = Math.PI / spikes;
    let points = [];

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        points.push({ x: x, y: y });
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        points.push({ x: x, y: y });
        rot += step;
    }
    return points;
}

// 保存ボタンの処理
document.getElementById('saveCanvas').addEventListener('click', function() {
    document.getElementById('saveModal').style.display = 'block';
});

// モーダルの閉じるボタンの処理
document.getElementById('closeSaveModal').addEventListener('click', function() {
    document.getElementById('saveModal').style.display = 'none';
});

// 保存形式のボタンの処理
document.querySelectorAll('.save-format').forEach(function(button) {
    button.addEventListener('click', function() {
        let format = this.getAttribute('data-format');
        saveCanvasAs(format);
        document.getElementById('saveModal').style.display = 'none';
    });
});

// 保存処理の関数
function saveCanvasAs(format) {
    if (format === 'png' || format === 'jpeg') {
        let dataURL = canvas.toDataURL({
            format: format,
            quality: 1
        });
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = `pictura_drawing.${format}`;
        link.click();
    } else if (format === 'svg') {
        let svgData = canvas.toSVG();
        let blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'pictura_drawing.svg';
        link.click();
    } else if (format === 'pdf') {
        let dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
        });
        const pdf = new jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(dataURL, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('pictura_drawing.pdf');
    } else if (format === 'html') {
        let htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>保存されたPicturaの作品</title>
</head>
<body>
    <img src="${canvas.toDataURL('image/png')}" alt="Pictura Drawing">
</body>
</html>
        `;
        let blob = new Blob([htmlContent], { type: 'text/html' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'pictura_drawing.html';
        link.click();
    } else {
        alert('サポートされていない形式です。');
    }
}

// モーダル外をクリックしたときに閉じる
window.addEventListener('click', function(event) {
    let saveModal = document.getElementById('saveModal');
    if (event.target == saveModal) {
        saveModal.style.display = 'none';
    }
    let textModal = document.getElementById('textModal');
    if (event.target == textModal) {
        textModal.style.display = 'none';
        document.getElementById('textInput').value = '';
    }
});

// プロジェクトのエクスポート（JSON形式で保存）
document.getElementById('exportCanvas').addEventListener('click', function() {
    const canvasJson = JSON.stringify(canvas.toJSON());
    const blob = new Blob([canvasJson], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pictura_project.json';
    link.click();
});

// プロジェクトのインポート
document.getElementById('importCanvas').addEventListener('click', function() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = function(f) {
            let data = f.target.result;
            canvas.loadFromJSON(data, function() {
                canvas.renderAll();
                updateStacks();
            });
        };
        reader.readAsText(file);
    };
    input.click();
});

// ローカルストレージへの自動保存
function autoSave() {
    const canvasJson = JSON.stringify(canvas.toJSON());
    localStorage.setItem('pictura_canvas', canvasJson);
}

function loadAutoSave() {
    const canvasJson = localStorage.getItem('pictura_canvas');
    if (canvasJson) {
        canvas.loadFromJSON(canvasJson, function() {
            canvas.renderAll();
        });
    }
}

// キャンバスの変更を監視して自動保存
canvas.on('object:added', autoSave);
canvas.on('object:modified', autoSave);
canvas.on('object:removed', autoSave);

// ページ読み込み時に自動保存データを読み込む
window.onload = function() {
    loadAutoSave();
};
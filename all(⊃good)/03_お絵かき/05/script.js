// Fabric.jsを使用してキャンバスを初期化
const canvas = new fabric.Canvas('canvas', {
    selection: false
});

// ツールとスタイルの設定
let currentTool = document.getElementById('tool').value;
let currentColor = document.getElementById('color').value;
let currentSize = parseInt(document.getElementById('size').value, 10);
let bgColor = document.getElementById('bgColor').value;
let isDrawing = false;
let drawingObject;
let zoom = 1;

// グリッドの設定
const gridSize = 20;
let gridOn = false;

// イベントリスナーの設定
document.getElementById('tool').addEventListener('change', function() {
    currentTool = this.value;
    canvas.isDrawingMode = (currentTool === 'pen');
    if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = currentSize;
    }
    if (currentTool === 'eraser') {
        canvas.isDrawingMode = false;
    }
    canvas.selection = (currentTool === 'select');
    canvas.forEachObject(function(obj) {
        obj.selectable = (currentTool === 'select');
    });
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
    gridOn = !gridOn;
    if (gridOn) {
        drawGrid();
    } else {
        canvas.backgroundImage = null;
        canvas.renderAll();
    }
});

function drawGrid() {
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    const gridCtx = gridCanvas.getContext('2d');
    gridCtx.strokeStyle = '#ccc';
    gridCtx.lineWidth = 1;

    for (let i = 0; i < canvas.width / gridSize; i++) {
        gridCtx.beginPath();
        gridCtx.moveTo(i * gridSize, 0);
        gridCtx.lineTo(i * gridSize, canvas.height);
        gridCtx.stroke();
    }

    for (let i = 0; i < canvas.height / gridSize; i++) {
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

// 元に戻す・やり直しのためのスタック
let undoStack = [];
let redoStack = [];

function updateStacks() {
    // 操作が行われたら、redoStackをクリア
    redoStack = [];
    // 現在のキャンバスの状態を保存
    const canvasJson = canvas.toJSON();
    undoStack.push(canvasJson);
    if (undoStack.length > 20) {
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
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
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
            drawingObject = new fabric.Ellipse({
                left: origX,
                top: origY,
                originX: 'left',
                originY: 'top',
                rx: 0,
                ry: 0,
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: currentSize,
                selectable: false
            });
        }
        canvas.add(drawingObject);
    } else if (currentTool === 'eraser') {
        isDrawing = true;
        canvas.isDrawingMode = false;
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
            if (clickedObject.fill) {
                currentColor = clickedObject.fill;
            } else if (clickedObject.stroke) {
                currentColor = clickedObject.stroke;
            }
            document.getElementById('color').value = currentColor;
            if (canvas.isDrawingMode) {
                canvas.freeDrawingBrush.color = currentColor;
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
        let width = pointer.x - drawingObject.left;
        let height = pointer.y - drawingObject.top;
        drawingObject.set({ width: width, height: height });
    } else if (currentTool === 'circle') {
        let rx = Math.abs(pointer.x - drawingObject.left) / 2;
        let ry = Math.abs(pointer.y - drawingObject.top) / 2;
        drawingObject.set({ rx: rx, ry: ry });
        if (pointer.x < drawingObject.left) {
            drawingObject.set({ originX: 'right' });
        } else {
            drawingObject.set({ originX: 'left' });
        }
        if (pointer.y < drawingObject.top) {
            drawingObject.set({ originY: 'bottom' });
        } else {
            drawingObject.set({ originY: 'top' });
        }
    }
    canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
    if (isDrawing) {
        isDrawing = false;
        if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
            drawingObject.setCoords();
            drawingObject.selectable = true;
            drawingObject = null;
        }
        canvas.isDrawingMode = false;
        updateStacks();
    }
});

// 保存ボタンの処理
document.getElementById('saveCanvas').addEventListener('click', function() {
    // モーダルダイアログを表示
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
        let imgData = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
        });
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.getWidth(), canvas.getHeight()]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.getWidth(), canvas.getHeight());
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
    const canvasJson = JSON.stringify(canvas.toJSON(['selectable']));
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
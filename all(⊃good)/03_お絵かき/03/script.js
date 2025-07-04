// Fabric.jsを使用してキャンバスを初期化
const canvas = new fabric.Canvas('canvas');

// ツールとスタイルの設定
let currentTool = document.getElementById('tool').value;
let currentColor = document.getElementById('color').value;
let currentSize = parseInt(document.getElementById('size').value, 10);
let bgColor = document.getElementById('bgColor').value;
let isDrawing = false;
let drawingObject;

// イベントリスナーの設定
document.getElementById('tool').addEventListener('change', function() {
    currentTool = this.value;
    canvas.isDrawingMode = (currentTool === 'pen');
    if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = currentSize;
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

// 元に戻す・やり直しのためのスタック
let state = [];
let mods = 0;

canvas.on('object:added', function() {
    if (mods < 0) {
        mods = 0;
    }
    this.serialize();
});

canvas.on('object:modified', function() {
    this.serialize();
});

canvas.on('object:removed', function() {
    this.serialize();
});

canvas.serialize = function() {
    state.push(JSON.stringify(this));
};

// 元に戻す
document.getElementById('undo').addEventListener('click', function() {
    if (state.length > 1) {
        canvas.clear();
        state.pop();
        canvas.loadFromJSON(state[state.length - 1], canvas.renderAll.bind(canvas));
    }
});

// やり直しは簡略化のため省略しています

// キャンバスをクリア
document.getElementById('clearCanvas').addEventListener('click', function() {
    canvas.clear();
    canvas.backgroundColor = bgColor;
    state = [];
    canvas.serialize();
});

// オブジェクトの追加処理
canvas.on('mouse:down', function(o) {
    if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
        isDrawing = true;
        let pointer = canvas.getPointer(o.e);
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
    } else if (currentTool === 'text') {
        let pointer = canvas.getPointer(o.e);
        let text = prompt('入力するテキストを入力してください:');
        if (text) {
            let textObj = new fabric.IText(text, {
                left: pointer.x,
                top: pointer.y,
                fill: currentColor,
                fontSize: currentSize * 5
            });
            canvas.add(textObj);
        }
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
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
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
        drawingObject.setCoords();
        drawingObject.selectable = true;
        drawingObject = null;
        canvas.serialize();
    }
});

// 保存ボタンの処理
document.getElementById('saveCanvas').addEventListener('click', function() {
    let format = prompt('保存形式を選択してください（png、jpeg、svg、pdf）:', 'png');
    if (format) {
        format = format.toLowerCase();
        if (format === 'png' || format === 'jpeg') {
            let dataURL = canvas.toDataURL({
                format: format,
                quality: 1
            });
            let link = document.createElement('a');
            link.href = dataURL;
            link.download = `my_drawing.${format}`;
            link.click();
        } else if (format === 'svg') {
            let svgData = canvas.toSVG();
            let blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'my_drawing.svg';
            link.click();
        } else if (format === 'pdf') {
            let imgData = canvas.toDataURL({
                format: 'png',
                quality: 1
            });
            const pdf = new jsPDF('landscape', 'pt', [canvas.width, canvas.height]);
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('my_drawing.pdf');
        } else {
            alert('サポートされていない形式です。');
        }
    }
});

// jsPDFライブラリの読み込み
import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(({ jsPDF }) => {
    window.jsPDF = jsPDF;
});
// canvasとコンテキストの取得
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ツールとスタイルの設定
let tool = document.getElementById('tool').value;
let drawing = false;
let startX, startY;
let currentColor = document.getElementById('color').value;
let currentSize = document.getElementById('size').value;
let bgColor = document.getElementById('bgColor').value;

// イベントリスナーの追加
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('touchstart', startDraw);

canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseout', endDraw);
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('touchcancel', endDraw);

canvas.addEventListener('mousemove', drawingEvent);
canvas.addEventListener('touchmove', drawingEvent);

document.getElementById('tool').addEventListener('change', function() {
    tool = this.value;
});

document.getElementById('color').addEventListener('change', function() {
    currentColor = this.value;
});

document.getElementById('size').addEventListener('change', function() {
    currentSize = this.value;
});

document.getElementById('bgColor').addEventListener('change', function() {
    bgColor = this.value;
});

function setBackgroundColor() {
    canvas.style.backgroundColor = bgColor;
}

// 描画の開始
function startDraw(e) {
    e.preventDefault();
    drawing = true;
    [startX, startY] = getPosition(e);

    if (tool === 'text') {
        let text = prompt('入力するテキストを入力してください:');
        if (text !== null) {
            ctx.fillStyle = currentColor;
            ctx.font = `${currentSize * 2}px Arial`;
            ctx.fillText(text, startX, startY);
        }
        drawing = false;
    } else if (tool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }
}

// 描画の終了
function endDraw(e) {
    if (!drawing) return;
    drawing = false;
    let [endX, endY] = getPosition(e);

    if (tool === 'rectangle') {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (tool === 'circle') {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        let radius = Math.hypot(endX - startX, endY - startY);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
        ctx.stroke();
    } else if (tool === 'pen') {
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.closePath();
    }
}

// 描画中の処理
function drawingEvent(e) {
    if (!drawing) return;
    e.preventDefault();
    let [x, y] = getPosition(e);

    if (tool === 'pen') {
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentColor;

        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

// マウスまたはタッチの位置を取得
function getPosition(e) {
    let rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX - rect.left;
        y = e.changedTouches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return [x, y];
}

// キャンバスをクリア
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 背景色を再設定
    canvas.style.backgroundColor = bgColor;
}

// キャンバスを保存
function saveCanvas(format) {
    let link = document.createElement('a');
    if (format === 'svg') {
        let svgData = canvasToSVG();
        let svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
        link.href = URL.createObjectURL(svgBlob);
        link.download = 'my_drawing.svg';
        link.click();
    } else {
        link.href = canvas.toDataURL(`image/${format}`);
        link.download = `my_drawing.${format}`;
        link.click();
    }
}

// キャンバスをSVGに変換
function canvasToSVG() {
    let serializer = new XMLSerializer();
    let svgNS = "http://www.w3.org/2000/svg";

    let svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", canvas.width);
    svg.setAttribute("height", canvas.height);

    let img = document.createElementNS(svgNS, "image");
    img.setAttributeNS(null, 'width', canvas.width);
    img.setAttributeNS(null, 'height', canvas.height);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL("image/png"));

    svg.appendChild(img);

    let svgString = serializer.serializeToString(svg);
    return svgString;
}

// キャンバスをPDFとして保存
function saveAsPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('my_drawing.pdf');
}

// キャンバスをHTMLとして保存
function saveAsHTML() {
    let htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>保存されたお絵かき</title>
</head>
<body>
    <img src="${canvas.toDataURL('image/png')}" alt="My Drawing">
</body>
</html>
    `;
    let blob = new Blob([htmlContent], { type: 'text/html' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_drawing.html';
    link.click();
}
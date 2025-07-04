window.addEventListener('load', function() {
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let currentTool = 'pen';
    let color = '#000000';
    let startX, startY;
    let zoomLevel = 1;
    let history = [];
    let layers = [];
    let currentLayer = 0;

    // ツールのボタン
    const penTool = document.getElementById('pen-tool');
    const lineTool = document.getElementById('line-tool');
    const shapeTool = document.getElementById('shape-tool');
    const textTool = document.getElementById('text-tool');
    const eraserTool = document.getElementById('eraser-tool');
    const colorPicker = document.getElementById('color-picker');
    const undoButton = document.getElementById('undo');
    const resetButton = document.getElementById('reset');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const saveButton = document.getElementById('save');
    const layersButton = document.getElementById('layers');

    // モーダル関連
    const modal = document.getElementById('modal');
    const closeButton = document.querySelector('.close-button');
    const shapeOptions = document.getElementById('shape-options');

    // ツールのイベントリスナー
    penTool.addEventListener('click', () => currentTool = 'pen');
    lineTool.addEventListener('click', () => currentTool = 'line');
    shapeTool.addEventListener('click', openShapeModal);
    textTool.addEventListener('click', () => currentTool = 'text');
    eraserTool.addEventListener('click', () => currentTool = 'eraser');
    colorPicker.addEventListener('change', (e) => color = e.target.value);
    undoButton.addEventListener('click', undo);
    resetButton.addEventListener('click', resetCanvas);
    zoomInButton.addEventListener('click', () => zoomCanvas(1.1));
    zoomOutButton.addEventListener('click', () => zoomCanvas(0.9));
    saveButton.addEventListener('click', saveImage);
    layersButton.addEventListener('click', manageLayers);

    // キャンバスのイベントリスナー
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);

    // モーダルのイベントリスナー
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', outsideClick);

    // 関数定義
    function startPosition(e) {
        drawing = true;
        startX = e.offsetX;
        startY = e.offsetY;
        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        }
    }

    function endPosition(e) {
        if (!drawing) return;
        drawing = false;
        if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.strokeStyle = color;
            ctx.stroke();
            saveState();
        } else if (currentTool === 'shape') {
            drawShape(e.offsetX, e.offsetY);
            saveState();
        }
        ctx.closePath();
    }

    function draw(e) {
        if (!drawing) return;
        if (currentTool === 'pen') {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            saveState();
        } else if (currentTool === 'eraser') {
            ctx.clearRect(e.offsetX, e.offsetY, 10, 10);
            saveState();
        }
    }

    function drawShape(endX, endY) {
        const width = endX - startX;
        const height = endY - startY;
        ctx.strokeStyle = color;
        if (selectedShape === 'rectangle') {
            ctx.strokeRect(startX, startY, width, height);
        } else if (selectedShape === 'circle') {
            ctx.beginPath();
            ctx.arc(startX, startY, Math.abs(width), 0, Math.PI * 2);
            ctx.stroke();
        } else if (selectedShape === 'star') {
            // 星型の描画アルゴリズムを実装
        }
    }

    function openShapeModal() {
        currentTool = 'shape';
        modal.style.display = 'block';
    }

    let selectedShape = 'rectangle';
    shapeOptions.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            selectedShape = e.target.getAttribute('data-shape');
            closeModal();
        }
    });

    function closeModal() {
        modal.style.display = 'none';
    }

    function outsideClick(e) {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    }

    function undo() {
        if (history.length > 0) {
            let imageData = history.pop();
            ctx.putImageData(imageData, 0, 0);
        }
    }

    function saveState() {
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        history.push(imageData);
    }

    function resetCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history = [];
    }

    function zoomCanvas(factor) {
        zoomLevel *= factor;
        canvas.style.transform = `scale(${zoomLevel})`;
    }

    function saveImage() {
        // 画像を保存する処理（png, jpegなど）
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'pictura.png';
        link.click();
    }

    function manageLayers() {
        // レイヤー管理の処理
    }
});
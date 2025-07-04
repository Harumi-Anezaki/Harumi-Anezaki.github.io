window.addEventListener('load', function() {
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');

    // キャンバスをウィンドウサイズに対応させる
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        redraw();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ブラウザの拡大・縮小に対応する
    window.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    let isDrawing = false;
    let currentTool = 'pen';
    let color = '#000000';
    let backgroundColor = '#ffffff';
    let textColor = '#000000';
    let startX, startY;
    let selectedShape = 'rectangle';
    let isErasing = false;
    let scale = 1;
    let history = [];
    let redoStack = [];

    // レイアウト機能
    let layouts = {
        'layout1': false,
        'layout2': false,
        'layout3': false
    };
    let currentLayout = [];

    // 描画オブジェクトのリスト
    let objects = [];

    // ツールのイベントリスナー
    document.getElementById('select-tool').addEventListener('click', () => selectTool('select'));
    document.getElementById('pen-tool').addEventListener('click', () => selectTool('pen'));
    document.getElementById('line-tool').addEventListener('click', () => selectTool('line'));
    document.getElementById('shape-tool').addEventListener('click', () => {
        currentTool = 'shape';
        openModal('shape-modal');
    });
    document.getElementById('text-tool').addEventListener('click', () => selectTool('text'));
    document.getElementById('image-tool').addEventListener('click', () => selectTool('image'));
    document.getElementById('eraser-tool').addEventListener('click', () => selectTool('eraser'));
    document.getElementById('color-picker-tool').addEventListener('click', () => selectTool('color-picker'));
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('redo').addEventListener('click', redo);
    document.getElementById('reset').addEventListener('click', resetCanvas);
    document.getElementById('zoom-in').addEventListener('click', () => zoomCanvas(1.1));
    document.getElementById('zoom-out').addEventListener('click', () => zoomCanvas(0.9));
    document.getElementById('export-project').addEventListener('click', exportProject);
    document.getElementById('import-project').addEventListener('click', () => importProjectInput.click());
    document.getElementById('save').addEventListener('click', saveImage);
    document.getElementById('layouts').addEventListener('click', () => openModal('layout-modal'));

    // 色変更
    document.getElementById('pen-color-picker').addEventListener('change', function() {
        color = this.value;
    });
    document.getElementById('background-color-picker').addEventListener('change', function() {
        backgroundColor = this.value;
        canvas.style.backgroundColor = backgroundColor;
    });
    document.getElementById('text-color-picker').addEventListener('change', function() {
        textColor = this.value;
    });

    // 図形選択モーダル
    document.getElementById('shape-modal-close').addEventListener('click', () => closeModal('shape-modal'));
    document.getElementById('shape-modal').addEventListener('click', function(e) {
        if (e.target.classList.contains('shape-button')) {
            selectedShape = e.target.getAttribute('data-shape');
            closeModal('shape-modal');
        }
    });

    // レイアウト選択モーダル
    document.getElementById('layout-modal-close').addEventListener('click', () => closeModal('layout-modal'));
    document.getElementById('apply-layout').addEventListener('click', applyLayout);

    function selectTool(tool) {
        currentTool = tool;
    }

    function openModal(id) {
        document.getElementById(id).style.display = 'block';
    }

    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    function applyLayout() {
        const checkboxes = document.querySelectorAll('#layout-options input[name="layout"]');
        currentLayout = [];
        checkboxes.forEach(box => {
            layouts[box.value] = box.checked;
            if (box.checked) currentLayout.push(box.value);
        });
        closeModal('layout-modal');
        redraw();
    }

    // キャンバスのイベントリスナー
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);

    function startPosition(e) {
        isDrawing = true;
        startX = e.offsetX / scale;
        startY = e.offsetY / scale;
        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        } else if (currentTool === 'select') {
            // 選択機能の実装
        } else if (currentTool === 'text') {
            let text = prompt('テキストを入力');
            if (text) {
                const textObj = {
                    type: 'text',
                    x: startX,
                    y: startY,
                    content: text,
                    color: textColor,
                    layouts: [...currentLayout]
                };
                objects.push(textObj);
                saveState();
                redraw();
            }
            isDrawing = false;
        } else if (currentTool === 'image') {
            // 画像挿入
            imageUploadInput.click();
            isDrawing = false;
        }
    }

    function endPosition(e) {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentTool === 'line' || currentTool === 'shape') {
            let endX = e.offsetX / scale;
            let endY = e.offsetY / scale;
            const shapeObj = {
                type: currentTool === 'line' ? 'line' : selectedShape,
                x1: startX,
                y1: startY,
                x2: endX,
                y2: endY,
                color: color,
                layouts: [...currentLayout]
            };
            objects.push(shapeObj);
            saveState();
            redraw();
        }
    }

    function draw(e) {
        if (!isDrawing) return;
        let currentX = e.offsetX / scale;
        let currentY = e.offsetY / scale;
        if (currentTool === 'pen') {
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            const penObj = {
                type: 'pen',
                x1: startX,
                y1: startY,
                x2: currentX,
                y2: currentY,
                color: color,
                layouts: [...currentLayout]
            };
            objects.push(penObj);
            startX = currentX;
            startY = currentY;
            saveState();
        } else if (currentTool === 'eraser') {
            ctx.clearRect(currentX - 5, currentY - 5, 10, 10);
            // 消しゴムの処理
        }
    }

    function saveState() {
        history.push(JSON.stringify(objects));
        redoStack = [];
    }

    function undo() {
        if (history.length > 0) {
            redoStack.push(history.pop());
            objects = JSON.parse(history[history.length -1] || '[]');
            redraw();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const state = redoStack.pop();
            history.push(state);
            objects = JSON.parse(state);
            redraw();
        }
    }

    function resetCanvas() {
        if (confirm('キャンバスをリセットしますか？')) {
            objects = [];
            history = [];
            redoStack = [];
            redraw();
        }
    }

    function zoomCanvas(factor) {
        scale *= factor;
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = '0 0';
    }

    // 画像挿入
    const imageUploadInput = document.createElement('input');
    imageUploadInput.type = 'file';
    imageUploadInput.accept = 'image/*';
    imageUploadInput.style.display = 'none';
    document.body.appendChild(imageUploadInput);

    imageUploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const imgObj = new Image();
            imgObj.onload = function() {
                const imgObjData = {
                    type: 'image',
                    x: startX,
                    y: startY,
                    image: imgObj,
                    layouts: [...currentLayout]
                };
                objects.push(imgObjData);
                saveState();
                redraw();
            }
            imgObj.src = event.target.result;
        }
        reader.readAsDataURL(file);
        imageUploadInput.value = '';
    });

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        objects.forEach(obj => {
            if (obj.layouts.length === 0 || obj.layouts.some(l => layouts[l])) {
                if (obj.type === 'pen') {
                    ctx.beginPath();
                    ctx.moveTo(obj.x1, obj.y1);
                    ctx.lineTo(obj.x2, obj.y2);
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obj.type === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(obj.x1, obj.y1);
                    ctx.lineTo(obj.x2, obj.y2);
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obj.type === 'rectangle') {
                    ctx.beginPath();
                    ctx.rect(obj.x1, obj.y1, obj.x2 - obj.x1, obj.y2 - obj.y1);
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obj.type === 'circle') {
                    ctx.beginPath();
                    let radius = Math.sqrt(Math.pow(obj.x2 - obj.x1, 2) + Math.pow(obj.y2 - obj.y1,2));
                    ctx.arc(obj.x1, obj.y1, radius, 0, 2 * Math.PI);
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obj.type === 'triangle') {
                    ctx.beginPath();
                    ctx.moveTo(obj.x1, obj.y2);
                    ctx.lineTo((obj.x1 + obj.x2) / 2, obj.y1);
                    ctx.lineTo(obj.x2, obj.y2);
                    ctx.closePath();
                    ctx.strokeStyle = obj.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (obj.type === 'text') {
                    ctx.fillStyle = obj.color;
                    ctx.font = '20px Arial';
                    ctx.fillText(obj.content, obj.x, obj.y);
                } else if (obj.type === 'image') {
                    ctx.drawImage(obj.image, obj.x, obj.y);
                }
            }
        });
        ctx.restore();
    }

    // プロジェクトのエクスポート・インポート
    function exportProject() {
        const data = JSON.stringify(objects);
        const blob = new Blob([data], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'pictura_project.json';
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    const importProjectInput = document.createElement('input');
    importProjectInput.type = 'file';
    importProjectInput.accept = 'application/json';
    importProjectInput.style.display = 'none';
    document.body.appendChild(importProjectInput);

    importProjectInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            objects = JSON.parse(event.target.result);
            saveState();
            redraw();
        }
        reader.readAsText(file);
        importProjectInput.value = '';
    });

    // 画像の保存
    function saveImage() {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'pictura.png';
        link.href = dataURL;
        link.click();
    }

    // 初期設定
    canvas.style.backgroundColor = backgroundColor;
    saveState();
});
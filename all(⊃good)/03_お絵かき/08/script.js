$(document).ready(function() {
    const canvasWrapper = $('#canvas-wrapper');
    let layers = [];
    let currentLayerIndex = 0;
    let currentTool = 'pen';
    let color = '#000000';
    let backgroundColor = '#ffffff';
    let textColor = '#000000';
    let isDrawing = false;
    let startX, startY;
    let selectedShape = 'rectangle';
    let zoomLevel = 1;
    let history = [];

    // 初期レイヤーを追加
    addLayer();

    // ツールの選択
    $('#pen-tool').click(() => selectTool('pen'));
    $('#line-tool').click(() => selectTool('line'));
    $('#shape-tool').click(() => {
        selectTool('shape');
        $('#shape-modal').modal('show');
    });
    $('#text-tool').click(() => selectTool('text'));
    $('#eraser-tool').click(() => selectTool('eraser'));
    $('#color-picker-tool').click(() => selectTool('color-picker'));
    $('#undo').click(undo);
    $('#reset').click(resetCanvas);
    $('#zoom-in').click(() => zoomCanvas(1.1));
    $('#zoom-out').click(() => zoomCanvas(0.9));
    $('#save').click(saveImage);
    $('#project-save').click(saveProject);
    $('#layers').click(() => $('#layers-modal').modal('show'));

    // 色変更
    $('#pen-color-picker').change(function() {
        color = $(this).val();
    });
    $('#background-color-picker').change(function() {
        backgroundColor = $(this).val();
        $('.canvas-layer').css('background-color', backgroundColor);
    });
    $('#text-color-picker').change(function() {
        textColor = $(this).val();
    });

    // レイヤー管理
    $('#add-layer').click(addLayer);

    // キャンバスイベント
    canvasWrapper.on('mousedown', '.canvas-layer', startDrawing);
    canvasWrapper.on('mousemove', '.canvas-layer', draw);
    canvasWrapper.on('mouseup', '.canvas-layer', endDrawing);
    canvasWrapper.on('mouseleave', '.canvas-layer', endDrawing);

    // 図形選択
    $('#shape-modal').on('click', 'button[data-shape]', function() {
        selectedShape = $(this).data('shape');
        $('#shape-modal').modal('hide');
    });

    function selectTool(tool) {
        currentTool = tool;
        if (tool === 'color-picker') {
            // カラーピッカーの処理
            let colorPicked = prompt('色を選択してください（HEXコード）', color);
            if (colorPicked) {
                color = colorPicked;
                $('#pen-color-picker').val(color);
            }
        }
    }

    function addLayer() {
        let canvas = document.createElement('canvas');
        canvas.width = canvasWrapper.width();
        canvas.height = canvasWrapper.height();
        canvas.className = 'canvas-layer';
        canvas.style.zIndex = layers.length;
        canvas.style.backgroundColor = backgroundColor;
        canvasWrapper.append(canvas);

        layers.push({
            canvas: canvas,
            context: canvas.getContext('2d'),
            history: []
        });

        currentLayerIndex = layers.length - 1;
        updateLayersList();
    }

    function updateLayersList() {
        let layersList = $('#layers-list');
        layersList.empty();
        layers.forEach((layer, index) => {
            let layerItem = $(`
                <div class="layer-item">
                    <input type="radio" name="layer" value="${index}" ${index === currentLayerIndex ? 'checked' : ''}>
                    レイヤー ${index + 1}
                    <button class="delete-layer btn btn-sm btn-danger" data-index="${index}">削除</button>
                </div>
            `);
            layersList.append(layerItem);
        });

        // レイヤーの選択
        layersList.find('input[name="layer"]').change(function() {
            currentLayerIndex = parseInt($(this).val());
        });

        // レイヤーの削除
        layersList.find('.delete-layer').click(function() {
            let index = $(this).data('index');
            layers[index].canvas.remove();
            layers.splice(index,1);
            if (currentLayerIndex >= index && currentLayerIndex > 0) {
                currentLayerIndex--;
            }
            updateLayersList();
        });
    }

    function startDrawing(e) {
        isDrawing = true;
        const rect = e.target.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        const ctx = layers[currentLayerIndex].context;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        } else if (currentTool === 'text') {
            let text = prompt('テキストを入力');
            if (text) {
                ctx.fillStyle = textColor;
                ctx.font = '20px Arial';
                ctx.fillText(text, startX, startY);
                saveState();
            }
            isDrawing = false;
        }
    }

    function draw(e) {
        if (!isDrawing) return;
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = layers[currentLayerIndex].context;

        if (currentTool === 'pen') {
            ctx.lineTo(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (currentTool === 'eraser') {
            ctx.clearRect(x - 5, y -5, 10, 10);
        }
    }

    function endDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = layers[currentLayerIndex].context;

        if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (currentTool === 'shape') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            if (selectedShape === 'rectangle') {
                ctx.strokeRect(startX, startY, x - startX, y - startY);
            } else if (selectedShape === 'circle') {
                ctx.beginPath();
                let radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY,2));
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (selectedShape === 'star') {
                drawStar(ctx, startX, startY, 5, Math.abs(x - startX), Math.abs(y - startY));
            }
        }
        saveState();
    }

    function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.stroke();
    }

    function undo() {
        let layer = layers[currentLayerIndex];
        if (layer.history.length > 0) {
            layer.history.pop();
            let imgData = layer.history[layer.history.length -1];
            if (imgData) {
                layer.context.putImageData(imgData, 0, 0);
            } else {
                layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            }
        }
    }

    function saveState() {
        let layer = layers[currentLayerIndex];
        let imgData = layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        layer.history.push(imgData);
    }

    function resetCanvas() {
        layers.forEach(layer => {
            layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layer.history = [];
        });
    }

    function zoomCanvas(factor) {
        zoomLevel *= factor;
        canvasWrapper.css('transform', `scale(${zoomLevel})`);
    }

    function saveImage() {
        let mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = canvasWrapper.width();
        mergedCanvas.height = canvasWrapper.height();
        let mergedContext = mergedCanvas.getContext('2d');

        // レイヤーを順に合成
        layers.forEach(layer => {
            mergedContext.drawImage(layer.canvas, 0, 0);
        });

        // 保存形式の選択
        let format = prompt('保存形式を選択してください (png, jpeg, bmp, svg, html, pdf)');
        if (format) {
            if (format === 'png' || format === 'jpeg' || format === 'bmp') {
                let dataURL = mergedCanvas.toDataURL(`image/${format}`);
                downloadDataURL(dataURL, `pictura.${format}`);
            } else if (format === 'svg') {
                // CanvasをSVGに変換（簡易的な例）
                alert('SVG形式の保存には追加の実装が必要です。');
            } else if (format === 'html') {
                // キャンバスの内容を画像として埋め込んだHTMLを生成
                let htmlContent = `
                    <html>
                    <body>
                        <img src="${mergedCanvas.toDataURL('image/png')}">
                    </body>
                    </html>
                `;
                let blob = new Blob([htmlContent], {type: 'text/html'});
                let url = URL.createObjectURL(blob);
                downloadURL(url, 'pictura.html');
            } else if (format === 'pdf') {
                let pdf = new jsPDF();
                pdf.addImage(mergedCanvas.toDataURL('image/png'), 'PNG', 0, 0);
                pdf.save('pictura.pdf');
            } else {
                alert('対応していない形式です。');
            }
        }
    }

    function downloadDataURL(dataURL, filename) {
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        link.click();
    }

    function downloadURL(url, filename) {
        let link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    function saveProject() {
        let projectData = layers.map(layer => layer.canvas.toDataURL());
        localStorage.setItem('pictura_project', JSON.stringify(projectData));
        alert('プロジェクトを保存しました。');
    }

    // ページ読み込み時にプロジェクトを復元
    function loadProject() {
        let projectData = localStorage.getItem('pictura_project');
        if (projectData) {
            projectData = JSON.parse(projectData);
            resetCanvas();
            projectData.forEach((dataURL, index) => {
                if (index >= layers.length) {
                    addLayer();
                }
                let img = new Image();
                img.onload = function() {
                    layers[index].context.drawImage(img, 0, 0);
                };
                img.src = dataURL;
            });
        }
    }

    loadProject();
});
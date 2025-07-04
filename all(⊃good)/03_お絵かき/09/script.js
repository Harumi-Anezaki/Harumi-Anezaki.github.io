$(document).ready(function() {
    // Fabric.jsの初期化
    const canvas = new fabric.Canvas('drawing-canvas', {
        selection: false,
        uniScaleTransform: true,
        preserveObjectStacking: true
    });

    // キャンバスのリサイズ
    function resizeCanvas() {
        const containerWidth = $('.canvas-container').width();
        const containerHeight = $(window).height() - $('header').outerHeight();
        canvas.setWidth(containerWidth);
        canvas.setHeight(containerHeight);
        canvas.renderAll();
    }

    $(window).resize(resizeCanvas);
    resizeCanvas();

    // ツールの変数
    let currentTool = 'select';
    let color = '#000000';
    let backgroundColor = '#ffffff';
    let textColor = '#000000';
    let isDrawing = false;
    let line, origX, origY;
    let selectedShape = 'rectangle';
    let isErasing = false;

    // 描画モードの設定
    function setDrawingMode(mode) {
        canvas.isDrawingMode = (mode === 'pen');
        isErasing = (mode === 'eraser');
        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush.color = color;
            canvas.freeDrawingBrush.width = 2;
        }
    }

    // ツールボタンのクリックイベント
    $('#select-tool').click(() => {
        currentTool = 'select';
        canvas.selection = true;
        canvas.isDrawingMode = false;
    });

    $('#pen-tool').click(() => {
        currentTool = 'pen';
        setDrawingMode('pen');
    });

    $('#line-tool').click(() => {
        currentTool = 'line';
        canvas.isDrawingMode = false;
    });

    $('#shape-tool').click(() => {
        currentTool = 'shape';
        canvas.isDrawingMode = false;
        $('#shape-modal').modal('show');
    });

    $('#text-tool').click(() => {
        currentTool = 'text';
        canvas.isDrawingMode = false;
    });

    $('#image-tool').click(() => {
        currentTool = 'image';
        canvas.isDrawingMode = false;
        $('#image-upload-input').click();
    });

    $('#eraser-tool').click(() => {
        currentTool = 'eraser';
        setDrawingMode('eraser');
    });

    $('#color-picker-tool').click(() => {
        const colorPicked = $('#pen-color-picker').val();
        color = colorPicked;
        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush.color = color;
        }
    });

    $('#undo').click(undo);
    $('#redo').click(redo);
    $('#reset').click(resetCanvas);
    $('#zoom-in').click(() => zoomCanvas(1.1));
    $('#zoom-out').click(() => zoomCanvas(0.9));
    $('#export-project').click(exportProject);
    $('#import-project').click(() => $('#import-project-input').click());
    $('#save').click(saveImage);

    // 色変更
    $('#pen-color-picker').change(function() {
        color = $(this).val();
        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush.color = color;
        }
    });

    $('#background-color-picker').change(function() {
        backgroundColor = $(this).val();
        canvas.backgroundColor = backgroundColor;
        canvas.renderAll();
    });

    $('#text-color-picker').change(function() {
        textColor = $(this).val();
    });

    // 図形選択
    $('#shape-modal').on('click', 'button[data-shape]', function() {
        selectedShape = $(this).data('shape');
        $('#shape-modal').modal('hide');
    });

    // レイヤー管理（今回はFabric.jsのZ-Indexで管理）
    $('#layers').click(() => {
        const objects = canvas.getObjects();
        let layersHtml = '';
        for (let i = objects.length - 1; i >= 0; i--) {
            layersHtml += `
                <div class="layer-item" data-index="${i}">
                    <input type="checkbox" class="toggle-visibility" ${objects[i].visible ? 'checked' : ''}>
                    オブジェクト ${i + 1}
                    <button class="delete-object btn btn-sm btn-danger" data-index="${i}">削除</button>
                </div>
            `;
        }
        $('#layers-list').html(layersHtml);
        $('#layers-modal').modal('show');
    });

    $('#layers-list').on('change', '.toggle-visibility', function() {
        const index = $(this).closest('.layer-item').data('index');
        const object = canvas.item(index);
        object.visible = $(this).is(':checked');
        canvas.renderAll();
    });

    $('#layers-list').on('click', '.delete-object', function() {
        const index = $(this).data('index');
        const object = canvas.item(index);
        canvas.remove(object);
        $(this).closest('.layer-item').remove();
    });

    // 画像挿入
    $('#image-upload-input').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(f) {
            const imgObj = new Image();
            imgObj.src = f.target.result;
            imgObj.onload = function() {
                const img = new fabric.Image(imgObj);
                img.set({
                    left: 100,
                    top: 100,
                    angle: 0,
                    padding: 10,
                    cornersize: 10
                });
                canvas.add(img);
            }
        }
        reader.readAsDataURL(file);
        $(this).val('');
    });

    // 画像アップロード用のインプット（非表示）
    const imageUploadInput = $('<input type="file" id="image-upload-input" accept="image/*" style="display:none">');
    $('body').append(imageUploadInput);

    // インポート用のインプット（非表示）
    const importProjectInput = $('<input type="file" id="import-project-input" accept="application/json" style="display:none">');
    $('body').append(importProjectInput);

    // インポート処理
    $('#import-project-input').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(f) {
            const json = f.target.result;
            canvas.loadFromJSON(json, function() {
                canvas.renderAll();
                alert('プロジェクトをインポートしました。');
            });
        }
        reader.readAsText(file);
        $(this).val('');
    });

    // キャンバスのイベント
    canvas.on('mouse:down', function(o) {
        if (currentTool === 'line') {
            isDrawing = true;
            const pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            line = new fabric.Line([origX, origY, origX, origY], {
                stroke: color,
                strokeWidth: 2,
                selectable: false
            });
            canvas.add(line);
        } else if (currentTool === 'shape') {
            isDrawing = true;
            const pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            let shapeOptions = {
                left: origX,
                top: origY,
                fill: 'rgba(0,0,0,0)',
                stroke: color,
                strokeWidth: 2,
                selectable: false
            };
            if (selectedShape === 'rectangle') {
                line = new fabric.Rect(shapeOptions);
            } else if (selectedShape === 'circle') {
                line = new fabric.Ellipse(shapeOptions);
            } else if (selectedShape === 'triangle') {
                line = new fabric.Triangle(shapeOptions);
            } else if (selectedShape === 'star') {
                // 星型はカスタム描画が必要
                const starPath = 'M 0 -50 L 14 -20 L 47 -15 L 23 7 L 29 40 L 0 25 L -29 40 L -23 7 L -47 -15 L -14 -20 Z';
                line = new fabric.Path(starPath, shapeOptions);
            }
            canvas.add(line);
        } else if (currentTool === 'text') {
            const pointer = canvas.getPointer(o.e);
            const textString = prompt('テキストを入力');
            if (textString) {
                const text = new fabric.Textbox(textString, {
                    left: pointer.x,
                    top: pointer.y,
                    fill: textColor,
                    fontSize: 20
                });
                canvas.add(text);
            }
        } else if (currentTool === 'eraser') {
            // 消しゴムツール（オブジェクトを削除）
            const pointer = canvas.getPointer(o.e);
            const objects = canvas.getObjects();
            for (let i = objects.length - 1; i >= 0; i--) {
                if (objects[i].containsPoint(pointer)) {
                    canvas.remove(objects[i]);
                    break;
                }
            }
        } else if (currentTool === 'select') {
            canvas.selection = true;
        }
    });

    canvas.on('mouse:move', function(o) {
        if (!isDrawing) return;
        const pointer = canvas.getPointer(o.e);
        if (currentTool === 'line') {
            line.set({ x2: pointer.x, y2: pointer.y });
            canvas.renderAll();
        } else if (currentTool === 'shape') {
            if (selectedShape === 'rectangle' || selectedShape === 'triangle') {
                line.set({ width: Math.abs(origX - pointer.x), height: Math.abs(origY - pointer.y) });
                if (origX > pointer.x) {
                    line.set({ left: pointer.x });
                }
                if (origY > pointer.y) {
                    line.set({ top: pointer.y });
                }
            } else if (selectedShape === 'circle' || selectedShape === 'ellipse') {
                line.set({ rx: Math.abs(origX - pointer.x)/2, ry: Math.abs(origY - pointer.y)/2 });
                if (origX > pointer.x) {
                    line.set({ left: pointer.x });
                }
                if (origY > pointer.y) {
                    line.set({ top: pointer.y });
                }
            }
            canvas.renderAll();
        }
    });

    canvas.on('mouse:up', function(o) {
        isDrawing = false;
        line.setCoords();
    });

    // キャンバスのズーム
    function zoomCanvas(factor) {
        const newZoom = canvas.getZoom() * factor;
        canvas.zoomToPoint({ x: canvas.width / 2, y: canvas.height /2 }, newZoom);
    }

    // キャンバスのリセット
    function resetCanvas() {
        if (confirm('キャンバスをリセットしますか？')) {
            canvas.clear();
            canvas.backgroundColor = backgroundColor;
        }
    }

    // UndoとRedo
    const state = [];
    let mods = 0;

    canvas.on('object:added', function() {
        if (!isRedoing) {
            state.push(JSON.stringify(canvas));
        }
    });

    function undo() {
        if (state.length > 0) {
            isRedoing = true;
            canvas.loadFromJSON(state[state.length - 1 - mods - 1], function() {
                canvas.renderAll();
                isRedoing = false;
            });
            mods += 1;
        }
    }

    function redo() {
        if (mods > 0) {
            isRedoing = true;
            canvas.loadFromJSON(state[state.length - 1 - mods + 1], function() {
                canvas.renderAll();
                isRedoing = false;
            });
            mods -=1;
        }
    }

    // プロジェクトのエクスポート
    function exportProject() {
        const json = canvas.toJSON();
        const jsonString = JSON.stringify(json);
        const blob = new Blob([jsonString], { type: 'application/json' });
        saveAs(blob, 'pictura_project.json');
    }

    // 画像の保存
    function saveImage() {
        const dataURL = canvas.toDataURL({ format: 'png' });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'pictura.png';
        link.click();
    }

    // 初期設定
    canvas.backgroundColor = backgroundColor;
    canvas.renderAll();
});
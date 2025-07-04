// キャンバスとコンテキストの取得
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// キャンバスの位置とスケール
let canvasOffsetX = 0;
let canvasOffsetY = 0;
let canvasScale = 1;

// マウスの状態
let isDrawing = false;
let startX = 0;
let startY = 0;

// ツール関連の変数
let currentTool = 'pen';
let penSize = 5;
let penColor = '#000000';
let shapes = [];
let layers = [];
let currentLayer = null;
let undoStack = [];
let redoStack = [];

// 初期設定
function init() {
    // ツールバーの設定
    setupToolbar();

    // 属性パネルの設定
    updatePropertyPanel();

    // イベントリスナーの設定
    setupCanvasEvents();

    // その他の設定
    setupFileOperations();
    setupZoomControl();
    setupLayerPanel();
    setupColorPalette();

    // ローカルストレージからのデータ読み込み
    loadProjectData();

    // キャンバスのサイズ設定
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}
init();

// キャンバスのサイズ設定
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    redrawAll();
}

// ツールバーの設定
function setupToolbar() {
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            toolButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.dataset.tool;
            updatePropertyPanel();
        });
    });
}

// 属性パネルの更新
function updatePropertyPanel() {
    const panel = document.getElementById('property-panel');
    panel.innerHTML = '';

    if (currentTool === 'pen' || currentTool === 'line' || currentTool === 'eraser') {
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'サイズ:';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'range';
        sizeInput.min = 1;
        sizeInput.max = 100;
        sizeInput.value = penSize;
        sizeInput.addEventListener('input', (e) => {
            penSize = e.target.value;
        });
        panel.appendChild(sizeLabel);
        panel.appendChild(sizeInput);
    }

    // 他のツールの場合も同様に設定
}

// キャンバスのイベント設定
function setupCanvasEvents() {
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseout', onCanvasMouseUp); // マウスがキャンバス外に出たときに描画終了
    canvas.addEventListener('wheel', onCanvasWheel);

    // キャンバスのパン操作
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || (e.button === 0 && currentTool === 'pan')) {
            isPanning = true;
            panStartX = e.clientX - canvasOffsetX;
            panStartY = e.clientY - canvasOffsetY;
            canvas.style.cursor = 'grabbing';
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            canvasOffsetX = e.clientX - panStartX;
            canvasOffsetY = e.clientY - panStartY;
            updateCanvasTransform();
        }
    });
    canvas.addEventListener('mouseup', () => {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    });
    canvas.addEventListener('mouseleave', () => {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    });
}

// キャンバスの描画関連イベント
function onCanvasMouseDown(e) {
    if (e.button !== 0) return; // 左クリックのみ許可

    isDrawing = true;
    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);
    startX = x;
    startY = y;

    if (currentTool === 'pen') {
        const newShape = {
            type: 'pen',
            points: [{ x, y }],
            size: penSize,
            color: penColor,
            layer: currentLayer
        };
        shapes.push(newShape);
        currentShape = newShape;
    }

    // 他のツールの場合も同様に設定
}

function onCanvasMouseMove(e) {
    if (!isDrawing) return;

    const [x, y] = getCanvasCoordinates(e.clientX, e.clientY);

    if (currentTool === 'pen') {
        currentShape.points.push({ x, y });
        redrawAll();
    }

    // 他のツールの場合も同様に設定
}

function onCanvasMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    saveProjectData();
}

function onCanvasWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(canvasScale + delta, e.clientX, e.clientY);
}

// ズームとパンの設定
function setZoom(scale, centerX = canvas.width / 2, centerY = canvas.height / 2) {
    scale = Math.min(Math.max(scale, 0.1), 10);
    const prevScale = canvasScale;
    canvasScale = scale;

    // キャンバスの位置をズームセンターに合わせて調整
    const [canvasCenterX, canvasCenterY] = getCanvasCoordinates(centerX, centerY);
    canvasOffsetX -= (canvasScale - prevScale) * canvasCenterX;
    canvasOffsetY -= (canvasScale - prevScale) * canvasCenterY;

    updateCanvasTransform();
    redrawAll();

    const zoomSlider = document.getElementById('zoom-slider');
    zoomSlider.value = canvasScale * 100;
}

function updateCanvasTransform() {
    canvas.style.transform = `translate(${canvasOffsetX}px, ${canvasOffsetY}px) scale(${canvasScale})`;
}

// キャンバス上の座標を取得
function getCanvasCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - canvasOffsetX) / canvasScale;
    const y = (clientY - rect.top - canvasOffsetY) / canvasScale;
    return [x, y];
}

// 再描画
function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach(shape => {
        if (shape.layer && !shape.layer.visible) return;
        switch (shape.type) {
            case 'pen':
                ctx.strokeStyle = shape.color;
                ctx.lineWidth = shape.size;
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
                break;
            // 他の図形の描画処理
        }
    });
}

// ズームコントロールの設定
function setupZoomControl() {
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const zoomSlider = document.getElementById('zoom-slider');

    zoomInButton.addEventListener('click', () => {
        setZoom(canvasScale + 0.1);
    });

    zoomOutButton.addEventListener('click', () => {
        setZoom(canvasScale - 0.1);
    });

    zoomSlider.addEventListener('input', (e) => {
        setZoom(e.target.value / 100);
    });
}

// ファイル操作の設定
function setupFileOperations() {
    const importButton = document.getElementById('import-button');
    const importFileInput = document.getElementById('import-file');
    const exportButton = document.getElementById('export-button');
    const saveImageButton = document.getElementById('save-image');

    importButton.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importProject(file);
        }
    });

    exportButton.addEventListener('click', exportProject);

    saveImageButton.addEventListener('click', saveAsImage);
}

// プロジェクトの保存
function saveProjectData() {
    const projectData = {
        shapes: shapes,
        layers: layers,
        settings: {
            penSize: penSize,
            penColor: penColor,
            zoomLevel: canvasScale,
            canvasOffsetX: canvasOffsetX,
            canvasOffsetY: canvasOffsetY
        },
        currentLayerIndex: layers.indexOf(currentLayer)
    };
    localStorage.setItem('projectData', JSON.stringify(projectData));
}

// プロジェクトの読み込み
function loadProjectData() {
    const data = localStorage.getItem('projectData');
    if (data) {
        const projectData = JSON.parse(data);
        shapes = projectData.shapes || [];
        layers = projectData.layers || [];
        const settings = projectData.settings || {};
        penSize = settings.penSize || 5;
        penColor = settings.penColor || '#000000';
        canvasScale = settings.zoomLevel || 1;
        canvasOffsetX = settings.canvasOffsetX || 0;
        canvasOffsetY = settings.canvasOffsetY || 0;
        currentLayer = layers[projectData.currentLayerIndex] || layers[0];
        setZoom(canvasScale);
        updateCanvasTransform();
        updatePropertyPanel();
        updateLayerPanel();
        redrawAll();
    } else {
        // 新規プロジェクトとして初期化
        addNewLayer('レイヤー 1');
        currentLayer = layers[0];
        updateLayerPanel();
    }
}

// プロジェクトのエクスポート
function exportProject() {
    const dataStr = JSON.stringify({
        shapes: shapes,
        layers: layers,
        settings: {
            penSize: penSize,
            penColor: penColor,
            zoomLevel: canvasScale,
            canvasOffsetX: canvasOffsetX,
            canvasOffsetY: canvasOffsetY
        },
        currentLayerIndex: layers.indexOf(currentLayer)
    });
    const blob = new Blob([dataStr], { type: "application/json" });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.download = 'project.json';
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
}

// プロジェクトのインポート
function importProject(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            shapes = projectData.shapes || [];
            layers = projectData.layers || [];
            const settings = projectData.settings || {};
            penSize = settings.penSize || 5;
            penColor = settings.penColor || '#000000';
            canvasScale = settings.zoomLevel || 1;
            canvasOffsetX = settings.canvasOffsetX || 0;
            canvasOffsetY = settings.canvasOffsetY || 0;
            currentLayer = layers[projectData.currentLayerIndex] || layers[0];
            setZoom(canvasScale);
            updateCanvasTransform();
            updatePropertyPanel();
            updateLayerPanel();
            redrawAll();
            saveProjectData();
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
}

// キャンバスを画像として保存
function saveAsImage() {
    // 一時的にキャンバスを等倍にして画像を取得
    const originalScale = canvasScale;
    const originalOffsetX = canvasOffsetX;
    const originalOffsetY = canvasOffsetY;

    setZoom(1);
    canvasOffsetX = 0;
    canvasOffsetY = 0;
    updateCanvasTransform();
    redrawAll();

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canvas.png';
        a.click();
        URL.revokeObjectURL(url);

        // 元の状態に戻す
        setZoom(originalScale);
        canvasOffsetX = originalOffsetX;
        canvasOffsetY = originalOffsetY;
        updateCanvasTransform();
        redrawAll();
    });
}

// レイヤーパネルの設定
function setupLayerPanel() {
    const addLayerButton = document.getElementById('add-layer');
    addLayerButton.addEventListener('click', () => addNewLayer(`レイヤー ${layers.length + 1}`));

    // レイヤーの初期設定
    if (layers.length === 0) {
        addNewLayer('レイヤー 1');
    }
    currentLayer = layers[0];
    updateLayerPanel();
}

function addNewLayer(name) {
    const layer = {
        name: name,
        visible: true,
        locked: false,
        opacity: 1.0
    };
    layers.unshift(layer); // 新しいレイヤーを最前面に追加
    currentLayer = layer;
    updateLayerPanel();
}

function updateLayerPanel() {
    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';

    layers.forEach((layer, index) => {
        const li = document.createElement('li');
        li.className = 'layer-item';
        if (layer === currentLayer) {
            li.classList.add('active');
        }

        // レイヤーの選択
        li.addEventListener('click', () => {
            currentLayer = layer;
            updateLayerPanel();
        });

        // レイヤー名
        const nameSpan = document.createElement('span');
        nameSpan.textContent = layer.name;
        nameSpan.contentEditable = true;
        nameSpan.addEventListener('input', (e) => {
            layer.name = e.target.textContent;
        });

        // 表示/非表示
        const visibilityButton = document.createElement('button');
        visibilityButton.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        visibilityButton.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            visibilityButton.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            redrawAll();
        });

        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`${layer.name}を削除しますか？`)) {
                layers.splice(index, 1);
                if (currentLayer === layer) {
                    currentLayer = layers[0] || null;
                }
                updateLayerPanel();
                redrawAll();
            }
        });

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'layer-controls';
        controlsDiv.appendChild(visibilityButton);
        controlsDiv.appendChild(nameSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'layer-actions';
        actionsDiv.appendChild(deleteButton);

        li.appendChild(controlsDiv);
        li.appendChild(actionsDiv);

        layerList.appendChild(li);
    });
}

// カラーパレットの設定
function setupColorPalette() {
    const colorPicker = document.getElementById('color-picker');
    colorPicker.addEventListener('input', (e) => {
        penColor = e.target.value;
    });
}

// モーダルの設定
function showModal(content) {
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);

// ショートカットキーの設定
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 's':
                e.preventDefault();
                saveAsImage();
                break;
            case 'o':
                e.preventDefault();
                document.getElementById('import-file').click();
                break;
            case 'e':
                e.preventDefault();
                exportProject();
                break;
            // 他のショートカットキー
        }
    }

    // ツールのショートカット
    switch (e.key.toLowerCase()) {
        case 'v':
            selectTool('select');
            break;
        case 'p':
            selectTool('pen');
            break;
        case 'l':
            selectTool('line');
            break;
        case 'u':
            selectTool('shape');
            break;
        case 't':
            selectTool('text');
            break;
        case 'e':
            selectTool('eraser');
            break;
        case 'i':
            selectTool('image');
            break;
        // 他のツール
    }
});

function selectTool(tool) {
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    currentTool = tool;
    updatePropertyPanel();
    if (tool === 'pan') {
        canvas.style.cursor = 'grab';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

// TODO: 各種ツールの実装（ペン、図形、テキスト、画像挿入、消しゴムなど）
// 各ツールの詳細な機能を追加していきます。

// 操作履歴の管理
function performAction(action) {
    action.execute();
    undoStack.push(action);
    redoStack = [];
}

function undo() {
    const action = undoStack.pop();
    if (action) {
        action.undo();
        redoStack.push(action);
        redrawAll();
    }
}

function redo() {
    const action = redoStack.pop();
    if (action) {
        action.execute();
        undoStack.push(action);
        redrawAll();
    }
}
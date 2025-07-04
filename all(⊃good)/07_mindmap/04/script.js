// MindMapクラスの定義
class MindMap {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.connectors = [];
        this.selectedNode = null;
        this.contextMenu = null;
        this.nodeIdCounter = 0;

        // 追加：アンドゥ・リドゥのためのスタック
        this.undoStack = [];
        this.redoStack = [];

        // 接続操作中かどうかのフラグ
        this.isConnecting = false;
        this.connectingNode = null;

        this.init();
    }

    init() {
        // キャンバスの初期化
        this.initCanvas();

        // ルートノードを作成
        const rootNode = this.createNode('中心テーマ', 0, 0);
        rootNode.element.style.left = (this.container.offsetWidth / 2 - rootNode.element.offsetWidth / 2) + 'px';
        rootNode.element.style.top = (this.container.offsetHeight / 2 - rootNode.element.offsetHeight / 2) + 'px';
        this.container.appendChild(rootNode.element);
        this.nodes.push(rootNode);

        // イベントリスナーの追加
        this.container.addEventListener('click', (e) => this.onContainerClick(e));
        this.container.addEventListener('contextmenu', (e) => this.onContainerContextMenu(e));

        // ヘッダーメニューのイベント
        document.getElementById('new-map').addEventListener('click', () => this.newMap());
        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('load-map').addEventListener('click', () => this.loadMap());
        document.addEventListener('keydown', (e) => this.onKeyDown(e)); // アンドゥ・リドゥのショートカット

        // ズーム・パンのイベントリスナー
        this.initZoomAndPan();
    }

    initCanvas() {
        // スケーリングとパンの初期化
        this.container.style.transformOrigin = '0 0';
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
    }

    initZoomAndPan() {
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
        let isPanning = false;
        let startX, startY;

        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // 中ボタン
                isPanning = true;
                startX = e.clientX - this.translateX;
                startY = e.clientY - this.translateY;
                this.container.style.cursor = 'move';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                this.translateX = e.clientX - startX;
                this.translateY = e.clientY - startY;
                this.updateTransform();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) {
                isPanning = false;
                this.container.style.cursor = 'default';
            }
        });
    }

    onWheel(e) {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = this.scale + scaleAmount;
        if (newScale > 0.1 && newScale < 5) {
            // マウス位置に合わせてスケールと平行移動を調整
            const rect = this.container.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const dx = offsetX * scaleAmount;
            const dy = offsetY * scaleAmount;

            this.translateX -= dx;
            this.translateY -= dy;

            this.scale = newScale;
            this.updateTransform();
        }
    }

    updateTransform() {
        this.container.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    onKeyDown(e) {
        if (e.ctrlKey && e.key === 'z') {
            this.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            this.redo();
        }
    }

    // アンドゥ操作
    undo() {
        if (this.undoStack.length > 0) {
            const action = this.undoStack.pop();
            action.undo();
            this.redoStack.push(action);
        }
    }

    // リドゥ操作
    redo() {
        if (this.redoStack.length > 0) {
            const action = this.redoStack.pop();
            action.redo();
            this.undoStack.push(action);
        }
    }

    createNode(text, x, y) {
        const node = document.createElement('div');
        node.classList.add('node');
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.textContent = text;
        node.dataset.id = this.nodeIdCounter++;

        // ドラッグ移動
        node.addEventListener('mousedown', (e) => this.onNodeMouseDown(e, node));

        // ダブルクリックでテキスト編集
        node.addEventListener('dblclick', (e) => this.editNode(e, node));

        // 右クリックでコンテキストメニュー
        node.addEventListener('contextmenu', (e) => this.showContextMenu(e, node));

        // 接続ノードの選択
        node.addEventListener('click', (e) => this.onNodeClick(e, node));

        return {
            element: node,
            x: x,
            y: y,
            connections: []
        };
    }

    onNodeMouseDown(e, nodeElement) {
        e.stopPropagation();
        if (e.button !== 0) return; // 左クリックのみ
        let shiftX = e.clientX - nodeElement.getBoundingClientRect().left;
        let shiftY = e.clientY - nodeElement.getBoundingClientRect().top;

        const onMouseMove = (e) => {
            nodeElement.style.left = (e.clientX - shiftX - this.container.getBoundingClientRect().left - this.translateX) / this.scale + 'px';
            nodeElement.style.top = (e.clientY - shiftY - this.container.getBoundingClientRect().top - this.translateY) / this.scale + 'px';
            this.updateConnectors();
        };

        document.addEventListener('mousemove', onMouseMove);

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mouseup', onMouseUp);

        // アンドゥスタックに追加
        this.recordAction({
            undo: () => {},
            redo: () => {}
        });
    }

    editNode(e, nodeElement) {
        e.stopPropagation();
        const currentText = nodeElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        nodeElement.textContent = '';
        nodeElement.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            const newText = input.value || 'ノード';
            nodeElement.textContent = newText;

            // アンドゥスタックに追加
            this.recordAction({
                undo: () => { nodeElement.textContent = currentText; },
                redo: () => { nodeElement.textContent = newText; }
            });
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    showContextMenu(e, nodeElement) {
        e.preventDefault();
        this.hideContextMenu();

        this.contextMenu = document.createElement('div');
        this.contextMenu.classList.add('context-menu');
        this.contextMenu.style.left = e.pageX + 'px';
        this.contextMenu.style.top = e.pageY + 'px';

        const menu = document.createElement('ul');

        const addChild = document.createElement('li');
        addChild.textContent = '子ノードを追加';
        addChild.addEventListener('click', () => {
            this.addChildNode(nodeElement);
            this.hideContextMenu();
        });

        const deleteNode = document.createElement('li');
        deleteNode.textContent = 'ノードを削除';
        deleteNode.addEventListener('click', () => {
            this.deleteNode(nodeElement);
            this.hideContextMenu();
        });

        const connectNode = document.createElement('li');
        connectNode.textContent = 'ノードを接続';
        connectNode.addEventListener('click', () => {
            this.startConnecting(nodeElement);
            this.hideContextMenu();
        });

        const disconnectNode = document.createElement('li');
        disconnectNode.textContent = '接続を解除';
        disconnectNode.addEventListener('click', () => {
            this.removeConnections(nodeElement);
            this.hideContextMenu();
        });

        menu.appendChild(addChild);
        menu.appendChild(connectNode);
        menu.appendChild(disconnectNode);
        menu.appendChild(deleteNode);
        this.contextMenu.appendChild(menu);
        document.body.appendChild(this.contextMenu);
    }

    showContainerContextMenu(e) {
        e.preventDefault();
        this.hideContextMenu();

        this.contextMenu = document.createElement('div');
        this.contextMenu.classList.add('context-menu');
        this.contextMenu.style.left = e.pageX + 'px';
        this.contextMenu.style.top = e.pageY + 'px';

        const menu = document.createElement('ul');

        const addNode = document.createElement('li');
        addNode.textContent = '新規ノードを追加';
        addNode.addEventListener('click', () => {
            this.addNodeAtPosition(e.pageX, e.pageY);
            this.hideContextMenu();
        });

        menu.appendChild(addNode);
        this.contextMenu.appendChild(menu);
        document.body.appendChild(this.contextMenu);
    }

    hideContextMenu() {
        if (this.contextMenu) {
            document.body.removeChild(this.contextMenu);
            this.contextMenu = null;
        }
    }

    addChildNode(parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        const childNode = this.createNode('新しいアイデア', parseFloat(parentElement.style.left) + 150, parseFloat(parentElement.style.top));

        this.container.appendChild(childNode.element);
        this.nodes.push(childNode);

        // コネクタを作成
        const connector = document.createElement('div');
        connector.classList.add('connector');
        this.container.appendChild(connector);
        this.connectors.push({
            element: connector,
            from: parentElement,
            to: childNode.element
        });

        this.updateConnectors();

        // アンドゥスタックに追加
        this.recordAction({
            undo: () => {
                this.deleteNode(childNode.element, false);
            },
            redo: () => {
                this.container.appendChild(childNode.element);
                this.nodes.push(childNode);
                this.container.appendChild(connector);
                this.connectors.push({
                    element: connector,
                    from: parentElement,
                    to: childNode.element
                });
                this.updateConnectors();
            }
        });
    }

    addNodeAtPosition(x, y) {
        const containerRect = this.container.getBoundingClientRect();
        const node = this.createNode('新規ノード', (x - containerRect.left - this.translateX) / this.scale, (y - containerRect.top - this.translateY) / this.scale);
        this.container.appendChild(node.element);
        this.nodes.push(node);

        // アンドゥスタックに追加
        this.recordAction({
            undo: () => {
                this.deleteNode(node.element, false);
            },
            redo: () => {
                this.container.appendChild(node.element);
                this.nodes.push(node);
            }
        });
    }

    deleteNode(nodeElement, addToUndoStack = true) {
        // コネクタの削除
        const removedConnectors = [];
        this.connectors = this.connectors.filter(connector => {
            if (connector.from === nodeElement || connector.to === nodeElement) {
                this.container.removeChild(connector.element);
                removedConnectors.push(connector);
                return false;
            }
            return true;
        });

        // ノードの削除
        this.container.removeChild(nodeElement);
        const removedNode = this.nodes.find(node => node.element === nodeElement);
        this.nodes = this.nodes.filter(node => node.element !== nodeElement);

        if (addToUndoStack) {
            // アンドゥスタックに追加
            this.recordAction({
                undo: () => {
                    this.container.appendChild(nodeElement);
                    this.nodes.push(removedNode);
                    removedConnectors.forEach(connector => {
                        this.container.appendChild(connector.element);
                        this.connectors.push(connector);
                    });
                    this.updateConnectors();
                },
                redo: () => {
                    this.deleteNode(nodeElement, false);
                }
            });
        }
    }

    removeConnections(nodeElement) {
        const removedConnectors = [];
        this.connectors = this.connectors.filter(connector => {
            if (connector.from === nodeElement || connector.to === nodeElement) {
                this.container.removeChild(connector.element);
                removedConnectors.push(connector);
                return false;
            }
            return true;
        });

        // アンドゥスタックに追加
        this.recordAction({
            undo: () => {
                removedConnectors.forEach(connector => {
                    this.container.appendChild(connector.element);
                    this.connectors.push(connector);
                });
                this.updateConnectors();
            },
            redo: () => {
                this.removeConnections(nodeElement);
            }
        });
    }

    updateConnectors() {
        this.connectors.forEach(connector => {
            const fromRect = connector.from.getBoundingClientRect();
            const toRect = connector.to.getBoundingClientRect();
    
            const x1 = fromRect.left + fromRect.width / 2;
            const y1 = fromRect.top + fromRect.height / 2;
            const x2 = toRect.left + toRect.width / 2;
            const y2 = toRect.top + toRect.height / 2;
    
            const length = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
            connector.element.style.width = length + 'px';
            connector.element.style.left = (x1 - this.container.getBoundingClientRect().left - this.translateX) / this.scale + 'px';
            connector.element.style.top = (y1 - this.container.getBoundingClientRect().top - this.translateY) / this.scale + 'px';
            connector.element.style.transform = `rotate(${angle}deg)`;
        });
    }

    onNodeClick(e, nodeElement) {
        e.stopPropagation();
        if (this.isConnecting) {
            this.finishConnecting(nodeElement);
        }
    }

    startConnecting(nodeElement) {
        this.connectingNode = nodeElement;
        this.isConnecting = true;
        alert('接続先のノードをクリックしてください');
    }

    finishConnecting(targetNodeElement) {
        if (this.connectingNode === targetNodeElement) {
            alert('同じノードには接続できません');
            this.isConnecting = false;
            this.connectingNode = null;
            return;
        }
        // コネクタがすでに存在するかチェック
        const existingConnector = this.connectors.find(connector =>
            (connector.from === this.connectingNode && connector.to === targetNodeElement) ||
            (connector.from === targetNodeElement && connector.to === this.connectingNode)
        );

        if (existingConnector) {
            alert('すでに接続されています');
            this.isConnecting = false;
            this.connectingNode = null;
            return;
        }

        // コネクタを作成
        const connector = document.createElement('div');
        connector.classList.add('connector');
        this.container.appendChild(connector);
        this.connectors.push({
            element: connector,
            from: this.connectingNode,
            to: targetNodeElement
        });

        this.updateConnectors();
        this.isConnecting = false;
        this.connectingNode = null;

        // アンドゥスタックに追加
        this.recordAction({
            undo: () => {
                this.container.removeChild(connector.element);
                this.connectors = this.connectors.filter(c => c.element !== connector);
                this.updateConnectors();
            },
            redo: () => {
                this.container.appendChild(connector.element);
                this.connectors.push({
                    element: connector,
                    from: this.connectingNode,
                    to: targetNodeElement
                });
                this.updateConnectors();
            }
        });
    }

    onContainerClick(e) {
        this.hideContextMenu();
        if (e.target === this.container) {
            this.selectedNode = null;
        }
    }

    onContainerContextMenu(e) {
        if (e.target === this.container) {
            this.showContainerContextMenu(e);
        }
    }

    newMap() {
        // マップをクリア
        this.nodes.forEach(node => {
            this.container.removeChild(node.element);
        });
        this.connectors.forEach(connector => {
            this.container.removeChild(connector.element);
        });
        this.nodes = [];
        this.connectors = [];
        this.nodeIdCounter = 0;
        this.init();
    }

    saveMap() {
        const mapData = {
            nodes: this.nodes.map(node => ({
                id: node.element.dataset.id,
                text: node.element.textContent,
                x: parseFloat(node.element.style.left),
                y: parseFloat(node.element.style.top)
            })),
            connectors: this.connectors.map(connector => ({
                fromId: connector.from.dataset.id,
                toId: connector.to.dataset.id
            }))
        };
        const dataStr = JSON.stringify(mapData);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    loadMap() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const mapData = JSON.parse(e.target.result);
                this.loadMapData(mapData);
            };
            reader.readAsText(file);
        });

        input.click();
    }

    loadMapData(mapData) {
        // 既存のマップをクリア
        this.newMap();

        // ノードIDのマッピング
        const idMap = {};

        // ノードの再構築
        mapData.nodes.forEach(nodeData => {
            const node = this.createNode(nodeData.text, nodeData.x, nodeData.y);
            node.element.dataset.id = nodeData.id;
            this.container.appendChild(node.element);
            this.nodes.push(node);
            idMap[nodeData.id] = node.element;
        });

        // ノードIDカウンターを更新
        this.nodeIdCounter = Math.max(...mapData.nodes.map(node => parseInt(node.id))) + 1;

        // コネクタの再構築
        mapData.connectors.forEach(connectorData => {
            const fromNode = idMap[connectorData.fromId];
            const toNode = idMap[connectorData.toId];

            const connector = document.createElement('div');
            connector.classList.add('connector');
            this.container.appendChild(connector);
            this.connectors.push({
                element: connector,
                from: fromNode,
                to: toNode
            });
        });

        this.updateConnectors();
    }

    recordAction(action) {
        this.undoStack.push(action);
        this.redoStack = [];
    }
}

// マインドマップの初期化
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    const mindMap = new MindMap(container);
});
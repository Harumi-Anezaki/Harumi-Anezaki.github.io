// ノードとコネクタを管理するためのクラス
class MindMap {
    constructor(container) {
        this.container = container;
        this.nodes = [];
        this.connectors = [];
        this.selectedNode = null;
        this.contextMenu = null;
        this.init();
    }

    init() {
        // ルートノードを作成
        const rootNode = this.createNode('中心テーマ', window.innerWidth / 2 - 50, window.innerHeight / 2 - 50);
        this.container.appendChild(rootNode.element);
        this.nodes.push(rootNode);

        // イベントリスナーの追加
        this.container.addEventListener('click', (e) => this.onContainerClick(e));
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        // ヘッダーメニューのイベント
        document.getElementById('new-map').addEventListener('click', () => this.newMap());
        document.getElementById('save-map').addEventListener('click', () => this.saveMap());
        document.getElementById('load-map').addEventListener('click', () => this.loadMap());
    }

    createNode(text, x, y) {
        const node = document.createElement('div');
        node.classList.add('node');
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.textContent = text;

        // ドラッグ移動
        node.addEventListener('mousedown', (e) => this.onNodeMouseDown(e, node));

        // ダブルクリックでテキスト編集
        node.addEventListener('dblclick', (e) => this.editNode(e, node));

        // 右クリックでコンテキストメニュー
        node.addEventListener('contextmenu', (e) => this.showContextMenu(e, node));

        return {
            element: node,
            x: x,
            y: y,
            connections: []
        };
    }

    onNodeMouseDown(e, nodeElement) {
        e.stopPropagation();
        let shiftX = e.clientX - nodeElement.getBoundingClientRect().left;
        let shiftY = e.clientY - nodeElement.getBoundingClientRect().top;

        const onMouseMove = (e) => {
            nodeElement.style.left = e.clientX - shiftX + 'px';
            nodeElement.style.top = e.clientY - shiftY + 'px';
            this.updateConnectors();
        };

        document.addEventListener('mousemove', onMouseMove);

        nodeElement.onmouseup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            nodeElement.onmouseup = null;
        };
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
            nodeElement.textContent = input.value;
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

        menu.appendChild(addChild);
        menu.appendChild(deleteNode);
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
        const childNode = this.createNode('新しいアイデア', parentRect.left + 150, parentRect.top);

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
    }

    deleteNode(nodeElement) {
        // コネクタの削除
        this.connectors = this.connectors.filter(connector => {
            if (connector.from === nodeElement || connector.to === nodeElement) {
                this.container.removeChild(connector.element);
                return false;
            }
            return true;
        });

        // ノードの削除
        this.container.removeChild(nodeElement);
        this.nodes = this.nodes.filter(node => node.element !== nodeElement);
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
            connector.element.style.left = x1 + 'px';
            connector.element.style.top = y1 + 'px';
            connector.element.style.transform = `rotate(${angle}deg)`;
        });
    }

    onContainerClick(e) {
        this.hideContextMenu();
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
        this.init();
    }

    saveMap() {
        const mapData = {
            nodes: this.nodes.map(node => ({
                id: node.element.dataset.id,
                text: node.element.textContent,
                x: parseInt(node.element.style.left),
                y: parseInt(node.element.style.top)
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
}

// マインドマップの初期化
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('mindmap-container');
    const mindMap = new MindMap(container);
});
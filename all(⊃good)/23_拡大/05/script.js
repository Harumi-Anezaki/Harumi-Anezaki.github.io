document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const contentWrapper = document.getElementById('contentWrapper');
    const container = document.getElementById('container');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetBtn = document.getElementById('resetBtn');

    let scale = 1;
    let originX = 0;
    let originY = 0;

    // ローカルストレージからHTMLファイルを選択
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            contentWrapper.innerHTML = `<div id="innerContent">${event.target.result}</div>`;
            // インポートしたHTMLの横幅と画面の横幅を合わせる
            const innerContent = document.getElementById('innerContent');
            innerContent.style.width = '100%';
        };
        reader.readAsText(file);
    });

    // 拡大ボタン
    zoomInBtn.addEventListener('click', () => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        zoom(1.2, centerX, centerY);
    });

    // 縮小ボタン
    zoomOutBtn.addEventListener('click', () => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        zoom(0.8, centerX, centerY);
    });

    // リセットボタン
    resetBtn.addEventListener('click', () => {
        scale = 1;
        originX = 0;
        originY = 0;
        updateTransform();
    });

    // 拡大縮小の関数
    function zoom(factor, centerX, centerY) {
        const rect = contentWrapper.getBoundingClientRect();
        // ズームの中心座標を計算
        const offsetX = (centerX - rect.left) / scale + originX;
        const offsetY = (centerY - rect.top) / scale + originY;

        scale *= factor;

        originX = offsetX - (centerX - rect.left) / scale;
        originY = offsetY - (centerY - rect.top) / scale;

        updateTransform();
    }

    // transformの更新
    function updateTransform() {
        contentWrapper.style.transformOrigin = '0 0';
        contentWrapper.style.transform = `scale(${scale}) translate(${-originX}px, ${-originY}px)`;
    }

    // タッチパッドのピンチ操作で拡大縮小
    container.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            zoom(factor, e.clientX, e.clientY);
        } else {
            // 2本指でのスクロール操作（パン操作）
            container.scrollLeft += e.deltaX;
            container.scrollTop += e.deltaY;
        }
    }, { passive: false });

    // パン操作はwheelイベントで処理するので、pointerイベントでのドラッグは不要
    // テキストの選択を可能にするため、pointerイベントでのパン操作は実装しない
});
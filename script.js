document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const contentWrapper = document.getElementById('contentWrapper');
    const container = document.getElementById('container');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetBtn = document.getElementById('resetBtn');

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    // ローカルストレージからHTMLファイルを選択
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            contentWrapper.innerHTML = event.target.result;
            // インポートしたHTMLの横幅と画面の横幅を合わせる
            contentWrapper.firstElementChild.style.width = '100%';
        };
        reader.readAsText(file);
    });

    // 拡大ボタン
    zoomInBtn.addEventListener('click', () => {
        zoom(1.4, container.clientWidth / 2, container.clientHeight / 2);
    });

    // 縮小ボタン
    zoomOutBtn.addEventListener('click', () => {
        zoom(1/1.4, container.clientWidth / 2, container.clientHeight / 2);
    });

    // リセットボタン
    resetBtn.addEventListener('click', () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    });

    // 拡大縮小の関数
    function zoom(factor, centerX, centerY) {
        const rect = contentWrapper.getBoundingClientRect();
        const dx = centerX - rect.left;
        const dy = centerY - rect.top;

        scale *= factor;
        translateX -= dx * (factor - 1);
        translateY -= dy * (factor - 1);

        updateTransform();
    }

    // transformの更新
    function updateTransform() {
        contentWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    container.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        // ズーム処理（従来通り）
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.4 : 1 / 1.4;
        zoom(factor, e.clientX, e.clientY);
    } else {
        // 2本指スクロールによるパン操作（上下左右斜め自由）
        e.preventDefault();}
}, { passive: false });

    // タッチパッドでのパン操作
    container.addEventListener('pointerdown', (e) => {
        if (e.isPrimary && e.button === 0) {
            isPanning = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            container.style.cursor = 'grabbing';
        }
    });

    container.addEventListener('pointermove', (e) => {
        if (isPanning) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        }
    });

    container.addEventListener('pointerup', () => {
        isPanning = false;
        container.style.cursor = 'default';
    });

    container.addEventListener('pointerleave', () => {
        isPanning = false;
        container.style.cursor = 'default';
    });
});
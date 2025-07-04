let scale = 1;
let translateX = 0;
let translateY = 0;

const content = document.getElementById('content');
const contentContainer = document.getElementById('contentContainer');

const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const resetButton = document.getElementById('reset');
const fileInput = document.getElementById('fileInput');

// ローカルストレージからHTMLファイルを選択
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            content.innerHTML = e.target.result;
            resetTransform();
        };
        reader.readAsText(file);
    }
});

// 拡大ボタン
zoomInButton.addEventListener('click', function() {
    const centerX = contentContainer.clientWidth / 2;
    const centerY = contentContainer.clientHeight / 2;
    zoom(1.2, centerX, centerY);
});

// 縮小ボタン
zoomOutButton.addEventListener('click', function() {
    const centerX = contentContainer.clientWidth / 2;
    const centerY = contentContainer.clientHeight / 2;
    zoom(0.8, centerX, centerY);
});

// リセットボタン
resetButton.addEventListener('click', function() {
    resetTransform();
});

// ズーム関数
function zoom(factor, centerX, centerY) {
    const rect = content.getBoundingClientRect();
    const offsetX = centerX - rect.left;
    const offsetY = centerY - rect.top;

    translateX = translateX - (offsetX * (factor - 1));
    translateY = translateY - (offsetY * (factor - 1));
    scale *= factor;

    updateTransform();
}

// 変換を更新
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// 変換をリセット
function resetTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
}

// タッチパッドのピンチイン・アウト、スクロール操作
contentContainer.addEventListener('wheel', function(event) {
    event.preventDefault();

    if (event.ctrlKey) {
        // ピンチイン・アウト
        const factor = event.deltaY < 0 ? 1.3 : 0.7;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        zoom(factor, mouseX, mouseY);
    } else {
        // スクロール（パン操作）
        translateX -= event.deltaX;
        translateY -= event.deltaY;
        updateTransform();
    }
}, { passive: false });

// ドラッグでのテキスト選択を可能に（パン操作には使用しない）
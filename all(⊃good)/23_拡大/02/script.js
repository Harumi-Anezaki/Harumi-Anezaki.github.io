document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('file-input');
    const contentContainer = document.getElementById('content-container');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetButton = document.getElementById('reset');

    let scale = 1;
    let originX = 50;
    let originY = 50;
    let panX = 0;
    let panY = 0;

    // パン（移動）のための変数
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                contentContainer.innerHTML = e.target.result;
                // スケールとパンをリセット
                scale = 1;
                panX = 0;
                panY = 0;
                originX = 50;
                originY = 50;
                contentContainer.style.transform = '';
                contentContainer.style.transformOrigin = '';
            };
            reader.readAsText(file);
        }
    });

    zoomInButton.addEventListener('click', function () {
        scale *= 1.1;
        updateTransform('center');
    });

    zoomOutButton.addEventListener('click', function () {
        scale /= 1.1;
        updateTransform('center');
    });

    resetButton.addEventListener('click', function () {
        scale = 1;
        panX = 0;
        panY = 0;
        originX = 50;
        originY = 50;
        contentContainer.style.transform = '';
        contentContainer.style.transformOrigin = '';
    });

    function updateTransform(center) {
        if (center === 'center') {
            contentContainer.style.transformOrigin = '50% 50%';
        } else {
            contentContainer.style.transformOrigin = `${originX}% ${originY}%`;
        }
        contentContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    // タッチパッドでのピンチ操作およびパン操作に対応
    contentContainer.addEventListener('wheel', function (event) {
        if (event.ctrlKey) {
            event.preventDefault();
            const rect = contentContainer.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;

            const delta = -event.deltaY;
            // 感度を上げるためにズームファクターの計算方法を調整
            const zoomAmount = delta * 0.02; // 値を調整して感度を変更（0.02を大きくするとより敏感になります）
            const zoomFactor = Math.exp(zoomAmount);

            scale *= zoomFactor;
            originX = (offsetX / rect.width) * 100;
            originY = (offsetY / rect.height) * 100;

            updateTransform();
        } else {
            // タッチパッドでのパン操作
            event.preventDefault();
            panX -= event.deltaX;
            panY -= event.deltaY;
            updateTransform();
        }
    }, { passive: false });

    // マウスドラッグによるパン操作
    contentContainer.addEventListener('mousedown', function(event) {
        isPanning = true;
        startX = event.clientX - panX;
        startY = event.clientY - panY;
        contentContainer.style.cursor = 'grabbing';
    });

    contentContainer.addEventListener('mousemove', function(event) {
        if (isPanning) {
            panX = event.clientX - startX;
            panY = event.clientY - startY;
            updateTransform();
        }
    });

    document.addEventListener('mouseup', function(event) {
        if (isPanning) {
            isPanning = false;
            contentContainer.style.cursor = 'grab';
        }
    });

    // タッチデバイスでのピンチ・パン操作に対応
    let lastTouchDistance = null;
    let initialScale = null;
    let touchCenter = { x: 0, y: 0 };
    let isTouchPanning = false;
    let lastTouchPosition = { x: 0, y: 0 };

    contentContainer.addEventListener('touchstart', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            lastTouchDistance = getTouchDistance(event.touches[0], event.touches[1]);
            initialScale = scale;
            touchCenter = getTouchCenter(event.touches[0], event.touches[1]);
        } else if (event.touches.length === 1) {
            isTouchPanning = true;
            lastTouchPosition.x = event.touches[0].clientX;
            lastTouchPosition.y = event.touches[0].clientY;
        }
    }, { passive: false });

    contentContainer.addEventListener('touchmove', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
            const rect = contentContainer.getBoundingClientRect();
            const deltaScale = currentDistance / lastTouchDistance;
            scale = initialScale * deltaScale;

            // コンテナ内のタッチ中心点を計算
            const offsetX = touchCenter.x - rect.left;
            const offsetY = touchCenter.y - rect.top;
            originX = (offsetX / rect.width) * 100;
            originY = (offsetY / rect.height) * 100;

            updateTransform();
        } else if (event.touches.length === 1 && isTouchPanning) {
            event.preventDefault();
            const deltaX = event.touches[0].clientX - lastTouchPosition.x;
            const deltaY = event.touches[0].clientY - lastTouchPosition.y;
            panX += deltaX;
            panY += deltaY;
            lastTouchPosition.x = event.touches[0].clientX;
            lastTouchPosition.y = event.touches[0].clientY;
            updateTransform();
        }
    }, { passive: false });

    contentContainer.addEventListener('touchend', function(event) {
        if (event.touches.length === 0) {
            isTouchPanning = false;
        }
    }, { passive: false });

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.pageX - touch2.pageX;
        const dy = touch1.pageY - touch2.pageY;
        return Math.hypot(dx, dy);
    }

    function getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.pageX + touch2.pageX) / 2,
            y: (touch1.pageY + touch2.pageY) / 2
        };
    }
});
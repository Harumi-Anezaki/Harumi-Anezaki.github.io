let scale = 1;
const scale_factor = 1.1;

document.getElementById('zoomInBtn').addEventListener('click', () => {
    manualZoom(1);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    manualZoom(-1);
});

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', handleFile);

document.getElementById('fileInput').style.display = 'block';

function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(e.target.result, 'text/html');
            const content = doc.body.innerHTML;

            const contentContainer = document.getElementById('contentContainer');
            contentContainer.innerHTML = `<div id="content">${content}</div>`;

            addEventListeners();
        }
        reader.readAsText(file);
    }
}

let translate = { x: 0, y: 0 };

function manualZoom(direction) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    zoom(direction, centerX, centerY);
}

function zoom(direction, clientX, clientY) {
    const content = document.getElementById('content');
    const rect = content.getBoundingClientRect();

    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    const prevScale = scale;

    if (direction > 0) {
        scale *= scale_factor;
    } else {
        scale /= scale_factor;
    }

    // カーソル下の点が固定されるようにtranslateを更新
    translate.x -= (offsetX / prevScale) * (scale_factor - 1) * direction;
    translate.y -= (offsetY / prevScale) * (scale_factor - 1) * direction;

    content.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
}

function addEventListeners() {
    const contentContainer = document.getElementById('contentContainer');

    contentContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY;

        if (e.ctrlKey || e.metaKey) {
            // CtrlキーまたはCommandキーが押されている場合、ズーム
            zoom(delta > 0 ? -1 : 1, e.clientX, e.clientY);
        } else {
            // スクロールまたはパン
            const content = document.getElementById('content');
            translate.x -= e.deltaX;
            translate.y -= e.deltaY;
            content.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
        }
    });

    let isDragging = false;
    let startX, startY;

    contentContainer.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    contentContainer.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            startX = e.clientX;
            startY = e.clientY;

            translate.x += dx;
            translate.y += dy;

            const content = document.getElementById('content');
            content.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
        }
    });

    contentContainer.addEventListener('mouseup', function() {
        isDragging = false;
    });

    contentContainer.addEventListener('mouseleave', function() {
        isDragging = false;
    });

    // タッチイベントによるピンチズーム
    let lastTouchDistance = null;

    contentContainer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    contentContainer.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
            const deltaDistance = currentDistance - lastTouchDistance;

            const clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            zoom(deltaDistance > 0 ? 1 : -1, clientX, clientY);

            lastTouchDistance = currentDistance;
        } else if (e.touches.length === 1 && !isDragging) {
            // パン
            const touch = e.touches[0];
            if (startX === undefined || startY === undefined) {
                startX = touch.clientX;
                startY = touch.clientY;
                return;
            }
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            startX = touch.clientX;
            startY = touch.clientY;

            translate.x += dx;
            translate.y += dy;

            const content = document.getElementById('content');
            content.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
        }
    }, { passive: false });

    contentContainer.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            lastTouchDistance = null;
        }
        if (e.touches.length === 0) {
            startX = undefined;
            startY = undefined;
        }
    });
}

function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.hypot(dx, dy);
}
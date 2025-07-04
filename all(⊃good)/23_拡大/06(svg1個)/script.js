document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const svgContainer = document.getElementById('svgContainer');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const resetBtn = document.getElementById('reset');

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  const minScale = 0.000001;
  const maxScale = 10000000;

  let svgElement;

  fileInput.addEventListener('change', handleFileSelect);
  zoomInBtn.addEventListener('click', () => zoom(1.3));
  zoomOutBtn.addEventListener('click', () => zoom(1 / 1.3));
  resetBtn.addEventListener('click', resetTransform);

  svgContainer.addEventListener('wheel', handleWheel);

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(e.target.result, 'text/html');
      svgElement = doc.querySelector('svg');
      if (svgElement) {
        svgContainer.innerHTML = '';
        svgContainer.appendChild(svgElement);
        // 初期状態にリセット
        resetTransform();
        // SVGの横幅を画面の横幅に合わせる
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', 'auto');
        svgElement.style.position = 'absolute';
        svgElement.style.left = '0';
        svgElement.style.top = '0';
        svgElement.style.transformOrigin = '0 0';
      } else {
        alert('SVGが見つかりませんでした。');
      }
    };
    reader.readAsText(file);
  }

  function zoom(factor) {
    const rect = svgContainer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (1 - factor) * (cx - translateX);
    const dy = (1 - factor) * (cy - translateY);

    scale *= factor;
    scale = Math.max(minScale, Math.min(maxScale, scale));

    translateX += dx;
    translateY += dy;

    updateTransform();
  }

  function resetTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  }

  function updateTransform() {
    if (svgElement) {
      svgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
  }

  function handleWheel(event) {
    event.preventDefault();
    const rect = svgContainer.getBoundingClientRect();
    if (event.ctrlKey) {
      // ピンチイン・ピンチアウト（ズーム）
      const factor = event.deltaY < 0 ? 1.3 : 1/1.3;
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const dx = (1 - factor) * (cx - translateX);
      const dy = (1 - factor) * (cy - translateY);

      scale *= factor;
      scale = Math.max(minScale, Math.min(maxScale, scale));

      translateX += dx;
      translateY += dy;

      updateTransform();
    } else {
      // 2本指でのスクロール（パン）
      translateX -= event.deltaX;
      translateY -= event.deltaY;
      updateTransform();
    }
  }
});
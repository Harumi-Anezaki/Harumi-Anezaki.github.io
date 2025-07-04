// メイン処理開始
document.getElementById('generateButton').addEventListener('click', function() {
  const umlText = document.getElementById('umlInput').value;
  const mindMapArea = document.getElementById('mindMap');
  const saveSvgButton = document.getElementById('saveSvgButton');
  const saveJpgButton = document.getElementById('saveJpgButton');
  const generateButton = document.getElementById('generateButton');

  // エラーメッセージのクリア
  clearErrorMessage();

  if (umlText.trim() === '') {
    displayErrorMessage('UMLテキストが入力されていません。');
    return;
  }

  // ボタンの無効化とローディング表示
  generateButton.disabled = true;
  showLoadingIndicator(generateButton);

  // テキスト解析とマインドマップ生成
  try {
    const nodes = parseUmlText(umlText);
    const treeData = buildTree(nodes);
    const svgElement = drawMindMap(treeData);

    // 以前のマインドマップをクリアして新しいものを表示
    mindMapArea.innerHTML = '';
    mindMapArea.appendChild(svgElement);

    // 保存ボタンを有効化
    saveSvgButton.disabled = false;
    saveJpgButton.disabled = false;

    // SVG保存機能
    saveSvgButton.onclick = function() {
      saveSvg(svgElement);
    };

    // JPG保存機能
    saveJpgButton.onclick = function() {
      saveJpg(svgElement);
    };

  } catch (error) {
    displayErrorMessage('エラーが発生しました: ' + error.message);
    console.error(error);
  } finally {
    // ボタンの有効化とローディング非表示
    generateButton.disabled = false;
    hideLoadingIndicator(generateButton);
  }
});

// エラーメッセージの表示
function displayErrorMessage(message) {
  let errorElem = document.querySelector('.error-message');
  if (!errorElem) {
    errorElem = document.createElement('div');
    errorElem.classList.add('error-message');
    document.querySelector('.input-area').appendChild(errorElem);
  }
  errorElem.textContent = message;
}

// エラーメッセージのクリア
function clearErrorMessage() {
  const errorElem = document.querySelector('.error-message');
  if (errorElem) {
    errorElem.remove();
  }
}

// ローディングインジケータの表示
function showLoadingIndicator(button) {
  let loading = document.createElement('span');
  loading.classList.add('loading');
  button.parentNode.insertBefore(loading, button.nextSibling);
}

// ローディングインジケータの非表示
function hideLoadingIndicator(button) {
  const loading = document.querySelector('.loading');
  if (loading) {
    loading.remove();
  }
}

// UMLテキストの解析
function parseUmlText(umlText) {
  let lines = umlText.split(/\r?\n/);

  // 開始・終了タグの除去
  if (lines[0].trim() === '@startmindmap') {
    lines.shift();
  }
  if (lines[lines.length - 1].trim() === '@endmindmap') {
    lines.pop();
  }

  // 空白行の除去
  lines = lines.filter(line => line.trim() !== '');

  // ノードリストの生成
  let nodes = [];
  let idCounter = 0;

  lines.forEach(line => {
    const levelMatch = line.match(/^\*+/);
    if (!levelMatch) {
      throw new Error('ノードのレベルを示すアスタリスクがありません: ' + line);
    }

    const level = levelMatch[0].length;
    const name = line.replace(/^\*+/, '').trim();
    const node = {
      id: idCounter++,
      name: name,
      level: level,
      parentId: null,
      children: [],
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      subtreeHeight: 0 // 追加
    };
    nodes.push(node);
  });

  return nodes;
}

// ノード間の親子関係の構築
function buildTree(nodes) {
  let root = null;
  let stack = [];

  nodes.forEach((node, index) => {
    if (index === 0) {
      root = node;
      stack.push(node);
    } else {
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }
      if (stack.length === 0) {
        throw new Error('親ノードが見つかりませんでした: ' + node.name);
      }
      node.parentId = stack[stack.length - 1].id;
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
  });

  return root;
}

// ノードサイズと位置の計算
function calculateNodePositions(node, ctx, config) {
  // テキスト幅の計測
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  const textMetrics = ctx.measureText(node.name);
  node.width = Math.max(textMetrics.width + config.nodePadding * 2, config.nodeMinWidth);
  node.height = config.fontSize + config.nodePadding * 2;

  if (node.children.length > 0) {
    // 子ノードの処理
    node.children.forEach(child => {
      calculateNodePositions(child, ctx, config);
    });

    // 子ノードの高さ合計（子ノードのsubtreeHeightと間隔を加算）
    const totalSubtreeHeight = node.children.reduce((sum, child) => sum + child.subtreeHeight + config.verticalGap, -config.verticalGap);

    // 自身のsubtreeHeightを設定（自身の高さと子ノード全体の高さの最大値）
    node.subtreeHeight = Math.max(node.height, totalSubtreeHeight);
  } else {
    // 子ノードがない場合、subtreeHeightは自身の高さ
    node.subtreeHeight = node.height;
  }
}

// ノード位置の計算（座標設定）
function setNodeCoordinates(node, x, y, config) {
  node.x = x;
  node.y = y; // 親ノードのY座標を先に設定

  if (node.children.length > 0) {
    // 子ノードのY座標の開始位置（子ノード全体を親ノードの中心に配置）
    let totalChildrenHeight = node.children.reduce((sum, child) => sum + child.subtreeHeight + config.verticalGap, -config.verticalGap);
    let childY = y + (node.height / 2) - (totalChildrenHeight / 2);

    node.children.forEach(child => {
      setNodeCoordinates(child, x + node.width + config.horizontalGap, childY, config);
      childY += child.subtreeHeight + config.verticalGap;
    });
  }
}

// ノード座標の調整
function adjustCoordinates(rootNode, config) {
  let minX = Infinity;
  let minY = Infinity;

  traverseNodes(rootNode, node => {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
  });

  if (minX < 0 || minY < 0) {
    const offsetX = minX < 0 ? -minX + config.horizontalGap : 0;
    const offsetY = minY < 0 ? -minY + config.verticalGap : 0;

    traverseNodes(rootNode, node => {
      node.x += offsetX;
      node.y += offsetY;
    });
  }
}

// マインドマップの描画
function drawMindMap(rootNode) {
  // Canvasの準備（サイズ測定用）
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const config = {
    fontSize: 14,
    fontFamily: 'Roboto, sans-serif',
    nodePadding: 10,
    horizontalGap: 50,
    verticalGap: 20,
    nodeMinWidth: 60,
    nodeMinHeight: 30,
    nodeCornerRadius: 5,
    nodeFillColor: '#fff',
    nodeStrokeColor: '#888',
    nodeTextColor: '#333',
    lineColor: '#888',
    lineWidth: 1.5
  };

  // ノード位置とサイズの計算
  calculateNodePositions(rootNode, ctx, config);
  setNodeCoordinates(rootNode, 0, 0, config);

  // ノード座標の調整
  adjustCoordinates(rootNode, config);

  // SVG全体サイズの計算
  const svgWidth = getMaxX(rootNode) + config.horizontalGap;
  const svgHeight = getMaxY(rootNode) + config.verticalGap;

  // SVG要素の作成
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

  // スタイルのインライン化
  const defs = document.createElementNS(svgNS, 'defs');
  const style = document.createElementNS(svgNS, 'style');
  style.textContent = `
    .node-rect {
      fill: ${config.nodeFillColor};
      stroke: ${config.nodeStrokeColor};
      stroke-width: 1;
    }
    .node-text {
      fill: ${config.nodeTextColor};
      font-size: ${config.fontSize}px;
      font-family: ${config.fontFamily};
      text-anchor: middle;
      dominant-baseline: middle;
    }
    .link-line {
      stroke: ${config.lineColor};
      stroke-width: ${config.lineWidth};
      fill: none;
    }
  `;
  defs.appendChild(style);
  svg.appendChild(defs);

  // ノードと線の描画
  const allNodes = [];
  traverseNodes(rootNode, node => {
    allNodes.push(node);
  });

  // 線の描画
  allNodes.forEach(node => {
    if (node.parentId !== null) {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('class', 'link-line');

      const startX = node.x;
      const startY = node.y + node.height / 2;
      const endX = node.x - config.horizontalGap / 2;
      const endY = startY;

      const parentNode = allNodes.find(n => n.id === node.parentId);
      const parentX = parentNode.x + parentNode.width;
      const parentY = parentNode.y + parentNode.height / 2;

      const d = `M ${parentX} ${parentY} C ${parentX + config.horizontalGap / 2} ${parentY} ${endX - config.horizontalGap / 2} ${endY} ${startX} ${startY}`;
      path.setAttribute('d', d);

      svg.appendChild(path);
    }
  });

  // ノードの描画
  allNodes.forEach(node => {
    const group = document.createElementNS(svgNS, 'g');

    // 矩形
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('class', 'node-rect');
    rect.setAttribute('x', node.x);
    rect.setAttribute('y', node.y);
    rect.setAttribute('width', node.width);
    rect.setAttribute('height', node.height);
    rect.setAttribute('rx', config.nodeCornerRadius);
    group.appendChild(rect);

    // テキスト
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('class', 'node-text');
    text.setAttribute('x', node.x + node.width / 2);
    text.setAttribute('y', node.y + node.height / 2);
    text.textContent = node.name;
    group.appendChild(text);

    svg.appendChild(group);
  });

  return svg;
}

// ノードの巡回
function traverseNodes(node, callback) {
  callback(node);
  node.children.forEach(child => {
    traverseNodes(child, callback);
  });
}

// 最大X座標の取得
function getMaxX(node) {
  let maxX = node.x + node.width;
  node.children.forEach(child => {
    const childMaxX = getMaxX(child);
    if (childMaxX > maxX) {
      maxX = childMaxX;
    }
  });
  return maxX;
}

// 最大Y座標の取得
function getMaxY(node) {
  let maxY = node.y + node.height;
  node.children.forEach(child => {
    const childMaxY = getMaxY(child);
    if (childMaxY > maxY) {
      maxY = childMaxY;
    }
  });
  return maxY;
}

// SVGの保存
function saveSvg(svgElement) {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // 名前空間の追加
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // ダウンロードリンクの作成とクリック
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'mindmap.svg';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// JPGの保存
function saveJpg(svgElement) {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgData = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

  const img = new Image();
  img.src = svgData;

  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.getAttribute('width');
    canvas.height = svgElement.getAttribute('height');
    const ctx = canvas.getContext('2d');

    // 背景を白で塗りつぶす
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0);

    // ダウンロードリンクの作成とクリック
    canvas.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'mindmap.jpg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }, 'image/jpeg', 1.0);
  };

  img.onerror = function() {
    displayErrorMessage('JPGの生成に失敗しました。');
  };
}
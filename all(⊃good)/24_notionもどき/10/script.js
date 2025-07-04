const markdownInput = document.getElementById('markdown-input');
const markdownOutput = document.getElementById('markdown-output');
const pageList = document.getElementById('page-list');
const addButton = document.getElementById('add-button');
const searchInput = document.getElementById('search-input');
const filterInput = document.getElementById('filter-input');
const decorationOverlay = document.getElementById('decoration-overlay');
const templateModal = document.getElementById('template-modal');
const closeModalButton = document.querySelector('.close-button');
const editorToolbar = document.querySelector('.editor-toolbar');

// 新規ページ作成関連
const addPageModal = document.getElementById('add-page-modal');
const newPageTitleInput = document.getElementById('new-page-title');
const parentPageSelect = document.getElementById('parent-page-select');
const createPageButton = document.getElementById('create-page-button');
const closeAddPageModalButton = addPageModal.querySelector('.close-button');

// エクスポート関連
const exportPdfButton = document.getElementById('export-pdf');
const exportHtmlButton = document.getElementById('export-html');
const exportSvgButton = document.getElementById('export-svg');

const boldBtn = document.getElementById('bold-btn');
const italicBtn = document.getElementById('italic-btn');
const underlineBtn = document.getElementById('underline-btn');
const strikethroughBtn = document.getElementById('strikethrough-btn');
const codeBtn = document.getElementById('code-btn');
const linkBtn = document.getElementById('link-btn');
const imageBtn = document.getElementById('image-btn');
const tableBtn = document.getElementById('table-btn'); // 表ボタン
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

const converter = new showdown.Converter({tables: true}); // テーブルを有効にする
let pages = [];
let currentPageId = null;
let history = [];
let historyIndex = -1;

// ページデータ構造
function createPage(title = '新しいページ', content = '', parentID = null) {
  return {
    pageID: generateId(),
    parentID: parentID,
    title: title,
    content: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ID生成関数
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// localStorageからデータをロード
function loadData() {
  const storedPages = localStorage.getItem('pages');
  pages = storedPages ? JSON.parse(storedPages) : [];
  currentPageId = localStorage.getItem('currentPageId');
  if (!currentPageId && pages.length > 0) {
    currentPageId = pages[0].pageID;
  }
  displayPages();
  loadPageContent(currentPageId);
  populateParentPageSelect(); // 親ページ選択肢を更新
}

// localStorageにデータを保存
function saveData() {
  localStorage.setItem('pages', JSON.stringify(pages));
  localStorage.setItem('currentPageId', currentPageId);
}

// ページを表示
function displayPages() {
  pageList.innerHTML = '';
  const filteredPages = filterPages(pages, filterInput.value);
  const tree = buildTree(filteredPages);
  renderTree(tree, pageList);
}

// ページをフィルタリング
function filterPages(pages, filterText) {
  if (!filterText) return pages;
  const lowerFilterText = filterText.toLowerCase();
  return pages.filter(page => page.title.toLowerCase().includes(lowerFilterText));
}

// ツリー構造を構築
function buildTree(pages) {
  const tree = [];
  const pageMap = {};

  pages.forEach(page => {
    pageMap[page.pageID] = page;
    page.children = [];
  });

  pages.forEach(page => {
    if (page.parentID && pageMap[page.parentID]) {
      pageMap[page.parentID].children.push(page);
    } else {
      tree.push(page);
    }
  });

  return tree;
}

// ツリーをレンダリング(修正: 削除ボタン追加)
function renderTree(tree, parentElement) {
  tree.forEach(page => {
    const listItem = document.createElement('li');
    const pageTitleSpan = document.createElement('span'); // ページタイトル用のspan
    pageTitleSpan.textContent = page.title;
    pageTitleSpan.addEventListener('click', () => loadPageContent(page.pageID));
    listItem.appendChild(pageTitleSpan);


    const deleteButton = document.createElement('button');
    deleteButton.textContent = '削除';
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', (event) => {
        event.stopPropagation(); // 親要素(li)のクリックイベントを阻止
        deletePage(page.pageID);
    });
    listItem.appendChild(deleteButton);

    parentElement.appendChild(listItem);

    if (page.children.length > 0) {
      const subList = document.createElement('ul');
      renderTree(page.children, subList);
      listItem.appendChild(subList);
    }
  });
}

// ページコンテンツをロード
function loadPageContent(pageId) {
  if (!pageId) return;
  currentPageId = pageId;
  saveData();
  const page = pages.find(page => page.pageID === pageId);
  if (page) {
    markdownInput.value = page.content;
    updateMarkdownOutput(page.content);
  }
}

// MarkdownをHTMLに変換して表示
function updateMarkdownOutput(markdownText) {
  const html = converter.makeHtml(markdownText);
  markdownOutput.innerHTML = html;
}

// ページを追加 (修正: 親ページIDを渡す)
function addPage(title, parentID) {
    const newPage = createPage(title, '', parentID);
    pages.push(newPage);
    currentPageId = newPage.pageID;
    saveData();
    displayPages();
    loadPageContent(currentPageId);
    populateParentPageSelect(); // 親ページ選択肢を更新
}

// ページを削除(修正: 子ページも削除)
function deletePage(pageId) {
    // 子ページも再帰的に削除
    function deleteChildPages(parentID) {
        const children = pages.filter(page => page.parentID === parentID);
        children.forEach(child => {
            deleteChildPages(child.pageID); // 再帰的に子ページを削除
            pages = pages.filter(page => page.pageID !== child.pageID); // 子ページを削除
        });
    }

    deleteChildPages(pageId);
    pages = pages.filter(page => page.pageID !== pageId); // 選択されたページを削除

    saveData();
    displayPages();
    if (pages.length > 0) {
        loadPageContent(pages[0].pageID);
    } else {
        markdownInput.value = '';
        updateMarkdownOutput('');
    }
}

// 検索
function searchPages(searchText) {
  const lowerSearchText = searchText.toLowerCase();
  return pages.filter(page =>
    page.title.toLowerCase().includes(lowerSearchText) ||
    page.content.toLowerCase().includes(lowerSearchText)
  );
}

// テキストを選択時の装飾オーバーレイを表示
function showDecorationOverlay(selection) {
  const range = selection.getRangeAt(0).getBoundingClientRect();
  decorationOverlay.style.top = `${range.top - 35}px`;
  decorationOverlay.style.left = `${range.left}px`;
  decorationOverlay.style.display = 'block';
}

// テキスト装飾を適用
function applyDecoration(action) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const selectedText = selection.toString();
  let replacementText = selectedText;

  switch (action) {
    case 'bold':
      replacementText = `**${selectedText}**`;
      break;
    case 'italic':
      replacementText = `*${selectedText}*`;
      break;
    case 'underline':
      replacementText = `<u>${selectedText}</u>`; // HTMLタグを使用
      break;
    case 'strikethrough':
      replacementText = `~~${selectedText}~~`;
      break;
  }

  document.execCommand('insertText', false, replacementText);
  decorationOverlay.style.display = 'none';
}

// 履歴を保存
function saveHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(markdownInput.value);
  historyIndex++;
}

// 取り消し
function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    markdownInput.value = history[historyIndex];
    updateMarkdownOutput(history[historyIndex]);
  }
}

// 再実行
function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    markdownInput.value = history[historyIndex];
    updateMarkdownOutput(history[historyIndex]);
  }
}

// 親ページ選択肢を生成
function populateParentPageSelect() {
    parentPageSelect.innerHTML = '<option value="">(なし)</option>';
    pages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.pageID;
        option.textContent = page.title;
        parentPageSelect.appendChild(option);
    });
}

// PDFエクスポート(修正: スタイル適用、ページ分割)
function exportToPdf() {
    const { jsPDF } = window.jspdf;

    // MarkdownをHTMLに変換
    const htmlContent = converter.makeHtml(markdownInput.value);

    // 一時的なdiv要素を作成し、HTMLを挿入
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv); // DOMに追加しないとスタイルが適用されない

    // スタイルを適用
    applyStylesToHtml(tempDiv);

    html2canvas(tempDiv, {
        scale: 2, // 高解像度でレンダリング
        logging: true, // デバッグログ
        useCORS: true, // CORS画像を許可
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        pdf.save("markdown-document.pdf");

        // 一時的なdiv要素を削除
        document.body.removeChild(tempDiv);
    }).catch(err => {
        console.error("PDF生成エラー:", err);
    });
}

// HTML要素にスタイルを適用する関数
function applyStylesToHtml(element) {
    // プレビュー領域のスタイルを取得
    const previewStyle = getComputedStyle(markdownOutput);

    // 主なスタイルの適用
    element.style.fontFamily = previewStyle.fontFamily;
    element.style.fontSize = previewStyle.fontSize;
    element.style.lineHeight = previewStyle.lineHeight;
    element.style.color = previewStyle.color;
    element.style.padding = previewStyle.padding;

    // 子要素にもスタイルを適用 (再帰的に)
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
        applyStylesToHtml(children[i]);
    }

    // 特定の要素に対するスタイル (例)
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(h => {
      h.style.marginBottom = '0.5em';
      h.style.borderBottom = '1px solid #eee';
    });
}

// HTMLエクスポート(修正: スタイル適用)
function exportToHtml() {
    const pageTitle = currentPageId ? pages.find(p => p.pageID === currentPageId).title : 'Markdown Document';
    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <style>
    /* プレビュー領域のスタイルをコピー */
    ${getStylesForExport()}
  </style>
</head>
<body>
  ${converter.makeHtml(markdownInput.value)}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageTitle}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

// エクスポート用のスタイルを取得する関数
function getStylesForExport() {
    const styleSheets = document.styleSheets;
    let styles = '';

    for (let i = 0; i < styleSheets.length; i++) {
        try {
            const rules = styleSheets[i].cssRules || styleSheets[i].rules;
            if (!rules) continue;

            for (let j = 0; j < rules.length; j++) {
                const rule = rules[j];
                // セレクタに #markdown-output が含まれているルールのみを対象とする
                if (rule.selectorText && rule.selectorText.includes('#markdown-output')) {
                    styles += rule.cssText + '\n';
                }
            }
        } catch (e) {
            // CORSエラーは無視
            if (e.name !== 'SecurityError') {
                throw e;
            }
        }
    }
      // bodyのスタイルも追加
    const bodyStyle = getComputedStyle(document.body);
    styles += `
    body {
      font-family: ${bodyStyle.fontFamily};
      font-size: ${bodyStyle.fontSize};
      line-height: ${bodyStyle.lineHeight};
      color: ${bodyStyle.color};
      background-color: ${bodyStyle.backgroundColor};
    }
    `;

    return styles;
}

// SVGエクスポート(修正: スタイル適用)
function exportToSvg() {
    // MarkdownをHTMLに変換
    const html = converter.makeHtml(markdownInput.value);

    // SVG要素を作成
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", markdownOutput.offsetWidth); // 幅を設定
    svg.setAttribute("height", markdownOutput.offsetHeight); // 高さを設定
    svg.setAttribute("viewBox", `0 0 ${markdownOutput.offsetWidth} ${markdownOutput.offsetHeight}`);

    // HTMLをforeignObjectとしてSVGに追加
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");

    const div = document.createElement("div");
    div.innerHTML = html;
    div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"); // XHTML名前空間を設定

    // スタイルを適用
    applyStylesToHtml(div);

    foreignObject.appendChild(div);
    svg.appendChild(foreignObject);

    // SVGを文字列に変換
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    // Blobを作成してダウンロード
    const blob = new Blob([svgString], {type: "image/svg+xml"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown-document.svg";
    a.click();
    URL.revokeObjectURL(url);
}

// イベントリスナー
markdownInput.addEventListener('input', function() {
  const markdownText = markdownInput.value;
  updateMarkdownOutput(markdownText);
  const page = pages.find(page => page.pageID === currentPageId);
  if (page) {
    page.content = markdownText;
    page.updatedAt = new Date().toISOString();
    saveData();
  }
});

markdownInput.addEventListener('select', function() {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    showDecorationOverlay(selection);
  } else {
    decorationOverlay.style.display = 'none';
  }
});

addButton.addEventListener('click', () => {
  // addPage(); // 直接addPageを呼び出すのではなく、モーダルを表示
  addPageModal.style.display = 'block';
});

closeModalButton.addEventListener('click', () => {
  templateModal.style.display = 'none';
});

// 新しいページ作成モーダルの閉じるボタン
closeAddPageModalButton.addEventListener('click', () => {
    addPageModal.style.display = 'none';
});

// 新しいページ作成ボタン
createPageButton.addEventListener('click', () => {
    const title = newPageTitleInput.value || '新しいページ'; // タイトルが空ならデフォルト値
    const parentID = parentPageSelect.value !== "" ? parentPageSelect.value : null;
    addPage(title, parentID);
    addPageModal.style.display = 'none'; // モーダルを閉じる
    // 入力フィールドをクリア
    newPageTitleInput.value = '';
    parentPageSelect.value = '';
});

document.querySelectorAll('.modal-content button').forEach(button => {
  button.addEventListener('click', function() {
    const template = this.dataset.template;
    let textToInsert = '';

    switch (template) {
      case 'heading1':
        textToInsert = '# 見出し1\n';
        break;
      case 'heading2':
        textToInsert = '## 見出し2\n';
        break;
      case 'bold':
        textToInsert = '**太字**';
        break;
      case 'italic':
        textToInsert = '*斜体*';
        break;
      case 'link':
        textToInsert = '[リンクテキスト](URL)';
        break;
      case 'image':
        textToInsert = '![代替テキスト](画像のURL)';
        break;
      case 'table': // 表のテンプレートを追加
        textToInsert = `
| 列1 | 列2 | 列3 |
| ---- | ---- | ---- |
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
        break;
    }

    markdownInput.focus();
    document.execCommand('insertText', false, textToInsert);
    templateModal.style.display = 'none';
  });
});

searchInput.addEventListener('input', function() {
  const searchText = this.value;
  const searchResults = searchPages(searchText);
  console.log('検索結果:', searchResults);
  // 検索結果の表示処理は別途実装 (今回は省略)
});

filterInput.addEventListener('input', displayPages);

decorationOverlay.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', function() {
    applyDecoration(this.dataset.action);
  });
});

boldBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '**太字**');
});

italicBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '*斜体*');
});

underlineBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '<u>下線</u>');
});

strikethroughBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '~~打ち消し線~~');
});

codeBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '`コード`');
});

linkBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '[リンクテキスト](URL)');
});

imageBtn.addEventListener('click', () => {
  document.execCommand('insertText', false, '![代替テキスト](画像のURL)');
});

// 表ボタンのクリックイベント
tableBtn.addEventListener('click', () => {
    const tableTemplate = `
| 列1 | 列2 | 列3 |
| ---- | ---- | ---- |
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
    markdownInput.focus();
    document.execCommand('insertText', false, tableTemplate);
});

undoBtn.addEventListener('click', () => {
  undo();
});

redoBtn.addEventListener('click', () => {
  redo();
});

// エクスポートボタンのイベントリスナー
exportPdfButton.addEventListener('click', exportToPdf);
exportHtmlButton.addEventListener('click', exportToHtml);
exportSvgButton.addEventListener('click', exportToSvg);

// 初期ロード
loadData();
saveHistory();
markdownInput.addEventListener('input', () => {
  saveHistory();
});
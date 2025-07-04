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

const boldBtn = document.getElementById('bold-btn');
const italicBtn = document.getElementById('italic-btn');
const underlineBtn = document.getElementById('underline-btn');
const strikethroughBtn = document.getElementById('strikethrough-btn');
const codeBtn = document.getElementById('code-btn');
const linkBtn = document.getElementById('link-btn');
const imageBtn = document.getElementById('image-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

const converter = new showdown.Converter();
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

// ツリーをレンダリング
function renderTree(tree, parentElement) {
  tree.forEach(page => {
    const listItem = document.createElement('li');
    listItem.textContent = page.title;
    listItem.addEventListener('click', () => loadPageContent(page.pageID));
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

// ページを追加
function addPage() {
  const newPage = createPage();
  pages.push(newPage);
  currentPageId = newPage.pageID;
  saveData();
  displayPages();
  loadPageContent(currentPageId);
}

// ページを削除
function deletePage(pageId) {
  pages = pages.filter(page => page.pageID !== pageId);
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
      replacementText = `<u>${selectedText}</u>`;
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
  templateModal.style.display = 'block';
});

closeModalButton.addEventListener('click', () => {
  templateModal.style.display = 'none';
});

document.querySelectorAll('.modal-content button').forEach(button => {
  button.addEventListener('click', function() {
    const template = this.dataset.template;
    let textToInsert = '';

    switch (template) {
      case 'heading1':
        textToInsert = '# 見出し1';
        break;
      case 'heading2':
        textToInsert = '## 見出し2';
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
  // 検索結果の表示処理は別途実装
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

undoBtn.addEventListener('click', () => {
  undo();
});

redoBtn.addEventListener('click', () => {
  redo();
});

// 初期ロード
loadData();
saveHistory();
markdownInput.addEventListener('input', () => {
  saveHistory();
});
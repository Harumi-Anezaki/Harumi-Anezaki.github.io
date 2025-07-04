/* script.js */
// 内部データ構造（タスクは各ページ内ブロックで管理）
let appData = {
  pages: [],
  currentPageId: null,
  undoStack: [],
  redoStack: []
};

const STORAGE_KEY = 'NOTION_APP_DATA';

/* ----- 初期化 ----- */
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  loadData();
  if (!appData.pages.length) {
    // 初回起動：デフォルトページ作成
    let defaultPage = createNewPage('Untitled Page');
    appData.pages.push(defaultPage);
    appData.currentPageId = defaultPage.pageID;
    saveData();
  }
  renderPageList();
  renderCurrentPage();
  renderTaskList();
  initEventHandlers();
}

/* ----- 保存／復元 ----- */
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData() {
  let data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    appData = JSON.parse(data);
  }
}

/* ----- ページ・ブロック関連 ----- */
function createNewPage(title) {
  return {
    pageID: 'page_' + Date.now(),
    title: title,
    // 初期は空のテキストブロック
    blocks: [createNewBlock('')],
    parentID: null,
    childrenIDs: []
  };
}

function createNewBlock(content) {
  return {
    blockID: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    blockType: 'text',
    content: content,
    isMarkdown: false
  };
}

// 新規タスクブロック（task として管理）
function createNewTaskBlock(title) {
  return {
    blockID: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    blockType: 'task',
    content: title,
    completed: false,
    isMarkdown: false
  };
}

// 新規テーブルブロック（table として管理）
// rows, cols はユーザー指定。シンプルにテーブルのHTMLを生成
function createNewTableBlock(rows, cols) {
  let tableHTML = '<table>';
  // ヘッダ行（任意・シンプルに1行目を見出しとする）
  tableHTML += '<tr>';
  for (let c = 0; c < cols; c++) {
    tableHTML += '<th contenteditable="true">Header</th>';
  }
  tableHTML += '</tr>';
  // 本文部
  for (let r = 1; r < rows; r++) {
    tableHTML += '<tr>';
    for (let c = 0; c < cols; c++) {
      tableHTML += '<td contenteditable="true">Cell</td>';
    }
    tableHTML += '</tr>';
  }
  tableHTML += '</table>';
  return {
    blockID: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    blockType: 'table',
    content: tableHTML,
    isMarkdown: false
  };
}

function renderPageList() {
  const listEl = document.getElementById('pageList');
  listEl.innerHTML = '';
  appData.pages.forEach(page => {
    let li = document.createElement('li');
    li.textContent = page.title;
    li.dataset.pageId = page.pageID;
    if (page.pageID === appData.currentPageId) li.classList.add('active');
    li.addEventListener('click', () => {
      appData.currentPageId = page.pageID;
      renderCurrentPage();
      renderTaskList();
    });
    listEl.appendChild(li);
  });
}

function renderCurrentPage() {
  const page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  const container = document.getElementById('editorContainer');
  container.innerHTML = '';
  page.blocks.forEach(block => {
    let blockEl;
    if (block.blockType === 'task') {
      // タスクブロック：チェックボックス＋編集可能テキスト
      blockEl = document.createElement('div');
      blockEl.className = 'block task-block';
      blockEl.dataset.blockId = block.blockID;
      blockEl.innerHTML = `<input type="checkbox" class="task-checkbox" ${block.completed ? "checked" : ""}>
                           <span class="task-text" contenteditable="true">${block.content || ''}</span>`;
      let checkbox = blockEl.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => {
        block.completed = checkbox.checked;
        renderTaskList();
        saveData();
      });
      let taskText = blockEl.querySelector('.task-text');
      taskText.addEventListener('input', () => {
        block.content = taskText.textContent;
        pushUndoSnapshot();
        saveData();
        renderTaskList();
      });
    } else if (block.blockType === 'table') {
      // テーブルブロック：テーブルを含む div (editable)
      blockEl = document.createElement('div');
      blockEl.className = 'block table-block';
      blockEl.dataset.blockId = block.blockID;
      // 表全体を編集可能とする（各セル内は既にcontenteditable）
      blockEl.contentEditable = "true";
      blockEl.innerHTML = block.content;
      blockEl.addEventListener('input', () => {
        updateBlockContent(block.blockID, blockEl.innerHTML);
        pushUndoSnapshot();
        saveData();
      });
    } else {
      // 通常テキストブロック
      blockEl = document.createElement('div');
      blockEl.className = 'block';
      blockEl.contentEditable = "true";
      blockEl.dataset.blockId = block.blockID;
      blockEl.innerHTML = block.content || '<br>';
      blockEl.addEventListener('input', () => {
        updateBlockContent(block.blockID, blockEl.innerHTML);
        pushUndoSnapshot();
        saveData();
      });
    }
    // 共通：ドラッグ＆ドロップ設定
    blockEl.draggable = true;
    blockEl.addEventListener('dragstart', onDragStart);
    blockEl.addEventListener('dragover', onDragOver);
    blockEl.addEventListener('drop', onDrop);
    container.appendChild(blockEl);
  });
}

function updateBlockContent(blockID, newContent) {
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  let block = page.blocks.find(b => b.blockID === blockID);
  if (block) {
    block.content = newContent;
  }
}

/* ----- Undo/Redo ----- */
function pushUndoSnapshot() {
  let snapshot = JSON.stringify(
    appData.pages.find(p => p.pageID === appData.currentPageId).blocks
  );
  appData.undoStack.push(snapshot);
  appData.redoStack = [];
  saveData();
}

function undoAction() {
  if (!appData.undoStack.length) return;
  let currentPage = appData.pages.find(p => p.pageID === appData.currentPageId);
  appData.redoStack.push(JSON.stringify(currentPage.blocks));
  let snapshot = appData.undoStack.pop();
  currentPage.blocks = JSON.parse(snapshot);
  renderCurrentPage();
  renderTaskList();
  saveData();
}

function redoAction() {
  if (!appData.redoStack.length) return;
  let currentPage = appData.pages.find(p => p.pageID === appData.currentPageId);
  appData.undoStack.push(JSON.stringify(currentPage.blocks));
  let snapshot = appData.redoStack.pop();
  currentPage.blocks = JSON.parse(snapshot);
  renderCurrentPage();
  renderTaskList();
  saveData();
}

/* ----- ドラッグ＆ドロップ ----- */
let draggingBlockID = null;
function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move';
  draggingBlockID = this.dataset.blockId;
  this.classList.add('dragging');
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
function onDrop(e) {
  e.preventDefault();
  this.classList.remove('dragging');
  let targetBlockID = this.dataset.blockId;
  if (draggingBlockID === targetBlockID) return;
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  let idxFrom = page.blocks.findIndex(b => b.blockID === draggingBlockID);
  let idxTo = page.blocks.findIndex(b => b.blockID === targetBlockID);
  const [movedBlock] = page.blocks.splice(idxFrom, 1);
  page.blocks.splice(idxTo, 0, movedBlock);
  renderCurrentPage();
  pushUndoSnapshot();
  saveData();
}

/* ----- ツールバー：リッチテキスト／Markdown／表挿入 ----- */
function initToolbar() {
  document.getElementById('boldBtn').addEventListener('click', () => {
    document.execCommand('bold');
  });
  document.getElementById('italicBtn').addEventListener('click', () => {
    document.execCommand('italic');
  });
  document.getElementById('underlineBtn').addEventListener('click', () => {
    document.execCommand('underline');
  });
  document.getElementById('markdownToggleBtn').addEventListener('click', toggleMarkdownMode);
  document.getElementById('insertTableBtn').addEventListener('click', addNewTable);
  document.getElementById('undoBtn').addEventListener('click', undoAction);
  document.getElementById('redoBtn').addEventListener('click', redoAction);
}

function toggleMarkdownMode() {
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  page.blocks = page.blocks.map(block => {
    if (block.isMarkdown) {
      block.isMarkdown = false;
    } else {
      block.content = block.content
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/__(.+?)__/g, "<u>$1</u>");
      block.isMarkdown = true;
    }
    return block;
  });
  renderCurrentPage();
  pushUndoSnapshot();
  saveData();
}

/* ----- ページ・ブロック追加 ----- */
function addNewBlock() {
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  page.blocks.push(createNewBlock(''));
  renderCurrentPage();
  pushUndoSnapshot();
  saveData();
}

function addNewPage() {
  let title = prompt('ページタイトルを入力してください');
  if (!title) return;
  let newPage = createNewPage(title);
  appData.pages.push(newPage);
  appData.currentPageId = newPage.pageID;
  renderPageList();
  renderCurrentPage();
  renderTaskList();
  saveData();
}

/* ----- タスク管理（タスクブロックとして追加） ----- */
function addNewTask() {
  let title = prompt('タスク内容を入力してください');
  if (!title) return;
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  page.blocks.push(createNewTaskBlock(title));
  renderCurrentPage();
  renderTaskList();
  pushUndoSnapshot();
  saveData();
}

/* ----- 表挿入：タブレットブロックとして追加 ----- */
function addNewTable() {
  // ユーザに行数と列数を入力
  let rows = parseInt(prompt('行数を入力してください（例：3）', '3'));
  let cols = parseInt(prompt('列数を入力してください（例：3）', '3'));
  if (!rows || !cols) return;
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  page.blocks.push(createNewTableBlock(rows, cols));
  renderCurrentPage();
  pushUndoSnapshot();
  saveData();
}

/* ----- データ・ベース機能：右サイドバーのタスク一覧 ----- */
function renderTaskList() {
  const listEl = document.getElementById('taskList');
  listEl.innerHTML = '';
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  let taskBlocks = page.blocks.filter(b => b.blockType === 'task');
  if (taskBlocks.length === 0) {
    listEl.innerHTML = '<li>タスクはありません</li>';
    return;
  }
  taskBlocks.forEach(task => {
    let li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `<input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                    <span>${task.content}</span>`;
    li.addEventListener('click', () => {
      task.completed = !task.completed;
      renderTaskList();
      saveData();
    });
    listEl.appendChild(li);
  });
}

/* ----- グローバル検索 ----- */
function searchGlobal(keyword) {
  keyword = keyword.toLowerCase();
  let results = [];
  appData.pages.forEach(page => {
    if (page.title.toLowerCase().includes(keyword)) {
      results.push("ページ: " + page.title);
    }
    page.blocks.forEach(block => {
      let text = block.content.toLowerCase();
      if (text.includes(keyword)) {
        results.push("ブロック: " + stripTags(block.content).slice(0,30) + "...");
      }
    });
  });
  alert("検索結果\n" + results.join("\n"));
}

function stripTags(html) {
  let div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/* ----- イベントハンドラの初期設定 ----- */
function initEventHandlers() {
  initToolbar();
  document.getElementById('addBlockBtn').addEventListener('click', addNewBlock);
  document.getElementById('addPageBtn').addEventListener('click', addNewPage);
  document.getElementById('addTaskBtn').addEventListener('click', addNewTask);

  document.getElementById('globalSearch').addEventListener('keyup', (e) => {
    let keyword = e.target.value.trim();
    if (keyword.length >= 2) {
      searchGlobal(keyword);
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold');
    }
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic');
    }
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      document.execCommand('underline');
    }
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undoAction();
    }
  });
}
/* script.js */
// 基本データ構造（ページ・ブロック・タスク等を管理するオブジェクト）
let appData = {
  pages: [],
  currentPageId: null,
  tasks: [],
  // Undo/Redo用スタック（直前のページ内容スナップショットとして editorContent 保存）
  undoStack: [],
  redoStack: []
};

const STORAGE_KEY = 'NOTION_APP_DATA';

/* ----- 初期化 ----- */
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  loadData();
  if (!appData.pages.length) {
    // 初回ならデフォルトページを作成
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

/* ----- ローカルストレージの保存／復元 ----- */
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
    blocks: [createNewBlock('')],
    parentID: null,
    childrenIDs: []
  };
}

function createNewBlock(content) {
  return {
    blockID: 'block_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    blockType: 'text',
    content: content,
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
    });
    listEl.appendChild(li);
  });
}

function renderCurrentPage() {
  const page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  // エディタ領域再描画
  const container = document.getElementById('editorContainer');
  container.innerHTML = '';
  page.blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'block';
    blockEl.contentEditable = "true";
    blockEl.dataset.blockId = block.blockID;
    blockEl.innerHTML = block.content || '<br>';
    // イベント：入力変更＝データ更新＋Undoスタック保存
    blockEl.addEventListener('input', () => {
      updateBlockContent(block.blockID, blockEl.innerHTML);
      pushUndoSnapshot();
      saveData();
    });
    // ドラッグ＆ドロップ設定
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
  // スナップショット：現在ページ全ブロックの内容を保存
  let snapshot = JSON.stringify(
    appData.pages.find(p => p.pageID === appData.currentPageId).blocks
  );
  appData.undoStack.push(snapshot);
  // 操作時は redoStack をクリア
  appData.redoStack = [];
  saveData();
}

function undoAction() {
  if (!appData.undoStack.length) return;
  let currentPage = appData.pages.find(p => p.pageID === appData.currentPageId);
  // 現状態を redoStack に入れる
  appData.redoStack.push(JSON.stringify(currentPage.blocks));
  // 直前スナップショットを復元
  let snapshot = appData.undoStack.pop();
  currentPage.blocks = JSON.parse(snapshot);
  renderCurrentPage();
  saveData();
}

function redoAction() {
  if (!appData.redoStack.length) return;
  let currentPage = appData.pages.find(p => p.pageID === appData.currentPageId);
  appData.undoStack.push(JSON.stringify(currentPage.blocks));
  let snapshot = appData.redoStack.pop();
  currentPage.blocks = JSON.parse(snapshot);
  renderCurrentPage();
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
  // 配列内でブロックの順序を入れ替える
  const [movedBlock] = page.blocks.splice(idxFrom, 1);
  page.blocks.splice(idxTo, 0, movedBlock);
  renderCurrentPage();
  pushUndoSnapshot();
  saveData();
}

/* ----- ツールバー：リッチテキスト、Markdown切替 ----- */
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
  document.getElementById('undoBtn').addEventListener('click', undoAction);
  document.getElementById('redoBtn').addEventListener('click', redoAction);
}

// Markdown変換（簡易版：** → <strong>、* → <em>、__ → <u>）
function toggleMarkdownMode() {
  let page = appData.pages.find(p => p.pageID === appData.currentPageId);
  if (!page) return;
  // 現在のモードに応じて変換
  page.blocks = page.blocks.map(block => {
    if (block.isMarkdown) {
      // 既にMarkdown → リッチテキスト：単純に解除
      block.isMarkdown = false;
    } else {
      // Markdown記法の変換：例として **text** → <strong>text</strong>
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
  saveData();
}

/* ----- タスク管理 ----- */
function createTask(title) {
  return {
    taskID: 'task_' + Date.now(),
    title: title,
    completed: false,
    createdAt: new Date().toISOString()
  };
}

function renderTaskList() {
  const listEl = document.getElementById('taskList');
  listEl.innerHTML = '';
  appData.tasks.forEach(task => {
    let li = document.createElement('li');
    li.textContent = task.title;
    li.style.textDecoration = task.completed ? 'line-through' : 'none';
    li.addEventListener('click', () => {
      // タスク完了切替
      task.completed = !task.completed;
      renderTaskList();
      saveData();
    });
    listEl.appendChild(li);
  });
}

function addNewTask() {
  let title = prompt('タスク内容を入力してください');
  if (!title) return;
  appData.tasks.push(createTask(title));
  renderTaskList();
  saveData();
}

/* ----- グローバル検索 ----- */
function searchGlobal(keyword) {
  // 簡易検索：ページタイトル、各ブロックテキスト、タスクタイトルから部分一致を調べる
  keyword = keyword.toLowerCase();
  let results = [];
  // ページ検索
  appData.pages.forEach(page => {
    if (page.title.toLowerCase().includes(keyword)) {
      results.push("ページ: " + page.title);
    }
    page.blocks.forEach(block => {
      if (block.content.toLowerCase().includes(keyword)) {
        results.push("ブロック: " + stripTags(block.content).slice(0,30) + "...");
      }
    });
  });
  // タスク検索
  appData.tasks.forEach(task => {
    if (task.title.toLowerCase().includes(keyword)) {
      results.push("タスク: " + task.title);
    }
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

  // グローバル検索：入力のたびに検索実行（Debounce等の工夫は推奨）
  document.getElementById('globalSearch').addEventListener('keyup', (e) => {
    let keyword = e.target.value.trim();
    if (keyword.length >= 2) {
      searchGlobal(keyword);
    }
  });

  // キーボードショートカット：Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z
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
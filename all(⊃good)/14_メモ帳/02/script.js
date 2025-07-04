// script.js

// メモデータの管理
let memos = [];
let isListView = true;

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
    // テーマの適用
    applyTheme();

    // ビューの適用
    applyView();

    // ローカルストレージからメモを読み込み
    loadMemos();

    // メモ一覧を表示
    renderMemoList();

    // イベントリスナーの設定
    setEventListeners();
});

// イベントリスナーの設定
function setEventListeners() {
    // 新規作成ボタンのイベント
    document.getElementById('new-memo').addEventListener('click', () => openMemoModal());

    // テーマ切り替え
    document.getElementById('toggle-theme').addEventListener('change', toggleTheme);

    // ビュー切り替え
    document.getElementById('view-toggle').addEventListener('click', toggleView);

    // ソート変更
    document.getElementById('sort-select').addEventListener('change', () => {
        renderMemoList();
    });

    // モーダルオーバーレイのクリックでモーダルを閉じる
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
}

// テーマの適用
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    const toggleThemeCheckbox = document.getElementById('toggle-theme');
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        toggleThemeCheckbox.checked = true;
    } else {
        document.body.classList.remove('light-mode');
        toggleThemeCheckbox.checked = false;
    }
}

// テーマの切り替え
function toggleTheme() {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    }
}

// ビューの適用
function applyView() {
    const view = localStorage.getItem('view') || 'list';
    isListView = (view === 'list');
    const memoList = document.getElementById('memo-list');
    if (isListView) {
        memoList.classList.add('list-view');
        memoList.classList.remove('grid-view');
        setViewIcon('list');
    } else {
        memoList.classList.add('grid-view');
        memoList.classList.remove('list-view');
        setViewIcon('grid');
    }
}

// ビューアイコンの設定
function setViewIcon(view) {
    const viewIcon = document.getElementById('view-icon');
    if (view === 'list') {
        viewIcon.innerHTML = '<rect x="3" y="4" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="18" width="18" height="2"/>';
    } else {
        viewIcon.innerHTML = '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>';
    }
}

// ビューの切り替え
function toggleView() {
    isListView = !isListView;
    const memoList = document.getElementById('memo-list');
    if (isListView) {
        memoList.classList.add('list-view');
        memoList.classList.remove('grid-view');
        localStorage.setItem('view', 'list');
        setViewIcon('list');
    } else {
        memoList.classList.add('grid-view');
        memoList.classList.remove('list-view');
        localStorage.setItem('view', 'grid');
        setViewIcon('grid');
    }
}

// メモをロード
function loadMemos() {
    const storedMemos = localStorage.getItem('memos');
    if (storedMemos) {
        try {
            memos = JSON.parse(storedMemos);
        } catch (error) {
            memos = [];
        }
    } else {
        memos = [];
    }
}

// メモを保存
function saveMemos() {
    localStorage.setItem('memos', JSON.stringify(memos));
}

// メモ一覧を描画
function renderMemoList() {
    const memoList = document.getElementById('memo-list');
    memoList.innerHTML = '';

    // ソート
    sortMemos();

    // ピン留めされたメモと通常のメモを分ける
    const pinnedMemos = memos.filter(memo => memo.pinned);
    const normalMemos = memos.filter(memo => !memo.pinned);

    // メモを表示
    [...pinnedMemos, ...normalMemos].forEach(memo => {
        const memoItem = createMemoItem(memo);
        memoList.appendChild(memoItem);
    });
}

// メモアイテムを作成
function createMemoItem(memo) {
    const memoItem = document.createElement('div');
    memoItem.className = 'memo-item';
    memoItem.draggable = true;

    if (memo.pinned) {
        memoItem.classList.add('pinned');
    }

    // タイトル
    const memoTitle = document.createElement('div');
    memoTitle.className = 'memo-title';
    memoTitle.textContent = memo.title || '（無題）';

    // 内容（プレビュー）
    const memoContent = document.createElement('div');
    memoContent.className = 'memo-content';
    memoContent.innerHTML = sanitizeHTML(memo.content);

    // アクションボタン
    const memoActions = document.createElement('div');
    memoActions.className = 'memo-actions';

    // ピン留めボタン
    const pinButton = document.createElement('button');
    pinButton.className = 'icon-button';
    pinButton.innerHTML = memo.pinned
        ? '<svg viewBox="0 0 24 24"><path d="M12 2L15 8L22 9L17 14V22L12 19L7 22V14L2 9L9 8L12 2Z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M12 2V19L7 22V14L2 9L9 8L12 2Z"/></svg>';
    pinButton.addEventListener('click', (e) => {
        e.stopPropagation();
        memo.pinned = !memo.pinned;
        saveMemos();
        renderMemoList();
    });

    // 編集ボタン
    const editButton = document.createElement('button');
    editButton.className = 'icon-button';
    editButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openMemoModal(memo);
    });

    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon-button';
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteMemo(memo);
    });

    // コピーボタン
    const copyButton = document.createElement('button');
    copyButton.className = 'icon-button';
    copyButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1z"/><path d="M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h12v14z"/></svg>';
    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        copyMemoContent(memo);
    });

    memoActions.appendChild(pinButton);
    memoActions.appendChild(copyButton);
    memoActions.appendChild(editButton);
    memoActions.appendChild(deleteButton);

    memoItem.appendChild(memoTitle);
    memoItem.appendChild(memoContent);
    memoItem.appendChild(memoActions);

    // メモをクリックすると編集
    memoItem.addEventListener('click', () => {
        openMemoModal(memo);
    });

    // ドラッグ＆ドロップ
    memoItem.addEventListener('dragstart', (e) => {
        memoItem.classList.add('dragging');
        e.dataTransfer.setData('text/plain', memo.id);
    });

    memoItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        memoItem.classList.add('drag-over');
    });

    memoItem.addEventListener('dragleave', () => {
        memoItem.classList.remove('drag-over');
    });

    memoItem.addEventListener('drop', (e) => {
        e.preventDefault();
        memoItem.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = memo.id;
        rearrangeMemos(draggedId, targetId);
    });

    memoItem.addEventListener('dragend', () => {
        memoItem.classList.remove('dragging');
    });

    return memoItem;
}

// メモの並び替え
function rearrangeMemos(draggedId, targetId) {
    const draggedIndex = memos.findIndex(m => m.id === draggedId);
    const targetIndex = memos.findIndex(m => m.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const [draggedMemo] = memos.splice(draggedIndex, 1);
    memos.splice(targetIndex, 0, draggedMemo);
    saveMemos();
    renderMemoList();
}

// ソート
function sortMemos() {
    const sortValue = document.getElementById('sort-select').value;
    memos.sort((a, b) => {
        switch (sortValue) {
            case 'updatedDesc':
                return b.updatedAt - a.updatedAt;
            case 'updatedAsc':
                return a.updatedAt - b.updatedAt;
            case 'createdDesc':
                return b.createdAt - a.createdAt;
            case 'createdAsc':
                return a.createdAt - b.createdAt;
            case 'titleAsc':
                return a.title.localeCompare(b.title);
            case 'titleDesc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
}

// メモ編集モーダルを開く
function openMemoModal(memo = null) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    // モーダルの内容を生成
    modalContent.innerHTML = '';

    const form = document.createElement('form');
    form.className = 'memo-form';

    // タイトル入力
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'タイトルを入力';
    titleInput.value = memo ? memo.title : '';
    form.appendChild(titleInput);

    // テキスト装飾ツールバー
    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    // 太字ボタン
    const boldButton = document.createElement('button');
    boldButton.type = 'button';
    boldButton.className = 'icon-button';
    boldButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13 15.5H9V8.5h4a2 2 0 0 1 0 4H11v3h2a2 2 0 0 1 0 4H9v-3h4a2 2 0 0 1 0 4z"/></svg>';
    boldButton.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('bold');
    });

    // 斜体ボタン
    const italicButton = document.createElement('button');
    italicButton.type = 'button';
    italicButton.className = 'icon-button';
    italicButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 10H6v3h8v-3h-2.21l3.42-10H18V4z"/></svg>';
    italicButton.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('italic');
    });

    // 下線ボタン
    const underlineButton = document.createElement('button');
    underlineButton.type = 'button';
    underlineButton.className = 'icon-button';
    underlineButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 17a5 5 0 0 0 5-5V3h-3v9a2 2 0 0 1-4 0V3H7v9a5 5 0 0 0 5 5z"/><rect x="6" y="19" width="12" height="2"/></svg>';
    underlineButton.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('underline');
    });

    // Undoボタン
    const undoButton = document.createElement('button');
    undoButton.type = 'button';
    undoButton.className = 'icon-button';
    undoButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7c4 0 7 3 7 7 0 1.66-.65 3.14-1.76 4.24l1.42 1.42C19.1 18.14 20 16.13 20 14c0-4.42-3.58-8-8-8z"/></svg>';
    undoButton.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('undo');
    });

    // Redoボタン
    const redoButton = document.createElement('button');
    redoButton.type = 'button';
    redoButton.className = 'icon-button';
    redoButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5V2l4 4-4 4V7c-4 0-7 3-7 7 0 1.66.65 3.14 1.76 4.24l-1.42 1.42C4.9 18.14 4 16.13 4 14c0-4.42 3.58-8 8-8z"/></svg>';
    redoButton.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('redo');
    });

    toolbar.appendChild(boldButton);
    toolbar.appendChild(italicButton);
    toolbar.appendChild(underlineButton);
    toolbar.appendChild(undoButton);
    toolbar.appendChild(redoButton);
    form.appendChild(toolbar);

    // コンテンツ入力
    const contentDiv = document.createElement('div');
    contentDiv.className = 'editor-content';
    contentDiv.contentEditable = true;
    contentDiv.innerHTML = memo ? memo.content : '';
    form.appendChild(contentDiv);

    // フォームアクション
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    // キャンセルボタン
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'キャンセル';
    cancelButton.addEventListener('click', closeModal);

    // 保存ボタン
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', () => {
        saveMemo(memo, titleInput.value.trim(), contentDiv.innerHTML);
    });

    formActions.appendChild(cancelButton);
    formActions.appendChild(saveButton);
    form.appendChild(formActions);

    modalContent.appendChild(form);

    // モーダルを表示
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');

    // Escキーで閉じる
    document.addEventListener('keydown', handleEscClose);
}

// モーダルを閉じる
function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('active');
    modalOverlay.setAttribute('aria-hidden', 'true');
    // イベントリスナーを削除
    document.removeEventListener('keydown', handleEscClose);
}

// Escキーでモーダルを閉じる
function handleEscClose(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

// メモを保存
function saveMemo(existingMemo, title, content) {
    if (!title && !content) {
        alertModal('タイトルまたは内容を入力してください。');
        return;
    }
    if (existingMemo) {
        // 既存のメモを更新
        existingMemo.title = title;
        existingMemo.content = content;
        existingMemo.updatedAt = Date.now();
    } else {
        // 新しいメモを追加
        const newMemo = {
            id: generateId(),
            title: title,
            content: content,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            pinned: false
        };
        memos.unshift(newMemo);
    }
    saveMemos();
    renderMemoList();
    closeModal();
    alertModal('メモを保存しました。');
}

// メモの削除確認
function confirmDeleteMemo(memo) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    // モーダルの内容を生成
    modalContent.innerHTML = '<p>このメモを削除しますか？</p>';
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    // キャンセルボタン
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'キャンセル';
    cancelButton.addEventListener('click', closeModal);

    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
        deleteMemo(memo);
    });

    formActions.appendChild(cancelButton);
    formActions.appendChild(deleteButton);
    modalContent.appendChild(formActions);

    // モーダルを表示
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');

    // Escキーで閉じる
    document.addEventListener('keydown', handleEscClose);
}

// メモを削除
function deleteMemo(memo) {
    memos = memos.filter(m => m.id !== memo.id);
    saveMemos();
    renderMemoList();
    closeModal();
    alertModal('メモを削除しました。');
}

// アラートモーダル
function alertModal(message) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    // モーダルの内容を生成
    modalContent.innerHTML = `<p>${message}</p>`;
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    // OKボタン
    const okButton = document.createElement('button');
    okButton.type = 'button';
    okButton.textContent = 'OK';
    okButton.addEventListener('click', closeModal);

    formActions.appendChild(okButton);
    modalContent.appendChild(formActions);

    // モーダルを表示
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');

    // Escキーで閉じる
    document.addEventListener('keydown', handleEscClose);
}

// メモIDの生成
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// HTMLをサニタイズ
function sanitizeHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    return template.innerHTML;
}

// メモのコピー
function copyMemoContent(memo) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = `${memo.title}\n${memo.content}`;
    const text = tempElement.textContent || tempElement.innerText;
    navigator.clipboard.writeText(text)
        .then(() => {
            alertModal('メモをコピーしました。');
        })
        .catch(() => {
            alertModal('コピーに失敗しました。');
        });
}
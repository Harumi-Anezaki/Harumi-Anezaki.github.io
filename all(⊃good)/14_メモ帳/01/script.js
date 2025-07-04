// システム全体の設定
const SETTINGS_KEY = 'memoAppSettings';
const NOTES_KEY = 'memoAppNotes';

// 現在の設定
let settings = {
    theme: 'dark',
    viewMode: 'list',
    sortBy: 'createdAt_desc'
};

// メモデータ
let notes = [];

// 編集中のメモID
let editingNoteId = null;

// Undo/Redoスタック
let undoStack = [];
let redoStack = [];

// DOM要素の取得
const themeToggle = document.getElementById('theme-toggle');
const exportButton = document.getElementById('export-button');
const importButton = document.getElementById('import-button');
const viewToggle = document.getElementById('view-toggle');
const sortSelect = document.getElementById('sort-select');
const newNoteButton = document.getElementById('new-note-button');
const notesList = document.getElementById('notes-list');

const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const closeModal = document.getElementById('close-modal');

const editModalOverlay = document.getElementById('edit-modal-overlay');
const editModal = document.getElementById('edit-modal');
const closeEditModal = document.getElementById('close-edit-modal');
const saveNoteButton = document.getElementById('save-note-button');
const cancelNoteButton = document.getElementById('cancel-note-button');
const noteTitleInput = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const editorButtons = document.querySelectorAll('.editor-button');

const importFileInput = document.getElementById('import-file-input');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadNotes();
    applySettings();
    renderNotes();
});

// 設定の読み込み
function loadSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
        } catch {
            settings = {
                theme: 'dark',
                viewMode: 'list',
                sortBy: 'createdAt_desc'
            };
        }
    }
}

// メモの読み込み
function loadNotes() {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    if (savedNotes) {
        try {
            notes = JSON.parse(savedNotes);
        } catch {
            notes = [];
        }
    }
}

// 設定の保存
function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// メモの保存
function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// 設定の適用
function applySettings() {
    // テーマ適用
    document.body.classList.toggle('light-mode', settings.theme === 'light');

    // 表示モード適用
    notesList.className = settings.viewMode === 'list' ? 'list-view' : 'grid-view';

    // ソートセレクト適用
    sortSelect.value = settings.sortBy;
}

// テーマ切り替え
themeToggle.addEventListener('click', () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
});

// 表示モード切り替え
viewToggle.addEventListener('click', () => {
    settings.viewMode = settings.viewMode === 'list' ? 'grid' : 'list';
    saveSettings();
    applySettings();
});

// ソート条件変更
sortSelect.addEventListener('change', () => {
    settings.sortBy = sortSelect.value;
    saveSettings();
    renderNotes();
});

// 新規メモ作成
newNoteButton.addEventListener('click', () => {
    openEditModal();
});

// モーダルを閉じる
closeModal.addEventListener('click', closeModalFunction);
cancelNoteButton.addEventListener('click', closeEditModalFunction);
closeEditModal.addEventListener('click', closeEditModalFunction);

// モーダルのクリックを無効化
modal.addEventListener('click', (e) => e.stopPropagation());
editModal.addEventListener('click', (e) => e.stopPropagation());

// モーダル背景のクリックで閉じる
modalOverlay.addEventListener('click', closeModalFunction);
editModalOverlay.addEventListener('click', closeEditModalFunction);

// エディタボタンの機能
editorButtons.forEach(button => {
    button.addEventListener('click', () => {
        const command = button.getAttribute('data-command');
        if (command === 'undo' || command === 'redo') {
            document.execCommand(command);
        } else {
            document.execCommand(command, false, null);
        }
    });
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        document.execCommand('undo');
        e.preventDefault();
    }
    if (e.ctrlKey && e.key === 'y') {
        document.execCommand('redo');
        e.preventDefault();
    }
});

// メモ保存
saveNoteButton.addEventListener('click', () => {
    const title = noteTitleInput.value.trim();
    const content = noteContent.innerHTML.trim();
    if (title === '') {
        showAlertModal('タイトルを入力してください。');
        return;
    }

    if (editingNoteId) {
        // 編集
        const note = notes.find(n => n.id === editingNoteId);
        if (note) {
            note.title = title;
            note.content = content;
            note.updatedAt = new Date().toISOString();
        }
        showAlertModal('メモを更新しました。');
    } else {
        // 新規作成
        const newNote = {
            id: generateUUID(),
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pinned: false
        };
        notes.push(newNote);
        showAlertModal('メモを保存しました。');
    }

    saveNotes();
    renderNotes();
    closeEditModalFunction();
});

// インポートボタン
importButton.addEventListener('click', () => {
    importFileInput.click();
});

// インポートファイル選択
importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedNotes = JSON.parse(event.target.result);
            if (Array.isArray(importedNotes)) {
                showConfirmModal('データをインポートします。既存のデータを上書きしますか？', () => {
                    notes = importedNotes.map(n => ({
                        ...n,
                        id: generateUUID()
                    }));
                    saveNotes();
                    renderNotes();
                    showAlertModal('データをインポートしました。');
                }, () => {
                    // キャンセル時の処理
                });
            } else {
                showAlertModal('不正なデータ形式です。');
            }
        } catch {
            showAlertModal('ファイルの解析に失敗しました。');
        }
    };
    reader.readAsText(file);
});

// エクスポートボタン
exportButton.addEventListener('click', () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `memo_data_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlertModal('データをエクスポートしました。');
});

// メモのレンダリング
function renderNotes() {
    // ソート
    let sortedNotes = [...notes];
    sortedNotes.sort(getSortFunction(settings.sortBy));

    // ピン留めされたメモを上に
    sortedNotes = sortedNotes.sort((a, b) => b.pinned - a.pinned);

    // リストクリア
    notesList.innerHTML = '';

    // メモ追加
    sortedNotes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'note-item';

        if (settings.viewMode === 'grid') {
            // グリッドビュー用のコンテンツ
            const title = document.createElement('div');
            title.className = 'note-title';
            title.textContent = note.title;

            const preview = document.createElement('div');
            preview.className = 'note-content-preview';
            preview.innerHTML = sanitizeHTML(note.content);

            li.appendChild(title);
            li.appendChild(preview);
        } else {
            // リストビュー用のコンテンツ
            const title = document.createElement('div');
            title.className = 'note-title';
            title.textContent = note.title;

            const updatedAt = document.createElement('div');
            updatedAt.className = 'note-updated';
            updatedAt.textContent = `更新日: ${new Date(note.updatedAt).toLocaleString()}`;

            li.appendChild(title);
            li.appendChild(updatedAt);
        }

        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const editButton = document.createElement('button');
        editButton.className = 'icon-button action-button';
        editButton.innerHTML = '&#9998;'; // 編集アイコン
        editButton.title = '編集';
        editButton.addEventListener('click', () => openEditModal(note.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'icon-button action-button';
        deleteButton.innerHTML = '&#10060;'; // 削除アイコン
        deleteButton.title = '削除';
        deleteButton.addEventListener('click', () => {
            showConfirmModal('このメモを削除しますか？', () => {
                deleteNote(note.id);
            }, () => {});
        });

        const pinButton = document.createElement('button');
        pinButton.className = 'icon-button action-button';
        pinButton.innerHTML = note.pinned ? '&#x1F4CC;' : '&#x1F4CD;'; // ピンアイコン
        pinButton.title = note.pinned ? 'ピンを解除' : 'ピン留め';
        pinButton.classList.toggle('pinned', note.pinned);
        pinButton.addEventListener('click', () => {
            togglePin(note.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        actions.appendChild(pinButton);

        li.appendChild(actions);
        notesList.appendChild(li);
    });
}

// ソート関数の取得
function getSortFunction(sortBy) {
    switch (sortBy) {
        case 'createdAt_asc':
            return (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
        case 'createdAt_desc':
            return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
        case 'updatedAt_asc':
            return (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt);
        case 'updatedAt_desc':
            return (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'title_asc':
            return (a, b) => a.title.localeCompare(b.title);
        case 'title_desc':
            return (a, b) => b.title.localeCompare(a.title);
        default:
            return (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    }
}

// メモの削除
function deleteNote(id) {
    notes = notes.filter(note => note.id !== id);
    saveNotes();
    renderNotes();
    showAlertModal('メモを削除しました。');
}

// ピン留めの切り替え
function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        note.updatedAt = new Date().toISOString();
        saveNotes();
        renderNotes();
    }
}

// メモ編集モーダルのオープン
function openEditModal(id = null) {
    editingNoteId = id;
    if (id) {
        const note = notes.find(n => n.id === id);
        if (note) {
            noteTitleInput.value = note.title;
            noteContent.innerHTML = note.content;
        }
    } else {
        noteTitleInput.value = '';
        noteContent.innerHTML = '';
    }
    editModalOverlay.classList.add('active');
    noteTitleInput.focus();
}

// メモ編集モーダルの閉鎖
function closeEditModalFunction() {
    editingNoteId = null;
    noteTitleInput.value = '';
    noteContent.innerHTML = '';
    editModalOverlay.classList.remove('active');
}

// 一般的なモーダルの表示
function showAlertModal(message) {
    modalTitle.textContent = '通知';
    modalBody.textContent = message;
    modalFooter.innerHTML = `<button id="alert-ok-button" class="primary-button">OK</button>`;
    modalOverlay.classList.add('active');

    document.getElementById('alert-ok-button').addEventListener('click', closeModalFunction);
}

// 確認モーダルの表示
function showConfirmModal(message, onConfirm, onCancel) {
    modalTitle.textContent = '確認';
    modalBody.textContent = message;
    modalFooter.innerHTML = `
        <button id="confirm-yes-button" class="primary-button">はい</button>
        <button id="confirm-no-button" class="secondary-button">いいえ</button>
    `;
    modalOverlay.classList.add('active');

    document.getElementById('confirm-yes-button').addEventListener('click', () => {
        closeModalFunction();
        onConfirm();
    });

    document.getElementById('confirm-no-button').addEventListener('click', () => {
        closeModalFunction();
        if (onCancel) onCancel();
    });
}

// モーダルの閉じる関数
function closeModalFunction() {
    modalOverlay.classList.remove('active');
}

// UUID生成関数
function generateUUID() { // RFC4122 version 4 compliant UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// HTMLのサニタイズ関数
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
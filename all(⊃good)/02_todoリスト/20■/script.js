// データモデル
let tasks = [];
let settings = {
    theme: 'light'
};

// DOM要素の参照
const addTaskButton = document.getElementById('add-task-button');
const exportDataButton = document.getElementById('export-data');
const importDataButton = document.getElementById('import-data');
const importFileInput = document.getElementById('import-file');
const taskList = document.getElementById('task-list');
const completedTaskList = document.getElementById('completed-task-list');
const sortTasks = document.getElementById('sort-tasks');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');
const themeToggle = document.getElementById('theme-toggle');
const categoryDatalist = document.getElementById('categories');
const addCategoryButton = document.getElementById('add-category-button');

// モーダル関連
const modal = document.getElementById('modal');
const memoModal = document.getElementById('memo-modal');
const deleteModal = document.getElementById('delete-modal');
const subtaskModal = document.getElementById('subtask-modal');

const closeModalButtons = document.querySelectorAll('.close-button');
const taskForm = document.getElementById('task-form');
const subtaskForm = document.getElementById('subtask-form');
const modalTitle = document.getElementById('modal-title');
const memoContent = document.getElementById('memo-content');
const cancelTaskButton = document.getElementById('cancel-task');
const cancelSubtaskButton = document.getElementById('cancel-subtask');
const confirmDeleteButton = document.getElementById('confirm-delete');

const saveTaskButton = document.getElementById('save-task');
const saveSubtaskButton = document.getElementById('save-subtask');

// 現在編集中のタスクID
let currentEditId = null;
// 現在削除対象のタスクID
let deleteTaskId = null;
// 現在サブタスクを追加するタスクID
let currentSubtaskParentId = null;
// 現在編集中のサブタスクID
let currentSubtaskEditId = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadTasks();
    applyTheme();
    renderTasks();
    populateCategories();
    setMinDate();
    setMinSubtaskDate();

    // イベントリスナー
    addTaskButton.addEventListener('click', () => openModal('add'));
    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
    sortTasks.addEventListener('change', renderTasks);
    filterCategory.addEventListener('change', renderTasks);
    filterPriority.addEventListener('change', renderTasks);
    filterStatus.addEventListener('change', renderTasks);
    themeToggle.addEventListener('change', toggleTheme);
    addCategoryButton.addEventListener('click', addCategory);

    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal').id));
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) closeModal('modal');
        if (e.target == memoModal) closeModal('memo-modal');
        if (e.target == deleteModal) closeModal('delete-modal');
        if (e.target == subtaskModal) closeModal('subtask-modal');
    });

    taskForm.addEventListener('submit', saveTask);
    subtaskForm.addEventListener('submit', saveSubtask);
    cancelTaskButton.addEventListener('click', () => closeModal('modal'));
    cancelSubtaskButton.addEventListener('click', () => closeModal('subtask-modal'));
    confirmDeleteButton.addEventListener('click', confirmDelete);
});

// 設定の読み込み
function loadSettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    themeToggle.checked = settings.theme === 'dark';
}

// タスクの読み込み
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
}

// 設定の保存
function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// タスクの保存
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// テーマの適用
function applyTheme() {
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// テーマ切替
function toggleTheme() {
    settings.theme = themeToggle.checked ? 'dark' : 'light';
    applyTheme();
    saveSettings();
}

// カテゴリ追加機能
function addCategory() {
    const categoryValue = document.getElementById('category').value.trim();
    if (categoryValue === '') {
        alert('カテゴリ名を入力してください。');
        return;
    }
    // カテゴリが既に存在するかチェック
    const existingCategories = [...new Set(tasks.map(t => t.category).filter(c => c))];
    if (existingCategories.includes(categoryValue)) {
        alert('このカテゴリは既に存在します。');
        return;
    }
    // カテゴリを追加
    populateCategories();
    taskForm.category.value = categoryValue;
}

// モーダルを開く
function openModal(mode, task = null) {
    modal.style.display = 'block';
    if (mode === 'add') {
        modalTitle.textContent = 'タスクを追加';
        taskForm.reset();
        currentEditId = null;
    } else if (mode === 'edit') {
        modalTitle.textContent = 'タスクを編集';
        populateForm(task);
        currentEditId = task.id;
    }
}

// モーダルを閉じる
function closeModal(modalId) {
    const targetModal = document.getElementById(modalId);
    targetModal.style.display = 'none';
    // リセット編集IDなど
    if (modalId === 'delete-modal') {
        deleteTaskId = null;
    }
    if (modalId === 'subtask-modal') {
        currentSubtaskParentId = null;
        currentSubtaskEditId = null;
    }
}

// タスクフォームの保存
function saveTask(e) {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const title = formData.get('title').trim();
    const dueDate = formData.get('dueDate');
    const category = formData.get('category').trim();
    const priority = formData.get('priority');
    const memo = formData.get('memo').trim();

    if (title === '') {
        alert('タスク内容は必須です。');
        return;
    }

    if (currentEditId) {
        // 編集
        const taskIndex = tasks.findIndex(t => t.id === currentEditId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                title,
                dueDate,
                category,
                priority,
                memo
            };
        }
    } else {
        // 追加
        const newTask = {
            id: generateUUID(),
            title,
            dueDate,
            category,
            priority,
            memo,
            completed: false,
            subtasks: [],
            createdAt: Date.now()
        };
        tasks.push(newTask);
    }

    saveTasks();
    populateCategories();
    renderTasks();
    closeModal('modal');
}

// フォームにタスク情報を埋め込む
function populateForm(task) {
    taskForm.title.value = task.title;
    taskForm.dueDate.value = task.dueDate || '';
    taskForm.category.value = task.category || '';
    taskForm.priority.value = task.priority;
    taskForm.memo.value = task.memo || '';
}

// タスクのレンダリング
function renderTasks() {
    // フィルタとソート
    let filteredTasks = [...tasks];

    // フィルタリング
    const categoryFilter = filterCategory.value;
    const priorityFilter = filterPriority.value;
    const statusFilter = filterStatus.value;

    if (categoryFilter) {
        filteredTasks = filteredTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }
    if (statusFilter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (statusFilter === 'incomplete') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    // 並び替え
    const sortValue = sortTasks.value;
    if (sortValue) {
        const [key, order] = sortValue.split('-');
        filteredTasks.sort((a, b) => {
            if (key === 'priority') {
                const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
                return order === 'asc' ? priorityOrder[a.priority] - priorityOrder[b.priority] :
                                         priorityOrder[b.priority] - priorityOrder[a.priority];
            } else if (key === 'dueDate' || key === 'createdAt') {
                const aVal = a[key] ? new Date(a[key]) : new Date(0);
                const bVal = b[key] ? new Date(b[key]) : new Date(0);
                return order === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                const aVal = a[key] || '';
                const bVal = b[key] || '';
                return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
        });
    }

    // リストのクリア
    taskList.innerHTML = '';
    completedTaskList.innerHTML = '';

    // タスクの追加
    filteredTasks.forEach(task => {
        const li = createTaskElement(task);
        if (task.completed) {
            completedTaskList.appendChild(li);
        } else {
            taskList.appendChild(li);
        }
    });
}

// タスク要素の作成
function createTaskElement(task) {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = task.id;
    li.classList.add(`priority-${task.priority}`);
    if (task.completed) {
        li.classList.add('completed');
    }

    // タスク情報
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('task-info');

    const title = document.createElement('span');
    title.textContent = task.title;
    infoDiv.appendChild(title);

    if (task.dueDate) {
        const dueDate = document.createElement('span');
        dueDate.textContent = `期限: ${formatDate(task.dueDate)}`;
        dueDate.classList.add('deadline');
        // 期限の強調
        const today = new Date();
        const taskDate = new Date(task.dueDate);
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            dueDate.style.color = 'var(--priority-high-color)'; // 赤
        } else if (diffDays <= 3) {
            dueDate.style.color = 'var(--priority-medium-color)'; // オレンジ
        }
        infoDiv.appendChild(dueDate);
    }

    if (task.category) {
        const category = document.createElement('span');
        category.textContent = `カテゴリー: ${task.category}`;
        category.classList.add('category');
        infoDiv.appendChild(category);
    }

    // サブタスク数
    if (task.subtasks && task.subtasks.length > 0) {
        const subtasks = document.createElement('span');
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        subtasks.textContent = `サブタスク: ${completedSubtasks}/${task.subtasks.length}`;
        subtasks.classList.add('subtasks');
        infoDiv.appendChild(subtasks);
    }

    // メモアイコン
    if (task.memo) {
        const memoBtn = document.createElement('button');
        memoBtn.innerHTML = '📝';
        memoBtn.title = 'メモを見る';
        memoBtn.classList.add('memo-button');
        memoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMemo(task.memo);
        });
        infoDiv.appendChild(memoBtn);
    }

    li.appendChild(infoDiv);

    // アクションボタン
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('task-actions');

    // 完了チェックボックス
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.checked = task.completed;
    completeCheckbox.title = '完了';
    completeCheckbox.addEventListener('change', () => toggleComplete(task.id));
    actionsDiv.appendChild(completeCheckbox);

    // 編集ボタン
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️';
    editBtn.title = '編集';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal('edit', task);
    });
    actionsDiv.appendChild(editBtn);

    // サブタスク追加ボタン
    const addSubtaskBtn = document.createElement('button');
    addSubtaskBtn.innerHTML = '➕';
    addSubtaskBtn.title = 'サブタスクを追加';
    addSubtaskBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSubtaskModal(task.id);
    });
    actionsDiv.appendChild(addSubtaskBtn);

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = '削除';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(task.id);
    });
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(actionsDiv);

    // サブタスク表示
    if (task.subtasks && task.subtasks.length > 0) {
        const subtaskList = document.createElement('ul');
        subtaskList.classList.add('subtask-list');
        task.subtasks.forEach(subtask => {
            const subLi = document.createElement('li');
            subLi.classList.add('subtask-item');
            if (subtask.completed) {
                subLi.classList.add('completed');
            }

            const subCheckbox = document.createElement('input');
            subCheckbox.type = 'checkbox';
            subCheckbox.checked = subtask.completed;
            subCheckbox.title = '完了';
            subCheckbox.addEventListener('change', () => toggleSubtaskComplete(task.id, subtask.id));
            subLi.appendChild(subCheckbox);

            const subTitle = document.createElement('span');
            subTitle.textContent = subtask.title;
            subLi.appendChild(subTitle);

            // サブタスク編集ボタン
            const editSubtaskBtn = document.createElement('button');
            editSubtaskBtn.innerHTML = '✏️';
            editSubtaskBtn.title = 'サブタスクを編集';
            editSubtaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editSubtask(task.id, subtask.id);
            });
            subLi.appendChild(editSubtaskBtn);

            // サブタスク削除ボタン
            const deleteSubtaskBtn = document.createElement('button');
            deleteSubtaskBtn.innerHTML = '🗑️';
            deleteSubtaskBtn.title = 'サブタスクを削除';
            deleteSubtaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSubtask(task.id, subtask.id);
            });
            subLi.appendChild(deleteSubtaskBtn);

            subtaskList.appendChild(subLi);
        });
        li.appendChild(subtaskList);
    }

    // ドラッグイベント
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    return li;
}

// タスクの完了状態を切替
function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// タスクの削除確認モーダルを開く
function openDeleteModal(id) {
    deleteModal.style.display = 'block';
    deleteTaskId = id;
}

// 削除確認を実行
function confirmDelete() {
    if (deleteTaskId) {
        tasks = tasks.filter(t => t.id !== deleteTaskId);
        saveTasks();
        renderTasks();
        deleteTaskId = null;
        closeModal('delete-modal');
    }
}

// メモの表示
function showMemo(memo) {
    memoContent.textContent = memo;
    memoModal.style.display = 'block';
}

// カテゴリーのポピュレート
function populateCategories() {
    const categories = [...new Set(tasks.map(t => t.category).filter(c => c))];
    categoryDatalist.innerHTML = '';
    filterCategory.innerHTML = '<option value="">カテゴリー</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categoryDatalist.appendChild(option);

        const filterOption = document.createElement('option');
        filterOption.value = cat;
        filterCategory.appendChild(filterOption);
    });
}

// データのエクスポート
function exportData() {
    const data = {
        tasks,
        settings
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
}

// データのインポート
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.tasks && Array.isArray(importedData.tasks)) {
                // 新しいIDを割り当てて追加
                importedData.tasks.forEach(task => {
                    task.id = generateUUID();
                    if (task.subtasks && Array.isArray(task.subtasks)) {
                        task.subtasks.forEach(subtask => {
                            subtask.id = generateUUID();
                        });
                    } else {
                        task.subtasks = [];
                    }
                    tasks.push(task);
                });
                if (importedData.settings) {
                    settings = importedData.settings;
                    themeToggle.checked = settings.theme === 'dark';
                    applyTheme();
                }
                saveTasks();
                saveSettings();
                populateCategories();
                renderTasks();
                alert('データをインポートしました。');
            } else {
                alert('無効なデータ形式です。');
            }
        } catch (error) {
            alert('データの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
    // リセット
    importFileInput.value = '';
}

// サブタスク追加モーダルを開く
function openSubtaskModal(parentId) {
    subtaskModal.style.display = 'block';
    subtaskForm.reset();
    currentSubtaskParentId = parentId;
    currentSubtaskEditId = null;
    setMinSubtaskDate();
}

// サブタスクフォームの保存
function saveSubtask(e) {
    e.preventDefault();
    const formData = new FormData(subtaskForm);
    const title = formData.get('subtask-title').trim();
    const dueDate = formData.get('subtask-dueDate');
    const priority = formData.get('subtask-priority');

    if (title === '') {
        alert('サブタスク内容は必須です。');
        return;
    }

    if (currentSubtaskParentId) {
        const parentTask = tasks.find(t => t.id === currentSubtaskParentId);
        if (parentTask) {
            if (currentSubtaskEditId) {
                // 編集
                const subtaskIndex = parentTask.subtasks.findIndex(st => st.id === currentSubtaskEditId);
                if (subtaskIndex !== -1) {
                    parentTask.subtasks[subtaskIndex] = {
                        ...parentTask.subtasks[subtaskIndex],
                        title,
                        dueDate,
                        priority
                    };
                }
            } else {
                // 追加
                const newSubtask = {
                    id: generateUUID(),
                    title,
                    dueDate,
                    priority,
                    completed: false,
                    createdAt: Date.now()
                };
                parentTask.subtasks.push(newSubtask);
            }
            saveTasks();
            renderTasks();
            closeModal('subtask-modal');
        }
    }
}

// サブタスクの完了状態を切替
function toggleSubtaskComplete(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            saveTasks();
            renderTasks();
        }
    }
}

// サブタスクの編集
function editSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            openSubtaskEditModal(task, subtask);
        }
    }
}

// サブタスク編集モーダルを開く
function openSubtaskEditModal(task, subtask) {
    subtaskModal.style.display = 'block';
    subtaskForm.reset();
    document.getElementById('subtask-title').value = subtask.title;
    document.getElementById('subtask-dueDate').value = subtask.dueDate || '';
    document.getElementById('subtask-priority').value = subtask.priority;
    currentSubtaskParentId = task.id;
    currentSubtaskEditId = subtask.id;
    setMinSubtaskDate();
}

// サブタスクの削除
function deleteSubtask(taskId, subtaskId) {
    if (confirm('本当にサブタスクを削除しますか？')) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
            saveTasks();
            renderTasks();
        }
    }
}

// ユニークID生成 (UUID v4)
function generateUUID() { // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
}

// タスクの日付フォーマット
function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, options);
}

// 最小日付の設定（追加・編集フォーム）
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dueDate').setAttribute('min', today);
}

// 最小日付の設定（サブタスクフォーム）
function setMinSubtaskDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('subtask-dueDate').setAttribute('min', today);
}

// ドラッグ＆ドロップの設定
let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('over');
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('over');
    const srcId = e.dataTransfer.getData('text/plain');
    const destId = this.dataset.id;

    if (srcId !== destId) {
        const srcTaskIndex = tasks.findIndex(t => t.id === srcId);
        const destTaskIndex = tasks.findIndex(t => t.id === destId);
        if (srcTaskIndex > -1 && destTaskIndex > -1) {
            const [movedTask] = tasks.splice(srcTaskIndex, 1);
            tasks.splice(destTaskIndex, 0, movedTask);
            saveTasks();
            renderTasks();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('li');
    items.forEach(item => item.classList.remove('over'));
}

// 完了タスクの再レンダリングが必要なので、既存のrenderTasks関数内で対応

// 完全なタスクの再描画
function renderTasks() {
    // フィルタとソート
    let filteredTasks = [...tasks];

    // フィルタリング
    const categoryFilter = filterCategory.value;
    const priorityFilter = filterPriority.value;
    const statusFilter = filterStatus.value;

    if (categoryFilter) {
        filteredTasks = filteredTasks.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }
    if (statusFilter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (statusFilter === 'incomplete') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    // 並び替え
    const sortValue = sortTasks.value;
    if (sortValue) {
        const [key, order] = sortValue.split('-');
        filteredTasks.sort((a, b) => {
            if (key === 'priority') {
                const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
                return order === 'asc' ? priorityOrder[a.priority] - priorityOrder[b.priority] :
                                         priorityOrder[b.priority] - priorityOrder[a.priority];
            } else if (key === 'dueDate' || key === 'createdAt') {
                const aVal = a[key] ? new Date(a[key]) : new Date(0);
                const bVal = b[key] ? new Date(b[key]) : new Date(0);
                return order === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                const aVal = a[key] || '';
                const bVal = b[key] || '';
                return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
        });
    }

    // リストのクリア
    taskList.innerHTML = '';
    completedTaskList.innerHTML = '';

    // タスクの追加
    filteredTasks.forEach(task => {
        const li = createTaskElement(task);
        if (task.completed) {
            completedTaskList.appendChild(li);
        } else {
            taskList.appendChild(li);
        }
    });
}

// 初回レンダリング
renderTasks();
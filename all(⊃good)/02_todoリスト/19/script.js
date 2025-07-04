// グローバル変数
let tasks = [];
let settings = {
    theme: 'light'
};
let currentEditingTaskId = null;
let currentEditingSubtaskId = null;
let deleteTargetId = null;
let categories = [];

// ページロード時の処理
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    applyTheme();
    initializeUI();
    renderTasks();
});

// データのロード
function loadData() {
    const tasksData = localStorage.getItem('tasks');
    const settingsData = localStorage.getItem('settings');
    if (tasksData) {
        tasks = JSON.parse(tasksData);
    }
    if (settingsData) {
        settings = JSON.parse(settingsData);
    }
}

// データの保存
function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('settings', JSON.stringify(settings));
}

// テーマの適用
function applyTheme() {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${settings.theme}-theme`);
    const themeSwitch = document.getElementById('themeSwitch');
    themeSwitch.value = settings.theme;
}

// UIの初期化
function initializeUI() {
    setupEventListeners();
    updateCategoryList();
}

// イベントリスナーの設定
function setupEventListeners() {
    // テーマ切り替え
    const themeSwitch = document.getElementById('themeSwitch');
    themeSwitch.addEventListener('change', () => {
        settings.theme = themeSwitch.value;
        saveData();
        applyTheme();
    });

    // タスク追加ボタン
    const addTaskBtn = document.getElementById('addTaskBtn');
    addTaskBtn.addEventListener('click', () => {
        openTaskModal();
    });

    // タスクフォームの送信
    const taskForm = document.getElementById('taskForm');
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });

    // タスクフォームのキャンセル
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    cancelTaskBtn.addEventListener('click', closeAllModals);

    // サブタスクフォームの送信
    const subtaskForm = document.getElementById('subtaskForm');
    subtaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSubtask();
    });

    // サブタスクフォームのキャンセル
    const cancelSubtaskBtn = document.getElementById('cancelSubtaskBtn');
    cancelSubtaskBtn.addEventListener('click', closeAllModals);

    // モーダルの閉じるボタン
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // 削除確認
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.addEventListener('click', deleteTask);

    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    cancelDeleteBtn.addEventListener('click', closeAllModals);

    // 外部クリックでモーダルを閉じる
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target == modal) {
                closeAllModals();
            }
        });
    });

    // フィルター
    const filterBtn = document.getElementById('filterBtn');
    filterBtn.addEventListener('click', openFilterModal);

    const filterForm = document.getElementById('filterForm');
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        closeAllModals();
        renderTasks();
    });

    const cancelFilterBtn = document.getElementById('cancelFilterBtn');
    cancelFilterBtn.addEventListener('click', closeAllModals);

    // 並び替え
    const sortOptions = document.getElementById('sortOptions');
    sortOptions.addEventListener('change', renderTasks);

    // 完了タスクの表示切替
    const toggleCompletedTasks = document.getElementById('toggleCompletedTasks');
    toggleCompletedTasks.addEventListener('click', () => {
        const completedTaskList = document.getElementById('completedTaskList');
        if (completedTaskList.style.display === 'none') {
            completedTaskList.style.display = 'block';
            toggleCompletedTasks.textContent = '非表示にする';
        } else {
            completedTaskList.style.display = 'none';
            toggleCompletedTasks.textContent = '表示する';
        }
    });

    // データのエクスポート
    const exportDataBtn = document.getElementById('exportDataBtn');
    exportDataBtn.addEventListener('click', exportData);

    // データのインポート
    const importDataBtn = document.getElementById('importDataBtn');
    importDataBtn.addEventListener('click', () => {
        const importFileInput = document.getElementById('importFileInput');
        importFileInput.click();
    });

    const importFileInput = document.getElementById('importFileInput');
    importFileInput.addEventListener('change', importData);

    // 検索機能
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', renderTasks);
}

// カテゴリーリストの更新
function updateCategoryList() {
    categories = [...new Set(tasks.map(task => task.category).filter(Boolean))];
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        categoryList.appendChild(option);
    });

    // フィルターモーダルのカテゴリー
    const filterCategories = document.getElementById('filterCategories');
    filterCategories.innerHTML = '';
    categories.forEach(category => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="category" value="${category}"> ${category}`;
        filterCategories.appendChild(label);
    });
}

// タスクの描画
function renderTasks() {
    const taskList = document.getElementById('taskList');
    const completedTaskList = document.getElementById('completedTaskList');
    taskList.innerHTML = '';
    completedTaskList.innerHTML = '';

    // カテゴリーリストの更新
    updateCategoryList();

    // フィルター適用
    let filteredTasks = filterTasks(tasks);

    // 検索適用
    filteredTasks = searchTasks(filteredTasks);

    // 並び替え適用
    filteredTasks = sortTasks(filteredTasks);

    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        if (task.completed) {
            completedTaskList.appendChild(taskElement);
        } else {
            taskList.appendChild(taskElement);
        }
    });
}

// タスク要素の作成
function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.draggable = true;
    taskItem.dataset.id = task.id;
    taskItem.dataset.priority = task.priority;
    taskItem.dataset.completed = task.completed;

    // 期限切れチェック
    if (task.dueDate && new Date(task.dueDate) < new Date() && !task.completed) {
        taskItem.classList.add('overdue');
    }

    if (task.completed) {
        taskItem.classList.add('completed');
    }

    // タスクヘッダー
    const header = document.createElement('div');
    header.className = 'task-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveData();
        renderTasks();
    });
    header.appendChild(checkbox);

    const title = document.createElement('h3');
    title.textContent = task.title;
    header.appendChild(title);

    // メモアイコン
    if (task.memo) {
        const memoIcon = document.createElement('span');
        memoIcon.className = 'memo-icon';
        memoIcon.textContent = '📝';
        memoIcon.addEventListener('click', () => {
            showMemo(task.memo);
        });
        header.appendChild(memoIcon);
    }

    taskItem.appendChild(header);

    // タスク詳細
    const details = document.createElement('div');
    details.className = 'task-details';

    if (task.dueDate) {
        const dueDate = document.createElement('div');
        dueDate.textContent = `期限日: ${formatDate(task.dueDate)}`;
        details.appendChild(dueDate);
    }

    if (task.category) {
        const category = document.createElement('div');
        category.className = 'category-badge';
        category.textContent = task.category;
        details.appendChild(category);
    }

    taskItem.appendChild(details);

    // タスク操作ボタン
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.title = '編集';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => {
        openTaskModal(task);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.title = '削除';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', () => {
        deleteTargetId = task.id;
        openDeleteModal();
    });
    actions.appendChild(deleteBtn);

    taskItem.appendChild(actions);

    // サブタスク
    const subtaskContainer = document.createElement('div');
    subtaskContainer.className = 'subtasks';

    const subtaskList = document.createElement('div');
    task.subtasks.forEach(subtask => {
        const subtaskItem = createSubtaskElement(task, subtask);
        subtaskList.appendChild(subtaskItem);
    });
    subtaskContainer.appendChild(subtaskList);

    const addSubtaskBtn = document.createElement('button');
    addSubtaskBtn.textContent = '＋ サブタスクを追加';
    addSubtaskBtn.className = 'secondary-btn';
    addSubtaskBtn.addEventListener('click', () => {
        currentEditingTaskId = task.id;
        openSubtaskModal();
    });
    subtaskContainer.appendChild(addSubtaskBtn);

    taskItem.appendChild(subtaskContainer);

    // ドラッグイベント
    taskItem.addEventListener('dragstart', dragStart);
    taskItem.addEventListener('dragover', dragOver);
    taskItem.addEventListener('drop', drop);
    taskItem.addEventListener('dragend', dragEnd);

    return taskItem;
}

// サブタスク要素の作成
function createSubtaskElement(parentTask, subtask) {
    const subtaskItem = document.createElement('div');
    subtaskItem.className = 'task-item subtask-item';
    subtaskItem.dataset.id = subtask.id;
    subtaskItem.dataset.priority = subtask.priority;
    subtaskItem.dataset.completed = subtask.completed;

    // 期限切れチェック
    if (subtask.dueDate && new Date(subtask.dueDate) < new Date() && !subtask.completed) {
        subtaskItem.classList.add('overdue');
    }

    if (subtask.completed) {
        subtaskItem.classList.add('completed');
    }

    // サブタスクヘッダー
    const header = document.createElement('div');
    header.className = 'task-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = subtask.completed;
    checkbox.addEventListener('change', () => {
        subtask.completed = checkbox.checked;
        saveData();
        renderTasks();
    });
    header.appendChild(checkbox);

    const title = document.createElement('h3');
    title.textContent = subtask.title;
    header.appendChild(title);

    // メモアイコン
    if (subtask.memo) {
        const memoIcon = document.createElement('span');
        memoIcon.className = 'memo-icon';
        memoIcon.textContent = '📝';
        memoIcon.addEventListener('click', () => {
            showMemo(subtask.memo);
        });
        header.appendChild(memoIcon);
    }

    subtaskItem.appendChild(header);

    // サブタスク詳細
    const details = document.createElement('div');
    details.className = 'task-details';

    if (subtask.dueDate) {
        const dueDate = document.createElement('div');
        dueDate.textContent = `期限日: ${formatDate(subtask.dueDate)}`;
        details.appendChild(dueDate);
    }

    subtaskItem.appendChild(details);

    // サブタスク操作ボタン
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.title = '編集';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => {
        currentEditingTaskId = parentTask.id;
        currentEditingSubtaskId = subtask.id;
        openSubtaskModal(subtask);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.title = '削除';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', () => {
        deleteSubtask(parentTask.id, subtask.id);
    });
    actions.appendChild(deleteBtn);

    subtaskItem.appendChild(actions);

    return subtaskItem;
}

// タスク追加・編集モーダルを開く
function openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    modal.style.display = 'block';

    const modalTitle = document.getElementById('modalTitle');
    const taskForm = document.getElementById('taskForm');

    if (task) {
        modalTitle.textContent = 'タスクを編集';
        taskForm.title.value = task.title;
        taskForm.dueDate.value = task.dueDate;
        taskForm.category.value = task.category;
        taskForm.priority.value = task.priority;
        taskForm.memo.value = task.memo;
        currentEditingTaskId = task.id;
    } else {
        modalTitle.textContent = 'タスクを追加';
        taskForm.reset();
        currentEditingTaskId = null;
    }
}

// サブタスク追加・編集モーダルを開く
function openSubtaskModal(subtask = null) {
    const modal = document.getElementById('subtaskModal');
    modal.style.display = 'block';

    const modalTitle = document.getElementById('subtaskModalTitle');
    const subtaskForm = document.getElementById('subtaskForm');

    if (subtask) {
        modalTitle.textContent = 'サブタスクを編集';
        subtaskForm.title.value = subtask.title;
        subtaskForm.dueDate.value = subtask.dueDate;
        subtaskForm.priority.value = subtask.priority;
        currentEditingSubtaskId = subtask.id;
    } else {
        modalTitle.textContent = 'サブタスクを追加';
        subtaskForm.reset();
        currentEditingSubtaskId = null;
    }
}

// タスク削除確認モーダルを開く
function openDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'block';
}

// メモモーダルを表示
function showMemo(memo) {
    const modal = document.getElementById('memoModal');
    const memoContent = document.getElementById('memoContent');
    memoContent.textContent = memo;
    modal.style.display = 'block';
}

// フィルターモーダルを開く
function openFilterModal() {
    const modal = document.getElementById('filterModal');
    modal.style.display = 'block';
}

// タスクの保存
function saveTask() {
    const taskForm = document.getElementById('taskForm');
    const title = taskForm.title.value.trim();
    if (!title) {
        alert('タスク内容を入力してください。');
        return;
    }

    const taskData = {
        id: currentEditingTaskId || generateId(),
        title: title,
        dueDate: taskForm.dueDate.value,
        category: taskForm.category.value,
        priority: taskForm.priority.value,
        memo: taskForm.memo.value,
        completed: false,
        subtasks: [],
        createdAt: currentEditingTaskId ? getTaskById(currentEditingTaskId).createdAt : Date.now()
    };

    if (currentEditingTaskId) {
        // 編集
        const index = tasks.findIndex(t => t.id === currentEditingTaskId);
        taskData.subtasks = tasks[index].subtasks;
        taskData.completed = tasks[index].completed;
        tasks[index] = taskData;
    } else {
        // 新規追加
        tasks.push(taskData);
    }

    saveData();
    renderTasks();
    closeAllModals();
}

// タスクの取得
function getTaskById(id) {
    return tasks.find(task => task.id === id);
}

// タスクの削除
function deleteTask() {
    tasks = tasks.filter(task => task.id !== deleteTargetId);
    saveData();
    renderTasks();
    closeAllModals();
}

// サブタスクの保存
function saveSubtask() {
    const subtaskForm = document.getElementById('subtaskForm');
    const title = subtaskForm.title.value.trim();
    if (!title) {
        alert('サブタスク内容を入力してください。');
        return;
    }

    const parentTask = getTaskById(currentEditingTaskId);

    const subtaskData = {
        id: currentEditingSubtaskId || generateId(),
        title: title,
        dueDate: subtaskForm.dueDate.value,
        priority: subtaskForm.priority.value,
        memo: '',
        completed: false,
        createdAt: currentEditingSubtaskId ? getSubtaskById(parentTask, currentEditingSubtaskId).createdAt : Date.now()
    };

    if (currentEditingSubtaskId) {
        // 編集
        const index = parentTask.subtasks.findIndex(st => st.id === currentEditingSubtaskId);
        subtaskData.completed = parentTask.subtasks[index].completed;
        parentTask.subtasks[index] = subtaskData;
    } else {
        // 新規追加
        parentTask.subtasks.push(subtaskData);
    }

    saveData();
    renderTasks();
    closeAllModals();
}

// サブタスクの取得
function getSubtaskById(parentTask, id) {
    return parentTask.subtasks.find(subtask => subtask.id === id);
}

// サブタスクの削除
function deleteSubtask(taskId, subtaskId) {
    const task = getTaskById(taskId);
    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    saveData();
    renderTasks();
}

// すべてのモーダルを閉じる
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// 日付のフォーマット
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('ja-JP', options);
}

// IDの生成
function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
}

// タスクの並び替え
function sortTasks(taskArray) {
    const sortOption = document.getElementById('sortOptions').value;
    switch (sortOption) {
        case 'dueDate_asc':
            return taskArray.sort((a, b) => new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31'));
        case 'dueDate_desc':
            return taskArray.sort((a, b) => new Date(b.dueDate || '9999-12-31') - new Date(a.dueDate || '9999-12-31'));
        case 'priority_high':
            return taskArray.sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority));
        case 'priority_low':
            return taskArray.sort((a, b) => priorityValue(a.priority) - priorityValue(b.priority));
        case 'category':
            return taskArray.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        case 'createdAt_new':
            return taskArray.sort((a, b) => b.createdAt - a.createdAt);
        case 'createdAt_old':
            return taskArray.sort((a, b) => a.createdAt - b.createdAt);
        default:
            return taskArray;
    }
}

// 重要度の値を返す
function priorityValue(priority) {
    switch (priority) {
        case 'high':
            return 3;
        case 'medium':
            return 2;
        case 'low':
            return 1;
        default:
            return 0;
    }
}

// タスクのフィルタリング
function filterTasks(taskArray) {
    const filterForm = document.getElementById('filterForm');
    const formData = new FormData(filterForm);
    const selectedCategories = formData.getAll('category');
    const selectedPriorities = formData.getAll('priority');

    return taskArray.filter(task => {
        const categoryMatch = selectedCategories.length ? selectedCategories.includes(task.category) : true;
        const priorityMatch = selectedPriorities.length ? selectedPriorities.includes(task.priority) : true;
        return categoryMatch && priorityMatch;
    });
}

// タスクの検索
function searchTasks(taskArray) {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) return taskArray;

    return taskArray.filter(task => {
        return (
            task.title.toLowerCase().includes(keyword) ||
            (task.memo && task.memo.toLowerCase().includes(keyword)) ||
            (task.category && task.category.toLowerCase().includes(keyword))
        );
    });
}

// ドラッグ＆ドロップ
let draggedTaskId = null;

function dragStart(e) {
    this.classList.add('dragging');
    draggedTaskId = this.dataset.id;
    e.dataTransfer.effectAllowed = "move";
}

function dragOver(e) {
    e.preventDefault();
    const draggingTask = document.querySelector('.dragging');
    if (draggingTask === this) return;
    const taskList = this.parentElement;
    taskList.insertBefore(draggingTask, this);
}

function drop() {
    this.classList.remove('dragging');
    updateTaskOrder();
}

function dragEnd() {
    this.classList.remove('dragging');
}

function updateTaskOrder() {
    const taskList = document.getElementById('taskList');
    const taskItems = taskList.querySelectorAll('.task-item');
    const newOrder = [];
    taskItems.forEach(item => {
        const task = getTaskById(item.dataset.id);
        newOrder.push(task);
    });
    tasks = newOrder.concat(tasks.filter(task => task.completed));
    saveData();
    renderTasks();
}

// データのエクスポート
function exportData() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'tasks.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

// データのインポート
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedTasks = JSON.parse(event.target.result);
            importedTasks.forEach(task => {
                task.id = generateId();
                task.subtasks.forEach(subtask => {
                    subtask.id = generateId();
                });
            });
            tasks = tasks.concat(importedTasks);
            saveData();
            renderTasks();
        } catch (error) {
            alert('無効なファイルです。');
        }
    };
    reader.readAsText(file);
}
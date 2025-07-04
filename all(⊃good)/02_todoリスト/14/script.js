// タスクデータの格納
let tasks = [];
let currentTaskId = null;
let currentSubtasks = [];
let categories = ['未分類'];

// DOM要素の取得
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const taskTitleInput = document.getElementById('task-title');
const taskDeadlineInput = document.getElementById('task-deadline');
const taskImportanceSelect = document.getElementById('task-importance');
const taskRepeatSelect = document.getElementById('task-repeat');
const taskCategorySelect = document.getElementById('task-category');
const addCategoryBtn = document.getElementById('add-category-btn');
const themeSelector = document.getElementById('theme');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');

// モーダル関連
const subtaskModal = document.getElementById('subtask-modal');
const memoModal = document.getElementById('memo-modal');
const categoryModal = document.getElementById('category-modal');
const closeSubtaskModalBtn = document.getElementById('close-subtask-modal');
const closeMemoModalBtn = document.getElementById('close-memo-modal');
const closeCategoryModalBtn = document.getElementById('close-category-modal');
const subtaskTitleInput = document.getElementById('subtask-title');
const addSubtaskBtn = document.getElementById('add-subtask-btn');
const subtaskList = document.getElementById('subtask-list');
const memoContent = document.getElementById('memo-content');
const saveMemoBtn = document.getElementById('save-memo-btn');
const newCategoryNameInput = document.getElementById('new-category-name');
const saveCategoryBtn = document.getElementById('save-category-btn');

// テーマ変更
themeSelector.addEventListener('change', () => {
    document.body.className = '';
    document.body.classList.add(`theme-${themeSelector.value}`);
});

// カテゴリセレクトボックスの更新
function updateCategorySelects() {
    taskCategorySelect.innerHTML = '';
    categoryFilter.innerHTML = '<option value="all">すべてのカテゴリ</option>';

    categories.forEach(category => {
        const option1 = document.createElement('option');
        option1.value = category;
        option1.textContent = category;
        taskCategorySelect.appendChild(option1);

        if (category !== '未分類') {
            const option2 = document.createElement('option');
            option2.value = category;
            option2.textContent = category;
            categoryFilter.appendChild(option2);
        }
    });
}
updateCategorySelects();

// カテゴリ追加モーダルを開く
addCategoryBtn.addEventListener('click', () => {
    newCategoryNameInput.value = '';
    categoryModal.style.display = 'block';
});

// カテゴリ追加
saveCategoryBtn.addEventListener('click', () => {
    const newCategory = newCategoryNameInput.value.trim();
    if (newCategory && !categories.includes(newCategory)) {
        categories.push(newCategory);
        updateCategorySelects();
    }
    categoryModal.style.display = 'none';
});

// カテゴリモーダルを閉じる
closeCategoryModalBtn.onclick = function() {
    categoryModal.style.display = 'none';
};

// タスク追加
addTaskBtn.addEventListener('click', addTask);

function addTask() {
    const title = taskTitleInput.value.trim();
    if (title === '') return;

    const task = {
        id: Date.now(),
        title: title,
        deadline: taskDeadlineInput.value || null,
        importance: taskImportanceSelect.value,
        category: taskCategorySelect.value,
        subtasks: [],
        memo: '',
        repeat: taskRepeatSelect.value,
        completed: false
    };
    tasks.push(task);
    taskTitleInput.value = '';
    taskDeadlineInput.value = '';
    renderTasks();
}

// タスクの描画
function renderTasks() {
    // カテゴリフィルタの適用
    let filteredTasks = tasks;
    if (categoryFilter.value !== 'all') {
        filteredTasks = tasks.filter(task => task.category === categoryFilter.value);
    }

    // ソート
    if (sortFilter.value === 'importance') {
        filteredTasks.sort((a, b) => importanceValue(b.importance) - importanceValue(a.importance));
    } else if (sortFilter.value === 'deadline') {
        filteredTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    taskList.innerHTML = '';
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.draggable = true;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-details">
                    <span>重要度: ${task.importance}</span>
                    <span>期限: ${task.deadline ? task.deadline : 'なし'}</span>
                    <span>繰り返し: ${task.repeat}</span>
                    <span>カテゴリ: ${task.category}</span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="openSubtaskModal(${task.id})">📋</button>
                <button onclick="openMemoModal(${task.id})">💬</button>
                <button onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        `;
        taskList.appendChild(li);
    });
    addDragEvents();
}

// 重要度の値取得
function importanceValue(importance) {
    switch (importance) {
        case '高':
            return 3;
        case '普通':
            return 2;
        case '低':
            return 1;
        default:
            return 0;
    }
}

// ドラッグ＆ドロップ
function addDragEvents() {
    const draggables = document.querySelectorAll('.task-item');
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            updateTaskOrder();
        });
    });

    taskList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            taskList.appendChild(draggable);
        } else {
            taskList.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return {offset: offset, element: child};
        } else {
            return closest;
        }
    }, {offset: Number.NEGATIVE_INFINITY}).element;
}

// タスク順序の更新
function updateTaskOrder() {
    const newTasks = [];
    document.querySelectorAll('.task-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        const task = tasks.find(t => t.id === id);
        newTasks.push(task);
    });
    tasks = newTasks;
}

// タスク削除
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    renderTasks();
}

// サブタスクモーダルを開く
function openSubtaskModal(id) {
    currentTaskId = id;
    const task = tasks.find(t => t.id === id);
    currentSubtasks = task.subtasks;
    renderSubtasks();
    subtaskModal.style.display = 'block';
}

// サブタスクの描画
function renderSubtasks() {
    subtaskList.innerHTML = '';
    currentSubtasks.forEach((subtask, index) => {
        const li = document.createElement('li');
        li.className = 'subtask-item';
        li.textContent = subtask;
        subtaskList.appendChild(li);
    });
}

// サブタスク追加
addSubtaskBtn.addEventListener('click', () => {
    const subtaskTitle = subtaskTitleInput.value.trim();
    if (subtaskTitle === '') return;
    currentSubtasks.push(subtaskTitle);
    subtaskTitleInput.value = '';
    renderSubtasks();
    const task = tasks.find(t => t.id === currentTaskId);
    task.subtasks = currentSubtasks;
});

// サブタスクモーダルを閉じる
closeSubtaskModalBtn.onclick = function() {
    subtaskModal.style.display = 'none';
};

// メモモーダルを開く
function openMemoModal(id) {
    currentTaskId = id;
    const task = tasks.find(t => t.id === id);
    memoContent.value = task.memo;
    memoModal.style.display = 'block';
}

// メモ保存
saveMemoBtn.addEventListener('click', () => {
    const task = tasks.find(t => t.id === currentTaskId);
    task.memo = memoContent.value;
    memoModal.style.display = 'none';
});

// メモモーダルを閉じる
closeMemoModalBtn.onclick = function() {
    memoModal.style.display = 'none';
};

// エクスポート
exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "tasks.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

// インポート
importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            tasks = JSON.parse(e.target.result);
            renderTasks();
        };
        reader.readAsText(file);
    };
    input.click();
});

// フィルターの適用
categoryFilter.addEventListener('change', renderTasks);
sortFilter.addEventListener('change', renderTasks);

// 背景をクリックしたときにモーダルを閉じる
window.onclick = function(event) {
    if (event.target == subtaskModal) {
        subtaskModal.style.display = "none";
    }
    if (event.target == memoModal) {
        memoModal.style.display = "none";
    }
    if (event.target == categoryModal) {
        categoryModal.style.display = "none";
    }
};

// 繰り返しタスクの処理（簡易実装）
function handleRepeatingTasks() {
    const today = new Date().toISOString().split('T')[0];
    tasks.forEach(task => {
        if (task.repeat !== 'なし' && task.completed) {
            let nextDate = new Date(task.deadline || today);
            if (task.repeat === '毎日') {
                nextDate.setDate(nextDate.getDate() + 1);
            } else if (task.repeat === '毎週') {
                nextDate.setDate(nextDate.getDate() + 7);
            } else if (task.repeat === '毎月') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            task.deadline = nextDate.toISOString().split('T')[0];
            task.completed = false;
        }
    });
    renderTasks();
}

// ページ読み込み時に繰り返しタスクを処理
window.onload = function() {
    handleRepeatingTasks();
    renderTasks();
};
// タスクデータの格納
let tasks = [];
let currentTaskId = null;

// DOM要素の取得
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const taskTitleInput = document.getElementById('task-title');
const themeSelector = document.getElementById('theme');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');

// モーダル関連
const subtaskModal = document.getElementById('subtask-modal');
const memoModal = document.getElementById('memo-modal');
const closeBtns = document.getElementsByClassName('close-btn');

// テーマ変更
themeSelector.addEventListener('change', () => {
    document.body.className = '';
    document.body.classList.add(`theme-${themeSelector.value}`);
});

// タスク追加
addTaskBtn.addEventListener('click', addTask);

function addTask() {
    const title = taskTitleInput.value.trim();
    if (title === '') return;

    const task = {
        id: Date.now(),
        title: title,
        priority: '中',
        deadline: null,
        importance: '普通',
        category: '未分類',
        subtasks: [],
        memo: '',
        repeat: false
    };
    tasks.push(task);
    taskTitleInput.value = '';
    renderTasks();
    updateCategoryFilter();
}

// タスクの描画
function renderTasks() {
    // ソート
    if (sortFilter.value === 'importance') {
        tasks.sort((a, b) => importanceValue(b.importance) - importanceValue(a.importance));
    } else if (sortFilter.value === 'deadline') {
        tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.draggable = true;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-details">
                    <span>優先度: ${task.priority}</span>
                    <span>重要度: ${task.importance}</span>
                    <span>期限: ${task.deadline ? task.deadline : 'なし'}</span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="openSubtaskModal(${task.id})">📝</button>
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
        case '中':
            return 2;
        case '低':
            return 1;
        default:
            return 0;
    }
}

// カテゴリフィルターの更新
function updateCategoryFilter() {
    const categories = [...new Set(tasks.map(task => task.category))];
    categoryFilter.innerHTML = '<option value="all">すべてのカテゴリ</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
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
    subtaskModal.style.display = 'block';
}

// メモモーダルを開く
function openMemoModal(id) {
    currentTaskId = id;
    const task = tasks.find(t => t.id === id);
    document.getElementById('memo-content').value = task.memo;
    memoModal.style.display = 'block';
}

// モーダルを閉じる
Array.from(closeBtns).forEach(btn => {
    btn.onclick = function() {
        subtaskModal.style.display = 'none';
        memoModal.style.display = 'none';
    };
});

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
            updateCategoryFilter();
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
};

// その他の機能（期限設定、繰り返しタスク等）は省略していますが、必要に応じて追加できます。
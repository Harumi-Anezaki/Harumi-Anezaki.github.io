// script.js

// 変数の定義
let tasks = [];
let categories = ['デフォルト'];
let selectedCategory = 'デフォルト';
let selectedTheme = 'light';

// 初期化関数
function init() {
    loadFromLocalStorage();
    renderCategories();
    renderTasks();
    applyTheme();
}

// ローカルストレージからデータを読み込む
function loadFromLocalStorage() {
    const savedTasks = JSON.parse(localStorage.getItem('tasks'));
    const savedCategories = JSON.parse(localStorage.getItem('categories'));
    const savedTheme = localStorage.getItem('selectedTheme');

    if (savedTasks) tasks = savedTasks;
    if (savedCategories) categories = savedCategories;
    if (savedTheme) selectedTheme = savedTheme;
}

// ローカルストレージにデータを保存する
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('selectedTheme', selectedTheme);
}

// カテゴリを描画する
function renderCategories() {
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';

    categories.forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        li.addEventListener('click', () => {
            selectedCategory = category;
            renderTasks();
        });
        categoryList.appendChild(li);
    });

    // タスク追加フォームのカテゴリ選択肢を更新
    const taskCategorySelect = document.getElementById('task-category');
    taskCategorySelect.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        taskCategorySelect.appendChild(option);
    });
}

// タスクを描画する
function renderTasks() {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    let filteredTasks = tasks;
    if (selectedCategory !== 'デフォルト') {
        filteredTasks = tasks.filter(task => task.category === selectedCategory);
    }

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-card';
        if (task.completed) li.classList.add('completed');

        // タスク情報
        const taskInfo = document.createElement('div');
        taskInfo.className = 'task-info';

        const taskName = document.createElement('h3');
        taskName.textContent = task.name;
        taskInfo.appendChild(taskName);

        // 期限日
        if (task.deadline) {
            const deadline = document.createElement('p');
            deadline.textContent = `期限日: ${task.deadline}`;
            taskInfo.appendChild(deadline);
        }

        // 優先度、重要度、カテゴリなどを追加表示可能

        li.appendChild(taskInfo);

        // タスク操作ボタン
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        // 完了・未完了の切り替えボタン
        const completeButton = document.createElement('button');
        completeButton.innerHTML = task.completed ? '未完了' : '完了';
        completeButton.addEventListener('click', () => {
            task.completed = !task.completed;
            saveToLocalStorage();
            renderTasks();
        });
        taskActions.appendChild(completeButton);

        // 編集ボタン
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.innerHTML = '編集';
        editButton.addEventListener('click', () => {
            openEditModal(task);
        });
        taskActions.appendChild(editButton);

        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '削除';
        deleteButton.addEventListener('click', () => {
            deleteTask(task);
        });
        taskActions.appendChild(deleteButton);

        li.appendChild(taskActions);

        taskList.appendChild(li);
    });
}

// タスクの追加
function addTask() {
    const taskNameInput = document.getElementById('task-name');
    const taskName = taskNameInput.value.trim();
    const errorMessage = document.getElementById('error-message');

    if (taskName === '') {
        errorMessage.textContent = 'タスク名を入力してください。';
        return;
    }

    const newTask = {
        id: Date.now(),
        name: taskName,
        deadline: document.getElementById('task-deadline').value,
        priority: document.getElementById('task-priority').value,
        importance: selectedImportance,
        category: document.getElementById('task-category').value,
        repeat: document.getElementById('task-repeat').value,
        completed: false,
        memo: '',
        subtasks: []
    };

    tasks.push(newTask);
    saveToLocalStorage();
    renderTasks();

    // フォームをリセット
    taskNameInput.value = '';
    document.getElementById('task-details').classList.add('hidden');
    errorMessage.textContent = '';
}

// タスクの編集モーダルを開く
function openEditModal(task) {
    // モーダルウィンドウを実装し、タスク情報を編集可能にする
}

// タスクの削除
function deleteTask(task) {
    tasks = tasks.filter(t => t.id !== task.id);
    saveToLocalStorage();
    renderTasks();
}

// テーマの切り替え
function toggleTheme() {
    selectedTheme = selectedTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveToLocalStorage();
}

// テーマを適用する
function applyTheme() {
    if (selectedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// イベントリスナーの設定
document.getElementById('add-task-button').addEventListener('click', addTask);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('toggle-details').addEventListener('click', () => {
    document.getElementById('task-details').classList.toggle('hidden');
});

// 重要度の星評価の処理
let selectedImportance = 0;
const stars = document.querySelectorAll('#task-importance .star');
stars.forEach(star => {
    star.addEventListener('click', () => {
        selectedImportance = parseInt(star.dataset.value);
        updateStarDisplay();
    });
});

function updateStarDisplay() {
    stars.forEach(star => {
        if (parseInt(star.dataset.value) <= selectedImportance) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// 初期化の実行
init();
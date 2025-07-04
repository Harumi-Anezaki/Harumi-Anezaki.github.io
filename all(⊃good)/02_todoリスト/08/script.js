document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const categoryInput = document.getElementById('category-input');
    const prioritySelect = document.getElementById('priority-select');
    const dueDateInput = document.getElementById('due-date-input');
    const notesInput = document.getElementById('notes-input');
    const todoList = document.getElementById('todo-list');
    const exportBtn = document.getElementById('export-btn');
    const importInput = document.getElementById('import-input');
    const themeSelect = document.getElementById('theme-select');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editTodoInput = document.getElementById('edit-todo-input');
    const editCategoryInput = document.getElementById('edit-category-input');
    const editPrioritySelect = document.getElementById('edit-priority-select');
    const editDueDateInput = document.getElementById('edit-due-date-input');
    const editNotesInput = document.getElementById('edit-notes-input');
    const closeEditBtn = document.querySelector('.close-btn');

    // サブタスク関連要素
    const subtaskModal = document.getElementById('subtask-modal');
    const subtaskForm = document.getElementById('subtask-form');
    const subtaskInput = document.getElementById('subtask-input');
    const subtaskList = document.getElementById('subtask-list');
    const closeSubtaskBtn = document.querySelector('.subtask-close-btn');

    let currentTaskId = null;

    // テーマ切り替え
    themeSelect.addEventListener('change', () => {
        document.body.className = themeSelect.value;
    });

    // タスクリストのドラッグ＆ドロップ並べ替え
    new Sortable(todoList, {
        animation: 150,
        onEnd: function (/**Event*/evt) {
            saveTasks();
        },
    });

    // 既存のタスクをロード
    loadTasks();

    // タスク追加
    todoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const task = createTaskObject();
        addTodoItem(task);
        saveTasks();
        todoForm.reset();
    });

    // タスクオブジェクト作成
    function createTaskObject() {
        return {
            id: Date.now(),
            title: todoInput.value,
            category: categoryInput.value,
            priority: prioritySelect.value,
            dueDate: dueDateInput.value,
            notes: notesInput.value,
            completed: false,
            subtasks: [],
            repeat: false,
        };
    }

    // タスクリストに追加
    function addTodoItem(task) {
        const li = document.createElement('li');
        li.classList.add('todo-item', task.priority);
        li.dataset.id = task.id;

        const header = document.createElement('div');
        header.classList.add('todo-header');

        const title = document.createElement('div');
        title.classList.add('todo-title');
        title.textContent = task.title;
        if (task.completed) {
            li.classList.add('completed');
        }
        title.addEventListener('click', () => {
            li.classList.toggle('completed');
            task.completed = !task.completed;
            saveTasks();
        });

        const category = document.createElement('div');
        category.classList.add('todo-category');
        category.textContent = task.category;

        const dueDate = document.createElement('div');
        dueDate.classList.add('todo-due-date');
        dueDate.textContent = task.dueDate ? `期限: ${task.dueDate}` : '';

        header.appendChild(title);
        header.appendChild(category);
        header.appendChild(dueDate);

        const notes = document.createElement('div');
        notes.classList.add('todo-notes');
        notes.textContent = task.notes;

        const actions = document.createElement('div');
        actions.classList.add('todo-actions');

        const subtaskBtn = document.createElement('button');
        subtaskBtn.innerHTML = '<i class="fas fa-tasks"></i>';
        subtaskBtn.title = 'サブタスク管理';
        subtaskBtn.addEventListener('click', () => {
            openSubtaskModal(task);
        });

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = '編集';
        editBtn.addEventListener('click', () => {
            openEditModal(task);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', () => {
            todoList.removeChild(li);
            removeTask(task.id);
        });

        actions.appendChild(subtaskBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(header);
        if (task.notes) {
            li.appendChild(notes);
        }
        li.appendChild(actions);

        todoList.appendChild(li);
    }

    // タスクを保存
    function saveTasks() {
        const tasks = [];
        todoList.querySelectorAll('.todo-item').forEach((li) => {
            const taskId = li.dataset.id;
            const task = getTaskById(taskId);
            tasks.push(task);
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // タスクをロード
    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach((task) => {
            addTodoItem(task);
        });
    }

    // タスクIDからタスクを取得
    function getTaskById(id) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        return tasks.find((task) => task.id == id);
    }

    // タスクを削除
    function removeTask(id) {
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks = tasks.filter((task) => task.id != id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // タスク編集モーダル表示
    function openEditModal(task) {
        currentTaskId = task.id;
        editTodoInput.value = task.title;
        editCategoryInput.value = task.category;
        editPrioritySelect.value = task.priority;
        editDueDateInput.value = task.dueDate;
        editNotesInput.value = task.notes;
        editModal.style.display = 'block';
    }

    // タスク編集モーダル閉じる
    closeEditBtn.onclick = function () {
        editModal.style.display = 'none';
    }

    // タスク編集フォーム送信
    editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find((t) => t.id == currentTaskId);
        task.title = editTodoInput.value;
        task.category = editCategoryInput.value;
        task.priority = editPrioritySelect.value;
        task.dueDate = editDueDateInput.value;
        task.notes = editNotesInput.value;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        todoList.innerHTML = '';
        tasks.forEach((task) => {
            addTodoItem(task);
        });
        editModal.style.display = 'none';
    });

    // モーダル外クリックで閉じる
    window.onclick = function (event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
        if (event.target == subtaskModal) {
            subtaskModal.style.display = 'none';
        }
    }

    // タスクのエクスポート
    exportBtn.addEventListener('click', exportTasks);
    function exportTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "tasks.json");
        dlAnchorElem.click();
    }

    // タスクのインポート
    importInput.addEventListener('change', importTasks);
    function importTasks(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const tasks = JSON.parse(e.target.result);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            todoList.innerHTML = '';
            tasks.forEach((task) => {
                addTodoItem(task);
            });
        };
        reader.readAsText(file);
    }

    // サブタスクモーダル表示
    function openSubtaskModal(task) {
        currentTaskId = task.id;
        subtaskList.innerHTML = '';
        task.subtasks.forEach((subtask) => {
            addSubtaskItem(subtask, task);
        });
        subtaskModal.style.display = 'block';
    }

    // サブタスクモーダル閉じる
    closeSubtaskBtn.onclick = function () {
        subtaskModal.style.display = 'none';
    }

    // サブタスク追加
    subtaskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find((t) => t.id == currentTaskId);
        const subtask = {
            id: Date.now(),
            title: subtaskInput.value,
            completed: false,
        };
        task.subtasks.push(subtask);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        addSubtaskItem(subtask, task);
        subtaskForm.reset();
    });

    // サブタスク項目追加
    function addSubtaskItem(subtask, task) {
        const li = document.createElement('li');
        li.classList.add('subtask-item');
        li.dataset.id = subtask.id;

        const title = document.createElement('div');
        title.classList.add('subtask-title');
        title.textContent = subtask.title;
        if (subtask.completed) {
            li.classList.add('subtask-completed');
        }
        title.addEventListener('click', () => {
            li.classList.toggle('subtask-completed');
            subtask.completed = !subtask.completed;
            saveTasks();
        });

        const actions = document.createElement('div');
        actions.classList.add('subtask-actions');

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = '編集';
        editBtn.addEventListener('click', () => {
            editSubtask(subtask, task);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', () => {
            subtaskList.removeChild(li);
            task.subtasks = task.subtasks.filter((s) => s.id != subtask.id);
            saveTasks();
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(title);
        li.appendChild(actions);

        subtaskList.appendChild(li);
    }

    // サブタスク編集
    function editSubtask(subtask, task) {
        const newTitle = prompt('サブタスクを編集', subtask.title);
        if (newTitle !== null && newTitle.trim() !== '') {
            subtask.title = newTitle.trim();
            saveTasks();
            subtaskList.innerHTML = '';
            task.subtasks.forEach((subtask) => {
                addSubtaskItem(subtask, task);
            });
        }
    }
});
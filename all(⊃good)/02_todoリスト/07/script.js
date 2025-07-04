document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const categoryInput = document.getElementById('category-input');
    const prioritySelect = document.getElementById('priority-select');
    const dueDateInput = document.getElementById('due-date-input');
    const notesInput = document.getElementById('notes-input');
    const attachmentInput = document.getElementById('attachment-input');
    const todoList = document.getElementById('todo-list');
    const exportBtn = document.getElementById('export-btn');
    const importInput = document.getElementById('import-input');
    const themeSelect = document.getElementById('theme-select');

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

    todoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const task = createTaskObject();
        addTodoItem(task);
        saveTasks();
        todoForm.reset();
    });

    exportBtn.addEventListener('click', exportTasks);
    importInput.addEventListener('change', importTasks);

    function createTaskObject() {
        return {
            id: Date.now(),
            title: todoInput.value,
            category: categoryInput.value,
            priority: prioritySelect.value,
            dueDate: dueDateInput.value,
            notes: notesInput.value,
            attachment: attachmentInput.files[0] ? attachmentInput.files[0].name : null,
            completed: false,
            subtasks: [],
            repeat: false,
        };
    }

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
        subtaskBtn.title = 'サブタスク';
        subtaskBtn.addEventListener('click', () => {
            openSubtaskModal(task, li);
        });

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = '編集';
        editBtn.addEventListener('click', () => {
            editTask(task, li);
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

    function saveTasks() {
        const tasks = [];
        todoList.querySelectorAll('.todo-item').forEach((li) => {
            const taskId = li.dataset.id;
            const task = getTaskById(taskId);
            tasks.push(task);
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach((task) => {
            addTodoItem(task);
        });
    }

    function getTaskById(id) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        return tasks.find((task) => task.id == id);
    }

    function removeTask(id) {
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks = tasks.filter((task) => task.id != id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function editTask(task, li) {
        // 編集モードの実装（省略可能）
        alert('編集機能は現在実装されていません。');
    }

    function exportTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "tasks.json");
        dlAnchorElem.click();
    }

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

    // サブタスク機能
    const subtaskModal = document.getElementById('subtask-modal');
    const subtaskForm = document.getElementById('subtask-form');
    const subtaskInput = document.getElementById('subtask-input');
    const subtaskList = document.getElementById('subtask-list');
    const closeBtn = document.querySelector('.close-btn');
    let currentTask = null;

    function openSubtaskModal(task, li) {
        currentTask = task;
        subtaskList.innerHTML = '';
        task.subtasks.forEach((subtask) => {
            addSubtaskItem(subtask);
        });
        subtaskModal.style.display = 'block';
    }

    closeBtn.onclick = function () {
        subtaskModal.style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target == subtaskModal) {
            subtaskModal.style.display = 'none';
        }
    };

    subtaskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const subtask = {
            id: Date.now(),
            title: subtaskInput.value,
            completed: false,
        };
        currentTask.subtasks.push(subtask);
        addSubtaskItem(subtask);
        saveTasks();
        subtaskForm.reset();
    });

    function addSubtaskItem(subtask) {
        const li = document.createElement('li');
        li.textContent = subtask.title;
        li.addEventListener('click', () => {
            li.classList.toggle('completed');
            subtask.completed = !subtask.completed;
            saveTasks();
        });
        subtaskList.appendChild(li);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');

    // タスクを保存する配列
    let todos = [];

    // ローカルストレージからタスクを読み込む
    loadTodos();

    // フォーム送信イベント
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const todoText = todoInput.value.trim();
        if (todoText !== '') {
            addTodo(todoText);
            todoInput.value = '';
            saveTodos();
        }
    });

    // タスクを追加する関数
    function addTodo(text) {
        const todo = {
            id: Date.now(),
            text,
            completed: false
        };
        todos.push(todo);
        renderTodo(todo);
    }

    // タスクを表示する関数
    function renderTodo(todo) {
        const li = document.createElement('li');
        li.setAttribute('data-id', todo.id);
        if (todo.completed) {
            li.classList.add('completed');
        }

        const span = document.createElement('span');
        span.classList.add('todo-text');
        span.textContent = todo.text;

        const actions = document.createElement('div');
        actions.classList.add('todo-actions');

        const completeBtn = document.createElement('button');
        completeBtn.classList.add('complete');
        completeBtn.innerHTML = '✔';

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete');
        deleteBtn.innerHTML = '✖';

        actions.appendChild(completeBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(span);
        li.appendChild(actions);
        todoList.appendChild(li);
    }

    // タスクリストを再描画する関数
    function renderTodos() {
        todoList.innerHTML = '';
        todos.forEach(todo => {
            renderTodo(todo);
        });
    }

    // タスクの完了・削除操作
    todoList.addEventListener('click', (e) => {
        if (e.target.classList.contains('complete')) {
            const id = e.target.closest('li').getAttribute('data-id');
            toggleComplete(id);
        }

        if (e.target.classList.contains('delete')) {
            const id = e.target.closest('li').getAttribute('data-id');
            deleteTodo(id);
        }
    });

    // タスクの完了状態を切り替える関数
    function toggleComplete(id) {
        todos = todos.map(todo => {
            if (todo.id == id) {
                todo.completed = !todo.completed;
            }
            return todo;
        });
        saveTodos();
        renderTodos();
    }

    // タスクを削除する関数
    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id != id);
        saveTodos();
        renderTodos();
    }

    // ローカルストレージにタスクを保存する関数
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // ローカルストレージからタスクを読み込む関数
    function loadTodos() {
        const storedTodos = localStorage.getItem('todos');
        if (storedTodos) {
            todos = JSON.parse(storedTodos);
            renderTodos();
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoDate = document.getElementById('todo-date');
    const todoPriority = document.getElementById('todo-priority');
    const todoCategory = document.getElementById('todo-category');
    const todoList = document.getElementById('todo-list');
    const completedList = document.getElementById('completed-list');
    const searchInput = document.getElementById('search-input');
    const toggleThemeButton = document.getElementById('toggle-theme');
    const exportButton = document.getElementById('export-todos');
    const importButton = document.getElementById('import-todos');
    const importFileInput = document.getElementById('import-file');

    // タスクを保存する配列
    let todos = [];
    let darkMode = false;

    // ローカルストレージからタスクを読み込む
    loadTodos();
    loadTheme();

    // フォーム送信イベント
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const todoText = todoInput.value.trim();
        const dueDate = todoDate.value;
        const priority = todoPriority.value;
        const category = todoCategory.value.trim();
        if (todoText !== '' && dueDate !== '') {
            addTodo(todoText, dueDate, priority, category);
            todoInput.value = '';
            todoDate.value = '';
            todoCategory.value = '';
            saveTodos();
        }
    });

    // タスクを追加する関数
    function addTodo(text, dueDate, priority, category) {
        const todo = {
            id: Date.now(),
            text,
            dueDate,
            priority,
            category,
            completed: false
        };
        todos.push(todo);
        renderTodos();
    }

    // タスクを表示する関数
    function renderTodos() {
        // リストをクリア
        todoList.innerHTML = '';
        completedList.innerHTML = '';

        // 期限切れをチェックするための今日の日付
        const today = new Date().toISOString().split('T')[0];

        // タスクを表示
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.setAttribute('data-id', todo.id);
            li.classList.add('todo-item');
            li.setAttribute('draggable', true);

            if (todo.completed) {
                li.classList.add('completed');
                li.classList.add('completed-item');
            }

            const textSpan = document.createElement('p');
            textSpan.classList.add('todo-text');
            textSpan.textContent = todo.text;

            const metaDiv = document.createElement('div');
            metaDiv.classList.add('todo-meta');
            metaDiv.innerHTML = `
                期限: ${todo.dueDate} | 優先度: ${todo.priority} | カテゴリー: ${todo.category}
            `;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('todo-actions');

            const editBtn = document.createElement('button');
            editBtn.classList.add('edit');
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';

            const completeBtn = document.createElement('button');
            completeBtn.classList.add('complete');
            completeBtn.innerHTML = '<i class="fas fa-check"></i>';

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(completeBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(textSpan);
            li.appendChild(metaDiv);
            li.appendChild(actionsDiv);

            // 期限切れ通知
            if (todo.dueDate < today && !todo.completed) {
                alert(`タスク「${todo.text}」の期限が過ぎています！`);
            }

            if (todo.completed) {
                completedList.appendChild(li);
            } else {
                todoList.appendChild(li);
            }

            // ドラッグ＆ドロップのイベント
            li.addEventListener('dragstart', dragStart);
            li.addEventListener('dragover', dragOver);
            li.addEventListener('drop', drop);
            li.addEventListener('dragend', dragEnd);
        });
    }

    // タスクの完了・削除・編集操作
    document.addEventListener('click', (e) => {
        if (e.target.closest('.complete')) {
            const id = e.target.closest('li').getAttribute('data-id');
            toggleComplete(id);
        }

        if (e.target.closest('.delete')) {
            const id = e.target.closest('li').getAttribute('data-id');
            deleteTodo(id);
        }

        if (e.target.closest('.edit')) {
            const id = e.target.closest('li').getAttribute('data-id');
            editTodo(id);
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

    // タスクを編集する関数
    function editTodo(id) {
        const todo = todos.find(todo => todo.id == id);
        // フォームに既存のデータを入力
        todoInput.value = todo.text;
        todoDate.value = todo.dueDate;
        todoPriority.value = todo.priority;
        todoCategory.value = todo.category;

        // 既存のタスクを削除
        deleteTodo(id);
    }

    // 検索機能
    searchInput.addEventListener('input', () => {
        const searchText = searchInput.value.toLowerCase();
        document.querySelectorAll('.todo-item').forEach(item => {
            const text = item.querySelector('.todo-text').textContent.toLowerCase();
            if (text.includes(searchText)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // ダークモードの切り替え
    toggleThemeButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        darkMode = document.body.classList.contains('dark-mode');
        saveTheme();
    });

    function loadTheme() {
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-mode');
            darkMode = true;
        } else {
            document.body.classList.remove('dark-mode');
            darkMode = false;
        }
    }

    function saveTheme() {
        localStorage.setItem('darkMode', darkMode);
    }

    // ドラッグ＆ドロップによるタスクの順序変更
    let draggedItem = null;

    function dragStart(e) {
        draggedItem = this;
        setTimeout(() => {
            this.style.display = 'none';
        }, 0);
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        if (this.parentNode === draggedItem.parentNode) {
            const items = Array.from(this.parentNode.children);
            const draggedIndex = items.indexOf(draggedItem);
            const droppedIndex = items.indexOf(this);

            if (draggedIndex < droppedIndex) {
                this.parentNode.insertBefore(draggedItem, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedItem, this);
            }

            // タスク配列の順序を更新
            updateTodosOrder();
        }
    }

    function dragEnd() {
        this.style.display = '';
        draggedItem = null;
    }

    function updateTodosOrder() {
        const items = document.querySelectorAll('#todo-list .todo-item');
        const newOrderIds = Array.from(items).map(item => item.getAttribute('data-id'));
        todos.sort((a, b) => {
            return newOrderIds.indexOf(a.id.toString()) - newOrderIds.indexOf(b.id.toString());
        });
        saveTodos();
    }

    // データのエクスポート
    exportButton.addEventListener('click', () => {
        const dataStr = JSON.stringify(todos);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'todos.json';
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    // データのインポート
    importButton.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', () => {
        const file = importFileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedTodos = JSON.parse(e.target.result);
                    if (Array.isArray(importedTodos)) {
                        todos = importedTodos;
                        saveTodos();
                        renderTodos();
                    } else {
                        alert('無効なファイル形式です。');
                    }
                } catch(err) {
                    alert('ファイルの読み込みに失敗しました。');
                }
            }
            reader.readAsText(file);
        }
    });

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
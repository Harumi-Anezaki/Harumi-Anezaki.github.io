document.addEventListener('DOMContentLoaded', () => {
  const todoForm = document.getElementById('todo-form');
  const todoInput = document.getElementById('todo-input');
  const todoDate = document.getElementById('todo-date');
  const todoPriority = document.getElementById('todo-priority');
  const todoCategory = document.getElementById('todo-category');
  const todoList = document.getElementById('todo-list');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const filterStatus = document.getElementById('filter-status');
  const themeSelect = document.getElementById('theme-select');
  const statsTotal = document.getElementById('total-tasks');
  const statsCompleted = document.getElementById('completed-tasks');
  const statsPending = document.getElementById('pending-tasks');
  const exportButton = document.getElementById('export-todos');
  const importButton = document.getElementById('import-todos');
  const importFileInput = document.getElementById('import-file');

  // タスクを保存する配列
  let todos = [];
  let currentTheme = 'default';

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
    if (todoText !== '') {
      addTodo(todoText, dueDate, priority, category);
      todoForm.reset();
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
      completed: false,
      createdAt: Date.now(),
      subtasks: []
    };
    todos.push(todo);
    renderTodos();
  }

  // タスクを表示する関数
  function renderTodos() {
    // リストをクリア
    todoList.innerHTML = '';

    // ソート
    todos.sort((a, b) => {
      const sortBy = sortSelect.value;
      if (sortBy === 'createdAt') {
        return a.createdAt - b.createdAt;
      } else if (sortBy === 'dueDate') {
        return new Date(a.dueDate || Infinity) - new Date(b.dueDate || Infinity);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    });

    // フィルター
    const statusFilter = filterStatus.value;

    // タスクを表示
    todos.forEach(todo => {
      if (statusFilter === 'completed' && !todo.completed) return;
      if (statusFilter === 'pending' && todo.completed) return;

      const li = document.createElement('li');
      li.setAttribute('data-id', todo.id);
      li.classList.add('todo-item');
      li.setAttribute('draggable', true);

      if (todo.completed) {
        li.classList.add('completed');
      }

      const header = document.createElement('div');
      header.classList.add('todo-header');

      const text = document.createElement('h3');
      text.classList.add('todo-text');
      text.textContent = todo.text;
      if (todo.completed) {
        text.style.textDecoration = 'line-through';
      }

      const actions = document.createElement('div');
      actions.classList.add('todo-actions');

      const subtaskButton = document.createElement('button');
      subtaskButton.innerHTML = '<i class="fas fa-tasks"></i>';

      const editButton = document.createElement('button');
      editButton.innerHTML = '<i class="fas fa-edit"></i>';

      const completeButton = document.createElement('button');
      completeButton.innerHTML = '<i class="fas fa-check"></i>';

      const deleteButton = document.createElement('button');
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

      actions.appendChild(subtaskButton);
      actions.appendChild(editButton);
      actions.appendChild(completeButton);
      actions.appendChild(deleteButton);

      header.appendChild(text);
      header.appendChild(actions);

      const meta = document.createElement('div');
      meta.classList.add('todo-meta');
      meta.innerHTML = `
        期限: ${todo.dueDate || 'なし'} | 優先度: ${todo.priority} | カテゴリー: ${todo.category || 'なし'}
      `;

      li.appendChild(header);
      li.appendChild(meta);

      // サブタスクの表示
      if (todo.subtasks.length > 0) {
        const subtaskDiv = document.createElement('div');
        subtaskDiv.classList.add('subtasks');
        const subtaskUl = document.createElement('ul');
        todo.subtasks.forEach((subtask, index) => {
          const subtaskLi = document.createElement('li');
          const subtaskCheckbox = document.createElement('input');
          subtaskCheckbox.type = 'checkbox';
          subtaskCheckbox.checked = subtask.completed;
          subtaskCheckbox.addEventListener('change', () => {
            subtask.completed = subtaskCheckbox.checked;
            saveTodos();
          });
          const subtaskText = document.createElement('span');
          subtaskText.textContent = subtask.text;
          const subtaskDeleteBtn = document.createElement('button');
          subtaskDeleteBtn.textContent = '削除';
          subtaskDeleteBtn.addEventListener('click', () => {
            todo.subtasks.splice(index, 1);
            saveTodos();
            renderTodos();
          });
          subtaskLi.appendChild(subtaskCheckbox);
          subtaskLi.appendChild(subtaskText);
          subtaskLi.appendChild(subtaskDeleteBtn);
          subtaskUl.appendChild(subtaskLi);
        });
        subtaskDiv.appendChild(subtaskUl);
        li.appendChild(subtaskDiv);
      }

      // タスクのイベント
      subtaskButton.addEventListener('click', () => addSubtask(todo.id));
      editButton.addEventListener('click', () => editTodo(todo.id));
      completeButton.addEventListener('click', () => toggleComplete(todo.id));
      deleteButton.addEventListener('click', () => deleteTodo(todo.id));

      // ドラッグ＆ドロップイベント
      li.addEventListener('dragstart', dragStart);
      li.addEventListener('dragover', dragOver);
      li.addEventListener('drop', drop);
      li.addEventListener('dragend', dragEnd);

      todoList.appendChild(li);
    });

    updateStats();
  }

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

  // サブタスクを追加する関数
  function addSubtask(id) {
    const subtaskText = prompt('サブタスクを入力してください:');
    if (subtaskText) {
      todos = todos.map(todo => {
        if (todo.id == id) {
          todo.subtasks.push({ text: subtaskText, completed: false });
        }
        return todo;
      });
      saveTodos();
      renderTodos();
    }
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

  // ソート・フィルターの変更
  sortSelect.addEventListener('change', renderTodos);
  filterStatus.addEventListener('change', renderTodos);

  // テーマの変更
  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    document.body.className = currentTheme;
    saveTheme();
  });

  // テーマをロード
  function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    currentTheme = savedTheme;
    themeSelect.value = savedTheme;
    document.body.className = savedTheme;
  }

  // テーマを保存
  function saveTheme() {
    localStorage.setItem('theme', currentTheme);
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

  // キーボードショートカット
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      todoForm.requestSubmit();
    }
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
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

  // タスクの統計情報を更新する関数
  function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;

    statsTotal.textContent = total;
    statsCompleted.textContent = completed;
    statsPending.textContent = pending;
  }
});
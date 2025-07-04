document.addEventListener('DOMContentLoaded', () => {
  // タスク配列
  let tasks = [];

  // 要素の取得
  const taskTitleInput = document.getElementById('task-title');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  const themeSelector = document.getElementById('theme-selector');
  const categorySelector = document.getElementById('category-selector');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const fileInput = document.getElementById('file-input');

  // モーダル関連
  const taskModal = document.getElementById('task-modal');
  const closeModalBtn = document.querySelector('.close');
  const modalTaskTitle = document.getElementById('modal-task-title');
  const modalDueDate = document.getElementById('modal-due-date');
  const modalPriority = document.getElementById('modal-priority');
  const modalCategory = document.getElementById('modal-category');
  const modalRepeat = document.getElementById('modal-repeat');
  const modalNotes = document.getElementById('modal-notes');
  const subtaskInput = document.getElementById('subtask-input');
  const addSubtaskBtn = document.getElementById('add-subtask-btn');
  const subtaskList = document.getElementById('subtask-list');
  const saveTaskBtn = document.getElementById('save-task-btn');

  let currentEditTaskId = null;

  // テーマ変更
  themeSelector.addEventListener('change', () => {
    document.body.className = '';
    document.body.classList.add(themeSelector.value);
  });

  // タスク追加
  addTaskBtn.addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    if (title) {
      const newTask = {
        id: Date.now(),
        title: title,
        dueDate: null,
        priority: '中',
        category: 'その他',
        repeat: 'なし',
        notes: '',
        subtasks: [],
      };
      tasks.push(newTask);
      renderTasks();
      taskTitleInput.value = '';
    }
  });

  // タスクのレンダリング
  function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = tasks.filter(task => {
      if (categorySelector.value === 'all') return true;
      return task.category === categorySelector.value;
    });

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.setAttribute('draggable', true);
      li.dataset.id = task.id;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'task-title';
      titleSpan.textContent = task.title;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', () => openTaskModal(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(titleSpan);
      li.appendChild(actionsDiv);

      taskList.appendChild(li);
    });

    // ドラッグ＆ドロップ
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
      item.addEventListener('dragstart', dragStart);
      item.addEventListener('dragover', dragOver);
      item.addEventListener('drop', drop);
      item.addEventListener('dragend', dragEnd);
    });
  }

  // タスク削除
  function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    renderTasks();
  }

  // タスク編集モーダルを開く
  function openTaskModal(id) {
    currentEditTaskId = id;
    const task = tasks.find(t => t.id === id);
    if (task) {
      modalTaskTitle.value = task.title;
      modalDueDate.value = task.dueDate || '';
      modalPriority.value = task.priority;
      modalCategory.value = task.category;
      modalRepeat.value = task.repeat;
      modalNotes.value = task.notes;
      // サブタスクの表示
      subtaskList.innerHTML = '';
      task.subtasks.forEach(subtask => {
        const li = document.createElement('li');
        li.textContent = subtask;
        subtaskList.appendChild(li);
      });
      taskModal.style.display = 'flex';
    }
  }

  // モーダルを閉じる
  closeModalBtn.addEventListener('click', () => {
    taskModal.style.display = 'none';
  });

  // モーダル外をクリックで閉じる
  window.addEventListener('click', (e) => {
    if (e.target == taskModal) {
      taskModal.style.display = 'none';
    }
  });

  // サブタスク追加
  addSubtaskBtn.addEventListener('click', () => {
    const subtaskTitle = subtaskInput.value.trim();
    if (subtaskTitle) {
      const li = document.createElement('li');
      li.textContent = subtaskTitle;
      subtaskList.appendChild(li);
      subtaskInput.value = '';
    }
  });

  // タスク保存
  saveTaskBtn.addEventListener('click', () => {
    const task = tasks.find(t => t.id === currentEditTaskId);
    if (task) {
      task.title = modalTaskTitle.value;
      task.dueDate = modalDueDate.value;
      task.priority = modalPriority.value;
      task.category = modalCategory.value;
      task.repeat = modalRepeat.value;
      task.notes = modalNotes.value;
      task.subtasks = [];
      subtaskList.querySelectorAll('li').forEach(li => {
        task.subtasks.push(li.textContent);
      });
      renderTasks();
      taskModal.style.display = 'none';
    }
  });

  // エクスポート
  exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(tasks);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // インポート
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        tasks = JSON.parse(e.target.result);
        renderTasks();
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  });

  // ドラッグ＆ドロップ機能
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

  function drop() {
    this.style.display = 'block';
    this.parentNode.insertBefore(draggedItem, this.nextSibling);
    updateTaskOrder();
  }

  function dragEnd() {
    this.style.display = 'block';
  }

  function updateTaskOrder() {
    const newTasks = [];
    taskList.querySelectorAll('.task-item').forEach(item => {
      const id = parseInt(item.dataset.id);
      const task = tasks.find(t => t.id === id);
      if (task) newTasks.push(task);
    });
    tasks = newTasks;
  }

  // 初期レンダリング
  renderTasks();
});
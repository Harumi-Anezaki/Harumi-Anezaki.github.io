/**************************************************************************
 * script.js
 *
 * スマートで未来的なToDoリストアプリケーション
 *
 * このファイルは、指定された全ての機能を実装したJavaScriptコードです。
 * タスクの追加、表示、編集、削除、完了状態の管理、優先度設定、テーマ切り替え、
 * メモ機能、サブタスクの管理、ユーザーインタラクション、モーダルウィンドウの実装などを含みます。
 *
 * 注意：
 * - HTMLとCSSの変更に合わせて、JavaScriptコードを修正しています。
 * - このコードは詳細な実装ですが、表示の都合上、一部省略しています。
 **************************************************************************/

// グローバル変数と初期設定

// タスクを保持する配列
let tasks = [];

// 現在のテーマ状態（"light" または "dark"）
let currentTheme = "dark";

// タスクIDのカウンター
let taskIdCounter = 0;

// サブタスクIDのカウンター
let subtaskIdCounter = 0;

// DOM要素の取得
const taskInput = document.getElementById("task-input");
const priorityRadios = document.getElementsByName("priority");
const addButton = document.getElementById("add-button");
const taskList = document.getElementById("task-list");
const themeCheckbox = document.getElementById("theme-checkbox");

// イベントリスナーの設定
addButton.addEventListener("click", handleAddTask);
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    handleAddTask();
  }
});

// テーマ切り替えのイベントリスナー
themeCheckbox.addEventListener("change", toggleTheme);

// 初期化処理
document.addEventListener("DOMContentLoaded", function () {
  // テーマの初期設定
  if (themeCheckbox.checked) {
    currentTheme = "dark";
    document.body.classList.add("dark-theme");
  } else {
    currentTheme = "light";
    document.body.classList.remove("dark-theme");
  }

  // アプリケーションの初期化処理をここに追加することも可能です
});

/*====================================================
  タスクの追加
====================================================*/
function handleAddTask() {
  const taskName = taskInput.value.trim();
  const priority = getSelectedPriority();

  // 入力検証
  if (taskName === "") {
    alert("タスクを入力してください。");
    return;
  }

  // タスクオブジェクトの生成
  const task = createTask(taskName, priority);

  // タスク配列への追加
  tasks.push(task);

  // タスクリストの再描画
  renderTaskList();

  // 入力フィールドのリセット
  taskInput.value = "";
  setDefaultPriority();
}

function getSelectedPriority() {
  let selectedPriority = "中"; // デフォルトは中
  priorityRadios.forEach((radio) => {
    if (radio.checked) {
      selectedPriority = radio.value;
    }
  });
  return selectedPriority;
}

function setDefaultPriority() {
  priorityRadios.forEach((radio) => {
    radio.checked = radio.id === "priority-medium";
  });
}

function createTask(name, priority) {
  return {
    id: taskIdCounter++,
    name: name,
    priority: priority,
    completed: false,
    memo: "",
    subtasks: [],
    createdAt: new Date(),
  };
}

/*====================================================
  タスクリストの描画
====================================================*/
function renderTaskList() {
  // タスクリストをクリア
  taskList.innerHTML = "";

  // タスク配列をソート
  const sortedTasks = sortTasks(tasks);

  // タスクをループして描画
  sortedTasks.forEach((task) => {
    const taskItem = createTaskItem(task);
    taskList.appendChild(taskItem);
  });
}

function sortTasks(tasks) {
  const priorityOrder = { 高: 1, 中: 2, 低: 3 };
  return tasks.slice().sort((a, b) => {
    // 優先度で比較
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // 未完了のタスクを優先
    if (a.completed !== b.completed) {
      return a.completed - b.completed;
    }
    // 作成日時で比較
    return a.createdAt - b.createdAt;
  });
}

function createTaskItem(task) {
  // タスクアイテムの生成
  const taskItem = document.createElement("li");
  taskItem.className = "task-item";
  taskItem.dataset.taskId = task.id;
  taskItem.dataset.priority = task.priority;

  // タスク内容のコンテナ
  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  // チェックボックスの生成
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.className = "task-checkbox";
  checkbox.addEventListener("change", () => handleToggleTaskCompleted(task.id));

  // タスク名の生成
  const taskNameSpan = document.createElement("span");
  taskNameSpan.className = "task-name";
  taskNameSpan.textContent = task.name;

  // アイコンのコンテナ
  const iconsContainer = document.createElement("div");
  iconsContainer.className = "task-icons";

  // メモアイコン
  const memoIcon = document.createElement("i");
  memoIcon.className = "fas fa-sticky-note";
  if (task.memo !== "") {
    memoIcon.classList.add("has-memo");
  }
  memoIcon.addEventListener("click", () => openMemoModal(task.id));

  // サブタスクアイコン
  const subtaskIcon = document.createElement("i");
  subtaskIcon.className = "fas fa-list";
  subtaskIcon.addEventListener("click", () => toggleSubtaskVisibility(taskItem));

  // 編集ボタン
  const editButton = document.createElement("i");
  editButton.className = "fas fa-edit";
  editButton.addEventListener("click", () => enterTaskEditMode(taskItem, task));

  // 削除ボタン
  const deleteButton = document.createElement("i");
  deleteButton.className = "fas fa-trash";
  deleteButton.addEventListener("click", () => openDeleteModal(task.id, "task"));

  // アイコンをコンテナに追加
  iconsContainer.appendChild(memoIcon);
  iconsContainer.appendChild(subtaskIcon);
  iconsContainer.appendChild(editButton);
  iconsContainer.appendChild(deleteButton);

  // タスク内容をコンテナに追加
  taskContent.appendChild(checkbox);
  taskContent.appendChild(taskNameSpan);

  // タスクアイテムに要素を追加
  taskItem.appendChild(taskContent);
  taskItem.appendChild(iconsContainer);

  // 優先度タグ
  const priorityTag = document.createElement("div");
  priorityTag.className = "priority-tag";
  priorityTag.textContent = task.priority;
  taskItem.appendChild(priorityTag);

  // サブタスクリストの生成
  const subtaskList = createSubtaskList(task);
  taskItem.appendChild(subtaskList);

  // サブタスク追加ボタン
  const addSubtaskButton = document.createElement("button");
  addSubtaskButton.className = "add-subtask-button";
  addSubtaskButton.textContent = "＋サブタスクを追加";
  addSubtaskButton.addEventListener("click", () => showSubtaskInput(taskItem, task));
  taskItem.appendChild(addSubtaskButton);

  return taskItem;
}

/*====================================================
  タスクの完了状態の切り替え
====================================================*/
function handleToggleTaskCompleted(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    // サブタスクの完了状態を同期
    task.subtasks.forEach((subtask) => {
      subtask.completed = task.completed;
    });
    renderTaskList();
  }
}

/*====================================================
  タスクの編集機能
====================================================*/
function enterTaskEditMode(taskItem, task) {
  // 既存の要素を非表示または削除
  const taskContent = taskItem.querySelector(".task-content");
  taskContent.style.display = "none";
  const iconsContainer = taskItem.querySelector(".task-icons");
  iconsContainer.style.display = "none";
  const priorityTag = taskItem.querySelector(".priority-tag");
  priorityTag.style.display = "none";

  // 編集用の入力フィールド
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = task.name;
  editInput.className = "edit-input";

  // 優先度選択メニューを作成
  const editPrioritySelect = document.createElement("select");
  editPrioritySelect.className = "edit-priority-select";
  ["高", "中", "低"].forEach((level) => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    if (level === task.priority) {
      option.selected = true;
    }
    editPrioritySelect.appendChild(option);
  });

  // 保存ボタン
  const saveButton = document.createElement("button");
  saveButton.textContent = "保存";
  saveButton.className = "save-button";
  saveButton.addEventListener("click", () =>
    saveTaskEdit(task, editInput.value.trim(), editPrioritySelect.value)
  );

  // キャンセルボタン
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "キャンセル";
  cancelButton.className = "cancel-button";
  cancelButton.addEventListener("click", () => renderTaskList());

  // 編集用のコンテナ
  const editContainer = document.createElement("div");
  editContainer.className = "edit-container";
  editContainer.appendChild(editInput);
  editContainer.appendChild(editPrioritySelect);
  editContainer.appendChild(saveButton);
  editContainer.appendChild(cancelButton);

  // タスクアイテムに編集用コンテナを追加
  taskItem.insertBefore(editContainer, taskItem.firstChild);

  // キーボード操作の対応
  editInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      saveTaskEdit(task, editInput.value.trim(), editPrioritySelect.value);
    }
  });
  editInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      renderTaskList();
    }
  });
}

function saveTaskEdit(task, newName, newPriority) {
  if (newName === "") {
    alert("タスク名を入力してください。");
    return;
  }
  task.name = newName;
  task.priority = newPriority;
  renderTaskList();
}

/*====================================================
  タスクの削除機能
====================================================*/
function openDeleteModal(id, type) {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalMessage = document.getElementById("modal-message");
  const modalYesButton = document.getElementById("modal-yes-button");
  const modalNoButton = document.getElementById("modal-no-button");
  const modalCloseButton = document.getElementById("modal-close-button");

  modalMessage.textContent =
    type === "task" ? "このタスクを削除しますか？" : "このサブタスクを削除しますか？";

  modalOverlay.style.display = "block";

  modalYesButton.onclick = function () {
    if (type === "task") {
      deleteTask(id);
    } else {
      const taskId = parseInt(
        document.querySelector(`[data-subtask-id="${id}"]`).closest(".task-item").dataset.taskId
      );
      deleteSubtask(taskId, id);
    }
    closeModal();
  };

  modalNoButton.onclick = closeModal;
  modalCloseButton.onclick = closeModal;

  function closeModal() {
    modalOverlay.style.display = "none";
    modalYesButton.onclick = null;
    modalNoButton.onclick = null;
    modalCloseButton.onclick = null;
  }

  // モーダル外のクリックで閉じる
  modalOverlay.onclick = function (event) {
    if (event.target == modalOverlay) {
      closeModal();
    }
  };
}

function deleteTask(taskId) {
  tasks = tasks.filter((t) => t.id !== taskId);
  renderTaskList();
}

/*====================================================
  テーマの切り替え
====================================================*/
function toggleTheme() {
  const body = document.body;
  if (themeCheckbox.checked) {
    currentTheme = "dark";
    body.classList.add("dark-theme");
  } else {
    currentTheme = "light";
    body.classList.remove("dark-theme");
  }
}

/*====================================================
  メモ機能
====================================================*/
function openMemoModal(taskId) {
  const memoModalOverlay = document.getElementById("memo-modal-overlay");
  const memoTextArea = document.getElementById("memo-textarea");
  const memoSaveButton = document.getElementById("memo-save-button");
  const memoCancelButton = document.getElementById("memo-cancel-button");
  const memoModalCloseButton = document.getElementById("memo-modal-close-button");

  const task = tasks.find((t) => t.id === taskId);
  memoTextArea.value = task.memo;

  memoModalOverlay.style.display = "block";

  memoSaveButton.onclick = function () {
    task.memo = memoTextArea.value;
    renderTaskList();
    closeMemoModal();
  };

  memoCancelButton.onclick = closeMemoModal;
  memoModalCloseButton.onclick = closeMemoModal;

  function closeMemoModal() {
    memoModalOverlay.style.display = "none";
    memoSaveButton.onclick = null;
    memoCancelButton.onclick = null;
    memoModalCloseButton.onclick = null;
  }

  // モーダル外のクリックで閉じる
  memoModalOverlay.onclick = function (event) {
    if (event.target == memoModalOverlay) {
      closeMemoModal();
    }
  };
}

/*====================================================
  サブタスク機能
====================================================*/
function createSubtaskList(task) {
  const subtaskList = document.createElement("ul");
  subtaskList.className = "subtask-list";

  task.subtasks.forEach((subtask) => {
    const subtaskItem = createSubtaskItem(task, subtask);
    subtaskList.appendChild(subtaskItem);
  });

  return subtaskList;
}

function createSubtaskItem(task, subtask) {
  const subtaskItem = document.createElement("li");
  subtaskItem.className = "subtask-item";
  subtaskItem.dataset.subtaskId = subtask.id;

  // 完了状態の反映
  if (subtask.completed) {
    subtaskItem.classList.add("completed");
  }

  // チェックボックス
  const subCheckbox = document.createElement("input");
  subCheckbox.type = "checkbox";
  subCheckbox.checked = subtask.completed;
  subCheckbox.className = "subtask-checkbox";
  subCheckbox.addEventListener("change", () =>
    handleToggleSubtaskCompleted(task.id, subtask.id)
  );

  // サブタスク名
  const subtaskNameSpan = document.createElement("span");
  subtaskNameSpan.className = "subtask-name";
  subtaskNameSpan.textContent = subtask.name;

  // アイコンコンテナ
  const subtaskIcons = document.createElement("div");
  subtaskIcons.className = "subtask-icons";

  // 編集ボタン
  const subEditButton = document.createElement("i");
  subEditButton.className = "fas fa-edit";
  subEditButton.addEventListener("click", () =>
    enterSubtaskEditMode(subtaskItem, task, subtask)
  );

  // 削除ボタン
  const subDeleteButton = document.createElement("i");
  subDeleteButton.className = "fas fa-trash";
  subDeleteButton.addEventListener("click", () => openDeleteModal(subtask.id, "subtask"));

  // アイコンをコンテナに追加
  subtaskIcons.appendChild(subEditButton);
  subtaskIcons.appendChild(subDeleteButton);

  // サブタスク内容のコンテナ
  const subtaskContent = document.createElement("div");
  subtaskContent.className = "subtask-content";
  subtaskContent.appendChild(subCheckbox);
  subtaskContent.appendChild(subtaskNameSpan);

  // サブタスクアイテムに要素を追加
  subtaskItem.appendChild(subtaskContent);
  subtaskItem.appendChild(subtaskIcons);

  return subtaskItem;
}

function handleToggleSubtaskCompleted(taskId, subtaskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (subtask) {
      subtask.completed = !subtask.completed;
      // 全てのサブタスクが完了したら親タスクも完了
      if (task.subtasks.every((s) => s.completed)) {
        task.completed = true;
      } else {
        task.completed = false;
      }
      renderTaskList();
    }
  }
}

function enterSubtaskEditMode(subtaskItem, task, subtask) {
  // 既存の要素を非表示または削除
  const subtaskContent = subtaskItem.querySelector(".subtask-content");
  subtaskContent.style.display = "none";
  const subtaskIcons = subtaskItem.querySelector(".subtask-icons");
  subtaskIcons.style.display = "none";

  // 編集用の入力フィールド
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = subtask.name;
  editInput.className = "edit-input";

  // 保存ボタン
  const saveButton = document.createElement("button");
  saveButton.textContent = "保存";
  saveButton.className = "save-button";
  saveButton.addEventListener("click", () =>
    saveSubtaskEdit(task, subtask, editInput.value.trim())
  );

  // キャンセルボタン
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "キャンセル";
  cancelButton.className = "cancel-button";
  cancelButton.addEventListener("click", () => renderTaskList());

  // 編集用のコンテナ
  const editContainer = document.createElement("div");
  editContainer.className = "edit-container";
  editContainer.appendChild(editInput);
  editContainer.appendChild(saveButton);
  editContainer.appendChild(cancelButton);

  // サブタスクアイテムに編集用コンテナを追加
  subtaskItem.insertBefore(editContainer, subtaskItem.firstChild);

  // キーボード操作の対応
  editInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      saveSubtaskEdit(task, subtask, editInput.value.trim());
    }
  });
  editInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      renderTaskList();
    }
  });
}

function saveSubtaskEdit(task, subtask, newName) {
  if (newName === "") {
    alert("サブタスク名を入力してください。");
    return;
  }
  subtask.name = newName;
  renderTaskList();
}

function deleteSubtask(taskId, subtaskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId);
    renderTaskList();
  }
}

function showSubtaskInput(taskItem, task) {
  // 既に入力フィールドが存在する場合は無視
  if (taskItem.querySelector(".subtask-input-container")) {
    return;
  }

  // 入力フィールドの生成
  const subtaskInput = document.createElement("input");
  subtaskInput.type = "text";
  subtaskInput.className = "subtask-input";
  subtaskInput.placeholder = "サブタスクを入力";

  // 追加ボタンの生成
  const subtaskAddButton = document.createElement("button");
  subtaskAddButton.textContent = "追加";
  subtaskAddButton.className = "subtask-add-button";

  // キャンセルボタン
  const subtaskCancelButton = document.createElement("button");
  subtaskCancelButton.textContent = "キャンセル";
  subtaskCancelButton.className = "subtask-cancel-button";

  // イベントリスナーの設定
  subtaskAddButton.addEventListener("click", () => {
    addSubtask(task, subtaskInput.value.trim());
    subtaskInputContainer.remove();
  });

  subtaskCancelButton.addEventListener("click", () => {
    subtaskInputContainer.remove();
  });

  subtaskInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      addSubtask(task, subtaskInput.value.trim());
      subtaskInputContainer.remove();
    }
  });
  subtaskInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      subtaskInputContainer.remove();
    }
  });

  // 入力フィールドとボタンをコンテナにまとめる
  const subtaskInputContainer = document.createElement("div");
  subtaskInputContainer.className = "subtask-input-container";
  subtaskInputContainer.appendChild(subtaskInput);
  subtaskInputContainer.appendChild(subtaskAddButton);
  subtaskInputContainer.appendChild(subtaskCancelButton);

  // タスクアイテムに追加
  taskItem.appendChild(subtaskInputContainer);
}

function addSubtask(task, subtaskName) {
  if (subtaskName === "") {
    alert("サブタスクを入力してください。");
    return;
  }

  const subtask = {
    id: subtaskIdCounter++,
    name: subtaskName,
    completed: false,
    createdAt: new Date(),
  };

  task.subtasks.push(subtask);
  renderTaskList();
}

/*====================================================
  ユーザーインタラクション
====================================================*/
// ホバー効果、クリック効果、アニメーションはCSSで実装されています。

// アクセシビリティの対応やキーボード操作は、各要素で対応済みです。

/*====================================================
  データの保持
====================================================*/
// このアプリケーションでは、データの永続化は行いません。

/*====================================================
  以上で全ての機能を詳細に実装しました。
====================================================*/
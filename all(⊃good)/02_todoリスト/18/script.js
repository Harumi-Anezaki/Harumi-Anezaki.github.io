// script.js

// Immediately Invoked Function Expression (IIFE) to avoid polluting global scope
(function () {
    // =========================
    // ユーティリティ関数
    // =========================

    /**
     * UUIDを生成する関数。
     * @returns {string} UUID文字列。
     */
    function generateUUID() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    /**
     * DateオブジェクトをYYYY-MM-DD形式にフォーマットする関数。
     * @param {Date} date 
     * @returns {string}
     */
    function formatDate(date) {
        const d = new Date(date);
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();

        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    }

    /**
     * 2つの日付の差を日数で返す関数。
     * @param {string} date1 
     * @param {string} date2 
     * @returns {number}
     */
    function dateDifference(date1, date2) {
        const diffTime = new Date(date2) - new Date(date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 文字列が有効な日付形式（YYYY-MM-DD）かを検証する関数。
     * @param {string} dateStr 
     * @returns {boolean}
     */
    function isValidDate(dateStr) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        const date = new Date(dateStr);
        const timestamp = date.getTime();
        if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
        return date.toISOString().startsWith(dateStr);
    }

    /**
     * 重要度レベルを数値に変換する関数（並び替え用）。
     * @param {string} importance 
     * @returns {number}
     */
    function importanceValue(importance) {
        switch (importance) {
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 0;
        }
    }

    // =========================
    // ストレージ管理
    // =========================

    const Storage = {
        getTasks: function () {
            const tasks = localStorage.getItem('todoTasks');
            return tasks ? JSON.parse(tasks) : [];
        },
        saveTasks: function (tasks) {
            localStorage.setItem('todoTasks', JSON.stringify(tasks));
        },
        getCategories: function () {
            const categories = localStorage.getItem('todoCategories');
            return categories ? JSON.parse(categories) : ['General'];
        },
        saveCategories: function (categories) {
            localStorage.setItem('todoCategories', JSON.stringify(categories));
        },
        getSettings: function () {
            const settings = localStorage.getItem('todoSettings');
            return settings ? JSON.parse(settings) : { theme: 'light' };
        },
        saveSettings: function (settings) {
            localStorage.setItem('todoSettings', JSON.stringify(settings));
        }
    };

    // =========================
    // モーダル管理
    // =========================

    const Modal = {
        open: function (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        },
        close: function (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        }
    };

    // =========================
    // テーマ管理
    // =========================

    const Theme = {
        applyTheme: function (theme) {
            document.body.classList.remove('light-theme', 'dark-theme');
            document.body.classList.add(`${theme}-theme`);
        },
        toggleTheme: function () {
            const settings = Storage.getSettings();
            settings.theme = settings.theme === 'light' ? 'dark' : 'light';
            Storage.saveSettings(settings);
            this.applyTheme(settings.theme);
        },
        init: function () {
            const settings = Storage.getSettings();
            this.applyTheme(settings.theme);

            const themeToggleBtn = document.getElementById('theme-toggle');
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => this.toggleTheme());
            }
        }
    };

    // =========================
    // タスク管理
    // =========================

    const TaskManager = {
        tasks: [],
        categories: [],

        init: function () {
            this.tasks = Storage.getTasks();
            this.categories = Storage.getCategories();
            UI.renderTasks(this.tasks);
            UI.populateCategoryDropdown(this.categories);
            UI.populateFilterCategory(this.categories);
            Filter.init();
            Sorting.init();
            DragAndDrop.init();
            CategoryManager.init();
            ImportExport.init();
        },

        addTask: function (taskData) {
            const newTask = {
                id: generateUUID(),
                content: taskData.content,
                deadline: taskData.deadline,
                category: taskData.category,
                memo: taskData.memo,
                importance: taskData.importance,
                createdAt: new Date().toISOString(),
                completed: false,
                subtasks: []
            };
            this.tasks.push(newTask);
            Storage.saveTasks(this.tasks);
            UI.renderTasks(this.tasks);
        },

        toggleTaskCompletion: function (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                if (task.completed) {
                    task.subtasks.forEach(sub => sub.completed = true);
                }
                Storage.saveTasks(this.tasks);
                UI.renderTasks(this.tasks);
            }
        },

        deleteTask: function (taskId) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            Storage.saveTasks(this.tasks);
            UI.renderTasks(this.tasks);
        },

        updateTask: function (updatedTask) {
            const index = this.tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                Storage.saveTasks(this.tasks);
                UI.renderTasks(this.tasks);
            }
        },

        sortTasks: function (criteria) {
            switch (criteria) {
                case 'deadline-asc':
                    this.tasks.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
                    break;
                case 'deadline-desc':
                    this.tasks.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
                    break;
                case 'importance-asc':
                    this.tasks.sort((a, b) => importanceValue(a.importance) - importanceValue(b.importance));
                    break;
                case 'importance-desc':
                    this.tasks.sort((a, b) => importanceValue(b.importance) - importanceValue(a.importance));
                    break;
                case 'createdAt-asc':
                    this.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                case 'createdAt-desc':
                    this.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                default:
                    break;
            }
            Storage.saveTasks(this.tasks);
            UI.renderTasks(this.tasks);
        }
    };

    // =========================
    // UI管理
    // =========================

    const UI = {
        renderTasks: function (tasks) {
            const taskList = document.getElementById('task-list');
            if (!taskList) return;

            taskList.innerHTML = ''; // 既存のタスクをクリア

            tasks.forEach(task => {
                const taskCard = this.createTaskCard(task);
                taskList.appendChild(taskCard);
            });
        },

        createTaskCard: function (task) {
            const card = document.createElement('div');
            card.classList.add('task-card');
            card.setAttribute('data-id', task.id);
            card.setAttribute('draggable', 'true'); // ドラッグ＆ドロップ用

            // 重要度インディケータ
            const importance = document.createElement('span');
            importance.classList.add('importance-indicator', task.importance);
            importance.title = `重要度: ${task.importance}`;
            card.appendChild(importance);

            // 完了チェックボックス
            const completeCheckbox = document.createElement('input');
            completeCheckbox.type = 'checkbox';
            completeCheckbox.checked = task.completed;
            completeCheckbox.classList.add('complete-checkbox');
            completeCheckbox.addEventListener('change', () => {
                TaskManager.toggleTaskCompletion(task.id);
            });
            card.appendChild(completeCheckbox);

            // タスク内容
            const content = document.createElement('span');
            content.classList.add('task-content');
            content.textContent = task.content;
            if (task.completed) {
                content.classList.add('completed');
            }
            card.appendChild(content);

            // 期限日表示
            if (task.deadline) {
                const deadline = document.createElement('span');
                deadline.classList.add('task-deadline');
                deadline.textContent = `期限: ${task.deadline}`;
                // 期限が近い場合は強調表示
                const today = new Date().toISOString().split('T')[0];
                const daysLeft = dateDifference(today, task.deadline);
                if (daysLeft <= 3 && daysLeft >= 0) {
                    deadline.classList.add('urgent');
                }
                card.appendChild(deadline);
            }

            // カテゴリラベル
            if (task.category) {
                const category = document.createElement('span');
                category.classList.add('task-category');
                category.textContent = task.category;
                card.appendChild(category);
            }

            // メモプレビューボタン
            if (task.memo) {
                const memoPreview = document.createElement('button');
                memoPreview.classList.add('memo-preview-btn');
                memoPreview.textContent = '📝'; // メモアイコン
                memoPreview.title = 'メモを見る';
                memoPreview.addEventListener('click', () => {
                    UI.openMemoModal(task);
                });
                card.appendChild(memoPreview);
            }

            // サブタスクトグルボタン
            if (task.subtasks && task.subtasks.length > 0) {
                const subtaskToggle = document.createElement('button');
                subtaskToggle.classList.add('subtask-toggle-btn');
                subtaskToggle.textContent = '➕'; // サブタスク表示アイコン
                subtaskToggle.title = 'サブタスクを表示/非表示';
                subtaskToggle.addEventListener('click', () => {
                    this.toggleSubtasks(task.id);
                });
                card.appendChild(subtaskToggle);
            }

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-task-btn');
            deleteBtn.textContent = '🗑️'; // ゴミ箱アイコン
            deleteBtn.title = 'タスクを削除';
            deleteBtn.addEventListener('click', () => {
                Modal.open('delete-confirmation-modal');
                // モーダル内の確認ボタンに削除処理を設定
                const confirmBtn = document.getElementById('confirm-delete-btn');
                if (confirmBtn) {
                    // 既に他のタスクの削除処理が設定されていれば上書きしない
                    if (!confirmBtn.dataset.taskId) {
                        confirmBtn.dataset.taskId = task.id;
                        confirmBtn.onclick = () => {
                            TaskManager.deleteTask(task.id);
                            confirmBtn.dataset.taskId = '';
                            Modal.close('delete-confirmation-modal');
                        };
                    }
                }
            });
            card.appendChild(deleteBtn);

            // サブタスクコンテナ
            if (task.subtasks && task.subtasks.length > 0) {
                const subtaskContainer = document.createElement('div');
                subtaskContainer.classList.add('subtask-container', 'hidden');

                task.subtasks.forEach(sub => {
                    const subtaskItem = this.createSubtaskItem(task, sub);
                    subtaskContainer.appendChild(subtaskItem);
                });

                // サブタスク追加フォーム
                const addSubtaskForm = document.createElement('form');
                addSubtaskForm.classList.add('add-subtask-form');
                addSubtaskForm.innerHTML = `
                    <input type="text" class="subtask-input" placeholder="サブタスクを追加" required />
                    <button type="submit" class="add-subtask-btn">➕</button>
                `;
                addSubtaskForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const subtaskInput = addSubtaskForm.querySelector('.subtask-input');
                    const subtaskContent = subtaskInput.value.trim();
                    if (subtaskContent) {
                        TaskManager.addSubtask(task.id, subtaskContent);
                        subtaskInput.value = '';
                        this.renderTasks(TaskManager.tasks);
                    }
                });
                subtaskContainer.appendChild(addSubtaskForm);

                card.appendChild(subtaskContainer);
            }

            return card;
        },

        createSubtaskItem: function (task, sub) {
            const subtaskItem = document.createElement('div');
            subtaskItem.classList.add('subtask-item');

            const subCheckbox = document.createElement('input');
            subCheckbox.type = 'checkbox';
            subCheckbox.checked = sub.completed;
            subCheckbox.addEventListener('change', () => {
                sub.completed = !sub.completed;
                Storage.saveTasks(TaskManager.tasks);
                UI.renderTasks(TaskManager.tasks);
                // メインタスクの完了状態をチェック
                const allCompleted = task.subtasks.every(s => s.completed);
                if (allCompleted) {
                    task.completed = true;
                } else {
                    task.completed = false;
                }
                Storage.saveTasks(TaskManager.tasks);
                UI.renderTasks(TaskManager.tasks);
            });
            subtaskItem.appendChild(subCheckbox);

            const subContent = document.createElement('span');
            subContent.classList.add('subtask-content');
            subContent.textContent = sub.content;
            if (sub.completed) {
                subContent.classList.add('completed');
            }
            subtaskItem.appendChild(subContent);

            const subDelete = document.createElement('button');
            subDelete.classList.add('delete-subtask-btn');
            subDelete.textContent = '🗑️'; // ゴミ箱アイコン
            subDelete.title = 'サブタスクを削除';
            subDelete.addEventListener('click', () => {
                TaskManager.deleteSubtask(task.id, sub.id);
                UI.renderTasks(TaskManager.tasks);
            });
            subtaskItem.appendChild(subDelete);

            return subtaskItem;
        },

        toggleSubtasks: function (taskId) {
            const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
            if (taskCard) {
                const subtaskContainer = taskCard.querySelector('.subtask-container');
                if (subtaskContainer) {
                    subtaskContainer.classList.toggle('hidden');
                }
            }
        },

        populateCategoryDropdown: function (categories) {
            const categorySelect = document.getElementById('category-select');
            if (categorySelect) {
                categorySelect.innerHTML = ''; // 既存のオプションをクリア
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    categorySelect.appendChild(option);
                });
            }
        },

        populateFilterCategory: function (categories) {
            const filterCategorySelect = document.getElementById('filter-category');
            if (filterCategorySelect) {
                filterCategorySelect.innerHTML = '<option value="All">すべて</option>'; // デフォルトオプション
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    filterCategorySelect.appendChild(option);
                });
            }
        },

        resetTaskForm: function () {
            const form = document.getElementById('task-form');
            if (form) {
                form.reset();
            }
        },

        showAddTaskConfirmation: function () {
            Modal.open('add-task-confirmation-modal');
            const closeBtn = document.getElementById('close-add-confirmation-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    Modal.close('add-task-confirmation-modal');
                });
            }
        },

        openMemoModal: function (task) {
            const memoModal = document.getElementById('memo-modal');
            if (memoModal) {
                const memoContent = memoModal.querySelector('.memo-content');
                if (memoContent) {
                    memoContent.textContent = task.memo;
                }
                Modal.open('memo-modal');
            }
        }
    };

    // =========================
    // フィルター管理
    // =========================

    const Filter = {
        init: function () {
            const filterBtn = document.getElementById('filter-btn');
            if (filterBtn) {
                filterBtn.addEventListener('click', () => {
                    this.openFilterModal();
                });
            }
            const clearFilterBtn = document.getElementById('clear-filter-btn');
            if (clearFilterBtn) {
                clearFilterBtn.addEventListener('click', () => {
                    this.clearFilters();
                });
            }
        },

        openFilterModal: function () {
            Modal.open('filter-modal');
            const applyFilterBtn = document.getElementById('apply-filter-btn');
            if (applyFilterBtn) {
                applyFilterBtn.onclick = () => {
                    this.applyFilters();
                    Modal.close('filter-modal');
                };
            }
            const cancelFilterBtn = document.getElementById('cancel-filter-btn');
            if (cancelFilterBtn) {
                cancelFilterBtn.onclick = () => {
                    Modal.close('filter-modal');
                };
            }
        },

        applyFilters: function () {
            const categoryFilter = document.getElementById('filter-category').value;
            const importanceFilter = document.getElementById('filter-importance').value;
            const deadlineFilter = document.getElementById('filter-deadline').value;

            let filteredTasks = TaskManager.tasks;

            if (categoryFilter && categoryFilter !== 'All') {
                filteredTasks = filteredTasks.filter(task => task.category === categoryFilter);
            }

            if (importanceFilter && importanceFilter !== 'All') {
                filteredTasks = filteredTasks.filter(task => task.importance === importanceFilter);
            }

            if (deadlineFilter && deadlineFilter !== 'All') {
                const today = new Date().toISOString().split('T')[0];
                if (deadlineFilter === 'Overdue') {
                    filteredTasks = filteredTasks.filter(task => task.deadline && task.deadline < today && !task.completed);
                } else if (deadlineFilter === 'Due Today') {
                    filteredTasks = filteredTasks.filter(task => task.deadline === today);
                } else if (deadlineFilter === 'Upcoming') {
                    filteredTasks = filteredTasks.filter(task => task.deadline && task.deadline > today);
                }
            }

            UI.renderTasks(filteredTasks);
        },

        clearFilters: function () {
            const filterCategory = document.getElementById('filter-category');
            const filterImportance = document.getElementById('filter-importance');
            const filterDeadline = document.getElementById('filter-deadline');

            if (filterCategory) filterCategory.value = 'All';
            if (filterImportance) filterImportance.value = 'All';
            if (filterDeadline) filterDeadline.value = 'All';

            UI.renderTasks(TaskManager.tasks);
        }
    };

    // =========================
    // ソート管理
    // =========================

    const Sorting = {
        init: function () {
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    TaskManager.sortTasks(e.target.value);
                });
            }
        }
    };

    // =========================
    // ドラッグ＆ドロップ管理
    // =========================

    const DragAndDrop = {
        init: function () {
            const taskList = document.getElementById('task-list');
            if (taskList) {
                taskList.addEventListener('dragstart', this.handleDragStart.bind(this));
                taskList.addEventListener('dragover', this.handleDragOver.bind(this));
                taskList.addEventListener('drop', this.handleDrop.bind(this));
                taskList.addEventListener('dragend', this.handleDragEnd.bind(this));
            }
        },

        handleDragStart: function (e) {
            const card = e.target.closest('.task-card');
            if (card) {
                e.dataTransfer.setData('text/plain', card.dataset.id);
                card.classList.add('dragging');
            }
        },

        handleDragOver: function (e) {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(e.clientY);
            const dragging = document.querySelector('.dragging');
            const taskList = document.getElementById('task-list');
            if (afterElement == null) {
                taskList.appendChild(dragging);
            } else {
                taskList.insertBefore(dragging, afterElement);
            }
        },

        handleDrop: function (e) {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const draggingTask = TaskManager.tasks.find(t => t.id === id);
            if (draggingTask) {
                // DOMに基づいて新しい順序を取得
                const newOrder = [];
                const taskCards = document.querySelectorAll('.task-card');
                taskCards.forEach(card => {
                    const taskId = card.getAttribute('data-id');
                    const task = TaskManager.tasks.find(t => t.id === taskId);
                    if (task) {
                        newOrder.push(task);
                    }
                });
                TaskManager.tasks = newOrder;
                Storage.saveTasks(TaskManager.tasks);
                UI.renderTasks(TaskManager.tasks);
            }
        },

        handleDragEnd: function (e) {
            const card = e.target.closest('.task-card');
            if (card) {
                card.classList.remove('dragging');
            }
        },

        getDragAfterElement: function (y) {
            const draggableElements = [...document.querySelectorAll('.task-card:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    };

    // =========================
    // インポート＆エクスポート管理
    // =========================

    const ImportExport = {
        init: function () {
            const exportBtn = document.getElementById('export-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportData());
            }

            const importBtn = document.getElementById('import-btn');
            if (importBtn) {
                importBtn.addEventListener('click', () => this.openImportModal());
            }
        },

        exportData: function () {
            const data = {
                tasks: TaskManager.tasks,
                categories: TaskManager.categories,
                settings: Storage.getSettings()
            };
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `todo_data_${formatDate(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        openImportModal: function () {
            Modal.open('import-modal');
            const fileInput = document.getElementById('import-file-input');
            const importConfirmBtn = document.getElementById('confirm-import-btn');
            const importCancelBtn = document.getElementById('cancel-import-btn');

            importConfirmBtn.onclick = () => {
                const file = fileInput.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const importedData = JSON.parse(event.target.result);
                            this.validateImportedData(importedData);
                        } catch (error) {
                            alert('無効なJSONファイルです。');
                        }
                    };
                    reader.readAsText(file);
                } else {
                    alert('インポートするファイルを選択してください。');
                }
            };

            importCancelBtn.onclick = () => {
                Modal.close('import-modal');
            };
        },

        validateImportedData: function (data) {
            if (!data.tasks || !Array.isArray(data.tasks)) {
                alert('無効なデータ構造: "tasks" 配列が存在しません。');
                return;
            }
            if (!data.categories || !Array.isArray(data.categories)) {
                alert('無効なデータ構造: "categories" 配列が存在しません。');
                return;
            }
            if (!data.settings || typeof data.settings !== 'object') {
                alert('無効なデータ構造: "settings" オブジェクトが存在しません。');
                return;
            }

            // インポートオプション（統合か上書きか）を取得
            const importOption = document.querySelector('input[name="import-option"]:checked');
            if (importOption) {
                if (importOption.value === 'merge') {
                    // カテゴリの統合
                    data.categories.forEach(cat => {
                        if (!TaskManager.categories.includes(cat)) {
                            TaskManager.categories.push(cat);
                        }
                    });
                    Storage.saveCategories(TaskManager.categories);
                    UI.populateCategoryDropdown(TaskManager.categories);
                    UI.populateFilterCategory(TaskManager.categories);

                    // タスクの統合（重複チェック）
                    data.tasks.forEach(task => {
                        if (!TaskManager.tasks.some(t => t.id === task.id)) {
                            TaskManager.tasks.push(task);
                        }
                    });
                    Storage.saveTasks(TaskManager.tasks);

                    // 設定の統合（インポートされた設定が優先）
                    const currentSettings = Storage.getSettings();
                    const importedSettings = data.settings;
                    Storage.saveSettings({ ...currentSettings, ...importedSettings });
                    Theme.applyTheme(Storage.getSettings().theme);

                } else if (importOption.value === 'overwrite') {
                    // データの上書き
                    TaskManager.tasks = data.tasks;
                    TaskManager.categories = data.categories;
                    Storage.saveTasks(TaskManager.tasks);
                    Storage.saveCategories(TaskManager.categories);
                    Storage.saveSettings(data.settings);
                    UI.populateCategoryDropdown(TaskManager.categories);
                    UI.populateFilterCategory(TaskManager.categories);
                    Theme.applyTheme(data.settings.theme);
                }

                UI.renderTasks(TaskManager.tasks);
                Modal.close('import-modal');
                alert('データのインポートが完了しました。');
            } else {
                alert('インポートオプションを選択してください。');
            }
        }
    };

    // =========================
    // カテゴリ管理
    // =========================

    const CategoryManager = {
        init: function () {
            const addCategoryForm = document.getElementById('add-category-form');
            if (addCategoryForm) {
                addCategoryForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const categoryInput = document.getElementById('new-category-input');
                    const categoryName = categoryInput.value.trim();
                    if (categoryName && !TaskManager.categories.includes(categoryName)) {
                        TaskManager.categories.push(categoryName);
                        Storage.saveCategories(TaskManager.categories);
                        UI.populateCategoryDropdown(TaskManager.categories);
                        UI.populateFilterCategory(TaskManager.categories);
                        categoryInput.value = '';
                    } else {
                        alert('カテゴリが既に存在するか、無効な名前です。');
                    }
                });
            }

            const manageCategoriesBtn = document.getElementById('manage-categories-btn');
            if (manageCategoriesBtn) {
                manageCategoriesBtn.addEventListener('click', () => {
                    this.openManageCategoriesModal();
                });
            }
        },

        deleteCategory: function (categoryName) {
            if (categoryName === 'General') {
                alert('"General" カテゴリは削除できません。');
                return;
            }
            TaskManager.categories = TaskManager.categories.filter(cat => cat !== categoryName);
            Storage.saveCategories(TaskManager.categories);
            UI.populateCategoryDropdown(TaskManager.categories);
            UI.populateFilterCategory(TaskManager.categories);
            // カテゴリを持つタスクを 'General' に変更
            TaskManager.tasks.forEach(task => {
                if (task.category === categoryName) {
                    task.category = 'General';
                }
            });
            Storage.saveTasks(TaskManager.tasks);
            UI.renderTasks(TaskManager.tasks);
        },

        openManageCategoriesModal: function () {
            Modal.open('manage-categories-modal');
            this.renderCategoryList();

            const closeBtn = document.getElementById('close-manage-categories-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    Modal.close('manage-categories-modal');
                });
            }
        },

        renderCategoryList: function () {
            const categoryList = document.getElementById('category-list');
            if (categoryList) {
                categoryList.innerHTML = '';
                TaskManager.categories.forEach(cat => {
                    const li = document.createElement('li');
                    li.textContent = cat;
                    if (cat !== 'General') { // 'General'カテゴリは削除不可
                        const deleteBtn = document.createElement('button');
                        deleteBtn.classList.add('delete-category-btn');
                        deleteBtn.textContent = '🗑️'; // ゴミ箱アイコン
                        deleteBtn.title = 'カテゴリを削除';
                        deleteBtn.addEventListener('click', () => {
                            if (confirm(`"${cat}" カテゴリを削除しますか？`)) {
                                this.deleteCategory(cat);
                                this.renderCategoryList();
                            }
                        });
                        li.appendChild(deleteBtn);
                    }
                    categoryList.appendChild(li);
                });
            }
        }
    };

    // =========================
    // サブタスク管理
    // =========================

    const SubtaskManager = {
        addSubtask: function (taskId, subtaskContent) {
            const task = TaskManager.tasks.find(t => t.id === taskId);
            if (task) {
                const newSubtask = {
                    id: generateUUID(),
                    content: subtaskContent,
                    completed: false
                };
                task.subtasks.push(newSubtask);
                Storage.saveTasks(TaskManager.tasks);
                UI.renderTasks(TaskManager.tasks);
            }
        },

        deleteSubtask: function (taskId, subtaskId) {
            const task = TaskManager.tasks.find(t => t.id === taskId);
            if (task) {
                task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
                Storage.saveTasks(TaskManager.tasks);
                UI.renderTasks(TaskManager.tasks);
            }
        }
    };

    // =========================
    // メインの初期化
    // =========================

    document.addEventListener('DOMContentLoaded', () => {
        // テーマ初期化
        Theme.init();

        // タスクマネージャー初期化
        TaskManager.init();

        // タスク追加フォームのイベントハンドラー設定
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const taskContent = document.getElementById('task-content').value.trim();
                const taskDeadline = document.getElementById('task-deadline').value;
                const taskCategory = document.getElementById('category-select').value;
                const taskMemo = document.getElementById('task-memo').value.trim();
                const taskImportance = document.getElementById('task-importance').value;

                // 入力検証
                if (!taskContent) {
                    alert('タスク内容を入力してください。');
                    return;
                }
                if (taskDeadline && !isValidDate(taskDeadline)) {
                    alert('有効な期限日を入力してください。');
                    return;
                }
                if (!taskImportance) {
                    alert('重要度を選択してください。');
                    return;
                }

                // タスク追加
                TaskManager.addTask({
                    content: taskContent,
                    deadline: taskDeadline,
                    category: taskCategory,
                    memo: taskMemo,
                    importance: taskImportance
                });

                // フォームリセット
                UI.resetTaskForm();

                // 追加確認モーダル表示
                UI.showAddTaskConfirmation();
            });
        }

        // 各種モーダルの閉じるボタンにイベントハンドラーを設定
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    Modal.close(modal.id);
                });
            }

            // モーダル外クリックで閉じる
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    Modal.close(modal.id);
                }
            });
        });
    });

})();
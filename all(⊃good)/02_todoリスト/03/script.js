// Firebaseの設定と初期化
const firebaseConfig = {
    // あなたのFirebaseプロジェクトの設定をここに貼り付けてください
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutButton = document.getElementById('logout-button');
    const toggleThemeButton = document.getElementById('toggle-theme');

    let currentUser = null;
    let darkMode = false;

    // ユーザーのログイン状態を監視
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authSection.style.display = 'none';
            appSection.style.display = 'block';
            initializeApp();
        } else {
            currentUser = null;
            authSection.style.display = 'block';
            appSection.style.display = 'none';
        }
    });

    // ログインフォームの送信
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(err => alert('ログインに失敗しました: ' + err.message));
    });

    // 新規登録フォームの送信
    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('reg-email-input').value;
        const password = document.getElementById('reg-password-input').value;
        auth.createUserWithEmailAndPassword(email, password)
            .catch(err => alert('登録に失敗しました: ' + err.message));
    });

    // ログイン・登録フォームの切り替え
    showRegisterLink.addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', e => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // ログアウト
    logoutButton.addEventListener('click', () => {
        auth.signOut();
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

    loadTheme();

    // アプリの初期化
    function initializeApp() {
        const todoForm = document.getElementById('todo-form');
        const todoInput = document.getElementById('todo-input');
        const todoDate = document.getElementById('todo-date');
        const todoPriority = document.getElementById('todo-priority');
        const todoCategory = document.getElementById('todo-category');
        const todoList = document.getElementById('todo-list');
        const searchInput = document.getElementById('search-input');
        const filterPriority = document.getElementById('filter-priority');

        // タスクをリアルタイムで取得
        db.collection('users').doc(currentUser.uid).collection('todos')
            .orderBy('createdAt')
            .onSnapshot(snapshot => {
                todoList.innerHTML = '';
                snapshot.forEach(doc => {
                    renderTodo(doc.data(), doc.id);
                });
            });

        // タスクの追加
        todoForm.addEventListener('submit', e => {
            e.preventDefault();
            const todo = {
                text: todoInput.value,
                dueDate: todoDate.value,
                priority: todoPriority.value,
                category: todoCategory.value,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection('users').doc(currentUser.uid).collection('todos').add(todo);
            todoForm.reset();
        });

        // タスクの表示
        function renderTodo(data, id) {
            const li = document.createElement('li');
            li.classList.add('todo-item');
            li.setAttribute('data-id', id);
            li.setAttribute('draggable', true);

            const header = document.createElement('div');
            header.classList.add('todo-header');

            const text = document.createElement('h3');
            text.classList.add('todo-text');
            text.textContent = data.text;
            if (data.completed) {
                text.style.textDecoration = 'line-through';
            }

            const actions = document.createElement('div');
            actions.classList.add('todo-actions');

            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';

            const completeButton = document.createElement('button');
            completeButton.innerHTML = '<i class="fas fa-check"></i>';

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

            actions.appendChild(editButton);
            actions.appendChild(completeButton);
            actions.appendChild(deleteButton);

            header.appendChild(text);
            header.appendChild(actions);

            const meta = document.createElement('div');
            meta.classList.add('todo-meta');
            meta.innerHTML = `
                期限: ${data.dueDate} | 優先度: ${data.priority} | カテゴリー: ${data.category}
            `;

            li.appendChild(header);
            li.appendChild(meta);

            // タスクのイベント
            editButton.addEventListener('click', () => editTodo(id, data));
            completeButton.addEventListener('click', () => toggleComplete(id, data.completed));
            deleteButton.addEventListener('click', () => deleteTodo(id));

            // ドラッグ＆ドロップイベント
            li.addEventListener('dragstart', dragStart);
            li.addEventListener('dragover', dragOver);
            li.addEventListener('drop', drop);
            li.addEventListener('dragend', dragEnd);

            todoList.appendChild(li);
        }

        // タスクの完了状態を切り替える
        function toggleComplete(id, completed) {
            db.collection('users').doc(currentUser.uid).collection('todos').doc(id).update({
                completed: !completed
            });
        }

        // タスクを削除する
        function deleteTodo(id) {
            db.collection('users').doc(currentUser.uid).collection('todos').doc(id).delete();
        }

        // タスクを編集する
        function editTodo(id, data) {
            todoInput.value = data.text;
            todoDate.value = data.dueDate;
            todoPriority.value = data.priority;
            todoCategory.value = data.category;
            deleteTodo(id);
        }

        // 検索・フィルター機能
        searchInput.addEventListener('input', filterTodos);
        filterPriority.addEventListener('change', filterTodos);

        function filterTodos() {
            const searchText = searchInput.value.toLowerCase();
            const priorityFilter = filterPriority.value;
            document.querySelectorAll('.todo-item').forEach(item => {
                const text = item.querySelector('.todo-text').textContent.toLowerCase();
                const priority = item.querySelector('.todo-meta').textContent.toLowerCase();
                if (
                    text.includes(searchText) && 
                    (priorityFilter === '' || priority.includes(priorityFilter))
                ) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
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

                // 順序を再保存するロジックを実装する場合、ここに追加
            }
        }

        function dragEnd() {
            this.style.display = '';
            draggedItem = null;
        }

        // 通知機能（期限が近いタスクを通知）
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                setInterval(checkDeadlines, 3600000); // 1時間ごとにチェック
            }
        });

        function checkDeadlines() {
            const today = new Date();
            db.collection('users').doc(currentUser.uid).collection('todos')
                .where('completed', '==', false)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const dueDate = new Date(data.dueDate);
                        const diffTime = dueDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 1 && diffDays >= 0) {
                            new Notification(`タスクの期限が近づいています: ${data.text}`);
                        }
                    });
                });
        }
    }
});
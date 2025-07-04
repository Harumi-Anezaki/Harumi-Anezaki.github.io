let 教材一覧 = [];
let 日付一覧 = [];
let 現在表示中の教材 = null;

// ハンバーガーメニューの開閉
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// 教材を追加
function add教材() {
    let 教材名 = document.getElementById('教材名').value;
    let 問題数 = parseInt(document.getElementById('問題数').value);
    let 学習期間開始 = document.getElementById('学習期間開始').value;
    let 学習期間終了 = document.getElementById('学習期間終了').value;

    let 曜日チェックボックス = document.querySelectorAll('#曜日指定 input[type="checkbox"]');
    let 選択された曜日 = [];
    曜日チェックボックス.forEach(cb => {
        if (cb.checked) 選択された曜日.push(cb.value);
    });

    if (!教材名 || !問題数 || !学習期間開始 || !学習期間終了 || 選択された曜日.length === 0) {
        alert('全ての項目を正しく入力してください。');
        return;
    }

    let 新しい教材 = {
        教材名,
        問題数,
        学習期間開始: new Date(学習期間開始),
        学習期間終了: new Date(学習期間終了),
        選択された曜日,
        割り当て: {},
        完了: {},
        進捗: 0
    };

    教材一覧.push(新しい教材);
    保存する();
    教材名 = '';
    問題数 = '';
    学習期間開始 = '';
    学習期間終了 = '';
    再計算();
    toggleSidebar();
}

// 日付の生成
function 生成日付一覧() {
    let 全ての日付 = new Set();
    教材一覧.forEach(教材 => {
        let 開始日 = new Date(教材.学習期間開始);
        let 終了日 = new Date(教材.学習期間終了);

        for (let 日付 = new Date(開始日); 日付 <= 終了日; 日付.setDate(日付.getDate() + 1)) {
            全ての日付.add(日付.toISOString().split('T')[0]);
        }
    });
    日付一覧 = Array.from(全ての日付).sort();
}

// カレンダーの描画
function 描画する() {
    生成日付一覧();
    let dateRow = document.getElementById('date-row');
    let tbody = document.getElementById('教材-body');

    // 日付のヘッダーをクリア
    dateRow.innerHTML = '<th>日付</th>';

    // 今日の日付を取得
    let 今日 = new Date().toISOString().split('T')[0];

    // 日付セルの生成
    日付一覧.forEach(日付 => {
        let 日付オブジェクト = new Date(日付);
        let 表示日付 = `${日付オブジェクト.getMonth() + 1}/${日付オブジェクト.getDate()}<br>${['日','月','火','水','木','金','土'][日付オブジェクト.getDay()]}`;
        let th = document.createElement('th');
        th.innerHTML = 表示日付;
        if (日付 === 今日) {
            th.classList.add('today-cell');
        }
        dateRow.appendChild(th);
    });

    // 教材の行をクリア
    tbody.innerHTML = '';

    // 教材ごとの行を生成
    教材一覧.forEach((教材, index) => {
        let tr = document.createElement('tr');
        let td = document.createElement('td');

        // 進捗バーの表示
        let barContainer = document.createElement('div');
        barContainer.classList.add('bar-container');
        let progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        let 完了数 = Object.values(教材.完了).reduce((a, b) => a + b, 0);
        let 進捗率 = (完了数 / 教材.問題数) * 100;
        progressBar.style.width = `${進捗率}%`;
        barContainer.appendChild(progressBar);
        barContainer.innerHTML += `${完了数}/${教材.問題数}`;
        td.appendChild(barContainer);
        tr.appendChild(td);

        // 日付ごとのセルを生成
        日付一覧.forEach(日付 => {
            let cell = document.createElement('td');
            cell.addEventListener('click', () => セルをクリック(index, 日付));
            let 割り当て数 = 教材.割り当て[日付] || 0;
            let 完了数 = 教材.完了[日付];

            if (完了数 !== undefined) {
                if (日付 === 今日) {
                    cell.innerHTML = `${完了数}/${割り当て数}`;
                    cell.classList.add('completed-cell');
                } else {
                    cell.innerHTML = 完了数;
                    cell.classList.add('completed-cell');
                }
            } else if (割り当て数 > 0) {
                cell.innerHTML = 割り当て数;
                cell.classList.add('assigned-cell');
            }

            // 今日の日付のセルの色変更
            if (日付 === 今日) {
                cell.classList.add('today-cell');
            }

            tr.appendChild(cell);
        });

        tbody.appendChild(tr);
    });
}

// セルをクリックしたときの処理
function セルをクリック(教材インデックス, 日付) {
    let 今日 = new Date().toISOString().split('T')[0];
    if (日付 > 今日) return;
    現在表示中の教材 = 教材インデックス;
    現在表示中の日付 = 日付;
    let 教材 = 教材一覧[教材インデックス];

    document.getElementById('modal-title').innerText = `${日付} ${教材.教材名}`;
    document.getElementById('完了した問題数').value = 教材.完了[日付] || '';
    document.getElementById('modal').style.display = 'block';
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 完了した問題数を保存
function saveCompletion() {
    let 完了した問題数 = parseInt(document.getElementById('完了した問題数').value) || 0;
    let 教材 = 教材一覧[現在表示中の教材];
    教材.完了[現在表示中の日付] = 完了した問題数;

    // 進捗の再計算
    再計算();
    保存する();
    描画する();
    closeModal();
}

// 割り当てと再計算
function 再計算() {
    教材一覧.forEach(教材 => {
        let 残りの問題数 = 教材.問題数 - Object.values(教材.完了).reduce((a, b) => a + b, 0);
        let 今日 = new Date();
        let 明日 = new Date();
        明日.setDate(今日.getDate() + 1);
        let 終了日 = new Date(教材.学習期間終了);

        let 残りの学習期間 = [];
        for (let 日付 = 明日; 日付 <= 終了日; 日付.setDate(日付.getDate() + 1)) {
            let 曜日 = ['日','月','火','水','木','金','土'][日付.getDay()];
            let 日付文字列 = 日付.toISOString().split('T')[0];
            if (教材.選択された曜日.includes(曜日)) {
                残りの学習期間.push(日付文字列);
            }
        }

        let 割り当て数 = Math.floor(残りの問題数 / 残りの学習期間.length);
        let 余り = 残りの問題数 % 残りの学習期間.length;

        教材.割り当て = {};

        残りの学習期間.forEach((日付, index) => {
            教材.割り当て[日付] = 割り当て数 + (index < 余り ? 1 : 0);
        });
    });
    描画する();
}

// データを保存
function 保存する() {
    localStorage.setItem('教材一覧', JSON.stringify(教材一覧));
}

// データを読み込み
function 読み込む() {
    let データ = localStorage.getItem('教材一覧');
    if (データ) {
        教材一覧 = JSON.parse(データ);
        再計算();
    }
}

// ウィンドウ読み込み時に実行
window.onload = function() {
    読み込む();
};
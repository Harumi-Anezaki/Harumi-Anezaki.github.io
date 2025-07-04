let 教材一覧 = [];
let 日付一覧 = [];
let 現在表示中の教材 = null;
let 現在表示中の日付 = null;

// ハンバーガーメニューの開閉
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// 曜日一括選択
function selectAllDays() {
    let 曜日チェックボックス = document.querySelectorAll('#曜日指定 input[type="checkbox"]');
    曜日チェックボックス.forEach(cb => cb.checked = true);
}

function clearAllDays() {
    let 曜日チェックボックス = document.querySelectorAll('#曜日指定 input[type="checkbox"]');
    曜日チェックボックス.forEach(cb => cb.checked = false);
}

// 教材を追加
function add教材() {
    let 教材名Input = document.getElementById('教材名');
    let 問題数Input = document.getElementById('問題数');
    let 学習期間開始Input = document.getElementById('学習期間開始');
    let 学習期間終了Input = document.getElementById('学習期間終了');

    let 教材名 = 教材名Input.value.trim();
    let 問題数 = parseInt(問題数Input.value);
    let 学習期間開始 = 学習期間開始Input.value;
    let 学習期間終了 = 学習期間終了Input.value;

    let 曜日チェックボックス = document.querySelectorAll('#曜日指定 input[type="checkbox"]');
    let 選択された曜日 = [];
    曜日チェックボックス.forEach(cb => {
        if (cb.checked) 選択された曜日.push(cb.value);
    });

    if (!教材名 || !問題数 || !学習期間開始 || !学習期間終了 || 選択された曜日.length === 0) {
        openErrorModal();
        return;
    }

    let 新しい教材 = {
        教材名,
        問題数,
        学習期間開始: new Date(学習期間開始),
        学習期間終了: new Date(学習期間終了),
        選択された曜日,
        割り当て: {},
        完了: {}
    };

    教材一覧.push(新しい教材);

    // 入力欄をクリア
    教材名Input.value = '';
    問題数Input.value = '';
    学習期間開始Input.value = '';
    学習期間終了Input.value = '';
    曜日チェックボックス.forEach(cb => cb.checked = false);

    再計算();
    saveData();
    描画する();
    toggleSidebar();
}

// エラーモーダルを開く
function openErrorModal() {
    document.getElementById('error-modal').style.display = 'block';
}

// エラーモーダルを閉じる
function closeErrorModal() {
    document.getElementById('error-modal').style.display = 'none';
}

// 日付の生成
function 生成日付一覧() {
    let 全ての日付 = new Set();
    教材一覧.forEach(教材 => {
        let 開始日 = new Date(教材.学習期間開始);
        let 終了日 = new Date(教材.学習期間終了);

        for (let 日付 = new Date(開始日); 日付 <= 終了日; 日付.setDate(日付.getDate() + 1)) {
            全ての日付.add(new Date(日付).toISOString().split('T')[0]);
        }
    });
    日付一覧 = Array.from(全ての日付).sort();
}

// カレンダーの描画
function 描画する() {
    生成日付一覧();
    let thead = document.querySelector('#scheduler thead tr');
    let tbody = document.querySelector('#scheduler tbody');

    // 日付のヘッダーをクリア
    thead.innerHTML = '<th id="fixed-header">教材</th>';

    // 今日の日付を取得
    let 現在 = new Date();
    let 今日文字列 = 現在.toISOString().split('T')[0];

    // 日付セルの生成
    日付一覧.forEach((日付, index) => {
        let 日付オブジェクト = new Date(日付);
        let 表示日付 = `${日付オブジェクト.getMonth() + 1}/${日付オブジェクト.getDate()}<br>${['日','月','火','水','木','金','土'][日付オブジェクト.getDay()]}`;
        let th = document.createElement('th');
        th.innerHTML = 表示日付;
        if (日付 === 今日文字列) {
            th.classList.add('today-cell');
            th.style.backgroundColor = '#a78b94';
        }
        thead.appendChild(th);
    });

    // 教材の行をクリア
    tbody.innerHTML = '';

    // 教材ごとの行を生成
    教材一覧.forEach((教材, 教材インデックス) => {
        let tr = document.createElement('tr');
        let td = document.createElement('td');

        // 教材名の表示
        let title = document.createElement('div');
        title.innerText = 教材.教材名;
        td.appendChild(title);

        // 進捗バーの表示
        let barContainer = document.createElement('div');
        barContainer.classList.add('bar-container');
        let progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        let 完了数合計 = 0;
        for(let key in 教材.完了){
            if(教材.完了.hasOwnProperty(key)){
                完了数合計 += 教材.完了[key];
            }
        }
        let 進捗率 = (完了数合計 / 教材.問題数) * 100;
        progressBar.style.width = `${進捗率}%`;
        barContainer.appendChild(progressBar);
        let barText = document.createElement('div');
        barText.classList.add('bar-text');
        barText.innerText = `${完了数合計}/${教材.問題数}`;
        barContainer.appendChild(barText);
        td.appendChild(barContainer);

        // 教材削除ボタン
        let deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.onclick = () => openDeleteModal(教材インデックス);
        td.appendChild(deleteButton);

        tr.appendChild(td);

        // 日付ごとのセルを生成
        日付一覧.forEach(日付 => {
            let cell = document.createElement('td');
            cell.addEventListener('click', () => セルをクリック(教材インデックス, 日付));

            let 割り当て数 = 教材.割り当て[日付];
            let 完了数 = 教材.完了[日付];

            let 日付Date = new Date(日付);
            let 今日Date = new Date();

            if (日付Date < 今日Date.setHours(0,0,0,0)) {
                // 過去の日付
                if (完了数 !== undefined) {
                    if (完了数 === 0) {
                        cell.innerHTML = '0';
                        cell.style.backgroundColor = '#1a1a1a';
                    } else {
                        cell.innerHTML = 完了数;
                        cell.style.backgroundColor = '#7bc2c8';
                    }
                }
            } else if (日付 === 今日文字列) {
                // 今日
                if (完了数 !== undefined) {
                    if (割り当て数 !== undefined) {
                        cell.innerHTML = `${完了数}/${割り当て数}`;
                    } else {
                        cell.innerHTML = 完了数;
                    }
                    cell.style.backgroundColor = '#72b5ba'; // バグ修正: 今日の完了入力後のセルの色を#72b5baに設定
                } else if (割り当て数 !== undefined) {
                    cell.innerHTML = 割り当て数;
                    cell.style.backgroundColor = '#5b9094';
                } else {
                    cell.innerHTML = '';
                    cell.style.backgroundColor = '#a78b94';
                }
            } else {
                // 未来の日付
                if (割り当て数 !== undefined) {
                    cell.innerHTML = 割り当て数;
                    cell.style.backgroundColor = '#5b9094';
                }
            }

            tr.appendChild(cell);
        });

        tbody.appendChild(tr);
    });

    // 今日の日付を2列目に持ってくる
    let tableContainer = document.querySelector('.table-container');
    let cellWidth = 80; // セル幅
    let todayIndex = 日付一覧.indexOf(今日文字列);
    if (todayIndex > 0) {
        let scrollAmount = cellWidth * (todayIndex - 1); // バグ修正: 今日の日付が2列目に来るように調整
        tableContainer.scrollLeft = scrollAmount;
    }
}

// セルをクリックしたときの処理
function セルをクリック(教材インデックス, 日付) {
    let 今日 = new Date();
    今日.setHours(0,0,0,0);
    if (new Date(日付) > 今日) return;
    現在表示中の教材 = 教材インデックス;
    現在表示中の日付 = 日付;
    let 教材 = 教材一覧[教材インデックス];

    document.getElementById('completion-modal-title').innerText = `${日付} ${教材.教材名}`;
    document.getElementById('完了した問題数').value = 教材.完了[日付] || '';
    document.getElementById('completion-modal').style.display = 'block';
}

// モーダルを閉じる
function closeCompletionModal() {
    document.getElementById('completion-modal').style.display = 'none';
}

// 完了した問題数を保存
function saveCompletion() {
    let 完了した問題数 = parseInt(document.getElementById('完了した問題数').value) || 0;
    let 教材 = 教材一覧[現在表示中の教材];
    教材.完了[現在表示中の日付] = 完了した問題数;

    // 進捗の再計算
    再計算();
    saveData();
    描画する();
    closeCompletionModal();
}

// 割り当てと再計算
function 再計算() {
    let 今日 = new Date();
    今日.setHours(0,0,0,0);
    let 今日文字列 = 今日.toISOString().split('T')[0];

    教材一覧.forEach(教材 => {

        // 過去の日付で未入力のセルを0に設定
        for(let 日付 = new Date(教材.学習期間開始); 日付 < 今日; 日付.setDate(日付.getDate() + 1)) {
            let 日付文字列 = 日付.toISOString().split('T')[0];
            let 曜日 = ['日','月','火','水','木','金','土'][日付.getDay()];
            if (教材.選択された曜日.includes(曜日)) {
                if(教材.完了[日付文字列] === undefined) {
                    教材.完了[日付文字列] = 0;
                }
            }
        }

        // 完了した問題数の合計を計算
        let 完了した問題数合計 = 0;
        for(let 日付 in 教材.完了) {
            if (教材.完了.hasOwnProperty(日付)) {
                完了した問題数合計 += 教材.完了[日付];
            }
        }

        let 残りの問題数 = 教材.問題数 - 完了した問題数合計;

        // 現在の日付を取得（自動的に更新されるように修正）
        let 現在 = new Date();
        現在.setHours(0,0,0,0);
        let 割り当て開始日 = new Date(現在);
        if (教材.完了[今日文字列] !== undefined) {
            // 今日の完了数が入力されている場合、翌日から割り当てを開始
            割り当て開始日.setDate(割り当て開始日.getDate() + 1);
        }

        // 残りの学習日を計算
        let 残りの学習期間 = [];
        for (let 日付 = new Date(割り当て開始日); 日付 <= 教材.学習期間終了; 日付.setDate(日付.getDate() + 1)) {
            let 曜日 = ['日','月','火','水','木','金','土'][日付.getDay()];
            if (教材.選択された曜日.includes(曜日)) {
                let 日付文字列 = 日付.toISOString().split('T')[0];
                残りの学習期間.push(日付文字列);
            }
        }

        // 割り当て数を計算
        let 割り当て数 = 残りの学習期間.length > 0 ? Math.floor(残りの問題数 / 残りの学習期間.length) : 0;
        let 余り = 残りの学習期間.length > 0 ? 残りの問題数 % 残りの学習期間.length : 0;

        教材.割り当て = {};

        残りの学習期間.forEach((日付, index) => {
            教材.割り当て[日付] = 割り当て数 + (index < 余り ? 1 : 0);
        });
    });
}

// データを保存
function saveData() {
    localStorage.setItem('教材一覧', JSON.stringify(教材一覧));
}

// データを読み込み
function loadData() {
    let データ = localStorage.getItem('教材一覧');
    if (データ) {
        教材一覧 = JSON.parse(データ);
        // 日付をDateオブジェクトに復元
        教材一覧.forEach(教材 => {
            教材.学習期間開始 = new Date(教材.学習期間開始);
            教材.学習期間終了 = new Date(教材.学習期間終了);
        });
        再計算();
        描画する();
    } else {
        描画する();
    }
}

// 日付の変化を検知して再描画
function checkDateChange() {
    let 現在の日付 = new Date();
    現在の日付.setHours(0,0,0,0);
    if (現在の日付.toISOString() !== localStorage.getItem('前回の日付')) {
        再計算();
        描画する();
        localStorage.setItem('前回の日付', 現在の日付.toISOString());
    }
}

// 1時間おきに日付の変化をチェック
setInterval(checkDateChange, 60 * 60 * 1000);

// 教材削除モーダルを開く
function openDeleteModal(教材インデックス) {
    現在表示中の教材 = 教材インデックス;
    document.getElementById('delete-modal').style.display = 'block';
}

// 教材削除モーダルを閉じる
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}

// 教材を削除
function delete教材() {
    教材一覧.splice(現在表示中の教材, 1);
    saveData();
    描画する();
    closeDeleteModal();
}

// ウィンドウ読み込み時に実行
window.onload = function() {
    loadData();
    // 初回の日付を保存
    let 現在 = new Date();
    現在.setHours(0,0,0,0);
    localStorage.setItem('前回の日付', 現在.toISOString());
};
// フォームとカレンダーの要素を取得
const materialForm = document.getElementById('material-form');
const studyCalendar = document.getElementById('study-calendar');
const modal = document.getElementById('modal');
const modalBackground = document.getElementById('modal-background');
const modalContent = document.getElementById('modal-content');

// 保存されたデータをロード
let materials = JSON.parse(localStorage.getItem('materials')) || [];

// 今日の日付を取得
const today = new Date();
today.setHours(0, 0, 0, 0);

// 曜日配列
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

// 教材を追加する関数
function addMaterial(event) {
    event.preventDefault();

    // フォームから値を取得
    const name = document.getElementById('material-name').value;
    const problemCount = parseInt(document.getElementById('problem-count').value);
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);

    let selectedWeekdays = [];
    const allWeekdaysChecked = document.getElementById('all-weekdays').checked;
    if (allWeekdaysChecked) {
        selectedWeekdays = [0, 1, 2, 3, 4, 5, 6];
    } else {
        ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((id) => {
            const checkbox = document.getElementById(id);
            if (checkbox.checked) {
                selectedWeekdays.push(parseInt(checkbox.value));
            }
        });
    }

    // 教材オブジェクトを作成
    const material = {
        id: generateId(),
        name,
        problemCount,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        selectedWeekdays,
        completedProblems: 0,
        allocations: {}, // 日付ごとの割り当て問題数
        completions: {}  // 日付ごとの完了問題数
    };

    // 初期割り当てを計算
    calculateAllocations(material);

    materials.push(material);

    // カレンダーを再描画
    renderCalendar();

    // 教材を保存
    saveData();

    // フォームをリセット
    materialForm.reset();
}

// 教材IDを生成する関数
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// 教材の割り当てを計算する関数
function calculateAllocations(material) {
    const allocations = {};
    const startDate = new Date(material.startDate);
    const endDate = new Date(material.endDate);

    // 今日以降の学習期間の日付リストを作成
    let dateList = [];
    let currentDate = new Date(Math.max(startDate, today));
    while (currentDate <= endDate) {
        if (material.selectedWeekdays.includes(currentDate.getDay())) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dateList.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 総日数と初期割り当て
    const totalDays = dateList.length;
    let remainingProblems = material.problemCount - getCompletedProblems(material);
    let baseAllocation = Math.floor(remainingProblems / totalDays);
    let remainder = remainingProblems % totalDays;

    // 割り当てを計算
    dateList.forEach((dateStr, index) => {
        allocations[dateStr] = baseAllocation + (index < remainder ? 1 : 0);
    });

    material.allocations = allocations;
}

// 教材の再割り当てを計算する関数
function recalculateAllocations(material) {
    const allocations = {};
    const startDate = new Date(material.startDate);
    const endDate = new Date(material.endDate);

    // 今日以降の学習期間の日付リストを作成
    let dateList = [];
    let currentDate = new Date(Math.max(startDate, today));
    while (currentDate <= endDate) {
        if (material.selectedWeekdays.includes(currentDate.getDay())) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dateList.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 過ぎた日付の未入力を0とする
    for (let dateStr in material.allocations) {
        const dateObj = new Date(dateStr);
        if (dateObj < today && !(dateStr in material.completions)) {
            material.completions[dateStr] = 0;
        }
    }

    // 総日数と再計算
    const totalDays = dateList.length;
    let remainingProblems = material.problemCount - getCompletedProblems(material);
    let baseAllocation = Math.floor(remainingProblems / totalDays);
    let remainder = remainingProblems % totalDays;

    // 再割り当てを計算
    dateList.forEach((dateStr, index) => {
        allocations[dateStr] = baseAllocation + (index < remainder ? 1 : 0);
    });

    material.allocations = allocations;
}

// カレンダーを描画する関数
function renderCalendar() {
    // テーブルをクリア
    studyCalendar.innerHTML = '';

    // 日付リストを作成
    let dateSet = new Set();
    materials.forEach(material => {
        let date = new Date(material.startDate);
        const endDate = new Date(material.endDate);
        while (date <= endDate) {
            if (material.selectedWeekdays.includes(date.getDay())) {
                const dateStr = date.toISOString().split('T')[0];
                dateSet.add(dateStr);
            }
            date.setDate(date.getDate() + 1);
        }
    });

    // 日付リストをソート
    let dateList = Array.from(dateSet);
    dateList.sort();

    // デフォルトで今日が2列目に来るように調整
    let todayIndex = dateList.indexOf(today.toISOString().split('T')[0]);
    if (todayIndex > 0) {
        const leftDates = dateList.splice(0, todayIndex - 1);
        dateList = dateList.concat(leftDates);
    }

    // ヘッダー行を作成
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    emptyHeader.innerText = '教材 / 日付';
    headerRow.appendChild(emptyHeader);

    // ヘッダーに日付を追加
    dateList.forEach(dateStr => {
        const dateObj = new Date(dateStr);
        const th = document.createElement('th');
        th.innerHTML = `${dateObj.getMonth()+1}/${dateObj.getDate()}<br>${weekdays[dateObj.getDay()]}`;
        if (dateObj.getTime() === today.getTime()) {
            th.classList.add('today-date');
        }
        headerRow.appendChild(th);
    });

    studyCalendar.appendChild(headerRow);

    // 教材ごとに行を作成
    materials.forEach(material => {
        const row = document.createElement('tr');

        // 教材名セル
        const nameCell = document.createElement('th');
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');

        const progressFill = document.createElement('div');
        progressFill.classList.add('progress-fill');
        const progressPercentage = (getCompletedProblems(material) / material.problemCount) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        const progressText = document.createElement('div');
        progressText.classList.add('progress-text');
        progressText.innerText = `${getCompletedProblems(material)}/${material.problemCount}`;

        progressBar.appendChild(progressFill);
        progressBar.appendChild(progressText);

        nameCell.appendChild(progressBar);

        // 教材削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.addEventListener('click', () => {
            openDeleteModal(material);
        });
        nameCell.appendChild(deleteButton);

        row.appendChild(nameCell);

        // 日付ごとにセルを作成
        dateList.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const cell = document.createElement('td');

            // 割り当てられた問題数
            const allocation = material.allocations[dateStr];
            // 完了した問題数
            const completion = material.completions[dateStr];

            // セルの色と表示を設定
            if (allocation !== undefined) {
                cell.classList.add('assigned-cell');
                if (dateObj.getTime() === today.getTime() && completion !== undefined) {
                    cell.innerText = `${completion}/${allocation}`;
                    cell.classList.add('completed-today-cell');
                } else if (dateObj < today && completion !== undefined) {
                    cell.innerText = `${completion}`;
                    cell.classList.add('completed-cell');
                } else if (dateObj < today && completion === undefined) {
                    cell.innerText = `${allocation}`;
                    cell.classList.add('assigned-cell');
                } else {
                    cell.innerText = `${allocation}`;
                }
            } else {
                cell.innerText = '';
            }

            // 今日の日付のセルを赤くする
            if (dateObj.getTime() === today.getTime()) {
                cell.classList.add('today-date');
            }

            // セルをクリックしたときの処理
            if (dateObj <= today) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', () => {
                    openCompletionModal(dateObj, material);
                });
            }

            row.appendChild(cell);
        });

        studyCalendar.appendChild(row);
    });
}

// 教材の完了問題数を取得する関数
function getCompletedProblems(material) {
    let total = 0;
    for (let key in material.completions) {
        total += material.completions[key];
    }
    return total;
}

// 完了問題数を入力するモーダルを開く関数
function openCompletionModal(dateObj, material) {
    const dateStr = dateObj.toISOString().split('T')[0];
    const allocation = material.allocations[dateStr] || 0;

    modalContent.innerHTML = `
        <p>${dateObj.getMonth()+1}/${dateObj.getDate()}(${weekdays[dateObj.getDay()]}) ${material.name}</p>
        <label for="completed-count">完了した問題数：</label>
        <input type="number" id="completed-count" min="0" max="1000" value="${material.completions[dateStr] || ''}"><br>
        <button id="save-button">保存</button>
        <button id="close-button">閉じる</button>
    `;

    // 保存ボタンのイベント
    document.getElementById('save-button').addEventListener('click', () => {
        const completedCount = parseInt(document.getElementById('completed-count').value) || 0;
        material.completions[dateStr] = completedCount;

        // 再計算
        recalculateAllocations(material);

        // 保存して再描画
        saveData();
        renderCalendar();
        closeModal();
    });

    // 閉じるボタンのイベント
    document.getElementById('close-button').addEventListener('click', () => {
        closeModal();
    });

    modal.classList.remove('modal-hidden');
    modalBackground.classList.remove('modal-hidden');
}

// 教材削除のモーダルを開く関数
function openDeleteModal(material) {
    modalContent.innerHTML = `
        <p>「${material.name}」を削除しますか？</p>
        <button id="delete-button">削除</button>
        <button id="close-button">キャンセル</button>
    `;

    // 削除ボタンのイベント
    document.getElementById('delete-button').addEventListener('click', () => {
        materials = materials.filter(item => item.id !== material.id);
        saveData();
        renderCalendar();
        closeModal();
    });

    // キャンセルボタンのイベント
    document.getElementById('close-button').addEventListener('click', () => {
        closeModal();
    });

    modal.classList.remove('modal-hidden');
    modalBackground.classList.remove('modal-hidden');
}

// モーダルを閉じる関数
function closeModal() {
    modal.classList.add('modal-hidden');
    modalBackground.classList.add('modal-hidden');
}

// データを保存する関数
function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
}

// データをロードする関数（ロードボタン用）
function loadData() {
    materials = JSON.parse(localStorage.getItem('materials')) || [];
    renderCalendar();
}

// 保存ボタンのイベント
document.getElementById('save-button').addEventListener('click', () => {
    saveData();
    alert('データを保存しました。');
});

// ロードボタンのイベント
document.getElementById('load-button').addEventListener('click', () => {
    loadData();
    alert('データをロードしました。');
});

// 全ての曜日を選択・解除するイベント
document.getElementById('all-weekdays').addEventListener('change', (event) => {
    const checked = event.target.checked;
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((id) => {
        document.getElementById(id).checked = checked;
    });
});

// 各曜日のチェックボックスが変更されたら、「全て」のチェックを外す
['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
        if (!document.getElementById(id).checked) {
            document.getElementById('all-weekdays').checked = false;
        }
    });
});

// イベントの設定
materialForm.addEventListener('submit', addMaterial);

// 初期表示
renderCalendar();
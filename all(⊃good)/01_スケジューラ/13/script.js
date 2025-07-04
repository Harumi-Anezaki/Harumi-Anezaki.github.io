// フォームとカレンダーの要素を取得
const materialForm = document.getElementById('material-form');
const studyCalendar = document.getElementById('study-calendar');
const modal = document.getElementById('modal');
const modalBackground = document.getElementById('modal-background');
const modalContent = document.getElementById('modal-content');

// 保存されたデータをロード
let materials = JSON.parse(localStorage.getItem('materials')) || [];
let calendarData = JSON.parse(localStorage.getItem('calendarData')) || {};

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

    const selectedWeekdays = [];
    ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((id, index) => {
        if (document.getElementById(id).checked) {
            selectedWeekdays.push(index);
        }
    });

    // 教材オブジェクトを作成
    const material = {
        name,
        problemCount,
        startDate,
        endDate,
        selectedWeekdays,
        completedProblems: 0
    };

    materials.push(material);

    // カレンダーを再描画
    renderCalendar();

    // 教材を保存
    saveData();

    // フォームをリセット
    materialForm.reset();
}

// カレンダーを描画する関数
function renderCalendar() {
    // テーブルをクリア
    studyCalendar.innerHTML = '';

    // ヘッダー行を作成
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);

    // 日付リストを作成
    const dateList = [];
    materials.forEach(material => {
        let date = new Date(material.startDate);
        while (date <= material.endDate) {
            const dateStr = date.toISOString().split('T')[0];
            if (!dateList.includes(dateStr)) {
                dateList.push(dateStr);
            }
            date.setDate(date.getDate() + 1);
        }
    });

    // 日付リストをソート
    dateList.sort();

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
        const progressPercentage = (material.completedProblems / material.problemCount) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        const progressText = document.createElement('div');
        progressText.classList.add('progress-text');
        progressText.innerText = `${material.completedProblems}/${material.problemCount}`;

        progressBar.appendChild(progressFill);
        progressBar.appendChild(progressText);

        nameCell.appendChild(progressBar);
        row.appendChild(nameCell);

        // 日付ごとにセルを作成
        dateList.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const cell = document.createElement('td');

            // セルに問題数を割り当て
            // ここでセルの計算を実装する
            // （例として単純に問題数を表示）
            cell.innerText = '';

            // 今日以降の学習期間であれば割り当て
            if (dateObj >= today && dateObj >= material.startDate && dateObj <= material.endDate) {
                cell.innerText = ''; // 割り当てられた問題数を計算して表示
                cell.classList.add('assigned-cell');
            }

            // 今日の日付のセルを赤くする
            if (dateObj.getTime() === today.getTime()) {
                cell.classList.add('today-date');
            }

            // セルをクリックしたときの処理
            if (dateObj <= today) {
                cell.addEventListener('click', () => {
                    openModal(dateObj, material);
                });
            }

            row.appendChild(cell);
        });

        studyCalendar.appendChild(row);
    });
}

// モーダルを開く関数
function openModal(dateObj, material) {
    modalContent.innerHTML = `
        <p>${material.name} - ${dateObj.getMonth()+1}/${dateObj.getDate()}(${weekdays[dateObj.getDay()]})</p>
        <label for="completed-count">完了した問題数：</label>
        <input type="number" id="completed-count" min="0"><br>
        <button id="save-button">保存</button>
        <button id="close-button">閉じる</button>
    `;

    // 保存ボタンのイベント
    document.getElementById('save-button').addEventListener('click', () => {
        const completedCount = parseInt(document.getElementById('completed-count').value);
        // 完了した問題数を保存
        // ここでデータを更新し、再計算を行う
        material.completedProblems += completedCount; // 仮の処理

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

// モーダルを閉じる関数
function closeModal() {
    modal.classList.add('modal-hidden');
    modalBackground.classList.add('modal-hidden');
}

// データを保存する関数
function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
    // localStorage.setItem('calendarData', JSON.stringify(calendarData));
}

// イベントの設定
materialForm.addEventListener('submit', addMaterial);

// 初期表示
renderCalendar();
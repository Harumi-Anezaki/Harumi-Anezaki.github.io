// グローバル変数の定義
let materials = [];
let calendarTable = document.getElementById('calendar-table');
let modal = document.getElementById('modal');
let closeModal = document.getElementById('close-modal');
let modalMaterialDate = document.getElementById('modal-material-date');
let completedCountInput = document.getElementById('completed-count');
let modalSubmit = document.getElementById('modal-submit');
let selectedMaterialIndex = null;
let selectedDate = null;

// ハンバーガーメニューのトグル機能
document.getElementById('hamburger-icon').addEventListener('click', function() {
    let menu = document.getElementById('menu');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
});

// '全曜日選択'チェックボックスの処理
document.getElementById('weekday-all').addEventListener('change', function() {
    let weekdays = document.querySelectorAll('input[name="weekdays"]');
    weekdays.forEach(function(checkbox) {
        checkbox.checked = document.getElementById('weekday-all').checked;
    });
});

// 教材データをlocalStorageから読み込む
function loadMaterials() {
    let savedMaterials = localStorage.getItem('materials');
    if (savedMaterials) {
        materials = JSON.parse(savedMaterials);
    }
}

// 教材データをlocalStorageに保存する
function saveMaterials() {
    localStorage.setItem('materials', JSON.stringify(materials));
}

// 新しい教材を追加する
document.getElementById('material-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let name = document.getElementById('material-name').value;
    let problemCount = parseInt(document.getElementById('problem-count').value);
    let startDate = document.getElementById('start-date').value;
    let endDate = document.getElementById('end-date').value;
    let weekdays = [];
    let weekdayCheckboxes = document.querySelectorAll('input[name="weekdays"]:checked');
    weekdayCheckboxes.forEach(function(checkbox) {
        weekdays.push(parseInt(checkbox.value));
    });
    if (weekdays.length === 0) {
        alert('少なくとも1つの曜日を選択してください。');
        return;
    }
    let material = {
        name: name,
        problemCount: problemCount,
        startDate: startDate,
        endDate: endDate,
        weekdays: weekdays,
        completed: {}, // 日付ごとの完了した問題数
        remainingProblems: problemCount
    };
    materials.push(material);
    saveMaterials();
    renderCalendar();
    this.reset();
});

// カレンダーをレンダリングする
function renderCalendar() {
    // 既存のテーブルをクリア
    while (calendarTable.firstChild) {
        calendarTable.removeChild(calendarTable.firstChild);
    }

    // テーブルヘッダーの作成
    let headerRow = document.createElement('tr');
    let dateHeader = document.createElement('th');
    dateHeader.innerText = '日付 / 教材';
    headerRow.appendChild(dateHeader);

    materials.forEach(function(material, index) {
        let materialHeader = document.createElement('th');
        materialHeader.innerText = material.name;
        // 完了済みの教材に削除ボタンを追加
        if (material.remainingProblems === 0) {
            let deleteButton = document.createElement('button');
            deleteButton.innerText = '削除';
            deleteButton.addEventListener('click', function() {
                materials.splice(index,1);
                saveMaterials();
                renderCalendar();
            });
            materialHeader.appendChild(deleteButton);
        }
        headerRow.appendChild(materialHeader);
    });

    calendarTable.appendChild(headerRow);

    // 日付の範囲を取得
    let allDates = getAllDates();

    // 各日付の行を作成
    for (let i = 0; i < allDates.length; i++) {
        let date = allDates[i];
        let row = document.createElement('tr');
        let dateCell = document.createElement('td');
        dateCell.innerText = formatDateDisplay(date);
        row.appendChild(dateCell);

        // 今日の日付かどうかをチェック
        let today = new Date();
        if (isSameDate(date, today)) {
            row.classList.add('today-row');
        }

        materials.forEach(function(material, materialIndex) {
            let cell = document.createElement('td');
            // 学習期間内かつ指定された曜日かどうかを確認
            if (date >= new Date(material.startDate) && date <= new Date(material.endDate) && material.weekdays.includes(date.getDay())) {
                let problemsPerDay = calculateProblemsPerDay(material, date);
                cell.innerText = problemsPerDay;

                if (date <= today) {
                    // セルをクリック可能にして完了数を入力
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', function() {
                        selectedMaterialIndex = materialIndex;
                        selectedDate = date;
                        modalMaterialDate.innerText = material.name + ' - ' + formatDateDisplay(date);
                        completedCountInput.value = material.completed[formatDate(date)] || '';
                        modal.style.display = 'block';
                    });
                }
            } else {
                cell.innerText = '-';
            }
            row.appendChild(cell);
        });

        calendarTable.appendChild(row);
    }
}

// 最小の開始日から最大の終了日までの日付を取得
function getAllDates() {
    let dates = [];
    let start = null;
    let end = null;
    materials.forEach(function(material) {
        let materialStart = new Date(material.startDate);
        let materialEnd = new Date(material.endDate);
        if (!start || materialStart < start) start = materialStart;
        if (!end || materialEnd > end) end = materialEnd;
    });
    if (!start || !end) return dates;
    let currentDate = new Date(start);
    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// 1日あたりの問題数を計算
function calculateProblemsPerDay(material, date) {
    let remainingProblems = material.remainingProblems;
    let remainingDays = getRemainingDays(material, date);
    if (remainingDays > 0) {
        return Math.ceil(remainingProblems / remainingDays);
    } else {
        return 0;
    }
}

// ある日付からの残り日数を取得
function getRemainingDays(material, date) {
    let remainingDays = 0;
    let currentDate = new Date(date);
    let endDate = new Date(material.endDate);
    while (currentDate <= endDate) {
        if (material.weekdays.includes(currentDate.getDay())) {
            remainingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return remainingDays;
}

// モーダルを閉じる
closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
});

// 完了数を送信
modalSubmit.addEventListener('click', function() {
    let completedCount = parseInt(completedCountInput.value) || 0;
    let material = materials[selectedMaterialIndex];
    let dateKey = formatDate(selectedDate);

    // 完了した問題数を更新
    if (!material.completed[dateKey]) {
        material.completed[dateKey] = 0;
    }
    let previousCompleted = material.completed[dateKey];
    material.completed[dateKey] = completedCount;

    // 残りの問題数を更新
    let difference = completedCount - previousCompleted;
    material.remainingProblems -= difference;
    if (material.remainingProblems < 0) material.remainingProblems = 0;

    saveMaterials();
    modal.style.display = 'none';
    renderCalendar();
});

// 日付を文字列にフォーマット
function formatDate(date) {
    return date.getFullYear() + '-' + (('0'+(date.getMonth()+1)).slice(-2)) + '-' + ('0'+date.getDate()).slice(-2);
}

// 表示用に日付をフォーマット
function formatDateDisplay(date) {
    let weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + ' (' + weekdayNames[date.getDay()] + ')';
}

// 2つの日付が同じかどうかをチェック
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear()
        && date1.getMonth() === date2.getMonth()
        && date1.getDate() === date2.getDate();
}

// 初期化関数
function init() {
    loadMaterials();
    renderCalendar();
}

// '保存'ボタンの処理
document.getElementById('save-button').addEventListener('click', function() {
    saveMaterials();
    alert('保存しました。');
});

// ページ読み込み時に初期化
window.onload = init;
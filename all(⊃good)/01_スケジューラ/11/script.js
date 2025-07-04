// 要素の取得
const menuIcon = document.getElementById('menu-icon');
const sidebar = document.getElementById('sidebar');
const closeBtn = document.getElementById('close-btn');
const materialForm = document.getElementById('material-form');
const scheduleTable = document.getElementById('schedule-table');
const saveButton = document.getElementById('save-button');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalInfo = document.getElementById('modal-info');
const completedCountInput = document.getElementById('completed-count');
const modalSubmit = document.getElementById('modal-submit');
const saveModal = document.getElementById('save-modal');
const saveModalClose = document.getElementById('save-modal-close');
const saveModalOk = document.getElementById('save-modal-ok');

let materials = [];
let dates = [];
let currentCell = null;

// サイドバーの開閉
menuIcon.addEventListener('click', () => {
    sidebar.classList.add('open');
});

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

// 教材の追加
materialForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('material-name').value;
    const problemCount = parseInt(document.getElementById('problem-count').value);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (new Date(startDate) > new Date(endDate)) {
        alert('開始日は終了日より前に設定してください。');
        return;
    }

    const material = {
        name,
        problemCount,
        startDate,
        endDate,
        allocations: {},
        completed: {},
        progress: 0
    };

    materials.push(material);
    updateTable();
    sidebar.classList.remove('open');
    materialForm.reset();
});

// テーブルの更新
function updateTable() {
    // 日付の生成
    generateDates();

    // テーブルのクリア
    scheduleTable.innerHTML = '';

    // テーブルヘッダーの生成
    const headerRow = document.createElement('tr');
    const dateHeader = document.createElement('th');
    dateHeader.textContent = '日付';
    headerRow.appendChild(dateHeader);

    dates.forEach((dateObj) => {
        const th = document.createElement('th');
        th.innerHTML = `${dateObj.month}/${dateObj.date}<br>${dateObj.weekday}`;
        th.classList.add('date-header');
        if (isToday(dateObj.fullDate)) {
            th.classList.add('today-header');
        }
        headerRow.appendChild(th);
    });

    scheduleTable.appendChild(headerRow);

    // 各教材の行を生成
    materials.forEach((material) => {
        // 割り当ての計算
        calculateAllocations(material);

        // 各日付の行を生成
        dates.forEach((dateObj, dateIndex) => {
            let row;
            if (dateIndex === 0) {
                row = document.createElement('tr');
                const materialCell = document.createElement('td');
                materialCell.textContent = material.name;
                materialCell.classList.add('material-cell');
                row.appendChild(materialCell);
            } else {
                row = scheduleTable.rows[dateIndex + 1];
            }

            // 日付セルの生成
            const cell = document.createElement('td');

            const dateKey = dateObj.fullDate;
            const allocation = material.allocations[dateKey];
            const completed = material.completed[dateKey];

            if (allocation != null) {
                cell.classList.add('allocated-cell');
                cell.textContent = allocation;
            }

            if (completed != null) {
                if (isSameDay(new Date(dateKey), new Date())) {
                    cell.classList.add('completed-today-cell');
                    cell.textContent = `${completed}/${allocation || ''}`;
                } else {
                    cell.classList.add('completed-cell');
                    cell.textContent = completed;
                }
            }

            // 今日のセルの色付け
            if (isToday(dateObj.fullDate)) {
                cell.classList.add('today-cell');
            }

            // 過去日付のセル
            if (new Date(dateKey) < new Date()) {
                cell.classList.add('past-cell');
            }

            // セルのクリックイベント
            if (new Date(dateKey) <= new Date()) {
                cell.addEventListener('click', () => {
                    currentCell = {
                        material,
                        dateKey,
                        cell,
                        allocation
                    };
                    openModal(dateObj.displayDate, material.name);
                });
            }

            row.appendChild(cell);

            if (dateIndex === 0) {
                scheduleTable.appendChild(row);
            }
        });
    });

    // 今日の日付が2列目に来るようにスクロール
    const headerCells = scheduleTable.querySelectorAll('th');
    let todayIndex = 1;
    headerCells.forEach((cell, index) => {
        if (cell.classList.contains('today-header')) {
            todayIndex = index;
        }
    });
    const scrollX = (todayIndex - 1) * 85; // カラム幅に応じて調整
    scheduleTable.parentElement.scrollLeft = scrollX;
}

// 日付の生成
function generateDates() {
    dates = [];
    let allDates = [];

    materials.forEach(material => {
        let start = new Date(material.startDate);
        let end = new Date(material.endDate);

        while (start <= end) {
            const dateStr = start.toISOString().split('T')[0];
            if (!allDates.find(d => d.fullDate === dateStr)) {
                const weekdayNum = start.getDay();
                const weekdayStr = ['日', '月', '火', '水', '木', '金', '土'][weekdayNum];
                allDates.push({
                    fullDate: dateStr,
                    date: start.getDate(),
                    month: start.getMonth() + 1,
                    weekday: weekdayStr,
                    displayDate: `${start.getMonth() + 1}/${start.getDate()} ${weekdayStr}`
                });
            }
            start.setDate(start.getDate() + 1);
        }
    });

    // 日付をソート
    allDates.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

    // 重複のない日付リストを作成
    dates = allDates;
}

// 割り当ての計算
function calculateAllocations(material) {
    // 未完了の問題数を計算
    let totalCompleted = 0;
    for (let key in material.completed) {
        if (new Date(key) <= new Date()) {
            totalCompleted += material.completed[key];
        }
    }

    // 過去の未入力を完了数0として扱う
    dates.forEach(dateObj => {
        const dateKey = dateObj.fullDate;
        if (new Date(dateKey) < new Date()) {
            if (material.completed[dateKey] == null) {
                material.completed[dateKey] = 0;
            }
        }
    });

    const remainingProblems = material.problemCount - totalCompleted;
    // 今日以降の学習日数を計算
    const today = new Date();
    let remainingDates = dates.filter(dateObj => {
        const date = new Date(dateObj.fullDate);
        return date >= today && date >= new Date(material.startDate) && date <= new Date(material.endDate);
    });

    // 割り当ての再計算
    material.allocations = {};
    if (remainingDates.length > 0) {
        const baseAllocation = Math.floor(remainingProblems / remainingDates.length);
        let remainder = remainingProblems % remainingDates.length;

        remainingDates.forEach(dateObj => {
            const dateKey = dateObj.fullDate;
            material.allocations[dateKey] = baseAllocation + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
        });
    }

    // 進捗の更新
    material.progress = totalCompleted;
}

// モーダルの表示
function openModal(dateDisplay, materialName) {
    modal.style.display = 'block';
    modalInfo.textContent = `${dateDisplay} ${materialName}`;
    completedCountInput.value = '';
    completedCountInput.focus();
}

// モーダルの閉じる
function closeModal() {
    modal.style.display = 'none';
}

// モーダルのイベント
modalClose.addEventListener('click', closeModal);

modalSubmit.addEventListener('click', () => {
    const completedCount = parseInt(completedCountInput.value);
    if (isNaN(completedCount) || completedCount < 0) {
        alert('正しい数値を入力してください。');
        return;
    }

    const { material, dateKey } = currentCell;
    material.completed[dateKey] = completedCount;
    calculateAllocations(material);
    updateTable();
    closeModal();
});

// 外側のクリックでモーダルを閉じる
window.addEventListener('click', (e) => {
    if (e.target == modal) {
        closeModal();
    }
    if (e.target == saveModal) {
        closeSaveModal();
    }
});

// 日付比較用関数
function isToday(dateStr) {
    const today = new Date();
    const targetDate = new Date(dateStr);
    return today.toDateString() === targetDate.toDateString();
}

function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

// 保存機能
saveButton.addEventListener('click', () => {
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
    openSaveModal();
});

// 保存モーダルの表示
function openSaveModal() {
    saveModal.style.display = 'block';
}

// 保存モーダルの閉じる
function closeSaveModal() {
    saveModal.style.display = 'none';
}

// 保存モーダルのイベント
saveModalClose.addEventListener('click', closeSaveModal);
saveModalOk.addEventListener('click', closeSaveModal);

// ロード時にデータを読み込む
window.addEventListener('load', () => {
    const savedData = localStorage.getItem('studyMaterials');
    if (savedData) {
        materials = JSON.parse(savedData);
        updateTable();
    }
});
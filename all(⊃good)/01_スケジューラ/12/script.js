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

const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteModalInfo = document.getElementById('delete-modal-info');
const deleteModalConfirm = document.getElementById('delete-modal-confirm');
const deleteModalCancel = document.getElementById('delete-modal-cancel');

const saveModal = document.getElementById('save-modal');
const saveModalClose = document.getElementById('save-modal-close');
const saveModalOk = document.getElementById('save-modal-ok');

const selectAllWeekdaysBtn = document.getElementById('select-all-weekdays');
const clearAllWeekdaysBtn = document.getElementById('clear-all-weekdays');
const weekdayCheckboxes = document.querySelectorAll('.weekdays input[type="checkbox"]');

let materials = [];
let dates = [];
let currentCell = null;
let currentMaterialIndex = null;

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
    const weekdayElems = document.querySelectorAll('.weekdays input[type="checkbox"]:checked');
    const weekdays = Array.from(weekdayElems).map(elem => elem.value);

    if (new Date(startDate) > new Date(endDate)) {
        alert('開始日は終了日より前に設定してください。');
        return;
    }

    const material = {
        name,
        problemCount,
        startDate,
        endDate,
        weekdays,
        allocations: {},
        completed: {},
        progress: 0
    };

    materials.push(material);
    updateTable();
    sidebar.classList.remove('open');
    materialForm.reset();
});

// 全て選択ボタン
selectAllWeekdaysBtn.addEventListener('click', () => {
    weekdayCheckboxes.forEach(checkbox => checkbox.checked = true);
});

// 全て解除ボタン
clearAllWeekdaysBtn.addEventListener('click', () => {
    weekdayCheckboxes.forEach(checkbox => checkbox.checked = false);
});

// テーブルの更新
function updateTable() {
    // 日付の生成
    generateDates();

    // テーブルのクリア
    scheduleTable.innerHTML = '';

    // 教材行の生成
    const headerRow = document.createElement('tr');
    const dateHeader = document.createElement('th');
    dateHeader.textContent = '日付';
    headerRow.appendChild(dateHeader);

    materials.forEach((material, materialIndex) => {
        const th = document.createElement('th');
        th.textContent = material.name;

        // 削除ボタン
        const deleteBtn = document.createElement('span');
        deleteBtn.textContent = ' 🗑️';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.addEventListener('click', () => {
            currentMaterialIndex = materialIndex;
            openDeleteModal(material.name);
        });
        th.appendChild(deleteBtn);

        // プログレスバー
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('progress-container');
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = `${(material.progress / material.problemCount) * 100}%`;
        progressBar.textContent = `${material.progress}/${material.problemCount}`;
        progressContainer.appendChild(progressBar);
        th.appendChild(progressContainer);

        headerRow.appendChild(th);
    });
    scheduleTable.appendChild(headerRow);

    // 日付ごとの行を生成
    dates.forEach((dateObj) => {
        const row = document.createElement('tr');

        // 日付セル
        const dateCell = document.createElement('td');
        dateCell.innerHTML = `${dateObj.month}/${dateObj.date}<br>${dateObj.weekday}`;
        dateCell.classList.add('date-cell');
        if (isToday(dateObj.fullDate)) {
            dateCell.classList.add('today-cell');
        }
        row.appendChild(dateCell);

        // 各教材のセル
        materials.forEach((material) => {
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
        });

        scheduleTable.appendChild(row);
    });

    // 今日の日付が2列目に来るようにスクロール
    const dateCells = scheduleTable.querySelectorAll('.date-cell');
    let todayIndex = 0;
    dateCells.forEach((cell, index) => {
        if (cell.classList.contains('today-cell')) {
            todayIndex = index;
        }
    });
    const scrollY = (todayIndex - 1) * 40; // 行高さに応じて調整
    scheduleTable.parentElement.scrollTop = scrollY;
}

// 日付の生成
function generateDates() {
    dates = [];
    let allDates = new Set();

    materials.forEach(material => {
        let start = new Date(material.startDate);
        let end = new Date(material.endDate);

        while (start <= end) {
            const weekdayNum = start.getDay();
            const weekdayStr = ['日', '月', '火', '水', '木', '金', '土'][weekdayNum];

            if (material.weekdays.length === 0 || material.weekdays.includes(weekdayStr)) {
                const dateStr = start.toISOString().split('T')[0];
                allDates.add(dateStr);
            }
            start.setDate(start.getDate() + 1);
        }
    });

    // 日付をソートしてリスト化
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
    sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const weekdayNum = date.getDay();
        const weekdayStr = ['日', '月', '火', '水', '木', '金', '土'][weekdayNum];
        dates.push({
            fullDate: dateStr,
            date: date.getDate(),
            month: date.getMonth() + 1,
            weekday: weekdayStr,
            displayDate: `${date.getMonth() + 1}/${date.getDate()} ${weekdayStr}`
        });
    });
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
        const weekdayNum = date.getDay();
        const weekdayStr = ['日', '月', '火', '水', '木', '金', '土'][weekdayNum];
        return date >= today && date >= new Date(material.startDate) && date <= new Date(material.endDate) && (material.weekdays.length === 0 || material.weekdays.includes(weekdayStr));
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

// 全教材の割り当てを再計算
function recalculateAllocations() {
    materials.forEach(material => {
        calculateAllocations(material);
    });
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
    recalculateAllocations();
    updateTable();
    closeModal();
});

// 教材削除モーダルの表示
function openDeleteModal(materialName) {
    deleteModal.style.display = 'block';
    deleteModalInfo.textContent = `${materialName} を削除しますか？`;
}

// 教材削除モーダルの閉じる
function closeDeleteModal() {
    deleteModal.style.display = 'none';
}

// 教材削除モーダルのイベント
deleteModalClose.addEventListener('click', closeDeleteModal);
deleteModalCancel.addEventListener('click', closeDeleteModal);

deleteModalConfirm.addEventListener('click', () => {
    materials.splice(currentMaterialIndex, 1);
    updateTable();
    closeDeleteModal();
});

// 外側のクリックでモーダルを閉じる
window.addEventListener('click', (e) => {
    if (e.target == modal) {
        closeModal();
    }
    if (e.target == deleteModal) {
        closeDeleteModal();
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
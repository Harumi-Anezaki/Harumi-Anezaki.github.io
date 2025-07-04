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

const selectAllWeekdaysBtn = document.getElementById('select-all-weekdays');
const clearAllWeekdaysBtn = document.getElementById('clear-all-weekdays');
const weekdayCheckboxes = document.querySelectorAll('.weekdays input[type="checkbox"]');

let materials = [];
let dates = [];
let allocations = {};
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

    // テーブルヘッダーの生成
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    headerRow.appendChild(emptyHeader);

    dates.forEach((dateObj, index) => {
        const th = document.createElement('th');
        th.innerHTML = `${dateObj.month}/${dateObj.date}<br>${dateObj.weekday}`;
        if (isToday(dateObj.fullDate)) {
            th.classList.add('today-cell');
        }
        headerRow.appendChild(th);
    });

    scheduleTable.appendChild(headerRow);

    // 各教材の行を生成
    materials.forEach((material, materialIndex) => {
        // 割り当ての計算
        calculateAllocations(material);

        const row = document.createElement('tr');

        // 教材名のセル
        const materialCell = document.createElement('td');
        materialCell.classList.add('material-cell');
        const materialName = document.createElement('span');
        materialName.textContent = material.name;

        // 削除ボタン
        const deleteBtn = document.createElement('span');
        deleteBtn.textContent = '🗑️';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', () => {
            currentMaterialIndex = materialIndex;
            openDeleteModal(material.name);
        });

        // プログレスバー
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('progress-container');
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = `${(material.progress / material.problemCount) * 100}%`;
        progressBar.textContent = `${material.progress}/${material.problemCount}`;

        progressContainer.appendChild(progressBar);

        materialCell.appendChild(materialName);
        materialCell.appendChild(deleteBtn);
        materialCell.appendChild(progressContainer);

        row.appendChild(materialCell);

        // 日付セルの生成
        dates.forEach((dateObj, dateIndex) => {
            const cell = document.createElement('td');

            const dateKey = dateObj.fullDate;
            const allocation = material.allocations[dateKey];
            const completed = material.completed[dateKey];

            if (allocation != null) {
                cell.classList.add('allocated-cell');
                // 割り当てがあるが、過ぎた日付で未入力の場合は完了問題数を0とする
                if (new Date(dateKey) < new Date() && completed == null) {
                    material.completed[dateKey] = 0;
                    recalculateAllocations();
                    updateTable();
                    return;
                }
                cell.textContent = allocation;
            }

            if (completed != null) {
                if (isSameDay(new Date(dateKey), new Date())) {
                    cell.classList.add('completed-today-cell');
                    cell.textContent = `${completed}/${allocation}`;
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
            if (new Date(dateKey) <= new Date()) {
                cell.classList.add('past-cell');
            }

            // セルのクリックイベント
            if ((new Date(dateKey) <= new Date()) && (allocation != null)) {
                cell.addEventListener('click', () => {
                    currentCell = {
                        material,
                        dateKey,
                        cell,
                        allocation
                    };
                    openModal(material.name, dateObj.displayDate);
                });
            }

            row.appendChild(cell);
        });

        scheduleTable.appendChild(row);
    });

    // 今日の日付が2列目に来るようにスクロール
    const headerCells = scheduleTable.querySelectorAll('th');
    let todayIndex = 1;
    headerCells.forEach((cell, index) => {
        if (cell.classList.contains('today-cell')) {
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
            const weekdayNum = start.getDay();
            const weekdayStr = ['日', '月', '火', '水', '木', '金', '土'][weekdayNum];

            if (material.weekdays.length === 0 || material.weekdays.includes(weekdayStr)) {
                const dateStr = start.toISOString().split('T')[0];
                if (!allDates.find(d => d.fullDate === dateStr)) {
                    allDates.push({
                        fullDate: dateStr,
                        date: start.getDate(),
                        month: start.getMonth() + 1,
                        weekday: weekdayStr,
                        displayDate: `${start.getMonth() + 1}/${start.getDate()} ${weekdayStr}`
                    });
                }
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

    const remainingProblems = material.problemCount - totalCompleted;
    // 今日以降の学習日数を計算
    const today = new Date();
    let remainingDates = dates.filter(dateObj => {
        const date = new Date(dateObj.fullDate);
        return date >= today && date >= new Date(material.startDate) && date <= new Date(material.endDate) && (material.weekdays.length === 0 || material.weekdays.includes(dateObj.weekday));
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
function openModal(materialName, dateDisplay) {
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

// 割り当ての再計算
function recalculateAllocations() {
    materials.forEach(material => {
        calculateAllocations(material);
    });
}

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
    alert('データを保存しました。');
});

// ロード時にデータを読み込む
window.addEventListener('load', () => {
    const savedData = localStorage.getItem('studyMaterials');
    if (savedData) {
        materials = JSON.parse(savedData);
        updateTable();
    }
});
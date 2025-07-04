// グローバル変数
let materials = [];
let schedule = {};
let currentDate = new Date();

// ページ読み込み時の処理
window.onload = function() {
    loadData();
    updateDate();
    renderTable();
    setupEventListeners();

    // 日付の自動更新（1分ごとにチェック）
    setInterval(() => {
        const newDate = new Date();
        if (currentDate.getDate() !== newDate.getDate()) {
            // 日付が変わった場合の処理
            handleDateChange(currentDate, newDate);
            currentDate = newDate;
            renderTable();
        }
    }, 60000);
};

// 日付の更新
function updateDate() {
    currentDate = new Date();
}

// データの自動保存
function saveData() {
    localStorage.setItem('materials', JSON.stringify(materials));
    localStorage.setItem('schedule', JSON.stringify(schedule));
}

// データの読み込み
function loadData() {
    const savedMaterials = localStorage.getItem('materials');
    const savedSchedule = localStorage.getItem('schedule');
    if (savedMaterials) {
        materials = JSON.parse(savedMaterials);
        // Dateオブジェクトに変換
        materials.forEach(material => {
            material.startDate = new Date(material.startDate);
            material.endDate = new Date(material.endDate);
        });
    }
    if (savedSchedule) {
        schedule = JSON.parse(savedSchedule);
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    document.getElementById('materialForm').addEventListener('submit', addMaterial);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
    document.getElementById('importExportBtn').addEventListener('click', showImportExport);

    // モーダル外をクリックしたときに閉じる
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        const deleteModal = document.getElementById('deleteModal');
        if (event.target == modal) {
            closeModal();
        }
        if (event.target == deleteModal) {
            closeDeleteModal();
        }
    });

    // 曜日一括指定ボタンのイベント
    document.getElementById('selectAllDays').addEventListener('click', selectAllDays);
    document.getElementById('selectWeekdays').addEventListener('click', selectWeekdays);
    document.getElementById('selectWeekends').addEventListener('click', selectWeekends);
}

// すべての曜日を選択
function selectAllDays() {
    document.querySelectorAll('.weekday-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
}

// 平日のみ選択
function selectWeekdays() {
    document.querySelectorAll('.weekday-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = !(checkbox.value == '0' || checkbox.value == '6');
    });
}

// 週末のみ選択
function selectWeekends() {
    document.querySelectorAll('.weekday-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = (checkbox.value == '0' || checkbox.value == '6');
    });
}

// 教材の追加
function addMaterial(e) {
    e.preventDefault();
    const name = document.getElementById('materialName').value.trim();
    const totalProblems = parseInt(document.getElementById('problemCount').value);
    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;

    // 入力チェック
    if (!name) {
        alert('教材名を入力してください。');
        return;
    }
    if (totalProblems <= 0 || isNaN(totalProblems)) {
        alert('問題数を正しく入力してください。');
        return;
    }
    if (!startDateInput || !endDateInput) {
        alert('学習期間を正しく入力してください。');
        return;
    }

    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);

    if (startDate > endDate) {
        alert('開始日は終了日より前の日付を選択してください。');
        return;
    }

    // 曜日指定
    const weekdays = [];
    document.querySelectorAll('.weekday-checkboxes input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.checked) {
            weekdays.push(parseInt(checkbox.value));
        }
    });

    if (weekdays.length === 0) {
        alert('少なくとも1つの曜日を選択してください。');
        return;
    }

    const material = {
        name: name,
        totalProblems: totalProblems,
        startDate: startDate,
        endDate: endDate,
        weekdays: weekdays,
        completedProblems: 0
    };

    materials.push(material);

    allocateProblems(material);
    saveData();
    renderTable();
    alert('教材が追加されました。');

    // フォームをリセット
    document.getElementById('materialForm').reset();
}

// 問題数の割り当て
function allocateProblems(material) {
    const materialKey = material.name;
    if (!schedule[materialKey]) {
        schedule[materialKey] = {};
    }
    const dates = getDates(material.startDate, material.endDate);
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    let remainingProblems = material.totalProblems;

    // すべての過去の日付（未入力）は完了問題数を0に設定
    dates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (date < today && material.weekdays.includes(date.getDay())) {
            if (!schedule[materialKey][dateKey]) {
                schedule[materialKey][dateKey] = {
                    allocated: 0,
                    completed: 0
                };
                remainingProblems -= 0;
            } else if (schedule[materialKey][dateKey].completed !== null) {
                remainingProblems -= schedule[materialKey][dateKey].completed;
            } else {
                schedule[materialKey][dateKey].completed = 0;
                remainingProblems -= 0;
            }
        }
    });

    // 今日以降の学習可能日
    const studyDates = dates.filter(date => {
        return (date >= today) && material.weekdays.includes(date.getDay());
    });

    let totalDays = studyDates.length;

    const baseProblems = totalDays > 0 ? Math.floor(remainingProblems / totalDays) : 0;
    let extraProblems = totalDays > 0 ? remainingProblems % totalDays : 0;

    for (let date of dates) {
        const dateKey = formatDateKey(date);
        if (!schedule[materialKey][dateKey]) {
            schedule[materialKey][dateKey] = {
                allocated: 0,
                completed: null
            };
        }
        if ((date >= today) && material.weekdays.includes(date.getDay())) {
            let problems = baseProblems;
            if (extraProblems > 0) {
                problems += 1;
                extraProblems -= 1;
            }
            schedule[materialKey][dateKey].allocated = problems;
        }
    }
}

// 日付の配列を取得
function getDates(startDate, endDate) {
    let dates = [];
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// 日付キーのフォーマット
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// テーブルのレンダリング
function renderTable() {
    const table = document.getElementById('scheduleTable');
    table.innerHTML = '';

    if (materials.length === 0) {
        const noDataMessage = document.createElement('p');
        noDataMessage.textContent = '';
        table.parentElement.appendChild(noDataMessage);
        return;
    }

    // 日付の一覧を取得
    let allDates = [];
    materials.forEach(material => {
        const dates = getDates(material.startDate, material.endDate);
        allDates = allDates.concat(dates);
    });
    // 重複を排除してソート
    allDates = allDates.filter((value, index, self) =>
        index === self.findIndex((t) => t.getTime() === value.getTime())
    );
    allDates.sort((a, b) => a - b);

    // ヘッダー行の生成
    const headerRow = document.createElement('tr');
    const firstHeaderCell = document.createElement('th');
    firstHeaderCell.textContent = '教材';
    headerRow.appendChild(firstHeaderCell);

    allDates.forEach(date => {
        const th = document.createElement('th');
        th.classList.add('date-header');
        if (isSameDate(date, currentDate)) {
            th.classList.add('today');
        }
        th.innerHTML = `${date.getMonth()+1}/${date.getDate()}<br>${getWeekdayShort(date.getDay())}`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 教材ごとの行の生成
    materials.forEach(material => {
        const tr = document.createElement('tr');
        const materialCell = document.createElement('td');
        materialCell.classList.add('material-cell');

        const materialNameDiv = document.createElement('div');
        materialNameDiv.classList.add('material-name');
        materialNameDiv.textContent = material.name;

        materialCell.appendChild(materialNameDiv);

        const barWrapper = document.createElement('div');
        barWrapper.classList.add('bar-wrapper');

        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = `${getProgress(material)}%`;

        const barText = document.createElement('div');
        barText.classList.add('bar-text');
        barText.textContent = `${material.completedProblems}/${material.totalProblems}`;

        barWrapper.appendChild(progressBar);
        barWrapper.appendChild(barText);

        materialCell.appendChild(barWrapper);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', () => {
            openDeleteModal(material);
        });

        materialCell.appendChild(deleteButton);
        tr.appendChild(materialCell);

        allDates.forEach(date => {
            const td = document.createElement('td');
            td.style.cursor = 'default';
            const dateKey = formatDateKey(date);
            const materialKey = material.name;
            const cellData = schedule[materialKey][dateKey];

            if (cellData) {
                if (cellData.completed !== null && cellData.completed !== undefined) {
                    if (isPastDate(date)) {
                        td.textContent = cellData.completed;
                        if (cellData.completed === 0) {
                            td.classList.add('cell-1a1a1a');
                        } else {
                            td.classList.add('cell-7bc2c8');
                        }
                    } else if (isToday(date)) {
                        td.textContent = `${cellData.completed}/${cellData.allocated}`;
                        td.classList.add('cell-72b5ba');
                    }
                } else if (cellData.allocated > 0) {
                    td.textContent = cellData.allocated;
                    td.classList.add('cell-5b9094');
                } else {
                    td.textContent = '-';
                }
            } else {
                td.textContent = '-';
            }

            // セルのクリックイベント
            if (isPastDate(date) || isToday(date)) {
                td.style.cursor = 'pointer';
                td.addEventListener('click', () => {
                    openModal(material, date);
                });
            }

            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    // 今日の日付が2列目に来るようにスクロール
    const headerCells = document.querySelectorAll('#scheduleTable th');
    let todayIndex = -5;
    headerCells.forEach((th, index) => {
        if (th.classList.contains('today')) {
            todayIndex = index;
        }
    });
    if (todayIndex > -5) {
        const scrollPosition = (todayIndex - 5) * headerCells[todayIndex].offsetWidth;
        document.querySelector('.table-container').scrollLeft = scrollPosition;
    } else {
        document.querySelector('.table-container').scrollLeft = 0;
    }
}

// モーダルの表示（完了問題数入力用）
function openModal(material, date) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';

    const dateKey = formatDateKey(date);
    const materialKey = material.name;
    const cellData = schedule[materialKey][dateKey];

    const form = document.createElement('form');
    form.id = 'completionForm';

    const heading = document.createElement('h2');
    heading.textContent = `${date.getMonth()+1}/${date.getDate()} (${getWeekdayShort(date.getDay())}) ${material.name}`;
    form.appendChild(heading);

    const inputLabel = document.createElement('label');
    inputLabel.textContent = '完了した問題数：';
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'completedProblemsInput';
    input.required = true;
    input.min = 0;
    input.value = cellData.completed !== null ? cellData.completed : '';

    inputLabel.appendChild(input);
    form.appendChild(inputLabel);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = '完了';

    form.appendChild(submitBtn);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const completedProblems = parseInt(input.value);
        if (isNaN(completedProblems) || completedProblems < 0) {
            alert('正しい数値を入力してください。');
            return;
        }
        saveCompletedProblems(material, date, completedProblems);
        closeModal();
    });

    modalBody.appendChild(form);
    modal.style.display = 'block';
}

// モーダルの閉じる
function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

// 完了した問題数の保存
function saveCompletedProblems(material, date, completedProblems) {
    const dateKey = formatDateKey(date);
    const materialKey = material.name;
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (!schedule[materialKey][dateKey]) {
        schedule[materialKey][dateKey] = {
            allocated: 0,
            completed: 0
        };
    }

    schedule[materialKey][dateKey].completed = completedProblems;

    // 累計完了問題数の更新
    updateCompletedProblems(material);

    if (isSameDate(date, today)) {
        // 今日のセルに入力があった場合、明日以降のセルを再割り当て
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + 1);
        reallocateProblems(material, nextDay, true);
    } else {
        // 過去のセルに入力があった場合、今日以降のセルを再割り当て
        reallocateProblems(material, today, true);
    }

    saveData();
    renderTable();
}

// 累計完了問題数の更新
function updateCompletedProblems(material) {
    const materialKey = material.name;
    let totalCompleted = 0;
    for (let dateKey in schedule[materialKey]) {
        const cellData = schedule[materialKey][dateKey];
        if (cellData.completed !== null && cellData.completed !== undefined) {
            totalCompleted += cellData.completed;
        }
    }
    material.completedProblems = totalCompleted;
}

// 問題数の再割り当て
function reallocateProblems(material, startFromDate, includeStartDate) {
    const materialKey = material.name;
    const dates = getDates(material.startDate, material.endDate);
    let remainingProblems = material.totalProblems - material.completedProblems;

    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    // 過去のセルの未入力を0に設定
    dates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (date < today && material.weekdays.includes(date.getDay())) {
            if (!schedule[materialKey][dateKey]) {
                schedule[materialKey][dateKey] = {
                    allocated: 0,
                    completed: 0
                };
            } else if (schedule[materialKey][dateKey].completed === null || schedule[materialKey][dateKey].completed === undefined) {
                schedule[materialKey][dateKey].completed = 0;
            }
        }
    });

    // 再割り当て前に開始日以降のセルのallocatedを0に
    dates.forEach(date => {
        const dateKey = formatDateKey(date);
        if ((includeStartDate ? date >= startFromDate : date > startFromDate) && material.weekdays.includes(date.getDay())) {
            if (!schedule[materialKey][dateKey]) {
                schedule[materialKey][dateKey] = {
                    allocated: 0,
                    completed: null
                };
            } else {
                schedule[materialKey][dateKey].allocated = 0;
            }
        }
    });

    // 残りの学習可能日
    const studyDates = dates.filter(date => {
        return (includeStartDate ? date >= startFromDate : date > startFromDate) && material.weekdays.includes(date.getDay());
    });

    let totalDays = studyDates.length;

    const baseProblems = totalDays > 0 ? Math.floor(remainingProblems / totalDays) : 0;
    let extraProblems = totalDays > 0 ? remainingProblems % totalDays : 0;

    for (let date of studyDates) {
        const dateKey = formatDateKey(date);
        if (!schedule[materialKey][dateKey]) {
            schedule[materialKey][dateKey] = {
                allocated: 0,
                completed: null
            };
        }
        let problems = baseProblems;
        if (extraProblems > 0) {
            problems += 1;
            extraProblems -= 1;
        }
        schedule[materialKey][dateKey].allocated = problems;
    }
}

// 日付変更時の処理
function handleDateChange(oldDate, newDate) {
    materials.forEach(material => {
        const materialKey = material.name;
        const oldDateKey = formatDateKey(oldDate);
        const newDateKey = formatDateKey(newDate);

        // 前日の未入力の完了問題数を0に設定
        if (schedule[materialKey][oldDateKey] && (schedule[materialKey][oldDateKey].completed === null || schedule[materialKey][oldDateKey].completed === undefined)) {
            schedule[materialKey][oldDateKey].completed = 0;
        }

        // 累計完了問題数の更新
        updateCompletedProblems(material);

        // 新しい今日の日付以降で再割り当てを行う
        reallocateProblems(material, newDate, true);
    });

    // データの保存
    saveData();
}

// 日付フォーマットの比較
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 今日かどうか
function isToday(date) {
    return isSameDate(date, currentDate);
}

// 過去の日付かどうか
function isPastDate(date) {
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return date < today;
}

// 進捗率の計算
function getProgress(material) {
    return Math.min((material.completedProblems / material.totalProblems) * 100, 100);
}

// 曜日の取得
function getWeekdayShort(day) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[day];
}

// インポート/エクスポートの表示
function showImportExport() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '';

    // エクスポートボタンの作成
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'エクスポート';
    exportBtn.style.marginRight = '10px';
    exportBtn.addEventListener('click', () => {
        exportData();
    });

    // インポートボタンの作成
    const importBtn = document.createElement('button');
    importBtn.textContent = 'インポート';
    importBtn.style.marginRight = '10px';
    importBtn.addEventListener('click', () => {
        importInput.click(); // ファイル選択ダイアログを開く
    });

    // ファイル入力要素の作成（非表示）
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', importData);

    // モーダルに要素を追加
    modalBody.appendChild(exportBtn);
    modalBody.appendChild(importBtn);
    modalBody.appendChild(importInput);

    // モーダルを表示
    modal.style.display = 'block';
}

// データのエクスポート
function exportData() {
    const data = {
        materials: materials,
        schedule: schedule
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json'; // ダウンロードされるファイル名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('データがエクスポートされました。');
}

// データのインポート
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.materials && data.schedule) {
                materials = data.materials;
                // Dateオブジェクトに変換
                materials.forEach(material => {
                    material.startDate = new Date(material.startDate);
                    material.endDate = new Date(material.endDate);
                });
                schedule = data.schedule;
                saveData();
                renderTable();
                alert('データがインポートされました。');
                closeModal();
            } else {
                alert('無効なデータ形式です。');
            }
        } catch (error) {
            alert('データの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
    // ファイル入力をリセット
    event.target.value = '';
}

// 教材削除モーダルの表示
function openDeleteModal(material) {
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalBody = document.getElementById('deleteModalBody');
    deleteModalBody.innerHTML = '';

    const message = document.createElement('p');
    message.textContent = `「${material.name}」を削除しますか？`;
    deleteModalBody.appendChild(message);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.style.backgroundColor = '#ff5c5c';
    deleteBtn.style.marginRight = '10px';
    deleteBtn.addEventListener('click', () => {
        deleteMaterial(material);
        closeDeleteModal();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', () => {
        closeDeleteModal();
    });

    deleteModalBody.appendChild(deleteBtn);
    deleteModalBody.appendChild(cancelBtn);
    deleteModal.style.display = 'block';
}

// 教材の削除
function deleteMaterial(material) {
    materials = materials.filter(m => m !== material);
    delete schedule[material.name];
    saveData();
    renderTable();
}

// 削除モーダルの閉じる
function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'none';
}
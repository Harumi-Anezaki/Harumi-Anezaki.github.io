// データの保存・読み込み用
let scheduleData = JSON.parse(localStorage.getItem('scheduleData')) || {
    materials: [], // 教材のリスト
    dates: [], // 全ての日付（学習期間内の日付を含む）
    assignments: {} // 教材と日付に対応するセルのデータ
};

// 要素の取得
const materialForm = document.getElementById('material-form');
const scheduleTable = document.getElementById('schedule-table');
const dateRow = document.getElementById('date-row');
const materialRows = document.getElementById('material-rows');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalSubmit = document.getElementById('modal-submit');
const importJsonBtn = document.getElementById('import-json');
const exportJsonBtn = document.getElementById('export-json');
const hamburgerMenu = document.getElementById('hamburger-menu');
const menuContent = document.getElementById('menu-content');
const menuClose = document.getElementById('menu-close');

// 現在の日付の取得（時刻を0に設定）
let today = new Date();
today.setHours(0, 0, 0, 0);

// メニューの開閉
hamburgerMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContent.style.display = 'block';
});

menuClose.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContent.style.display = 'none';
});

// メニュー外をクリックした場合にメニューを閉じる
document.addEventListener('click', (e) => {
    if (!menuContent.contains(e.target) && e.target !== hamburgerMenu) {
        menuContent.style.display = 'none';
    }
});

// 教材追加フォームの処理
materialForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addMaterial();
    materialForm.reset();
});

// 教材の追加
function addMaterial() {
    const name = document.getElementById('material-name').value.trim();
    const totalProblems = parseInt(document.getElementById('total-problems').value);
    const startDateInput = document.getElementById('study-period-start').value;
    const endDateInput = document.getElementById('study-period-end').value;

    if (!name || !totalProblems || !startDateInput || !endDateInput) {
        alert('全ての項目を正しく入力してください。');
        return;
    }

    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (startDate > endDate) {
        alert('学習開始日は終了日より前に設定してください。');
        return;
    }

    const daysOfWeek = [];
    const dayChecks = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    dayChecks.forEach((check) => {
        if (check.checked) {
            daysOfWeek.push(parseInt(check.value));
        }
    });

    if (daysOfWeek.length === 0) {
        alert('少なくとも1つの曜日を指定してください。');
        return;
    }

    const materialId = Date.now().toString();

    const material = {
        id: materialId,
        name: name,
        totalProblems: totalProblems,
        startDate: startDate,
        endDate: endDate,
        daysOfWeek: daysOfWeek,
        completedProblems: 0
    };

    scheduleData.materials.push(material);

    // 日付の生成
    generateDates();

    // 問題数の割り当て
    distributeProblems(material);

    // データの保存とテーブルの再描画
    saveData();
    renderTable();
}

// 日付の生成
function generateDates() {
    const allDates = new Set();

    scheduleData.materials.forEach((material) => {
        let currentDate = new Date(material.startDate);
        while (currentDate <= material.endDate) {
            const dateString = formatDate(currentDate);
            allDates.add(dateString);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });

    scheduleData.dates = Array.from(allDates).sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        return dateA - dateB;
    });
}

// 日付のフォーマット（例：10/1\n日）
function formatDate(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = '日月火水木金土'[date.getDay()];
    return `${m}/${d}\n${w}`;
}

// 日付文字列をDateオブジェクトに変換
function parseDate(dateStr) {
    const [md, w] = dateStr.split('\n');
    const [month, day] = md.split('/').map(Number);
    const year = today.getFullYear(); // 当年
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

// 問題数の割り当て
function distributeProblems(material) {
    const assignments = scheduleData.assignments;
    const materialId = material.id;

    // 学習期間内の日付を収集
    const studyDates = [];
    let currentDate = new Date(material.startDate);
    while (currentDate <= material.endDate) {
        if (material.daysOfWeek.includes(currentDate.getDay())) {
            const dateStr = formatDate(currentDate);
            studyDates.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 問題数の割り当て
    const remainingDates = studyDates.filter((dateStr) => parseDate(dateStr) >= today);
    const totalDays = remainingDates.length;
    const totalProblems = material.totalProblems - material.completedProblems;

    if (totalDays > 0) {
        const baseProblems = Math.floor(totalProblems / totalDays);
        let remainder = totalProblems % totalDays;

        remainingDates.forEach((dateStr) => {
            const assignedProblems = baseProblems + (remainder > 0 ? 1 : 0);
            const key = `${materialId}-${dateStr}`;

            if (!assignments[key]) {
                assignments[key] = {
                    materialId: materialId,
                    dateStr: dateStr,
                    assigned: assignedProblems,
                    completed: 0
                };
            } else {
                assignments[key].assigned = assignedProblems;
            }

            remainder--;
        });
    }

    // 過去の日付のセルを初期化（完了問題数が入力されていない場合は0とする）
    const pastDates = studyDates.filter((dateStr) => parseDate(dateStr) < today);
    pastDates.forEach((dateStr) => {
        const key = `${materialId}-${dateStr}`;
        if (!assignments[key]) {
            assignments[key] = {
                materialId: materialId,
                dateStr: dateStr,
                assigned: 0,
                completed: 0
            };
        }
    });
}

// テーブルの描画
function renderTable() {
    // ヘッダーの生成
    renderHeader();

    // 日付ごとの行を生成
    materialRows.innerHTML = '';

    scheduleData.dates.forEach((dateStr) => {
        const tr = document.createElement('tr');

        // 日付セル
        const dateCell = document.createElement('td');
        dateCell.classList.add('fixed-column', 'date-cell');
        dateCell.textContent = dateStr;
        if (parseDate(dateStr).getTime() === today.getTime()) {
            dateCell.classList.add('today-date'); // 今日の日付のセルを色変更
        }
        tr.appendChild(dateCell);

        // 教材ごとのセル
        scheduleData.materials.forEach((material) => {
            const td = document.createElement('td');
            const key = `${material.id}-${dateStr}`;
            const assignment = scheduleData.assignments[key];

            const assignmentDate = parseDate(dateStr);

            if (!assignment) {
                // 初めてのセルでもクリック可能にする
                scheduleData.assignments[key] = {
                    materialId: material.id,
                    dateStr: dateStr,
                    assigned: 0,
                    completed: 0
                };
            }

            const assignmentData = scheduleData.assignments[key];

            if (assignmentDate < today) {
                // 過去の日付
                td.textContent = assignmentData.completed;
                if (assignmentData.completed > 0) {
                    td.classList.add('cell-completed'); // 色を#7bc2c8
                } else {
                    td.classList.add('cell-zero'); // 色を#1a1a1a
                }
                td.addEventListener('click', () => {
                    openCompletionModal(assignmentData);
                });
            } else if (assignmentDate.getTime() === today.getTime()) {
                // 今日
                td.textContent = `${assignmentData.completed}/${assignmentData.assigned}`;
                td.classList.add('cell-today'); // 色を#72b5ba
                td.addEventListener('click', () => {
                    openCompletionModal(assignmentData);
                });
            } else {
                // 未来の日付
                td.textContent = assignmentData.assigned;
                if (assignmentData.assigned > 0) {
                    td.classList.add('cell-assigned'); // 色を#5b9094
                }
            }

            tr.appendChild(td);
        });

        materialRows.appendChild(tr);
    });

    // テーブルを横スクロールして今日の日付を2列目に表示
    scrollToToday();
}

// ヘッダーの描画
function renderHeader() {
    dateRow.innerHTML = '';
    const th = document.createElement('th');
    th.classList.add('fixed-column');
    th.textContent = '日付 / 教材';
    dateRow.appendChild(th);

    scheduleData.materials.forEach((material) => {
        const materialTh = document.createElement('th');
        materialTh.classList.add('material-header');
        materialTh.textContent = material.name;

        dateRow.appendChild(materialTh);
    });
}

// テーブルを横スクロールして今日の日付を表示
function scrollToToday() {
    const dateCells = document.querySelectorAll('.date-cell');
    let todayIndex = 0;

    dateCells.forEach((cell, index) => {
        if (cell.classList.contains('today-date')) {
            todayIndex = index;
        }
    });

    const tableContainer = document.querySelector('.table-container');
    const cellWidth = dateCells[0].offsetWidth;
    tableContainer.scrollLeft = cellWidth * (todayIndex - 1);
}

// 完了した問題数の入力モーダルを開く
function openCompletionModal(assignment) {
    const material = scheduleData.materials.find((m) => m.id === assignment.materialId);

    modalTitle.textContent = `${assignment.dateStr} ${material.name}`;
    modalBody.innerHTML = `
        <label for="completed-number">完了した問題数：</label>
        <input type="number" id="completed-number" min="0" max="${material.totalProblems}" value="${assignment.completed}">
    `;

    modalSubmit.textContent = '保存';
    modal.style.display = 'block';

    modalSubmit.onclick = () => {
        const completedNumber = parseInt(document.getElementById('completed-number').value);
        if (isNaN(completedNumber) || completedNumber < 0 || completedNumber > material.totalProblems) {
            alert('正しい値を入力してください。');
            return;
        }

        // 完了した問題数を更新
        material.completedProblems = material.completedProblems - assignment.completed + completedNumber;
        assignment.completed = completedNumber;

        // 再割り当ての実行
        redistributeProblems(material, assignment);

        // データの保存とテーブルの再描画
        saveData();
        renderTable();
        closeModal();
    };
}

// 問題数の再割り当て（完了した問題数の入力後）
function redistributeProblems(material, updatedAssignment) {
    const assignments = scheduleData.assignments;
    const materialId = material.id;

    // 残りの問題数の計算
    let completedProblems = 0;
    let pastDates = [];
    let futureDates = [];
    const assignmentsArray = Object.values(assignments).filter((a) => a.materialId === materialId);

    assignmentsArray.forEach((assignment) => {
        const assignmentDate = parseDate(assignment.dateStr);

        if (assignmentDate < today) {
            completedProblems += assignment.completed || 0;
            pastDates.push(assignment.dateStr);
        } else if (assignmentDate > today) {
            futureDates.push(assignment.dateStr);
        } else if (assignmentDate.getTime() === today.getTime()) {
            if (assignment.dateStr === updatedAssignment.dateStr) {
                completedProblems += assignment.completed || 0;
            } else {
                // 今日の他のセルは考慮しない
            }
        }
    });

    material.completedProblems = completedProblems;

    // 残りの問題数
    const remainingProblems = material.totalProblems - completedProblems;

    // 未来の日付への再割り当て
    if (futureDates.length > 0) {
        const totalDays = futureDates.length;
        const baseProblems = Math.floor(remainingProblems / totalDays);
        let remainder = remainingProblems % totalDays;

        futureDates.forEach((dateStr) => {
            const key = `${materialId}-${dateStr}`;
            const assignedProblems = baseProblems + (remainder > 0 ? 1 : 0);
            assignments[key].assigned = assignedProblems;
            remainder--;
        });
    }
}

// 教材削除モーダルを開く
function openDeleteModal(material) {
    modalTitle.textContent = `${material.name} を削除しますか？`;
    modalBody.innerHTML = `<p>この教材を削除すると元に戻せません。本当に削除しますか？</p>`;

    modalSubmit.textContent = '削除';
    modal.style.display = 'block';

    modalSubmit.onclick = () => {
        // 教材の削除
        scheduleData.materials = scheduleData.materials.filter((m) => m.id !== material.id);

        // 教材に関連する割り当ての削除
        for (const key in scheduleData.assignments) {
            if (scheduleData.assignments[key].materialId === material.id) {
                delete scheduleData.assignments[key];
            }
        }

        // データの保存とテーブルの再描画
        saveData();
        renderTable();
        closeModal();
    };
}

// モーダルを閉じる
function closeModal() {
    modal.style.display = 'none';
    modalSubmit.textContent = '保存';
}

// データの保存
function saveData() {
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
}

// データの読み込みとテーブルの初期化
function init() {
    generateDates();
    renderTable();
}

// モーダルの閉じるボタン
modalClose.addEventListener('click', closeModal);

// モーダルの外側をクリックしたときに閉じる
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// データのインポート
importJsonBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                scheduleData = importedData;
                saveData();
                init();
            } catch (error) {
                alert('データの読み込みに失敗しました。正しいJSONファイルを選択してください。');
            }
        };
        reader.readAsText(file);
    });

    fileInput.click();
});

// データのエクスポート
exportJsonBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(scheduleData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'study_scheduler_data.json';
    link.click();
});

// 日付の自動更新
window.addEventListener('load', () => {
    init();
    scrollToToday(); // ページ読み込み時にスクロール
});

// ページのフォーカスが戻ったときに日付を更新
window.addEventListener('focus', () => {
    const newToday = new Date();
    newToday.setHours(0, 0, 0, 0);
    if (newToday.getTime() !== today.getTime()) {
        today.setTime(newToday.getTime());
        init();
    }
});
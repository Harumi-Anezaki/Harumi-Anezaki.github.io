// グローバル変数
let courses = [];
let schedule = {};
let currentCell = null;

// フォント設定用にspan要素を一時的に生成（日本語フォント適用）
let fontSpan = document.createElement('span');
fontSpan.style.fontFamily = "'Noto Sans JP', Arial, sans-serif";

// DOMのロードを待つ
document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('close-btn');
    const courseForm = document.getElementById('course-form');
    const calendarTable = document.getElementById('calendar-table');
    const saveButton = document.getElementById('save-button');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');
    const completionForm = document.getElementById('completion-form');
    const completedCountInput = document.getElementById('completed-count');

    // メニュー開閉イベント
    menuIcon.addEventListener('click', () => {
        sidebar.style.width = '300px';
    });
    closeBtn.addEventListener('click', () => {
        sidebar.style.width = '0';
    });

    // 教材追加フォームの送信イベント
    courseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addCourse();
        courseForm.reset();
    });

    // 保存ボタンのクリックイベント
    saveButton.addEventListener('click', () => {
        saveData();
        alert('データを保存しました。');
    });

    // モーダル閉じるイベント
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 完了問題数フォームの送信イベント
    completionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let completedCount = parseInt(completedCountInput.value);
        updateCompletion(completedCount);
        completionForm.reset();
        modal.style.display = 'none';
    });

    // データのロード
    loadData();
});

// 教材を追加する関数
function addCourse() {
    const courseName = document.getElementById('course-name').value;
    const problemCount = parseInt(document.getElementById('problem-count').value);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // 曜日指定の取得
    const weekdays = Array.from(document.querySelectorAll('#weekdays input[type="checkbox"]'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => parseInt(checkbox.value));

    // 教材データの作成
    const course = {
        name: courseName,
        totalProblems: problemCount,
        startDate: startDate,
        endDate: endDate,
        weekdays: weekdays,
        completedProblems: 0,
        allocation: {}
    };

    courses.push(course);
    generateSchedule();
}

// スケジュールを生成する関数
function generateSchedule() {
    // スケジュールの初期化
    schedule = {};

    // 各教材について処理
    courses.forEach(course => {
        // 学習期間の日付リストを取得
        let dateList = getDateList(course.startDate, course.endDate, course.weekdays);

        // 割り当て問題数の計算
        let remainingProblems = course.totalProblems - course.completedProblems;
        let remainingDays = dateList.filter(date => !isPastDate(date)).length;

        // 過去日付の扱い
        dateList.forEach(date => {
            if (isPastDate(date) && !schedule[date]) {
                schedule[date] = {};
            }
            if (!schedule[date]) {
                schedule[date] = {};
            }
            schedule[date][course.name] = {
                assigned: 0,
                completed: 0
            };
        });

        if (remainingDays > 0) {
            let baseAllocation = Math.floor(remainingProblems / remainingDays);
            let remainder = remainingProblems % remainingDays;

            dateList.forEach(date => {
                if (!isPastDate(date)) {
                    let allocation = baseAllocation;
                    if (remainder > 0) {
                        allocation += 1;
                        remainder -= 1;
                    }
                    schedule[date][course.name].assigned = allocation;
                }
            });
        }

    });

    // テーブルの生成
    buildTable();
}

// 日付リストを取得する関数
function getDateList(start, end, weekdays) {
    let dateArray = [];
    let currentDate = new Date(start);
    let endDate = new Date(end);

    while (currentDate <= endDate) {
        if (weekdays.includes(currentDate.getDay())) {
            dateArray.push(formatDate(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
}

// 日付をフォーマットする関数
function formatDate(date) {
    let year = date.getFullYear();
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    let day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

// 過去日付かどうか判定する関数
function isPastDate(dateStr) {
    let today = new Date();
    today.setHours(0,0,0,0);
    let date = new Date(dateStr);
    return date < today;
}

// テーブルを構築する関数
function buildTable() {
    const calendarTable = document.getElementById('calendar-table');
    const thead = calendarTable.querySelector('thead');
    const tbody = calendarTable.querySelector('tbody');

    // テーブルの初期化
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // 日付のリスト
    let dateList = Object.keys(schedule);
    dateList.sort();

    // コース名のヘッダー行
    let headerRow = document.createElement('tr');
    let emptyCell = document.createElement('th');
    emptyCell.textContent = '日付／教材';
    headerRow.appendChild(emptyCell);

    courses.forEach(course => {
        let th = document.createElement('th');
        th.textContent = course.name;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // 今日の日付を取得
    let todayStr = formatDate(new Date());

    // 各日付の行を作成
    dateList.forEach(dateStr => {
        let tr = document.createElement('tr');
        let dateCell = document.createElement('td');
        dateCell.textContent = dateStr;
        tr.appendChild(dateCell);

        if (dateStr === todayStr) {
            tr.classList.add('today-cell');
        }

        courses.forEach(course => {
            let td = document.createElement('td');
            if (schedule[dateStr][course.name]) {
                let assigned = schedule[dateStr][course.name].assigned;
                td.textContent = assigned;
                if (isPastDate(dateStr) || dateStr === todayStr) {
                    td.classList.add('clickable-cell');
                    td.addEventListener('click', () => {
                        currentCell = {
                            date: dateStr,
                            courseName: course.name
                        };
                        openModal();
                    });
                }
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    // 水平スクロール位置の調整（今日の日付を表示）
    adjustScrollPosition();
}

// モーダルを開く関数
function openModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'block';
}

// 完了問題数を更新する関数
function updateCompletion(completedCount) {
    let date = currentCell.date;
    let courseName = currentCell.courseName;

    // 完了問題数の更新
    schedule[date][courseName].completed = completedCount;

    // 教材の総完了問題数を更新
    let course = courses.find(c => c.name === courseName);
    course.completedProblems = getTotalCompletedProblems(courseName);

    // 割り当ての再計算
    generateSchedule();
}

// 教材の総完了問題数を取得する関数
function getTotalCompletedProblems(courseName) {
    let total = 0;
    for (let date in schedule) {
        if (schedule[date][courseName] && schedule[date][courseName].completed) {
            total += schedule[date][courseName].completed;
        }
    }
    return total;
}

// データを保存する関数
function saveData() {
    localStorage.setItem('courses', JSON.stringify(courses));
    localStorage.setItem('schedule', JSON.stringify(schedule));
}

// データをロードする関数
function loadData() {
    if (localStorage.getItem('courses')) {
        courses = JSON.parse(localStorage.getItem('courses'));
    }
    if (localStorage.getItem('schedule')) {
        schedule = JSON.parse(localStorage.getItem('schedule'));
    }
    generateSchedule();
}

// スクロール位置を調整する関数
function adjustScrollPosition() {
    const calendarContainer = document.querySelector('.calendar-container');
    const todayCell = document.querySelector('.today-cell');
    if (todayCell) {
        const position = todayCell.offsetLeft;
        calendarContainer.scrollLeft = position - 100;
    }
}
let timer;
let startTime;
let bestTime = localStorage.getItem('bestTime') || null;
let difficulty = 'normal';

const messageEl = document.getElementById('message');
const startButton = document.getElementById('start-button');
const bestRecordEl = document.getElementById('best-record');
const difficultyButtons = document.querySelectorAll('.difficulty-button');

// 最高記録の表示
function updateBestRecord() {
    if (bestTime !== null) {
        bestRecordEl.textContent = `最高記録: ${bestTime} ms`;
    } else {
        bestRecordEl.textContent = '最高記録: -- ms';
    }
}
updateBestRecord();

// 難易度選択
difficultyButtons.forEach(button => {
    button.addEventListener('click', function () {
        difficulty = this.getAttribute('data-level');
        difficultyButtons.forEach(btn => btn.style.backgroundColor = '#333333');
        this.style.backgroundColor = '#00FFFF';
    });
});

startButton.addEventListener('click', function () {
    messageEl.textContent = '画面が緑色になったらクリックしてください...';
    this.style.display = 'none';

    let minDelay, maxDelay;
    if (difficulty === 'easy') {
        minDelay = 2000;
        maxDelay = 5000;
    } else if (difficulty === 'normal') {
        minDelay = 1000;
        maxDelay = 4000;
    } else if (difficulty === 'hard') {
        minDelay = 500;
        maxDelay = 3000;
    }

    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    timer = setTimeout(function () {
        document.body.style.backgroundColor = '#00FF00'; // 緑色に変更
        startTime = Date.now();

        document.body.addEventListener('mousedown', onClickScreen);
    }, randomDelay);
});

function onClickScreen() {
    const reactionTime = Date.now() - startTime;
    messageEl.textContent = `あなたの反応時間は ${reactionTime} ミリ秒です！`;
    if (bestTime === null || reactionTime < bestTime) {
        bestTime = reactionTime;
        localStorage.setItem('bestTime', bestTime);
        updateBestRecord();
        messageEl.textContent += ' 新記録達成！';
    }
    startButton.style.display = 'inline-block';
    document.body.style.backgroundColor = '#0D0D0D'; // 元の色に戻す

    document.body.removeEventListener('mousedown', onClickScreen);
}
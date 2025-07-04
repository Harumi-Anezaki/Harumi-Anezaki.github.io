let randomNumber;
let level = 1;
let bestLevel = localStorage.getItem('bestLevel') || 1;

const numberDisplay = document.getElementById('number-display');
const userInput = document.getElementById('user-input');
const submitButton = document.getElementById('submit-button');
const messageEl = document.getElementById('message');
const levelDisplay = document.getElementById('level-display');
const bestLevelEl = document.getElementById('best-level');

// 最高レベルの表示
function updateBestLevel() {
    if (bestLevel !== null) {
        bestLevelEl.textContent = `最高レベル: ${bestLevel}`;
    } else {
        bestLevelEl.textContent = '最高レベル: --';
    }
}
updateBestLevel();

// 数字の生成
function generateNumber() {
    const digitCount = level + 2; // レベルに応じて桁数を増やす
    randomNumber = '';
    for (let i = 0; i < digitCount; i++) {
        randomNumber += Math.floor(Math.random() * 10);
    }
    numberDisplay.textContent = randomNumber;

    setTimeout(function () {
        numberDisplay.textContent = '';
        messageEl.textContent = '覚えた数字を入力してください。';
        userInput.classList.remove('hide');
        submitButton.classList.remove('hide');
    }, 3000); // 3秒後に数字を隠す
}

function initGame() {
    userInput.value = '';
    userInput.classList.add('hide');
    submitButton.classList.add('hide');
    messageEl.textContent = 'これから表示される数字を覚えてください。';
    levelDisplay.textContent = `レベル: ${level}`;
    generateNumber();
}

document.addEventListener('DOMContentLoaded', function () {
    initGame();
});

submitButton.addEventListener('click', function () {
    const userAnswer = userInput.value;
    if (userAnswer === randomNumber) {
        level++;
        messageEl.textContent = '正解です！次のレベルへ進みます。';
        if (level > bestLevel) {
            bestLevel = level;
            localStorage.setItem('bestLevel', bestLevel);
            updateBestLevel();
            messageEl.textContent += ' 新記録達成！';
        }
        setTimeout(initGame, 2000); // 2秒後に次の問題
    } else {
        messageEl.textContent = `不正解です。正解は ${randomNumber} でした。レベル1から再挑戦します。`;
        level = 1;
        setTimeout(initGame, 3000); // 3秒後に再スタート
    }
});
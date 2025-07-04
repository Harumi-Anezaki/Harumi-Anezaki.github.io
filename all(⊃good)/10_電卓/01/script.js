const display = document.getElementById('display');
const keys = document.querySelector('.keys');

keys.addEventListener('click', event => {
  const key = event.target;
  const action = key.dataset.action;
  const keyContent = key.textContent;
  const displayedNum = display.textContent;
  const previousKeyType = keys.dataset.previousKeyType;

  // ボタンが押されたか確認
  if (!key.matches('button')) return;

  // 数字キー
  if (!action) {
    if (displayedNum === '0' || previousKeyType === 'operator' || previousKeyType === 'calculate') {
      display.textContent = keyContent;
    } else {
      display.textContent = displayedNum + keyContent;
    }
    keys.dataset.previousKeyType = 'number';
  }

  // 演算子キー
  if (
    action === 'add' ||
    action === 'subtract' ||
    action === 'multiply' ||
    action === 'divide'
  ) {
    keys.dataset.previousKeyType = 'operator';
    keys.dataset.firstValue = displayedNum;
    keys.dataset.operator = action;
  }

  // イコールキー
  if (action === 'calculate') {
    const firstValue = keys.dataset.firstValue;
    const operator = keys.dataset.operator;
    const secondValue = displayedNum;

    display.textContent = calculate(firstValue, operator, secondValue);
    keys.dataset.previousKeyType = 'calculate';
  }

  // クリアキー
  if (action === 'clear') {
    display.textContent = '0';
    keys.dataset.firstValue = '';
    keys.dataset.operator = '';
    keys.dataset.previousKeyType = '';
  }

  // バックスペースキー
  if (action === 'backspace') {
    if (displayedNum.length > 1) {
      display.textContent = displayedNum.slice(0, -1);
    } else {
      display.textContent = '0';
    }
  }

  // 小数点キー
  if (action === 'decimal') {
    if (!displayedNum.includes('.')) {
      display.textContent = displayedNum + '.';
    } else if (previousKeyType === 'operator' || previousKeyType === 'calculate') {
      display.textContent = '0.';
    }

    keys.dataset.previousKeyType = 'decimal';
  }

  // 符号反転キー
  if (action === 'negate') {
    display.textContent = (-parseFloat(displayedNum)).toString();
  }

  // パーセントキー
  if (action === 'percent') {
    display.textContent = (parseFloat(displayedNum) / 100).toString();
  }
});

// 計算関数
function calculate(n1, operator, n2) {
  let result = '';

  const num1 = parseFloat(n1);
  const num2 = parseFloat(n2);

  if (operator === 'add') {
    result = num1 + num2;
  } else if (operator === 'subtract') {
    result = num1 - num2;
  } else if (operator === 'multiply') {
    result = num1 * num2;
  } else if (operator === 'divide') {
    result = num1 / num2;
  }

  return result.toString();
}
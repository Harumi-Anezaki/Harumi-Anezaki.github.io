const historyElement = document.getElementById('history');
const resultElement = document.getElementById('result');
const buttons = document.querySelectorAll('.btn');

let history = '';
let currentInput = '0';
let isResultDisplayed = false;

buttons.forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const buttonContent = button.textContent;

    if (button.classList.contains('number')) {
      inputNumber(buttonContent);
    } else if (button.classList.contains('operator')) {
      inputOperator(action, buttonContent);
    } else if (button.classList.contains('function')) {
      inputFunction(action);
    } else if (action === 'calculate') {
      calculateResult();
    }
  });
});

function inputNumber(num) {
  if (currentInput === '0' || isResultDisplayed) {
    currentInput = num;
    isResultDisplayed = false;
  } else {
    currentInput += num;
  }
  updateDisplay();
}

function inputOperator(operator, symbol) {
  if (isResultDisplayed) {
    history = resultElement.textContent + ' ' + symbol + ' ';
    isResultDisplayed = false;
  } else {
    history += currentInput + ' ' + symbol + ' ';
  }
  currentInput = '';
  updateDisplay();
}

function inputFunction(action) {
  switch(action) {
    case 'clear':
      history = '';
      currentInput = '0';
      break;
    case 'backspace':
      if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
      } else {
        currentInput = '0';
      }
      break;
    case 'decimal':
      if (!currentInput.includes('.')) {
        currentInput += '.';
      }
      break;
    case 'negate':
      currentInput = (-parseFloat(currentInput)).toString();
      break;
    case 'percent':
      currentInput = (parseFloat(currentInput) / 100).toString();
      break;
    case 'sin':
      currentInput = Math.sin(degToRad(parseFloat(currentInput))).toString();
      isResultDisplayed = true;
      break;
    case 'cos':
      currentInput = Math.cos(degToRad(parseFloat(currentInput))).toString();
      isResultDisplayed = true;
      break;
    case 'tan':
      currentInput = Math.tan(degToRad(parseFloat(currentInput))).toString();
      isResultDisplayed = true;
      break;
    case 'log':
      currentInput = Math.log10(parseFloat(currentInput)).toString();
      isResultDisplayed = true;
      break;
    default:
      break;
  }
  updateDisplay();
}

function calculateResult() {
  try {
    history += currentInput;
    let expression = history.replace(/÷/g, '/').replace(/×/g, '*').replace(/－/g, '-').replace(/＋/g, '+');
    let result = eval(expression);
    if (!isFinite(result)) throw new Error("計算エラー");
    currentInput = result.toString();
    isResultDisplayed = true;
    history = '';
    updateDisplay();
  } catch (error) {
    currentInput = 'エラー';
    isResultDisplayed = true;
    history = '';
    updateDisplay();
  }
}

function updateDisplay() {
  resultElement.textContent = currentInput;
  historyElement.textContent = history;
}

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}
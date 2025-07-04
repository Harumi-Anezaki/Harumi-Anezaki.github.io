const display = document.getElementById('display');

function append(value) {
    display.value += value;
}

function operator(op) {
    display.value += ` ${op} `;
}

function func(f) {
    display.value += f;
}

function clearDisplay() {
    display.value = '';
}

function calculate() {
    try {
        let expression = display.value
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .replace(/－/g, '-')
            .replace(/＋/g, '+')
            .replace(/sin$(.*?)$/g, 'Math.sin($1)')
            .replace(/cos$(.*?)$/g, 'Math.cos($1)')
            .replace(/tan$(.*?)$/g, 'Math.tan($1)')
            .replace(/log$(.*?)$/g, 'Math.log10($1)')
            .replace(/√$(.*?)$/g, 'Math.sqrt($1)');

        let result = eval(expression);
        display.value = result;
    } catch (error) {
        display.value = 'エラー';
    }
}
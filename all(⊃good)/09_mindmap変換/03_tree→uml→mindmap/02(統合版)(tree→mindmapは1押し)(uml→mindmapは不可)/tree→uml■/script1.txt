document.getElementById('convertButton').addEventListener('click', function() {
    const treeInput = document.getElementById('treeInput').value;
    const plantUmlOutput = convertTreeToPlantUml(treeInput);
    document.getElementById('plantUmlOutput').value = plantUmlOutput;
});

document.getElementById('copyButton').addEventListener('click', function() {
    const output = document.getElementById('plantUmlOutput');
    output.select();
    output.setSelectionRange(0, 99999); // モバイルデバイス対応
    document.execCommand('copy');
    alert('出力をクリップボードにコピーしました。');
});

function convertTreeToPlantUml(treeText) {
    const lines = treeText.split('\n');
    let result = '@startmindmap\n';
    const stack = [];
    const indentStack = [];

    for (let line of lines) {
        // 空行をスキップ
        if (!line.trim()) continue;

        // 特殊文字とスペースを除去してテキストを取得
        const contentMatch = line.match(/([^\s│├─└─]+.*)$/);
        if (!contentMatch) continue;
        const content = contentMatch[1].trim();

        // 行頭の特殊文字とスペースをカウントしてインデントレベルを計算
        const indentMatch = line.match(/^(\s*(?:│|\s|├─|└─)*)/);
        const indentStr = indentMatch ? indentMatch[1] : '';
        // インデントレベルを計算（4文字ごとに1レベルと仮定）
        const indentLevel = (indentStr.replace(/├─|└─|│/g, '    ').length) / 4;

        // スタックの調整
        while (indentStack.length > 0 && indentStack[indentStack.length - 1] >= indentLevel) {
            indentStack.pop();
            stack.pop();
        }

        indentStack.push(indentLevel);
        stack.push(content);

        // アスタリスクの数はスタックの長さ
        const asterisks = '*'.repeat(indentStack.length);

        result += `${asterisks} ${content}\n`;
    }

    result += '@endmindmap';
    return result;
}
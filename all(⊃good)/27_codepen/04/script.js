// CodeMirrorエディタの初期化 (変更なし)
const htmlEditor = CodeMirror.fromTextArea(document.getElementById("html-code"), {
    mode: "xml",
    theme: "dracula",
    lineNumbers: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
});

const cssEditor = CodeMirror.fromTextArea(document.getElementById("css-code"), {
    mode: "css",
    theme: "dracula",
    lineNumbers: true,
    autoCloseBrackets: true,
});

const jsEditor = CodeMirror.fromTextArea(document.getElementById("js-code"), {
    mode: "javascript",
    theme: "dracula",
    lineNumbers: true,
    autoCloseBrackets: true,
});

// プレビューを更新する関数 (変更なし)
function updatePreview() {
    const previewWindow = document.getElementById("preview-window").contentWindow.document;
    previewWindow.open();
    previewWindow.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>${cssEditor.getValue()}</style>
        </head>
        <body>
            ${htmlEditor.getValue()}
            <script>${jsEditor.getValue()}</script>
        </body>
        </html>
    `);
    previewWindow.close();
}

// 各エディタの内容が変更されたときにプレビューを更新 (変更なし)
htmlEditor.on("change", updatePreview);
cssEditor.on("change", updatePreview);
jsEditor.on("change", updatePreview);

// 初期プレビューの表示 (変更なし)
updatePreview();

// Split.jsの初期化 (変更なし)
Split(['#code-area', '#preview-window'], {
    sizes: [20, 80],
    minSize: [200, 200],
    gutterSize: 8,
    cursor: 'col-resize',
    direction: 'horizontal',
});

// エクスポートボタンのクリックイベント
document.getElementById('export-button').addEventListener('click', exportCode);

// コードをエクスポートする関数
function exportCode() {
    // HTML
    const htmlContent = htmlEditor.getValue();
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    downloadFile(htmlBlob, 'index.html');

    // CSS
    const cssContent = cssEditor.getValue();
    const cssBlob = new Blob([cssContent], { type: 'text/css' });
    downloadFile(cssBlob, 'style.css');

    // JavaScript
    const jsContent = jsEditor.getValue();
    const jsBlob = new Blob([jsContent], { type: 'text/javascript' });
    downloadFile(jsBlob, 'script.js');
}

// ファイルをダウンロードする関数
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); //  Firefox, other browsers
    a.click();
    document.body.removeChild(a); //  Firefox, other browsers
    URL.revokeObjectURL(url); // メモリ解放 (a.click()の後)
}
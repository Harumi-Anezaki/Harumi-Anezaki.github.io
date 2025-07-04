// CodeMirrorエディタの初期化
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

// プレビューを更新する関数
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

// 各エディタの内容が変更されたときにプレビューを更新
htmlEditor.on("change", updatePreview);
cssEditor.on("change", updatePreview);
jsEditor.on("change", updatePreview);

// 初期プレビューの表示
updatePreview();

// Split.jsの初期化
Split(['#code-area', '#preview-window'], {
    sizes: [50, 50], // 初期サイズは50%ずつ
    minSize: [200, 200],     // 最小サイズ。
    gutterSize: 8,          // 仕切りの太さ
    cursor: 'col-resize',    // カーソルの形状
    direction: 'horizontal',// 水平方向に分割
});
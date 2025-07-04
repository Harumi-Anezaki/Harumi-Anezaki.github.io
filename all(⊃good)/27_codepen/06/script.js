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
    sizes: [20, 80],
    minSize: [200, 200],
    gutterSize: 8,
    cursor: 'col-resize',
    direction: 'horizontal',
});

// エクスポートボタンのクリックイベント (非同期処理に変更)
document.getElementById('export-button').addEventListener('click', async () => {
    try {
        await exportCode(); // exportCode関数をawaitで呼び出す
    } catch (error) {
        console.error("エクスポート中にエラーが発生しました:", error);
        alert("エクスポートに失敗しました。"); // エラーをユーザーに通知
    }
});

// File System Access API を使ってコードをエクスポートする関数
async function exportCode() {
    // ディレクトリ（フォルダ）のハンドルを取得
    const dirHandle = await window.showDirectoryPicker();

    // "01" フォルダを作成 (既に存在する場合は既存のものを取得)
    const folderHandle = await dirHandle.getDirectoryHandle("01", { create: true });

    // HTMLファイルを保存
    const htmlFileHandle = await folderHandle.getFileHandle("index.html", { create: true });
    const htmlWritable = await htmlFileHandle.createWritable();
    await htmlWritable.write(htmlEditor.getValue());
    await htmlWritable.close();

    // CSSファイルを保存
    const cssFileHandle = await folderHandle.getFileHandle("style.css", { create: true });
    const cssWritable = await cssFileHandle.createWritable();
    await cssWritable.write(cssEditor.getValue());
    await cssWritable.close();

    // JavaScriptファイルを保存
    const jsFileHandle = await folderHandle.getFileHandle("script.js", { create: true });
    const jsWritable = await jsFileHandle.createWritable();
    await jsWritable.write(jsEditor.getValue());
    await jsWritable.close();

    alert("コードをエクスポートしました！"); // 成功をユーザーに通知
}
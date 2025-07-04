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

// フォルダ作成＆エクスポートボタンのクリックイベント
document.getElementById('create-folder-button').addEventListener('click', async () => {
   try {
    const folderName = document.getElementById('folder-name').value;
    if (!folderName) {
      alert("フォルダ名を入力してください。");
      return;
    }
    // フォルダ選択はユーザーに任せる
    const dirHandle = await window.showDirectoryPicker();
    // フォルダ作成
    const folderHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
    await exportCode(folderHandle); //作成したフォルダをexportCodeに渡す

   } catch(error){
    console.error("フォルダ作成中にエラーが発生しました:", error);
        alert("フォルダ作成に失敗しました。");
   }
});

// File System Access API を使ってコードをエクスポートする関数
// 引数にdirHandle(またはfolderHandle)を受け取る
async function exportCode(dirHandle) {
    // HTMLファイルを保存
    const htmlFileHandle = await dirHandle.getFileHandle("index.html", { create: true });
    const htmlWritable = await htmlFileHandle.createWritable();
    await htmlWritable.write(htmlEditor.getValue());
    await htmlWritable.close();

    // CSSファイルを保存
    const cssFileHandle = await dirHandle.getFileHandle("style.css", { create: true });
    const cssWritable = await cssFileHandle.createWritable();
    await cssWritable.write(cssEditor.getValue());
    await cssWritable.close();

    // JavaScriptファイルを保存
    const jsFileHandle = await dirHandle.getFileHandle("script.js", { create: true });
    const jsWritable = await jsFileHandle.createWritable();
    await jsWritable.write(jsEditor.getValue());
    await jsWritable.close();

    alert("コードをエクスポートしました！"); // 成功をユーザーに通知
}
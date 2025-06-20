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

// プレビューを更新する関数
function updatePreview() {
    const previewFrame = document.getElementById("preview-window");
    const preview =  previewFrame.contentDocument ||  previewFrame.contentWindow.document;

    const htmlCode = htmlEditor.getValue();
    const cssCode = cssEditor.getValue();
    const jsCode = jsEditor.getValue();

    // HTMLの骨格を組み立てる
    const previewContent = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <style>
                ${cssCode}
            </style>
        </head>
        <body>
            ${htmlCode}
            <script>
                // DOMの読み込みが完了してからJSを実行する
                document.addEventListener('DOMContentLoaded', function() {
                    try {
                        ${jsCode}
                    } catch (e) {
                        console.error(e);
                    }
                });
            </script>
        </body>
        </html>
    `;
    
    // iframeに内容を書き込む
    preview.open();
    preview.write(previewContent);
    preview.close();
}

// 各エディタの内容が変更されたときにプレビューを更新
htmlEditor.on("change", updatePreview);
cssEditor.on("change", updatePreview);
jsEditor.on("change", updatePreview);

// 初期プレビューの表示
updatePreview();

// Split.jsの初期化 (変更なし)
Split(['#code-area', '#preview-window'], {
    sizes: [20,80], // 初期サイズを調整しました
    minSize: [200, 200],
    gutterSize: 8,
    cursor: 'col-resize',
    direction: 'horizontal',
});


// フォルダ作成＆エクスポート機能 (変更なし)
document.getElementById('create-folder-button').addEventListener('click', async () => {
   try {
    const folderName = document.getElementById('folder-name').value;
    if (!folderName) {
      alert("フォルダ名を入力してください。");
      return;
    }
    const dirHandle = await window.showDirectoryPicker();
    const folderHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
    await exportCode(folderHandle);

   } catch(error){
    console.error("フォルダ作成中にエラーが発生しました:", error);
        alert("フォルダ作成に失敗しました。");
   }
});

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
}
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

// Split.jsの初期化
Split(['#code-area', '#preview-window'], {
    sizes: [20, 80], // サイズを変更しないで
    minSize: [200, 200],
    gutterSize: 8,
    cursor: 'col-resize',
    direction: 'horizontal',
});


// --- ▼ここから変更箇所▼ ---

// エクスポート機能
document.getElementById('create-folder-button').addEventListener('click', async () => {
    // folder-name入力欄は「ファイル名」または「フォルダ名」として扱う
    const name = document.getElementById('folder-name').value;
    if (!name) {
      alert("ファイル名またはフォルダ名を入力してください。");
      return;
    }

    const cssCode = cssEditor.getValue();
    const jsCode = jsEditor.getValue();

    try {
        // CSSとJSが両方とも未入力（空白のみも含む）の場合
        if (cssCode.trim() === '' && jsCode.trim() === '') {
            await exportAsSingleFile(name);
        } else {
            // CSSまたはJSにコードがある場合
            await exportAsProjectFolder(name);
        }
    } catch (error) {
        // ユーザーがダイアログをキャンセルした場合はエラーとしない
        if (error.name === 'AbortError') {
            console.log('ファイル/フォルダの保存がキャンセルされました。');
            return;
        }
        console.error("エクスポート中にエラーが発生しました:", error);
        alert("エクスポートに失敗しました。");
    }
});

/**
 * 単一のHTMLファイルとして保存する
 * @param {string} fileName - 保存するファイル名 (拡張子なし)
 */
async function exportAsSingleFile(fileName) {
    const htmlCode = htmlEditor.getValue();

    // 保存するHTMLコンテンツを生成 (CSS/JSは空なので埋め込まない)
    const fileContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName}</title>
</head>
<body>
${htmlCode}
</body>
</html>`;

    // ファイル保存ダイアログを表示
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${fileName}.html`,
        types: [{
            description: 'HTML File',
            accept: { 'text/html': ['.html'] },
        }],
    });

    // ファイルに書き込み
    const writable = await fileHandle.createWritable();
    await writable.write(fileContent);
    await writable.close();
    alert(`'${fileHandle.name}' を保存しました。`);
}

/**
 * プロジェクトフォルダとして保存する
 * @param {string} folderName - 作成するフォルダ名
 */
async function exportAsProjectFolder(folderName) {
    const htmlCode = htmlEditor.getValue();
    const cssCode = cssEditor.getValue();
    const jsCode = jsEditor.getValue();

    // CSS/JSのコードがあるかどうかに応じて、<link>と<script>タグを生成
    const cssLinkTag = cssCode.trim() !== '' ? `    <link rel="stylesheet" href="style.css">\n` : '';
    const jsScriptTag = jsCode.trim() !== '' ? `    <script src="script.js"></script>\n` : '';

    // 外部ファイルを読み込む形式のHTMLコンテンツを生成
    const indexHtmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${folderName}</title>
${cssLinkTag}</head>
<body>
${htmlCode}
${jsScriptTag}</body>
</html>`;

    // フォルダ選択ダイアログを表示し、指定名のフォルダを作成
    const dirHandle = await window.showDirectoryPicker();
    const folderHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });

    // 各ファイルを保存
    // HTML
    const htmlFileHandle = await folderHandle.getFileHandle("index.html", { create: true });
    const htmlWritable = await htmlFileHandle.createWritable();
    await htmlWritable.write(indexHtmlContent);
    await htmlWritable.close();

    // CSS (コードがある場合のみ)
    if (cssCode.trim() !== '') {
        const cssFileHandle = await folderHandle.getFileHandle("style.css", { create: true });
        const cssWritable = await cssFileHandle.createWritable();
        await cssWritable.write(cssCode);
        await cssWritable.close();
    }

    // JavaScript (コードがある場合のみ)
    if (jsCode.trim() !== '') {
        const jsFileHandle = await folderHandle.getFileHandle("script.js", { create: true });
        const jsWritable = await jsFileHandle.createWritable();
        await jsWritable.write(jsCode);
        await jsWritable.close();
    }
    alert(`'${folderName}' フォルダにプロジェクトを保存しました。`);
}
// --- ▲ここまで変更箇所▲ ---

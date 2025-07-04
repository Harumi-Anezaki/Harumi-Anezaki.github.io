// script.js

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const insertPageBreakBtn = document.getElementById('insert-page-break');

    // 1. 「改ページを挿入」ボタンの処理
    insertPageBreakBtn.addEventListener('click', () => {
        // エディタにフォーカスを当てる
        editor.focus();

        // カーソル位置に改ページ要素(<hr>)を挿入する
        // document.execCommandは古い方法ですが、この用途では最もシンプルで確実です。
        document.execCommand('insertHTML', false, '<hr class="manual-page-break">');
    });

    // 2. ペースト時にプレーンテキストのみを許可する処理
    editor.addEventListener('paste', (event) => {
        // デフォルトのペースト動作をキャンセル
        event.preventDefault();

        // クリップボードからプレーンテキストを取得
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');

        // 取得したテキストをカーソル位置に挿入
        document.execCommand('insertText', false, text);
    });
});
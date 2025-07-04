// script.js

const editorContainer = document.body;

/**
 * 新しいページ要素を作成して返す
 * @returns {HTMLElement} 新しいページ要素
 */
function createNewPage() {
    const page = document.createElement('div');
    page.className = 'page';
    const textarea = document.createElement('textarea');
    page.appendChild(textarea);
    return page;
}

/**
 * テキストの再配置（リフロー）処理
 * @param {number} startIndex - リフローを開始するページのインデックス
 */
function reflowText(startIndex = 0) {
    const pages = Array.from(editorContainer.querySelectorAll('.page'));
    const textareas = pages.map(p => p.querySelector('textarea'));

    // --- 1. カーソル位置の保存 ---
    // 文書全体での絶対的なカーソル位置を計算
    let absoluteCursorPosition = 0;
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'TEXTAREA') {
        const activeIndex = textareas.indexOf(activeElement);
        for (let i = 0; i < activeIndex; i++) {
            absoluteCursorPosition += textareas[i].value.length;
        }
        absoluteCursorPosition += activeElement.selectionStart;
    }

    // --- 2. テキストの収集 ---
    // リフロー対象のページから全テキストを結合
    let combinedText = '';
    for (let i = startIndex; i < textareas.length; i++) {
        combinedText += textareas[i].value;
        if (i > startIndex) {
            // 不要になったページは一旦空にする
            textareas[i].value = '';
        }
    }
    // startIndexのページも、これから再配置するので一旦テキストを切り詰める
    textareas[startIndex].value = textareas[startIndex].value.substring(0, textareas[startIndex].value.length - combinedText.length);


    // --- 3. テキストの再配置 ---
    let currentPageIndex = startIndex;
    let currentText = textareas[currentPageIndex].value;

    for (const char of combinedText) {
        const textarea = textareas[currentPageIndex];
        textarea.value += char;

        // ページが溢れたかチェック
        if (textarea.scrollHeight > textarea.clientHeight) {
            // 溢れた文字を元に戻す
            textarea.value = textarea.value.slice(0, -1);
            
            // 次のページへ
            currentPageIndex++;
            if (currentPageIndex >= textareas.length) {
                // 新しいページが必要なら追加
                const newPage = createNewPage();
                editorContainer.appendChild(newPage);
                pages.push(newPage);
                textareas.push(newPage.querySelector('textarea'));
            }
            // 新しいページに文字を入れる
            textareas[currentPageIndex].value += char;
        }
    }

    // --- 4. 不要なページの削除 ---
    for (let i = textareas.length - 1; i > 0; i--) {
        if (textareas[i].value === '' && i > currentPageIndex) {
            pages[i].remove();
        } else {
            break; // テキストのあるページに到達したら終了
        }
    }
    // 最初のページが空で、ページが複数ある場合は削除しない（最低1ページは残す）
    if (pages.length > 1 && textareas[0].value === '') {
        // このケースは通常、バックスペースでのページ結合で処理される
    }


    // --- 5. カーソル位置の復元 ---
    let cumulativeLength = 0;
    const updatedTextareas = Array.from(editorContainer.querySelectorAll('textarea'));
    for (let i = 0; i < updatedTextareas.length; i++) {
        const pageLength = updatedTextareas[i].value.length;
        if (absoluteCursorPosition <= cumulativeLength + pageLength) {
            const newCursorPosition = absoluteCursorPosition - cumulativeLength;
            updatedTextareas[i].focus();
            updatedTextareas[i].setSelectionRange(newCursorPosition, newCursorPosition);
            break;
        }
        cumulativeLength += pageLength;
    }
}

// イベントリスナー
editorContainer.addEventListener('input', (e) => {
    if (e.target.tagName !== 'TEXTAREA') return;

    const textareas = Array.from(editorContainer.querySelectorAll('textarea'));
    const currentIndex = textareas.indexOf(e.target);

    // バックスペースでページが結合されるケース
    if (e.inputType === 'deleteContentBackward' && e.target.selectionStart === 0 && currentIndex > 0) {
        // カーソル位置を前のページの末尾に設定
        const prevTextarea = textareas[currentIndex - 1];
        const newCursorPos = prevTextarea.value.length;
        
        // テキストを結合
        prevTextarea.value += e.target.value;
        
        // 現在のページを削除
        e.target.closest('.page').remove();
        
        // カーソルを移動
        prevTextarea.focus();
        prevTextarea.setSelectionRange(newCursorPos, newCursorPos);
        
        // 結合したページからリフローを開始
        reflowText(currentIndex - 1);
    } else {
        // 通常の入力・削除
        reflowText(currentIndex);
    }
});

// 初期化（最初のページにプレースホルダーを設定）
document.querySelector('textarea').placeholder = "ここに文章を入力してください...";
editorContainer.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'TEXTAREA') {
        e.target.placeholder = '';
    }
});
editorContainer.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'TEXTAREA' && e.target.value === '') {
        e.target.placeholder = "ここに文章を入力してください...";
    }
});
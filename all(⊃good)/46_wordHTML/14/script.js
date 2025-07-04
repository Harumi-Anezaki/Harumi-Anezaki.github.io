// script.js

const editorContainer = document.body;

// --- パフォーマンス改善の核：仮想計算エリア ---
// 画面外に計算用のtextareaを1つだけ用意する
const offscreenTextarea = document.createElement('textarea');
// スタイルをコピーして正確な計算を保証する
const firstTextarea = document.querySelector('textarea');
const computedStyle = window.getComputedStyle(firstTextarea);
[
    'width', 'fontFamily', 'fontSize', 'lineHeight', 
    'padding', 'border', 'boxSizing'
].forEach(prop => {
    offscreenTextarea.style[prop] = computedStyle[prop];
});
// 画面外に配置
offscreenTextarea.style.position = 'absolute';
offscreenTextarea.style.top = '-9999px';
offscreenTextarea.style.left = '-9999px';
offscreenTextarea.style.height = 'auto'; // 高さは自動で伸びるように
document.body.appendChild(offscreenTextarea);
const pageClientHeight = firstTextarea.clientHeight;


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
 * テキストの再配置（リフロー）処理【軽量版】
 * @param {number} startIndex - リフローを開始するページのインデックス
 */
function reflowText(startIndex = 0) {
    const pages = Array.from(editorContainer.querySelectorAll('.page'));
    let textareas = pages.map(p => p.querySelector('textarea'));

    // 1. カーソル位置の保存
    const activeElement = document.activeElement;
    let absoluteCursorPosition = -1;
    if (activeElement.tagName === 'TEXTAREA') {
        const activeIndex = textareas.indexOf(activeElement);
        absoluteCursorPosition = activeElement.selectionStart;
        for (let i = 0; i < activeIndex; i++) {
            absoluteCursorPosition += textareas[i].value.length;
        }
    }

    // 2. テキストの収集
    let combinedText = '';
    for (let i = startIndex; i < textareas.length; i++) {
        combinedText += textareas[i].value;
    }

    // 3. 仮想リフロー（計算処理）
    const newPagesContent = []; // 各ページに収まるテキストを格納する配列
    let currentText = textareas[startIndex].value.substring(0, textareas[startIndex].value.length - combinedText.length);
    
    offscreenTextarea.value = currentText;
    for (const char of combinedText) {
        offscreenTextarea.value += char;
        if (offscreenTextarea.scrollHeight > pageClientHeight) {
            // ページが溢れたら、現在の内容（最後の文字を除く）を確定
            newPagesContent.push(offscreenTextarea.value.slice(0, -1));
            // 次のページの内容は、溢れた最後の1文字から開始
            offscreenTextarea.value = char;
        }
    }
    newPagesContent.push(offscreenTextarea.value); // 最後のページの内容を追加

    // 4. DOMへの一括反映
    // startIndexより前のページは変更しない
    const unchangedPagesContent = textareas.slice(0, startIndex).map(t => t.value);
    const finalPagesContent = [...unchangedPagesContent, ...newPagesContent];

    // ページ数の調整
    while (pages.length < finalPagesContent.length) {
        const newPage = createNewPage();
        editorContainer.appendChild(newPage);
        pages.push(newPage);
    }
    while (pages.length > finalPagesContent.length && pages.length > 1) {
        pages.pop().remove();
    }

    // テキストの反映
    textareas = Array.from(editorContainer.querySelectorAll('textarea'));
    finalPagesContent.forEach((content, i) => {
        if (textareas[i].value !== content) {
            textareas[i].value = content;
        }
    });

    // 5. カーソル位置の復元
    if (absoluteCursorPosition === -1) return;
    let cumulativeLength = 0;
    for (let i = 0; i < textareas.length; i++) {
        const pageLength = textareas[i].value.length;
        if (absoluteCursorPosition <= cumulativeLength + pageLength) {
            const newCursorPosition = absoluteCursorPosition - cumulativeLength;
            textareas[i].focus();
            textareas[i].setSelectionRange(newCursorPosition, newCursorPosition);
            break;
        }
        cumulativeLength += pageLength;
    }
}

// --- イベントリスナー ---
let reflowTimeout;
editorContainer.addEventListener('input', (e) => {
    if (e.target.tagName !== 'TEXTAREA') return;

    // デバウンス処理：連続入力中はリフローを遅延させ、入力の邪魔をしない
    clearTimeout(reflowTimeout);
    reflowTimeout = setTimeout(() => {
        const textareas = Array.from(editorContainer.querySelectorAll('textarea'));
        const currentIndex = textareas.indexOf(e.target);
        reflowText(currentIndex);
    }, 200); // 200ms入力がなければ実行
});

editorContainer.addEventListener('keydown', (e) => {
    // バックスペースでのページ結合は即時実行する
    if (e.key === 'Backspace') {
        const textarea = e.target;
        if (textarea.tagName !== 'TEXTAREA') return;

        if (textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
            const pages = Array.from(editorContainer.querySelectorAll('.page'));
            const currentIndex = pages.findIndex(p => p.contains(textarea));
            if (currentIndex > 0) {
                e.preventDefault(); // デフォルトのバックスペース動作をキャンセル
                clearTimeout(reflowTimeout); // デバウンスをキャンセル

                const prevTextarea = pages[currentIndex - 1].querySelector('textarea');
                const cursorPos = prevTextarea.value.length;
                
                prevTextarea.value += textarea.value;
                pages[currentIndex].remove();

                prevTextarea.focus();
                prevTextarea.setSelectionRange(cursorPos, cursorPos);
                
                reflowText(currentIndex - 1);
            }
        }
    }
});

// 初期化（プレースホルダー設定）
document.querySelector('textarea').placeholder = "ここに文章を入力してください...";
editorContainer.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'TEXTAREA') e.target.placeholder = '';
});
editorContainer.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'TEXTAREA' && e.target.value === '') e.target.placeholder = "ここに文章を入力してください...";
});
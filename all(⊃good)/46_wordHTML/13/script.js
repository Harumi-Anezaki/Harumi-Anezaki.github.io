// script.js - 軽量版

const editorContainer = document.body;
let debounceTimer;

// --- パフォーマンス改善の核となる「計測用textarea」 ---
// 画面には表示せず、テキストの高さ計算のためだけに使用する
const measuringTextarea = document.createElement('textarea');
// style.cssのtextareaと同じスタイルを適用
Object.assign(measuringTextarea.style, {
    fontFamily: `"游明朝", YuMincho, "ヒラギノ明朝 ProN W3", "Hiragino Mincho ProN", "ＭＳ Ｐ明朝", "MS PMincho", serif`,
    fontSize: '11pt',
    lineHeight: '1.8',
    width: `calc(210mm - 4cm)`, // pageのwidth - padding*2
    height: 'auto',
    position: 'absolute',
    left: '-9999px', // 画面外に飛ばす
    top: '-9999px',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
});
editorContainer.appendChild(measuringTextarea);


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
 * テキストの再配置（リフロー）処理 - 最適化版
 * @param {number} startIndex - リフローを開始するページのインデックス
 */
function reflowText(startIndex = 0) {
    const pages = Array.from(editorContainer.querySelectorAll('.page'));
    const textareas = pages.map(p => p.querySelector('textarea'));

    // 1. カーソル位置の保存（変更なし）
    let absoluteCursorPosition = 0;
    const activeElement = document.activeElement;
    const activeIndex = activeElement.tagName === 'TEXTAREA' ? textareas.indexOf(activeElement) : -1;
    if (activeIndex !== -1) {
        for (let i = 0; i < activeIndex; i++) {
            absoluteCursorPosition += textareas[i].value.length;
        }
        absoluteCursorPosition += activeElement.selectionStart;
    }

    // 2. テキストの収集（変更なし）
    let combinedText = '';
    for (let i = startIndex; i < textareas.length; i++) {
        combinedText += textareas[i].value;
    }

    // 3. 【最適化】計算フェーズ：DOM操作をせず、テキストの割り振りを計算
    const newPagesContent = [];
    let currentText = textareas[startIndex].value.substring(0, textareas[startIndex].value.length - combinedText.length);
    
    measuringTextarea.value = currentText;
    for (const char of combinedText) {
        measuringTextarea.value += char;
        if (measuringTextarea.scrollHeight > measuringTextarea.clientHeight) {
            newPagesContent.push(measuringTextarea.value.slice(0, -1));
            measuringTextarea.value = char;
        }
    }
    newPagesContent.push(measuringTextarea.value);

    // 4. 【最適化】DOM更新フェーズ：計算結果をDOMに一括反映
    const requiredPages = newPagesContent.length;
    const existingPages = pages.length - startIndex;

    // ページ数の調整
    for (let i = 0; i < requiredPages - existingPages; i++) {
        editorContainer.appendChild(createNewPage());
    }
    for (let i = 0; i < existingPages - requiredPages; i++) {
        if (pages.length > 1) pages[pages.length - 1].remove();
    }

    // テキストの一括更新
    const updatedPages = Array.from(editorContainer.querySelectorAll('.page'));
    for (let i = 0; i < newPagesContent.length; i++) {
        updatedPages[startIndex + i].querySelector('textarea').value = newPagesContent[i];
    }
    
    // 5. カーソル位置の復元（変更なし）
    let cumulativeLength = 0;
    const finalTextareas = Array.from(editorContainer.querySelectorAll('textarea'));
    for (let i = 0; i < finalTextareas.length; i++) {
        const pageLength = finalTextareas[i].value.length;
        if (absoluteCursorPosition <= cumulativeLength + pageLength || i === finalTextareas.length - 1) {
            const newCursorPosition = absoluteCursorPosition - cumulativeLength;
            finalTextareas[i].focus();
            finalTextareas[i].setSelectionRange(newCursorPosition, newCursorPosition);
            break;
        }
        cumulativeLength += pageLength;
    }
}

// --- イベントリスナー ---
editorContainer.addEventListener('input', (e) => {
    if (e.target.tagName !== 'TEXTAREA') return;

    const textareas = Array.from(editorContainer.querySelectorAll('textarea'));
    const currentIndex = textareas.indexOf(e.target);

    // ページ先頭でのバックスペースは、UXを優先して即時実行
    if (e.inputType === 'deleteContentBackward' && e.target.selectionStart === 0 && currentIndex > 0) {
        clearTimeout(debounceTimer); // 進行中のデバウンスはキャンセル
        
        const prevTextarea = textareas[currentIndex - 1];
        const newCursorPos = prevTextarea.value.length;
        
        prevTextarea.value += e.target.value;
        e.target.closest('.page').remove();
        
        prevTextarea.focus();
        prevTextarea.setSelectionRange(newCursorPos, newCursorPos);
        
        reflowText(currentIndex - 1);
    } else {
        // 通常の入力はデバウンス処理で負荷を軽減
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            reflowText(currentIndex);
        }, 250); // 250ミリ秒入力がなければ実行
    }
});

// 初期ページの生成
if (editorContainer.querySelectorAll('.page').length === 0) {
    editorContainer.appendChild(createNewPage());
}
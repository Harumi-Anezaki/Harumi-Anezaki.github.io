// Elements
const textInput = document.getElementById('textInput');
const charCountWithSpaces = document.getElementById('charCountWithSpaces');
const charCountWithoutSpaces = document.getElementById('charCountWithoutSpaces');
const wordCount = document.getElementById('wordCount');
const sentenceCount = document.getElementById('sentenceCount');
const paragraphCount = document.getElementById('paragraphCount');
const avgWordsPerSentence = document.getElementById('avgWordsPerSentence');
const readingTime = document.getElementById('readingTime');
const speakingTime = document.getElementById('speakingTime');
const keywordDensityList = document.getElementById('keywordDensityList');
const copyButton = document.getElementById('copyButton');
const themeToggle = document.getElementById('themeToggle');

const longestWord = document.getElementById('longestWord');
const avgWordLength = document.getElementById('avgWordLength');
const hiraganaCount = document.getElementById('hiraganaCount');
const katakanaCount = document.getElementById('katakanaCount');
const kanjiCount = document.getElementById('kanjiCount');
const alphanumericCount = document.getElementById('alphanumericCount');

const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const printButton = document.getElementById('printButton');
const downloadButton = document.getElementById('downloadButton');
const alignLeftButton = document.getElementById('alignLeftButton');
const alignCenterButton = document.getElementById('alignCenterButton');
const alignRightButton = document.getElementById('alignRightButton');
const fontSelect = document.getElementById('fontSelect');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const keywordChart = document.getElementById('keywordChart');

const charProgress = document.getElementById('charProgress');
const wordProgress = document.getElementById('wordProgress');

// Variables for undo/redo
let undoStack = [];
let redoStack = [];
let isTyping = false;

// Event Listeners
textInput.addEventListener('input', () => {
    updateStats();
    saveToLocalStorage();
    handleUndoRedo();
});

copyButton.addEventListener('click', () => {
    textInput.select();
    document.execCommand('copy');
    alert('テキストをクリップボードにコピーしました。');
});

themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', themeToggle.checked);
});

undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
printButton.addEventListener('click', printText);
downloadButton.addEventListener('click', downloadText);
alignLeftButton.addEventListener('click', () => setAlignment('left'));
alignCenterButton.addEventListener('click', () => setAlignment('center'));
alignRightButton.addEventListener('click', () => setAlignment('right'));
fontSelect.addEventListener('change', changeFont);
fontSizeSlider.addEventListener('input', changeFontSize);
searchButton.addEventListener('click', searchText);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchText();
    }
});

// Functions
function updateStats() {
    const text = textInput.value;
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s+/g, '').length;
    
    // 改善された単語数の計算
    const words = extractWords(text);
    
    // 改善された文の数の計算
    const sentences = extractSentences(text);
    
    // 段落の数の計算
    const paragraphs = text.split(/\n+/).filter(paragraph => paragraph.trim().length > 0);
    
    // 平均単語数/文
    const avgWords = sentences.length > 0 ? (words.length / sentences.length).toFixed(2) : 0;
    
    // 読み時間（日本語の平均読書速度: 400文字/分）
    const readingTimeMinutes = (charsWithoutSpaces / 400).toFixed(1);
    
    // 話し時間（日本語の平均話す速度: 300文字/分）
    const speakingTimeMinutes = (charsWithoutSpaces / 300).toFixed(1);
    
    charCountWithSpaces.textContent = charsWithSpaces;
    charCountWithoutSpaces.textContent = charsWithoutSpaces;
    wordCount.textContent = words.length;
    sentenceCount.textContent = sentences.length;
    paragraphCount.textContent = paragraphs.length;
    avgWordsPerSentence.textContent = avgWords;
    readingTime.textContent = readingTimeMinutes;
    speakingTime.textContent = speakingTimeMinutes;
    
    // キーワード密度解析
    const wordFreq = {};
    const stopWords = ['こと', 'もの', 'それ', 'これ', 'ため', 'よう', 'ん', 'の', 'に', 'と', 'が', 'を', 'は', 'い', 'て', 'な', 'で', 'し', 'さ'];
    words.forEach(word => {
        if (stopWords.includes(word)) return;
        if (wordFreq[word]) {
            wordFreq[word]++;
        } else {
            wordFreq[word] = 1;
        }
    });
    
    const sortedWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
    keywordDensityList.innerHTML = '';
    sortedWords.slice(0, 10).forEach(([word, count]) => {
        const li = document.createElement('li');
        const percentage = ((count / words.length) * 100).toFixed(1);
        li.textContent = `${word}: ${count}回 (${percentage}%)`;
        keywordDensityList.appendChild(li);
    });
    
    updateKeywordChart(sortedWords.slice(0, 5));
    
    // 最も長い単語と平均単語の長さ
    let totalWordLength = 0;
    let longest = '';
    words.forEach(word => {
        totalWordLength += word.length;
        if (word.length > longest.length) {
            longest = word;
        }
    });
    const avgLength = words.length > 0 ? (totalWordLength / words.length).toFixed(2) : 0;
    longestWord.textContent = longest || 'N/A';
    avgWordLength.textContent = avgLength;
    
    // 文字種別カウント
    const hiragana = text.match(/[\u3040-\u309F]/g) || [];
    const katakana = text.match(/[\u30A0-\u30FF]/g) || [];
    const kanji = text.match(/[\u4E00-\u9FFF]/g) || [];
    const alphanumeric = text.match(/[A-Za-z0-9]/g) || [];
    
    hiraganaCount.textContent = hiragana.length;
    katakanaCount.textContent = katakana.length;
    kanjiCount.textContent = kanji.length;
    alphanumericCount.textContent = alphanumeric.length;
    
    // 進捗バーの更新
    updateProgressBars(charsWithSpaces, words.length);
}

// テキストから単語を抽出する関数
function extractWords(text) {
    const words = [];
    let currentWord = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(char)) {
            currentWord += char;
        } else {
            if (currentWord !== '') {
                words.push(currentWord);
                currentWord = '';
            }
            if (/\w/.test(char)) {
                words.push(char);
            }
        }
    }
    if (currentWord !== '') {
        words.push(currentWord);
    }
    return words.filter(word => word.trim().length > 0);
}

// テキストから文を抽出する関数
function extractSentences(text) {
    const sentences = text.match(/[^。．\.!?！？\n]+[。．\.!?！？\n]*/g) || [];
    return sentences.map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
}

// コピーボタンの機能
copyButton.addEventListener('click', () => {
    textInput.select();
    document.execCommand('copy');
    alert('テキストをクリップボードにコピーしました。');
});

// テーマ切り替え
themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', themeToggle.checked);
    localStorage.setItem('darkMode', themeToggle.checked);
});

// 初期設定の読み込み
function loadSettings() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    themeToggle.checked = darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    
    const savedText = localStorage.getItem('textInput');
    if (savedText) {
        textInput.value = savedText;
        updateStats();
    }
}

// テキストの保存
function saveToLocalStorage() {
    localStorage.setItem('textInput', textInput.value);
}

// 元に戻す/やり直し機能
function handleUndoRedo() {
    if (!isTyping) {
        undoStack.push(textInput.value);
        redoStack = [];
    }
}

function undo() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        isTyping = true;
        textInput.value = undoStack[undoStack.length - 1];
        updateStats();
        isTyping = false;
    }
}

function redo() {
    if (redoStack.length > 0) {
        isTyping = true;
        const value = redoStack.pop();
        textInput.value = value;
        undoStack.push(value);
        updateStats();
        isTyping = false;
    }
}

// 印刷機能
function printText() {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`<pre>${textInput.value}</pre>`);
    printWindow.document.close();
    printWindow.print();
}

// ダウンロード機能
function downloadText() {
    const blob = new Blob([textInput.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// テキストアラインメント
function setAlignment(alignment) {
    textInput.style.textAlign = alignment;
}

// フォント切り替え
function changeFont() {
    textInput.style.fontFamily = fontSelect.value;
}

// フォントサイズ調整
function changeFontSize() {
    textInput.style.fontSize = fontSizeSlider.value + 'px';
}

// テキスト検索とハイライト
function searchText() {
    const searchTerm = searchInput.value;
    const text = textInput.value;
    if (!searchTerm) {
        textInput.value = text.replace(/<mark>(.*?)<\/mark>/g, '$1');
        return;
    }
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const newText = text.replace(/<mark>(.*?)<\/mark>/g, '$1').replace(regex, '<mark>$1</mark>');
    textInput.value = newText;
}

// キーワード頻度グラフの更新
function updateKeywordChart(data) {
    const labels = data.map(item => item[0]);
    const counts = data.map(item => item[1]);
    
    const ctx = keywordChart.getContext('2d');
    if (window.keywordChartInstance) {
        window.keywordChartInstance.destroy();
    }
    window.keywordChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '出現回数',
                data: counts,
                backgroundColor: 'rgba(0, 123, 255, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { 
                    title: { display: true, text: 'キーワード' },
                    ticks: { color: document.body.classList.contains('dark-mode') ? '#fff' : '#000' }
                },
                y: { 
                    title: { display: true, text: '出現回数' },
                    ticks: { color: document.body.classList.contains('dark-mode') ? '#fff' : '#000' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 進捗バーの更新
function updateProgressBars(chars, words) {
    const charGoal = 1000; // 任意の目標値
    const wordGoal = 200;  // 任意の目標値
    charProgress.value = (chars / charGoal) * 100;
    wordProgress.value = (words / wordGoal) * 100;
}

// 初期化
loadSettings();
updateStats();
handleUndoRedo();
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

function updateStats() {
    const text = textInput.value;
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s/g, '').length;
    
    // 改善された単語数の計算
    const words = extractJapaneseWords(text);
    
    // 改善された文の数の計算
    const sentences = text.match(/[^。．\.!?！？\n]+[。．\.!?！？\n]*/g) || [];
    
    // 段落の数の計算
    const paragraphs = text.trim().split(/\n+/).filter(paragraph => paragraph.trim().length > 0);
    
    // 平均単語数/文
    const avgWords = sentences.length > 0 ? (words.length / sentences.length).toFixed(2) : 0;
    
    // 読み時間（日本語の平均読書速度: 600文字/分）
    const readingTimeMinutes = (charsWithoutSpaces / 600).toFixed(1);
    
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
    words.forEach(word => {
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
}

// 日本語の単語を抽出する関数
function extractJapaneseWords(text) {
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

textInput.addEventListener('input', updateStats);

copyButton.addEventListener('click', () => {
    textInput.select();
    document.execCommand('copy');
    alert('テキストをクリップボードにコピーしました。');
});

// テーマ切り替え
themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', themeToggle.checked);
});

// 初期化
updateStats();
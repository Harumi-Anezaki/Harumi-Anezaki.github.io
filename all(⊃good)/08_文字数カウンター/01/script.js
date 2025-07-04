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

function updateStats() {
    const text = textInput.value;
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s/g, '').length;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[。．\.!?！？]+/).filter(sentence => sentence.trim().length > 0);
    const paragraphs = text.split(/\n+/).filter(paragraph => paragraph.trim().length > 0);
    const avgWords = sentences.length > 0 ? (words.length / sentences.length).toFixed(2) : 0;
    const readingTimeMinutes = (words.length / 400).toFixed(1);
    const speakingTimeMinutes = (words.length / 130).toFixed(1);

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
        word = word.toLowerCase();
        if (wordFreq[word]) {
            wordFreq[word]++;
        } else {
            wordFreq[word] = 1;
        }
    });

    const sortedWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
    keywordDensityList.innerHTML = '';
    sortedWords.slice(0, 5).forEach(([word, count]) => {
        const li = document.createElement('li');
        const percentage = ((count / words.length) * 100).toFixed(1);
        li.textContent = `${word}: ${count}回 (${percentage}%)`;
        keywordDensityList.appendChild(li);
    });
}

textInput.addEventListener('input', updateStats);

copyButton.addEventListener('click', () => {
    textInput.select();
    document.execCommand('copy');
    alert('テキストをクリップボードにコピーしました。');
});

// テーマ切り替え
themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('light-mode', themeToggle.checked);
});
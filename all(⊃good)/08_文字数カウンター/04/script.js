const textInput = document.getElementById('textInput');
const charCount = document.getElementById('charCount');

textInput.addEventListener('input', () => {
    const textLength = textInput.value.length;
    charCount.textContent = textLength;
});
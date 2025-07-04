const markdownInput = document.getElementById('markdown-input');
const markdownOutput = document.getElementById('markdown-output');
const converter = new showdown.Converter();

markdownInput.addEventListener('input', function() {
  const markdownText = markdownInput.value;
  const html = converter.makeHtml(markdownText);
  markdownOutput.innerHTML = html;
});

// 初期表示
const initialMarkdown = `# Markdown Editor

This is a simple markdown editor.

- You can type markdown in the left panel.
- The rendered HTML will appear in the right panel.

Enjoy!
`;

markdownInput.value = initialMarkdown;
markdownOutput.innerHTML = converter.makeHtml(initialMarkdown);
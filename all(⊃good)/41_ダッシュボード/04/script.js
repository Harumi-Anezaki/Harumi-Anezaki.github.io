// script.js
document.addEventListener('DOMContentLoaded', () => {
    const appData = {
        apiKey: '',
        modelName: 'gemini-1.5-flash-latest', // Changed to a common flash model
        excelJsonData: null,
        currentDashboardCode: { jsx: '', css: '' }, // Store JSX and CSS separately
        aiLog: [],
        currentGenerationStep: 0,
        isGenerating: false
    };

    // UI Elements
    const settingsBtn = document.getElementById('settings-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const historyBtn = document.getElementById('history-btn');
    const previewBtn = document.getElementById('preview-btn');
    const downloadBtn = document.getElementById('download-btn');

    const apiKeyInput = document.getElementById('api-key');
    const modelNameInput = document.getElementById('model-name');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const fileNameDisplay = document.getElementById('file-name-display');
    const generationProgressDisplay = document.getElementById('generation-progress');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    const startGenerationContainer = document.getElementById('start-generation-container');
    const startGenerationBtn = document.getElementById('start-generation-btn');

    const aiLogDisplay = document.getElementById('ai-log-display');
    const dashboardPreviewRoot = document.getElementById('dashboard-preview-root');
    const refinementInput = document.getElementById('refinement-input');
    const submitRefinementBtn = document.getElementById('submit-refinement-btn');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');

    // --- Local Storage ---
    function saveToLocalStorage() {
        localStorage.setItem('dashboardGeneratorData', JSON.stringify(appData));
    }

    function loadFromLocalStorage() {
        const storedData = localStorage.getItem('dashboardGeneratorData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Only restore specific fields to avoid issues with stale state
            appData.apiKey = parsedData.apiKey || '';
            appData.modelName = parsedData.modelName || 'gemini-1.5-flash-latest';
            appData.excelJsonData = parsedData.excelJsonData || null;
            appData.currentDashboardCode = parsedData.currentDashboardCode || { jsx: '', css: '' };
            appData.aiLog = parsedData.aiLog || [];
            appData.currentGenerationStep = parsedData.currentGenerationStep || 0;
            // Do not restore isGenerating
            
            updateUIFromState();
        }
        apiKeyInput.value = appData.apiKey;
        modelNameInput.value = appData.modelName;
    }

    function updateUIFromState() {
        if (appData.excelJsonData) {
            fileNameDisplay.textContent = `読み込み済みデータ: ${appData.excelJsonData.fileName || '不明なファイル'}`;
            startGenerationContainer.style.display = 'block';
        } else {
            fileNameDisplay.textContent = 'データが選択されていません。';
            startGenerationContainer.style.display = 'none';
        }

        if (appData.aiLog.length > 0) {
            historyBtn.disabled = false;
            renderAiLog();
        } else {
            historyBtn.disabled = true;
        }
        
        if (appData.currentDashboardCode && appData.currentDashboardCode.jsx) {
            previewBtn.disabled = false;
            downloadBtn.disabled = false;
        } else {
            previewBtn.disabled = true;
            downloadBtn.disabled = true;
        }
        updateGenerationProgressDisplay();
    }
    
    function showLoading(message = "処理中...") {
        loadingMessage.textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }


    // --- Modals ---
    function toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
            if (show && modalId === 'preview-modal') renderPreview();
            if (!show && modalId === 'preview-modal') clearPreviewDOM();
        }
    }

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(btn.dataset.modalId, false));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Clicked on overlay
                toggleModal(modal.id, false);
            }
        });
    });

    settingsBtn.addEventListener('click', () => toggleModal('settings-modal', true));
    historyBtn.addEventListener('click', () => toggleModal('history-modal', true));
    previewBtn.addEventListener('click', () => toggleModal('preview-modal', true));

    // --- Settings ---
    saveSettingsBtn.addEventListener('click', () => {
        appData.apiKey = apiKeyInput.value.trim();
        appData.modelName = modelNameInput.value.trim() || 'gemini-1.5-flash-latest';
        if (!appData.apiKey) {
            alert('APIキーを入力してください。');
            return;
        }
        saveToLocalStorage();
        alert('設定を保存しました。');
        toggleModal('settings-modal', false);
    });

    // --- File Handling ---
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        showLoading("ファイルを処理中...");
        fileNameDisplay.textContent = `処理中: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Auto-detect header and data
                let headerRowIndex = -1;
                let firstDataRowIndex = -1;

                // Simple heuristic: first non-empty row is header, next non-empty is data
                for (let i = 0; i < jsonData.length; i++) {
                    if (jsonData[i].some(cell => cell !== null && cell !== '')) {
                        if (headerRowIndex === -1) {
                            headerRowIndex = i;
                        } else if (firstDataRowIndex === -1) {
                            firstDataRowIndex = i;
                            break;
                        }
                    }
                }

                if (headerRowIndex === -1 || firstDataRowIndex === -1) {
                    throw new Error("ヘッダー行またはデータ行を特定できませんでした。");
                }

                const headers = jsonData[headerRowIndex].map(String); // Ensure headers are strings
                const dataRows = jsonData.slice(firstDataRowIndex)
                    .filter(row => row.some(cell => cell !== null && cell !== '')) // Filter out completely empty rows
                    .map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index] === null ? '' : row[index]; // Handle null cells
                        });
                        return obj;
                    });
                
                appData.excelJsonData = { data: dataRows, fileName: file.name };
                appData.currentDashboardCode = { jsx: '', css: '' }; // Reset dashboard code
                appData.aiLog = []; // Reset AI Log
                appData.currentGenerationStep = 0; // Reset generation step
                saveToLocalStorage();
                updateUIFromState();
                alert('ファイルが正常に読み込まれました。');
            } catch (error) {
                console.error("File parsing error:", error);
                alert(`ファイル処理エラー: ${error.message}`);
                fileNameDisplay.textContent = 'ファイル処理中にエラーが発生しました。';
                appData.excelJsonData = null;
            } finally {
                hideLoading();
                fileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = () => {
            hideLoading();
            alert('ファイルの読み込みに失敗しました。');
            fileNameDisplay.textContent = 'ファイルの読み込みに失敗しました。';
            fileInput.value = '';
        };
        reader.readAsBinaryString(file);
    }

    // --- Gemini API Client ---
    async function callGeminiAPI(prompt) {
        if (!appData.apiKey) {
            alert('Gemini APIキーが設定されていません。設定モーダルから設定してください。');
            toggleModal('settings-modal', true);
            throw new Error("APIキー未設定");
        }
        if (!appData.modelName) {
            alert('Gemini モデル名が設定されていません。設定モーダルから設定してください。');
            toggleModal('settings-modal', true);
            throw new Error("モデル名未設定");
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${appData.modelName}:generateContent?key=${appData.apiKey}`;
        
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                // "temperature": 0.7, // Example: uncomment to adjust creativity
                // "maxOutputTokens": 8192, // Example: uncomment to adjust max output size
            }
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error:', errorData);
                throw new Error(`Gemini APIエラー: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
            }
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                let textResponse = data.candidates[0].content.parts[0].text;
                // Remove markdown backticks for code blocks if present
                textResponse = textResponse.replace(/^```(jsx|javascript)?\s*|```\s*$/g, '').trim();
                return textResponse;
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                 throw new Error(`Gemini APIリクエストがブロックされました: ${data.promptFeedback.blockReason} - ${data.promptFeedback.blockReasonMessage || ''}`);
            }
            else {
                console.error("Unexpected Gemini API response structure:", data);
                throw new Error('Gemini APIからの予期しない応答形式です。');
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            throw error; // Re-throw to be caught by caller
        }
    }
    
    // --- AI Log ---
    function addToAiLog(type, content, code = null) {
        const entry = { type, content, code, timestamp: new Date().toISOString() };
        appData.aiLog.push(entry);
        renderAiLog();
        saveToLocalStorage();
    }

    function renderAiLog() {
        aiLogDisplay.innerHTML = '';
        appData.aiLog.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('log-entry');
            
            let html = `<strong>${entry.type}</strong> (${new Date(entry.timestamp).toLocaleString()}):<br>${entry.content}`;
            if (entry.code) {
                html += `<code>${entry.code.replace(/</g, "<").replace(/>/g, ">")}</code>`;
            }
            entryDiv.innerHTML = html;
            aiLogDisplay.appendChild(entryDiv);
        });
        aiLogDisplay.scrollTop = aiLogDisplay.scrollHeight; // Scroll to bottom
        historyBtn.disabled = false;
    }

    // --- Dashboard Generation Process ---
    const MAX_STEPS = 5;
    startGenerationBtn.addEventListener('click', async () => {
        if (appData.isGenerating) return;
        if (!appData.excelJsonData || !appData.excelJsonData.data) {
            alert('まずデータをアップロードしてください。');
            return;
        }
        if (!appData.apiKey) {
            alert('APIキーを設定してください。');
            toggleModal('settings-modal', true);
            return;
        }

        appData.isGenerating = true;
        appData.currentGenerationStep = 0;
        appData.currentDashboardCode = { jsx: '', css: '' };
        appData.aiLog = [];
        startGenerationBtn.disabled = true;
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        showLoading("ダッシュボード生成を開始します...");

        for (let i = 1; i <= MAX_STEPS; i++) {
            appData.currentGenerationStep = i;
            updateGenerationProgressDisplay(`ステップ ${i}/${MAX_STEPS} を処理中...`);
            setProgressBar((i / MAX_STEPS) * 100);
            showLoading(`ステップ ${i}/${MAX_STEPS} を処理中...`);

            try {
                await runGenerationStep(i);
            } catch (error) {
                alert(`生成ステップ ${i} でエラーが発生しました: ${error.message}`);
                appData.isGenerating = false;
                startGenerationBtn.disabled = false;
                hideLoading();
                updateGenerationProgressDisplay(`エラー発生`);
                setProgressBar(0); // Reset progress bar on error or show partial
                return;
            }
        }
        
        appData.isGenerating = false;
        startGenerationBtn.disabled = false;
        hideLoading();
        updateGenerationProgressDisplay("ダッシュボード生成完了！");
        setProgressBar(100);
        saveToLocalStorage();
        updateUIFromState(); // Enable preview/download buttons
        alert("ダッシュボードの生成が完了しました。プレビューで確認し、必要に応じて修正してください。");
    });

    function updateGenerationProgressDisplay(message = null) {
        if (message) {
            generationProgressDisplay.textContent = `ダッシュボード生成ステータス: ${message}`;
        } else {
            if (appData.currentGenerationStep > 0 && appData.currentGenerationStep <= MAX_STEPS) {
                generationProgressDisplay.textContent = `ダッシュボード生成ステータス: ステップ ${appData.currentGenerationStep}/${MAX_STEPS}`;
            } else if (appData.currentDashboardCode && appData.currentDashboardCode.jsx) {
                 generationProgressDisplay.textContent = `ダッシュボード生成ステータス: 生成済み`;
            }
             else {
                generationProgressDisplay.textContent = `ダッシュボード生成ステータス: アイドル`;
            }
        }
    }

    function setProgressBar(percentage) {
        progressBar.style.width = `${percentage}%`;
    }
    
    function extractJsxAndCss(aiResponse) {
        let jsx = aiResponse;
        let css = '';

        // Try to extract <style> tag
        const styleTagMatch = aiResponse.match(/<style.*?type="text\/css".*?>([\s\S]*?)<\/style>/i);
        if (styleTagMatch && styleTagMatch[1]) {
            css = styleTagMatch[1].trim();
            // Remove the style tag from JSX
            jsx = jsx.replace(styleTagMatch[0], '').trim();
        }
        // Further cleanup for common AI responses if JSX is still wrapped in markdown
        jsx = jsx.replace(/^```(jsx|javascript)?\s*|```\s*$/g, '').trim();
        
        return { jsx, css };
    }


    async function runGenerationStep(step) {
        const commonInstructions = `あなたはReactとデータ視覚化の専門家です。提示された表データの有用性を最大限に引き出し、かつユーザーにとって直感的で見やすいダッシュボードを作成/改善してください。この点を考慮して、次のステップの提案や実装を行ってください。
生成するコードは、React、ReactDOM、Babel Standalone、そしてRechartsがCDNで読み込まれているHTML環境で動作する前提で、単一のReact関数コンポーネント（必要なら内部で子コンポーネント使用可）として、JSXと必要なCSS（出力するCSSは<style type="text/css">...</style>タグで囲ってください。CSSのクラス名は他の部分と衝突しないようユニークにしてください。例: .dashboard-container .my-chart { ... }）を含めてください。
必要に応じて、メインコンポーネント内に子コンポーネントを作成し、コードを構造化してください。
Rechartsライブラリ (CDN: https://unpkg.com/recharts/umd/Recharts.min.js) を使用してください。
コンポーネント名は必ず DashboardCore としてください。
データは \`data\` というpropsとしてコンポーネントに渡される前提で実装してください。
JSXコードとCSS（<style>タグ内）以外の説明文や前置きは不要です。コードのみを出力してください。`;

        let prompt;
        const currentCodeForPrompt = appData.currentDashboardCode.jsx ? `現在のDashboardCoreコンポーネントは以下の通りです:\n\`\`\`jsx\n${appData.currentDashboardCode.jsx}\n\`\`\`\n${appData.currentDashboardCode.css ? `<style type="text/css">\n${appData.currentDashboardCode.css}\n</style>` : ''}\n` : '';
        const dataSample = JSON.stringify(appData.excelJsonData.data.slice(0, 5)); // Send a sample of data

        switch (step) {
            case 1:
                prompt = `${commonInstructions}\n\n以下の表データ (最初の5行のサンプル: ${dataSample}) から、最も重要なKPIを3つ程度特定し、それらを表示するシンプルなReactコンポーネントの骨子（コンポーネント名: DashboardCore）を作成してください。データはdataというpropsとしてコンポーネントに渡される前提で実装してください。`;
                break;
            case 2:
                prompt = `${commonInstructions}\n\n${currentCodeForPrompt}\nこのコンポーネントに、表データ (最初の5行のサンプル: ${dataSample}) に適したチャートを1つ追加してください。Rechartsライブラリの使用を推奨します。どのデータを使い、どのようなチャート（例：棒、線、円）にするか、その選定理由もコード内のコメントとして簡単に記述してください。`;
                break;
            case 3:
                prompt = `${commonInstructions}\n\n${currentCodeForPrompt}\nこのコンポーネントに、ユーザーがデータをインタラクティブに操作できる機能（例: 特定の列に基づくフィルタリング、ソートなど）を1つ追加してください。どの列を対象とし、どのようなUIで操作させるか提案し、実装してください。選定理由もコード内のコメントとして簡単に記述してください。`;
                break;
            case 4:
                prompt = `${commonInstructions}\n\n${currentCodeForPrompt}\nこのコンポーネントのレイアウトとスタイルを改善し、より洗練され、情報が整理されてユーザーが見やすいデザインにしてください。必要であればコンポーネントを適切に分割・構造化してください。CSSも改善してください。`;
                break;
            case 5:
                prompt = `${commonInstructions}\n\n${currentCodeForPrompt}\nこのコンポーネントを最終確認し、さらに改善できる点や、このダッシュボードに追加すると有用と思われる機能（例: 詳細データの表示モーダル、別の視点からのチャート、データの集計値表示など）があれば1つ提案し、実装してください。選定理由もコード内のコメントとして簡単に記述してください。`;
                break;
            default:
                throw new Error("無効な生成ステップです。");
        }
        
        addToAiLog(`ステップ ${step} プロンプト (アプリ → AI)`, prompt.substring(0, 500) + "..."); // Log a snippet
        const aiResponse = await callGeminiAPI(prompt);
        const { jsx, css } = extractJsxAndCss(aiResponse);

        appData.currentDashboardCode.jsx = jsx;
        if (css) appData.currentDashboardCode.css = css; // Append or replace CSS based on AI output logic
        
        addToAiLog(`ステップ ${step} AI応答 (AI → アプリ)`, "AIがコードを生成しました。", jsx + (css ? `\n<style type="text/css">\n${css}\n</style>`:''));
        saveToLocalStorage();
        updateUIFromState();
    }

    // --- Preview ---
    let injectedStyleElement = null;

    function renderPreview() {
        clearPreviewDOM(); // Clear previous preview content and styles

        if (!appData.currentDashboardCode.jsx || !appData.excelJsonData) {
            dashboardPreviewRoot.innerHTML = '<p>プレビューするデータまたはコードがありません。</p>';
            return;
        }

        try {
            // Inject CSS
            if (appData.currentDashboardCode.css) {
                injectedStyleElement = document.createElement('style');
                injectedStyleElement.type = 'text/css';
                injectedStyleElement.id = 'dashboard-preview-styles';
                injectedStyleElement.appendChild(document.createTextNode(appData.currentDashboardCode.css));
                document.head.appendChild(injectedStyleElement);
            }

            // Prepare data for the component
            const previewData = appData.excelJsonData.data;

            // Construct the script to render the React component
            const scriptContent = `
                try {
                    const data = ${JSON.stringify(previewData)};
                    ${appData.currentDashboardCode.jsx}
                    ReactDOM.render(
                        React.createElement(DashboardCore, { data: data }),
                        document.getElementById('dashboard-preview-root')
                    );
                } catch (e) {
                    console.error("Preview render error:", e);
                    document.getElementById('dashboard-preview-root').innerHTML = '<p style="color:red;">プレビューのレンダリング中にエラーが発生しました: ' + e.message + '</p><pre>' + e.stack + '</pre>';
                }
            `;
            
            const scriptElement = document.createElement('script');
            scriptElement.type = 'text/babel';
            scriptElement.textContent = scriptContent;
            
            // Append and execute (Babel will transpile)
            dashboardPreviewRoot.appendChild(scriptElement);
            Babel.transformScriptTags(); // Ensure Babel processes the new script tag

        } catch (error) {
            console.error("Error setting up preview:", error);
            dashboardPreviewRoot.innerHTML = `<p style="color:red;">プレビューの準備中にエラーが発生しました: ${error.message}</p>`;
        }
    }
    
    function clearPreviewDOM() {
        // Clear React component from root
        if (document.getElementById('dashboard-preview-root')) {
            ReactDOM.unmountComponentAtNode(document.getElementById('dashboard-preview-root'));
            document.getElementById('dashboard-preview-root').innerHTML = '';
        }
        // Remove injected styles
        if (injectedStyleElement && injectedStyleElement.parentNode) {
            injectedStyleElement.parentNode.removeChild(injectedStyleElement);
            injectedStyleElement = null;
        }
    }

    // --- User Refinement ---
    submitRefinementBtn.addEventListener('click', async () => {
        const userInstruction = refinementInput.value.trim();
        if (!userInstruction) {
            alert('修正指示を入力してください。');
            return;
        }
        if (!appData.currentDashboardCode.jsx) {
            alert('修正対象のダッシュボードコードがありません。');
            return;
        }

        showLoading("AIによる修正を処理中...");
        try {
            const prompt = `あなたはReactとデータ視覚化の専門家です。以下のReactコンポーネント（JSXとCSSを含む）があります:
現在のCSS:
<style type="text/css">
${appData.currentDashboardCode.css || "/* no specific CSS provided yet */"}
</style>

現在のJSX:
\`\`\`jsx
${appData.currentDashboardCode.jsx}
\`\`\`
このコンポーネントに対して、次のユーザー指示に基づいて修正を行ってください: '${userInstruction}'。
修正後の完全なReactコンポーネントコード(JSXと、変更/追加されたCSSを<style type="text/css">...</style>タグで囲ったもの)を返してください。
コンポーネント名は必ず DashboardCore としてください。データは \`data\` というpropsとしてコンポーネントに渡される前提です。
JSXコードとCSS（<style>タグ内）以外の説明文や前置きは不要です。コードのみを出力してください。`;

            addToAiLog("ユーザー修正指示 (アプリ → AI)", userInstruction, `対象コード:\n${appData.currentDashboardCode.jsx.substring(0,200)}...`);
            const aiResponse = await callGeminiAPI(prompt);
            const { jsx, css } = extractJsxAndCss(aiResponse);
            
            appData.currentDashboardCode.jsx = jsx;
            if (css) appData.currentDashboardCode.css = css; // Update CSS

            addToAiLog("AI修正応答 (AI → アプリ)", "AIがコードを修正しました。", jsx + (css ? `\n<style type="text/css">\n${css}\n</style>`:''));
            saveToLocalStorage();
            updateUIFromState();
            
            if (document.getElementById('preview-modal').style.display === 'flex') {
                renderPreview(); // Re-render preview if open
            }
            refinementInput.value = ''; // Clear input
            alert('AIによる修正が完了しました。プレビューを確認してください。');

        } catch (error) {
            alert(`修正処理中にエラーが発生しました: ${error.message}`);
            console.error("Refinement error:", error);
        } finally {
            hideLoading();
        }
    });


    // --- Download ---
    downloadBtn.addEventListener('click', () => {
        if (!appData.currentDashboardCode.jsx || !appData.excelJsonData) {
            alert('ダウンロードするダッシュボードがありません。');
            return;
        }

        const dataForHtml = JSON.stringify(appData.excelJsonData.data);
        const dashboardCss = appData.currentDashboardCode.css || '';
        const dashboardJsx = appData.currentDashboardCode.jsx;

        const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Dashboard</title>
    <script src="https://unpkg.com/react@17/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/recharts/umd/Recharts.min.js"></script>
    <style type="text/css">
        body { font-family: sans-serif; margin: 20px; background-color: #f0f2f5; }
        #dashboard-root { padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        /* AI Generated CSS Below */
        ${dashboardCss}
    </style>
</head>
<body>
    <div id="dashboard-root"></div>
    <script type="text/babel">
        const chartData = ${dataForHtml};
        
        ${dashboardJsx}

        ReactDOM.render(
            React.createElement(DashboardCore, { data: chartData }),
            document.getElementById('dashboard-root')
        );
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('dashboard.html をダウンロードしました。');
    });

    // --- Initial Load ---
    loadFromLocalStorage();
});
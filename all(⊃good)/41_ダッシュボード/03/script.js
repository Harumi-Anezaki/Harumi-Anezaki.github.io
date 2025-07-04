document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const settingsButton = document.getElementById('settingsButton');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const closeApiKeyModal = document.getElementById('closeApiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const geminiModelInput = document.getElementById('geminiModelInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');

    const fileInput = document.getElementById('fileInput');
    const fileInputTrigger = document.getElementById('fileInputTrigger');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    const sheetSelectModal = document.getElementById('sheetSelectModal');
    const closeSheetSelectModal = document.getElementById('closeSheetSelectModal');
    const modalFileName = document.getElementById('modalFileName');
    const sheetListContainer = document.getElementById('sheetListContainer');
    const confirmSheetButton = document.getElementById('confirmSheetButton');

    const dataRangeModal = document.getElementById('dataRangeModal');
    const closeDataRangeModal = document.getElementById('closeDataRangeModal');
    const dataRangeInput = document.getElementById('dataRangeInput');
    const confirmDataRangeButton = document.getElementById('confirmDataRangeButton');

    const generateDashboardButton = document.getElementById('generateDashboardButton');
    const downloadDashboardButton = document.getElementById('downloadDashboardButton');
    const dashboardPreviewFrame = document.getElementById('dashboardPreviewFrame');

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendButton = document.getElementById('chatSendButton');

    const loadingModal = document.getElementById('loadingModal');
    const loadingMessage = document.getElementById('loadingMessage');

    // --- State Variables ---
    let geminiApiKey = '';
    let geminiModelName = '';
    const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'; // Default, but check official model names

    let workbook = null;
    let selectedFileName = '';
    let selectedSheetName = '';
    let selectedDataRange = '';
    let extractedDataJson = null;
    let generatedDashboardHtml = '';
    let chatHistory = [];

    const GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    // --- Helper Functions ---
    const lsGet = (key) => localStorage.getItem(key);
    const lsSet = (key, value) => localStorage.setItem(key, value);
    const lsRemove = (key) => localStorage.removeItem(key);

    function showModal(modalElement) {
        modalElement.classList.add('active');
    }

    function hideModal(modalElement) {
        modalElement.classList.remove('active');
    }

    function showLoading(message = "処理中...") {
        loadingMessage.textContent = message;
        showModal(loadingModal);
    }

    function hideLoading() {
        hideModal(loadingModal);
    }

    function updateButtonStates() {
        const apiKeyPresent = !!geminiApiKey;
        const modelNamePresent = !!geminiModelName;
        const dataExtracted = !!extractedDataJson;
        const dashboardGenerated = !!generatedDashboardHtml;

        generateDashboardButton.disabled = !(apiKeyPresent && modelNamePresent && dataExtracted);
        downloadDashboardButton.disabled = !(apiKeyPresent && modelNamePresent && dashboardGenerated);
        chatSendButton.disabled = !(apiKeyPresent && modelNamePresent && dashboardGenerated);
        chatInput.disabled = !(apiKeyPresent && modelNamePresent && dashboardGenerated);
    }

    // --- Feature 1: API Key and Model Management ---
    function loadApiKeyAndModel() {
        geminiApiKey = lsGet('geminiApiKey');
        geminiModelName = lsGet('geminiModelName') || DEFAULT_GEMINI_MODEL;

        apiKeyInput.value = geminiApiKey || '';
        geminiModelInput.value = geminiModelName;

        if (!geminiApiKey) {
            showModal(apiKeyModal);
        }
        updateButtonStates();
    }

    settingsButton.addEventListener('click', () => {
        apiKeyInput.value = geminiApiKey || '';
        geminiModelInput.value = geminiModelName || DEFAULT_GEMINI_MODEL;
        showModal(apiKeyModal);
    });
    closeApiKeyModal.addEventListener('click', () => hideModal(apiKeyModal));

    saveApiKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        let model = geminiModelInput.value.trim();

        if (key) {
            geminiApiKey = key;
            lsSet('geminiApiKey', key);

            if (!model) {
                model = DEFAULT_GEMINI_MODEL;
            }
            geminiModelName = model;
            lsSet('geminiModelName', model);
            geminiModelInput.value = model;

            hideModal(apiKeyModal);
            alert('APIキーとモデル名を保存しました。');
            updateButtonStates();
        } else {
            alert('APIキーを入力してください。');
        }
    });

    // --- Feature 2: Data Source Selection and Range ---
    fileInputTrigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        selectedFileName = file.name;
        fileNameDisplay.textContent = `選択中: ${selectedFileName}`;
        lsSet('selectedFileName', selectedFileName);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                workbook = XLSX.read(data, { type: 'array' });
                showSheetSelectionModal();
            } catch (err) {
                console.error("File parsing error:", err);
                alert(`ファイル形式エラー: ${err.message}`);
                fileNameDisplay.textContent = 'ファイルが選択されていません';
                workbook = null;
            }
        };
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            alert("ファイルの読み込みに失敗しました。");
            fileNameDisplay.textContent = 'ファイルが選択されていません';
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    });

    function showSheetSelectionModal() {
        if (!workbook) return;
        modalFileName.textContent = `ファイル名: ${selectedFileName}`;
        sheetListContainer.innerHTML = '';
        workbook.SheetNames.forEach((sheetName, index) => {
            const radioId = `sheet-${index}`;
            const label = document.createElement('label');
            label.htmlFor = radioId;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'sheetSelection';
            radio.id = radioId;
            radio.value = sheetName;
            if (index === 0) radio.checked = true;
            label.appendChild(radio);
            label.appendChild(document.createTextNode(sheetName));
            sheetListContainer.appendChild(label);
        });

        if (workbook.SheetNames.length === 1) {
            selectedSheetName = workbook.SheetNames[0];
            lsSet('selectedSheetName', selectedSheetName);
            hideModal(sheetSelectModal);
            showDataRangeModal();
        } else {
            showModal(sheetSelectModal);
        }
    }

    closeSheetSelectModal.addEventListener('click', () => hideModal(sheetSelectModal));
    confirmSheetButton.addEventListener('click', () => {
        const selectedRadio = sheetListContainer.querySelector('input[name="sheetSelection"]:checked');
        if (selectedRadio) {
            selectedSheetName = selectedRadio.value;
            lsSet('selectedSheetName', selectedSheetName);
            hideModal(sheetSelectModal);
            showDataRangeModal();
        } else {
            alert('シートを選択してください。');
        }
    });

    function showDataRangeModal() {
        dataRangeInput.value = lsGet('selectedDataRange') || 'A1';
        showModal(dataRangeModal);
    }

    closeDataRangeModal.addEventListener('click', () => hideModal(dataRangeModal));
    confirmDataRangeButton.addEventListener('click', () => {
        const range = dataRangeInput.value.trim();
        if (!range) {
            alert('データ範囲を入力してください (例: A1:D10 または A1)。');
            return;
        }
        if (!workbook || !selectedSheetName) {
            alert('ファイルとシートが選択されていません。');
            return;
        }

        selectedDataRange = range;
        lsSet('selectedDataRange', selectedDataRange);

        try {
            const worksheet = workbook.Sheets[selectedSheetName];
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: selectedDataRange });
            
            if (jsonData.length === 0) {
                 alert('指定された範囲からデータを抽出できませんでした。範囲が正しいか、データが存在するか確認してください。');
                 extractedDataJson = null;
                 return;
            }

            const headers = jsonData[0];
            extractedDataJson = jsonData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[String(header)] = row[i]; // Ensure header is string
                });
                return obj;
            });

            lsSet('extractedDataJson', JSON.stringify(extractedDataJson));
            alert(`データ抽出完了: ${extractedDataJson.length}行`);
            hideModal(dataRangeModal);
            updateButtonStates();
        } catch (err) {
            console.error("Data extraction error:", err);
            alert(`データ抽出エラー: ${err.message}. 範囲指定 (例: A1:D10) を確認してください。`);
            extractedDataJson = null;
        }
    });

    // --- Feature 3: Dashboard Auto-Generation (Gemini API) ---
    async function callGeminiAPI(promptText) {
        if (!geminiApiKey) {
            alert('Gemini APIキーが設定されていません。「設定」から入力してください。');
            loadApiKeyAndModel();
            showModal(apiKeyModal);
            return null;
        }
        if (!geminiModelName) {
            alert('Gemini モデル名が設定されていません。「設定」から入力してください。');
            loadApiKeyAndModel();
            showModal(apiKeyModal);
            return null;
        }
        showLoading("AIが応答を生成中です...");

        const fullApiUrl = `${GEMINI_API_URL_BASE}${geminiModelName}:generateContent`;

        try {
            const response = await fetch(`${fullApiUrl}?key=${geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    // generationConfig: { // Optional
                    //   temperature: 0.7,
                    //   maxOutputTokens: 8192,
                    // }
                }),
            });

            hideLoading();
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error:', errorData);
                const specificError = errorData.error?.message || '';
                const modelNotFoundHint = specificError.toLowerCase().includes("not found") || specificError.toLowerCase().includes("not supported");
                let userFriendlyMessage = `APIエラー: ${response.status} ${response.statusText}. ${specificError}`;
                if (modelNotFoundHint) {
                    userFriendlyMessage += `\n指定されたモデル「${geminiModelName}」が見つからないか、サポートされていません。設定で正しいモデル名を確認してください。`;
                }
                throw new Error(userFriendlyMessage);
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                let htmlContent = data.candidates[0].content.parts[0].text;
                if (htmlContent.startsWith("```html")) {
                    htmlContent = htmlContent.substring(7, htmlContent.length - 3).trim();
                } else if (htmlContent.startsWith("```")) {
                     htmlContent = htmlContent.substring(3, htmlContent.length - 3).trim();
                }
                return htmlContent;
            } else {
                console.warn("No content in Gemini response or unexpected structure:", data);
                if (data.promptFeedback && data.promptFeedback.blockReason) {
                     throw new Error(`リクエストがブロックされました: ${data.promptFeedback.blockReason}`);
                }
                if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === "SAFETY") {
                    throw new Error("コンテンツ生成が安全上の理由で停止されました。");
                }
                throw new Error('AIからの応答が期待した形式ではありません。');
            }
        } catch (error) {
            hideLoading();
            console.error('Error calling Gemini API:', error);
            alert(`AIとの通信に失敗しました: ${error.message}`);
            return null;
        }
    }

    generateDashboardButton.addEventListener('click', async () => {
        if (!extractedDataJson) {
            alert('まずデータを抽出してください。');
            return;
        }

        const generationPrompt = `
あなたはReactコンポーネントを生成する専門のAIアシスタントです。提供されたJSONデータに基づいて、インタラクティブなダッシュボードを表示するための完全なHTMLファイル（Reactコンポーネントを含む）を生成してください。

# 指示事項:
1.  生成するHTMLファイルはスタンドアロンで動作し、\`<div id="root"></div>\`という要素にReactコンポーネントをレンダリングするものとします。
2.  React (v18推奨), ReactDOM (v18推奨), Babel Standalone のCDNリンクを\`<head>\`内に含めてください。これにより、ブラウザが直接JSXを解釈・実行できるようにします。
3.  データ可視化のため、適切なチャート（例: 棒グラフ、折れ線グラフ、円グラフ、散布図など）やテーブルをReactコンポーネントとして実装してください。チャートライブラリ（例: Recharts, Chart.jsのReactラッパーなど）を使用する場合は、そのCDNリンクもHTMLに含めてください。Recharts (https://cdnjs.cloudflare.com/ajax/libs/recharts/2.12.3/Recharts.min.js) の利用を推奨します。
4.  スタイリングは、\`<style>\`タグ内にCSSを記述するか、インラインスタイルを使用してください。外部CSSファイルの参照は避けてください。
5.  **重層的な改善プロセス（5段階）**:
    以下の5段階の思考と改善プロセスを経て、最終的なダッシュボードHTMLを生成してください。各段階では、特に「データの有用性（この表やグラフはユーザーにとって意味のある情報を提供しているか？）」と「ユーザーの見やすさ（レイアウト、配色、フォントサイズ、情報の密度は適切か？）」を重視してください。
    *   段階1: 初期ドラフト作成: データ全体を俯瞰し、主要な情報を表示する基本的なダッシュボードコンポーネントの骨子を作成します。まずはシンプルな表やグラフをいくつか配置することを考えます。
    *   段階2: 有用性の評価と改善: 段階1で作成した各要素（表、グラフ）が、提供されたデータセットに対して本当に有用な洞察を提供しているか評価します。不要な情報や冗長な表現があれば削除または統合し、より重要な情報が目立つように改善します。
    *   段階3: 見やすさの評価と改善: 段階2の成果物について、レイアウト、配色、フォント、チャートの種類の選択などがユーザーにとって見やすいか評価します。情報のグルーピング、コントラスト、インタラクティブ要素の配置などを調整し、視覚的な明瞭性を高めます。
    *   段階4: さらなる洗練（インタラクティブ性の検討）: 段階3の成果物に対して、ユーザーがデータをより深く探索できるように、基本的なフィルタリング、ソート、ドリルダウンなどのインタラクティブ機能を追加することを検討します（実装が複雑になりすぎる場合は、そのヒントや構造だけでも良い）。
    *   段階5: 最終レビューとコード生成: これまでの段階を踏まえて、全体の整合性、コードの品質（Reactのベストプラクティスに沿っているか）、指示事項の遵守を確認し、最終的なHTMLコードを生成します。
6.  生成されるダッシュボードは、データの主要な傾向やインサイトを視覚的に理解しやすくすることを目的とします。
7.  最終的な出力は、上記の5段階の改善プロセスを経た完成版のHTMLコードのみとしてください。途中の段階のコードは出力に含めないでください。
8.  生成されるHTMLは、必ず \`<!DOCTYPE html>\` で始まり、\`</html>\` で終わる完全なHTMLドキュメントとしてください。

# 入力データ (JSON形式):
${JSON.stringify(extractedDataJson)}

# 出力形式:
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>生成されたダッシュボード</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.12.3/Recharts.min.js"></script> <!-- Recharts CDN example -->
    <style>
        body { font-family: sans-serif; margin: 20px; background-color: #f4f7f6; }
        .dashboard-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .chart-card { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h2, h3 { color: #333; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; }
        th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        th { background-color: #e9ecef; font-weight: 600; }
        .recharts-responsive-container { min-width: 0 !important; } /* Recharts responsiveness fix */
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        // 生成されたReactコンポーネントのコード
        // const App = () => { /* ダッシュボードロジック */ return (<div>...</div>); };
        // const container = document.getElementById('root');
        // const root = ReactDOM.createRoot(container);
        // root.render(<App />);
    </script>
</body>
</html>
`;
        const htmlResult = await callGeminiAPI(generationPrompt);
        if (htmlResult) {
            generatedDashboardHtml = htmlResult;
            lsSet('generatedDashboardHtml', generatedDashboardHtml);
            previewDashboard();
            updateButtonStates();
            addChatMessage("ダッシュボードが生成されました。", 'ai');
        }
    });

    // --- Feature 4: Dashboard Preview ---
    function previewDashboard() {
        if (generatedDashboardHtml) {
            dashboardPreviewFrame.srcdoc = generatedDashboardHtml;
        } else {
            dashboardPreviewFrame.srcdoc = "<p style='padding:20px; text-align:center;'>ダッシュボードを生成するか、既存のものを読み込んでください。</p>";
        }
    }

    // --- Feature 5: AI Chat for Edits ---
    function addChatMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        chatHistory.push({ sender, message });
        lsSet('chatHistory', JSON.stringify(chatHistory));
    }

    chatSendButton.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    });

    async function handleChatSend() {
        const userMessage = chatInput.value.trim();
        if (!userMessage || !generatedDashboardHtml) return;

        addChatMessage(userMessage, 'user');
        chatInput.value = '';

        const modificationPrompt = `
あなたはReactコンポーネントを修正する専門のAIアシスタントです。以下の既存のHTMLコード（Reactコンポーネントを含む）とユーザーからの修正指示に基づいて、HTMLコードを更新してください。

# 指示事項:
1.  修正は、既存のHTML/Reactコード構造を可能な限り維持しつつ、ユーザーの指示を的確に反映させてください。
2.  React, ReactDOM, Babel Standalone, および使用されているチャートライブラリのCDNリンクは維持してください。
3.  スタイリングも既存の形式（\`<style>\`タグまたはインラインスタイル）を維持してください。
4.  **修正の際には、常に「データの有用性」と「ユーザーの見やすさ」を考慮してください。** ユーザーの指示がこれらの観点を損なう可能性がある場合は、より良い代替案を提案する形で修正に反映することも検討してください（ただし、最終的にはユーザーの指示を優先してください）。
5.  出力は、修正が適用された完全なHTMLファイル（<!DOCTYPE html>から</html>まで）としてください。変更点のみではなく、完全なHTMLを出力してください。

# 既存のHTMLコード:
\`\`\`html
${generatedDashboardHtml}
\`\`\`

# ユーザーの修正指示:
${userMessage}

# 出力形式: (指示事項5に従い、完全なHTMLコードのみ)
`;
        const modifiedHtml = await callGeminiAPI(modificationPrompt);
        if (modifiedHtml) {
            generatedDashboardHtml = modifiedHtml;
            lsSet('generatedDashboardHtml', generatedDashboardHtml);
            previewDashboard();
            addChatMessage("ダッシュボードを修正しました。", 'ai');
            updateButtonStates();
        } else {
            addChatMessage("ダッシュボードの修正に失敗しました。AIからの応答がありません。", 'ai');
        }
    }

    function loadChatHistory() {
        const storedHistory = lsGet('chatHistory');
        if (storedHistory) {
            chatHistory = JSON.parse(storedHistory);
            chatMessages.innerHTML = '';
            chatHistory.forEach(item => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('chat-message', item.sender);
                messageDiv.textContent = item.message;
                chatMessages.appendChild(messageDiv);
            });
            if(chatMessages.children.length > 0) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }

    // --- Feature 6: Download Dashboard ---
    downloadDashboardButton.addEventListener('click', () => {
        if (!generatedDashboardHtml) {
            alert('ダウンロードするダッシュボードがありません。');
            return;
        }
        const blob = new Blob([generatedDashboardHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dashboard.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Feature 7: Load from Local Storage on Startup ---
    function loadState() {
        loadApiKeyAndModel();

        selectedFileName = lsGet('selectedFileName') || '';
        if (selectedFileName) fileNameDisplay.textContent = `前回選択: ${selectedFileName}`;
        
        selectedSheetName = lsGet('selectedSheetName') || '';
        selectedDataRange = lsGet('selectedDataRange') || '';
        
        const storedDataJson = lsGet('extractedDataJson');
        if (storedDataJson) {
            try {
                extractedDataJson = JSON.parse(storedDataJson);
            } catch (e) {
                console.error("Error parsing stored extractedDataJson", e);
                lsRemove('extractedDataJson');
            }
        }

        const storedHtml = lsGet('generatedDashboardHtml');
        if (storedHtml) {
            generatedDashboardHtml = storedHtml;
            previewDashboard();
        }
        
        loadChatHistory();
        updateButtonStates();
    }

    // --- Initialize Application ---
    loadState();
});
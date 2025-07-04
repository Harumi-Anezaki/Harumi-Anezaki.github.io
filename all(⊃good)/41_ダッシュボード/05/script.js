document.addEventListener('DOMContentLoaded', () => {
    // --- Global State & Configuration ---
    let geminiApiKey = '';
    let geminiModelName = 'gemini-2.0-flash'; // Default as per prompt, verify this model name
    let currentDashboardJSX = '';
    let currentDashboardCSS = ''; // Can be stored if AI provides it separately
    let aiConversationLog = [];
    let uploadedTableDataJson = null;
    let currentGenerationStep = 0;
    const MAX_GENERATION_STEPS = 5;

    // --- DOM Elements ---
    const openSettingsModalButton = document.getElementById('open-settings-modal');
    const settingsModal = document.getElementById('settings-modal');
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const geminiModelNameInput = document.getElementById('gemini-model-name-input');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const settingsSaveStatus = document.getElementById('settings-save-status');

    const uploadFileButton = document.getElementById('upload-file-button');
    const fileInputHidden = document.getElementById('file-input-hidden');
    const fileStatusMessage = document.getElementById('file-status-message');
    const generationStatusMessage = document.getElementById('generation-status-message');
    const initialHelpText = document.getElementById('initial-help');

    const openLogModalButton = document.getElementById('open-log-modal');
    const logModal = document.getElementById('log-modal');
    const aiLogContainer = document.getElementById('ai-log-container');

    const openPreviewModalButton = document.getElementById('open-preview-modal');
    const previewModal = document.getElementById('preview-modal');
    const dashboardPreviewRoot = document.getElementById('dashboard-preview-root');
    const userCorrectionInput = document.getElementById('user-correction-input');
    const sendCorrectionButton = document.getElementById('send-correction-button');
    const correctionStatus = document.getElementById('correction-status');

    const downloadDashboardButton = document.getElementById('download-dashboard-button');
    
    const errorModal = document.getElementById('error-modal');
    const errorMessageContent = document.getElementById('error-message-content');


    // --- Utility Functions ---
    function showLoading(button, show = true) {
        if (!button) return;
        if (show) {
            button.disabled = true;
            const spinner = document.createElement('span');
            spinner.className = 'loading-spinner';
            // Clear existing spinners
            const existingSpinner = button.querySelector('.loading-spinner');
            if (existingSpinner) existingSpinner.remove();
            button.appendChild(spinner);
        } else {
            button.disabled = false;
            const spinner = button.querySelector('.loading-spinner');
            if (spinner) spinner.remove();
        }
    }
    
    function showErrorModal(message) {
        errorMessageContent.textContent = message;
        openModal(errorModal);
    }

    // --- Local Storage ---
    function loadFromLocalStorage() {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (apiKey) geminiApiKey = apiKey;

        const modelName = localStorage.getItem('gemini_model_name');
        if (modelName) geminiModelName = modelName;
        else geminiModelName = 'gemini-2.0-flash'; // Default again if not set

        geminiApiKeyInput.value = geminiApiKey;
        geminiModelNameInput.value = geminiModelName;

        const jsx = localStorage.getItem('dashboard_jsx_code');
        if (jsx) currentDashboardJSX = jsx;

        const css = localStorage.getItem('dashboard_css_code');
        if (css) currentDashboardCSS = css;

        const log = localStorage.getItem('ai_conversation_log');
        if (log) aiConversationLog = JSON.parse(log);

        const data = localStorage.getItem('uploaded_table_data_json');
        if (data) {
            uploadedTableDataJson = JSON.parse(data);
            fileStatusMessage.textContent = '以前アップロードされたデータが読み込まれました。';
            initialHelpText.style.display = 'none';
        }
        updateButtonStates();
    }

    function saveToLocalStorage(key, value) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    // --- Modal Management ---
    function openModal(modalElement) {
        modalElement.classList.add('is-active');
    }

    function closeModal(modalElement) {
        modalElement.classList.remove('is-active');
        // Specific cleanup for preview modal
        if (modalElement.id === 'preview-modal') {
            try {
                if (document.getElementById('dashboard-preview-root').firstChild) {
                     ReactDOM.unmountComponentAtNode(document.getElementById('dashboard-preview-root'));
                }
            } catch (e) { console.error("Error unmounting React component:", e); }
            
            const scriptTag = document.getElementById('preview-script-babel');
            if (scriptTag) scriptTag.remove();
            
            const styleTag = document.getElementById('preview-style');
            if (styleTag) styleTag.remove();
            
            dashboardPreviewRoot.innerHTML = ''; // Clear content
        }
    }

    document.querySelectorAll('.modal-close-button').forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal')));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Clicked on overlay
                closeModal(modal);
            }
        });
    });

    // --- 1. Settings ---
    openSettingsModalButton.addEventListener('click', () => openModal(settingsModal));
    saveSettingsButton.addEventListener('click', () => {
        const newApiKey = geminiApiKeyInput.value.trim();
        const newModelName = geminiModelNameInput.value.trim();

        if (!newApiKey) {
            settingsSaveStatus.textContent = 'APIキーは必須です。';
            settingsSaveStatus.className = 'status-message error';
            return;
        }
        if (!newModelName) {
            settingsSaveStatus.textContent = 'モデル名は必須です。';
            settingsSaveStatus.className = 'status-message error';
            return;
        }

        geminiApiKey = newApiKey;
        geminiModelName = newModelName;

        saveToLocalStorage('gemini_api_key', geminiApiKey);
        saveToLocalStorage('gemini_model_name', geminiModelName);

        settingsSaveStatus.textContent = '設定が保存されました。';
        settingsSaveStatus.className = 'status-message success';
        setTimeout(() => {
            settingsSaveStatus.textContent = '';
            closeModal(settingsModal);
        }, 1500);
        updateButtonStates();
    });

    // --- 2. Data Input & Preparation ---
    uploadFileButton.addEventListener('click', () => fileInputHidden.click());
    fileInputHidden.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validExtensions = ['.xlsx', '.csv'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            showErrorModal('無効なファイル形式です。.xlsx または .csv ファイルを選択してください。');
            fileInputHidden.value = ''; // Reset file input
            return;
        }

        fileStatusMessage.textContent = `ファイル読み込み中: ${file.name}...`;
        initialHelpText.style.display = 'none';
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Try to get header automatically, then convert to JSON objects
                // This usually works well as AI prefers objects with keys from headers
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    showErrorModal('ファイルにデータが含まれていないか、パースできませんでした。');
                    fileStatusMessage.textContent = 'データの読み込みに失敗しました。';
                    return;
                }

                uploadedTableDataJson = jsonData; // This is the array of objects
                saveToLocalStorage('uploaded_table_data_json', uploadedTableDataJson);
                fileStatusMessage.textContent = `ファイル読み込み完了: ${file.name} (${uploadedTableDataJson.length}行)`;
                
                // Start generation process
                addLogEntry('system', `ファイル ${file.name} がアップロードされ、JSONに変換されました。`);
                startDashboardGeneration();

            } catch (error) {
                console.error("File parsing error:", error);
                showErrorModal(`ファイル処理エラー: ${error.message}`);
                fileStatusMessage.textContent = 'ファイル処理エラーが発生しました。';
            } finally {
                fileInputHidden.value = ''; // Reset file input for next upload
                updateButtonStates();
            }
        };
        reader.onerror = () => {
            showErrorModal('ファイル読み込みエラーが発生しました。');
            fileStatusMessage.textContent = 'ファイル読み込みエラー。';
            fileInputHidden.value = '';
        };
        reader.readAsArrayBuffer(file);
    });

    // --- 3. AI Interaction ---
    async function callGeminiAPI(promptText) {
        if (!geminiApiKey) {
            showErrorModal('Gemini APIキーが設定されていません。設定画面から入力してください。');
            addLogEntry('system', 'API呼び出し失敗: APIキー未設定。');
            return null;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${geminiApiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    // Optional: Add safetySettings if needed
                    // "safetySettings": [
                    //     { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                    //     { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                    //     // ... other categories
                    // ],
                    // Optional: Add generationConfig if needed
                    // "generationConfig": { "temperature": 0.7, "maxOutputTokens": 2048 }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                const errorMessage = errorData.error?.message || `HTTPエラー: ${response.status}`;
                showErrorModal(`Gemini APIエラー: ${errorMessage}`);
                addLogEntry('system', `APIエラー: ${errorMessage}`);
                return null;
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0) {
                let generatedText = data.candidates[0].content.parts[0].text;
                // Clean up markdown code blocks if present
                generatedText = generatedText.replace(/^```jsx\s*|```javascript\s*|```\s*$/gm, '').trim();
                return generatedText;
            } else {
                console.warn("Gemini API response format unexpected or empty:", data);
                showErrorModal('Gemini APIから予期しない形式のレスポンス、または空のレスポンスが返されました。');
                addLogEntry('system', 'APIレスポンス形式エラーまたは空。');
                return null;
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            showErrorModal(`API通信エラー: ${error.message}`);
            addLogEntry('system', `API通信エラー: ${error.message}`);
            return null;
        }
    }

    // --- 3.3. Step-by-Step Generation ---
    async function startDashboardGeneration() {
        if (!uploadedTableDataJson) {
            showErrorModal('ダッシュボード生成を開始する前にデータをアップロードしてください。');
            return;
        }
        if (!geminiApiKey) {
            showErrorModal('Gemini APIキーが設定されていません。');
            return;
        }
        currentGenerationStep = 1;
        currentDashboardJSX = ''; // Reset previous generation
        currentDashboardCSS = ''; // Reset CSS as well
        generationStatusMessage.textContent = `ステップ ${currentGenerationStep}/${MAX_GENERATION_STEPS}: 初期コンポーネント生成中...`;
        addLogEntry('system', 'ダッシュボード自動生成プロセス開始。');
        await runNextGenerationStep();
    }

    async function runNextGenerationStep() {
        if (currentGenerationStep > MAX_GENERATION_STEPS) {
            generationStatusMessage.textContent = 'ダッシュボード生成完了！プレビューで確認してください。';
            addLogEntry('system', '全5段階のダッシュボード自動生成プロセスが完了しました。');
            updateButtonStates();
            return;
        }

        generationStatusMessage.textContent = `ステップ ${currentGenerationStep}/${MAX_GENERATION_STEPS}: 生成中... しばらくお待ちください。`;
        showLoading(uploadFileButton); // Indicate global loading on a prominent button

        const prompt = generatePromptForStep(currentGenerationStep);
        addLogEntry('system', `ステップ ${currentGenerationStep} プロンプト送信 (要約): ${prompt.substring(0,150)}...`);

        const aiResponse = await callGeminiAPI(prompt);
        
        if (aiResponse) {
            // The AI is expected to return JSX, potentially with <style> tags embedded or inline styles.
            // For simplicity, we'll assume the AI response is the JSX code.
            // If AI separates JSX and CSS, parsing logic would be needed here.
            currentDashboardJSX = aiResponse; // AI gives full component code
            
            // Extract human-readable explanation if AI provides it (complex parsing needed, skipping for now)
            // For now, the 'content' for AI log will be a generic message or the code itself.
            // To simplify, we just log that code was received. A more sophisticated approach would be to ask AI
            // to structure its response e.g. with JSON containing { jsx: "...", css: "...", explanation: "..." }
            addLogEntry('ai', `ステップ ${currentGenerationStep} のコードを受信しました。`);

            saveToLocalStorage('dashboard_jsx_code', currentDashboardJSX);
            // If currentDashboardCSS were managed separately: saveToLocalStorage('dashboard_css_code', currentDashboardCSS);

            generationStatusMessage.textContent = `ステップ ${currentGenerationStep}/${MAX_GENERATION_STEPS} 完了。`;
            currentGenerationStep++;
            // Small delay before next step to allow UI to update and not hit API rate limits too hard
            setTimeout(runNextGenerationStep, 1000); 
        } else {
            generationStatusMessage.textContent = `ステップ ${currentGenerationStep}/${MAX_GENERATION_STEPS} でエラーが発生しました。ログを確認してください。`;
            addLogEntry('system', `ステップ ${currentGenerationStep} の生成に失敗しました。`);
        }
        showLoading(uploadFileButton, false);
        updateButtonStates();
    }

    function generatePromptForStep(step) {
        const dataSample = JSON.stringify(uploadedTableDataJson.slice(0, 5)); // Sample for brevity in prompt
        const fullDataInfo = `(全 ${uploadedTableDataJson.length}行のデータがあります。最初の5行のサンプル: ${dataSample})`;

        const commonInstructions = `
あなたはReactとデータ視覚化の専門家AIです。
提供された表データ（JSON形式）を \`props.data\` として受け取るReact関数コンポーネント \`DashboardCore\` を生成してください。
生成するコンポーネントはJSXで記述し、必要なスタイルはインラインスタイルまたはコンポーネント内の \`<style>\` タグに含めてください。
CSSのスコープのため、コンポーネントのルート要素にユニークなクラス名（例: \`dashboard-container-\` + タイムスタンプなど）を付与し、そのクラス名をプレフィックスとしてCSSセレクタを記述してください。
チャート描画にはRechartsライブラリを使用してください (\`Recharts\` オブジェクトとしてグローバルにアクセス可能)。
React, ReactDOM, Babel, RechartsはCDN経由で読み込み済みです。
応答は、ReactコンポーネントのコードのみをJSX形式で返してください。説明文や他のテキストは含めないでください。
`;

        let stepSpecificPrompt = "";
        switch (step) {
            case 1:
                stepSpecificPrompt = `以下の表データ ${fullDataInfo} から、最も重要なKPIを3つ程度特定し、それらを表示するシンプルなReactコンポーネントの骨子（コンポーネント名: DashboardCore）を作成してください。データは \`data\` というpropsとしてコンポーネントに渡される前提で実装してください。`;
                break;
            case 2:
                stepSpecificPrompt = `現在の \`DashboardCore\` コンポーネントは以下の通りです:\n\`\`\`jsx\n${currentDashboardJSX}\n\`\`\`\nこのコンポーネントに、表データ ${fullDataInfo} に適したチャートを1つ追加してください。Rechartsライブラリの使用を推奨します。どのデータを使い、どのようなチャートにするか内部で判断し、実装してください。`;
                break;
            case 3:
                stepSpecificPrompt = `現在の \`DashboardCore\` コンポーネントは以下の通りです:\n\`\`\`jsx\n${currentDashboardJSX}\n\`\`\`\nこのコンポーネントに、ユーザーがデータをインタラクティブに操作できる機能（例: 特定の列に基づくフィルタリング、ソートなど）を1つ追加してください。どの列を対象とし、どのようなUIで操作させるか判断し、実装してください。`;
                break;
            case 4:
                stepSpecificPrompt = `現在の \`DashboardCore\` コンポーネントは以下の通りです:\n\`\`\`jsx\n${currentDashboardJSX}\n\`\`\`\nこのコンポーネントのレイアウトとスタイルを改善し、より洗練され、情報が整理されてユーザーが見やすいデザインにしてください。必要であればコンポーネントを適切に分割・構造化してください。CSSも改善してください。`;
                break;
            case 5:
                stepSpecificPrompt = `現在の \`DashboardCore\` コンポーネントは以下の通りです:\n\`\`\`jsx\n${currentDashboardJSX}\n\`\`\`\nこのコンポーネントを最終確認し、さらに改善できる点や、このダッシュボードに追加すると有用と思われる機能（例: 詳細データの表示モーダル、別の視点からのチャート、データの集計値表示など）があれば1つ提案し、実装してください。`;
                break;
        }
        return commonInstructions + stepSpecificPrompt;
    }

    // --- 3.4. AI Conversation Log ---
    function addLogEntry(type, content) {
        const entry = { type, content, timestamp: new Date().toISOString() };
        aiConversationLog.push(entry);
        saveToLocalStorage('ai_conversation_log', aiConversationLog);
        renderLog();
    }

    function renderLog() {
        aiLogContainer.innerHTML = '';
        aiConversationLog.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('log-entry', entry.type);
            
            const time = new Date(entry.timestamp).toLocaleString();
            entryDiv.innerHTML = `<span class="timestamp">${time}</span><p>${entry.content.replace(/\n/g, '<br>')}</p>`;
            aiLogContainer.appendChild(entryDiv);
        });
        aiLogContainer.scrollTop = aiLogContainer.scrollHeight;
    }
    openLogModalButton.addEventListener('click', () => {
        renderLog(); // Ensure it's up-to-date before opening
        openModal(logModal);
    });

    // --- 4. Preview & Correction ---
    openPreviewModalButton.addEventListener('click', () => {
        if (!currentDashboardJSX || !uploadedTableDataJson) {
            showErrorModal('プレビューするダッシュボードコードまたはデータがありません。');
            return;
        }
        renderDashboardPreview();
        openModal(previewModal);
    });

    function renderDashboardPreview() {
        if (!currentDashboardJSX || !uploadedTableDataJson) return;

        // Clear previous preview
        try {
            if (dashboardPreviewRoot.firstChild) {
                ReactDOM.unmountComponentAtNode(dashboardPreviewRoot);
            }
        } catch (e) { console.warn("Error unmounting previous preview:", e); }
        dashboardPreviewRoot.innerHTML = ''; 
        
        const oldScriptTag = document.getElementById('preview-script-babel');
        if (oldScriptTag) oldScriptTag.remove();
        const oldStyleTag = document.getElementById('preview-style');
        if (oldStyleTag) oldStyleTag.remove();

        // If CSS is managed separately and NOT embedded in JSX
        if (currentDashboardCSS) {
            const styleTag = document.createElement('style');
            styleTag.type = 'text/css';
            styleTag.id = 'preview-style';
            styleTag.textContent = currentDashboardCSS;
            document.head.appendChild(styleTag);
        }
        
        const scriptContent = `
            const previewChartData = ${JSON.stringify(uploadedTableDataJson)};
            // Make Recharts globally available for the dynamic script
            const { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

            ${currentDashboardJSX} // This should define DashboardCore

            try {
                if (typeof DashboardCore !== 'undefined') {
                    ReactDOM.render(
                        React.createElement(DashboardCore, { data: previewChartData }),
                        document.getElementById('dashboard-preview-root')
                    );
                } else {
                    document.getElementById('dashboard-preview-root').innerText = 'エラー: DashboardCoreコンポーネントが定義されていません。AIが生成したコードを確認してください。';
                    console.error('DashboardCore is not defined in the AI generated JSX.');
                }
            } catch (e) {
                console.error('Error rendering React component:', e);
                document.getElementById('dashboard-preview-root').innerText = 'Reactコンポーネントのレンダリング中にエラーが発生しました: ' + e.message;
            }
        `;

        const scriptTag = document.createElement('script');
        scriptTag.type = 'text/babel';
        scriptTag.id = 'preview-script-babel';
        scriptTag.textContent = scriptContent;
        document.body.appendChild(scriptTag); // Append to body
        
        // Babel Standalone might need a moment to transpile and execute
        // This re-evaluates scripts, ensure Babel is loaded before this call
        if (window.Babel) {
            try {
                 window.Babel.transformScriptTags();
            } catch(e) {
                console.error("Babel transformation error:", e);
                dashboardPreviewRoot.innerText = 'Babelによる変換エラー: ' + e.message;
            }
        } else {
            console.error("Babel is not loaded.");
            dashboardPreviewRoot.innerText = "Babelがロードされていません。";
        }
    }
    
    sendCorrectionButton.addEventListener('click', async () => {
        const userInstruction = userCorrectionInput.value.trim();
        if (!userInstruction) {
            correctionStatus.textContent = '修正指示を入力してください。';
            correctionStatus.className = 'status-message error';
            return;
        }
        if (!currentDashboardJSX) {
            correctionStatus.textContent = '修正対象のダッシュボードコードがありません。';
            correctionStatus.className = 'status-message error';
            return;
        }

        correctionStatus.textContent = 'AIに修正を依頼中...';
        correctionStatus.className = 'status-message';
        showLoading(sendCorrectionButton);
        addLogEntry('user', `修正指示: ${userInstruction}`);

        const prompt = `
あなたはReactとデータ視覚化の専門家です。
以下のReactコンポーネント（JSXと、必要に応じて埋め込みCSSを含む）があります:
\`\`\`jsx
${currentDashboardJSX}
\`\`\`
このコンポーネントに対して、次のユーザー指示に基づいて修正を行ってください:
"${userInstruction}"

修正後の完全なReactコンポーネントコード(JSXと必要な埋め込みCSS)のみを返してください。説明文は不要です。
既存のコンポーネント構造やスタイルを尊重しつつ、指示された変更を適用してください。
データは \`props.data\` として渡される前提です。
Rechartsライブラリ (\`Recharts\` オブジェクトとしてグローバルにアクセス可能) を使用できます。
`;

        const correctedJSX = await callGeminiAPI(prompt);
        showLoading(sendCorrectionButton, false);

        if (correctedJSX) {
            currentDashboardJSX = correctedJSX;
            saveToLocalStorage('dashboard_jsx_code', currentDashboardJSX);
            addLogEntry('ai', '修正版コードを受信しました。');
            userCorrectionInput.value = '';
            correctionStatus.textContent = 'AIによる修正が完了しました。プレビューを更新します。';
            correctionStatus.className = 'status-message success';
            renderDashboardPreview(); // Refresh preview
        } else {
            addLogEntry('system', 'AIによる修正に失敗しました。');
            correctionStatus.textContent = 'AIによる修正に失敗しました。ログを確認してください。';
            correctionStatus.className = 'status-message error';
        }
        updateButtonStates();
    });
    userCorrectionInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendCorrectionButton.click();
        }
    });


    // --- 5. Download Dashboard ---
    downloadDashboardButton.addEventListener('click', () => {
        if (!currentDashboardJSX || !uploadedTableDataJson) {
            showErrorModal('ダウンロードするダッシュボードコードまたはデータがありません。');
            return;
        }

        // Prepare CSS part - if AI embeds <style> in JSX, this might be empty or less critical.
        // If currentDashboardCSS has content, use it. Otherwise, rely on styles within JSX.
        let styleBlock = '';
        if (currentDashboardCSS && currentDashboardCSS.trim() !== '') {
             styleBlock = `<style type="text/css">\n${currentDashboardCSS}\n</style>`;
        }
        // If JSX has <style> tag, this external block might be redundant or could be for global styles.
        // The prompt to AI asks for styles to be embedded or in <style> within the component.

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Dashboard</title>
    <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/recharts/umd/Recharts.min.js"></script>
    <style type="text/css">
        body { font-family: sans-serif; margin: 20px; background-color: #f0f2f5; }
        #dashboard-root { max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
        /* Additional global styles if needed */
        ${styleBlock}
    </style>
</head>
<body>
    <div id="dashboard-root"></div>

    <script type="text/babel">
        const chartData = ${JSON.stringify(uploadedTableDataJson, null, 2)};
        const { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

        ${currentDashboardJSX} // AI generated React component code

        if (typeof DashboardCore !== 'undefined') {
            ReactDOM.render(
                React.createElement(DashboardCore, { data: chartData }),
                document.getElementById('dashboard-root')
            );
        } else {
            document.getElementById('dashboard-root').innerText = 'Error: DashboardCore component not found.';
        }
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'dashboard.html';
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        addLogEntry('system', 'ダッシュボードHTMLがダウンロードされました。');
    });

    // --- UI State Updates ---
    function updateButtonStates() {
        const dataLoaded = uploadedTableDataJson !== null;
        const codeGenerated = currentDashboardJSX !== '';
        const apiKeySet = geminiApiKey !== '';

        uploadFileButton.disabled = !apiKeySet; // Can only upload if API key is there for generation
        openLogModalButton.disabled = aiConversationLog.length === 0;
        openPreviewModalButton.disabled = !(dataLoaded && codeGenerated && apiKeySet);
        downloadDashboardButton.disabled = !(dataLoaded && codeGenerated && apiKeySet);
        sendCorrectionButton.disabled = !(dataLoaded && codeGenerated && apiKeySet);
        userCorrectionInput.disabled = !(dataLoaded && codeGenerated && apiKeySet);

        if (!apiKeySet) {
            initialHelpText.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Gemini APIキーが設定されていません。設定画面 <i class="fas fa-cog"></i> から入力してください。</p>';
            initialHelpText.style.display = 'block';
        } else if (!dataLoaded) {
             initialHelpText.innerHTML = '<p><i class="fas fa-folder-open"></i> アイコンからExcel (.xlsx) または CSV (.csv) ファイルをアップロードして開始します。</p>';
             initialHelpText.style.display = 'block';
        } else {
            initialHelpText.style.display = 'none';
        }
    }


    // --- Initialization ---
    loadFromLocalStorage();
    renderLog(); // Render any loaded logs
    updateButtonStates();
});
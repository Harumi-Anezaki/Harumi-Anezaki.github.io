const { useState, useEffect, useRef } = React;

const App = () => {
    const [apiKey, setApiKey] = useState('');
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState([]);
    const [dashboardConfig, setDashboardConfig] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const generateDashboardBtnRef = useRef(null);

    // APIキーをセッションストレージから読み込み・保存
    useEffect(() => {
        const storedApiKey = sessionStorage.getItem('geminiApiKey');
        if (storedApiKey) {
            setApiKey(storedApiKey);
        }
    }, []);

    useEffect(() => {
        if (apiKey && excelFile) {
            generateDashboardBtnRef.current.disabled = false;
        } else {
            generateDashboardBtnRef.current.disabled = true;
        }
    }, [apiKey, excelFile]);

    const handleApiKeySave = () => {
        const keyInput = document.getElementById('apiKey').value;
        if (keyInput) {
            setApiKey(keyInput);
            sessionStorage.setItem('geminiApiKey', keyInput);
            alert('APIキーがセッションに保存されました。');
            setError('');
        } else {
            setError('APIキーを入力してください。');
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setExcelFile(file);
            setError('');
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // cellDates: true で日付をJS Dateに
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                setExcelData(json);
            };
            reader.onerror = (err) => {
                console.error("File reading error:", err);
                setError("ファイルの読み込みに失敗しました。");
                setExcelData([]);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const callGeminiApi = async (promptText) => {
        if (!apiKey) {
            throw new Error("APIキーが設定されていません。");
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: {
                        // temperature: 0.7, // 応答の多様性を調整
                        // maxOutputTokens: 2048, // 最大出力トークン数
                    }
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Response:", errorBody);
                let detailedMessage = errorBody.error?.message || '不明なエラー';
                if (errorBody.error?.details) {
                    detailedMessage += ` (${errorBody.error.details.map(d => d.reason || d['@type']).join(', ')})`;
                }
                throw new Error(`APIリクエストエラー: ${response.status} ${response.statusText}. ${detailedMessage}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                let rawJsonString = data.candidates[0].content.parts[0].text;
                rawJsonString = rawJsonString.replace(/^```json\s*([\s\S]*?)\s*```$/gm, '$1').trim();
                try {
                    return JSON.parse(rawJsonString);
                } catch (e) {
                    console.error("AIレスポンスのJSONパースに失敗:", e);
                    console.error("受信した文字列:", rawJsonString);
                    throw new Error("AIの応答が期待されるJSON形式ではありません。内容を確認してください。");
                }
            } else {
                 if (data.promptFeedback && data.promptFeedback.blockReason) {
                    throw new Error(`AIからの応答がブロックされました: ${data.promptFeedback.blockReason}. プロンプト内容やAPIキーの権限を確認してください。`);
                }
                throw new Error("AIから有効なコンテンツを取得できませんでした。");
            }
        } catch (error) {
            console.error('Gemini API呼び出し中にエラー:', error);
            throw error;
        }
    };

    const handleGenerateDashboard = async () => {
        if (!excelData || excelData.length === 0) {
            setError('Excelデータが読み込まれていません。');
            return;
        }
        if (!apiKey) {
            setError('Google AI Studio APIキーが入力されていません。');
            return;
        }

        setIsLoading(true);
        setError('');
        setDashboardConfig([]); // 既存のダッシュボードをクリア

        try {
            const headers = Object.keys(excelData[0] || {});
            const sampleData = excelData.slice(0, 5); // 最初の5行をサンプルとして使用

            const prompt = `あなたは優秀なデータアナリストです。
提供されたExcelデータのヘッダーとサンプルを分析し、そのデータから有益な情報を視覚化するためのダッシュボードコンポーネントの構成案を提案してください。

以下のルールに従って、JSON形式で3個から5個のコンポーネント構成オブジェクトの配列として回答してください。各コンポーネントはユニークな視点やデータ分析を提供してください。

1.  各コンポーネントオブジェクトは、以下のキーを持つ必要があります。
    *   \`type\`: 文字列。以下のいずれか: "kpi", "bar", "line", "pie", "doughnut", "table"
    *   \`title\`: 文字列。グラフやカードのタイトル（日本語）。データの内容に即した具体的なタイトルにしてください。
    *   \`data_columns\`: オブジェクト。使用するデータ列を指定します。詳細は後述。
    *   \`description\`: 文字列（任意）。コンポーネントに関する簡単な説明や洞察。

2.  \`data_columns\` の詳細:
    *   \`kpi\` タイプの場合:
        *   \`value_column\`: (必須) 数値を集計する列名。
        *   \`aggregation\`: (必須) 集計方法。"sum", "average", "count", "first" (最初の行の値), "last" (最後の行の値)。
        *   \`prefix\`: (任意) 値の前に付加する文字列 (例: "¥")。
        *   \`suffix\`: (任意) 値の後ろに付加する文字列 (例: "件")。
        *   \`decimals\`: (任意) 表示する小数点以下の桁数 (例: 0, 2)。
    *   \`bar\` または \`line\` タイプの場合:
        *   \`x\`: (必須) X軸に使用する列名 (カテゴリカルデータまたは日付/時刻データ)。
        *   \`y\`: (必須) Y軸に使用する列名 (数値データ)。この列の値を \`x\` の各カテゴリで集計します（合計）。
    *   \`pie\` または \`doughnut\` タイプの場合:
        *   \`label\`: (必須) 各スライスのラベルとなる列名。
        *   \`value\`: (必須) 各スライスの値となる列名 (数値データ)。この列の値を \`label\` の各カテゴリで集計します（合計）。
    *   \`table\` タイプの場合:
        *   \`columns\`: (任意) 表示する列名の配列。例: \`["列A", "列B", "列C"]\`。指定しない場合、または空配列の場合は、データの全列を表示します。

3.  提案するコンポーネントは、提供されたデータから実際に意味のある洞察を引き出せるものにしてください。
4.  Excelデータのヘッダー名を正確に使用してください。大文字・小文字も区別してください。
5.  日付や時刻と思われる列をX軸に使う場合、適切に \`line\` タイプを提案してください。カテゴリデータの場合は \`bar\` タイプが適切です。
6.  応答はJSON配列の文字列のみとし、前後に説明文や\`\`\`json ... \`\`\`のようなマークダウンは含めないでください。

提供するExcelデータのヘッダー:
${JSON.stringify(headers)}

最初の数行のデータサンプル (JSON形式):
${JSON.stringify(sampleData)}

上記の指示に基づき、JSON配列を生成してください。`;
            
            const config = await callGeminiApi(prompt);
            if (Array.isArray(config)) {
                setDashboardConfig(config);
            } else {
                throw new Error("AIからの応答が期待される配列形式ではありません。");
            }

        } catch (err) {
            console.error("ダッシュボード生成エラー:", err);
            setError(`エラー: ${err.message}`);
            setDashboardConfig([]);
        } finally {
            setIsLoading(false);
        }
    };

    document.getElementById('saveApiKeyBtn')?.addEventListener('click', handleApiKeySave);
    document.getElementById('excelFile')?.addEventListener('change', handleFileChange);
    // This ref assignment needs to be careful with re-renders. Better to handle in useEffect or directly.
    // For simplicity, we assume it's available. A more robust way would be to pass setApiKey and setExcelFile to those inputs.
    // Or, use refs for the input elements themselves if not using React for those.
    // Since this is a hybrid, we'll rely on the DOM elements existing.
     useEffect(() => {
        const btn = document.getElementById('generateDashboardBtn');
        if (btn) {
            generateDashboardBtnRef.current = btn;
            btn.addEventListener('click', handleGenerateDashboard);
            // Cleanup event listener on component unmount
            return () => btn.removeEventListener('click', handleGenerateDashboard);
        }
    }, [handleGenerateDashboard]); // Re-attach if handler changes (due to dependencies)


    return (
        <>
            {/* Input fields are in HTML, state managed by App component. Buttons trigger App methods. */}
            {/* Error and Loading display */}
            {isLoading && (
                <div id="loadingIndicator" style={{ display: 'flex' }}>
                    <div className="spinner"></div>
                    <p>AIがダッシュボードを賢く生成中です... しばらくお待ちください。</p>
                </div>
            )}
            {error && <div id="errorMessage" className="error-message" style={{display: 'block'}}>{error}</div>}

            {/* Dashboard Rendering Area */}
            <Dashboard componentsConfig={dashboardConfig} excelData={excelData} />
        </>
    );
};

// --- React Components for Dashboard ---

const KpiCard = ({ title, value, description, prefix = '', suffix = '', decimals }) => {
    let displayValue = value;
    if (typeof value === 'number') {
        displayValue = value.toFixed(decimals !== undefined ? decimals : (Number.isInteger(value) ? 0 : 2) );
    }
    return (
        <div className="kpi-card widget">
            <h3>{title}</h3>
            <p className="kpi-value">{prefix}{displayValue}{suffix}</p>
            {description && <p className="kpi-description">{description}</p>}
        </div>
    );
};

const ChartComponent = ({ title, type, excelData, dataColumns, chartId }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!excelData || excelData.length === 0 || !dataColumns || !chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        let chartDataConfig;
        let chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: title, font: { size: 16 } },
                legend: { display: true, position: 'top' }
            },
        };

        if (type === 'bar' || type === 'line') {
            const xKey = dataColumns.x;
            const yKey = dataColumns.y;
            if (!xKey || !yKey) { console.warn(`Chart ${title}: x or y key missing.`); return; }

            const uniqueXValues = [];
            const seenX = new Set();
            excelData.forEach(row => {
                if (row.hasOwnProperty(xKey) && !seenX.has(row[xKey])) {
                    uniqueXValues.push(row[xKey]);
                    seenX.add(row[xKey]);
                }
            });
            
            const aggregatedData = {};
            uniqueXValues.forEach(val => aggregatedData[val] = 0);

            excelData.forEach(row => {
                if (row.hasOwnProperty(xKey) && row.hasOwnProperty(yKey)) {
                    const xVal = row[xKey];
                    const yVal = parseFloat(String(row[yKey]).replace(/,/g, '')); // Remove commas for parsing
                    if (!isNaN(yVal) && aggregatedData.hasOwnProperty(xVal)) {
                        aggregatedData[xVal] += yVal;
                    }
                }
            });
            
            chartDataConfig = {
                labels: uniqueXValues,
                datasets: [{
                    label: yKey,
                    data: uniqueXValues.map(key => aggregatedData[key]),
                    backgroundColor: type === 'bar' ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.2)',
                    borderColor: type === 'bar' ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)',
                    borderWidth: 1.5,
                    fill: type === 'line' ? false : undefined,
                    tension: type === 'line' ? 0.1 : undefined,
                }]
            };
        } else if (type === 'pie' || type === 'doughnut') {
            const labelKey = dataColumns.label;
            const valueKey = dataColumns.value;
            if (!labelKey || !valueKey) { console.warn(`Chart ${title}: label or value key missing.`); return; }

            const aggregatedData = {};
            excelData.forEach(row => {
                if (row.hasOwnProperty(labelKey) && row.hasOwnProperty(valueKey)) {
                    const label = row[labelKey];
                    const value = parseFloat(String(row[valueKey]).replace(/,/g, ''));
                    if (!isNaN(value)) {
                        aggregatedData[label] = (aggregatedData[label] || 0) + value;
                    }
                }
            });
            const backgroundColors = [
                'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(40, 159, 64, 0.7)'
            ];
            chartDataConfig = {
                labels: Object.keys(aggregatedData),
                datasets: [{
                    data: Object.values(aggregatedData),
                    backgroundColor: backgroundColors.slice(0, Object.keys(aggregatedData).length),
                }]
            };
        } else {
            console.warn("Unsupported chart type or data not ready for:", type, title);
            return;
        }

        if (chartDataConfig) {
             chartInstanceRef.current = new Chart(ctx, { type, data: chartDataConfig, options: chartOptions });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [title, type, excelData, dataColumns, chartId]);

    return (
        <div className="widget chart-widget">
            {/* Title is now part of Chart.js options 
            <h3>{title}</h3> */}
            <div className="chart-container"> {/* Added container for sizing */}
                <canvas ref={chartRef} id={chartId}></canvas>
            </div>
        </div>
    );
};

const TableComponent = ({ title, excelData, dataColumns }) => {
    if (!excelData || excelData.length === 0) return <div className="widget"><p>テーブルデータを表示できません。</p></div>;

    let headers = (dataColumns && dataColumns.columns && dataColumns.columns.length > 0)
                    ? dataColumns.columns
                    : Object.keys(excelData[0] || {});
    
    // Filter out headers not present in the actual data, in case AI hallucinates column names
    if (excelData[0]) {
        const actualHeaders = Object.keys(excelData[0]);
        headers = headers.filter(h => actualHeaders.includes(h));
    }
    if (headers.length === 0 && excelData[0]) { // Fallback if AI provides empty or all wrong columns
        headers = Object.keys(excelData[0]);
    }


    const rowsToDisplay = excelData.slice(0, 10); // Display first 10 rows

    return (
        <div className="table-widget widget">
            <h3>{title}</h3>
            {rowsToDisplay.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            {headers.map(header => <th key={header}>{header}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rowsToDisplay.map((row, index) => (
                            <tr key={index}>
                                {headers.map(header => <td key={`${header}-${index}`}>{String(row[header])}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p>表示するデータがありません。</p>}
            {excelData.length > 10 && <p className="table-info">... 他 {excelData.length - 10} 行 (最初の10行のみ表示)</p>}
        </div>
    );
};

const Dashboard = ({ componentsConfig, excelData }) => {
    if (!componentsConfig || componentsConfig.length === 0) {
        // Don't show this message if loading or error is already displayed.
        // It will be shown after loading finishes and no config is available.
        // Also, don't show if excelData is not yet loaded.
        if (excelData && excelData.length > 0) {
             return <p style={{textAlign: 'center', padding: '20px'}}>ダッシュボードを生成するには、ファイルをアップロードし「ダッシュボードを生成」ボタンを押してください。AIからの提案がない場合、ここに表示されます。</p>;
        }
        return null; // No data, no config, no message yet.
    }
    if (!excelData || excelData.length === 0) {
        return <p style={{textAlign: 'center', padding: '20px'}}>Excelデータがまだロードされていません。</p>;
    }


    return (
        <div className="dashboard-grid">
            {componentsConfig.map((config, index) => {
                const componentKey = `component-${index}-${config.type}-${config.title}`; // More unique key
                if (!config.type || !config.title || !config.data_columns) {
                    console.warn("Skipping invalid component config:", config);
                    return <div key={componentKey} className="widget error-widget"><p>無効なコンポーネント設定です。</p><h3>{config.title || "タイトル不明"}</h3><p>タイプ: {config.type || "不明"}</p><p>エラー: 必要な情報が不足しています。</p></div>;
                }


                try {
                    if (config.type === 'kpi') {
                        let kpiValue = "N/A";
                        const { value_column, aggregation, prefix, suffix, decimals } = config.data_columns;
                        
                        if (value_column && aggregation && excelData[0] && excelData[0].hasOwnProperty(value_column)) {
                            const numericValues = excelData.map(row => parseFloat(String(row[value_column]).replace(/,/g, ''))).filter(val => !isNaN(val));
                            if (numericValues.length > 0) {
                                if (aggregation === 'sum') kpiValue = numericValues.reduce((a, b) => a + b, 0);
                                else if (aggregation === 'average') kpiValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                                else if (aggregation === 'count') kpiValue = excelData.length; // or numericValues.length
                                // For 'first' and 'last', ensure the column exists and handle non-numeric if necessary
                            }
                            if (aggregation === 'first' && excelData[0] && excelData[0].hasOwnProperty(value_column)) kpiValue = excelData[0][value_column];
                            if (aggregation === 'last' && excelData.length > 0 && excelData[excelData.length-1].hasOwnProperty(value_column)) kpiValue = excelData[excelData.length-1][value_column];
                        } else if (aggregation === 'count') { // Count all rows if no specific value_column
                             kpiValue = excelData.length;
                        }


                        return <KpiCard key={componentKey} title={config.title} value={kpiValue} description={config.description} prefix={prefix} suffix={suffix} decimals={decimals} />;
                    } else if (['bar', 'line', 'pie', 'doughnut'].includes(config.type)) {
                        return <ChartComponent
                                    key={componentKey}
                                    chartId={`chart-${index}-${config.type}`}
                                    title={config.title}
                                    type={config.type}
                                    excelData={excelData}
                                    dataColumns={config.data_columns}
                                />;
                    } else if (config.type === 'table') {
                        return <TableComponent
                                    key={componentKey}
                                    title={config.title}
                                    excelData={excelData}
                                    dataColumns={config.data_columns}
                                />;
                    }
                    return <div key={componentKey} className="widget"><p>未対応または不完全なコンポーネントタイプ: {config.type}</p><h3>{config.title}</h3></div>;
                } catch (compError) {
                    console.error(`Error rendering component ${config.title}:`, compError);
                    return <div key={componentKey} className="widget error-widget"><h3>{config.title}</h3><p>コンポーネントの描画中にエラーが発生しました: {compError.message}</p></div>;
                }
            })}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('dashboard-container'));
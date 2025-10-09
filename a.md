- 07.1.1.1_競合問題修正
(完成版=)
    - PP
        - v1
            - 01
                
                ```jsx
                拡張機能1と拡張機能2をすごく超詳細に分析して｡
                
                # 拡張機能1
                // ==UserScript==
                // @name         notion 下線
                // @namespace    http://tampermonkey.net/
                // @version      1.2
                // @description  Notionのリストブロックで、子を持つ親ノードかつ、ノード単体の高さが50px以上のものにのみ、インデントを示す垂直線を描画します。
                // @author       Your Name (AI Assisted)
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                    // --- 設定項目 ---
                    const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに線を描画
                    const DEBOUNCE_DELAY = 1000;         // DOM変更後の再計算までの待機時間(ms)
                
                    // =================================================================
                    // ステップ1: 垂直線を描画するためのCSSを注入
                    // =================================================================
                    const css = `
                        /* 基準点となるブロック要素 */
                        .notion-bulleted_list-block,
                        .notion-to_do-block,
                        .notion-numbered_list-block,
                        .notion-toggle-block {
                            position: relative;
                        }
                
                        /* 垂直線本体 (擬似要素 ::after を使用) */
                        .notion-bulleted_list-block::after,
                        .notion-to_do-block::after,
                        .notion-numbered_list-block::after,
                        .notion-toggle-block::after {
                            content: '';
                            position: absolute;
                            background-color: rgba(0, 0, 0, 0.15);
                            width: 1px;
                            height: var(--vertical-line-height, 0);
                            top: 15px;
                            left: 13.5px;
                            z-index: 0;
                            pointer-events: none; /* 線がクリックの邪魔をしないように */
                            display: var(--vertical-line-display, none);
                        }
                
                        /* ダークモード対応 */
                        body.dark .notion-bulleted_list-block::after,
                        body.dark .notion-to_do-block::after,
                        body.dark .notion-numbered_list-block::after,
                        body.dark .notion-toggle-block::after {
                            background-color: rgba(255, 255, 255, 0.15);
                        }
                    `;
                    GM_addStyle(css);
                
                    // =================================================================
                    // ステップ2: コアとなるロジックの実装
                    // =================================================================
                
                    const targetSelectors = [
                        '.notion-to_do-block',
                        '.notion-toggle-block',
                        '.notion-bulleted_list-block',
                        '.notion-numbered_list-block'
                    ].join(', ');
                
                    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                    // 【変更点 1】拡張機能βから末端ノード判定ロジックを移植
                    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                    /**
                     * ブロックが末端ノード（Leaf Node）かどうかを判定する関数
                     * @param {HTMLElement} block - 判定対象のブロック要素
                     * @returns {boolean} - 末端ノードであればtrue
                     */
                    function isLeafNode(block) {
                        const descendantBlocks = block.querySelectorAll(targetSelectors);
                        for (const descendant of descendantBlocks) {
                            if (descendant.parentElement.closest(targetSelectors) === block) {
                                if (descendant.firstElementChild) {
                                    return false; // 本物の直下の子が見つかったので、親ノード
                                }
                            }
                        }
                        return true; // 本物の直下の子が見つからなかったので、末端ノード
                    }
                
                    /**
                     * 指定された全ブロックをチェックし、条件に応じてスタイルを適用/解除する関数
                     */
                    function checkAndApplyStyles() {
                        const allTargetBlocks = document.querySelectorAll(targetSelectors);
                
                        allTargetBlocks.forEach(block => {
                            const parentHeight = block.offsetHeight;
                            const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
                
                            let childrenHeight = 0;
                            childBlocks.forEach(child => {
                                if (child.parentElement.closest(targetSelectors) === block) {
                                    childrenHeight += child.offsetHeight;
                                }
                            });
                
                            const nodeOnlyHeight = parentHeight - childrenHeight;
                
                            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                            // 【変更点 2】描画条件に「末端ノードではないこと」を追加
                            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                            // 変更前: if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD)
                            if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD && !isLeafNode(block)) {
                                // 条件を満たす場合 (高さが閾値以上 かつ 親ノードである)
                                const lineHeight = Math.max(0, nodeOnlyHeight - 15);
                                block.style.setProperty('--vertical-line-display', 'block');
                                block.style.setProperty('--vertical-line-height', `${lineHeight}px`);
                            } else {
                                // 条件を満たさない場合 (高さが足りない、または末端ノードである)
                                block.style.setProperty('--vertical-line-display', 'none');
                                block.style.removeProperty('--vertical-line-height');
                            }
                        });
                    }
                
                    /**
                     * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                     */
                    function debounce(func, wait) {
                        let timeout;
                        return function executedFunction(...args) {
                            const later = () => {
                                clearTimeout(timeout);
                                func(...args);
                            };
                            clearTimeout(timeout);
                            timeout = setTimeout(later, wait);
                        };
                    }
                
                    const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
                
                    // =================================================================
                    // ステップ3: DOMの変更を監視し、処理をトリガーする
                    // =================================================================
                    const initObserver = new MutationObserver((mutations, obs) => {
                        const notionScroller = document.querySelector('.notion-frame .notion-scroller');
                        if (notionScroller) {
                            console.log('Conditional Vertical Lines (Leaf Excluded): Notion content area found. Starting observation.');
                            checkAndApplyStyles();
                            const mainObserver = new MutationObserver(() => {
                                debouncedCheck();
                            });
                            mainObserver.observe(notionScroller, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                characterData: true
                            });
                            obs.disconnect();
                        }
                    });
                
                    initObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                
                })();
                
                # 拡張機能2
                // ==UserScript==
                // @name         Notion Tree
                // @version      1.0
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                 const css = `
                    /* --- Notion Tree (決定版) --- */
                
                    /* 1. 基本設定：対象ブロックに position: relative を設定 */
                    .notion-bulleted_list-block,
                    .notion-numbered_list-block,
                    .notion-to_do-block,
                    .notion-toggle-block {
                        position: relative;
                    }
                
                    /* 2. 線の描画：ネストされた（＝他のブロックの内部にある）リストブロックを対象とする */
                    /* シンプルかつ堅牢な子孫セレクタで、複雑な階層に対応 */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        content: '';
                        position: absolute;
                        background-color: #dcdcdc;
                        z-index: 0;
                    }
                
                    /* 3. 水平線 (-) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                        top: 15px;
                        left: -14px;
                        width: 14px;
                        height: 1px;
                    }
                
                    /* 4. 垂直線 (|) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        top: 0;
                        bottom: 0;
                        left: -14px;
                        width: 1px;
                    }
                
                    /* 5. 最後の要素の垂直線を短くして └ の角を作る */
                    /* 兄弟要素の中で最後のリストブロックタイプを対象とする */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                        height: 15px;
                    }
                
                    /* 6. 【最重要】末端ノードの線を非表示にする（幽霊ブロック対策済み） */
                    /* 条件：(1)子を持たないリスト OR (2)開いていて子を持たないトグル */
                    /* :hasセレクタを使い、「本物のコンテンツを持つ子ブロック」の有無を判定する */
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::before,
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::after {
                        display: none;
                    }
                
                    /* --- ダークモード対応 --- */
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        background-color: #4a4a4a;
                    }
                `;
                
                    // MutationObserverで監視し、確実にスタイルを適用する
                    const observer = new MutationObserver((mutations, obs) => {
                        const notionApp = document.getElementById('notion-app');
                        if (notionApp && !document.getElementById('notion-tree-lines-style-v3.0')) {
                            const styleElement = GM_addStyle(css);
                            styleElement.id = 'notion-tree-lines-style-v3.0'; // 重複適用防止用のIDを更新
                            console.log('Notion Bullet & Toggle List Tree Lines (v3.0) injected.');
                            obs.disconnect(); // 一度注入すればOK
                        }
                    });
                
                    observer.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                })();
                ```
                
            - 02
                
                ```jsx
                同時に実行すると競合してうまく動かない｡
                競合せずに同時に動かしたい｡
                しかし､domlockが強力で､classもdata-*属性の変更もブロックされている｡
                
                最終的な状態としては､拡張機能2のロジックで､treeで表示されるべき線は全て表示し､拡張機能1のロジックで､50pxを超えるノードのみ､そのノードのbullet pointから下線を表示できている状態にしたいのだが､分岐が非常に複雑なため､まずはどのように分岐を設定すれば正しく全て表示されるかをすごく超詳細に分析して｡
                ```
                
            - 03
                
                ```jsx
                分析結果を元に､統合版の拡張機能を作成して｡
                domlockが強力で､classもdata-*属性の変更もブロックされていることに注意して｡
                ```
                
        - v2_[07.1.2_競合問題修正
        (完成版=[■■■14_末端ノードも表示されちゃう](https://www.notion.so/14_-286476b49ce780f68c5cf06b4a4135d9?pvs=21) )](https://www.notion.so/07-1-2_-286476b49ce780149d4ddeecde246acf?pvs=21) の完成版に[05■■■■](https://www.notion.so/05-287476b49ce780309a25d95217b014e7?pvs=21) を統合する
            - 01
            α=[■■■14_末端ノードも表示されちゃう](https://www.notion.so/14_-286476b49ce780f68c5cf06b4a4135d9?pvs=21) 
            A=下線/[03■■■_高さ調整_末端ノードも表示されちゃう](https://www.notion.so/03-_-_-286476b49ce78020a828f635f37ec1f6?pvs=21) 
            B=tree/[03■■■■_番号付きリスト_todoリスト_修正](https://www.notion.so/03-_-_todo-_-26c476b49ce78008a57aca0771d5b649?pvs=21)
                
                ```jsx
                {拡張機能α}は{拡張機能A}と{拡張機能B}の統合版である｡
                すごく超詳細に分析して｡
                
                # 拡張機能α
                // ==UserScript==
                // @name         Notion Tree下線
                // @namespace    http://tampermonkey.net/
                // @version      1.0
                // @description  Notionのリストブロックにツリー線を描画し、さらにノード単体の高さが50px以上のものに追加の垂直線を描画します。
                // @author       Your Name (AI Assisted)
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                    // --- 設定項目 ---
                    const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに追加線を描画
                    const DEBOUNCE_DELAY = 1000;        // DOM変更後の再計算までの待機時間(ms)
                
                    // =================================================================
                    // ステップ1: 2つの機能を統合したCSSを注入
                    // =================================================================
                    const css = `
                        /* --- レイヤー1: ベースとなるツリー線 (拡張機能2ベース) --- */
                
                        /* 1. 基本設定：対象ブロックに position: relative と 背景描画の準備 を設定 */
                        .notion-bulleted_list-block,
                        .notion-numbered_list-block,
                        .notion-to_do-block,
                        .notion-toggle-block {
                            position: relative;
                            /* --- レイヤー2: 条件付き線の描画準備 (デフォルトでは非表示) --- */
                            background-image: var(--conditional-line-image);
                            background-repeat: no-repeat;
                            background-position: 13.5px var(--conditional-line-top, 15px);
                            background-size: 1px var(--conditional-line-height, 0);
                        }
                
                        /* 2. 線の描画：ネストされたリストブロックを対象とする */
                        div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                        div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                            content: '';
                            position: absolute;
                            background-color: #dcdcdc;
                            z-index: 0;
                            pointer-events: none;
                        }
                
                        /* 3. 水平線 (-) */
                        div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                            top: 15px;
                            left: -14px;
                            width: 14px;
                            height: 1px;
                        }
                
                        /* 4. 垂直線 (|) */
                        div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                            top: 0;
                            bottom: 0;
                            left: -14px;
                            width: 1px;
                        }
                
                        /* 5. 最後の要素の垂直線を短くして └ の角を作る */
                        div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                            height: 15px;
                        }
                
                        /* 6. 末端ノードの線を非表示にする */
                        :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                        :is(
                            .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                            .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                            .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                            .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                        )::before,
                        :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                        :is(
                            .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                            .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                            .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                            .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                        )::after {
                            display: none;
                        }
                
                        /* --- ダークモード対応 --- */
                        body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                        body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                            background-color: #4a4a4a;
                        }
                    `;
                    GM_addStyle(css);
                
                    // =================================================================
                    // ステップ2: コアとなる動的ロジック (拡張機能1ベース)
                    // =================================================================
                
                    const targetSelectors = [
                        '.notion-to_do-block',
                        '.notion-toggle-block',
                        '.notion-bulleted_list-block',
                        '.notion-numbered_list-block'
                    ].join(', ');
                
                    /**
                     * 指定された全ブロックをチェックし、条件に応じて背景線スタイルを適用/解除する関数
                     */
                    function checkAndApplyStyles() {
                        const allTargetBlocks = document.querySelectorAll(targetSelectors);
                        const isDarkMode = document.body.classList.contains('dark');
                        const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
                
                        allTargetBlocks.forEach(block => {
                            const parentHeight = block.offsetHeight;
                            const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
                
                            let childrenHeight = 0;
                            childBlocks.forEach(child => {
                                if (child.parentElement.closest(targetSelectors) === block) {
                                    childrenHeight += child.offsetHeight;
                                }
                            });
                
                            const nodeOnlyHeight = parentHeight - childrenHeight;
                
                            // 条件判定とCSSカスタムプロパティの操作
                            if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD) {
                                // 条件を満たす場合: 背景画像で線を描画
                                const lineHeight = Math.max(0, nodeOnlyHeight - 17); // 高さを計算 (マイナス値防止)
                
                                block.style.setProperty('--conditional-line-image', `linear-gradient(to bottom, ${lineColor}, ${lineColor})`);
                                block.style.setProperty('--conditional-line-height', `${lineHeight}px`);
                                block.style.setProperty('--conditional-line-top', '15px');
                
                            } else {
                                // 条件を満たさない場合: 背景画像の線を削除
                                block.style.removeProperty('--conditional-line-image');
                                block.style.removeProperty('--conditional-line-height');
                                block.style.removeProperty('--conditional-line-top');
                            }
                        });
                    }
                
                    /**
                     * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                     */
                    function debounce(func, wait) {
                        let timeout;
                        return function executedFunction(...args) {
                            const later = () => {
                                clearTimeout(timeout);
                                func(...args);
                            };
                            clearTimeout(timeout);
                            timeout = setTimeout(later, wait);
                        };
                    }
                
                    const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
                
                    // =================================================================
                    // ステップ3: DOMの変更を監視し、処理をトリガーする
                    // =================================================================
                
                    const initObserver = new MutationObserver((mutations, obs) => {
                        const notionScroller = document.querySelector('.notion-frame .notion-scroller');
                
                        if (notionScroller) {
                            console.log('Notion Enhanced Tree: Notion content area found. Starting observation.');
                
                            // 初期実行
                            checkAndApplyStyles();
                
                            // メインの監視を開始
                            const mainObserver = new MutationObserver(() => {
                                debouncedCheck();
                            });
                
                            mainObserver.observe(notionScroller, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                characterData: true
                            });
                
                            // ダークモードの切り替えも監視
                            const themeObserver = new MutationObserver(() => {
                                console.log('Notion Enhanced Tree: Theme changed. Recalculating styles.');
                                debouncedCheck();
                            });
                            themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                
                            // 初期化監視は終了
                            obs.disconnect();
                        }
                    });
                
                    initObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                
                })();
                
                # 拡張機能A
                // ==UserScript==
                // @name         notion 下線
                // @namespace    http://tampermonkey.net/
                // @version      1.1
                // @description  Notionのリストブロックで、ノード単体の高さが40px以上のものにのみ、インデントを示す垂直線を描画します。
                // @author       Your Name (AI Assisted)
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                    // --- 設定項目 ---
                    const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに線を描画
                    const DEBOUNCE_DELAY = 1000;         // DOM変更後の再計算までの待機時間(ms)
                
                    // =================================================================
                    // ステップ1: 垂直線を描画するためのCSSを注入
                    // =================================================================
                    const css = `
                        /* 基準点となるブロック要素 */
                        .notion-bulleted_list-block,
                        .notion-to_do-block,
                        .notion-numbered_list-block,
                        .notion-toggle-block {
                            position: relative;
                        }
                
                        /* 垂直線本体 (擬似要素 ::after を使用) */
                        .notion-bulleted_list-block::after,
                        .notion-to_do-block::after,
                        .notion-numbered_list-block::after,
                        .notion-toggle-block::after {
                            content: '';
                            position: absolute;
                            background-color: rgba(0, 0, 0, 0.15);
                            width: 1px;
                				    height: var(--vertical-line-height, 0);
                            top: 15px;
                            left: 13.5px;
                            z-index: 0;
                            pointer-events: none; /* 線がクリックの邪魔をしないように */
                
                            /* --- このスクリプトの核心 --- */
                            /* デフォルトでは非表示。変数が 'block' になった時だけ表示 */
                            display: var(--vertical-line-display, none);
                        }
                
                        /* ダークモード対応 */
                        body.dark .notion-bulleted_list-block::after,
                        body.dark .notion-to_do-block::after,
                        body.dark .notion-numbered_list-block::after,
                        body.dark .notion-toggle-block::after {
                            background-color: rgba(255, 255, 255, 0.15);
                        }
                    `;
                    GM_addStyle(css);
                
                    // =================================================================
                    // ステップ2: コアとなるロジックの実装
                    // =================================================================
                
                    const targetSelectors = [
                        '.notion-to_do-block',
                        '.notion-toggle-block',
                        '.notion-bulleted_list-block',
                        '.notion-numbered_list-block'
                    ].join(', ');
                
                    /**
                     * 指定された全ブロックをチェックし、条件に応じてスタイルを適用/解除する関数
                     */
                			function checkAndApplyStyles() {
                				    const allTargetBlocks = document.querySelectorAll(targetSelectors);
                
                		    allTargetBlocks.forEach(block => {
                            const parentHeight = block.offsetHeight;
                            const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
                
                            let childrenHeight = 0;
                            childBlocks.forEach(child => {
                                if (child.parentElement.closest(targetSelectors) === block) {
                                    childrenHeight += child.offsetHeight;
                                }
                            });
                
                      const nodeOnlyHeight = parentHeight - childrenHeight;
                
                        // 条件判定とCSSカスタムプロパティの操作
                        if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD) {
                            // 条件を満たす場合
                            const lineHeight = Math.max(0, nodeOnlyHeight - 15); // 高さを計算 (マイナス値防止)
                            
                            block.style.setProperty('--vertical-line-display', 'block'); // 線を表示
                            block.style.setProperty('--vertical-line-height', `${lineHeight}px`); // 計算した高さを設定
                
                        } else {
                            // 条件を満たさない場合
                            block.style.setProperty('--vertical-line-display', 'none'); // 線を非表示
                            block.style.removeProperty('--vertical-line-height'); // 不要なプロパティを削除
                        }
                    });
                }
                
                    /**
                     * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                     */
                    function debounce(func, wait) {
                        let timeout;
                        return function executedFunction(...args) {
                            const later = () => {
                                clearTimeout(timeout);
                                func(...args);
                            };
                            clearTimeout(timeout);
                            timeout = setTimeout(later, wait);
                        };
                    }
                
                    const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
                
                    // =================================================================
                    // ステップ3: DOMの変更を監視し、処理をトリガーする
                    // =================================================================
                
                    const initObserver = new MutationObserver((mutations, obs) => {
                        const notionScroller = document.querySelector('.notion-frame .notion-scroller');
                
                        if (notionScroller) {
                            console.log('Conditional Vertical Lines: Notion content area found. Starting observation.');
                
                            checkAndApplyStyles();
                
                            const mainObserver = new MutationObserver(() => {
                                debouncedCheck();
                            });
                
                            mainObserver.observe(notionScroller, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                characterData: true
                            });
                
                            obs.disconnect();
                        }
                    });
                
                    initObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                
                })();
                
                # 拡張機能B
                // ==UserScript==
                // @name         Notion Tree
                // @version      1.0
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                 const css = `
                    /* --- Notion Tree (決定版) --- */
                
                    /* 1. 基本設定：対象ブロックに position: relative を設定 */
                    .notion-bulleted_list-block,
                    .notion-numbered_list-block,
                    .notion-to_do-block,
                    .notion-toggle-block {
                        position: relative;
                    }
                
                    /* 2. 線の描画：ネストされた（＝他のブロックの内部にある）リストブロックを対象とする */
                    /* シンプルかつ堅牢な子孫セレクタで、複雑な階層に対応 */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        content: '';
                        position: absolute;
                        background-color: #dcdcdc;
                        z-index: 0;
                    }
                
                    /* 3. 水平線 (-) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                        top: 15px;
                        left: -14px;
                        width: 14px;
                        height: 1px;
                    }
                
                    /* 4. 垂直線 (|) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        top: 0;
                        bottom: 0;
                        left: -14px;
                        width: 1px;
                    }
                
                    /* 5. 最後の要素の垂直線を短くして └ の角を作る */
                    /* 兄弟要素の中で最後のリストブロックタイプを対象とする */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                        height: 15px;
                    }
                
                    /* 6. 【最重要】末端ノードの線を非表示にする（幽霊ブロック対策済み） */
                    /* 条件：(1)子を持たないリスト OR (2)開いていて子を持たないトグル */
                    /* :hasセレクタを使い、「本物のコンテンツを持つ子ブロック」の有無を判定する */
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::before,
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::after {
                        display: none;
                    }
                
                    /* --- ダークモード対応 --- */
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        background-color: #4a4a4a;
                    }
                `;
                
                    // MutationObserverで監視し、確実にスタイルを適用する
                    const observer = new MutationObserver((mutations, obs) => {
                        const notionApp = document.getElementById('notion-app');
                        if (notionApp && !document.getElementById('notion-tree-lines-style-v3.0')) {
                            const styleElement = GM_addStyle(css);
                            styleElement.id = 'notion-tree-lines-style-v3.0'; // 重複適用防止用のIDを更新
                            console.log('Notion Bullet & Toggle List Tree Lines (v3.0) injected.');
                            obs.disconnect(); // 一度注入すればOK
                        }
                    });
                
                    observer.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                })();
                ```
                
            - 02
            A’=下線/[05■■■■](https://www.notion.so/05-287476b49ce780309a25d95217b014e7?pvs=21)
                
                ```jsx
                {拡張機能A}と{拡張機能A'}の違いをすごく超詳細に分析して
                
                # 拡張機能A'
                // ==UserScript==
                // @name         notion 下線
                // @namespace    http://tampermonkey.net/
                // @version      1.2
                // @description  Notionのリストブロックで、子を持つ親ノードかつ、ノード単体の高さが50px以上のものにのみ、インデントを示す垂直線を描画します。
                // @author       Your Name (AI Assisted)
                // @match        https://www.notion.so/*
                // @grant        GM_addStyle
                // @run-at       document-start
                // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
                // ==/UserScript==
                
                (function() {
                    'use strict';
                
                    // --- 設定項目 ---
                    const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに線を描画
                    const DEBOUNCE_DELAY = 1000;         // DOM変更後の再計算までの待機時間(ms)
                
                    // =================================================================
                    // ステップ1: 垂直線を描画するためのCSSを注入
                    // =================================================================
                    const css = `
                        /* 基準点となるブロック要素 */
                        .notion-bulleted_list-block,
                        .notion-to_do-block,
                        .notion-numbered_list-block,
                        .notion-toggle-block {
                            position: relative;
                        }
                
                        /* 垂直線本体 (擬似要素 ::after を使用) */
                        .notion-bulleted_list-block::after,
                        .notion-to_do-block::after,
                        .notion-numbered_list-block::after,
                        .notion-toggle-block::after {
                            content: '';
                            position: absolute;
                            background-color: rgba(0, 0, 0, 0.15);
                            width: 1px;
                            height: var(--vertical-line-height, 0);
                            top: 15px;
                            left: 13.5px;
                            z-index: 0;
                            pointer-events: none; /* 線がクリックの邪魔をしないように */
                            display: var(--vertical-line-display, none);
                        }
                
                        /* ダークモード対応 */
                        body.dark .notion-bulleted_list-block::after,
                        body.dark .notion-to_do-block::after,
                        body.dark .notion-numbered_list-block::after,
                        body.dark .notion-toggle-block::after {
                            background-color: rgba(255, 255, 255, 0.15);
                        }
                    `;
                    GM_addStyle(css);
                
                    // =================================================================
                    // ステップ2: コアとなるロジックの実装
                    // =================================================================
                
                    const targetSelectors = [
                        '.notion-to_do-block',
                        '.notion-toggle-block',
                        '.notion-bulleted_list-block',
                        '.notion-numbered_list-block'
                    ].join(', ');
                
                    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                    // 【変更点 1】拡張機能βから末端ノード判定ロジックを移植
                    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                    /**
                     * ブロックが末端ノード（Leaf Node）かどうかを判定する関数
                     * @param {HTMLElement} block - 判定対象のブロック要素
                     * @returns {boolean} - 末端ノードであればtrue
                     */
                    function isLeafNode(block) {
                        const descendantBlocks = block.querySelectorAll(targetSelectors);
                        for (const descendant of descendantBlocks) {
                            if (descendant.parentElement.closest(targetSelectors) === block) {
                                if (descendant.firstElementChild) {
                                    return false; // 本物の直下の子が見つかったので、親ノード
                                }
                            }
                        }
                        return true; // 本物の直下の子が見つからなかったので、末端ノード
                    }
                
                    /**
                     * 指定された全ブロックをチェックし、条件に応じてスタイルを適用/解除する関数
                     */
                    function checkAndApplyStyles() {
                        const allTargetBlocks = document.querySelectorAll(targetSelectors);
                
                        allTargetBlocks.forEach(block => {
                            const parentHeight = block.offsetHeight;
                            const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
                
                            let childrenHeight = 0;
                            childBlocks.forEach(child => {
                                if (child.parentElement.closest(targetSelectors) === block) {
                                    childrenHeight += child.offsetHeight;
                                }
                            });
                
                            const nodeOnlyHeight = parentHeight - childrenHeight;
                
                            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                            // 【変更点 2】描画条件に「末端ノードではないこと」を追加
                            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                            // 変更前: if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD)
                            if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD && !isLeafNode(block)) {
                                // 条件を満たす場合 (高さが閾値以上 かつ 親ノードである)
                                const lineHeight = Math.max(0, nodeOnlyHeight - 15);
                                block.style.setProperty('--vertical-line-display', 'block');
                                block.style.setProperty('--vertical-line-height', `${lineHeight}px`);
                            } else {
                                // 条件を満たさない場合 (高さが足りない、または末端ノードである)
                                block.style.setProperty('--vertical-line-display', 'none');
                                block.style.removeProperty('--vertical-line-height');
                            }
                        });
                    }
                
                    /**
                     * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                     */
                    function debounce(func, wait) {
                        let timeout;
                        return function executedFunction(...args) {
                            const later = () => {
                                clearTimeout(timeout);
                                func(...args);
                            };
                            clearTimeout(timeout);
                            timeout = setTimeout(later, wait);
                        };
                    }
                
                    const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
                
                    // =================================================================
                    // ステップ3: DOMの変更を監視し、処理をトリガーする
                    // =================================================================
                    const initObserver = new MutationObserver((mutations, obs) => {
                        const notionScroller = document.querySelector('.notion-frame .notion-scroller');
                        if (notionScroller) {
                            console.log('Conditional Vertical Lines (Leaf Excluded): Notion content area found. Starting observation.');
                            checkAndApplyStyles();
                            const mainObserver = new MutationObserver(() => {
                                debouncedCheck();
                            });
                            mainObserver.observe(notionScroller, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                characterData: true
                            });
                            obs.disconnect();
                        }
                    });
                
                    initObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                
                })();
                ```
                
            - 03
                
                ```jsx
                拡張機能α'は､拡張機能αに､拡張機能Aと拡張機能A'の差分のみを取り込んだものである｡
                {拡張機能A'}と{拡張機能B}の統合版である{拡張機能α'}を作成したい｡
                
                すごく超詳細に分析し､修正して､コードの変更点のみ出力｡
                変更点はピンポイントに出力し､中身を省略しないこと｡
                
                # 出力形式
                
                ## 変更点1
                ### 修正前
                ```
                ```
                ### 修正後
                ```
                ```
                
                ## 変更点2
                ### 修正前
                ```
                ```
                ### 修正後
                ```
                ```
                
                …続く
                ```
                
    - 結果
        - 01
            
            ```jsx
            // ==UserScript==
            // @name         Notion Enhanced Tree (Leaf Excluded)
            // @namespace    http://tampermonkey.net/
            // @version      2.0
            // @description  Notionのリストブロックにツリー線を描画し、さらに「子を持つ親ノード」で、かつノード単体の高さが50px以上のものに追加の垂直線を描画します。
            // @author       Your Name (AI Assisted)
            // @match        https://www.notion.so/*
            // @grant        GM_addStyle
            // @run-at       document-start
            // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
            // ==/UserScript==
            
            (function() {
                'use strict';
            
                // --- 設定項目 ---
                const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに追加線を描画
                const DEBOUNCE_DELAY = 1000;        // DOM変更後の再計算までの待機時間(ms)
            
                // =================================================================
                // ステップ1: 2つの機能を統合したCSSを注入
                // =================================================================
                const css = `
                    /* --- レイヤー1: ベースとなるツリー線 (拡張機能Bベース) --- */
            
                    /* 1. 基本設定：対象ブロックに position: relative と 背景描画の準備 を設定 */
                    .notion-bulleted_list-block,
                    .notion-numbered_list-block,
                    .notion-to_do-block,
                    .notion-toggle-block {
                        position: relative;
                        /* --- レイヤー2: 条件付き線の描画準備 (デフォルトでは非表示) --- */
                        background-image: var(--conditional-line-image);
                        background-repeat: no-repeat;
                        background-position: 13.5px var(--conditional-line-top, 15px);
                        background-size: 1px var(--conditional-line-height, 0);
                    }
            
                    /* 2. 線の描画：ネストされたリストブロックを対象とする */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        content: '';
                        position: absolute;
                        background-color: #dcdcdc;
                        z-index: 0;
                        pointer-events: none;
                    }
            
                    /* 3. 水平線 (-) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                        top: 15px;
                        left: -14px;
                        width: 14px;
                        height: 1px;
                    }
            
                    /* 4. 垂直線 (|) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        top: 0;
                        bottom: 0;
                        left: -14px;
                        width: 1px;
                    }
            
                    /* 5. 最後の要素の垂直線を短くして └ の角を作る */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                        height: 15px;
                    }
            
                    /* 6. 末端ノードの線を非表示にする */
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::before,
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::after {
                        display: none;
                    }
            
                    /* --- ダークモード対応 --- */
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        background-color: #4a4a4a;
                    }
                `;
                GM_addStyle(css);
            
                // =================================================================
                // ステップ2: コアとなる動的ロジック (拡張機能A'ベース)
                // =================================================================
            
                const targetSelectors = [
                    '.notion-to_do-block',
                    '.notion-toggle-block',
                    '.notion-bulleted_list-block',
                    '.notion-numbered_list-block'
                ].join(', ');
            
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // 【統合の核心 1】拡張機能A'から末端ノード判定ロジックを移植
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                /**
                 * ブロックが末端ノード（Leaf Node）かどうかを判定する関数
                 * @param {HTMLElement} block - 判定対象のブロック要素
                 * @returns {boolean} - 末端ノードであればtrue
                 */
                function isLeafNode(block) {
                    // NotionのDOM構造上、子ブロックは `div > div > .notion-selectable` の親要素として存在
                    const childContainer = block.querySelector(':scope > div > div');
                    if (!childContainer) return true;
            
                    // コンテナ内に、対象となるリストブロックタイプの直接の子が存在するかチェック
                    for (const child of childContainer.children) {
                        if (child.matches(targetSelectors)) {
                            return false; // 1つでも子ブロックが見つかれば親ノード
                        }
                    }
                    return true; // 子ブロックが見つからなければ末端ノード
                }
            
                /**
                 * 指定された全ブロックをチェックし、条件に応じて背景線スタイルを適用/解除する関数
                 */
                function checkAndApplyStyles() {
                    const allTargetBlocks = document.querySelectorAll(targetSelectors);
                    const isDarkMode = document.body.classList.contains('dark');
                    const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            
                    allTargetBlocks.forEach(block => {
                        const parentHeight = block.offsetHeight;
                        const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
            
                        let childrenHeight = 0;
                        childBlocks.forEach(child => {
                            // 厳密に直下の子要素の高さだけを合計する
                            if (child.parentElement.closest(targetSelectors) === block) {
                                childrenHeight += child.offsetHeight;
                            }
                        });
            
                        const nodeOnlyHeight = parentHeight - childrenHeight;
            
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        // 【統合の核心 2】描画条件に「末端ノードではないこと」を追加
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD && !isLeafNode(block)) {
                            // 条件を満たす場合: 背景画像で線を描画
                            const lineHeight = Math.max(0, nodeOnlyHeight - 17); // 高さを計算 (マイナス値防止)
            
                            block.style.setProperty('--conditional-line-image', `linear-gradient(to bottom, ${lineColor}, ${lineColor})`);
                            block.style.setProperty('--conditional-line-height', `${lineHeight}px`);
                            block.style.setProperty('--conditional-line-top', '15px');
            
                        } else {
                            // 条件を満たさない場合: 背景画像の線を削除
                            block.style.removeProperty('--conditional-line-image');
                            block.style.removeProperty('--conditional-line-height');
                            block.style.removeProperty('--conditional-line-top');
                        }
                    });
                }
            
                /**
                 * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                 */
                function debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }
            
                const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
            
                // =================================================================
                // ステップ3: DOMの変更を監視し、処理をトリガーする
                // =================================================================
            
                const initObserver = new MutationObserver((mutations, obs) => {
                    const notionScroller = document.querySelector('.notion-frame .notion-scroller');
            
                    if (notionScroller) {
                        console.log('Notion Enhanced Tree (Leaf Excluded): Notion content area found. Starting observation.');
            
                        // 初期実行
                        checkAndApplyStyles();
            
                        // メインの監視を開始
                        const mainObserver = new MutationObserver(() => {
                            debouncedCheck();
                        });
            
                        mainObserver.observe(notionScroller, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            characterData: true
                        });
            
                        // ダークモードの切り替えも監視
                        const themeObserver = new MutationObserver(() => {
                            console.log('Notion Enhanced Tree (Leaf Excluded): Theme changed. Recalculating styles.');
                            debouncedCheck();
                        });
                        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            
                        // 初期化監視は終了
                        obs.disconnect();
                    }
                });
            
                initObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            
            })();
            ```
            
        - 02
            
            ```jsx
            // ==UserScript==
            // @name         Notion Enhanced Tree (Leaf Excluded)
            // @namespac// ==UserScript==
            // @name         Notion Tree下線 (親ノード限定版)
            // @namespace    http://tampermonkey.net/
            // @version      2.0
            // @description  Notionのリストブロックにツリー線を描画し、さらに「子を持つ親ノード」で、かつ高さが50px以上のものにのみ追加の垂直線を描画します。
            // @author       Your Name (AI Assisted)
            // @match        https://www.notion.so/*
            // @grant        GM_addStyle
            // @run-at       document-start
            // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
            // ==/UserScript==
            
            (function() {
                'use strict';
            
                // --- 設定項目 ---
                const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに追加線を描画
                const DEBOUNCE_DELAY = 1000;        // DOM変更後の再計算までの待機時間(ms)
            
                // =================================================================
                // ステップ1: 2つの機能を統合したCSSを注入 (拡張機能αベース)
                // =================================================================
                const css = `
                    /* --- レイヤー1: ベースとなるツリー線 (拡張機能Bベース) --- */
                    .notion-bulleted_list-block,
                    .notion-numbered_list-block,
                    .notion-to_do-block,
                    .notion-toggle-block {
                        position: relative;
                        /* --- レイヤー2: 条件付き線の描画準備 (デフォルトでは非表示) --- */
                        background-image: var(--conditional-line-image);
                        background-repeat: no-repeat;
                        background-position: 13.5px var(--conditional-line-top, 15px);
                        background-size: 1px var(--conditional-line-height, 0);
                    }
            
                    /* 線の描画：ネストされたリストブロックを対象とする */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        content: '';
                        position: absolute;
                        background-color: #dcdcdc;
                        z-index: 0;
                        pointer-events: none;
                    }
            
                    /* 水平線 (-) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                        top: 15px;
                        left: -14px;
                        width: 14px;
                        height: 1px;
                    }
            
                    /* 垂直線 (|) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        top: 0;
                        bottom: 0;
                        left: -14px;
                        width: 1px;
                    }
            
                    /* 最後の要素の垂直線を短くして └ の角を作る */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                        height: 15px;
                    }
            
                    /* 末端ノードの線を非表示にする */
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::before,
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::after {
                        display: none;
                    }
            
                    /* ダークモード対応 */
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        background-color: #4a4a4a;
                    }
                `;
                GM_addStyle(css);
            
                // =================================================================
                // ステップ2: コアとなる動的ロジック (拡張機能αにA'のロジックを移植)
                // =================================================================
            
                const targetSelectors = [
                    '.notion-to_do-block',
                    '.notion-toggle-block',
                    '.notion-bulleted_list-block',
                    '.notion-numbered_list-block'
                ].join(', ');
            
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // 【変更点 1】拡張機能A'から末端ノード判定ロジックを完全に移植
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                /**
                 * ブロックが末端ノード（Leaf Node）かどうかを判定する関数
                 * @param {HTMLElement} block - 判定対象のブロック要素
                 * @returns {boolean} - 末端ノードであればtrue
                 */
                function isLeafNode(block) {
                    // block要素の直接の子孫であるtargetSelectorsに一致する要素を探す
                    const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
                    for (const child of childBlocks) {
                        // その要素の最も近い親リストブロックが、調査対象のblock自身であるかを確認
                        if (child.parentElement.closest(targetSelectors) === block) {
                            // ゴーストブロック（中身が空）でないことを確認
                            if (child.querySelector('.notion-selectable')) {
                                return false; // 本物の直下の子が見つかったので、親ノード
                            }
                        }
                    }
                    return true; // 本物の直下の子が見つからなかったので、末端ノード
                }
            
                /**
                 * 指定された全ブロックをチェックし、条件に応じて背景線スタイルを適用/解除する関数
                 */
                function checkAndApplyStyles() {
                    const allTargetBlocks = document.querySelectorAll(targetSelectors);
                    const isDarkMode = document.body.classList.contains('dark');
                    const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            
                    allTargetBlocks.forEach(block => {
                        const parentHeight = block.offsetHeight;
                        const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
            
                        let childrenHeight = 0;
                        childBlocks.forEach(child => {
                            if (child.parentElement.closest(targetSelectors) === block) {
                                childrenHeight += child.offsetHeight;
                            }
                        });
            
                        const nodeOnlyHeight = parentHeight - childrenHeight;
            
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        // 【変更点 2】描画条件に「末端ノードではないこと」を追加
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD && !isLeafNode(block)) {
                            // 条件を満たす場合: 背景画像で線を描画
                            const lineHeight = Math.max(0, nodeOnlyHeight - 17);
                            block.style.setProperty('--conditional-line-image', `linear-gradient(to bottom, ${lineColor}, ${lineColor})`);
                            block.style.setProperty('--conditional-line-height', `${lineHeight}px`);
                            block.style.setProperty('--conditional-line-top', '15px');
            
                        } else {
                            // 条件を満たさない場合: 背景画像の線を削除
                            block.style.removeProperty('--conditional-line-image');
                            block.style.removeProperty('--conditional-line-height');
                            block.style.removeProperty('--conditional-line-top');
                        }
                    });
                }
            
                /**
                 * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                 */
                function debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }
            
                const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
            
                // =================================================================
                // ステップ3: DOMの変更を監視し、処理をトリガーする (拡張機能αベース)
                // =================================================================
                const initObserver = new MutationObserver((mutations, obs) => {
                    const notionScroller = document.querySelector('.notion-frame .notion-scroller');
                    if (notionScroller) {
                        console.log('Notion Enhanced Tree (Parent-Only Lines): Notion content area found. Starting observation.');
                        checkAndApplyStyles();
                        const mainObserver = new MutationObserver(() => { debouncedCheck(); });
                        mainObserver.observe(notionScroller, {
                            childList: true, subtree: true, attributes: true, characterData: true
                        });
                        const themeObserver = new MutationObserver(() => {
                            console.log('Notion Enhanced Tree: Theme changed. Recalculating styles.');
                            debouncedCheck();
                        });
                        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                        obs.disconnect();
                    }
                });
            
                initObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            
            })();e    http://tampermonkey.net/
            // @version      2.0
            // @description  Notionのリストブロックにツリー線を描画し、さらに「子を持つ親ノード」で、かつノード単体の高さが50px以上のものに追加の垂直線を描画します。
            // @author       Your Name (AI Assisted)
            // @match        https://www.notion.so/*
            // @grant        GM_addStyle
            // @run-at       document-start
            // @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
            // ==/UserScript==
            
            (function() {
                'use strict';
            
                // --- 設定項目 ---
                const TARGET_HEIGHT_THRESHOLD = 50; // この高さ(px)以上のノードに追加線を描画
                const DEBOUNCE_DELAY = 1000;        // DOM変更後の再計算までの待機時間(ms)
            
                // =================================================================
                // ステップ1: 2つの機能を統合したCSSを注入
                // =================================================================
                const css = `
                    /* --- レイヤー1: ベースとなるツリー線 (拡張機能Bベース) --- */
            
                    /* 1. 基本設定：対象ブロックに position: relative と 背景描画の準備 を設定 */
                    .notion-bulleted_list-block,
                    .notion-numbered_list-block,
                    .notion-to_do-block,
                    .notion-toggle-block {
                        position: relative;
                        /* --- レイヤー2: 条件付き線の描画準備 (デフォルトでは非表示) --- */
                        background-image: var(--conditional-line-image);
                        background-repeat: no-repeat;
                        background-position: 13.5px var(--conditional-line-top, 15px);
                        background-size: 1px var(--conditional-line-height, 0);
                    }
            
                    /* 2. 線の描画：ネストされたリストブロックを対象とする */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        content: '';
                        position: absolute;
                        background-color: #dcdcdc;
                        z-index: 0;
                        pointer-events: none;
                    }
            
                    /* 3. 水平線 (-) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before {
                        top: 15px;
                        left: -14px;
                        width: 14px;
                        height: 1px;
                    }
            
                    /* 4. 垂直線 (|) */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        top: 0;
                        bottom: 0;
                        left: -14px;
                        width: 1px;
                    }
            
                    /* 5. 最後の要素の垂直線を短くして └ の角を作る */
                    div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block):last-of-type::after {
                        height: 15px;
                    }
            
                    /* 6. 末端ノードの線を非表示にする */
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::before,
                    :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)
                    :is(
                        .notion-bulleted_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-numbered_list-block:not(:has(div > div > .notion-selectable)),
                        .notion-to_do-block:not(:has(div > div > .notion-selectable)),
                        .notion-toggle-block[aria-expanded="true"]:not(:has(div > div > .notion-selectable))
                    )::after {
                        display: none;
                    }
            
                    /* --- ダークモード対応 --- */
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::before,
                    body.dark div[data-block-id] :is(.notion-bulleted_list-block, .notion-numbered_list-block, .notion-to_do-block, .notion-toggle-block)::after {
                        background-color: #4a4a4a;
                    }
                `;
                GM_addStyle(css);
            
                // =================================================================
                // ステップ2: コアとなる動的ロジック (拡張機能A'ベース)
                // =================================================================
            
                const targetSelectors = [
                    '.notion-to_do-block',
                    '.notion-toggle-block',
                    '.notion-bulleted_list-block',
                    '.notion-numbered_list-block'
                ].join(', ');
            
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // 【統合の核心 1】拡張機能A'から末端ノード判定ロジックを移植
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                /**
                 * ブロックが末端ノード（Leaf Node）かどうかを判定する関数
                 * @param {HTMLElement} block - 判定対象のブロック要素
                 * @returns {boolean} - 末端ノードであればtrue
                 */
                function isLeafNode(block) {
                    // NotionのDOM構造上、子ブロックは `div > div > .notion-selectable` の親要素として存在
                    const childContainer = block.querySelector(':scope > div > div');
                    if (!childContainer) return true;
            
                    // コンテナ内に、対象となるリストブロックタイプの直接の子が存在するかチェック
                    for (const child of childContainer.children) {
                        if (child.matches(targetSelectors)) {
                            return false; // 1つでも子ブロックが見つかれば親ノード
                        }
                    }
                    return true; // 子ブロックが見つからなければ末端ノード
                }
            
                /**
                 * 指定された全ブロックをチェックし、条件に応じて背景線スタイルを適用/解除する関数
                 */
                function checkAndApplyStyles() {
                    const allTargetBlocks = document.querySelectorAll(targetSelectors);
                    const isDarkMode = document.body.classList.contains('dark');
                    const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            
                    allTargetBlocks.forEach(block => {
                        const parentHeight = block.offsetHeight;
                        const childBlocks = block.querySelectorAll(`:scope > div ${targetSelectors}`);
            
                        let childrenHeight = 0;
                        childBlocks.forEach(child => {
                            // 厳密に直下の子要素の高さだけを合計する
                            if (child.parentElement.closest(targetSelectors) === block) {
                                childrenHeight += child.offsetHeight;
                            }
                        });
            
                        const nodeOnlyHeight = parentHeight - childrenHeight;
            
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        // 【統合の核心 2】描画条件に「末端ノードではないこと」を追加
                        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                        if (nodeOnlyHeight >= TARGET_HEIGHT_THRESHOLD && !isLeafNode(block)) {
                            // 条件を満たす場合: 背景画像で線を描画
                            const lineHeight = Math.max(0, nodeOnlyHeight - 17); // 高さを計算 (マイナス値防止)
            
                            block.style.setProperty('--conditional-line-image', `linear-gradient(to bottom, ${lineColor}, ${lineColor})`);
                            block.style.setProperty('--conditional-line-height', `${lineHeight}px`);
                            block.style.setProperty('--conditional-line-top', '15px');
            
                        } else {
                            // 条件を満たさない場合: 背景画像の線を削除
                            block.style.removeProperty('--conditional-line-image');
                            block.style.removeProperty('--conditional-line-height');
                            block.style.removeProperty('--conditional-line-top');
                        }
                    });
                }
            
                /**
                 * 関数が連続で呼び出された際に、最後の呼び出しから指定時間後に一度だけ実行するデバウンス関数
                 */
                function debounce(func, wait) {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                }
            
                const debouncedCheck = debounce(checkAndApplyStyles, DEBOUNCE_DELAY);
            
                // =================================================================
                // ステップ3: DOMの変更を監視し、処理をトリガーする
                // =================================================================
            
                const initObserver = new MutationObserver((mutations, obs) => {
                    const notionScroller = document.querySelector('.notion-frame .notion-scroller');
            
                    if (notionScroller) {
                        console.log('Notion Enhanced Tree (Leaf Excluded): Notion content area found. Starting observation.');
            
                        // 初期実行
                        checkAndApplyStyles();
            
                        // メインの監視を開始
                        const mainObserver = new MutationObserver(() => {
                            debouncedCheck();
                        });
            
                        mainObserver.observe(notionScroller, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            characterData: true
                        });
            
                        // ダークモードの切り替えも監視
                        const themeObserver = new MutationObserver(() => {
                            console.log('Notion Enhanced Tree (Leaf Excluded): Theme changed. Recalculating styles.');
                            debouncedCheck();
                        });
                        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            
                        // 初期化監視は終了
                        obs.disconnect();
                    }
                });
            
                initObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            
            })();
            ```

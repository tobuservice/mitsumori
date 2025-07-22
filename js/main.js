'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // --- グローバル変数 ---
    window.pdfGenerationTimeout = null;
    window.pdfTimeoutValue = DEFAULT_TIMEOUT; // DEFAULT_TIMEOUTはstorage.jsで定義想定
    window.pdfGenerationCancelled = false;
    window.currentTotalCost = 0; // 原価合計
    window.currentItems = []; // 明細データ
    window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    window.storageAvailable = false;
    window.isDebugMode = false;

    // --- 要素の取得 ---
    window.estimateForm = document.getElementById('estimateForm');
    window.estimateResult = document.getElementById('estimateResult');
    window.itemTableBody = document.getElementById('itemTableBody');
    window.addRowBtn = document.getElementById('addRowBtn');
    window.subtotalElement = document.getElementById('subtotal');
    window.taxElement = document.getElementById('tax');
    window.totalElement = document.getElementById('total');
    window.calculateBtn = document.getElementById('calculateBtn');
    window.previewBtn = document.getElementById('previewBtn');
    window.downloadBtn = document.getElementById('downloadBtn');
    window.printBtn = document.getElementById('printBtn');
    window.tabs = document.querySelectorAll('.tab');
        console.log(`[DEBUG] main.js: tabs に ${tabs.length} 個の要素が見つかりました。`); // ← 追加: tabs取得確認
        tabs.forEach((tab, index) => {
            if (tab && tab.dataset) { // tab と tab.dataset の存在を確認
                console.log(`[DEBUG] main.js: Tab ${index}: data-tab="${tab.dataset.tab}", text="${tab.textContent}"`); // ← 追加
            } else {
                console.log(`[DEBUG] main.js: Tab ${index} は不正な要素です。`); // ← 追加
            }
        });
    window.tabContents = document.querySelectorAll('.tab-content');
    window.previewContainer = document.getElementById('previewContainer');
    window.previewButtons = document.getElementById('previewButtons');
    window.previewDownloadBtn = document.getElementById('previewDownloadBtn');
    window.previewPrintBtn = document.getElementById('previewPrintBtn');
    window.companySettingsForm = document.getElementById('companySettingsForm');
    window.companyLogoInput = document.getElementById('companyLogo');
    window.companyLogoPreview = document.getElementById('companyLogoPreview');
    window.removeLogoBtn = document.getElementById('removeLogoBtn');
    window.companyStampInput = document.getElementById('companyStamp');
    window.companyStampPreview = document.getElementById('companyStampPreview');
    window.removeStampBtn = document.getElementById('removeStampBtn');
    window.pdfContent = document.getElementById('pdfContent');
    window.pdfEstimateSheet = document.getElementById('pdfEstimateSheet');
    window.loadingSpinner = document.getElementById('loadingSpinner');
    window.loadingSpinnerText = loadingSpinner.querySelector('.spinner-text');
    window.spinnerActions = document.getElementById('spinnerActions');
    window.cancelPdfBtn = document.getElementById('cancelPdfBtn');
    window.alternativePdfBtn = document.getElementById('alternativePdfBtn');
    window.debugModeCheckbox = document.getElementById('debugMode');
    window.debugPanel = document.getElementById('debugPanel');
    window.debugLogs = document.getElementById('debugLogs');
    window.pdfTimeoutInput = document.getElementById('pdfTimeout');
    window.storageWarning = document.getElementById('storageWarning');
    window.clearStorageBtn = document.getElementById('clearStorageBtn');

    // --- 初期化処理 ---
    initialize();

    function initialize() {
        // Copyright年の設定
        document.getElementById('copyrightYear').textContent = new Date().getFullYear();

        // LocalStorageが使用可能かチェック
        checkStorage(); // storage.jsの関数

        // 設定をロード
        loadSettings(); // storage.jsの関数

        // デバッグパネルの初期表示設定
        debugPanel.style.display = isDebugMode ? 'block' : 'none';
        debugModeCheckbox.checked = isDebugMode;

        // PDFタイムアウト値の初期設定
        pdfTimeoutInput.value = pdfTimeoutValue;

        // 会社情報をフォームに反映
        loadCompanyInfo(); // storage.jsの関数

        // イベントリスナーを設定
        setupEventListeners();

        // 現在の日付を見積日フィールドに設定
        document.getElementById('estimateDate').valueAsDate = new Date();

        // 初期明細行の計算を実行
        updateAmounts(); // calculation.jsの関数

        // 初期行の削除ボタンの状態更新
        updateDeleteButtons(); // ui.jsの関数

        // debugLog('Application initialized', 'info'); // ui.jsのdebugLogはui.js読み込み後に利用可能
        console.log('[INFO] main.js: Application initialized');
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        // タブ切り替え
        tabs.forEach(tab => {
            if (tab && tab.dataset) { // tab と tab.dataset の存在を確認
                console.log(`[DEBUG] main.js: イベントリスナーをタブに設定しようとしています: ${tab.dataset.tab}`); // ← 追加
                tab.addEventListener('click', () => {
                    console.log(`[DEBUG] main.js: タブがクリックされました: ${tab.dataset.tab}`); // ← 追加
                    switchTab(tab.dataset.tab); // ui.jsの関数
                });
            }
        });
        
        // 明細行追加
        addRowBtn.addEventListener('click', addItemRow); // ui.jsの関数
        
        // 見積計算
        estimateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm()) calculateEstimate(); // calculation.jsの関数
        });
        
        // プレビュー・印刷・PDF
        previewBtn.addEventListener('click', () => switchTab('preview')); // ui.jsの関数
        downloadBtn.addEventListener('click', generatePDF); // pdf-generator.jsの関数
        printBtn.addEventListener('click', printEstimate); // pdf-generator.jsの関数
        previewDownloadBtn.addEventListener('click', generatePDF); // pdf-generator.jsの関数
        previewPrintBtn.addEventListener('click', printEstimate); // pdf-generator.jsの関数
        
        // 会社情報設定
        companySettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCompanyInfo(); // storage.jsの関数
        });
        
        // 画像アップロード
        companyLogoInput.addEventListener('change', () => 
            handleImageUpload(companyLogoInput, companyLogoPreview, removeLogoBtn)); // storage.jsの関数
        companyStampInput.addEventListener('change', () => 
            handleImageUpload(companyStampInput, companyStampPreview, removeStampBtn)); // storage.jsの関数
        
        // 画像削除
        removeLogoBtn.addEventListener('click', () => 
            removeImage(companyLogoPreview, removeLogoBtn, companyLogoInput, 'logo')); // storage.jsの関数
        removeStampBtn.addEventListener('click', () => 
            removeImage(companyStampPreview, removeStampBtn, companyStampInput, 'stamp')); // storage.jsの関数
        
        // デバッグモード
        debugModeCheckbox.addEventListener('change', function() {
            isDebugMode = this.checked;
            debugPanel.style.display = isDebugMode ? 'block' : 'none';
            if (storageAvailable) localStorage.setItem(DEBUG_KEY, isDebugMode); // DEBUG_KEYはstorage.jsで定義
            if (isDebugMode) console.log('[WARN] main.js: Debug mode enabled.'); // debugLogが使えるか不明なためconsole.log
            else console.log('[INFO] main.js: Debug mode disabled.');
        });
        
        // PDF生成タイムアウト
        pdfTimeoutInput.addEventListener('change', function() {
            let value = parseInt(this.value, 10);
            if (isNaN(value) || value < 5 || value > 120) {
                value = DEFAULT_TIMEOUT; // DEFAULT_TIMEOUTはstorage.jsで定義
                this.value = value;
            }
            pdfTimeoutValue = value;
            if (storageAvailable) localStorage.setItem(TIMEOUT_KEY, pdfTimeoutValue); // TIMEOUT_KEYはstorage.jsで定義
            console.log(`[INFO] main.js: PDF timeout set to ${pdfTimeoutValue} seconds.`);
        });
        
        // 設定リセット
        clearStorageBtn.addEventListener('click', clearAllSettings); // storage.jsの関数
        
        // PDFキャンセル/閉じる
        cancelPdfBtn.addEventListener('click', function() {
            if (cancelPdfBtn.textContent === '閉じる') {
                hideLoadingSpinner(); // ui.jsの関数
            } else {
                pdfGenerationCancelled = true;
                hideLoadingSpinner(); // ui.jsの関数
                console.log('[WARN] main.js: PDF generation cancelled by user.');
            }
        });
        
        // 代替手段（印刷）
        alternativePdfBtn.addEventListener('click', function() {
            hideLoadingSpinner(); // ui.jsの関数
            printEstimate(); // pdf-generator.jsの関数
            console.log('[INFO] main.js: Alternative action (print) triggered.');
        });
        
        // 明細行の金額計算イベント（初期行用）
        const initialInputs = itemTableBody.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]');
        console.log(`[DEBUG] main.js: 初期入力欄 ${initialInputs.length} 件にイベントリスナーを設定します。`); // ← 追加
        initialInputs.forEach(input => {
            input.addEventListener('input', updateAmounts); // calculation.jsの関数
            console.log(`[DEBUG] main.js: リスナー設定: ${input.name}, 現在値: ${input.value}`); // ← 追加
        });
    }
});

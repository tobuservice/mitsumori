'use strict';

// --- UI関連の関数 ---
function switchTab(targetTabId) {
    console.log(`[DEBUG] ui.js: switchTab が呼び出されました。 targetTabId: ${targetTabId}`); // ← 追加

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeTab = document.querySelector(`.tab[data-tab="${targetTabId}"]`);
    if (activeTab) {
        console.log(`[DEBUG] ui.js: activeTab (${targetTabId}) が見つかりました。`); // ← 追加
    } else {
        console.error(`[ERROR] ui.js: activeTab (${targetTabId}) が見つかりません。セレクタ: .tab[data-tab="${targetTabId}"]`); // ← 追加
    }

    const activeContent = document.getElementById(targetTabId + 'Tab');
    if (activeContent) {
        console.log(`[DEBUG] ui.js: activeContent (${targetTabId}Tab) が見つかりました。`); // ← 追加
    } else {
        console.error(`[ERROR] ui.js: activeContent (${targetTabId}Tab) が見つかりません。ID: ${targetTabId}Tab`); // ← 追加
    }

    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
        // debugLog(`Switched to tab: ${targetTabId}`, 'info'); // debugLogは下記で定義
        console.log(`[INFO] ui.js: Switched to tab: ${targetTabId}`);
        window.scrollTo(0, 0);

        if (targetTabId === 'preview' && calculateBtn.dataset.calculated === 'true') {
            updatePreview();
        }
    } else {
        console.error(`[ERROR] ui.js: Tab or content not found for id: ${targetTabId}`);
        // debugLog(`Tab switch failed: Could not find elements for ${targetTabId}`, 'error');
    }
}

function addItemRow() {
    const rowCount = itemTableBody.rows.length;
    const row = itemTableBody.insertRow();

    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td><input type="text" name="description[]" placeholder="商品/サービス名" required></td>
        <td><input type="number" name="quantity[]" value="1" min="1" step="0.01" required></td>
        <td>
            <select name="unit[]">
                <option value="式">式</option><option value="基">基</option><option value="組">組</option>
                <option value="枚">枚</option><option value="本">本</option><option value="個">個</option>
                <option value="台">台</option><option value="m">m</option><option value="m2">m2</option>
                <option value="m3">m3</option><option value="kg">kg</option><option value="t">t</option>
                <option value="箇所">箇所</option><option value="時間">時間</option><option value="日">日</option>
                <option value="ヶ月">ヶ月</option>
            </select>
        </td>
        <td><input type="number" name="cost[]" placeholder="原価" step="any" required></td>
        <td><input type="number" name="markupRate[]" value="1.0" step="0.01" required></td>
        <td><input type="text" name="amount[]" readonly></td>
        <td><button type="button" class="delete-btn">×</button></td>
    `;

    row.querySelector('.delete-btn').addEventListener('click', function() {
        if (itemTableBody.rows.length > 1) {
            row.remove();
            renumberRows();
            updateAmounts(); // calculation.js
            updateDeleteButtons();
        }
    });

    row.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]')
        .forEach(input => input.addEventListener('input', updateAmounts)); // calculation.js

    updateDeleteButtons();
    row.querySelector('input[name="description[]"]').focus();
    debugLog('Item row added', 'info');
}

function renumberRows() {
    const rows = itemTableBody.rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].cells[0].textContent = i + 1;
    }
}

function updateDeleteButtons() {
    const rows = itemTableBody.rows;
    const canDelete = rows.length > 1;
    rows.forEach(row => {
        const btn = row.querySelector('.delete-btn');
        if(btn) btn.disabled = !canDelete;
    });
}

function updatePreview() {
    if (!calculateBtn.dataset.calculated) {
        previewContainer.innerHTML = '<p>見積入力タブで情報を入力し、「見積を計算する」ボタンをクリックしてください。</p>';
        previewButtons.classList.add('hidden');
        return;
    }
    try {
        previewContainer.innerHTML = generateEstimateHTML(); // pdf-generator.js
        previewButtons.classList.remove('hidden');
        debugLog('Preview updated', 'info');
    } catch (e) {
        previewContainer.innerHTML = `<div class="alert alert-danger">プレビューの生成中にエラーが発生しました: ${e.message}</div>`;
        previewButtons.classList.add('hidden');
        debugLog('Preview generation error: ' + e.message, 'error');
    }
}

function showLoadingSpinner(message = '処理中...') {
    loadingSpinnerText.textContent = message;
    loadingSpinner.style.display = 'flex';
    spinnerActions.style.display = 'none';
    cancelPdfBtn.textContent = 'キャンセル';
    alternativePdfBtn.style.display = 'none';
    setupLoadingTimeout();
}

function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none';
    spinnerActions.style.display = 'none';
    if (pdfGenerationTimeout) { clearTimeout(pdfGenerationTimeout); pdfGenerationTimeout = null; }
}

function setupLoadingTimeout() {
    if (pdfGenerationTimeout) clearTimeout(pdfGenerationTimeout);

    const actionTimer = setTimeout(() => {
        if (loadingSpinner.style.display === 'flex' && !pdfGenerationCancelled) {
            spinnerActions.style.display = 'flex';
            alternativePdfBtn.style.display = 'inline-block';
            debugLog('Processing is taking longer than 8 seconds.', 'warn');
        }
    }, 8000); // 8秒で代替アクション表示

    pdfGenerationTimeout = setTimeout(() => {
        clearTimeout(actionTimer);
        if (loadingSpinner.style.display === 'flex' && !pdfGenerationCancelled) {
            hideLoadingSpinner();
            alert(`処理がタイムアウトしました (${pdfTimeoutValue}秒)。\nネットワーク接続を確認するか、設定でタイムアウト時間を延長してください。\n問題が解決しない場合は、ブラウザの印刷機能をお試しください。`);
            debugLog('Processing timed out.', 'error');
        }
    }, pdfTimeoutValue * 1000); // storage.jsで設定されたタイムアウト値
}

function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}][${type.toUpperCase()}] ${message}`);

    if (isDebugMode && debugPanel && debugPanel.style.display !== 'none') {
        const logElement = document.createElement('div');
        logElement.className = `debug-log debug-${type}`;
        logElement.textContent = `[${timestamp}] ${message}`;
        if (debugLogs) { // debugLogs要素の存在を確認
            debugLogs.insertBefore(logElement, debugLogs.firstChild);
            while (debugLogs.children.length > 101) { // ログ上限を100件程度に
                debugLogs.removeChild(debugLogs.lastChild);
            }
        }
    }
}

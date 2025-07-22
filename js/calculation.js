'use strict';

// --- 計算関連の関数 ---
function updateAmounts() {
    console.log('[DEBUG] calculation.js: updateAmounts 関数が呼び出されました。'); // ← 追加

    if (typeof itemTableBody === 'undefined' || itemTableBody === null) {
        console.error('[ERROR] calculation.js: itemTableBody が未定義またはnullです in updateAmounts'); // ← 追加
        return;
    }
    const rows = itemTableBody.rows;
    if (!rows) {
        console.error('[ERROR] calculation.js: itemTableBody.rows が見つかりません in updateAmounts'); // ← 追加
        return;
    }
    console.log(`[DEBUG] calculation.js: ${rows.length} 行を処理します in updateAmounts.`); // ← 追加
    let subtotal = 0;

    for (let i = 0; i < rows.length; i++) {
        const qtyInput = rows[i].querySelector('input[name="quantity[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');
        const amountInput = rows[i].querySelector('input[name="amount[]"]');

        if (!qtyInput || !costInput || !markupRateInput || !amountInput) {
            console.error(`[ERROR] calculation.js: 入力フィールドが見つかりません 行 ${i}`); // ← 追加
            continue;
        }

        console.log(`[DEBUG] calculation.js: 行 ${i}: 原価入力値="${costInput.value}", 掛け率入力値="${markupRateInput.value}"`); // ← 追加
        const qty = parseFloat(qtyInput.value) || 0;
        const cost = parseFloat(costInput.value) || 0;
        const markupRate = parseFloat(markupRateInput.value) || 0;

        const amount = qty * cost * markupRate;
        console.log(`[DEBUG] calculation.js: 行 ${i}: qty=${qty}, cost=${cost}, markupRate=${markupRate}, 計算された金額=${amount}`); // ← 追加

        amountInput.value = formatCurrency(amount);
        subtotal += amount;
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    if (typeof subtotalElement === 'undefined' || subtotalElement === null ||
        typeof taxElement === 'undefined' || taxElement === null ||
        typeof totalElement === 'undefined' || totalElement === null) {
        console.error('[ERROR] calculation.js: 小計・税・合計の表示用Elementが見つかりません'); // ← 追加
        return;
    }

    subtotalElement.textContent = formatCurrency(Math.round(subtotal));
    taxElement.textContent = formatCurrency(Math.round(tax));
    totalElement.textContent = formatCurrency(Math.round(total));
    console.log(`[DEBUG] calculation.js: 合計更新: 小計=${formatCurrency(Math.round(subtotal))}, 税=${formatCurrency(Math.round(tax))}, 総計=${formatCurrency(Math.round(total))}`); // ← 追加
}

function calculateEstimate() {
    currentItems = [];
    const rows = itemTableBody.rows;
    let totalCostSum = 0;
    let estimateSubtotal = 0;

    for (let i = 0; i < rows.length; i++) {
        const description = rows[i].querySelector('input[name="description[]"]').value.trim();
        const quantity = parseFloat(rows[i].querySelector('input[name="quantity[]"]').value) || 0;
        const unit = rows[i].querySelector('select[name="unit[]"]').value;
        const cost = parseFloat(rows[i].querySelector('input[name="cost[]"]').value) || 0;
        const markupRate = parseFloat(rows[i].querySelector('input[name="markupRate[]"]').value) || 0;

        const itemAmount = quantity * cost * markupRate;
        const itemCostSum = quantity * cost;

        currentItems.push({ no: i + 1, description, quantity, unit, cost, markupRate, amount: itemAmount });
        totalCostSum += itemCostSum;
        estimateSubtotal += itemAmount;
    }
    currentTotalCost = totalCostSum;

    const tax = estimateSubtotal * 0.1;
    const total = estimateSubtotal + tax;

    let grossMarginPercent = 0;
    if (estimateSubtotal !== 0) {
        grossMarginPercent = ((estimateSubtotal - currentTotalCost) / Math.abs(estimateSubtotal)) * 100;
    } else if (currentTotalCost === 0) {
        grossMarginPercent = 0;
    } else {
        grossMarginPercent = NaN;
    }

    document.getElementById('resultSubtotal').textContent = formatCurrency(Math.round(estimateSubtotal));
    document.getElementById('resultTotal').textContent = formatCurrency(Math.round(total));
    document.getElementById('resultTotalCost').textContent = formatCurrency(Math.round(currentTotalCost));

    const grossMarginElement = document.getElementById('resultGrossMarginPercent');
    if (isNaN(grossMarginPercent)) {
        grossMarginElement.textContent = '---';
    } else if (!isFinite(grossMarginPercent)) {
        grossMarginElement.textContent = (grossMarginPercent > 0 ? '+' : '-') + '∞ %';
    } else {
        grossMarginElement.textContent = `${grossMarginPercent.toFixed(1)}%`;
    }
    // ui.jsのdebugLogが使えるか不明なため、重要な箇所はconsole.logも検討
    // debugLog(`Estimate calculated. Raw Total Cost: ${currentTotalCost}, Raw Estimate Subtotal: ${estimateSubtotal}, Gross Margin: ${isNaN(grossMarginPercent) ? 'N/A' : grossMarginPercent.toFixed(1)}%`, 'info');
    console.log(`[INFO] calculation.js: Estimate calculated. Total Cost: ${currentTotalCost}, Subtotal: ${estimateSubtotal}`);


    estimateResult.classList.remove('hidden');
    estimateResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    calculateBtn.dataset.calculated = 'true';
}

function validateForm() {
    const client = document.getElementById('client').value.trim();
    const project = document.getElementById('project').value.trim();
    if (!client) { alert('見積提出先を入力してください'); document.getElementById('client').focus(); return false; }
    if (!project) { alert('件名を入力してください'); document.getElementById('project').focus(); return false; }

    const rows = itemTableBody.rows;
    if (rows.length === 0) { alert('明細行を1行以上入力してください'); return false;}

    for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 1;
        const descriptionInput = rows[i].querySelector('input[name="description[]"]');
        const quantityInput = rows[i].querySelector('input[name="quantity[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');

        const description = descriptionInput.value.trim();
        const quantity = quantityInput.value;
        const cost = costInput.value;
        const markupRate = markupRateInput.value;

        if (!description) { alert(`${rowNum}行目の摘要を入力してください`); descriptionInput.focus(); return false; }
        if (quantity === '' || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
            alert(`${rowNum}行目の数量を正しく入力してください (0より大きい数値)`); quantityInput.focus(); return false;
        }
        if (cost === '' || isNaN(parseFloat(cost))) {
            alert(`${rowNum}行目の原価を数値で入力してください`); costInput.focus(); return false;
        }
        if (markupRate === '' || isNaN(parseFloat(markupRate))) {
            alert(`${rowNum}行目の掛け率を数値で入力してください`); markupRateInput.focus(); return false;
        }
        if (parseFloat(markupRate) <= 0 && cost !== '0' && parseFloat(cost) !== 0) {
            if (!confirm(`${rowNum}行目の掛け率が0以下です。この明細の金額が0またはマイナスになりますが、よろしいですか？`)) {
                markupRateInput.focus(); return false;
            }
        }
        if (parseFloat(cost) < 0) {
            if (!confirm(`${rowNum}行目の原価がマイナスです。よろしいですか？`)) {
                costInput.focus(); return false;
            }
        }
    }
    return true;
}

function formatCurrency(amount, withSymbol = true) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return withSymbol ? '¥---' : '---';
    }
    const num = Math.round(amount);
    const formattedAmount = num.toLocaleString();
    return withSymbol ? `¥${formattedAmount}` : formattedAmount;
}

function formatDateJP(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '';
    }
}

function generateEstimateNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0'); // 修正: 重複定義と全角文字削除
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `Q-${year}${month}${day}-${random}`;
}

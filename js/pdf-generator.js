'use strict';

// --- PDF生成関連の関数 ---
function generateEstimateHTML() {
    try {
        const client = document.getElementById('client').value;
        const project = document.getElementById('project').value;
        let estimateNumber = document.getElementById('estimateNumber').value.trim();
        if (!estimateNumber) {
            estimateNumber = generateEstimateNumber(); // calculation.js
            document.getElementById('estimateNumber').value = estimateNumber;
        }
        const estimateDate = document.getElementById('estimateDate').value;
        const formattedDate = formatDateJP(estimateDate); // calculation.js

        const expiryDays = parseInt(document.getElementById('expiryDays').value) || 30;
        let formattedExpiryDate = '';
        if(estimateDate) {
            const expiryDate = new Date(estimateDate);
            if (!isNaN(expiryDate.getTime())) {
                expiryDate.setDate(expiryDate.getDate() + expiryDays);
                formattedExpiryDate = formatDateJP(expiryDate.toISOString().split('T')[0]); // calculation.js
            }
        }

        const notes = document.getElementById('notes').value;
        const noteItems = notes.split('\n').filter(note => note.trim() !== '');

        let estimateSubtotal = 0;
        currentItems.forEach(item => { estimateSubtotal += item.amount; });
        const roundedSubtotal = Math.round(estimateSubtotal);
        const tax = Math.round(roundedSubtotal * 0.1);
        const total = roundedSubtotal + tax;

        let itemsHTML = '';
        currentItems.forEach(item => {
            const displayPrice = (item.cost || 0) * (item.markupRate || 0);
            itemsHTML += `
                <tr>
                    <td style="text-align: center;">${item.no}</td>
                    <td class="long-text">${item.description}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: center;">${item.unit}</td>
                    <td style="text-align: right;">${formatCurrency(displayPrice, false)}</td>
                    <td style="text-align: right;">${formatCurrency(Math.round(item.amount), false)}</td>
                </tr>
            `;
        });

        let notesHTML = '';
        if (noteItems.length > 0) {
            notesHTML = `<div class="estimate-notes"><div class="notes-title">備考</div>${noteItems.map(note => `<div class="note-item">${note.startsWith('※') ? note : '※ ' + note}</div>`).join('')}</div>`;
        }

        const html = `
            <div class="estimate-sheet">
                <div class="estimate-header">
                    <div class="estimate-title">御見積書</div>
                    <div class="client-info"><div class="client-name">${client} 御中</div></div>
                    <div class="company-info">
                        ${companyInfo.name ? `<div>${companyInfo.name}</div>` : ''}
                        ${companyInfo.postal ? `<div>〒${companyInfo.postal}</div>` : ''}
                        ${companyInfo.address ? `<div>${companyInfo.address}</div>` : ''}
                        ${companyInfo.phone ? `<div>TEL: ${companyInfo.phone}</div>` : ''}
                        ${companyInfo.fax ? `<div>FAX: ${companyInfo.fax}</div>` : ''}
                        ${companyInfo.stamp ? `<img src="${companyInfo.stamp}" class="company-stamp" alt="印影" style="position: absolute; top: -15px; right: -5px;">` : ''}
                    </div>
                </div>
                <div style="margin-bottom: 10px;">下記の通り御見積もり申し上げます。</div>
                <div class="estimate-info">
                    <table style="width: 100%;"><tr><td style="width: 15%;">件名</td><td style="width: 85%;">${project}</td></tr></table>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div style="flex: 1;"></div>
                    <div style="width: 220px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 3px 0;">見積日</td><td style="padding: 3px 0;">${formattedDate}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 3px 0;">見積番号</td><td style="padding: 3px 0;">${estimateNumber}</td></tr>
                            <tr><td style="padding: 3px 0;">有効期限</td><td style="padding: 3px 0;">${formattedExpiryDate}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="estimate-amount">見積金額 ${formatCurrency(total)}</div>
                <table class="estimate-detail">
                    <thead><tr><th style="width: 5%;">No.</th><th style="width: 45%;">摘要</th><th style="width: 10%;">数量</th><th style="width: 10%;">単位</th><th style="width: 15%;">単価</th><th style="width: 15%;">金額</th></tr></thead>
                    <tbody>${itemsHTML}</tbody>
                </table>
                <div style="width: 100%; display: flex; justify-content: flex-end;">
                    <table class="estimate-totals">
                        <tr><td>小計</td><td>${formatCurrency(roundedSubtotal)}</td></tr>
                        <tr><td>消費税</td><td>${formatCurrency(tax)}</td></tr>
                        <tr><td>合計</td><td>${formatCurrency(total)}</td></tr>
                    </table>
                </div>
                ${notesHTML}
            </div>`;
        return html;
    } catch (e) {
        // debugLog('Error generating estimate HTML: ' + e.message, 'error'); // ui.js
        console.error('[ERROR] pdf-generator.js: Error generating estimate HTML:', e);
        return `<div class="alert alert-danger">見積書HTMLの生成中にエラーが発生しました: ${e.message}</div>`;
    }
}

async function generatePDF() {
    if (!calculateBtn.dataset.calculated) { alert('先に見積を計算してください。'); return; }
    pdfGenerationCancelled = false;
    showLoadingSpinner('PDFを生成中...'); // ui.js

    try {
        pdfEstimateSheet.innerHTML = generateEstimateHTML();
        // debugLog('PDF estimate sheet HTML generated', 'info'); // ui.js
        console.log('[INFO] pdf-generator.js: PDF estimate sheet HTML generated');


        const headerElement = pdfEstimateSheet.querySelector('.estimate-header');
        const companyInfoElement = pdfEstimateSheet.querySelector('.company-info');
        const existingStamp = pdfEstimateSheet.querySelector('.company-stamp'); 
        if(existingStamp) existingStamp.style.display = 'none'; 

        if (companyInfo.logo && headerElement) {
            const logoImg = new Image();
            logoImg.onload = () => console.log('[INFO] pdf-generator.js: Company logo loaded for PDF'); 
            logoImg.onerror = () => console.warn('[WARN] pdf-generator.js: Company logo failed to load for PDF'); 
            logoImg.src = companyInfo.logo;
            logoImg.className = 'company-logo';
            logoImg.style.position = 'absolute'; logoImg.style.top = '0px'; logoImg.style.right = '0px';
            const oldLogo = headerElement.querySelector('.company-logo');
            if (oldLogo) oldLogo.remove();
            headerElement.appendChild(logoImg);
        }
        if (companyInfo.stamp && companyInfoElement) {
            const stampImg = new Image();
            stampImg.onload = () => console.log('[INFO] pdf-generator.js: Company stamp loaded for PDF');
            stampImg.onerror = () => console.warn('[WARN] pdf-generator.js: Company stamp failed to load for PDF');
            stampImg.src = companyInfo.stamp;
            stampImg.className = 'company-stamp';
            stampImg.style.position = 'absolute'; stampImg.style.top = '-15px'; stampImg.style.right = '-5px';
            const oldStamp = companyInfoElement.querySelector('.company-stamp');
            if (oldStamp) oldStamp.remove();
            companyInfoElement.appendChild(stampImg); 
        }

        pdfContent.style.display = 'block';
        await new Promise(resolve => setTimeout(resolve, 500)); 

        if (pdfGenerationCancelled) throw new Error("Cancelled");

        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(pdfContent, {
            scale: 2, useCORS: true, allowTaint: false, logging: isDebugMode, 
            scrollX: 0, scrollY: 0,
            windowWidth: pdfContent.scrollWidth, windowHeight: pdfContent.scrollHeight
        });

        if (pdfGenerationCancelled) throw new Error("Cancelled");

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgProps= pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = pdfHeight;
        let position = 0;
        const margin = 10;

        pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth - margin * 2, pdfHeight);
        heightLeft -= (pageHeight - margin * 2);

        while (heightLeft > margin) { 
            position -= (pageHeight - margin*2 ); 
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position + margin , pdfWidth - margin * 2, pdfHeight);
            heightLeft -= (pageHeight - margin * 2);
            if (pdf.internal.getNumberOfPages() > 10) throw new Error("PDF pages > 10");
        }

        const clientName = document.getElementById('client').value.trim().replace(/[\\/:*?"<>|]/g, '_') || '見積書';
        const dateStr = document.getElementById('estimateDate').value.replace(/-/g, '') || formatDateJP(new Date().toISOString().split('T')[0]).replace(/年|月|日/g, ''); // calculation.js
        const fileName = `見積書_${clientName}_${dateStr}.pdf`;

        pdf.save(fileName);
        // debugLog(`PDF saved as ${fileName}`, 'info'); // ui.js
        console.log(`[INFO] pdf-generator.js: PDF saved as ${fileName}`);


    } catch (e) {
        if (e.message !== "Cancelled") {
            console.error('[ERROR] pdf-generator.js: PDF Generation Error:', e);
            // debugLog('PDF Generation Error: ' + e.message, 'error'); // ui.js
            alert('PDF生成中にエラーが発生しました。\n内容が複雑すぎるか、画像に問題がある可能性があります。\nブラウザの印刷機能で代用してください。');
            spinnerActions.style.display = 'flex';
            alternativePdfBtn.style.display = 'inline-block';
            cancelPdfBtn.textContent = '閉じる';
            pdfGenerationTimeout = null;
        } else {
            // debugLog('PDF generation cancelled.', 'warn'); // ui.js
            console.warn('[WARN] pdf-generator.js: PDF generation cancelled.');
        }
    } finally {
        if (!pdfGenerationCancelled || cancelPdfBtn.textContent === '閉じる') {
            hideLoadingSpinner(); // ui.js
        }
        pdfContent.style.display = 'none';
        cancelPdfBtn.textContent = 'キャンセル'; 
        // debugLog('PDF generation process finished or cancelled.', 'info'); // ui.js
        console.log('[INFO] pdf-generator.js: PDF generation process finished or cancelled.');
    }
}

function printEstimate() {
    if (!calculateBtn.dataset.calculated) { alert('先に見積を計算してください。'); return; }
    switchTab('preview'); // ui.js
    setTimeout(() => { window.print(); console.log('[INFO] pdf-generator.js: Print dialog invoked.'); }, 300); // ui.js
}

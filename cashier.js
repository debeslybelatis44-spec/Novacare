// Module Caisse
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cashier-patient-search')) {
        setupCashier();
    }
});

function setupCashier() {
    // Taux de change
    document.getElementById('update-exchange-rate').addEventListener('click', () => {
        const newRate = parseFloat(document.getElementById('exchange-rate').value);
        if (!newRate || newRate <= 0) {
            alert("Taux de change invalide!");
            return;
        }
        state.exchangeRate = newRate;
        alert("Taux de change mis à jour!");
    });
    
    // Recherche patient
    document.getElementById('search-cashier-patient').addEventListener('click', searchCashierPatient);
    
    // Sélection devise
    const currencyBtns = document.querySelectorAll('.payment-method-currency');
    currencyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currencyBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Sélection méthode paiement
    const paymentBtns = document.querySelectorAll('.payment-method');
    paymentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            paymentBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Calcul monnaie
    document.getElementById('amount-given').addEventListener('input', calculateChange);
    
    // Actions
    document.getElementById('mark-as-paid').addEventListener('click', markAsPaid);
    document.getElementById('print-invoice').addEventListener('click', printInvoice);
    document.getElementById('print-receipt').addEventListener('click', printReceipt);
    document.getElementById('print-general-sheet').addEventListener('click', printGeneralSheet);
    
    // Initialiser le solde du caissier s'il n'existe pas
    if (state.currentUser && state.currentUser.role === 'cashier') {
        if (!state.cashierBalances[state.currentUser.username]) {
            state.cashierBalances[state.currentUser.username] = {
                balance: 0,
                transactions: []
            };
        }
    }
}

function searchCashierPatient() {
    const search = document.getElementById('cashier-patient-search').value.toLowerCase();
    const patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    document.getElementById('cashier-patient-name').textContent = patient.fullName;
    document.getElementById('cashier-patient-id').textContent = patient.id;
    document.getElementById('cashier-patient-details').classList.remove('hidden');
    
    // Afficher les services à payer
    displayServicesToPay(patient.id);
}

function displayServicesToPay(patientId) {
    const unpaidTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.status === 'unpaid' &&
        !t.isCredit
    );
    
    const container = document.getElementById('services-to-pay-list');
    let html = '';
    let total = 0;
    
    if (unpaidTransactions.length === 0) {
        html = '<p>Aucun service à payer.</p>';
    } else {
        html = '<table class="table-container"><thead><tr><th>Service</th><th>Montant (Gdes)</th><th>Montant ($)</th><th>Sélectionner</th></tr></thead><tbody>';
        
        unpaidTransactions.forEach(transaction => {
            const amountUSD = transaction.amount / state.exchangeRate;
            total += transaction.amount;
            
            html += `
                <tr>
                    <td>${transaction.service}</td>
                    <td>${transaction.amount} Gdes</td>
                    <td>${amountUSD.toFixed(2)} $</td>
                    <td><input type="checkbox" class="service-checkbox" data-id="${transaction.id}" checked></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
    }
    
    container.innerHTML = html;
    
    const totalUSD = total / state.exchangeRate;
    document.getElementById('total-to-pay').textContent = total;
    document.getElementById('total-to-pay-usd').textContent = totalUSD.toFixed(2);
    
    // Recalculer la monnaie
    calculateChange();
}

function calculateChange() {
    const total = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
    const amountGiven = parseFloat(document.getElementById('amount-given').value) || 0;
    const change = amountGiven - total;
    
    const resultElement = document.getElementById('change-result');
    if (change < 0) {
        resultElement.textContent = `Manquant: ${Math.abs(change)} Gdes`;
        resultElement.style.color = '#dc3545';
    } else {
        resultElement.textContent = `Monnaie: ${change} Gdes`;
        resultElement.style.color = '#28a745';
    }
}

function markAsPaid() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const selectedServices = document.querySelectorAll('.service-checkbox:checked');
    
    if (selectedServices.length === 0) {
        alert("Veuillez sélectionner au moins un service à payer!");
        return;
    }
    
    const total = parseFloat(document.getElementById('total-to-pay').textContent);
    const amountGiven = parseFloat(document.getElementById('amount-given').value) || 0;
    
    if (amountGiven < total) {
        alert(`Montant donné insuffisant! Total: ${total} Gdes, Donné: ${amountGiven} Gdes`);
        return;
    }
    
    const currencyElement = document.querySelector('.payment-method-currency.active');
    const paymentMethodElement = document.querySelector('.payment-method.active');
    
    if (!currencyElement || !paymentMethodElement) {
        alert("Veuillez sélectionner une devise et une méthode de paiement!");
        return;
    }
    
    const currency = currencyElement.dataset.currency;
    const paymentMethod = paymentMethodElement.dataset.method;
    
    // Traiter chaque service sélectionné
    selectedServices.forEach(checkbox => {
        const transactionId = checkbox.dataset.id;
        const transaction = state.transactions.find(t => t.id === transactionId);
        
        if (transaction) {
            transaction.status = 'paid';
            transaction.paymentDate = new Date().toISOString().split('T')[0];
            transaction.paymentTime = new Date().toLocaleTimeString('fr-FR');
            transaction.paymentAgent = state.currentUser.username;
            transaction.paymentMethod = paymentMethod;
            transaction.paymentCurrency = currency;
            transaction.amountGiven = amountGiven;
            transaction.amountGivenInHTG = currency === 'HTG' ? amountGiven : amountGiven * state.exchangeRate;
            
            // Mettre à jour le solde du caissier
            updateCashierBalance(transaction.amount, patientId, transactionId);
            
            // Envoyer notification de paiement
            sendPaymentNotification(transaction);
        }
    });
    
    alert("Paiement effectué avec succès!");
    
    // Réinitialiser l'affichage pour retourner à la page initiale
    resetCashierInterface();
    
    // Mettre à jour les statistiques d'administration
    if (typeof updateAdminStats === 'function') updateAdminStats();
    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();
}

function resetCashierInterface() {
    // Réinitialiser tous les champs
    document.getElementById('cashier-patient-search').value = '';
    document.getElementById('cashier-patient-search').focus();
    document.getElementById('cashier-patient-details').classList.add('hidden');
    document.getElementById('amount-given').value = '';
    document.getElementById('services-to-pay-list').innerHTML = '';
    document.getElementById('total-to-pay').textContent = '0';
    document.getElementById('total-to-pay-usd').textContent = '0.00';
    document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
    document.getElementById('change-result').style.color = '#28a745';
    
    // Réinitialiser les sélections
    const currencyBtns = document.querySelectorAll('.payment-method-currency');
    currencyBtns.forEach(b => b.classList.remove('active'));
    if (currencyBtns.length > 0) currencyBtns[0].classList.add('active');
    
    const paymentBtns = document.querySelectorAll('.payment-method');
    paymentBtns.forEach(b => b.classList.remove('active'));
    if (paymentBtns.length > 0) paymentBtns[0].classList.add('active');
}

function updateCashierBalance(amount, patientId, transactionId) {
    const username = state.currentUser.username;
    
    if (!state.cashierBalances[username]) {
        state.cashierBalances[username] = {
            balance: 0,
            transactions: []
        };
    }
    
    // Ajouter au solde du caissier
    state.cashierBalances[username].balance += amount;
    
    // Enregistrer la transaction
    state.cashierBalances[username].transactions.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        type: 'payment',
        amount: amount,
        patientId: patientId,
        transactionId: transactionId
    });
    
    // Mettre à jour la caisse principale
    state.mainCash += amount;
}

function printInvoice() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const patientName = document.getElementById('cashier-patient-name').textContent;
    const total = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
    
    const selectedServices = document.querySelectorAll('.service-checkbox:checked');
    let servicesHtml = '';
    
    selectedServices.forEach(checkbox => {
        const transactionId = checkbox.dataset.id;
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
            servicesHtml += `
                <div class="receipt-item">
                    <span>${transaction.service}</span>
                    <span>${transaction.amount} Gdes</span>
                </div>
            `;
        }
    });
    
    const invoiceContent = `
        <div class="print-receipt">
            <div class="text-center">
                <h3>${document.getElementById('hospital-name-header').textContent}</h3>
                <p>${document.getElementById('hospital-address-header').textContent}</p>
                <p>Taux: 1 $ = ${state.exchangeRate} Gdes</p>
            </div>
            <hr>
            <div>
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>ID Patient:</strong> ${patientId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                <p><strong>Heure:</strong> ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            <hr>
            <h4>Facture</h4>
            ${servicesHtml}
            <hr>
            <div class="receipt-item">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${total}</strong> Gdes</span>
            </div>
            <div class="receipt-item">
                <span>Montant TTC:</span>
                <span>${total} Gdes</span>
            </div>
            <hr>
            <div class="text-center">
                <p>Merci pour votre confiance!</p>
                <p><small>Facture #${'INV' + Date.now().toString().slice(-8)}</small></p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Facture</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-receipt { width: 80mm; margin: 0 auto; }
                .text-center { text-align: center; }
                .receipt-item { display: flex; justify-content: space-between; margin: 5px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${invoiceContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function printReceipt() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const patientName = document.getElementById('cashier-patient-name').textContent;
    const total = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
    const amountGiven = parseFloat(document.getElementById('amount-given').value) || 0;
    const change = amountGiven - total;
    
    const paymentMethodElement = document.querySelector('.payment-method.active');
    const paymentMethod = paymentMethodElement ? paymentMethodElement.dataset.method : 'Non spécifié';
    
    const selectedServices = document.querySelectorAll('.service-checkbox:checked');
    let servicesHtml = '';
    
    selectedServices.forEach(checkbox => {
        const transactionId = checkbox.dataset.id;
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
            servicesHtml += `
                <div class="receipt-item">
                    <span>${transaction.service}</span>
                    <span>${transaction.amount} Gdes</span>
                </div>
            `;
        }
    });
    
    const receiptContent = `
        <div class="print-receipt">
            <div class="text-center">
                <h3>${document.getElementById('hospital-name-header').textContent}</h3>
                <p>${document.getElementById('hospital-address-header').textContent}</p>
                <p>Reçu de paiement</p>
            </div>
            <hr>
            <div>
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>ID Patient:</strong> ${patientId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                <p><strong>Heure:</strong> ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            <hr>
            <h4>Services payés</h4>
            ${servicesHtml}
            <hr>
            <div class="receipt-item">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${total}</strong> Gdes</span>
            </div>
            <div class="receipt-item">
                <span>Montant donné:</span>
                <span>${amountGiven} Gdes</span>
            </div>
            <div class="receipt-item">
                <span>Monnaie rendue:</span>
                <span>${change > 0 ? change : 0} Gdes</span>
            </div>
            <div class="receipt-item">
                <span>Moyen de paiement:</span>
                <span>${paymentMethod}</span>
            </div>
            <hr>
            <div class="text-center">
                <p>Merci pour votre confiance!</p>
                <p><small>Reçu #${'REC' + Date.now().toString().slice(-8)}</small></p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Reçu</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-receipt { width: 80mm; margin: 0 auto; }
                .text-center { text-align: center; }
                .receipt-item { display: flex; justify-content: space-between; margin: 5px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${receiptContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function printGeneralSheet() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const patientName = document.getElementById('cashier-patient-name').textContent;
    
    if (!patientId) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    // Récupérer toutes les transactions du patient pour aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const patientTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        (t.date === today || t.paymentDate === today)
    );
    
    if (patientTransactions.length === 0) {
        alert("Aucune transaction trouvée pour ce patient aujourd'hui!");
        return;
    }
    
    // Calculer les totaux
    let totalAmount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    
    let servicesHtml = '';
    
    patientTransactions.forEach(transaction => {
        const amountUSD = transaction.amount / state.exchangeRate;
        totalAmount += transaction.amount;
        
        if (transaction.status === 'paid') {
            totalPaid += transaction.amount;
        } else {
            totalUnpaid += transaction.amount;
        }
        
        servicesHtml += `
            <tr>
                <td>${transaction.service}</td>
                <td>${transaction.date} ${transaction.time || ''}</td>
                <td>${transaction.amount} Gdes</td>
                <td>${amountUSD.toFixed(2)} $</td>
                <td>${transaction.status === 'paid' ? 
                    `<span style="color:green;">Payé</span><br><small>${transaction.paymentMethod || ''}</small>` : 
                    '<span style="color:red;">Non payé</span>'}</td>
                <td>${transaction.paymentAgent || '-'}</td>
            </tr>
        `;
    });
    
    const generalSheetContent = `
        <div class="print-receipt" style="width: 210mm; margin: 0 auto;">
            <div class="text-center">
                <h2>${document.getElementById('hospital-name-header').textContent}</h2>
                <p>${document.getElementById('hospital-address-header').textContent}</p>
                <h3>Fiche Générale des Transactions</h3>
                <p>Taux: 1 $ = ${state.exchangeRate} Gdes | Date: ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <hr>
            <div style="margin-bottom: 20px;">
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>ID Patient:</strong> ${patientId}</p>
                <p><strong>Date d'émission:</strong> ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="border:1px solid #ddd; padding:8px;">Service</th>
                        <th style="border:1px solid #ddd; padding:8px;">Date/Heure</th>
                        <th style="border:1px solid #ddd; padding:8px;">Montant (Gdes)</th>
                        <th style="border:1px solid #ddd; padding:8px;">Montant ($)</th>
                        <th style="border:1px solid #ddd; padding:8px;">Statut</th>
                        <th style="border:1px solid #ddd; padding:8px;">Agent</th>
                    </tr>
                </thead>
                <tbody>
                    ${servicesHtml}
                </tbody>
            </table>
            
            <div style="display:flex; justify-content:space-between; margin-top:30px;">
                <div style="flex:1; padding:15px; background:#f8f9fa; border-radius:5px; margin-right:10px;">
                    <h4>Récapitulatif</h4>
                    <p>Total des transactions: <strong>${totalAmount} Gdes</strong></p>
                    <p>Montant payé: <strong style="color:green;">${totalPaid} Gdes</strong></p>
                    <p>Montant dû: <strong style="color:red;">${totalUnpaid} Gdes</strong></p>
                </div>
                <div style="flex:1; padding:15px; background:#f8f9fa; border-radius:5px; margin-left:10px;">
                    <h4>Conversion en USD</h4>
                    <p>Total: <strong>${(totalAmount / state.exchangeRate).toFixed(2)} $</strong></p>
                    <p>Payé: <strong style="color:green;">${(totalPaid / state.exchangeRate).toFixed(2)} $</strong></p>
                    <p>Dû: <strong style="color:red;">${(totalUnpaid / state.exchangeRate).toFixed(2)} $</strong></p>
                </div>
            </div>
            
            <hr style="margin:30px 0;">
            
            <div style="margin-top:20px;">
                <h4>Observations:</h4>
                <p>_________________________________________________________</p>
                <p>_________________________________________________________</p>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-top:50px;">
                <div style="text-align:center;">
                    <p>Signature du Caissier</p>
                    <p style="margin-top:50px;">_________________________</p>
                </div>
                <div style="text-align:center;">
                    <p>Signature du Patient</p>
                    <p style="margin-top:50px;">_________________________</p>
                </div>
            </div>
            
            <div class="text-center" style="margin-top:50px;">
                <p><em>Ce document sert de reçu général pour toutes les transactions effectuées aujourd'hui.</em></p>
                <p><small>Fiche #${'FS' + Date.now().toString().slice(-8)}</small></p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Fiche Générale - ${patientName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-receipt { margin: 0 auto; }
                .text-center { text-align: center; }
                hr { border: none; border-top: 1px solid #000; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
            </style>
        </head>
        <body>
            ${generalSheetContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}
// Module Caisse
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cashier-patient-search')) {
        setupCashier();
    }
});

function setupCashier() {
    document.getElementById('update-exchange-rate').addEventListener('click', () => {
        const newRate = parseFloat(document.getElementById('exchange-rate').value);
        if (!newRate || newRate <= 0) {
            alert("Taux de change invalide!");
            return;
        }
        state.exchangeRate = newRate;
        alert("Taux de change mis à jour!");
    });
    
    document.getElementById('search-cashier-patient').addEventListener('click', searchCashierPatient);
    
    const currencyBtns = document.querySelectorAll('.payment-method-currency');
    currencyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currencyBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateAmountGivenLabel();
            calculateChange();
        });
    });
    
    const paymentBtns = document.querySelectorAll('.payment-method');
    paymentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            paymentBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    document.getElementById('amount-given').addEventListener('input', calculateChange);
    
    document.getElementById('mark-as-paid').addEventListener('click', markAsPaid);
    document.getElementById('print-invoice').addEventListener('click', printInvoice);
    document.getElementById('print-receipt').addEventListener('click', printReceipt);
    document.getElementById('print-general-sheet').addEventListener('click', printGeneralSheet);
    document.getElementById('print-all-transactions').addEventListener('click', printAllTransactions);
    
    if (state.currentUser && state.currentUser.role === 'cashier') {
        if (!state.cashierBalances[state.currentUser.username]) {
            state.cashierBalances[state.currentUser.username] = {
                balance: 0,
                transactions: []
            };
        }
    }
    
    if (!state.paymentMethodBalances) {
        state.paymentMethodBalances = { cash: 0, moncash: 0, natcash: 0, card: 0, external: 0 };
    }
    
    updateAmountGivenLabel();
    
    if (!state.patients.find(p => p.id === 'DIRECT')) {
        state.patients.push({
            id: 'DIRECT',
            fullName: 'Vente directe (client)',
            age: '',
            gender: '',
            phone: '',
            address: '',
            hospitalized: false,
            vip: false,
            hasCreditPrivilege: false
        });
    }
}

function updateAmountGivenLabel() {
    const currencyElement = document.querySelector('.payment-method-currency.active');
    const currency = currencyElement ? currencyElement.dataset.currency : 'HTG';
    const label = document.querySelector('label[for="amount-given"]');
    
    if (label) {
        label.textContent = `Montant donné (${currency === 'USD' ? '$' : 'Gdes'}):`;
    }
    
    const input = document.getElementById('amount-given');
    if (input) {
        input.placeholder = currency === 'USD' ? 'Montant en dollars' : 'Montant en gourdes';
    }
}

function searchCashierPatient() {
    const search = document.getElementById('cashier-patient-search').value.trim().toLowerCase();
    
    let patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient && search === 'direct') {
        patient = state.patients.find(p => p.id === 'DIRECT');
    }
    
    if (!patient) {
        alert("Patient non trouvé! Vous pouvez chercher 'DIRECT' pour les ventes sans dossier.");
        return;
    }
    
    document.getElementById('cashier-patient-name').textContent = patient.fullName;
    document.getElementById('cashier-patient-id').textContent = patient.id;
    document.getElementById('cashier-patient-details').classList.remove('hidden');
    
    displayServicesToPay(patient.id);
}

function displayServicesToPay(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    let unpaidTransactions = [];
    if (patientId === 'DIRECT') {
        unpaidTransactions = state.transactions.filter(t => 
            t.patientId === 'DIRECT' && 
            t.status === 'unpaid' &&
            t.isDirectSale === true
        );
    } else {
        unpaidTransactions = state.transactions.filter(t => 
            t.patientId === patientId && 
            (t.status === 'unpaid' || t.status === 'hospitalized') &&
            !t.isCredit
        );
    }
    
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
            
            let serviceName = transaction.service;
            if (transaction.isDirectSale) {
                serviceName += ` #${transaction.id}`;
            }
            
            html += `
                <tr>
                    <td>${serviceName} ${transaction.status === 'hospitalized' ? '<span class="hospitalized-tag">(Hospitalisation)</span>' : ''}</td>
                    <td>${transaction.amount} Gdes</td>
                    <td>${amountUSD.toFixed(2)} $</td>
                    <td><input type="checkbox" class="service-checkbox" data-id="${transaction.id}" data-amount="${transaction.amount}" checked></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
    }
    
    container.innerHTML = html;
    
    const totalUSD = total / state.exchangeRate;
    document.getElementById('total-to-pay').textContent = total;
    document.getElementById('total-to-pay-usd').textContent = totalUSD.toFixed(2);
    
    if (patient && patient.hasCreditPrivilege && patientId !== 'DIRECT') {
        const creditAccount = state.creditAccounts[patientId];
        if (creditAccount && creditAccount.available > 0) {
            const creditOptionHtml = `
                <div class="alert alert-info mt-2">
                    <p><strong>Option de paiement par crédit disponible</strong></p>
                    <p>Limite de crédit: ${creditAccount.limit} Gdes</p>
                    <p>Crédit utilisé: ${creditAccount.used} Gdes</p>
                    <p>Crédit disponible: ${creditAccount.available} Gdes</p>
                    <button class="btn btn-warning mt-1" onclick="payWithCredit('${patientId}')">
                        <i class="fas fa-credit-card"></i> Payer avec crédit
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('afterend', creditOptionHtml);
        }
    }
    
    if (patient && patient.hospitalized && patientId !== 'DIRECT') {
        const hospitalizedTotal = unpaidTransactions
            .filter(t => t.status === 'hospitalized')
            .reduce((sum, t) => sum + t.amount, 0);
        if (hospitalizedTotal > 0) {
            const hospitalInfoHtml = `
                <div class="alert alert-warning mt-2">
                    <p><strong>Patient hospitalisé</strong></p>
                    <p>Total des frais d'hospitalisation : ${hospitalizedTotal} Gdes</p>
                    <p>Vous pouvez encaisser un acompte ou solder la totalité.</p>
                    <button class="btn btn-secondary mt-1" onclick="collectHospitalDeposit('${patientId}')">
                        <i class="fas fa-hand-holding-usd"></i> Encaisser acompte
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('afterend', hospitalInfoHtml);
        }
    }
    
    calculateChange();
    updateAmountGivenLabel();
}

function calculateChange() {
    const total = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
    const amountGiven = parseFloat(document.getElementById('amount-given').value) || 0;
    
    const currencyElement = document.querySelector('.payment-method-currency.active');
    const currency = currencyElement ? currencyElement.dataset.currency : 'HTG';
    
    let amountGivenInHTG = amountGiven;
    let change = 0;
    
    if (currency === 'USD') {
        amountGivenInHTG = amountGiven * state.exchangeRate;
        change = amountGivenInHTG - total;
        
        const resultElement = document.getElementById('change-result');
        if (change < 0) {
            const missingInUSD = Math.abs(change) / state.exchangeRate;
            resultElement.textContent = `Manquant: ${Math.abs(change).toFixed(2)} Gdes (${missingInUSD.toFixed(2)} $)`;
            resultElement.style.color = '#dc3545';
        } else {
            const changeInUSD = change / state.exchangeRate;
            resultElement.textContent = `Monnaie: ${change.toFixed(2)} Gdes (${changeInUSD.toFixed(2)} $)`;
            resultElement.style.color = '#28a745';
        }
    } else {
        change = amountGiven - total;
        
        const resultElement = document.getElementById('change-result');
        if (change < 0) {
            resultElement.textContent = `Manquant: ${Math.abs(change)} Gdes`;
            resultElement.style.color = '#dc3545';
        } else {
            resultElement.textContent = `Monnaie: ${change} Gdes`;
            resultElement.style.color = '#28a745';
        }
    }
}

function markAsPaid() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const patient = state.patients.find(p => p.id === patientId);
    const selectedServices = document.querySelectorAll('.service-checkbox:checked');
    
    if (selectedServices.length === 0) {
        alert("Veuillez sélectionner au moins un service à payer!");
        return;
    }
    
    const total = parseFloat(document.getElementById('total-to-pay').textContent);
    
    if (patient && patient.vip) {
        selectedServices.forEach(checkbox => {
            const transactionId = checkbox.dataset.id;
            const transaction = state.transactions.find(t => t.id === transactionId);
            
            if (transaction) {
                transaction.status = 'paid';
                transaction.paymentDate = new Date().toISOString().split('T')[0];
                transaction.paymentTime = new Date().toLocaleTimeString('fr-FR');
                transaction.paymentAgent = state.currentUser.username;
                transaction.paymentMethod = 'vip';
                transaction.paymentCurrency = 'HTG';
                transaction.amountGiven = 0;
                transaction.amountGivenInHTG = 0;
            }
        });
        
        alert("Services marqués comme payés (VIP)!");
        resetCashierInterface();
        sendPaymentNotifications(patientId, selectedServices);
        return;
    }
    
    const amountGiven = parseFloat(document.getElementById('amount-given').value) || 0;
    const currencyElement = document.querySelector('.payment-method-currency.active');
    const paymentMethodElement = document.querySelector('.payment-method.active');
    
    if (!currencyElement || !paymentMethodElement) {
        alert("Veuillez sélectionner une devise et une méthode de paiement!");
        return;
    }
    
    const currency = currencyElement.dataset.currency;
    const paymentMethod = paymentMethodElement.dataset.method;
    
    let amountGivenInHTG = amountGiven;
    if (currency === 'USD') {
        amountGivenInHTG = amountGiven * state.exchangeRate;
    }
    
    if (amountGivenInHTG < total) {
        alert(`Montant donné insuffisant! Total: ${total} Gdes, Donné: ${amountGivenInHTG.toFixed(2)} Gdes`);
        return;
    }
    
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
            transaction.amountGivenInHTG = amountGivenInHTG;
            
            updateCashierBalance(transaction.amount, patientId, transactionId);
            
            if (state.paymentMethodBalances[paymentMethod] !== undefined) {
                state.paymentMethodBalances[paymentMethod] += transaction.amount;
            }
            
            state.mainCash += transaction.amount;
        }
    });
    
    alert("Paiement effectué avec succès!");
    
    sendPaymentNotifications(patientId, selectedServices);
    
    resetCashierInterface();
    
    if (typeof updateAdminStats === 'function') updateAdminStats();
    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();
}

function payWithCredit(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient || !patient.hasCreditPrivilege) {
        alert("Le patient n'a pas le privilège crédit!");
        return;
    }
    
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount || creditAccount.available <= 0) {
        alert("Crédit insuffisant!");
        return;
    }
    
    const selectedServices = document.querySelectorAll('.service-checkbox:checked');
    if (selectedServices.length === 0) {
        alert("Veuillez sélectionner au moins un service à payer!");
        return;
    }
    
    let totalAmount = 0;
    selectedServices.forEach(checkbox => {
        totalAmount += parseFloat(checkbox.dataset.amount);
    });
    
    if (totalAmount > creditAccount.available) {
        alert(`Crédit insuffisant! Total: ${totalAmount} Gdes, Crédit disponible: ${creditAccount.available} Gdes`);
        return;
    }
    
    if (!confirm(`Utiliser ${totalAmount} Gdes de crédit pour payer ${selectedServices.length} service(s)?\nCrédit disponible après paiement: ${creditAccount.available - totalAmount} Gdes`)) {
        return;
    }
    
    selectedServices.forEach(checkbox => {
        const transactionId = checkbox.dataset.id;
        const transactionAmount = parseFloat(checkbox.dataset.amount);
        const transaction = state.transactions.find(t => t.id === transactionId);
        
        if (transaction) {
            transaction.status = 'paid';
            transaction.paymentDate = new Date().toISOString().split('T')[0];
            transaction.paymentTime = new Date().toLocaleTimeString('fr-FR');
            transaction.paymentAgent = state.currentUser.username;
            transaction.paymentMethod = 'credit';
            transaction.paymentCurrency = 'HTG';
            transaction.amountGiven = 0;
            transaction.amountGivenInHTG = 0;
            
            creditAccount.used += transactionAmount;
            creditAccount.available -= transactionAmount;
            patient.creditUsed = creditAccount.used;
            
            creditAccount.history.push({
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR'),
                amount: -transactionAmount,
                type: 'credit_usage',
                by: state.currentUser.username,
                note: `Paiement de transaction ${transactionId}: ${transaction.service}`,
                newBalance: creditAccount.available
            });
        }
    });
    
    alert(`Paiement par crédit effectué avec succès!\nMontant utilisé: ${totalAmount} Gdes\nNouveau solde disponible: ${creditAccount.available} Gdes`);
    
    sendPaymentNotifications(patientId, selectedServices);
    
    resetCashierInterface();
    
    if (typeof updateAdminStats === 'function') updateAdminStats();
    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();
}

function collectHospitalDeposit(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient || !patient.hospitalized) {
        alert("Ce patient n'est pas hospitalisé.");
        return;
    }
    
    const depositAmount = parseFloat(prompt("Montant de l'acompte (Gdes):", "0"));
    if (isNaN(depositAmount) || depositAmount <= 0) {
        alert("Montant invalide.");
        return;
    }
    
    const paymentMethodElement = document.querySelector('.payment-method.active');
    if (!paymentMethodElement) {
        alert("Veuillez sélectionner une méthode de paiement.");
        return;
    }
    const paymentMethod = paymentMethodElement.dataset.method;
    
    const depositTransaction = {
        id: 'DEP' + Date.now(),
        patientId: patientId,
        patientName: patient.fullName,
        service: 'Acompte hospitalisation',
        amount: depositAmount,
        status: 'paid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        createdBy: state.currentUser.username,
        type: 'deposit',
        paymentMethod: paymentMethod,
        paymentAgent: state.currentUser.username,
        isDeposit: true
    };
    
    state.transactions.push(depositTransaction);
    
    updateCashierBalance(depositAmount, patientId, depositTransaction.id);
    if (state.paymentMethodBalances[paymentMethod] !== undefined) {
        state.paymentMethodBalances[paymentMethod] += depositAmount;
    }
    state.mainCash += depositAmount;
    
    alert(`Acompte de ${depositAmount} Gdes enregistré.`);
    
    displayServicesToPay(patientId);
}

function resetCashierInterface() {
    document.getElementById('cashier-patient-search').value = '';
    document.getElementById('cashier-patient-search').focus();
    document.getElementById('cashier-patient-details').classList.add('hidden');
    document.getElementById('amount-given').value = '';
    document.getElementById('services-to-pay-list').innerHTML = '';
    document.getElementById('total-to-pay').textContent = '0';
    document.getElementById('total-to-pay-usd').textContent = '0.00';
    document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
    document.getElementById('change-result').style.color = '#28a745';
    
    const currencyBtns = document.querySelectorAll('.payment-method-currency');
    currencyBtns.forEach(b => b.classList.remove('active'));
    if (currencyBtns.length > 0) currencyBtns[0].classList.add('active');
    
    const paymentBtns = document.querySelectorAll('.payment-method');
    paymentBtns.forEach(b => b.classList.remove('active'));
    if (paymentBtns.length > 0) paymentBtns[0].classList.add('active');
    
    updateAmountGivenLabel();
}

function updateCashierBalance(amount, patientId, transactionId) {
    const username = state.currentUser.username;
    
    if (!state.cashierBalances[username]) {
        state.cashierBalances[username] = {
            balance: 0,
            transactions: []
        };
    }
    
    state.cashierBalances[username].balance += amount;
    state.cashierBalances[username].transactions.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        type: 'payment',
        amount: amount,
        patientId: patientId,
        transactionId: transactionId
    });
}

function sendPaymentNotifications(patientId, selectedServices) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    const serviceNames = Array.from(selectedServices).map(cb => {
        const trans = state.transactions.find(t => t.id === cb.dataset.id);
        return trans ? trans.service : '';
    }).filter(s => s).join(', ');
    
    const content = `Paiement effectué pour ${patient.fullName} (${patientId}) : ${serviceNames}`;
    
    const recipients = state.users.filter(u => u.active && u.username !== state.currentUser.username);
    recipients.forEach(user => {
        const message = {
            id: 'MSG' + Date.now() + Math.random(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: user.username,
            recipientRole: user.role,
            subject: 'Paiement effectué',
            content: content,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'payment_notification'
        };
        state.messages.push(message);
    });
    
    showNotification(`Paiement enregistré pour ${patient.fullName}`, 'success');
    
    updateMessageBadge();
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
        audio.volume = 1.0;
        audio.play().catch(e => console.log('Son bloqué par le navigateur'));
        
        setTimeout(() => {
            const audio2 = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
            audio2.volume = 1.0;
            audio2.play().catch(e => {});
        }, 200);
    } catch (e) {}
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
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
    
    const currencyElement = document.querySelector('.payment-method-currency.active');
    const currency = currencyElement ? currencyElement.dataset.currency : 'HTG';
    const paymentMethodElement = document.querySelector('.payment-method.active');
    const paymentMethod = paymentMethodElement ? paymentMethodElement.dataset.method : 'Non spécifié';
    
    let amountGivenInHTG = amountGiven;
    let change = 0;
    
    if (currency === 'USD') {
        amountGivenInHTG = amountGiven * state.exchangeRate;
        change = amountGivenInHTG - total;
    } else {
        change = amountGiven - total;
    }
    
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
                <span>${amountGiven} ${currency === 'USD' ? '$' : 'Gdes'}</span>
            </div>
            ${currency === 'USD' ? `<div class="receipt-item">
                <span>Montant donné (en Gdes):</span>
                <span>${amountGivenInHTG.toFixed(2)} Gdes</span>
            </div>` : ''}
            <div class="receipt-item">
                <span>Monnaie rendue:</span>
                <span>${change > 0 ? change.toFixed(2) : 0} Gdes</span>
            </div>
            <div class="receipt-item">
                <span>Moyen de paiement:</span>
                <span>${paymentMethod}</span>
            </div>
            <div class="receipt-item">
                <span>Devise:</span>
                <span>${currency}</span>
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
    
    const today = new Date().toISOString().split('T')[0];
    const patientTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        (t.date === today || t.paymentDate === today)
    );
    
    if (patientTransactions.length === 0) {
        alert("Aucune transaction trouvée pour ce patient aujourd'hui!");
        return;
    }
    
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
                    `<span style="color:green;">Payé</span><br><small>${transaction.paymentMethod || ''} - ${transaction.paymentCurrency || ''}</small>` : 
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
                <h3>Fiche Générale des Transactions du Jour</h3>
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
            <title>Fiche Générale du Jour - ${patientName}</title>
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

function printAllTransactions() {
    const patientId = document.getElementById('cashier-patient-id').textContent;
    const patientName = document.getElementById('cashier-patient-name').textContent;
    
    if (!patientId) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    const patientTransactions = state.transactions.filter(t => t.patientId === patientId);
    
    if (patientTransactions.length === 0) {
        alert("Aucune transaction trouvée pour ce patient!");
        return;
    }
    
    patientTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
                <td>${transaction.paymentDate ? transaction.paymentDate + ' ' + (transaction.paymentTime || '') : '-'}</td>
                <td>${transaction.amount} Gdes</td>
                <td>${amountUSD.toFixed(2)} $</td>
                <td>${transaction.status === 'paid' ? 
                    `<span style="color:green;">Payé</span><br><small>${transaction.paymentMethod || ''} - ${transaction.paymentCurrency || ''}</small>` : 
                    '<span style="color:red;">Non payé</span>'}</td>
                <td>${transaction.paymentAgent || '-'}</td>
            </tr>
        `;
    });
    
    const allTransactionsContent = `
        <div class="print-receipt" style="width: 210mm; margin: 0 auto;">
            <div class="text-center">
                <h2>${document.getElementById('hospital-name-header').textContent}</h2>
                <p>${document.getElementById('hospital-address-header').textContent}</p>
                <h3>Historique Complet des Transactions</h3>
                <p>Taux actuel: 1 $ = ${state.exchangeRate} Gdes | Date d'émission: ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <hr>
            <div style="margin-bottom: 20px;">
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>ID Patient:</strong> ${patientId}</p>
                <p><strong>Date d'émission:</strong> ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                <p><strong>Total des transactions: ${patientTransactions.length}</strong></p>
            </div>
            
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="border:1px solid #ddd; padding:8px;">Service</th>
                        <th style="border:1px solid #ddd; padding:8px;">Date Facturation</th>
                        <th style="border:1px solid #ddd; padding:8px;">Date Paiement</th>
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
                    <h4>Récapitulatif Général</h4>
                    <p>Total des transactions: <strong>${totalAmount} Gdes</strong></p>
                    <p>Montant total payé: <strong style="color:green;">${totalPaid} Gdes</strong></p>
                    <p>Montant total dû: <strong style="color:red;">${totalUnpaid} Gdes</strong></p>
                    <p>Nombre de transactions: <strong>${patientTransactions.length}</strong></p>
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
                    <p>Signature du Responsable</p>
                    <p style="margin-top:50px;">_________________________</p>
                </div>
            </div>
            
            <div class="text-center" style="margin-top:50px;">
                <p><em>Ce document présente l'historique complet de toutes les transactions du patient.</em></p>
                <p><small>Rapport #${'RPT' + Date.now().toString().slice(-8)}</small></p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Historique des Transactions - ${patientName}</title>
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
            ${allTransactionsContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

window.payWithCredit = payWithCredit;
window.collectHospitalDeposit = collectHospitalDeposit;
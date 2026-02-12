// Module Administration, Paramètres et Messagerie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-patient-search')) {
        setupAdmin();
    }
    if (document.getElementById('hospital-name')) {
        setupSettings();
    }
    if (document.getElementById('message-recipient')) {
        setupMessaging();
    }
});

// ==================== ADMINISTRATION ====================
function setupAdmin() {
    document.getElementById('search-admin-patient').addEventListener('click', searchAdminPatient);
    document.getElementById('save-privilege').addEventListener('click', savePrivilege);
    document.getElementById('privilege-type').addEventListener('change', function() {
        const discountSection = document.getElementById('discount-section');
        const creditSection = document.getElementById('credit-section');
        const creditAmountInput = document.getElementById('credit-amount-input');
        
        if (this.value === 'sponsored') {
            discountSection.classList.remove('hidden');
            creditSection.classList.add('hidden');
        } else if (this.value === 'credit') {
            discountSection.classList.add('hidden');
            creditSection.classList.remove('hidden');
            if (creditAmountInput) creditAmountInput.focus();
        } else {
            discountSection.classList.add('hidden');
            creditSection.classList.add('hidden');
        }
    });
    
    // NOUVELLES FONCTIONNALITÉS ADMINISTRATION
    setupAdminExtended();
}

function searchAdminPatient() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    
    if (!patient) {
        alert("Patient non trouvé!");
        document.getElementById('admin-patient-details').classList.add('hidden');
        return;
    }
    
    // Vérifier expiration des privilèges
    if (patient.privilegeGrantedDate) {
        const now = new Date();
        const privilegeDate = new Date(patient.privilegeGrantedDate);
        const hoursDiff = (now - privilegeDate) / (1000 * 60 * 60);
        
        if (hoursDiff >= 24) {
            patient.vip = false;
            patient.sponsored = false;
            patient.discountPercentage = 0;
            patient.hasCreditPrivilege = false;
            patient.creditLimit = 0;
            patient.creditUsed = 0;
            patient.privilegeGrantedDate = null;
        }
    }
    
    document.getElementById('admin-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('admin-patient-details').classList.remove('hidden');
    
    const privilegeSelect = document.getElementById('privilege-type');
    const discountSection = document.getElementById('discount-section');
    const discountInput = document.getElementById('discount-percentage');
    const creditSection = document.getElementById('credit-section');
    const creditAmountInput = document.getElementById('credit-amount-input');
    
    if (patient.vip) {
        privilegeSelect.value = 'vip';
        discountSection.classList.add('hidden');
        creditSection.classList.add('hidden');
    } else if (patient.sponsored) {
        privilegeSelect.value = 'sponsored';
        discountSection.classList.remove('hidden');
        discountInput.value = patient.discountPercentage || 0;
        creditSection.classList.add('hidden');
    } else if (patient.hasCreditPrivilege) {
        privilegeSelect.value = 'credit';
        discountSection.classList.add('hidden');
        creditSection.classList.remove('hidden');
        if (creditAmountInput) creditAmountInput.value = patient.creditLimit || 0;
    } else {
        privilegeSelect.value = 'none';
        discountSection.classList.add('hidden');
        creditSection.classList.add('hidden');
    }
    
    const history = state.transactions.filter(t => t.patientId === patient.id);
    let html = '<table class="table-container"><thead><tr><th>Date</th><th>Service</th><th>Montant</th><th>Statut</th><th>Type</th><th>Actions</th></tr></thead><tbody>';
    if (history.length === 0) {
        html += '<tr><td colspan="6" class="text-center">Aucune transaction</td></tr>';
    } else {
        history.forEach(t => {
            const amountUSD = t.amount / state.exchangeRate;
            html += `<tr>
                <td>${t.date}</td>
                <td>${t.service}</td>
                <td>${t.amount} Gdes (${amountUSD.toFixed(2)} $)</td>
                <td>${t.status}</td>
                <td>${t.type}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="openEditTransactionModal('${t.id}')">Sélectionner</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;
    
    // Afficher le crédit du patient
    updateCreditDisplay(patientId);

    // Bouton d'impression de la fiche patient
    let printBtn = document.getElementById('print-patient-sheet-btn');
    if (!printBtn) {
        printBtn = document.createElement('button');
        printBtn.id = 'print-patient-sheet-btn';
        printBtn.className = 'btn btn-info mt-2';
        printBtn.innerHTML = '<i class="fas fa-print"></i> Imprimer la fiche du patient';
        printBtn.onclick = () => printPatientTransactions(patient.id);
        document.getElementById('admin-patient-details').appendChild(printBtn);
    } else {
        printBtn.onclick = () => printPatientTransactions(patient.id);
    }
}

function savePrivilege() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    const privilegeType = document.getElementById('privilege-type').value;
    const discountPercentage = parseInt(document.getElementById('discount-percentage').value) || 0;
    const creditAmount = parseFloat(document.getElementById('credit-amount-input').value) || 0;
    
    patient.vip = false;
    patient.sponsored = false;
    patient.discountPercentage = 0;
    patient.hasCreditPrivilege = false;
    patient.creditLimit = 0;
    patient.creditUsed = 0;
    patient.privilegeGrantedDate = null;
    
    if (privilegeType === 'vip') {
        patient.vip = true;
        patient.privilegeGrantedDate = new Date().toISOString();
        
        // Marquer toutes les transactions impayées comme payées VIP
        state.transactions.forEach(t => {
            if (t.patientId === patientId && t.status === 'unpaid' && !t.isCredit) {
                t.status = 'paid';
                t.paymentMethod = 'vip';
                t.paymentDate = new Date().toISOString().split('T')[0];
                t.paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                t.paymentAgent = state.currentUser.username;
            }
        });
        alert("Patient marqué comme VIP (services gratuits)");
        
    } else if (privilegeType === 'sponsored') {
        patient.sponsored = true;
        patient.discountPercentage = discountPercentage;
        patient.privilegeGrantedDate = new Date().toISOString();
        
        // Appliquer la réduction aux transactions impayées
        state.transactions.forEach(t => {
            if (t.patientId === patientId && t.status === 'unpaid' && !t.isCredit) {
                const originalAmount = t.originalAmount || t.amount;
                t.amount = originalAmount * (1 - discountPercentage / 100);
            }
        });
        alert(`Patient marqué comme sponsorisé avec ${discountPercentage}% de réduction`);
        
    } else if (privilegeType === 'credit') {
        patient.hasCreditPrivilege = true;
        patient.creditLimit = creditAmount;
        patient.creditUsed = 0;
        patient.privilegeGrantedDate = new Date().toISOString();
        
        // Initialiser le compte crédit si nécessaire
        if (!state.creditAccounts[patientId]) {
            state.creditAccounts[patientId] = {
                balance: 0,
                limit: creditAmount,
                used: 0,
                available: creditAmount,
                history: []
            };
        } else {
            state.creditAccounts[patientId].limit = creditAmount;
            state.creditAccounts[patientId].available = creditAmount - state.creditAccounts[patientId].used;
        }
        
        alert(`Patient a reçu un privilège crédit de ${creditAmount} Gdes`);
        
    } else {
        alert("Privilèges retirés du patient");
    }
    
    searchAdminPatient();
}

function updateAdminStats() {
    const exchangeRate = state.exchangeRate || 130;
    
    const consultationTransactions = state.transactions.filter(t => t.type === 'consultation');
    const consultationAmount = consultationTransactions.reduce((sum, t) => sum + t.amount, 0);
    const consultationAmountUSD = consultationAmount / exchangeRate;
    document.getElementById('admin-consultations-count').textContent = consultationTransactions.length;
    document.getElementById('admin-consultations-amount').textContent = consultationAmount + ' Gdes (' + consultationAmountUSD.toFixed(2) + ' $)';
    
    const labTransactions = state.transactions.filter(t => t.type === 'lab');
    const labAmount = labTransactions.reduce((sum, t) => sum + t.amount, 0);
    const labAmountUSD = labAmount / exchangeRate;
    document.getElementById('admin-analyses-count').textContent = labTransactions.length;
    document.getElementById('admin-analyses-amount').textContent = labAmount + ' Gdes (' + labAmountUSD.toFixed(2) + ' $)';
    
    const medTransactions = state.transactions.filter(t => t.type === 'medication');
    const medAmount = medTransactions.reduce((sum, t) => sum + t.amount, 0);
    const medAmountUSD = medAmount / exchangeRate;
    document.getElementById('admin-medications-count').textContent = medTransactions.length;
    document.getElementById('admin-medications-amount').textContent = medAmount + ' Gdes (' + medAmountUSD.toFixed(2) + ' $)';
    
    const externalTransactions = state.transactions.filter(t => t.type === 'external');
    const externalAmount = externalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const externalAmountUSD = externalAmount / exchangeRate;
    document.getElementById('admin-external-count').textContent = externalTransactions.length;
    document.getElementById('admin-external-amount').textContent = externalAmount + ' Gdes (' + externalAmountUSD.toFixed(2) + ' $)';
    
    const totalRevenue = state.transactions
        .filter(t => t.status === 'paid' && !t.isCredit && t.paymentMethod !== 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalRevenueUSD = totalRevenue / exchangeRate;
    document.getElementById('admin-total-revenue').textContent = totalRevenue + ' Gdes (' + totalRevenueUSD.toFixed(2) + ' $)';
    
    updateRecentTransactions();
}

function updateCharts() {
    const consultationTransactions = state.transactions.filter(t => t.type === 'consultation');
    const labTransactions = state.transactions.filter(t => t.type === 'lab');
    const medTransactions = state.transactions.filter(t => t.type === 'medication');
    const externalTransactions = state.transactions.filter(t => t.type === 'external');
    
    const totalTransactions = consultationTransactions.length + labTransactions.length + medTransactions.length + externalTransactions.length;
    
    if (totalTransactions > 0) {
        const consultationPercentage = Math.round((consultationTransactions.length / totalTransactions) * 100);
        const labPercentage = Math.round((labTransactions.length / totalTransactions) * 100);
        const medPercentage = Math.round((medTransactions.length / totalTransactions) * 100);
        const externalPercentage = Math.round((externalTransactions.length / totalTransactions) * 100);
        
        document.getElementById('consultations-percentage').textContent = consultationPercentage + '%';
        document.getElementById('analyses-percentage').textContent = labPercentage + '%';
        document.getElementById('medications-percentage').textContent = medPercentage + '%';
        document.getElementById('external-percentage').textContent = externalPercentage + '%';
        document.getElementById('total-services-count').textContent = totalTransactions;
        
        const paidTransactions = state.transactions.filter(t => t.status === 'paid' && !t.isCredit).length;
        const unpaidTransactions = state.transactions.filter(t => t.status === 'unpaid').length;
        const total = paidTransactions + unpaidTransactions;
        
        if (total > 0) {
            const paidPercentage = Math.round((paidTransactions / total) * 100);
            const unpaidPercentage = Math.round((unpaidTransactions / total) * 100);
            
            document.getElementById('paid-percentage').textContent = paidPercentage + '%';
            document.getElementById('unpaid-percentage').textContent = unpaidPercentage + '%';
            document.getElementById('paid-chart-bar').style.width = paidPercentage + '%';
            document.getElementById('unpaid-chart-bar').style.width = unpaidPercentage + '%';
        }
    }
    
    updateServicesCharts();
}

function updateServicesCharts() {
    const today = new Date().toISOString().split('T')[0];
    
    const consultationsChart = document.getElementById('consultations-chart');
    const labChart = document.getElementById('analyses-chart');
    const medChart = document.getElementById('medications-chart');
    const externalChart = document.getElementById('external-chart');
    
    const consultationData = [5, 8, 6, 9, 7, 10, 8];
    const labData = [3, 5, 4, 6, 5, 7, 6];
    const medData = [12, 15, 14, 16, 15, 18, 16];
    const externalData = [1, 2, 1, 3, 2, 4, 3];
    
    consultationsChart.innerHTML = createChartHTML(consultationData, 'Consultations');
    labChart.innerHTML = createChartHTML(labData, 'Analyses');
    medChart.innerHTML = createChartHTML(medData, 'Médicaments');
    externalChart.innerHTML = createChartHTML(externalData, 'Services externes');
}

function createChartHTML(data, title) {
    const max = Math.max(...data);
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    let html = '<div style="display:flex; height:150px; align-items:flex-end; gap:10px; margin-top:15px;">';
    
    data.forEach((value, index) => {
        const height = (value / max) * 100;
        html += `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                <div style="width:30px; height:${height}%; background:linear-gradient(to top, #1a6bca, #0d4d9c); border-radius:4px 4px 0 0;"></div>
                <div style="margin-top:5px; font-size:0.8rem; color:#666;">${days[index]}</div>
                <div style="font-size:0.7rem; color:#999;">${value}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function updateRecentTransactions() {
    const recent = [...state.transactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 10);
    
    const container = document.getElementById('recent-transactions-list');
    let html = '';
    
    recent.forEach(transaction => {
        const amountUSD = transaction.amount / state.exchangeRate;
        html += `
            <tr>
                <td>${transaction.date} ${transaction.time}</td>
                <td>${transaction.patientName}<br><small>${transaction.patientId}</small></td>
                <td>${transaction.service}</td>
                <td>${transaction.amount} Gdes (${amountUSD.toFixed(2)} $)</td>
                <td>${transaction.paymentMethod || '-'}</td>
                <td>${transaction.createdBy}</td>
                <td><span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="openEditTransactionModal('${transaction.id}')">
                        Sélectionner
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== NOUVELLES FONCTIONNALITÉS ADMINISTRATION ÉTENDUE ====================

function setupAdminExtended() {
    // Gestion des crédits
    document.getElementById('add-credit-btn')?.addEventListener('click', addPatientCredit);
    document.getElementById('transfer-petty-cash')?.addEventListener('click', transferToPettyCash);
    document.getElementById('view-credit-history')?.addEventListener('click', viewCreditHistory);
    
    // Gestion des transactions
    document.getElementById('edit-transaction-btn')?.addEventListener('click', editTransaction);
    document.getElementById('delete-transaction-btn')?.addEventListener('click', deleteTransaction);
    
    // Rapports
    document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);
    document.getElementById('generate-user-report-btn')?.addEventListener('click', generateUserReport);
    document.getElementById('export-report-csv')?.addEventListener('click', exportReportToCSV);
    
    // Gestion des caisses
    document.getElementById('view-cashier-balances')?.addEventListener('click', viewCashierBalances);
    document.getElementById('adjust-cashier-balance')?.addEventListener('click', adjustCashierBalance);
    
    // Initialiser l'affichage
    updateAdminExtendedDisplay();
}

function updateAdminExtendedDisplay() {
    // Mettre à jour les affichages des caisses
    const mainCashElement = document.getElementById('main-cash-balance');
    const pettyCashElement = document.getElementById('petty-cash-balance');
    
    if (mainCashElement) mainCashElement.textContent = state.mainCash.toLocaleString() + ' Gdes';
    if (pettyCashElement) pettyCashElement.textContent = state.pettyCash.toLocaleString() + ' Gdes';
    
    // Mettre à jour les totaux par utilisateur
    updateUserTransactionTotals();
}

// Ajouter un crédit à un patient (fonction pour ajouter du crédit manuellement)
function addPatientCredit() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const creditAmount = parseFloat(document.getElementById('credit-amount').value);
    const creditNote = document.getElementById('credit-note').value;
    
    if (!patientId || !creditAmount || creditAmount <= 0) {
        alert("Veuillez saisir un ID patient et un montant valide!");
        return;
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    // Vérifier si le patient a le privilège crédit
    if (!patient.hasCreditPrivilege) {
        alert("Le patient n'a pas le privilège crédit! Veuillez d'abord lui attribuer ce privilège.");
        return;
    }
    
    // Augmenter la limite de crédit
    patient.creditLimit = (patient.creditLimit || 0) + creditAmount;
    
    // Mettre à jour le compte crédit
    if (!state.creditAccounts[patientId]) {
        state.creditAccounts[patientId] = {
            balance: 0,
            limit: patient.creditLimit,
            used: patient.creditUsed || 0,
            available: patient.creditLimit - (patient.creditUsed || 0),
            history: []
        };
    } else {
        state.creditAccounts[patientId].limit += creditAmount;
        state.creditAccounts[patientId].available = state.creditAccounts[patientId].limit - state.creditAccounts[patientId].used;
    }
    
    // Ajouter à l'historique
    state.creditAccounts[patientId].history.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        amount: creditAmount,
        type: 'credit_augmentation',
        by: state.currentUser.username,
        note: creditNote || 'Crédit ajouté manuellement'
    });
    
    alert(`Crédit de ${creditAmount} Gdes ajouté au patient ${patient.fullName}. Nouvelle limite: ${patient.creditLimit} Gdes`);
    
    // Réinitialiser le formulaire
    document.getElementById('credit-amount').value = '';
    document.getElementById('credit-note').value = '';
    
    // Mettre à jour l'affichage
    searchAdminPatient();
    updateCreditDisplay(patientId);
}

// Transférer de la grande caisse vers la petite caisse
function transferToPettyCash() {
    const amount = parseFloat(document.getElementById('petty-cash-amount').value);
    
    if (!amount || amount <= 0) {
        alert("Veuillez saisir un montant valide!");
        return;
    }
    
    if (amount > state.mainCash) {
        alert("Fonds insuffisants dans la grande caisse!");
        return;
    }
    
    if (confirm(`Transférer ${amount} Gdes de la grande caisse vers la petite caisse?`)) {
        state.mainCash -= amount;
        state.pettyCash += amount;
        
        // Enregistrer la transaction de transfert
        const transferRecord = {
            id: 'TRANSFER' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            amount: amount,
            from: 'main_cash',
            to: 'petty_cash',
            by: state.currentUser.username,
            note: 'Transfert grande caisse vers petite caisse'
        };
        
        if (!state.reports) state.reports = [];
        state.reports.push(transferRecord);
        
        alert(`Transfert de ${amount} Gdes effectué avec succès!`);
        
        // Mettre à jour l'affichage
        updateAdminExtendedDisplay();
        document.getElementById('petty-cash-amount').value = '';
    }
}

// Afficher l'historique des crédits
function viewCreditHistory(patientId = null) {
    if (!patientId) {
        patientId = document.getElementById('admin-patient-search').value.trim();
    }
    
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount) {
        alert("Aucun compte crédit pour ce patient!");
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `
        <div class="transaction-details-content">
            <h3>Historique des crédits - ${patientId}</h3>
            <div class="credit-summary">
                <p><strong>Limite de crédit:</strong> ${creditAccount.limit} Gdes</p>
                <p><strong>Crédit utilisé:</strong> ${creditAccount.used} Gdes</p>
                <p><strong>Crédit disponible:</strong> ${creditAccount.available} Gdes</p>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date/Heure</th>
                            <th>Montant</th>
                            <th>Type</th>
                            <th>Par</th>
                            <th>Note</th>
                            <th>Solde après</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${creditAccount.history.map(record => `
                            <tr>
                                <td>${record.date} ${record.time}</td>
                                <td>${record.amount > 0 ? '+' : ''}${record.amount} Gdes</td>
                                <td>${record.type === 'credit_attribution' ? 'Attribution' : 
                                      record.type === 'credit_usage' ? 'Utilisation' : 
                                      record.type === 'credit_augmentation' ? 'Augmentation' : record.type}</td>
                                <td>${record.by}</td>
                                <td>${record.note || ''}</td>
                                <td>${record.newBalance || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">
                Fermer
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Modifier une transaction existante (ancienne méthode - redirige vers la nouvelle)
function editTransaction() {
    const transactionId = document.getElementById('selected-transaction-id').value;
    if (!transactionId) {
        alert("Veuillez sélectionner une transaction!");
        return;
    }
    openEditTransactionModal(transactionId);
}

// Supprimer une transaction
function deleteTransaction() {
    const transactionId = document.getElementById('selected-transaction-id').value;
    if (!transactionId) {
        alert("Veuillez sélectionner une transaction!");
        return;
    }
    
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert("Transaction non trouvée!");
        return;
    }
    
    // Vérifier les permissions
    if (state.currentRole === 'responsible' && !state.roles.responsible.canDeleteAllTransactions) {
        alert("Vous n'avez pas la permission de supprimer les transactions!");
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette transaction?\n${transaction.service} - ${transaction.amount} Gdes`)) {
        return;
    }
    
    // Annuler l'effet sur les caisses si la transaction était payée
    if (transaction.status === 'paid') {
        // Rembourser la grande caisse
        state.mainCash -= transaction.amount;
        
        // Rembourser le caissier si applicable
        if (state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance -= transaction.amount;
        }
    }
    
    // Supprimer la transaction
    state.transactions = state.transactions.filter(t => t.id !== transactionId);
    
    alert("Transaction supprimée avec succès!");
    updateAdminStats();
    updateRecentTransactions();
}

// Générer un rapport complet
function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!reportType) {
        alert("Veuillez sélectionner un type de rapport!");
        return;
    }
    
    let reportData = {};
    let title = '';
    
    switch(reportType) {
        case 'financial':
            title = 'Rapport Financier';
            reportData = generateFinancialReport(startDate, endDate);
            break;
        case 'transactions':
            title = 'Rapport des Transactions';
            reportData = generateTransactionReport(startDate, endDate);
            break;
        case 'patients':
            title = 'Rapport des Patients';
            reportData = generatePatientReport(startDate, endDate);
            break;
        case 'services':
            title = 'Rapport des Services';
            reportData = generateServiceReport(startDate, endDate);
            break;
        default:
            alert("Type de rapport non reconnu!");
            return;
    }
    
    // Afficher le rapport
    displayReport(title, reportData);
}

// Générer un rapport financier
function generateFinancialReport(startDate, endDate) {
    const filteredTransactions = state.transactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
    
    const paidTransactions = filteredTransactions.filter(t => t.status === 'paid' && !t.isCredit);
    const unpaidTransactions = filteredTransactions.filter(t => t.status === 'unpaid');
    const creditTransactions = filteredTransactions.filter(t => t.isCredit);
    
    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalUnpaid = unpaidTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const byServiceType = {};
    paidTransactions.forEach(t => {
        byServiceType[t.type] = (byServiceType[t.type] || 0) + t.amount;
    });
    
    // Calculer le total des crédits utilisés
    let totalCreditUsed = 0;
    for (const patientId in state.creditAccounts) {
        const account = state.creditAccounts[patientId];
        totalCreditUsed += account.used || 0;
    }
    
    return {
        period: startDate && endDate ? `${startDate} au ${endDate}` : 'Toute période',
        totalRevenue,
        totalUnpaid,
        totalCredit,
        totalCreditUsed,
        transactionCount: filteredTransactions.length,
        paidCount: paidTransactions.length,
        unpaidCount: unpaidTransactions.length,
        byServiceType,
        mainCashBalance: state.mainCash,
        pettyCashBalance: state.pettyCash,
        creditAccountsTotal: Object.values(state.creditAccounts).reduce((sum, acc) => sum + (acc.balance || 0), 0)
    };
}

// Générer un rapport des transactions
function generateTransactionReport(startDate, endDate) {
    const filteredTransactions = state.transactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
    
    return {
        period: startDate && endDate ? `${startDate} au ${endDate}` : 'Toute période',
        transactions: filteredTransactions,
        totalAmount: filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
    };
}

// Générer un rapport des patients
function generatePatientReport(startDate, endDate) {
    const filteredPatients = state.patients.filter(p => {
        if (startDate && p.registrationDate < startDate) return false;
        if (endDate && p.registrationDate > endDate) return false;
        return true;
    });
    
    const byType = {};
    filteredPatients.forEach(p => {
        byType[p.type] = (byType[p.type] || 0) + 1;
    });
    
    return {
        period: startDate && endDate ? `${startDate} au ${endDate}` : 'Toute période',
        patients: filteredPatients,
        totalPatients: filteredPatients.length,
        byType
    };
}

// Générer un rapport des services
function generateServiceReport(startDate, endDate) {
    const filteredTransactions = state.transactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
    
    const services = {};
    filteredTransactions.forEach(t => {
        if (!services[t.service]) {
            services[t.service] = { count: 0, total: 0 };
        }
        services[t.service].count++;
        services[t.service].total += t.amount;
    });
    
    return {
        period: startDate && endDate ? `${startDate} au ${endDate}` : 'Toute période',
        services,
        totalServices: filteredTransactions.length
    };
}

// Afficher le rapport
function displayReport(title, data) {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    let html = `
        <div class="transaction-details-content">
            <h3>${title}</h3>
            <p><strong>Période:</strong> ${data.period}</p>
    `;
    
    if (data.totalRevenue !== undefined) {
        html += `
            <div class="report-summary">
                <h4>Résumé Financier</h4>
                <p>Revenus totaux: <strong>${data.totalRevenue.toLocaleString()} Gdes</strong></p>
                <p>Montants impayés: <strong>${data.totalUnpaid.toLocaleString()} Gdes</strong></p>
                <p>Crédits attribués: <strong>${data.totalCredit.toLocaleString()} Gdes</strong></p>
                <p>Crédits utilisés: <strong>${data.totalCreditUsed?.toLocaleString() || '0'} Gdes</strong></p>
                <p>Transactions: ${data.transactionCount} (Payées: ${data.paidCount}, Impayées: ${data.unpaidCount})</p>
                <p>Caisse principale: <strong>${data.mainCashBalance.toLocaleString()} Gdes</strong></p>
                <p>Petite caisse: <strong>${data.pettyCashBalance.toLocaleString()} Gdes</strong></p>
                <p>Total crédits patients: <strong>${data.creditAccountsTotal.toLocaleString()} Gdes</strong></p>
            </div>
        `;
    }
    
    if (data.byServiceType) {
        html += `
            <div class="report-details mt-3">
                <h4>Répartition par type de service</h4>
                <table class="table-container">
                    <thead>
                        <tr>
                            <th>Type de service</th>
                            <th>Montant</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const [type, amount] of Object.entries(data.byServiceType)) {
            html += `
                <tr>
                    <td>${type}</td>
                    <td>${amount.toLocaleString()} Gdes</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += `
        <div class="mt-3">
            <button class="btn btn-success" onclick="printReport()">
                <i class="fas fa-print"></i> Imprimer le rapport
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                Fermer
            </button>
        </div>
    </div>`;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Générer un rapport utilisateur
function generateUserReport() {
    const users = state.users;
    const userReport = {};
    
    users.forEach(user => {
        const userTransactions = state.transactions.filter(t => 
            t.createdBy === user.username || 
            t.paymentAgent === user.username
        );
        
        const totalCreated = userTransactions.filter(t => t.createdBy === user.username)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalProcessed = userTransactions.filter(t => t.paymentAgent === user.username)
            .reduce((sum, t) => sum + t.amount, 0);
        
        userReport[user.username] = {
            name: user.name,
            role: user.role,
            transactionsCreated: userTransactions.filter(t => t.createdBy === user.username).length,
            transactionsProcessed: userTransactions.filter(t => t.paymentAgent === user.username).length,
            totalCreated,
            totalProcessed,
            lastActivity: userTransactions.length > 0 ? 
                Math.max(...userTransactions.map(t => new Date(t.date + ' ' + t.time).getTime())) : null
        };
    });
    
    displayUserReport(userReport);
}

// Afficher le rapport utilisateur
function displayUserReport(userReport) {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    let html = `
        <div class="transaction-details-content">
            <h3>Rapport d'Activité des Utilisateurs</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Rôle</th>
                            <th>Transactions créées</th>
                            <th>Transactions traitées</th>
                            <th>Montant créé</th>
                            <th>Montant traité</th>
                            <th>Dernière activité</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    for (const [username, data] of Object.entries(userReport)) {
        const lastActivity = data.lastActivity ? 
            new Date(data.lastActivity).toLocaleDateString('fr-FR') : 'Jamais';
        
        html += `
            <tr>
                <td>${data.name} (${username})</td>
                <td>${data.role}</td>
                <td>${data.transactionsCreated}</td>
                <td>${data.transactionsProcessed}</td>
                <td>${data.totalCreated.toLocaleString()} Gdes</td>
                <td>${data.totalProcessed.toLocaleString()} Gdes</td>
                <td>${lastActivity}</td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-success" onclick="exportUserReportToCSV()">
                    <i class="fas fa-download"></i> Exporter en CSV
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Voir les soldes des caissiers
function viewCashierBalances() {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    let html = `
        <div class="transaction-details-content">
            <h3>Soldes des Caissiers</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Caissier</th>
                            <th>Nom</th>
                            <th>Solde actuel</th>
                            <th>Transactions</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    for (const [username, data] of Object.entries(state.cashierBalances)) {
        const user = state.users.find(u => u.username === username);
        const transactionCount = data.transactions ? data.transactions.length : 0;
        
        html += `
            <tr>
                <td>${username}</td>
                <td>${user ? user.name : 'Non trouvé'}</td>
                <td>${data.balance.toLocaleString()} Gdes</td>
                <td>${transactionCount}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="adjustCashierBalancePrompt('${username}')">
                        Ajuster
                    </button>
                </td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Ajuster le solde d'un caissier
function adjustCashierBalancePrompt(username) {
    const currentBalance = state.cashierBalances[username].balance;
    const adjustment = parseFloat(prompt(`Solde actuel: ${currentBalance} Gdes\nMontant d'ajustement (positif pour ajouter, négatif pour retirer):`, 0));
    
    if (isNaN(adjustment)) {
        alert("Montant invalide!");
        return;
    }
    
    const reason = prompt("Raison de l'ajustement:");
    if (!reason) {
        alert("Veuillez fournir une raison!");
        return;
    }
    
    if (adjustment < 0 && Math.abs(adjustment) > currentBalance) {
        alert("Solde insuffisant!");
        return;
    }
    
    state.cashierBalances[username].balance += adjustment;
    
    // Enregistrer l'ajustement
    state.cashierBalances[username].transactions = state.cashierBalances[username].transactions || [];
    state.cashierBalances[username].transactions.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        type: 'adjustment',
        amount: adjustment,
        by: state.currentUser.username,
        reason: reason,
        newBalance: state.cashierBalances[username].balance
    });
    
    alert(`Solde ajusté de ${adjustment} Gdes. Nouveau solde: ${state.cashierBalances[username].balance} Gdes`);
    viewCashierBalances();
}

// Mettre à jour les totaux par utilisateur
function updateUserTransactionTotals() {
    const container = document.getElementById('user-transaction-totals');
    if (!container) return;
    
    let html = '<h3>Totaux par utilisateur</h3><table class="table-container"><thead><tr><th>Utilisateur</th><th>Transactions créées</th><th>Montant total</th><th>Actions</th></tr></thead><tbody>';
    
    const userTotals = {};
    state.transactions.forEach(t => {
        if (!userTotals[t.createdBy]) {
            userTotals[t.createdBy] = { count: 0, amount: 0 };
        }
        userTotals[t.createdBy].count++;
        userTotals[t.createdBy].amount += t.amount;
    });
    
    for (const [username, data] of Object.entries(userTotals)) {
        const user = state.users.find(u => u.username === username);
        html += `
            <tr>
                <td>${user ? user.name : username} (${username})</td>
                <td>${data.count}</td>
                <td>${data.amount.toLocaleString()} Gdes</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewUserTransactions('${username}')">
                        Voir
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="editUserTransactions('${username}')">
                        Modifier
                    </button>
                </td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Voir les transactions d'un utilisateur
function viewUserTransactions(username) {
    const userTransactions = state.transactions.filter(t => t.createdBy === username);
    const user = state.users.find(u => u.username === username);
    
    let html = `
        <h3>Transactions de ${user ? user.name : username}</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    userTransactions.forEach(t => {
        html += `
            <tr>
                <td>${t.id}</td>
                <td>${t.date} ${t.time}</td>
                <td>${t.patientName}</td>
                <td>${t.service}</td>
                <td>${t.amount} Gdes</td>
                <td>${t.status}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="openEditTransactionModal('${t.id}')">
                        Sélectionner
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${html}<button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button></div>`;
    document.body.appendChild(modal);
}

// Sélectionner une transaction pour modification (ancienne méthode - redirige vers la nouvelle)
function selectTransactionForEdit(transactionId) {
    openEditTransactionModal(transactionId);
}

// ==================== ÉDITION AVANCÉE DES TRANSACTIONS ====================
function openEditTransactionModal(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert("Transaction introuvable !");
        return;
    }

    // Vérification des droits
    if (state.currentRole !== 'admin' && state.currentRole !== 'responsible') {
        alert("Vous n'avez pas la permission de modifier cette transaction.");
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.style.zIndex = '2000';

    let content = `
        <div class="transaction-details-content" style="max-width: 600px;">
            <h3>Modifier la transaction</h3>
            <p><strong>ID :</strong> ${transaction.id}</p>
            <p><strong>Patient :</strong> ${transaction.patientName} (${transaction.patientId})</p>
            <p><strong>Date :</strong> ${transaction.date} ${transaction.time}</p>
            <hr>
            <form id="edit-transaction-form">
                <div class="form-group">
                    <label>Type de service</label>
                    <select id="edit-service-type" class="form-control">
                        <option value="consultation" ${transaction.type === 'consultation' ? 'selected' : ''}>Consultation</option>
                        <option value="lab" ${transaction.type === 'lab' ? 'selected' : ''}>Laboratoire</option>
                        <option value="medication" ${transaction.type === 'medication' ? 'selected' : ''}>Médicament</option>
                        <option value="external" ${transaction.type === 'external' ? 'selected' : ''}>Service externe</option>
                    </select>
                </div>
                <div id="edit-service-specific"></div>
                <div class="form-group">
                    <label>Prix (Gdes)</label>
                    <input type="number" id="edit-amount" class="form-control" value="${transaction.amount}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="edit-status" class="form-control">
                        <option value="paid" ${transaction.status === 'paid' ? 'selected' : ''}>Payé</option>
                        <option value="unpaid" ${transaction.status === 'unpaid' ? 'selected' : ''}>Non payé</option>
                        <option value="partial" ${transaction.status === 'partial' ? 'selected' : ''}>Partiel</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Méthode de paiement</label>
                    <select id="edit-payment-method" class="form-control">
                        <option value="cash" ${transaction.paymentMethod === 'cash' ? 'selected' : ''}>Espèces</option>
                        <option value="card" ${transaction.paymentMethod === 'card' ? 'selected' : ''}>Carte</option>
                        <option value="vip" ${transaction.paymentMethod === 'vip' ? 'selected' : ''}>VIP</option>
                        <option value="credit" ${transaction.paymentMethod === 'credit' ? 'selected' : ''}>Crédit</option>
                        <option value="">Non défini</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Note / raison de la modification</label>
                    <textarea id="edit-note" class="form-control" rows="2" placeholder="Saisissez la raison de la modification..."></textarea>
                </div>
            </form>
            <div class="mt-3 d-flex justify-between">
                <button class="btn btn-success" onclick="saveTransactionChanges('${transactionId}')">Enregistrer</button>
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">Annuler</button>
            </div>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // Charger les options spécifiques au type de service
    updateEditServiceSpecific(transaction);
    document.getElementById('edit-service-type').addEventListener('change', function() {
        updateEditServiceSpecific(transaction);
    });
}

function updateEditServiceSpecific(transaction) {
    const type = document.getElementById('edit-service-type').value;
    const container = document.getElementById('edit-service-specific');
    let html = '';

    if (type === 'consultation') {
        html = `
            <div class="form-group">
                <label>Type de consultation</label>
                <select id="edit-consultation-type" class="form-control">
                    ${state.consultationTypes.filter(c => c.active).map(c => 
                        `<option value="${c.id}" ${transaction.service === c.name ? 'selected' : ''} 
                                data-price="${c.price}">${c.name} - ${c.price} Gdes</option>`
                    ).join('')}
                </select>
            </div>
        `;
        // Mise à jour automatique du prix quand le type change
        setTimeout(() => {
            document.getElementById('edit-consultation-type')?.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const price = parseFloat(selected.dataset.price);
                document.getElementById('edit-amount').value = price;
            });
        }, 100);
    } else if (type === 'medication') {
        html = `
            <div class="form-group">
                <label>Médicament</label>
                <select id="edit-medication-id" class="form-control">
                    ${state.medicationStock.map(med => 
                        `<option value="${med.id}" ${transaction.medicationId === med.id ? 'selected' : ''}
                                data-price="${med.price}" data-name="${med.name}">${med.name} - ${med.price} Gdes (stock: ${med.quantity})</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Quantité</label>
                <input type="number" id="edit-medication-quantity" class="form-control" value="${transaction.quantity || 1}" min="1">
            </div>
        `;
        setTimeout(() => {
            const medSelect = document.getElementById('edit-medication-id');
            const qtyInput = document.getElementById('edit-medication-quantity');
            const amountInput = document.getElementById('edit-amount');
            function updateMedAmount() {
                if (medSelect && qtyInput) {
                    const selected = medSelect.options[medSelect.selectedIndex];
                    const price = parseFloat(selected.dataset.price);
                    const qty = parseInt(qtyInput.value) || 1;
                    amountInput.value = (price * qty).toFixed(2);
                }
            }
            medSelect?.addEventListener('change', updateMedAmount);
            qtyInput?.addEventListener('input', updateMedAmount);
        }, 100);
    } else if (type === 'lab') {
        html = `
            <div class="form-group">
                <label>Examen de laboratoire</label>
                <select id="edit-lab-analysis" class="form-control">
                    ${state.labAnalysisTypes.filter(l => l.active).map(l => 
                        `<option value="${l.id}" ${transaction.service === l.name ? 'selected' : ''}
                                data-price="${l.price}">${l.name} - ${l.price} Gdes</option>`
                    ).join('')}
                </select>
            </div>
        `;
        setTimeout(() => {
            document.getElementById('edit-lab-analysis')?.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const price = parseFloat(selected.dataset.price);
                document.getElementById('edit-amount').value = price;
            });
        }, 100);
    } else if (type === 'external') {
        html = `
            <div class="form-group">
                <label>Service externe</label>
                <select id="edit-external-service" class="form-control">
                    ${state.externalServiceTypes.filter(s => s.active).map(s => 
                        `<option value="${s.id}" ${transaction.service === s.name ? 'selected' : ''}
                                data-price="${s.price}">${s.name} - ${s.price} Gdes</option>`
                    ).join('')}
                </select>
            </div>
        `;
        setTimeout(() => {
            document.getElementById('edit-external-service')?.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const price = parseFloat(selected.dataset.price);
                document.getElementById('edit-amount').value = price;
            });
        }, 100);
    }

    container.innerHTML = html;
}

function saveTransactionChanges(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const oldAmount = transaction.amount;
    const newAmount = parseFloat(document.getElementById('edit-amount').value);
    const newStatus = document.getElementById('edit-status').value;
    const newPaymentMethod = document.getElementById('edit-payment-method').value;
    const note = document.getElementById('edit-note').value || 'Modification administrative';

    if (isNaN(newAmount) || newAmount < 0) {
        alert("Le montant doit être un nombre positif !");
        return;
    }

    // Enregistrer l'état précédent
    const modifications = transaction.modifications || [];
    modifications.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        by: state.currentUser.username,
        oldAmount: oldAmount,
        newAmount: newAmount,
        oldStatus: transaction.status,
        newStatus: newStatus,
        oldPaymentMethod: transaction.paymentMethod,
        newPaymentMethod: newPaymentMethod,
        reason: note
    });

    // Mettre à jour les champs principaux
    transaction.amount = newAmount;
    transaction.status = newStatus;
    transaction.paymentMethod = newPaymentMethod;
    transaction.modifications = modifications;

    // Mise à jour des champs spécifiques selon le type
    const type = document.getElementById('edit-service-type').value;
    transaction.type = type;

    if (type === 'consultation') {
        const select = document.getElementById('edit-consultation-type');
        if (select) {
            const option = select.options[select.selectedIndex];
            transaction.service = option.text.split(' - ')[0];
            transaction.consultationTypeId = option.value;
        }
    } else if (type === 'medication') {
        const medSelect = document.getElementById('edit-medication-id');
        if (medSelect) {
            const medOption = medSelect.options[medSelect.selectedIndex];
            transaction.service = medOption.dataset.name;
            transaction.medicationId = medOption.value;
            transaction.quantity = parseInt(document.getElementById('edit-medication-quantity').value) || 1;
        }
    } else if (type === 'lab') {
        const select = document.getElementById('edit-lab-analysis');
        if (select) {
            const option = select.options[select.selectedIndex];
            transaction.service = option.text.split(' - ')[0];
            transaction.labAnalysisId = option.value;
        }
    } else if (type === 'external') {
        const select = document.getElementById('edit-external-service');
        if (select) {
            const option = select.options[select.selectedIndex];
            transaction.service = option.text.split(' - ')[0];
            transaction.externalServiceId = option.value;
        }
    }

    // Gestion des écarts de caisse si la transaction était déjà payée
    if (transaction.status === 'paid' && oldAmount !== newAmount) {
        const difference = newAmount - oldAmount;
        state.mainCash += difference;

        // Ajuster le solde du caissier
        if (transaction.paymentAgent && state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance += difference;
        }

        // Si diminution du prix, proposer un remboursement
        if (difference < 0) {
            alert(`ATTENTION : Le montant a diminué de ${Math.abs(difference)} Gdes.\nVeuillez rembourser cette somme au patient.`);
        } else if (difference > 0) {
            alert(`Le montant a augmenté de ${difference} Gdes.\nVeuillez encaisser cette somme auprès du patient.`);
        }
    }

    // Fermer le modal
    const modal = document.querySelector('.transaction-details-modal');
    if (modal) modal.remove();

    alert(`Transaction ${transactionId} modifiée avec succès !`);
    
    // Rafraîchir les affichages
    if (document.getElementById('admin-patient-search')) {
        searchAdminPatient();
    }
    updateAdminStats();
    updateRecentTransactions();
    saveStateToLocalStorage();
}

// ==================== IMPRESSION FICHE PATIENT ====================
function printPatientTransactions(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient introuvable !");
        return;
    }

    const transactions = state.transactions
        .filter(t => t.patientId === patientId)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    const hospitalName = document.getElementById('hospital-name')?.value || 'Hôpital';
    const hospitalAddress = document.getElementById('hospital-address')?.value || '';
    const hospitalPhone = document.getElementById('hospital-phone')?.value || '';

    let html = `
        <html>
        <head>
            <title>Fiche patient - ${patient.fullName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .patient-info { margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #007bff; color: white; }
                .total-row { font-weight: bold; background-color: #e9ecef; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${hospitalName}</h2>
                <p>${hospitalAddress}</p>
                <p>${hospitalPhone ? 'Tél: ' + hospitalPhone : ''}</p>
                <h3>Fiche récapitulative des transactions</h3>
            </div>
            <div class="patient-info">
                <p><strong>Patient :</strong> ${patient.fullName} (${patient.id})</p>
                <p><strong>Date de naissance :</strong> ${patient.birthDate || 'Non renseignée'}</p>
                <p><strong>Téléphone :</strong> ${patient.phone || 'Non renseigné'}</p>
                <p><strong>Adresse :</strong> ${patient.address || 'Non renseignée'}</p>
                <p><strong>Date d'enregistrement :</strong> ${patient.registrationDate || ''}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Montant (Gdes)</th>
                        <th>Statut</th>
                        <th>Paiement</th>
                        <th>Agent</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totalPaid = 0, totalUnpaid = 0;
    transactions.forEach(t => {
        const status = t.status === 'paid' ? 'Payé' : (t.status === 'unpaid' ? 'Impayé' : 'Partiel');
        html += `
            <tr>
                <td>${t.date} ${t.time}</td>
                <td>${t.service}</td>
                <td style="text-align: right;">${t.amount.toFixed(2)}</td>
                <td>${status}</td>
                <td>${t.paymentMethod || '-'}</td>
                <td>${t.paymentAgent || t.createdBy || '-'}</td>
            </tr>
        `;
        if (t.status === 'paid') totalPaid += t.amount;
        else totalUnpaid += t.amount;
    });

    html += `
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2"><strong>Total payé</strong></td>
                        <td style="text-align: right;"><strong>${totalPaid.toFixed(2)} Gdes</strong></td>
                        <td colspan="3"></td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2"><strong>Total impayé</strong></td>
                        <td style="text-align: right;"><strong>${totalUnpaid.toFixed(2)} Gdes</strong></td>
                        <td colspan="3"></td>
                    </tr>
                </tfoot>
            </table>
            <p style="margin-top: 30px; text-align: right;">Édité le ${new Date().toLocaleDateString('fr-FR')} par ${state.currentUser.name}</p>
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()">Imprimer</button>
                <button onclick="window.close()">Fermer</button>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
}

// Exporter un rapport en CSV
function exportReportToCSV() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    let rows = [];
    
    switch(reportType) {
        case 'transactions':
            rows.push(["ID", "Date", "Patient", "Service", "Montant", "Statut", "Créé par"]);
            state.transactions.forEach(t => {
                rows.push([t.id, t.date, t.patientName, t.service, t.amount, t.status, t.createdBy]);
            });
            break;
        case 'financial':
            rows.push(["Type", "Montant"]);
            const financialData = generateFinancialReport(startDate, endDate);
            rows.push(["Revenus totaux", financialData.totalRevenue]);
            rows.push(["Impayés totaux", financialData.totalUnpaid]);
            rows.push(["Crédits utilisés", financialData.totalCreditUsed || 0]);
            rows.push(["Caisse principale", financialData.mainCashBalance]);
            rows.push(["Petite caisse", financialData.pettyCashBalance]);
            break;
    }
    
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Imprimer un rapport
function printReport() {
    const reportModal = document.querySelector('.transaction-details-modal:last-child');
    if (!reportModal) return;
    
    const reportContent = reportModal.querySelector('.transaction-details-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Rapport</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .report-summary { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
            </style>
        </head>
        <body>
            ${reportContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Mettre à jour l'affichage du crédit dans la section patient
function updateCreditDisplay(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    const creditAccount = state.creditAccounts[patientId];
    const container = document.getElementById('patient-credit-display');
    
    if (!container) return;
    
    if (patient && patient.hasCreditPrivilege && creditAccount) {
        container.innerHTML = `
            <div class="credit-info card">
                <h5>Compte Crédit</h5>
                <p><strong>Limite de crédit:</strong> ${creditAccount.limit} Gdes</p>
                <p><strong>Crédit utilisé:</strong> ${creditAccount.used} Gdes</p>
                <p><strong>Crédit disponible:</strong> ${creditAccount.available} Gdes</p>
                <div class="mt-2">
                    <button class="btn btn-info btn-sm" onclick="viewCreditHistory('${patientId}')">
                        Voir l'historique
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="usePatientCreditPrompt('${patientId}')">
                        Utiliser le crédit
                    </button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    } else {
        container.innerHTML = '<p>Aucun compte crédit disponible</p>';
        container.classList.remove('hidden');
    }
}

// Utiliser le crédit d'un patient
function usePatientCreditPrompt(patientId = null) {
    if (!patientId) {
        patientId = document.getElementById('admin-patient-search').value.trim();
    }
    
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount || creditAccount.available <= 0) {
        alert("Crédit insuffisant ou aucun compte crédit disponible!");
        return;
    }
    
    const amountToUse = parseFloat(prompt(`Crédit disponible: ${creditAccount.available} Gdes\nMontant à utiliser (Gdes):`, creditAccount.available));
    
    if (!amountToUse || amountToUse <= 0 || amountToUse > creditAccount.available) {
        alert("Montant invalide!");
        return;
    }
    
    // Trouver les transactions impayées du patient
    const unpaidTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.status === 'unpaid' &&
        !t.isCredit
    );
    
    if (unpaidTransactions.length === 0) {
        alert("Ce patient n'a pas de transactions impayées!");
        return;
    }
    
    // Appliquer le crédit aux transactions
    let remainingCredit = amountToUse;
    for (const transaction of unpaidTransactions) {
        if (remainingCredit <= 0) break;
        
        const amountToPay = Math.min(transaction.amount, remainingCredit);
        transaction.amount -= amountToPay;
        remainingCredit -= amountToPay;
        
        if (transaction.amount <= 0) {
            transaction.status = 'paid';
            transaction.paymentMethod = 'credit';
            transaction.paymentDate = new Date().toISOString().split('T')[0];
            transaction.paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            transaction.paymentAgent = state.currentUser.username;
        } else {
            transaction.status = 'partial';
        }
        
        // Mettre à jour le compte crédit
        creditAccount.used += amountToPay;
        creditAccount.available -= amountToPay;
        
        // Ajouter à l'historique du crédit
        creditAccount.history.push({
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            amount: -amountToPay,
            type: 'credit_usage',
            by: state.currentUser.username,
            note: `Paiement de transaction ${transaction.id}: ${transaction.service}`,
            newBalance: creditAccount.available
        });
    }
    
    // Mettre à jour le patient
    const patient = state.patients.find(p => p.id === patientId);
    if (patient) {
        patient.creditUsed = creditAccount.used;
    }
    
    alert(`Crédit utilisé: ${amountToUse - remainingCredit} Gdes\nNouveau solde disponible: ${creditAccount.available} Gdes`);
    searchAdminPatient();
}

// ==================== PARAMÈTRES ====================
function setupSettings() {
    updateSettingsDisplay();
    
    document.getElementById('add-medication-settings').addEventListener('click', addMedicationFromSettings);
    document.getElementById('hospital-logo').addEventListener('change', handleLogoUpload);
    document.getElementById('save-hospital-info-btn').addEventListener('click', saveHospitalInfo);
    
    // Consultation Types
    document.getElementById('add-consultation-type').addEventListener('click', () => {
        const name = document.getElementById('new-consultation-type-name').value.trim();
        const price = parseFloat(document.getElementById('new-consultation-type-price').value);
        const description = document.getElementById('new-consultation-type-description').value.trim();
        
        if (!name || isNaN(price) || price < 0) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newType = {
            id: Date.now(),
            name: name,
            price: price,
            description: description,
            active: true
        };
        
        state.consultationTypes.push(newType);
        updateSettingsDisplay();
        
        document.getElementById('new-consultation-type-name').value = '';
        document.getElementById('new-consultation-type-price').value = '';
        document.getElementById('new-consultation-type-description').value = '';
        alert("Type de consultation ajouté avec succès!");
    });
    
    // Vital Types
    document.getElementById('add-vital-type').addEventListener('click', () => {
        const name = document.getElementById('new-vital-name').value.trim();
        const unit = document.getElementById('new-vital-unit').value.trim();
        const min = parseFloat(document.getElementById('new-vital-min').value);
        const max = parseFloat(document.getElementById('new-vital-max').value);
        
        if (!name || !unit || isNaN(min) || isNaN(max) || min >= max) {
            alert("Veuillez remplir tous les champs correctement! La valeur min doit être inférieure à la valeur max.");
            return;
        }
        
        const newVital = {
            id: Date.now(),
            name: name,
            unit: unit,
            min: min,
            max: max,
            active: true
        };
        
        state.vitalTypes.push(newVital);
        updateSettingsDisplay();
        
        document.getElementById('new-vital-name').value = '';
        document.getElementById('new-vital-unit').value = '';
        document.getElementById('new-vital-min').value = '';
        document.getElementById('new-vital-max').value = '';
        alert("Signe vital ajouté avec succès!");
    });
    
    // Lab Analysis Types
    document.getElementById('add-lab-analysis-type').addEventListener('click', () => {
        const name = document.getElementById('new-lab-analysis-name').value.trim();
        const price = parseFloat(document.getElementById('new-lab-analysis-price').value);
        const type = document.getElementById('new-lab-analysis-type').value;
        
        if (!name || isNaN(price) || price < 0) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newAnalysis = {
            id: Date.now(),
            name: name,
            price: price,
            resultType: type,
            active: true
        };
        
        state.labAnalysisTypes.push(newAnalysis);
        updateSettingsDisplay();
        
        document.getElementById('new-lab-analysis-name').value = '';
        document.getElementById('new-lab-analysis-price').value = '';
        alert("Type d'analyse ajouté avec succès!");
    });
    
    // External Service Types
    document.getElementById('add-external-service-type').addEventListener('click', () => {
        const name = document.getElementById('new-external-service-type-name').value.trim();
        const price = parseFloat(document.getElementById('new-external-service-type-price').value);
        
        if (!name || isNaN(price) || price < 0) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newService = {
            id: Date.now(),
            name: name,
            price: price,
            active: true
        };
        
        state.externalServiceTypes.push(newService);
        updateSettingsDisplay();
        
        document.getElementById('new-external-service-type-name').value = '';
        document.getElementById('new-external-service-type-price').value = '';
        alert("Service externe ajouté avec succès!");
    });
    
    // Users
    document.getElementById('add-user').addEventListener('click', () => {
        const name = document.getElementById('new-user-name').value.trim();
        const role = document.getElementById('new-user-role').value;
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-password').value;
        
        if (!name || !role || !username || !password) {
            alert("Veuillez remplir tous les champs!");
            return;
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = state.users.find(u => u.username === username);
        if (existingUser) {
            alert("Ce nom d'utilisateur existe déjà!");
            return;
        }
        
        const newUser = {
            id: Date.now(),
            name: name,
            role: role,
            username: username,
            password: password,
            active: true
        };
        
        state.users.push(newUser);
        updateSettingsDisplay();
        updateMessageRecipients();
        
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-role').value = '';
        document.getElementById('new-user-username').value = '';
        document.getElementById('new-user-password').value = '';
        
        alert("Utilisateur ajouté avec succès!");
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Taille maximale: 2MB");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        state.hospitalLogo = e.target.result;
        document.getElementById('logo-preview').src = e.target.result;
        document.getElementById('logo-preview').style.display = 'block';
        updateLogoDisplay();
    };
    reader.onerror = function() {
        alert("Erreur lors de la lecture du fichier");
    };
    reader.readAsDataURL(file);
}

function saveHospitalInfo() {
    const name = document.getElementById('hospital-name').value.trim();
    const address = document.getElementById('hospital-address').value.trim();
    const phone = document.getElementById('hospital-phone').value.trim();
    
    if (!name) {
        alert("Veuillez entrer le nom de l'hôpital!");
        return;
    }
    
    // Mettre à jour les en-têtes
    document.getElementById('hospital-name-header').textContent = name;
    document.getElementById('hospital-address-header').textContent = address;
    document.getElementById('hospital-name-login').textContent = name;
    document.getElementById('certificate-hospital-name').textContent = name;
    document.getElementById('certificate-hospital-name-text').textContent = name;
    document.getElementById('invoice-hospital-name').textContent = name;
    document.getElementById('card-hospital-name').textContent = name;
    
    if (address) {
        document.getElementById('hospital-address-header').textContent = address;
        document.getElementById('certificate-hospital-address').textContent = address;
        document.getElementById('invoice-hospital-address').textContent = address;
        document.getElementById('card-hospital-address').textContent = address;
    }
    
    if (phone) {
        document.getElementById('hospital-phone').value = phone;
        document.getElementById('certificate-hospital-phone').textContent = `Tél: ${phone}`;
        document.getElementById('invoice-hospital-phone').textContent = `Tél: ${phone}`;
    }
    
    alert("Informations de l'hôpital enregistrées avec succès!");
    saveStateToLocalStorage();
}

function addMedicationFromSettings() {
    const name = document.getElementById('new-medication-name-settings').value.trim();
    const price = parseFloat(document.getElementById('new-medication-price-settings').value);
    const quantity = parseInt(document.getElementById('new-medication-quantity-settings').value);
    const alertThreshold = parseInt(document.getElementById('new-medication-alert-settings').value);
    
    if (!name || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0 || isNaN(alertThreshold) || alertThreshold < 0) {
        alert("Veuillez remplir tous les champs correctement!");
        return;
    }
    
    const newMed = {
        id: 'MED' + Date.now(),
        name: name,
        genericName: name,
        form: 'comprimé',
        quantity: quantity,
        unit: 'comprimés',
        alertThreshold: alertThreshold,
        price: price,
        reserved: 0
    };
    
    state.medicationStock.push(newMed);
    
    document.getElementById('new-medication-name-settings').value = '';
    document.getElementById('new-medication-price-settings').value = '';
    document.getElementById('new-medication-quantity-settings').value = '';
    document.getElementById('new-medication-alert-settings').value = '';
    
    updateMedicationsSettingsList();
    if (typeof updateMedicationStock === 'function') updateMedicationStock();
    alert("Médicament ajouté avec succès!");
    saveStateToLocalStorage();
}

function updateMedicationsSettingsList() {
    const container = document.getElementById('medications-settings-list');
    if (!container) return;
    
    let html = '';
    
    state.medicationStock.forEach(med => {
        html += `
            <tr>
                <td>${med.name}</td>
                <td>${med.price} Gdes</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteMedicationSettings('${med.id}')">
                        Supprimer
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function deleteMedicationSettings(medId) {
    if (confirm("Supprimer ce médicament? Cette action est irréversible.")) {
        state.medicationStock = state.medicationStock.filter(m => m.id !== medId);
        updateMedicationsSettingsList();
        if (typeof updateMedicationStock === 'function') updateMedicationStock();
        alert("Médicament supprimé avec succès!");
        saveStateToLocalStorage();
    }
}

function updateSettingsDisplay() {
    // Consultation Types
    const consultationList = document.getElementById('consultation-types-list');
    if (consultationList) {
        let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Description</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.consultationTypes.forEach(type => {
            html += `
                <tr>
                    <td>${type.name}</td>
                    <td><input type="number" class="form-control consultation-price-input" data-id="${type.id}" value="${type.price}" style="width:100px;"></td>
                    <td><input type="text" class="form-control consultation-desc-input" data-id="${type.id}" value="${type.description || ''}" style="width:200px;"></td>
                    <td><input type="checkbox" ${type.active ? 'checked' : ''} onchange="toggleConsultationType(${type.id}, this.checked)"></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="saveConsultationType(${type.id})">Enregistrer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteConsultationType(${type.id})">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        consultationList.innerHTML = html;
    }
    
    // Vital Types
    const vitalsList = document.getElementById('vitals-types-list');
    if (vitalsList) {
        html = '<table class="table-container"><thead><tr><th>Nom</th><th>Unité</th><th>Valeur min</th><th>Valeur max</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.vitalTypes.forEach(vital => {
            html += `
                <tr>
                    <td>${vital.name}</td>
                    <td>${vital.unit}</td>
                    <td><input type="number" class="form-control vital-min-input" data-id="${vital.id}" value="${vital.min}" style="width:80px;"></td>
                    <td><input type="number" class="form-control vital-max-input" data-id="${vital.id}" value="${vital.max}" style="width:80px;"></td>
                    <td><input type="checkbox" ${vital.active ? 'checked' : ''} onchange="toggleVitalType(${vital.id}, this.checked)"></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="saveVitalType(${vital.id})">Enregistrer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVitalType(${vital.id})">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        vitalsList.innerHTML = html;
    }
    
    // Lab Analysis Types
    const labList = document.getElementById('lab-analyses-types-list');
    if (labList) {
        html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Type résultat</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.labAnalysisTypes.forEach(analysis => {
            html += `
                <tr>
                    <td>${analysis.name}</td>
                    <td><input type="number" class="form-control analysis-price-input" data-id="${analysis.id}" value="${analysis.price}" style="width:100px;"></td>
                    <td>${analysis.resultType === 'text' ? 'Texte' : 'Image'}</td>
                    <td><input type="checkbox" ${analysis.active ? 'checked' : ''} onchange="toggleLabAnalysisType(${analysis.id}, this.checked)"></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="saveLabAnalysisType(${analysis.id})">Enregistrer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLabAnalysisType(${analysis.id})">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        labList.innerHTML = html;
    }
    
    // External Service Types
    const externalList = document.getElementById('external-services-types-list');
    if (externalList) {
        html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.externalServiceTypes.forEach(service => {
            html += `
                <tr>
                    <td>${service.name}</td>
                    <td><input type="number" class="form-control external-price-input" data-id="${service.id}" value="${service.price}" style="width:100px;"></td>
                    <td><input type="checkbox" ${service.active ? 'checked' : ''} onchange="toggleExternalServiceType(${service.id}, this.checked)"></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="saveExternalServiceType(${service.id})">Enregistrer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExternalServiceType(${service.id})">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        externalList.innerHTML = html;
    }
    
    updateUsersList();
    
    // Mettre à jour les selects dans d'autres modules
    if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
    if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
    if (typeof updateLabAnalysesSelect === 'function') updateLabAnalysesSelect();
    if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
    if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
    updateMedicationsSettingsList();
}

function updateUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;
    
    let html = '';
    
    state.users.forEach(user => {
        html += `
            <tr>
                <td>${user.name}</td>
                <td>${user.role}</td>
                <td>${user.username}</td>
                <td><input type="checkbox" ${user.active ? 'checked' : ''} onchange="toggleUser(${user.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${user.id})">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function saveConsultationType(id) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (!type) return;
    
    const priceInput = document.querySelector(`.consultation-price-input[data-id="${id}"]`);
    const descInput = document.querySelector(`.consultation-desc-input[data-id="${id}"]`);
    
    type.price = parseFloat(priceInput.value);
    type.description = descInput.value;
    
    alert("Type de consultation enregistré!");
    if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
    if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
    saveStateToLocalStorage();
}

function toggleConsultationType(id, active) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (type) {
        type.active = active;
        if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
        if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
        saveStateToLocalStorage();
    }
}

function deleteConsultationType(id) {
    if (confirm("Supprimer ce type de consultation? Cette action est irréversible.")) {
        state.consultationTypes = state.consultationTypes.filter(t => t.id !== id);
        updateSettingsDisplay();
        alert("Type de consultation supprimé!");
        saveStateToLocalStorage();
    }
}

function saveVitalType(id) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (!vital) return;
    
    const minInput = document.querySelector(`.vital-min-input[data-id="${id}"]`);
    const maxInput = document.querySelector(`.vital-max-input[data-id="${id}"]`);
    
    vital.min = parseFloat(minInput.value);
    vital.max = parseFloat(maxInput.value);
    
    alert("Signe vital enregistré!");
    if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
    saveStateToLocalStorage();
}

function toggleVitalType(id, active) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (vital) {
        vital.active = active;
        if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
        saveStateToLocalStorage();
    }
}

function deleteVitalType(id) {
    if (confirm("Supprimer ce signe vital? Cette action est irréversible.")) {
        state.vitalTypes = state.vitalTypes.filter(v => v.id !== id);
        updateSettingsDisplay();
        alert("Signe vital supprimé!");
        saveStateToLocalStorage();
    }
}

function saveLabAnalysisType(id) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (!analysis) return;
    
    const priceInput = document.querySelector(`.analysis-price-input[data-id="${id}"]`);
    analysis.price = parseFloat(priceInput.value);
    
    alert("Analyse enregistrée!");
    saveStateToLocalStorage();
}

function toggleLabAnalysisType(id, active) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (analysis) {
        analysis.active = active;
        saveStateToLocalStorage();
    }
}

function deleteLabAnalysisType(id) {
    if (confirm("Supprimer cette analyse? Cette action est irréversible.")) {
        state.labAnalysisTypes = state.labAnalysisTypes.filter(a => a.id !== id);
        updateSettingsDisplay();
        alert("Analyse supprimée!");
        saveStateToLocalStorage();
    }
}

function saveExternalServiceType(id) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (!service) return;
    
    const priceInput = document.querySelector(`.external-price-input[data-id="${id}"]`);
    service.price = parseFloat(priceInput.value);
    
    alert("Service externe enregistré!");
    if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
    if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    saveStateToLocalStorage();
}

function toggleExternalServiceType(id, active) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (service) {
        service.active = active;
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
        saveStateToLocalStorage();
    }
}

function deleteExternalServiceType(id) {
    if (confirm("Supprimer ce service externe? Cette action est irréversible.")) {
        state.externalServiceTypes = state.externalServiceTypes.filter(s => s.id != id);
        updateSettingsDisplay();
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
        alert("Service externe supprimé!");
        saveStateToLocalStorage();
    }
}

function toggleUser(id, active) {
    const user = state.users.find(u => u.id === id);
    if (user) {
        user.active = active;
        saveStateToLocalStorage();
    }
}

function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const newPassword = prompt(`Nouveau mot de passe pour ${user.name}:`, user.password);
    if (newPassword !== null && newPassword.trim() !== '') {
        user.password = newPassword;
        alert("Mot de passe modifié avec succès!");
        updateSettingsDisplay();
        saveStateToLocalStorage();
    }
}

function deleteUser(id) {
    if (id <= 7) {
        alert("Impossible de supprimer les utilisateurs par défaut!");
        return;
    }
    
    if (confirm("Supprimer cet utilisateur? Cette action est irréversible.")) {
        state.users = state.users.filter(u => u.id !== id);
        updateSettingsDisplay();
        updateMessageRecipients();
        alert("Utilisateur supprimé avec succès!");
        saveStateToLocalStorage();
    }
}

// ==================== MESSAGERIE ====================
function setupMessaging() {
    updateMessageRecipients();
    
    document.getElementById('new-conversation-btn').addEventListener('click', () => {
        const recipient = document.getElementById('message-recipient').value;
        if (!recipient) {
            alert("Veuillez sélectionner un destinataire!");
            return;
        }
        
        if (recipient.startsWith('all')) {
            let targetUsers = [];
            
            if (recipient === 'all') {
                targetUsers = state.users.filter(u => u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-doctors') {
                targetUsers = state.users.filter(u => u.role === 'doctor' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-nurses') {
                targetUsers = state.users.filter(u => u.role === 'nurse' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-secretaries') {
                targetUsers = state.users.filter(u => u.role === 'secretary' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-cashiers') {
                targetUsers = state.users.filter(u => u.role === 'cashier' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-labs') {
                targetUsers = state.users.filter(u => u.role === 'lab' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-pharmacies') {
                targetUsers = state.users.filter(u => u.role === 'pharmacy' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-admins') {
                targetUsers = state.users.filter(u => u.role === 'admin' && u.active && u.username !== state.currentUser.username);
            }
            
            const messageContent = prompt(`Entrez votre message à ${targetUsers.length} destinataire(s):`);
            if (!messageContent) return;
            
            targetUsers.forEach(user => {
                const message = {
                    id: 'MSG' + Date.now(),
                    sender: state.currentUser.username,
                    senderRole: state.currentRole,
                    recipient: user.username,
                    recipientRole: user.role,
                    subject: `Message à tous les ${user.role}s`,
                    content: messageContent,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'broadcast'
                };
                state.messages.push(message);
            });
            
            alert(`Message envoyé à ${targetUsers.length} destinataire(s)!`);
            loadConversations();
            updateMessageBadge();
            document.getElementById('message-recipient').selectedIndex = 0;
            return;
        }
        
        state.currentConversation = recipient;
        loadConversation(recipient);
        document.getElementById('message-recipient').selectedIndex = 0;
    });
    
    document.getElementById('send-message-btn').addEventListener('click', () => {
        sendMessage();
    });
    
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function updateMessageRecipients() {
    const select = document.getElementById('message-recipient');
    if (!select) return;
    
    select.innerHTML = '<option value="">Nouveau message...</option>' +
        '<option value="all">Tous les utilisateurs</option>' +
        '<option value="all-doctors">Tous les médecins</option>' +
        '<option value="all-nurses">Tous les infirmiers</option>' +
        '<option value="all-secretaries">Tous les secrétaires</option>' +
        '<option value="all-cashiers">Tous les caissiers</option>' +
        '<option value="all-labs">Tout le laboratoire</option>' +
        '<option value="all-pharmacies">Toute la pharmacie</option>' +
        '<option value="all-admins">Tous les administrateurs</option>';
    
    state.users.forEach(user => {
        if (user.active && user.username !== state.currentUser.username) {
            select.innerHTML += `<option value="${user.username}">${user.name} (${user.role})</option>`;
        }
    });
}

function loadConversations() {
    const container = document.getElementById('conversations-container');
    if (!container) return;
    
    const userMessages = state.messages.filter(m => 
        m.recipient === state.currentUser.username || 
        m.sender === state.currentUser.username
    );
    
    const conversations = {};
    userMessages.forEach(message => {
        const otherUser = message.sender === state.currentUser.username ? message.recipient : message.sender;
        if (!conversations[otherUser]) {
            conversations[otherUser] = {
                user: otherUser,
                lastMessage: message,
                unread: message.recipient === state.currentUser.username && !message.read
            };
        } else {
            if (new Date(message.timestamp) > new Date(conversations[otherUser].lastMessage.timestamp)) {
                conversations[otherUser].lastMessage = message;
            }
            if (message.recipient === state.currentUser.username && !message.read) {
                conversations[otherUser].unread = true;
            }
        }
    });
    
    let html = '';
    Object.values(conversations).forEach(conv => {
        const otherUser = state.users.find(u => u.username === conv.user);
        const displayName = otherUser ? otherUser.name : conv.user;
        
        html += `
            <div class="conversation-item ${conv.unread ? 'unread' : ''} ${state.currentConversation === conv.user ? 'active' : ''}" 
                 onclick="loadConversation('${conv.user}')">
                <div class="d-flex align-items-center">
                    <div class="conversation-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="conversation-info">
                        <div class="d-flex justify-between">
                            <strong>${displayName}</strong>
                            <span class="conversation-time">${new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div class="conversation-last-message">${conv.lastMessage.content.substring(0, 50)}${conv.lastMessage.content.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>Aucune conversation</p>';
}

function loadConversation(otherUser) {
    state.currentConversation = otherUser;
    const messages = state.messages.filter(m => 
        (m.sender === state.currentUser.username && m.recipient === otherUser) ||
        (m.sender === otherUser && m.recipient === state.currentUser.username)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const otherUserObj = state.users.find(u => u.username === otherUser);
    const displayName = otherUserObj ? otherUserObj.name : otherUser;
    
    const titleElement = document.getElementById('current-conversation-title');
    if (titleElement) {
        titleElement.textContent = `Conversation avec ${displayName}`;
    }
    
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    let html = '';
    
    messages.forEach(message => {
        const isSent = message.sender === state.currentUser.username;
        const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        
        html += `
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble-content">
                    ${message.content}
                </div>
                <div class="message-bubble-time">${time}</div>
            </div>
        `;
        
        if (message.recipient === state.currentUser.username && !message.read) {
            message.read = true;
        }
    });
    
    container.innerHTML = html || '<p>Aucun message</p>';
    container.scrollTop = container.scrollHeight;
    
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.classList.remove('hidden');
    }
    
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.focus();
    }
    
    loadConversations();
    updateMessageBadge();
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !state.currentConversation) {
        alert("Veuillez sélectionner un destinataire et entrer un message!");
        return;
    }
    
    const message = {
        id: 'MSG' + Date.now(),
        sender: state.currentUser.username,
        senderRole: state.currentRole,
        recipient: state.currentConversation,
        recipientRole: state.users.find(u => u.username === state.currentConversation)?.role || '',
        subject: 'Message',
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message'
    };
    
    state.messages.push(message);
    input.value = '';
    
    loadConversation(state.currentConversation);
    updateMessageBadge();
}
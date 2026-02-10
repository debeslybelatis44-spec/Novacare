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
        if (this.value === 'sponsored') {
            discountSection.classList.remove('hidden');
        } else {
            discountSection.classList.add('hidden');
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
            patient.privilegeGrantedDate = null;
        }
    }
    
    document.getElementById('admin-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('admin-patient-details').classList.remove('hidden');
    
    const privilegeSelect = document.getElementById('privilege-type');
    const discountSection = document.getElementById('discount-section');
    const discountInput = document.getElementById('discount-percentage');
    
    if (patient.vip) {
        privilegeSelect.value = 'vip';
        discountSection.classList.add('hidden');
    } else if (patient.sponsored) {
        privilegeSelect.value = 'sponsored';
        discountSection.classList.remove('hidden');
        discountInput.value = patient.discountPercentage;
    } else {
        privilegeSelect.value = 'none';
        discountSection.classList.add('hidden');
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
                    <button class="btn btn-sm btn-warning" onclick="selectTransactionForEdit('${t.id}')">Sélectionner</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;
    
    // Afficher le crédit du patient
    updateCreditDisplay(patientId);
}

function savePrivilege() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    const privilegeType = document.getElementById('privilege-type').value;
    const discountPercentage = parseInt(document.getElementById('discount-percentage').value) || 0;
    
    patient.vip = false;
    patient.sponsored = false;
    patient.discountPercentage = 0;
    patient.privilegeGrantedDate = null;
    
    if (privilegeType === 'vip') {
        patient.vip = true;
        patient.privilegeGrantedDate = new Date().toISOString();
        state.transactions.forEach(t => {
            if (t.patientId === patientId && t.status === 'unpaid') {
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
        alert(`Patient marqué comme sponsorisé avec ${discountPercentage}% de réduction`);
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
        .filter(t => t.status === 'paid' && !t.isCredit)
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
                    <button class="btn btn-sm btn-warning" onclick="selectTransactionForEdit('${transaction.id}')">
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

// Ajouter un crédit à un patient
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
    
    // Initialiser le compte crédit si nécessaire
    if (!state.creditAccounts[patientId]) {
        state.creditAccounts[patientId] = {
            balance: 0,
            history: []
        };
    }
    
    // Ajouter le crédit
    state.creditAccounts[patientId].balance += creditAmount;
    state.creditAccounts[patientId].history.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        amount: creditAmount,
        type: 'credit_attribution',
        by: state.currentUser.username,
        note: creditNote || 'Crédit attribué'
    });
    
    // Enregistrer la transaction (mais ne pas l'ajouter au revenu total)
    const creditTransaction = {
        id: 'CREDIT' + Date.now(),
        patientId: patientId,
        patientName: patient.fullName,
        service: `Crédit attribué: ${creditNote}`,
        amount: creditAmount,
        status: 'credited',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        createdBy: state.currentUser.username,
        type: 'credit',
        paymentMethod: 'credit',
        isCredit: true
    };
    
    state.transactions.push(creditTransaction);
    
    alert(`Crédit de ${creditAmount} Gdes attribué au patient ${patient.fullName}`);
    
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
        alert("Aucun crédit pour ce patient!");
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `
        <div class="transaction-details-content">
            <h3>Historique des crédits - ${patientId}</h3>
            <p>Solde actuel: <strong>${creditAccount.balance} Gdes</strong></p>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date/Heure</th>
                            <th>Montant</th>
                            <th>Type</th>
                            <th>Par</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${creditAccount.history.map(record => `
                            <tr>
                                <td>${record.date} ${record.time}</td>
                                <td>${record.amount} Gdes</td>
                                <td>${record.type}</td>
                                <td>${record.by}</td>
                                <td>${record.note || ''}</td>
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

// Modifier une transaction existante
function editTransaction() {
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
    if (state.currentRole === 'responsible' && !state.roles.responsible.canModifyAllTransactions) {
        alert("Vous n'avez pas la permission de modifier les transactions!");
        return;
    }
    
    const newAmount = parseFloat(prompt("Nouveau montant (Gdes):", transaction.amount));
    if (!newAmount || newAmount < 0) {
        alert("Montant invalide!");
        return;
    }
    
    const oldAmount = transaction.amount;
    transaction.amount = newAmount;
    
    // Mettre à jour les soldes si la transaction était payée
    if (transaction.status === 'paid') {
        const difference = newAmount - oldAmount;
        
        // Mettre à jour le solde du caissier si applicable
        if (state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance += difference;
        }
        
        // Mettre à jour la grande caisse
        state.mainCash += difference;
    }
    
    // Ajouter une note d'audit
    transaction.modifications = transaction.modifications || [];
    transaction.modifications.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        by: state.currentUser.username,
        oldAmount: oldAmount,
        newAmount: newAmount,
        reason: 'Modification par administrateur'
    });
    
    alert("Transaction modifiée avec succès!");
    updateAdminStats();
    updateRecentTransactions();
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
    
    return {
        period: startDate && endDate ? `${startDate} au ${endDate}` : 'Toute période',
        totalRevenue,
        totalUnpaid,
        totalCredit,
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
                    <button class="btn btn-warning btn-sm" onclick="selectTransactionForEdit('${t.id}')">
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

// Sélectionner une transaction pour modification
function selectTransactionForEdit(transactionId) {
    document.getElementById('selected-transaction-id').value = transactionId;
    alert(`Transaction ${transactionId} sélectionnée pour modification`);
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
    const creditAccount = state.creditAccounts[patientId];
    const container = document.getElementById('patient-credit-display');
    
    if (!container) return;
    
    if (creditAccount) {
        container.innerHTML = `
            <div class="credit-info">
                <h5>Crédit disponible</h5>
                <p><strong>${creditAccount.balance} Gdes</strong></p>
                <button class="btn btn-info btn-sm" onclick="viewCreditHistory('${patientId}')">
                    Voir l'historique
                </button>
                <button class="btn btn-warning btn-sm" onclick="usePatientCredit('${patientId}')">
                    Utiliser le crédit
                </button>
            </div>
        `;
        container.classList.remove('hidden');
    } else {
        container.innerHTML = '<p>Aucun crédit disponible</p>';
        container.classList.remove('hidden');
    }
}

// Utiliser le crédit d'un patient
function usePatientCredit(patientId) {
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount || creditAccount.balance <= 0) {
        alert("Aucun crédit disponible!");
        return;
    }
    
    const amountToUse = parseFloat(prompt(`Crédit disponible: ${creditAccount.balance} Gdes\nMontant à utiliser:`, creditAccount.balance));
    
    if (!amountToUse || amountToUse <= 0 || amountToUse > creditAccount.balance) {
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
            transaction.paymentTime = new Date().toLocaleTimeString('fr-FR');
        } else {
            transaction.status = 'partial';
        }
        
        // Ajouter à l'historique du crédit
        creditAccount.history.push({
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            amount: -amountToPay,
            type: 'credit_usage',
            by: state.currentUser.username,
            note: `Paiement de transaction ${transaction.id}`
        });
    }
    
    // Mettre à jour le solde du crédit
    creditAccount.balance -= (amountToUse - remainingCredit);
    
    alert(`Crédit utilisé: ${amountToUse - remainingCredit} Gdes\nNouveau solde: ${creditAccount.balance} Gdes`);
    searchAdminPatient();
}

// ==================== PARAMÈTRES ====================
function setupSettings() {
    updateSettingsDisplay();
    
    document.getElementById('add-medication-settings').addEventListener('click', addMedicationFromSettings);
    document.getElementById('hospital-logo').addEventListener('change', handleLogoUpload);
    document.getElementById('save-hospital-info-btn').addEventListener('click', saveHospitalInfo);
    
    document.getElementById('add-consultation-type').addEventListener('click', () => {
        const name = document.getElementById('new-consultation-type-name').value;
        const price = parseFloat(document.getElementById('new-consultation-type-price').value);
        const description = document.getElementById('new-consultation-type-description').value;
        
        if (!name || isNaN(price)) {
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
    });
    
    document.getElementById('add-vital-type').addEventListener('click', () => {
        const name = document.getElementById('new-vital-name').value;
        const unit = document.getElementById('new-vital-unit').value;
        const min = parseFloat(document.getElementById('new-vital-min').value);
        const max = parseFloat(document.getElementById('new-vital-max').value);
        
        if (!name || !unit || isNaN(min) || isNaN(max)) {
            alert("Veuillez remplir tous les champs correctement!");
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
    });
    
    document.getElementById('add-lab-analysis-type').addEventListener('click', () => {
        const name = document.getElementById('new-lab-analysis-name').value;
        const price = parseFloat(document.getElementById('new-lab-analysis-price').value);
        const type = document.getElementById('new-lab-analysis-type').value;
        
        if (!name || isNaN(price)) {
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
    });
    
    document.getElementById('add-external-service-type').addEventListener('click', () => {
        const name = document.getElementById('new-external-service-type-name').value;
        const price = parseFloat(document.getElementById('new-external-service-type-price').value);
        
        if (!name || isNaN(price)) {
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
        updateExternalServicesSelect();
        updateExternalServicesOptions();
    });
    
    document.getElementById('add-user').addEventListener('click', () => {
        const name = document.getElementById('new-user-name').value;
        const role = document.getElementById('new-user-role').value;
        const username = document.getElementById('new-user-username').value;
        const password = document.getElementById('new-user-password').value;
        
        if (!name || !role || !username || !password) {
            alert("Veuillez remplir tous les champs!");
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
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        state.hospitalLogo = e.target.result;
        document.getElementById('logo-preview').src = e.target.result;
        document.getElementById('logo-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function saveHospitalInfo() {
    const name = document.getElementById('hospital-name').value;
    const address = document.getElementById('hospital-address').value;
    const phone = document.getElementById('hospital-phone').value;
    
    document.getElementById('hospital-name-header').textContent = name;
    document.getElementById('hospital-address-header').textContent = address;
    document.getElementById('hospital-name-login').textContent = name;
    
    alert("Informations de l'hôpital enregistrées!");
}

function addMedicationFromSettings() {
    const name = document.getElementById('new-medication-name').value.trim();
    const price = parseFloat(document.getElementById('new-medication-price').value);
    const quantity = parseInt(document.getElementById('new-medication-quantity').value);
    const alertThreshold = parseInt(document.getElementById('new-medication-alert').value);
    
    if (!name || isNaN(price) || isNaN(quantity) || isNaN(alertThreshold)) {
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
    
    document.getElementById('new-medication-name').value = '';
    document.getElementById('new-medication-price').value = '';
    document.getElementById('new-medication-quantity').value = '';
    document.getElementById('new-medication-alert').value = '';
    
    if (typeof updateMedicationStock === 'function') updateMedicationStock();
    updateMedicationsSettingsList();
    alert("Médicament ajouté avec succès!");
}

function updateMedicationsSettingsList() {
    const container = document.getElementById('medications-settings-list');
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
    if (confirm("Supprimer ce médicament?")) {
        state.medicationStock = state.medicationStock.filter(m => m.id !== medId);
        if (typeof updateMedicationStock === 'function') updateMedicationStock();
        updateMedicationsSettingsList();
    }
}

function updateSettingsDisplay() {
    const consultationList = document.getElementById('consultation-types-list');
    let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Description</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.consultationTypes.forEach(type => {
        html += `
            <tr>
                <td>${type.name}</td>
                <td><input type="number" class="form-control consultation-price-input" data-id="${type.id}" value="${type.price}" style="width:100px;"></td>
                <td><input type="text" class="form-control consultation-desc-input" data-id="${type.id}" value="${type.description}" style="width:200px;"></td>
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
    
    const vitalsList = document.getElementById('vitals-types-list');
    html = '<table class="table-container"><thead><tr><th>Nom</th><th>Unité</th><th>Valeur min</th><th>Valeur max</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.vitalTypes.forEach(vital => {
        html += `
            <tr>
                <td>${vital.name}</td>
                <td>${vital.unit}</td>
                <td>${vital.min}</td>
                <td>${vital.max}</td>
                <td><input type="checkbox" ${vital.active ? 'checked' : ''} onchange="toggleVitalType(${vital.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editVitalType(${vital.id})">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteVitalType(${vital.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    vitalsList.innerHTML = html;
    
    const labList = document.getElementById('lab-analyses-types-list');
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
    
    const externalList = document.getElementById('external-services-types-list');
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
    
    updateUsersList();
    
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
}

function toggleConsultationType(id, active) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (type) {
        type.active = active;
        if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
        if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
    }
}

function deleteConsultationType(id) {
    if (confirm("Supprimer ce type de consultation?")) {
        state.consultationTypes = state.consultationTypes.filter(t => t.id !== id);
        updateSettingsDisplay();
    }
}

function toggleVitalType(id, active) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (vital) {
        vital.active = active;
    }
}

function deleteVitalType(id) {
    if (confirm("Supprimer ce signe vital?")) {
        state.vitalTypes = state.vitalTypes.filter(v => v.id !== id);
        updateSettingsDisplay();
    }
}

function saveLabAnalysisType(id) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (!analysis) return;
    
    const priceInput = document.querySelector(`.analysis-price-input[data-id="${id}"]`);
    analysis.price = parseFloat(priceInput.value);
    
    alert("Analyse enregistrée!");
}

function toggleLabAnalysisType(id, active) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (analysis) {
        analysis.active = active;
    }
}

function deleteLabAnalysisType(id) {
    if (confirm("Supprimer cette analyse?")) {
        state.labAnalysisTypes = state.labAnalysisTypes.filter(a => a.id !== id);
        updateSettingsDisplay();
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
}

function toggleExternalServiceType(id, active) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (service) {
        service.active = active;
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    }
}

function deleteExternalServiceType(id) {
    if (confirm("Supprimer ce service externe?")) {
        state.externalServiceTypes = state.externalServiceTypes.filter(s => s.id != id);
        updateSettingsDisplay();
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    }
}

function toggleUser(id, active) {
    const user = state.users.find(u => u.id === id);
    if (user) {
        user.active = active;
    }
}

function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const newPassword = prompt(`Nouveau mot de passe pour ${user.name}:`, user.password);
    if (newPassword !== null) {
        user.password = newPassword;
        alert("Mot de passe modifié!");
        updateSettingsDisplay();
    }
}

function deleteUser(id) {
    if (id <= 7) {
        alert("Impossible de supprimer les utilisateurs par défaut!");
        return;
    }
    
    if (confirm("Supprimer cet utilisateur?")) {
        state.users = state.users.filter(u => u.id !== id);
        updateSettingsDisplay();
        updateMessageRecipients();
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
    select.innerHTML = '<option value="">Nouveau message...</option><option value="all">Tous les utilisateurs</option><option value="all-doctors">Tous les médecins</option><option value="all-nurses">Tous les infirmiers</option><option value="all-secretaries">Tous les secrétaires</option><option value="all-cashiers">Tous les caissiers</option><option value="all-labs">Tout le laboratoire</option><option value="all-pharmacies">Toute la pharmacie</option><option value="all-admins">Tous les administrateurs</option>';
    
    state.users.forEach(user => {
        if (user.active && user.username !== state.currentUser.username) {
            select.innerHTML += `<option value="${user.username}">${user.name} (${user.role})</option>`;
        }
    });
}

function loadConversations() {
    const container = document.getElementById('conversations-container');
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
    
    document.getElementById('current-conversation-title').textContent = `Conversation avec ${displayName}`;
    
    const container = document.getElementById('chat-messages');
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
    
    document.getElementById('chat-input-container').classList.remove('hidden');
    document.getElementById('message-input').focus();
    
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
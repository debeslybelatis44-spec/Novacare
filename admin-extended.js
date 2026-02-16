// Module Administration - Fonctions étendues
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-patient-search')) {
        setupAdminExtended();
    }
    if (document.getElementById('employee-select')) {
        updateEmployeeSelect();
        updateEmployeePaymentsHistory();
    }
});

function setupAdminExtended() {
    document.getElementById('add-credit-btn')?.addEventListener('click', addPatientCredit);
    document.getElementById('transfer-petty-cash')?.addEventListener('click', transferToPettyCash);
    document.getElementById('view-credit-history')?.addEventListener('click', viewCreditHistory);
    document.getElementById('edit-transaction-btn')?.addEventListener('click', editTransaction);
    document.getElementById('delete-transaction-btn')?.addEventListener('click', deleteTransaction);
    document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);
    document.getElementById('generate-user-report-btn')?.addEventListener('click', generateUserReport);
    document.getElementById('export-report-csv')?.addEventListener('click', exportReportToCSV);
    document.getElementById('view-cashier-balances')?.addEventListener('click', viewCashierBalances);
    document.getElementById('adjust-cashier-balance')?.addEventListener('click', adjustCashierBalance);
    document.getElementById('add-supplier')?.addEventListener('click', addSupplier);
    document.getElementById('pay-employee-btn')?.addEventListener('click', payEmployee);
    
    updateSuppliersList();
    updateAdminExtendedDisplay();
    updatePaymentMethodBalancesDisplay();
}

function updateAdminExtendedDisplay() {
    const mainCashElement = document.getElementById('main-cash-balance');
    const pettyCashElement = document.getElementById('petty-cash-balance');
    
    if (mainCashElement) mainCashElement.textContent = state.mainCash.toLocaleString() + ' Gdes';
    if (pettyCashElement) pettyCashElement.textContent = state.pettyCash.toLocaleString() + ' Gdes';
    
    updateUserTransactionTotals();
}

function updatePaymentMethodBalancesDisplay() {
    document.getElementById('cash-balance').textContent = (state.paymentMethodBalances?.cash || 0).toLocaleString() + ' Gdes';
    document.getElementById('moncash-balance').textContent = (state.paymentMethodBalances?.moncash || 0).toLocaleString() + ' Gdes';
    document.getElementById('natcash-balance').textContent = (state.paymentMethodBalances?.natcash || 0).toLocaleString() + ' Gdes';
    document.getElementById('card-balance').textContent = (state.paymentMethodBalances?.card || 0).toLocaleString() + ' Gdes';
    document.getElementById('external-balance').textContent = (state.paymentMethodBalances?.external || 0).toLocaleString() + ' Gdes';
}

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
    
    if (!patient.hasCreditPrivilege) {
        alert("Le patient n'a pas le privilège crédit! Veuillez d'abord lui attribuer ce privilège.");
        return;
    }
    
    patient.creditLimit = (patient.creditLimit || 0) + creditAmount;
    
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
    
    state.creditAccounts[patientId].history.push({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR'),
        amount: creditAmount,
        type: 'credit_augmentation',
        by: state.currentUser.username,
        note: creditNote || 'Crédit ajouté manuellement'
    });
    
    alert(`Crédit de ${creditAmount} Gdes ajouté au patient ${patient.fullName}. Nouvelle limite: ${patient.creditLimit} Gdes`);
    
    document.getElementById('credit-amount').value = '';
    document.getElementById('credit-note').value = '';
    
    searchAdminPatient();
    updateCreditDisplay(patientId);
}

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
        
        updateAdminExtendedDisplay();
        document.getElementById('petty-cash-amount').value = '';
    }
}

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
    
    if (transaction.status === 'paid') {
        const difference = newAmount - oldAmount;
        
        if (state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance += difference;
        }
        
        state.mainCash += difference;
        if (transaction.paymentMethod && state.paymentMethodBalances[transaction.paymentMethod] !== undefined) {
            state.paymentMethodBalances[transaction.paymentMethod] += difference;
        }
    }
    
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
    updatePaymentMethodBalancesDisplay();
}

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
    
    if (state.currentRole === 'responsible' && !state.roles.responsible.canDeleteAllTransactions) {
        alert("Vous n'avez pas la permission de supprimer les transactions!");
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette transaction?\n${transaction.service} - ${transaction.amount} Gdes`)) {
        return;
    }
    
    if (transaction.status === 'paid') {
        state.mainCash -= transaction.amount;
        
        if (transaction.paymentMethod && state.paymentMethodBalances[transaction.paymentMethod] !== undefined) {
            state.paymentMethodBalances[transaction.paymentMethod] -= transaction.amount;
        }
        
        if (state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance -= transaction.amount;
        }
    }
    
    state.transactions = state.transactions.filter(t => t.id !== transactionId);
    
    alert("Transaction supprimée avec succès!");
    updateAdminStats();
    updateRecentTransactions();
    updatePaymentMethodBalancesDisplay();
}

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
    
    displayReport(title, reportData);
}

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
        paymentMethodBalances: state.paymentMethodBalances,
        creditAccountsTotal: Object.values(state.creditAccounts).reduce((sum, acc) => sum + (acc.balance || 0), 0)
    };
}

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
                <h5>Soldes par mode de paiement :</h5>
                <ul>
                    <li>Espèces : ${data.paymentMethodBalances?.cash.toLocaleString()} Gdes</li>
                    <li>MonCash : ${data.paymentMethodBalances?.moncash.toLocaleString()} Gdes</li>
                    <li>NatCash : ${data.paymentMethodBalances?.natcash.toLocaleString()} Gdes</li>
                    <li>Carte : ${data.paymentMethodBalances?.card.toLocaleString()} Gdes</li>
                    <li>Externe : ${data.paymentMethodBalances?.external.toLocaleString()} Gdes</li>
                </ul>
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

function selectTransactionForEdit(transactionId) {
    document.getElementById('selected-transaction-id').value = transactionId;
    alert(`Transaction ${transactionId} sélectionnée pour modification`);
}

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
            rows.push(["Espèces", financialData.paymentMethodBalances?.cash]);
            rows.push(["MonCash", financialData.paymentMethodBalances?.moncash]);
            rows.push(["NatCash", financialData.paymentMethodBalances?.natcash]);
            rows.push(["Carte", financialData.paymentMethodBalances?.card]);
            rows.push(["Externe", financialData.paymentMethodBalances?.external]);
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
    
    const unpaidTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.status === 'unpaid' &&
        !t.isCredit
    );
    
    if (unpaidTransactions.length === 0) {
        alert("Ce patient n'a pas de transactions impayées!");
        return;
    }
    
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
        
        creditAccount.used += amountToPay;
        creditAccount.available -= amountToPay;
        
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
    
    const patient = state.patients.find(p => p.id === patientId);
    if (patient) {
        patient.creditUsed = creditAccount.used;
    }
    
    alert(`Crédit utilisé: ${amountToUse - remainingCredit} Gdes\nNouveau solde disponible: ${creditAccount.available} Gdes`);
    searchAdminPatient();
}

// Paiement des employés
function updateEmployeeSelect() {
    const select = document.getElementById('employee-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choisir un employé</option>';
    state.users.forEach(user => {
        if (user.active && user.role !== 'admin' && user.role !== 'responsible') {
            select.innerHTML += `<option value="${user.username}">${user.name} (${user.role})</option>`;
        }
    });
}

function payEmployee() {
    const username = document.getElementById('employee-select').value;
    const method = document.getElementById('employee-payment-method').value;
    const amount = parseFloat(document.getElementById('employee-payment-amount').value);
    
    if (!username || !method || !amount || amount <= 0) {
        alert("Veuillez remplir tous les champs !");
        return;
    }
    
    if (state.paymentMethodBalances[method] < amount) {
        alert(`Fonds insuffisants dans le mode ${method} !`);
        return;
    }
    
    if (confirm(`Payer ${amount} Gdes à ${username} via ${method} ?`)) {
        state.paymentMethodBalances[method] -= amount;
        state.mainCash -= amount;
        
        const payment = {
            id: 'EMP' + Date.now(),
            username: username,
            amount: amount,
            method: method,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            by: state.currentUser.username
        };
        if (!state.employeePayments) state.employeePayments = [];
        state.employeePayments.push(payment);
        
        alert("Paiement enregistré !");
        updateEmployeePaymentsHistory();
        updatePaymentMethodBalancesDisplay();
        updateAdminExtendedDisplay();
        document.getElementById('employee-payment-amount').value = '';
    }
}

function updateEmployeePaymentsHistory() {
    const container = document.getElementById('employee-payments-history');
    if (!container) return;
    
    let html = '';
    (state.employeePayments || []).slice().reverse().forEach(p => {
        html += `<tr><td>${p.username}</td><td>${p.amount} Gdes</td><td>${p.date} ${p.time}</td><td>${p.method}</td></tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="4" class="text-center">Aucun paiement</td></tr>';
}

// Gestion des fournisseurs
function addSupplier() {
    const name = document.getElementById('new-supplier-name').value.trim();
    const type = document.getElementById('new-supplier-type').value;
    const contact = document.getElementById('new-supplier-contact').value.trim();
    
    if (!name || !type) {
        alert("Veuillez entrer au moins le nom et le type du fournisseur !");
        return;
    }
    
    const newSupplier = {
        id: Date.now(),
        name: name,
        type: type,
        contact: contact
    };
    
    state.suppliers.push(newSupplier);
    document.getElementById('new-supplier-name').value = '';
    document.getElementById('new-supplier-contact').value = '';
    updateSuppliersList();
    saveStateToLocalStorage();
    alert("Fournisseur ajouté !");
}

function updateSuppliersList() {
    const container = document.getElementById('suppliers-list');
    if (!container) return;
    
    let html = '';
    state.suppliers.forEach(s => {
        html += `<tr><td>${s.name}</td><td>${s.type === 'credit' ? 'Crédit' : 'Comptant'}</td><td>${s.contact || ''}</td><td><button class="btn btn-sm btn-danger" onclick="deleteSupplier(${s.id})">Supprimer</button></td></tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="4" class="text-center">Aucun fournisseur</td></tr>';
}

function deleteSupplier(id) {
    if (confirm("Supprimer ce fournisseur ?")) {
        state.suppliers = state.suppliers.filter(s => s.id !== id);
        updateSuppliersList();
        saveStateToLocalStorage();
    }
}

window.viewCreditHistory = viewCreditHistory;
window.usePatientCreditPrompt = usePatientCreditPrompt;
window.selectTransactionForEdit = selectTransactionForEdit;
window.deleteSupplier = deleteSupplier;
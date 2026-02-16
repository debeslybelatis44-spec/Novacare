// Module Administration - Fonctions principales
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-patient-search')) {
        setupAdmin();
    }
});

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
    
    // Remplir les notes
    document.getElementById('patient-allergies-admin').value = patient.allergies || '';
    document.getElementById('patient-notes-admin').value = patient.notes || '';
    
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
                    <button class="btn btn-sm btn-warning" onclick="selectTransactionForEdit('${t.id}')">Sélectionner</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;
    
    // Afficher le crédit du patient (fonction dans admin-extended.js)
    updateCreditDisplay(patientId);
}

function savePatientNotes() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    patient.allergies = document.getElementById('patient-allergies-admin').value;
    patient.notes = document.getElementById('patient-notes-admin').value;
    
    alert("Notes du patient mises à jour !");
    saveStateToLocalStorage();
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

// Rendre accessibles les fonctions nécessaires
window.savePatientNotes = savePatientNotes;
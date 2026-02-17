// Module Administration, Paramètres et Messagerie

// Son de notification long et fort (4 secondes) - pour cohérence
function playNotificationSound(duration = 4000, volume = 0.9) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = volume;
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {
        console.warn("Web Audio API not supported, fallback to simple beep");
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
            audio.volume = volume;
            audio.play().catch(e => console.log('Son bloqué par le navigateur'));
        } catch (e) {}
    }
}

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
    const input = document.getElementById('admin-patient-search').value.trim();
    if (!input) {
        alert("Veuillez entrer un ID patient, un nom ou un ID de transaction.");
        return;
    }

    // 1. Recherche par ID patient exact
    let patient = state.patients.find(p => p.id === input);
    if (patient) {
        displayPatientAdmin(patient);
        return;
    }

    // 2. Recherche par ID de transaction (commence par 'TR')
    if (input.toUpperCase().startsWith('TR')) {
        const transaction = state.transactions.find(t => t.id.toUpperCase() === input.toUpperCase());
        if (transaction) {
            displayTransactionForEdit(transaction);
            return;
        }
    }

    // 3. Recherche par nom de patient (contient)
    patient = state.patients.find(p => 
        p.fullName.toLowerCase().includes(input.toLowerCase())
    );
    if (patient) {
        displayPatientAdmin(patient);
        return;
    }

    alert("Aucun patient ou transaction trouvé avec cette référence.");
    document.getElementById('admin-patient-details').classList.add('hidden');
}

// Affiche les détails d'un patient
function displayPatientAdmin(patient) {
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
    
    // Forcer l'ID dans le champ de recherche pour les opérations ultérieures
    document.getElementById('admin-patient-search').value = patient.id;
    document.getElementById('admin-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('admin-patient-details').classList.remove('hidden');
    
    // Remplir les champs de notes
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
                    <button class="btn btn-sm btn-warning" onclick="editTransaction('${t.id}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${t.id}')">Supprimer</button>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;
    
    // Afficher le crédit du patient
    updateCreditDisplay(patient.id);
}

// Affiche une transaction individuelle pour modification (ancienne méthode, conservée pour compatibilité)
function displayTransactionForEdit(transaction) {
    // On remplit le champ caché
    document.getElementById('selected-transaction-id').value = transaction.id;
    
    // On affiche un résumé
    const html = `
        <div class="card">
            <h4>Transaction ${transaction.id}</h4>
            <p><strong>Patient :</strong> ${transaction.patientName} (${transaction.patientId})</p>
            <p><strong>Service :</strong> ${transaction.service}</p>
            <p><strong>Montant :</strong> ${transaction.amount} Gdes</p>
            <p><strong>Statut :</strong> ${transaction.status}</p>
            <p><strong>Date :</strong> ${transaction.date} ${transaction.time}</p>
            <div class="mt-2">
                <button class="btn btn-warning" onclick="editTransaction('${transaction.id}')">Modifier</button>
                <button class="btn btn-danger" onclick="deleteTransaction('${transaction.id}')">Supprimer</button>
            </div>
        </div>
    `;
    document.getElementById('admin-patient-details').classList.remove('hidden');
    document.getElementById('admin-patient-name').textContent = `Transaction ${transaction.id}`;
    document.getElementById('admin-patient-history').innerHTML = html;
    // Cacher les sections de privilèges
    document.getElementById('privilege-type').closest('.card')?.classList.add('hidden');
}

// Sauvegarde des notes du patient (nouvelle fonction)
function savePatientNotes() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    if (!patientId) {
        alert("Aucun patient sélectionné !");
        return;
    }

    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient introuvable !");
        return;
    }

    const allergies = document.getElementById('patient-allergies-admin').value.trim();
    const notes = document.getElementById('patient-notes-admin').value.trim();

    patient.allergies = allergies;
    patient.notes = notes;

    saveStateToLocalStorage();
    alert("Notes du patient enregistrées avec succès !");
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
                    <button class="btn btn-sm btn-warning" onclick="editTransaction('${transaction.id}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${transaction.id}')">Supprimer</button>
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
    
    // Gestion des transactions (les boutons directs sont maintenant dans les listes)
    document.getElementById('edit-transaction-btn')?.addEventListener('click', () => {
        const id = document.getElementById('selected-transaction-id').value;
        if (id) editTransaction(id);
    });
    document.getElementById('delete-transaction-btn')?.addEventListener('click', () => {
        const id = document.getElementById('selected-transaction-id').value;
        if (id) deleteTransaction(id);
    });
    
    // Rapports
    document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);
    document.getElementById('generate-user-report-btn')?.addEventListener('click', generateUserReport);
    document.getElementById('export-report-csv')?.addEventListener('click', exportReportToCSV);
    
    // Gestion des caisses
    document.getElementById('view-cashier-balances')?.addEventListener('click', viewCashierBalances);
    document.getElementById('adjust-cashier-balance')?.addEventListener('click', adjustCashierBalance);
    
    // Gestion des fournisseurs
    document.getElementById('manage-suppliers-btn')?.addEventListener('click', showSupplierManagement);
    
    // Paiement des employés
    document.getElementById('pay-employee-btn')?.addEventListener('click', showEmployeePayment);
    
    // Initialiser l'affichage
    updateAdminExtendedDisplay();
    
    // Initialiser les structures si elles n'existent pas
    if (!state.suppliers) state.suppliers = [];
    if (!state.employeePayments) state.employeePayments = [];
}

// ==================== GESTION DES FOURNISSEURS ====================
function showSupplierManagement() {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `
        <div class="transaction-details-content" style="max-width: 800px;">
            <h3>Gestion des fournisseurs</h3>
            <button class="btn btn-success mb-3" onclick="addSupplier()">Nouveau fournisseur</button>
            <div id="supplier-list-container">
                ${renderSupplierList()}
            </div>
            <button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderSupplierList() {
    if (!state.suppliers || state.suppliers.length === 0) {
        return '<p>Aucun fournisseur enregistré.</p>';
    }
    let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Adresse</th><th>Type vente</th><th>Marchandises</th><th>Date paiement</th><th>Montant dû</th><th>Actions</th></tr></thead><tbody>';
    state.suppliers.forEach(s => {
        html += `
            <tr>
                <td>${s.name}</td>
                <td>${s.address || '-'}</td>
                <td>${s.saleType === 'cash' ? 'Comptant' : s.saleType === 'credit' ? 'Crédit' : 'Les deux'}</td>
                <td>${s.goods || '-'}</td>
                <td>${s.paymentDate || '-'}</td>
                <td>${s.amountDue || 0} Gdes</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editSupplier('${s.id}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier('${s.id}')">Supprimer</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    return html;
}

function addSupplier() {
    showSupplierForm(null);
}

function editSupplier(id) {
    const supplier = state.suppliers.find(s => s.id == id);
    if (supplier) showSupplierForm(supplier);
}

function showSupplierForm(supplier) {
    const isEdit = !!supplier;
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `
        <div class="transaction-details-content" style="max-width: 500px;">
            <h3>${isEdit ? 'Modifier' : 'Ajouter'} un fournisseur</h3>
            <form id="supplier-form">
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="supplier-name" class="form-control" value="${supplier?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Adresse</label>
                    <input type="text" id="supplier-address" class="form-control" value="${supplier?.address || ''}">
                </div>
                <div class="form-group">
                    <label>Type de vente *</label>
                    <select id="supplier-sale-type" class="form-control">
                        <option value="cash" ${supplier?.saleType === 'cash' ? 'selected' : ''}>Comptant</option>
                        <option value="credit" ${supplier?.saleType === 'credit' ? 'selected' : ''}>Crédit</option>
                        <option value="both" ${supplier?.saleType === 'both' ? 'selected' : ''}>Les deux</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Types de marchandises fournies</label>
                    <input type="text" id="supplier-goods" class="form-control" value="${supplier?.goods || ''}" placeholder="ex: médicaments, matériel">
                </div>
                <div class="form-group">
                    <label>Date de paiement prévue</label>
                    <input type="date" id="supplier-payment-date" class="form-control" value="${supplier?.paymentDate || ''}">
                </div>
                <div class="form-group">
                    <label>Montant total à payer (Gdes)</label>
                    <input type="number" step="0.01" id="supplier-amount-due" class="form-control" value="${supplier?.amountDue || 0}">
                </div>
                <div class="mt-3">
                    <button type="button" class="btn btn-success" onclick="saveSupplier(${isEdit ? supplier.id : 'null'})">Enregistrer</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">Annuler</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveSupplier(id) {
    const name = document.getElementById('supplier-name').value.trim();
    if (!name) {
        alert("Le nom est obligatoire.");
        return;
    }
    const address = document.getElementById('supplier-address').value.trim();
    const saleType = document.getElementById('supplier-sale-type').value;
    const goods = document.getElementById('supplier-goods').value.trim();
    const paymentDate = document.getElementById('supplier-payment-date').value;
    const amountDue = parseFloat(document.getElementById('supplier-amount-due').value) || 0;

    const supplierData = {
        id: id === 'null' ? Date.now() : id,
        name,
        address,
        saleType,
        goods,
        paymentDate,
        amountDue
    };

    if (id === 'null') {
        state.suppliers.push(supplierData);
    } else {
        const index = state.suppliers.findIndex(s => s.id == id);
        if (index !== -1) state.suppliers[index] = supplierData;
    }

    document.querySelector('.transaction-details-modal').remove();
    showSupplierManagement();
    saveStateToLocalStorage();
    alert("Fournisseur enregistré.");
}

function deleteSupplier(id) {
    if (confirm("Supprimer ce fournisseur ?")) {
        state.suppliers = state.suppliers.filter(s => s.id != id);
        showSupplierManagement();
        saveStateToLocalStorage();
    }
}

// ==================== PAIEMENT DES EMPLOYÉS ====================
function showEmployeePayment() {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `
        <div class="transaction-details-content" style="max-width: 600px;">
            <h3>Paiement des employés</h3>
            <div id="employee-payment-list">
                ${renderEmployeePaymentList()}
            </div>
            <button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderEmployeePaymentList() {
    if (!state.users || state.users.length === 0) return '<p>Aucun employé.</p>';

    let html = '<table class="table-container"><thead><tr><th>Employé</th><th>Rôle</th><th>Dernier paiement</th><th>Actions</th></tr></thead><tbody>';
    state.users.forEach(user => {
        const payments = state.employeePayments?.filter(p => p.employeeId === user.id) || [];
        const lastPayment = payments.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
        const lastDate = lastPayment ? new Date(lastPayment.date).toLocaleDateString('fr-FR') + ' - ' + lastPayment.amount + ' Gdes' : 'Aucun';
        
        html += `
            <tr>
                <td>${user.name} (${user.username})</td>
                <td>${user.role}</td>
                <td>${lastDate}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="payEmployee('${user.id}')">Payer</button>
                    <button class="btn btn-sm btn-info" onclick="viewEmployeePayments('${user.id}')">Historique</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    return html;
}

function payEmployee(employeeId) {
    const employee = state.users.find(u => u.id == employeeId);
    if (!employee) return;

    const amount = parseFloat(prompt(`Montant à payer à ${employee.name} (Gdes) :`, "0"));
    if (isNaN(amount) || amount <= 0) {
        alert("Montant invalide.");
        return;
    }

    const date = prompt("Date du paiement (YYYY-MM-DD) :", new Date().toISOString().split('T')[0]);
    if (!date) return;

    const payment = {
        id: 'PAY' + Date.now(),
        employeeId: employeeId,
        employeeName: employee.name,
        amount: amount,
        date: date,
        recordedBy: state.currentUser.username,
        timestamp: new Date().toISOString()
    };
    if (!state.employeePayments) state.employeePayments = [];
    state.employeePayments.push(payment);

    if (confirm("Déduire ce montant de la grande caisse ?")) {
        if (state.mainCash >= amount) {
            state.mainCash -= amount;
        } else {
            alert("Fonds insuffisants dans la grande caisse.");
        }
    }

    saveStateToLocalStorage();
    alert("Paiement enregistré.");
    showEmployeePayment();
}

function viewEmployeePayments(employeeId) {
    const employee = state.users.find(u => u.id == employeeId);
    const payments = state.employeePayments?.filter(p => p.employeeId == employeeId) || [];
    payments.sort((a,b) => new Date(b.date) - new Date(a.date));

    let html = `<h4>Historique des paiements - ${employee.name}</h4>`;
    if (payments.length === 0) {
        html += '<p>Aucun paiement enregistré.</p>';
    } else {
        html += '<table class="table-container"><thead><tr><th>Date</th><th>Montant</th><th>Enregistré par</th></tr></thead><tbody>';
        payments.forEach(p => {
            html += `<tr><td>${p.date}</td><td>${p.amount} Gdes</td><td>${p.recordedBy}</td></tr>`;
        });
        html += '</tbody></table>';
    }
    html += '<button class="btn btn-secondary mt-2" onclick="this.closest(\'.transaction-details-modal\').remove()">Fermer</button>';

    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${html}</div>`;
    document.body.appendChild(modal);
}

// ==================== FIN DES AJOUTS ====================

function updateAdminExtendedDisplay() {
    const mainCashElement = document.getElementById('main-cash-balance');
    const pettyCashElement = document.getElementById('petty-cash-balance');
    
    if (mainCashElement) mainCashElement.textContent = state.mainCash.toLocaleString() + ' Gdes';
    if (pettyCashElement) pettyCashElement.textContent = state.pettyCash.toLocaleString() + ' Gdes';
    
    updateUserTransactionTotals();
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

// Modifier une transaction (peut être appelée directement avec un ID)
function editTransaction(transactionId) {
    if (!transactionId) {
        transactionId = document.getElementById('selected-transaction-id').value;
    }
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
}

// Supprimer une transaction (peut être appelée directement avec un ID)
function deleteTransaction(transactionId) {
    if (!transactionId) {
        transactionId = document.getElementById('selected-transaction-id').value;
    }
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
        
        if (state.cashierBalances[transaction.paymentAgent]) {
            state.cashierBalances[transaction.paymentAgent].balance -= transaction.amount;
        }
    }
    
    state.transactions = state.transactions.filter(t => t.id !== transactionId);
    
    alert("Transaction supprimée avec succès!");
    updateAdminStats();
    updateRecentTransactions();
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
                    <button class="btn btn-warning btn-sm" onclick="editTransaction('${t.id}')">Modifier</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">Supprimer</button>
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

// ==================== PARAMÈTRES ====================
function setupSettings() {
    updateSettingsDisplay();
    
    document.getElementById('add-medication-settings').addEventListener('click', addMedicationFromSettings);
    document.getElementById('hospital-logo').addEventListener('change', handleLogoUpload);
    document.getElementById('save-hospital-info-btn').addEventListener('click', saveHospitalInfo);
    
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
    
    document.getElementById('add-user').addEventListener('click', () => {
        const name = document.getElementById('new-user-name').value.trim();
        const role = document.getElementById('new-user-role').value;
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-password').value;
        
        if (!name || !role || !username || !password) {
            alert("Veuillez remplir tous les champs!");
            return;
        }
        
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
    
    const vitalsList = document.getElementById('vitals-types-list');
    if (vitalsList) {
        let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Unité</th><th>Valeur min</th><th>Valeur max</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
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
    
    const labList = document.getElementById('lab-analyses-types-list');
    if (labList) {
        let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Type résultat</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
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
    
    const externalList = document.getElementById('external-services-types-list');
    if (externalList) {
        let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
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
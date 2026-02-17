// ==================== RESPONSABLE (rôle restreint) ====================
// Fichier: responsible.js
// Dépendances: state, fonctions utilitaires (updateAdminStats, updateCharts, etc.)

document.addEventListener('DOMContentLoaded', () => {
    // Le responsable utilise la même section #administration mais avec ses propres gestionnaires
    if (document.getElementById('admin-patient-search')) {
        // On attend que le rôle soit déterminé (après login)
        // L'initialisation réelle se fera dans setupResponsible() appelé depuis auth.js
    }
});

// Point d'entrée principal – à appeler depuis auth.js après connexion en tant que 'responsible'
function setupResponsible() {
    if (state.currentRole !== 'responsible') return;

    console.log('Initialisation du module Responsable');

    // 1. Masquer / désactiver les éléments interdits pour le responsable
    disableForbiddenElements();

    // 2. Remplacer les fonctions de statistiques par des versions sans montants
    window.updateAdminStats = respUpdateAdminStatsNoAmounts;
    window.updateCharts = respUpdateChartsNoAmounts;
    window.updateAdminExtendedDisplay = respUpdateAdminExtendedNoAmounts;

    // 3. Attacher nos propres écouteurs d'événements
    attachResponsibleEventListeners();

    // 4. Mettre à jour l'affichage (statistiques, caisses)
    respUpdateAdminDisplay();
}

// --------------------------------------
// Désactivation des actions non autorisées
// --------------------------------------
function disableForbiddenElements() {
    // Masquer les boutons de modification/suppression de transaction
    const editBtn = document.getElementById('edit-transaction-btn');
    const deleteBtn = document.getElementById('delete-transaction-btn');
    const adjustBtn = document.getElementById('adjust-cashier-balance');
    if (editBtn) editBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (adjustBtn) adjustBtn.style.display = 'none';

    // Désactiver les champs de modification de transaction dans l'historique
    // (sera géré dynamiquement dans respSearchPatient)

    // Remplacer le bouton de transfert standard par notre version avec motif
    const oldTransferBtn = document.getElementById('transfer-petty-cash');
    if (oldTransferBtn) {
        oldTransferBtn.style.display = 'none';
        // Ajouter notre interface de retrait motifé + agent
        addPettyCashWithdrawUI();
    }

    // Désactiver toute édition de transaction via les fonctions globales
    window.selectTransactionForEdit = function() {
        alert("Vous n'avez pas la permission de modifier les transactions.");
    };

    // --- MODIFICATION : Masquer la grande caisse (main cash) ---
    const mainCashBalance = document.getElementById('main-cash-balance');
    if (mainCashBalance) {
        mainCashBalance.style.display = 'none';
        // Optionnel : masquer aussi le label parent
        const parent = mainCashBalance.closest('.d-flex, .card, .balance-item');
        if (parent) parent.style.display = 'none';
    }

    // --- MODIFICATION : Masquer les montants des services dans d'éventuels affichages statiques ---
    // (les montants dans l'historique patient et les rapports sont traités ailleurs)
}

// --------------------------------------
// Interface de retrait petite caisse avec motifs et choix de l'agent
// --------------------------------------
function addPettyCashWithdrawUI() {
    const container = document.querySelector('#petty-cash-amount')?.closest('.d-flex');
    if (!container) return;

    // Créer le sélecteur d'agent (utilisateurs avec rôle caissier)
    const agentSelect = document.createElement('select');
    agentSelect.id = 'resp-petty-cash-agent';
    agentSelect.className = 'form-control';
    agentSelect.style.width = '200px';
    agentSelect.innerHTML = '<option value="">-- Agent ayant effectué le retrait --</option>';

    // Peupler la liste des agents (caissiers)
    if (state.users) {
        state.users
            .filter(user => user.role === 'cashier')
            .forEach(cashier => {
                const option = document.createElement('option');
                option.value = cashier.username;
                option.textContent = `${cashier.name} (${cashier.username})`;
                agentSelect.appendChild(option);
            });
    }

    // Créer le sélecteur de motif
    const reasonSelect = document.createElement('select');
    reasonSelect.id = 'resp-petty-cash-reason';
    reasonSelect.className = 'form-control';
    reasonSelect.style.width = '200px';
    reasonSelect.innerHTML = `
        <option value="">-- Motif du retrait --</option>
        <option value="fournitures">Achat fournitures de bureau</option>
        <option value="transport">Transport / Carburant</option>
        <option value="reparation">Réparation matériel</option>
        <option value="nourriture">Nourriture / Collations</option>
        <option value="menues">Menues dépenses</option>
        <option value="autre">Autre (préciser)</option>
    `;

    // Champ pour "autre" motif
    const otherReasonInput = document.createElement('input');
    otherReasonInput.type = 'text';
    otherReasonInput.id = 'resp-petty-cash-other';
    otherReasonInput.className = 'form-control';
    otherReasonInput.style.width = '200px';
    otherReasonInput.placeholder = 'Précisez le motif...';
    otherReasonInput.style.display = 'none';

    // Nouveau bouton de validation
    const withdrawBtn = document.createElement('button');
    withdrawBtn.id = 'resp-withdraw-petty-cash';
    withdrawBtn.className = 'btn btn-warning';
    withdrawBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Effectuer retrait';

    // Insérer les éléments dans l'ordre : agent, motif, autre, bouton
    container.appendChild(agentSelect);
    container.appendChild(reasonSelect);
    container.appendChild(otherReasonInput);
    container.appendChild(withdrawBtn);

    // Afficher le champ "autre" si l'option correspondante est choisie
    reasonSelect.addEventListener('change', function() {
        otherReasonInput.style.display = this.value === 'autre' ? 'block' : 'none';
    });

    // Écouteur du bouton de retrait
    withdrawBtn.addEventListener('click', respWithdrawFromPettyCash);
}

// --------------------------------------
// Écouteurs propres au responsable
// --------------------------------------
function attachResponsibleEventListeners() {
    // Recherche patient
    const searchBtn = document.getElementById('search-admin-patient');
    if (searchBtn) {
        // Remplacer l'ancien écouteur par le nôtre
        searchBtn.removeEventListener('click', searchAdminPatient);
        searchBtn.addEventListener('click', respSearchPatient);
    }

    // Sauvegarde des privilèges
    const savePrivBtn = document.getElementById('save-privilege');
    if (savePrivBtn) {
        savePrivBtn.removeEventListener('click', savePrivilege);
        savePrivBtn.addEventListener('click', respSavePrivilege);
    }

    // Changement du type de privilège (réutilisation de la même fonction car purement UI)
    const privilegeSelect = document.getElementById('privilege-type');
    if (privilegeSelect) {
        privilegeSelect.removeEventListener('change', privilegeSelect.change); // retirer ancien
        privilegeSelect.addEventListener('change', function() {
            const discountSection = document.getElementById('discount-section');
            const creditSection = document.getElementById('credit-section');
            if (this.value === 'sponsored') {
                discountSection.classList.remove('hidden');
                creditSection.classList.add('hidden');
            } else if (this.value === 'credit') {
                discountSection.classList.add('hidden');
                creditSection.classList.remove('hidden');
            } else {
                discountSection.classList.add('hidden');
                creditSection.classList.add('hidden');
            }
        });
    }

    // Gestion des crédits
    const addCreditBtn = document.getElementById('add-credit-btn');
    if (addCreditBtn) {
        addCreditBtn.removeEventListener('click', addPatientCredit);
        addCreditBtn.addEventListener('click', respAddPatientCredit);
    }

    const viewCreditHistoryBtn = document.getElementById('view-credit-history');
    if (viewCreditHistoryBtn) {
        viewCreditHistoryBtn.removeEventListener('click', viewCreditHistory);
        viewCreditHistoryBtn.addEventListener('click', respViewCreditHistory);
    }

    // Rapports - on utilise maintenant nos propres fonctions sans montants
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.removeEventListener('click', generateReport);
        generateReportBtn.addEventListener('click', respGenerateReportNoAmounts);
    }

    const generateUserReportBtn = document.getElementById('generate-user-report-btn');
    if (generateUserReportBtn) {
        generateUserReportBtn.removeEventListener('click', generateUserReport);
        generateUserReportBtn.addEventListener('click', respGenerateUserReportNoAmounts);
    }

    const exportCsvBtn = document.getElementById('export-report-csv');
    if (exportCsvBtn) {
        exportCsvBtn.removeEventListener('click', exportReportToCSV);
        exportCsvBtn.addEventListener('click', respExportReportToCSVNoAmounts);
    }

    // Soldes caissiers (lecture seule)
    const viewBalancesBtn = document.getElementById('view-cashier-balances');
    if (viewBalancesBtn) {
        viewBalancesBtn.removeEventListener('click', viewCashierBalances);
        viewBalancesBtn.addEventListener('click', respViewCashierBalances);
    }

    // Désactiver complètement la modification utilisateur
    const editUserBtn = document.querySelector('#users-list .btn-warning');
    if (editUserBtn) editUserBtn.style.display = 'none'; // sera géré dans updateUsersList si besoin
}

// ==================== FONCTIONS RESPONSABLE ====================

// Rechercher un patient (historique sans boutons d'action et SANS montants)
function respSearchPatient() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);

    if (!patient) {
        alert("Patient non trouvé !");
        document.getElementById('admin-patient-details').classList.add('hidden');
        return;
    }

    // Vérifier expiration des privilèges (identique à admin)
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

    // Afficher les infos patient
    document.getElementById('admin-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('admin-patient-details').classList.remove('hidden');

    // Mise à jour du selecteur de privilège (identique admin)
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

    // --- MODIFICATION : Historique des transactions – VERSION SANS MONTANTS ---
    const history = state.transactions.filter(t => t.patientId === patient.id);
    // En-tête sans la colonne Montant
    let html = '<table class="table-container"><thead><tr><th>Date</th><th>Service</th><th>Statut</th><th>Type</th></tr></thead><tbody>';
    if (history.length === 0) {
        html += '<tr><td colspan="4" class="text-center">Aucune transaction</td></tr>';
    } else {
        history.forEach(t => {
            html += `<tr>
                <td>${t.date}</td>
                <td>${t.service}</td>
                <td>${t.status}</td>
                <td>${t.type}</td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;

    // Afficher les informations de crédit
    respUpdateCreditDisplay(patientId);
}

// Sauvegarder les privilèges (identique à admin, mais sans appliquer de réduction aux transactions existantes)
function respSavePrivilege() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    const privilegeType = document.getElementById('privilege-type').value;
    const discountPercentage = parseInt(document.getElementById('discount-percentage').value) || 0;
    const creditAmount = parseFloat(document.getElementById('credit-amount-input').value) || 0;

    // Réinitialiser tous les privilèges
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
        alert("Patient marqué comme VIP (les prochains services seront gratuits)");
    } else if (privilegeType === 'sponsored') {
        patient.sponsored = true;
        patient.discountPercentage = discountPercentage;
        patient.privilegeGrantedDate = new Date().toISOString();
        alert(`Patient marqué comme sponsorisé avec ${discountPercentage}% de réduction (applicable aux futures transactions)`);
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

    // Rafraîchir l'affichage
    respSearchPatient();
}

// Ajouter du crédit à un patient (sans modification des transactions)
function respAddPatientCredit() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const creditAmount = parseFloat(document.getElementById('credit-amount').value);
    const creditNote = document.getElementById('credit-note').value;

    if (!patientId || !creditAmount || creditAmount <= 0) {
        alert("Veuillez saisir un ID patient et un montant valide !");
        return;
    }

    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé !");
        return;
    }

    if (!patient.hasCreditPrivilege) {
        alert("Le patient n'a pas le privilège crédit !");
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

    // Historique
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

    respSearchPatient();
    respUpdateCreditDisplay(patientId);
}

// Afficher l'historique des crédits (identique admin)
function respViewCreditHistory(patientId = null) {
    if (!patientId) {
        patientId = document.getElementById('admin-patient-search').value.trim();
    }
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount) {
        alert("Aucun compte crédit pour ce patient !");
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
                        </tr>
                    </thead>
                    <tbody>
                        ${creditAccount.history.map(record => `
                            <tr>
                                <td>${record.date} ${record.time}</td>
                                <td>${record.amount > 0 ? '+' : ''}${record.amount} Gdes</td>
                                <td>${record.type}</td>
                                <td>${record.by}</td>
                                <td>${record.note || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Retrait de la petite caisse avec motif obligatoire et agent sélectionné
function respWithdrawFromPettyCash() {
    const amount = parseFloat(document.getElementById('petty-cash-amount').value);
    const agentSelect = document.getElementById('resp-petty-cash-agent');
    const agent = agentSelect.value;
    const reasonSelect = document.getElementById('resp-petty-cash-reason');
    const otherInput = document.getElementById('resp-petty-cash-other');
    let reason = reasonSelect.value;

    if (!agent) {
        alert("Veuillez sélectionner l'agent qui a effectué le retrait !");
        return;
    }
    if (!reason) {
        alert("Veuillez sélectionner un motif de retrait !");
        return;
    }
    if (reason === 'autre' && !otherInput.value.trim()) {
        alert("Veuillez préciser le motif du retrait.");
        return;
    }
    if (reason === 'autre') {
        reason = otherInput.value.trim();
    }

    if (!amount || amount <= 0) {
        alert("Veuillez saisir un montant valide !");
        return;
    }
    if (amount > state.pettyCash) {
        alert("Fonds insuffisants dans la petite caisse !");
        return;
    }

    if (confirm(`Retirer ${amount} Gdes de la petite caisse pour le motif : "${reason}" (agent: ${agent}) ?`)) {
        state.pettyCash -= amount;

        // Enregistrer la dépense avec l'agent choisi
        const expenseRecord = {
            id: 'EXP' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            amount: -amount,
            reason: reason,
            by: agent,               // ← l'agent sélectionné
            requestedBy: state.currentUser.username, // le responsable qui initie
            type: 'petty_cash_withdrawal'
        };

        if (!state.reports) state.reports = [];
        state.reports.push(expenseRecord);

        alert(`Retrait de ${amount} Gdes effectué avec succès. Motif: ${reason}, Agent: ${agent}`);

        document.getElementById('petty-cash-amount').value = '';
        agentSelect.value = '';
        reasonSelect.value = '';
        otherInput.value = '';
        otherInput.style.display = 'none';

        respUpdateAdminDisplay();
    }
}

// Voir les soldes des caissiers (lecture seule – sans bouton d'ajustement)
function respViewCashierBalances() {
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
                        </tr>
                    </thead>
                    <tbody>
    `;

    for (const [username, data] of Object.entries(state.cashierBalances || {})) {
        const user = state.users.find(u => u.username === username);
        const transactionCount = data.transactions ? data.transactions.length : 0;
        html += `
            <tr>
                <td>${username}</td>
                <td>${user ? user.name : 'Non trouvé'}</td>
                <td>${data.balance.toLocaleString()} Gdes</td>
                <td>${transactionCount}</td>
            </tr>
        `;
    }

    html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button>
            </div>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Mise à jour de l'affichage du crédit
function respUpdateCreditDisplay(patientId) {
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
                    <button class="btn btn-info btn-sm" onclick="respViewCreditHistory('${patientId}')">Voir l'historique</button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    } else {
        container.innerHTML = '<p>Aucun compte crédit disponible</p>';
        container.classList.remove('hidden');
    }
}

// ========== RAPPORTS SANS MONTANTS (pour responsable) ==========

// Générer un rapport de toutes les transactions sans afficher les montants
function respGenerateReportNoAmounts() {
    const startDate = document.getElementById('report-start-date')?.value;
    const endDate = document.getElementById('report-end-date')?.value;

    // Filtrer les transactions selon les dates
    let transactions = state.transactions || [];
    if (startDate) {
        transactions = transactions.filter(t => t.date >= startDate);
    }
    if (endDate) {
        transactions = transactions.filter(t => t.date <= endDate);
    }

    // Trier par date décroissante
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById('report-results');
    if (!container) return;

    let html = '<h4>Rapport des services (montants masqués)</h4>';
    html += '<table class="table-container"><thead><tr><th>Date</th><th>Patient</th><th>Service</th><th>Statut</th><th>Type</th></tr></thead><tbody>';

    if (transactions.length === 0) {
        html += '<tr><td colspan="5" class="text-center">Aucune transaction trouvée</td></tr>';
    } else {
        transactions.forEach(t => {
            const patient = state.patients.find(p => p.id === t.patientId);
            const patientName = patient ? patient.fullName : t.patientId;
            html += `<tr>
                <td>${t.date}</td>
                <td>${patientName}</td>
                <td>${t.service}</td>
                <td>${t.status}</td>
                <td>${t.type}</td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Générer un rapport utilisateur sans montants
function respGenerateUserReportNoAmounts() {
    const user = document.getElementById('report-user-select')?.value;
    if (!user) {
        alert("Veuillez sélectionner un utilisateur.");
        return;
    }

    const startDate = document.getElementById('report-start-date')?.value;
    const endDate = document.getElementById('report-end-date')?.value;

    let transactions = state.transactions?.filter(t => t.cashier === user || t.createdBy === user) || [];
    if (startDate) transactions = transactions.filter(t => t.date >= startDate);
    if (endDate) transactions = transactions.filter(t => t.date <= endDate);
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById('report-results');
    if (!container) return;

    let html = `<h4>Rapport pour ${user} (montants masqués)</h4>`;
    html += '<table class="table-container"><thead><tr><th>Date</th><th>Patient</th><th>Service</th><th>Statut</th><th>Type</th></tr></thead><tbody>';

    if (transactions.length === 0) {
        html += '<tr><td colspan="5" class="text-center">Aucune transaction trouvée</td></tr>';
    } else {
        transactions.forEach(t => {
            const patient = state.patients.find(p => p.id === t.patientId);
            const patientName = patient ? patient.fullName : t.patientId;
            html += `<tr>
                <td>${t.date}</td>
                <td>${patientName}</td>
                <td>${t.service}</td>
                <td>${t.status}</td>
                <td>${t.type}</td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Export CSV sans montants
function respExportReportToCSVNoAmounts() {
    // On récupère le tableau généré dans #report-results
    const table = document.querySelector('#report-results table');
    if (!table) {
        alert("Aucun rapport à exporter.");
        return;
    }

    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let row of rows) {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(col => rowData.push(col.innerText));
        csv.push(rowData.join(','));
    }

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ========== STATISTIQUES SANS MONTANTS POUR LE RESPONSABLE ==========

// Version allégée de updateAdminStats : affiche uniquement des compteurs (pas de montants)
function respUpdateAdminStatsNoAmounts() {
    const statsContainer = document.getElementById('admin-stats');
    if (!statsContainer) return;

    const totalPatients = state.patients.length;
    const totalTransactions = state.transactions.length;

    // Compter les transactions par service
    const serviceCounts = {};
    state.transactions.forEach(t => {
        serviceCounts[t.service] = (serviceCounts[t.service] || 0) + 1;
    });

    let serviceHtml = '<ul>';
    for (const [service, count] of Object.entries(serviceCounts)) {
        serviceHtml += `<li>${service} : ${count} consultation(s)</li>`;
    }
    serviceHtml += '</ul>';

    statsContainer.innerHTML = `
        <h4>Statistiques (montants masqués)</h4>
        <p><strong>Total patients :</strong> ${totalPatients}</p>
        <p><strong>Total transactions :</strong> ${totalTransactions}</p>
        <h5>Répartition par service :</h5>
        ${serviceHtml}
    `;
}

// Version sans montants pour les graphiques (on les désactive ou on montre un message)
function respUpdateChartsNoAmounts() {
    const chartsContainer = document.getElementById('charts-container');
    if (chartsContainer) {
        chartsContainer.innerHTML = '<p>Graphiques non disponibles (responsable)</p>';
    }
}

// Extension éventuelle (on la vide)
function respUpdateAdminExtendedNoAmounts() {
    // Ne rien faire ou afficher des infos non monétaires si besoin
    const extendedContainer = document.getElementById('admin-extended');
    if (extendedContainer) {
        // On peut par exemple y mettre des stats supplémentaires sans montants
    }
}

// Mettre à jour les affichages administratifs (statistiques, caisses)
function respUpdateAdminDisplay() {
    // Appeler nos propres versions sans montants
    respUpdateAdminStatsNoAmounts();
    respUpdateChartsNoAmounts();
    respUpdateAdminExtendedNoAmounts();

    // Mettre à jour UNIQUEMENT la petite caisse (la grande caisse est masquée)
    const pettyCashEl = document.getElementById('petty-cash-balance');
    if (pettyCashEl) pettyCashEl.textContent = (state.pettyCash || 0).toLocaleString() + ' Gdes';
}

// Rendre les fonctions accessibles globalement (pour les appels onclick)
window.respViewCreditHistory = respViewCreditHistory;
window.respUpdateCreditDisplay = respUpdateCreditDisplay;
// On surcharge aussi les anciennes fonctions pour éviter les erreurs
window.searchAdminPatient = respSearchPatient;
window.savePrivilege = respSavePrivilege;
window.addPatientCredit = respAddPatientCredit;
window.viewCreditHistory = respViewCreditHistory;
window.transferToPettyCash = function() {
    alert("Opération non autorisée. Utilisez le retrait avec motif et agent.");
};
window.adjustCashierBalance = function() {
    alert("Vous n'avez pas la permission d'ajuster les soldes.");
};
// Remplacer les fonctions de rapport par nos versions sans montants
window.generateReport = respGenerateReportNoAmounts;
window.generateUserReport = respGenerateUserReportNoAmounts;
window.exportReportToCSV = respExportReportToCSVNoAmounts;
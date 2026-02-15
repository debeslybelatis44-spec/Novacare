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

    // 2. Attacher nos propres écouteurs d'événements
    attachResponsibleEventListeners();

    // 3. Mettre à jour l'affichage (statistiques, caisses)
    respUpdateAdminDisplay();

    // 4. Initialiser les listes (fournisseurs, employés) en lecture seule
    respUpdateSuppliersList();
    respUpdateEmployeePaymentsHistory();
    respUpdatePaymentMethodBalancesDisplay();
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

    // --- MODIFICATION : Masquer les montants dans les rapports et historiques ---
    // (géré dans les fonctions resp*)

    // Désactiver les boutons d'ajout de fournisseur et de paiement employé
    const addSupplierBtn = document.getElementById('add-supplier');
    if (addSupplierBtn) addSupplierBtn.style.display = 'none';

    const payEmployeeBtn = document.getElementById('pay-employee-btn');
    if (payEmployeeBtn) payEmployeeBtn.style.display = 'none';
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

    // Gestion des crédits (lecture seule – on garde les fonctions d'affichage mais on désactive l'ajout)
    const addCreditBtn = document.getElementById('add-credit-btn');
    if (addCreditBtn) {
        addCreditBtn.style.display = 'none';
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

    // Désactiver les boutons d'ajout/modification dans les paramètres
    const addConsultationBtn = document.getElementById('add-consultation-type');
    if (addConsultationBtn) addConsultationBtn.style.display = 'none';
    const addVitalBtn = document.getElementById('add-vital-type');
    if (addVitalBtn) addVitalBtn.style.display = 'none';
    const addLabBtn = document.getElementById('add-lab-analysis-type');
    if (addLabBtn) addLabBtn.style.display = 'none';
    const addExternalBtn = document.getElementById('add-external-service-type');
    if (addExternalBtn) addExternalBtn.style.display = 'none';
    const addUserBtn = document.getElementById('add-user');
    if (addUserBtn) addUserBtn.style.display = 'none';
    const addSupplierBtn = document.getElementById('add-supplier');
    if (addSupplierBtn) addSupplierBtn.style.display = 'none';
    const addMedSettingsBtn = document.getElementById('add-medication-settings');
    if (addMedSettingsBtn) addMedSettingsBtn.style.display = 'none';
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

    // Remplir les notes (lecture seule)
    document.getElementById('patient-allergies-admin').value = patient.allergies || '';
    document.getElementById('patient-notes-admin').value = patient.notes || '';
    // Désactiver les champs de notes
    document.getElementById('patient-allergies-admin').disabled = true;
    document.getElementById('patient-notes-admin').disabled = true;
    document.querySelector('#patient-notes-section .btn').style.display = 'none';

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

    // Désactiver le select et les champs de privilège (lecture seule)
    privilegeSelect.disabled = true;
    discountInput.disabled = true;
    creditAmountInput.disabled = true;
    document.getElementById('save-privilege').style.display = 'none';

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

    // Afficher les informations de crédit (lecture seule)
    respUpdateCreditDisplay(patientId);
}

// Sauvegarder les privilèges (désactivé pour responsable – ne fait rien)
function respSavePrivilege() {
    alert("Vous n'avez pas la permission de modifier les privilèges.");
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

// Mise à jour de l'affichage du crédit (lecture seule)
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
    const reportType = document.getElementById('report-type').value;
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

    let html = '<h4>Rapport des services (montants masqués)</h4>';
    
    if (reportType === 'financial') {
        // Rapport financier simplifié (sans montants)
        html += '<p><strong>Rapport financier (montants non affichés)</strong></p>';
        html += '<p>Soldes des caisses :</p>';
        html += `<ul>
            <li>Grande caisse : ${state.mainCash.toLocaleString()} Gdes</li>
            <li>Petite caisse : ${state.pettyCash.toLocaleString()} Gdes</li>
            <li>Espèces : ${state.paymentMethodBalances?.cash.toLocaleString()} Gdes</li>
            <li>MonCash : ${state.paymentMethodBalances?.moncash.toLocaleString()} Gdes</li>
            <li>NatCash : ${state.paymentMethodBalances?.natcash.toLocaleString()} Gdes</li>
            <li>Carte : ${state.paymentMethodBalances?.card.toLocaleString()} Gdes</li>
            <li>Externe : ${state.paymentMethodBalances?.external.toLocaleString()} Gdes</li>
        </ul>`;
    } else {
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
    }

    // Afficher dans un modal ou dans un conteneur existant ?
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${html}<button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button></div>`;
    document.body.appendChild(modal);
}

// Générer un rapport utilisateur sans montants
function respGenerateUserReportNoAmounts() {
    const users = state.users;
    const userReport = {};

    users.forEach(user => {
        const userTransactions = state.transactions.filter(t => 
            t.createdBy === user.username || 
            t.paymentAgent === user.username
        );

        userReport[user.username] = {
            name: user.name,
            role: user.role,
            transactionsCreated: userTransactions.filter(t => t.createdBy === user.username).length,
            transactionsProcessed: userTransactions.filter(t => t.paymentAgent === user.username).length,
            lastActivity: userTransactions.length > 0 ? 
                new Date(Math.max(...userTransactions.map(t => new Date(t.date + ' ' + t.time).getTime()))).toLocaleDateString('fr-FR') : 'Jamais'
        };
    });

    let html = '<h4>Rapport d\'activité des utilisateurs (montants masqués)</h4>';
    html += '<table class="table-container"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Créées</th><th>Traitées</th><th>Dernière activité</th></tr></thead><tbody>';
    
    for (const [username, data] of Object.entries(userReport)) {
        html += `<tr><td>${data.name} (${username})</td><td>${data.role}</td><td>${data.transactionsCreated}</td><td>${data.transactionsProcessed}</td><td>${data.lastActivity}</td></tr>`;
    }
    html += '</tbody></table>';

    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${html}<button class="btn btn-secondary mt-3" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button></div>`;
    document.body.appendChild(modal);
}

// Export CSV sans montants (version simplifiée)
function respExportReportToCSVNoAmounts() {
    alert("L'export CSV n'est pas disponible pour le responsable (les montants seraient inclus).");
}

// Voir les soldes des caisses (lecture seule)
function respUpdatePaymentMethodBalancesDisplay() {
    document.getElementById('cash-balance').textContent = (state.paymentMethodBalances?.cash || 0).toLocaleString() + ' Gdes';
    document.getElementById('moncash-balance').textContent = (state.paymentMethodBalances?.moncash || 0).toLocaleString() + ' Gdes';
    document.getElementById('natcash-balance').textContent = (state.paymentMethodBalances?.natcash || 0).toLocaleString() + ' Gdes';
    document.getElementById('card-balance').textContent = (state.paymentMethodBalances?.card || 0).toLocaleString() + ' Gdes';
    document.getElementById('external-balance').textContent = (state.paymentMethodBalances?.external || 0).toLocaleString() + ' Gdes';
}

// Afficher les fournisseurs (lecture seule)
function respUpdateSuppliersList() {
    const container = document.getElementById('suppliers-list');
    if (!container) return;

    let html = '';
    state.suppliers.forEach(s => {
        html += `<tr><td>${s.name}</td><td>${s.type === 'credit' ? 'Crédit' : 'Comptant'}</td><td>${s.contact || ''}</td><td>-</td></tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="4" class="text-center">Aucun fournisseur</td></tr>';
}

// Afficher l'historique des paiements employés (lecture seule)
function respUpdateEmployeePaymentsHistory() {
    const container = document.getElementById('employee-payments-history');
    if (!container) return;

    let html = '';
    (state.employeePayments || []).slice().reverse().forEach(p => {
        html += `<tr><td>${p.username}</td><td>${p.amount} Gdes</td><td>${p.date} ${p.time}</td><td>${p.method}</td></tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="4" class="text-center">Aucun paiement</td></tr>';
}

// Mettre à jour les affichages administratifs (statistiques, caisses)
function respUpdateAdminDisplay() {
    if (typeof updateAdminStats === 'function') updateAdminStats();
    if (typeof updateCharts === 'function') updateCharts();
    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();

    // Mettre à jour les soldes des caisses
    const pettyCashEl = document.getElementById('petty-cash-balance');
    if (pettyCashEl) pettyCashEl.textContent = (state.pettyCash || 0).toLocaleString() + ' Gdes';
    const mainCashEl = document.getElementById('main-cash-balance');
    if (mainCashEl) mainCashEl.textContent = (state.mainCash || 0).toLocaleString() + ' Gdes';
    
    respUpdatePaymentMethodBalancesDisplay();
    respUpdateSuppliersList();
    respUpdateEmployeePaymentsHistory();
}

// Rendre les fonctions accessibles globalement (pour les appels onclick)
window.respViewCreditHistory = respViewCreditHistory;
window.respUpdateCreditDisplay = respUpdateCreditDisplay;
// On surcharge aussi les anciennes fonctions pour éviter les erreurs
window.searchAdminPatient = respSearchPatient;
window.savePrivilege = respSavePrivilege;
window.addPatientCredit = function() {
    alert("Opération non autorisée.");
};
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
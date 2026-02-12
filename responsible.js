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
        // Ajouter notre interface de retrait motifé
        addPettyCashWithdrawUI();
    }

    // Désactiver toute édition de transaction via les fonctions globales
    window.selectTransactionForEdit = function() {
        alert("Vous n'avez pas la permission de modifier les transactions.");
    };
}

// --------------------------------------
// Interface de retrait petite caisse avec motifs
// --------------------------------------
function addPettyCashWithdrawUI() {
    const container = document.querySelector('#petty-cash-amount')?.closest('.d-flex');
    if (!container) return;

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

    // Insérer les éléments
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

    // Rapports
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.removeEventListener('click', generateReport);
        generateReportBtn.addEventListener('click', respGenerateReport);
    }

    const generateUserReportBtn = document.getElementById('generate-user-report-btn');
    if (generateUserReportBtn) {
        generateUserReportBtn.removeEventListener('click', generateUserReport);
        generateUserReportBtn.addEventListener('click', respGenerateUserReport);
    }

    const exportCsvBtn = document.getElementById('export-report-csv');
    if (exportCsvBtn) {
        exportCsvBtn.removeEventListener('click', exportReportToCSV);
        exportCsvBtn.addEventListener('click', respExportReportToCSV);
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

// Rechercher un patient (historique sans boutons d'action)
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

    // Historique des transactions – version SANS boutons d'action
    const history = state.transactions.filter(t => t.patientId === patient.id);
    let html = '<table class="table-container"><thead><tr><th>Date</th><th>Service</th><th>Montant</th><th>Statut</th><th>Type</th></tr></thead><tbody>';
    if (history.length === 0) {
        html += '<tr><td colspan="5" class="text-center">Aucune transaction</td></tr>';
    } else {
        history.forEach(t => {
            const amountUSD = t.amount / state.exchangeRate;
            html += `<tr>
                <td>${t.date}</td>
                <td>${t.service}</td>
                <td>${t.amount} Gdes (${amountUSD.toFixed(2)} $)</td>
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

// Sauvegarder les privilèges (identique à admin, sauf que le responsable ne peut pas appliquer de réduction aux transactions existantes ? 
// On garde la même logique métier, mais on retire l'application automatique sur les transactions impayées pour rester cohérent avec le rôle restrictif)
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
        // Le responsable ne modifie PAS les transactions existantes
        alert("Patient marqué comme VIP (les prochains services seront gratuits)");
    } else if (privilegeType === 'sponsored') {
        patient.sponsored = true;
        patient.discountPercentage = discountPercentage;
        patient.privilegeGrantedDate = new Date().toISOString();
        // Ne pas appliquer la réduction aux transactions en cours
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

// Afficher l'historique des crédits (réutilisation de la fonction admin en changeant le nom)
function respViewCreditHistory(patientId = null) {
    if (!patientId) {
        patientId = document.getElementById('admin-patient-search').value.trim();
    }
    const creditAccount = state.creditAccounts[patientId];
    if (!creditAccount) {
        alert("Aucun compte crédit pour ce patient !");
        return;
    }

    // Même modal que dans admin.js, mais on peut copier le code ou appeler une fonction générique
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

// Retrait de la petite caisse avec motif obligatoire
function respWithdrawFromPettyCash() {
    const amount = parseFloat(document.getElementById('petty-cash-amount').value);
    const reasonSelect = document.getElementById('resp-petty-cash-reason');
    const otherInput = document.getElementById('resp-petty-cash-other');
    let reason = reasonSelect.value;

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

    if (confirm(`Retirer ${amount} Gdes de la petite caisse pour le motif : "${reason}" ?`)) {
        state.pettyCash -= amount;

        // Enregistrer la dépense
        const expenseRecord = {
            id: 'EXP' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR'),
            amount: -amount,
            reason: reason,
            by: state.currentUser.username,
            type: 'petty_cash_withdrawal'
        };

        if (!state.reports) state.reports = [];
        state.reports.push(expenseRecord);

        alert(`Retrait de ${amount} Gdes effectué avec succès. Motif: ${reason}`);

        document.getElementById('petty-cash-amount').value = '';
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

// Générer un rapport – réutilisation des fonctions existantes mais encapsulées
function respGenerateReport() {
    // On appelle directement generateReport() car elle ne modifie pas l'état, seulement affiche
    // Mais pour éviter toute confusion, on peut créer une copie allégée
    if (typeof generateReport === 'function') {
        generateReport();
    } else {
        alert("Fonction de rapport non disponible");
    }
}

function respGenerateUserReport() {
    if (typeof generateUserReport === 'function') {
        generateUserReport();
    } else {
        alert("Fonction de rapport utilisateur non disponible");
    }
}

function respExportReportToCSV() {
    if (typeof exportReportToCSV === 'function') {
        exportReportToCSV();
    } else {
        alert("Export CSV non disponible");
    }
}

// Mettre à jour les affichages administratifs (statistiques, caisses)
function respUpdateAdminDisplay() {
    if (typeof updateAdminStats === 'function') updateAdminStats();
    if (typeof updateCharts === 'function') updateCharts();
    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();

    // Mettre à jour les soldes des caisses
    const mainCashEl = document.getElementById('main-cash-balance');
    const pettyCashEl = document.getElementById('petty-cash-balance');
    if (mainCashEl) mainCashEl.textContent = (state.mainCash || 0).toLocaleString() + ' Gdes';
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
    alert("Opération non autorisée. Utilisez le retrait avec motif.");
};
window.adjustCashierBalance = function() {
    alert("Vous n'avez pas la permission d'ajuster les soldes.");
};
// Fonctionnalités spécifiques au rôle Responsable/Directeur
document.addEventListener('DOMContentLoaded', () => {
    if (state.currentRole === 'responsible') {
        setupResponsibleFeatures();
    }
});

function setupResponsibleFeatures() {
    // Initialiser la gestion de la petite caisse
    setupPettyCashManagement();
    
    // Initialiser les rapports simplifiés
    setupSimplifiedReports();
    
    // Initialiser la vue des transactions
    setupResponsibleTransactionsView();
    
    console.log("Fonctionnalités responsables initialisées");
}

// ==================== GESTION PETITE CAISSE ====================
function setupPettyCashManagement() {
    // Ajouter l'onglet Petite Caisse à l'administration
    addPettyCashTab();
    
    // Initialiser les événements
    document.getElementById('request-extraction-btn')?.addEventListener('click', requestPettyCashExtraction);
    document.getElementById('view-extraction-history-btn')?.addEventListener('click', viewExtractionHistory);
}

function addPettyCashTab() {
    const adminSection = document.getElementById('administration');
    if (!adminSection) return;
    
    // Vérifier si l'onglet existe déjà
    if (document.getElementById('petty-cash-tab-content')) return;
    
    // Ajouter l'onglet dans la navigation si nécessaire
    const navTabs = document.querySelector('.nav-tabs');
    const pettyCashTab = document.createElement('div');
    pettyCashTab.className = 'nav-tab';
    pettyCashTab.dataset.target = 'pettyCash';
    pettyCashTab.innerHTML = '<i class="fas fa-wallet"></i> Petite Caisse';
    navTabs.appendChild(pettyCashTab);
    
    // Ajouter le contenu
    const pettyCashContent = document.createElement('section');
    pettyCashContent.id = 'pettyCash';
    pettyCashContent.className = 'content';
    pettyCashContent.innerHTML = generatePettyCashContent();
    adminSection.parentNode.insertBefore(pettyCashContent, adminSection.nextSibling);
    
    // Initialiser les événements de l'onglet
    pettyCashTab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
        
        pettyCashTab.classList.add('active');
        pettyCashContent.classList.add('active');
        
        loadPettyCashData();
    });
}

function generatePettyCashContent() {
    return `
        <h2 class="section-title"><i class="fas fa-wallet"></i> Gestion de la Petite Caisse</h2>
        
        <div class="petty-cash-balance-card">
            <h3>Solde Actuel de la Petite Caisse</h3>
            <h2 id="petty-cash-current-balance">${state.pettyCash.toLocaleString()} Gdes</h2>
            <p>Disponible pour les dépenses courantes</p>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-hand-holding-usd"></i> Demande d'Extraction</h3>
            <div class="petty-cash-extraction">
                <div class="form-group">
                    <label class="form-label">Montant à extraire (Gdes) *</label>
                    <input type="number" id="extraction-amount" class="form-control" 
                           placeholder="Montant en gourdes" min="1" max="${state.pettyCash}">
                    <small class="text-muted">Solde disponible: ${state.pettyCash.toLocaleString()} Gdes</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Raison de l'extraction *</label>
                    <select id="extraction-reason" class="form-control">
                        <option value="">Sélectionner une raison</option>
                        <option value="fournitures">Achat fournitures bureau</option>
                        <option value="entretien">Entretien et réparations</option>
                        <option value="courses">Courses quotidiennes</option>
                        <option value="transport">Frais de transport</option>
                        <option value="urgences">Dépenses urgentes</option>
                        <option value="autre">Autre</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description détaillée *</label>
                    <textarea id="extraction-description" class="form-control" rows="3" 
                              placeholder="Décrivez en détail la raison de cette extraction..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Justificatif (optionnel)</label>
                    <input type="text" id="extraction-justification" class="form-control" 
                           placeholder="Numéro de facture, nom du fournisseur, etc.">
                </div>
                
                <div class="d-flex" style="gap:15px; margin-top:20px;">
                    <button id="request-extraction-btn" class="btn btn-success">
                        <i class="fas fa-paper-plane"></i> Soumettre la demande
                    </button>
                    <button id="view-extraction-history-btn" class="btn btn-info">
                        <i class="fas fa-history"></i> Voir l'historique
                    </button>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-clock"></i> Demandes en Attente</h3>
            <div id="pending-extractions-list"></div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-chart-line"></i> Statistiques des Extractions</h3>
            <div class="report-summary-simple">
                <div class="d-flex justify-between">
                    <div>
                        <p class="summary-label">Total extrait ce mois</p>
                        <p class="summary-value" id="monthly-extraction-total">0 Gdes</p>
                    </div>
                    <div>
                        <p class="summary-label">Demandes en attente</p>
                        <p class="summary-value" id="pending-extractions-count">0</p>
                    </div>
                    <div>
                        <p class="summary-label">Dernière extraction</p>
                        <p class="summary-value" id="last-extraction-date">-</p>
                    </div>
                </div>
            </div>
        </div>
        
        ${state.currentRole === 'admin' ? `
        <div class="admin-actions-panel mt-3">
            <h4><i class="fas fa-user-shield"></i> Actions Administrateur</h4>
            <p>En tant qu'administrateur, vous pouvez approuver ou rejeter les demandes d'extraction.</p>
            <button class="btn btn-warning" onclick="showAllPettyCashTransactions()">
                <i class="fas fa-list"></i> Voir toutes les transactions
            </button>
            <button class="btn btn-danger" onclick="adjustPettyCashBalance()">
                <i class="fas fa-adjust"></i> Ajuster le solde
            </button>
        </div>
        ` : ''}
    `;
}

function loadPettyCashData() {
    updatePettyCashBalanceDisplay();
    updatePendingExtractionsList();
    updatePettyCashStatistics();
}

function updatePettyCashBalanceDisplay() {
    const balanceElement = document.getElementById('petty-cash-current-balance');
    if (balanceElement) {
        balanceElement.textContent = state.pettyCash.toLocaleString() + ' Gdes';
    }
    
    // Mettre à jour le champ de saisie du montant maximum
    const amountInput = document.getElementById('extraction-amount');
    if (amountInput) {
        amountInput.max = state.pettyCash;
    }
}

function updatePendingExtractionsList() {
    const container = document.getElementById('pending-extractions-list');
    if (!container) return;
    
    const pendingExtractions = state.pettyCashTransactions.filter(t => 
        t.status === 'pending' || t.status === 'requested'
    );
    
    if (pendingExtractions.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune demande en attente.</p>';
        return;
    }
    
    let html = '';
    pendingExtractions.forEach(extraction => {
        const isOwnRequest = extraction.requestedBy === state.currentUser.username;
        
        html += `
            <div class="extraction-history-item ${isOwnRequest ? 'action-required' : ''}">
                <div class="d-flex justify-between">
                    <div>
                        <h5>${extraction.reason}</h5>
                        <p><strong>Montant:</strong> ${extraction.amount} Gdes</p>
                        <p><strong>Demandé par:</strong> ${extraction.requestedBy}</p>
                        <p><strong>Date:</strong> ${extraction.date} ${extraction.time}</p>
                        <p><strong>Description:</strong> ${extraction.description || 'Non spécifiée'}</p>
                    </div>
                    <div>
                        <span class="extraction-status status-${extraction.status}">
                            ${extraction.status === 'pending' ? 'En attente' : 'Demandé'}
                        </span>
                        ${isOwnRequest ? `
                            <div class="mt-2">
                                <button class="btn btn-sm btn-warning" onclick="cancelExtractionRequest('${extraction.id}')">
                                    <i class="fas fa-times"></i> Annuler
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${state.currentRole === 'admin' ? `
                <div class="extraction-actions mt-2">
                    <button class="btn btn-sm btn-success" onclick="approveExtraction('${extraction.id}')">
                        <i class="fas fa-check"></i> Approuver
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectExtraction('${extraction.id}')">
                        <i class="fas fa-times"></i> Rejeter
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewExtractionDetails('${extraction.id}')">
                        <i class="fas fa-info-circle"></i> Détails
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updatePettyCashStatistics() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const monthlyExtractions = state.pettyCashTransactions.filter(t => {
        const [year, month] = t.date.split('-');
        return parseInt(year) === currentYear && parseInt(month) === currentMonth;
    });
    
    const monthlyTotal = monthlyExtractions.reduce((sum, t) => sum + t.amount, 0);
    const pendingCount = state.pettyCashTransactions.filter(t => 
        t.status === 'pending' || t.status === 'requested'
    ).length;
    
    const lastExtraction = [...state.pettyCashTransactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))[0];
    
    document.getElementById('monthly-extraction-total').textContent = monthlyTotal.toLocaleString() + ' Gdes';
    document.getElementById('pending-extractions-count').textContent = pendingCount;
    document.getElementById('last-extraction-date').textContent = lastExtraction ? 
        `${lastExtraction.date} ${lastExtraction.amount} Gdes` : '-';
}

function requestPettyCashExtraction() {
    const amount = parseFloat(document.getElementById('extraction-amount').value);
    const reason = document.getElementById('extraction-reason').value;
    const description = document.getElementById('extraction-description').value.trim();
    const justification = document.getElementById('extraction-justification').value.trim();
    
    if (!amount || amount <= 0 || amount > state.pettyCash) {
        alert("Montant invalide! Vérifiez le montant et le solde disponible.");
        return;
    }
    
    if (!reason || !description) {
        alert("Veuillez remplir tous les champs obligatoires!");
        return;
    }
    
    if (state.currentRole === 'responsible') {
        // Pour le responsable, l'extraction est auto-approuvée
        if (confirm(`Extraire ${amount} Gdes de la petite caisse pour: ${reason}?`)) {
            const extraction = {
                id: 'PETTY' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                amount: amount,
                type: 'extraction',
                reason: reason,
                description: description,
                justification: justification,
                requestedBy: state.currentUser.username,
                approvedBy: state.currentUser.username, // Auto-approuvé pour le responsable
                status: 'approved',
                notes: 'Auto-approuvé par le responsable'
            };
            
            state.pettyCashTransactions.push(extraction);
            state.pettyCash -= amount;
            
            // Enregistrer l'activité
            const activity = {
                id: 'ACT' + Date.now(),
                action: 'petty_cash_extraction',
                user: state.currentUser.username,
                timestamp: new Date().toISOString(),
                details: `Extraction de ${amount} Gdes de la petite caisse: ${reason}`
            };
            state.reports.push(activity);
            
            saveStateToLocalStorage();
            alert(`Extraction de ${amount} Gdes approuvée avec succès!`);
            
            // Réinitialiser le formulaire
            document.getElementById('extraction-amount').value = '';
            document.getElementById('extraction-reason').selectedIndex = 0;
            document.getElementById('extraction-description').value = '';
            document.getElementById('extraction-justification').value = '';
            
            // Mettre à jour l'affichage
            loadPettyCashData();
        }
    } else {
        // Pour les autres rôles, demande d'approbation
        const extraction = {
            id: 'PETTY' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            amount: amount,
            type: 'extraction',
            reason: reason,
            description: description,
            justification: justification,
            requestedBy: state.currentUser.username,
            approvedBy: null,
            status: 'requested',
            notes: ''
        };
        
        state.pettyCashTransactions.push(extraction);
        saveStateToLocalStorage();
        
        alert(`Demande d'extraction de ${amount} Gdes soumise. En attente d'approbation.`);
        
        // Réinitialiser le formulaire
        document.getElementById('extraction-amount').value = '';
        document.getElementById('extraction-reason').selectedIndex = 0;
        document.getElementById('extraction-description').value = '';
        document.getElementById('extraction-justification').value = '';
        
        // Mettre à jour l'affichage
        loadPettyCashData();
    }
}

function viewExtractionHistory() {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    const userExtractions = state.pettyCashTransactions.filter(t => 
        t.requestedBy === state.currentUser.username
    );
    
    let html = `
        <div class="transaction-details-content">
            <h3>Historique de vos Extractions</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Montant</th>
                            <th>Raison</th>
                            <th>Statut</th>
                            <th>Approuvé par</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    userExtractions.forEach(extraction => {
        html += `
            <tr>
                <td>${extraction.date} ${extraction.time}</td>
                <td>${extraction.amount} Gdes</td>
                <td>${extraction.reason}</td>
                <td><span class="extraction-status status-${extraction.status}">${
                    extraction.status === 'approved' ? 'Approuvé' : 
                    extraction.status === 'pending' ? 'En attente' :
                    extraction.status === 'rejected' ? 'Rejeté' : 'Demandé'
                }</span></td>
                <td>${extraction.approvedBy || '-'}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
                <button class="btn btn-primary" onclick="printExtractionHistory()">
                    <i class="fas fa-print"></i> Imprimer
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Fonctions pour l'administrateur
function approveExtraction(extractionId) {
    if (state.currentRole !== 'admin') {
        alert("Seul l'administrateur peut approuver les extractions!");
        return;
    }
    
    const extraction = state.pettyCashTransactions.find(t => t.id === extractionId);
    if (!extraction) return;
    
    if (extraction.amount > state.pettyCash) {
        alert("Solde insuffisant dans la petite caisse!");
        return;
    }
    
    extraction.status = 'approved';
    extraction.approvedBy = state.currentUser.username;
    extraction.approvalDate = new Date().toISOString().split('T')[0];
    extraction.approvalTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    state.pettyCash -= extraction.amount;
    
    // Enregistrer l'activité
    const activity = {
        id: 'ACT' + Date.now(),
        action: 'approve_extraction',
        user: state.currentUser.username,
        timestamp: new Date().toISOString(),
        details: `Approbation de l'extraction ${extractionId} de ${extraction.amount} Gdes`
    };
    state.reports.push(activity);
    
    saveStateToLocalStorage();
    alert("Extraction approuvée avec succès!");
    loadPettyCashData();
}

function rejectExtraction(extractionId) {
    if (state.currentRole !== 'admin') {
        alert("Seul l'administrateur peut rejeter les extractions!");
        return;
    }
    
    const extraction = state.pettyCashTransactions.find(t => t.id === extractionId);
    if (!extraction) return;
    
    const reason = prompt("Raison du rejet:");
    if (!reason) return;
    
    extraction.status = 'rejected';
    extraction.approvedBy = state.currentUser.username;
    extraction.rejectionReason = reason;
    extraction.rejectionDate = new Date().toISOString().split('T')[0];
    
    // Enregistrer l'activité
    const activity = {
        id: 'ACT' + Date.now(),
        action: 'reject_extraction',
        user: state.currentUser.username,
        timestamp: new Date().toISOString(),
        details: `Rejet de l'extraction ${extractionId}: ${reason}`
    };
    state.reports.push(activity);
    
    saveStateToLocalStorage();
    alert("Extraction rejetée!");
    loadPettyCashData();
}

function cancelExtractionRequest(extractionId) {
    const extraction = state.pettyCashTransactions.find(t => t.id === extractionId);
    if (!extraction) return;
    
    if (extraction.requestedBy !== state.currentUser.username) {
        alert("Vous ne pouvez annuler que vos propres demandes!");
        return;
    }
    
    if (extraction.status !== 'pending' && extraction.status !== 'requested') {
        alert("Cette extraction ne peut plus être annulée!");
        return;
    }
    
    if (confirm("Annuler cette demande d'extraction?")) {
        extraction.status = 'cancelled';
        extraction.cancelledBy = state.currentUser.username;
        extraction.cancellationDate = new Date().toISOString().split('T')[0];
        
        saveStateToLocalStorage();
        alert("Demande annulée!");
        loadPettyCashData();
    }
}

// ==================== RAPPORTS SIMPLIFIÉS ====================
function setupSimplifiedReports() {
    // Modifier l'interface des rapports pour le responsable
    if (state.currentRole === 'responsible') {
        modifyReportsInterface();
    }
}

function modifyReportsInterface() {
    // Remplacer l'interface des rapports par une version simplifiée
    const reportsSection = document.getElementById('administration');
    if (!reportsSection) return;
    
    // Attendre que le contenu soit chargé
    setTimeout(() => {
        const reportButtons = reportsSection.querySelectorAll('button');
        reportButtons.forEach(btn => {
            if (btn.textContent.includes('Exporter') || btn.textContent.includes('Modifier')) {
                btn.classList.add('hidden-for-responsible');
            }
        });
        
        // Simplifier les tableaux
        const tables = reportsSection.querySelectorAll('table');
        tables.forEach(table => {
            table.classList.add('simplified-table');
            
            // Masquer les colonnes d'actions
            const headers = table.querySelectorAll('th');
            headers.forEach((th, index) => {
                if (th.textContent.includes('Actions')) {
                    // Masquer cette colonne et les cellules correspondantes
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells[index]) {
                            cells[index].style.display = 'none';
                        }
                    });
                }
            });
        });
    }, 1000);
}

// ==================== VUE DES TRANSACTIONS ====================
function setupResponsibleTransactionsView() {
    // Modifier l'interface des transactions pour le responsable
    if (state.currentRole === 'responsible') {
        // Masquer les boutons de modification/suppression
        document.querySelectorAll('#administration .btn-warning, #administration .btn-danger').forEach(btn => {
            btn.classList.add('hidden-for-responsible');
        });
        
        // Rendre les champs en lecture seule
        document.querySelectorAll('#administration input, #administration select, #administration textarea').forEach(input => {
            if (!input.classList.contains('no-readonly')) {
                input.disabled = true;
                input.classList.add('readonly-field');
            }
        });
    }
}

// ==================== FONCTIONS GLOBALES ====================
window.showPettyCashManagement = function() {
    // Activer l'onglet Petite Caisse
    const pettyCashTab = document.querySelector('.nav-tab[data-target="pettyCash"]');
    if (pettyCashTab) {
        pettyCashTab.click();
    } else {
        addPettyCashTab();
        setTimeout(() => {
            document.querySelector('.nav-tab[data-target="pettyCash"]')?.click();
        }, 100);
    }
};

window.viewExtractionDetails = function(extractionId) {
    const extraction = state.pettyCashTransactions.find(t => t.id === extractionId);
    if (!extraction) return;
    
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    let html = `
        <div class="transaction-details-content">
            <h3>Détails de l'Extraction</h3>
            <div class="card">
                <p><strong>ID:</strong> ${extraction.id}</p>
                <p><strong>Date:</strong> ${extraction.date} ${extraction.time}</p>
                <p><strong>Montant:</strong> ${extraction.amount} Gdes</p>
                <p><strong>Raison:</strong> ${extraction.reason}</p>
                <p><strong>Description:</strong> ${extraction.description || 'Non spécifiée'}</p>
                <p><strong>Justificatif:</strong> ${extraction.justification || 'Aucun'}</p>
                <p><strong>Demandé par:</strong> ${extraction.requestedBy}</p>
                <p><strong>Statut:</strong> <span class="extraction-status status-${extraction.status}">${
                    extraction.status === 'approved' ? 'Approuvé' : 
                    extraction.status === 'pending' ? 'En attente' :
                    extraction.status === 'rejected' ? 'Rejeté' : 'Demandé'
                }</span></p>
                ${extraction.approvedBy ? `<p><strong>Approuvé par:</strong> ${extraction.approvedBy}</p>` : ''}
                ${extraction.rejectionReason ? `<p><strong>Raison du rejet:</strong> ${extraction.rejectionReason}</p>` : ''}
                ${extraction.notes ? `<p><strong>Notes:</strong> ${extraction.notes}</p>` : ''}
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
                ${state.currentRole === 'admin' ? `
                <button class="btn btn-primary" onclick="printExtractionDetails('${extraction.id}')">
                    <i class="fas fa-print"></i> Imprimer
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
};

window.printExtractionHistory = function() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Historique des Extractions</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .status-approved { color: green; }
                .status-pending { color: orange; }
                .status-rejected { color: red; }
            </style>
        </head>
        <body>
            <h2>Historique des Extractions - ${state.currentUser.name}</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            ${document.querySelector('.transaction-details-content .table-container').innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

window.printExtractionDetails = function(extractionId) {
    const extraction = state.pettyCashTransactions.find(t => t.id === extractionId);
    if (!extraction) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Extraction ${extractionId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .details { margin: 20px 0; }
                .details p { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h2>Justificatif d'Extraction</h2>
            <p><strong>Hôpital:</strong> ${state.hospitalName}</p>
            <p><strong>Date d'impression:</strong> ${new Date().toLocaleDateString()}</p>
            <hr>
            <div class="details">
                <p><strong>ID Extraction:</strong> ${extraction.id}</p>
                <p><strong>Date:</strong> ${extraction.date} ${extraction.time}</p>
                <p><strong>Montant:</strong> ${extraction.amount} Gdes</p>
                <p><strong>Raison:</strong> ${extraction.reason}</p>
                <p><strong>Description:</strong> ${extraction.description || 'Non spécifiée'}</p>
                <p><strong>Demandé par:</strong> ${extraction.requestedBy}</p>
                <p><strong>Approuvé par:</strong> ${extraction.approvedBy || 'En attente'}</p>
                <p><strong>Statut:</strong> ${extraction.status}</p>
            </div>
            <hr>
            <div style="margin-top: 50px;">
                <p>Signature du responsable:</p>
                <p style="margin-top: 50px;">_________________________</p>
                <p>${state.currentUser.name}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
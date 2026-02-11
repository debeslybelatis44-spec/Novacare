// Fonctionnalités spécifiques au rôle Responsable/Directeur
// Version sans conflit avec admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Ne pas initialiser automatiquement, attendre la connexion
});

// Point d'entrée unique pour l'initialisation des fonctionnalités responsable
window.initializeResponsibleFeatures = function() {
    if (state.currentRole !== 'responsible') return;
    
    // Éviter les initialisations multiples
    if (state.modulesInitialized.responsible) {
        console.log("Responsable déjà initialisé");
        return;
    }
    
    console.log("Initialisation des fonctionnalités responsable...");
    
    setupResponsiblePettyCash();
    setupResponsibleReports();
    setupResponsibleView();
    
    state.modulesInitialized.responsible = true;
    console.log("Fonctionnalités responsables initialisées");
};

// ==================== GESTION PETITE CAISSE RESPONSABLE ====================
// Version responsable sans doublon avec admin.js
function setupResponsiblePettyCash() {
    // Préfixer toutes les fonctions avec "responsible" pour éviter les conflits
    addResponsiblePettyCashTab();
    
    // Utiliser delegation d'événements pour éviter les conflits
    document.removeEventListener('click', handleResponsiblePettyCashClick);
    document.addEventListener('click', handleResponsiblePettyCashClick);
}

function handleResponsiblePettyCashClick(e) {
    if (e.target && e.target.id === 'responsible-request-extraction-btn') {
        window.requestResponsibleExtraction();
    }
    if (e.target && e.target.id === 'responsible-view-extraction-history-btn') {
        window.viewResponsibleExtractionHistory();
    }
    if (e.target && e.target.id === 'responsible-cancel-extraction-btn') {
        const extractionId = e.target.dataset.id;
        window.cancelResponsibleExtractionRequest(extractionId);
    }
}

function addResponsiblePettyCashTab() {
    const adminSection = document.getElementById('administration');
    if (!adminSection) return;
    
    // Vérifier si l'onglet responsable existe déjà
    if (document.getElementById('responsible-petty-cash')) return;
    
    const navTabs = document.querySelector('.nav-tabs');
    const pettyCashTab = document.createElement('div');
    pettyCashTab.className = 'nav-tab';
    pettyCashTab.dataset.target = 'responsiblePettyCash';
    pettyCashTab.innerHTML = '<i class="fas fa-wallet"></i> Petite Caisse';
    navTabs.appendChild(pettyCashTab);
    
    const pettyCashContent = document.createElement('section');
    pettyCashContent.id = 'responsiblePettyCash';
    pettyCashContent.className = 'content';
    pettyCashContent.innerHTML = generateResponsiblePettyCashContent();
    adminSection.parentNode.insertBefore(pettyCashContent, adminSection.nextSibling);
    
    pettyCashTab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
        
        pettyCashTab.classList.add('active');
        pettyCashContent.classList.add('active');
        
        window.loadResponsiblePettyCashData();
    });
}

function generateResponsiblePettyCashContent() {
    return `
        <h2 class="section-title"><i class="fas fa-wallet"></i> Gestion de la Petite Caisse - Responsable</h2>
        
        <div class="petty-cash-balance-card">
            <h3>Solde Actuel de la Petite Caisse</h3>
            <h2 id="responsible-petty-cash-balance">${state.pettyCash.toLocaleString()} Gdes</h2>
            <p>Disponible pour les dépenses courantes</p>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-hand-holding-usd"></i> Extraction Directe</h3>
            <div class="responsible-petty-cash-extraction">
                <div class="form-group">
                    <label class="form-label">Montant à extraire (Gdes) *</label>
                    <input type="number" id="responsible-extraction-amount" class="form-control" 
                           placeholder="Montant en gourdes" min="1" max="${state.pettyCash}">
                    <small class="text-muted">Solde disponible: ${state.pettyCash.toLocaleString()} Gdes</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Raison de l'extraction *</label>
                    <select id="responsible-extraction-reason" class="form-control">
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
                    <textarea id="responsible-extraction-description" class="form-control" rows="3" 
                              placeholder="Décrivez en détail la raison de cette extraction..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Justificatif (optionnel)</label>
                    <input type="text" id="responsible-extraction-justification" class="form-control" 
                           placeholder="Numéro de facture, nom du fournisseur, etc.">
                </div>
                
                <div class="d-flex" style="gap:15px; margin-top:20px;">
                    <button id="responsible-request-extraction-btn" class="btn btn-success">
                        <i class="fas fa-paper-plane"></i> Extraire immédiatement
                    </button>
                    <button id="responsible-view-extraction-history-btn" class="btn btn-info">
                        <i class="fas fa-history"></i> Voir mon historique
                    </button>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-check-circle"></i> Mes Extractions Récentes</h3>
            <div id="responsible-my-extractions-list"></div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-chart-line"></i> Statistiques des Extractions</h3>
            <div class="report-summary-simple">
                <div class="d-flex justify-between">
                    <div>
                        <p class="summary-label">Total extrait ce mois</p>
                        <p class="summary-value" id="responsible-monthly-extraction-total">0 Gdes</p>
                    </div>
                    <div>
                        <p class="summary-label">Nombre d'extractions</p>
                        <p class="summary-value" id="responsible-monthly-extraction-count">0</p>
                    </div>
                    <div>
                        <p class="summary-label">Dernière extraction</p>
                        <p class="summary-value" id="responsible-last-extraction-date">-</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== FONCTIONS RESPONSABLE PETITE CAISSE ====================
window.loadResponsiblePettyCashData = function() {
    updateResponsibleBalanceDisplay();
    updateResponsibleMyExtractionsList();
    updateResponsibleStatistics();
};

function updateResponsibleBalanceDisplay() {
    const balanceElement = document.getElementById('responsible-petty-cash-balance');
    if (balanceElement) {
        balanceElement.textContent = state.pettyCash.toLocaleString() + ' Gdes';
    }
    
    const amountInput = document.getElementById('responsible-extraction-amount');
    if (amountInput) {
        amountInput.max = state.pettyCash;
    }
}

function updateResponsibleMyExtractionsList() {
    const container = document.getElementById('responsible-my-extractions-list');
    if (!container) return;
    
    const myExtractions = state.pettyCashTransactions
        .filter(t => t.requestedBy === state.currentUser.username)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 10);
    
    if (myExtractions.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune extraction effectuée.</p>';
        return;
    }
    
    let html = '<div class="table-container"><table class="simplified-table">';
    html += '<thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
    
    myExtractions.forEach(extraction => {
        const isPending = extraction.status === 'pending' || extraction.status === 'requested';
        
        html += `
            <tr>
                <td>${extraction.date} ${extraction.time}</td>
                <td>${extraction.amount} Gdes</td>
                <td>${extraction.reason}</td>
                <td>
                    <span class="extraction-status status-${extraction.status}">
                        ${extraction.status === 'approved' ? 'Approuvé' : 
                          extraction.status === 'completed' ? 'Complété' :
                          extraction.status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </span>
                </td>
                <td>
                    ${isPending ? `
                        <button class="btn btn-sm btn-warning" 
                                id="responsible-cancel-extraction-btn" 
                                data-id="${extraction.id}">
                            <i class="fas fa-times"></i> Annuler
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info" 
                            onclick="window.viewResponsibleExtractionDetails('${extraction.id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function updateResponsibleStatistics() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const myExtractions = state.pettyCashTransactions.filter(t => 
        t.requestedBy === state.currentUser.username
    );
    
    const monthlyExtractions = myExtractions.filter(t => {
        const [year, month] = t.date.split('-');
        return parseInt(year) === currentYear && parseInt(month) === currentMonth;
    });
    
    const monthlyTotal = monthlyExtractions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyCount = monthlyExtractions.length;
    
    const lastExtraction = myExtractions
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))[0];
    
    document.getElementById('responsible-monthly-extraction-total').textContent = 
        monthlyTotal.toLocaleString() + ' Gdes';
    document.getElementById('responsible-monthly-extraction-count').textContent = 
        monthlyCount;
    document.getElementById('responsible-last-extraction-date').textContent = 
        lastExtraction ? `${lastExtraction.date} ${lastExtraction.amount} Gdes` : '-';
}

// Demande d'extraction pour responsable (auto-approuvée)
window.requestResponsibleExtraction = function() {
    const amount = parseFloat(document.getElementById('responsible-extraction-amount').value);
    const reason = document.getElementById('responsible-extraction-reason').value;
    const description = document.getElementById('responsible-extraction-description').value.trim();
    const justification = document.getElementById('responsible-extraction-justification').value.trim();
    
    if (!amount || amount <= 0 || amount > state.pettyCash) {
        alert("Montant invalide! Vérifiez le montant et le solde disponible.");
        return;
    }
    
    if (!reason || !description) {
        alert("Veuillez remplir tous les champs obligatoires!");
        return;
    }
    
    if (confirm(`Extraire ${amount} Gdes de la petite caisse pour: ${reason}?`)) {
        const extraction = {
            id: 'PETTY-RESP-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            amount: amount,
            type: 'extraction',
            reason: reason,
            description: description,
            justification: justification,
            requestedBy: state.currentUser.username,
            approvedBy: state.currentUser.username,
            status: 'approved',
            notes: 'Extraction directe responsable',
            source: 'responsible' // Marqueur pour identifier la source
        };
        
        state.pettyCashTransactions.push(extraction);
        state.pettyCash -= amount;
        
        const activity = {
            id: 'ACT' + Date.now(),
            action: 'responsible_extraction',
            user: state.currentUser.username,
            timestamp: new Date().toISOString(),
            details: `Extraction responsable: ${amount} Gdes - ${reason}`
        };
        state.reports.push(activity);
        
        saveStateToLocalStorage();
        alert(`Extraction de ${amount} Gdes effectuée avec succès!`);
        
        // Réinitialiser le formulaire
        document.getElementById('responsible-extraction-amount').value = '';
        document.getElementById('responsible-extraction-reason').selectedIndex = 0;
        document.getElementById('responsible-extraction-description').value = '';
        document.getElementById('responsible-extraction-justification').value = '';
        
        window.loadResponsiblePettyCashData();
    }
};

window.viewResponsibleExtractionHistory = function() {
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    
    const myExtractions = state.pettyCashTransactions
        .filter(t => t.requestedBy === state.currentUser.username)
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    let html = `
        <div class="transaction-details-content">
            <h3>Historique complet de vos Extractions</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Montant</th>
                            <th>Raison</th>
                            <th>Description</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (myExtractions.length === 0) {
        html += '<tr><td colspan="5" class="text-center">Aucune extraction</td></tr>';
    } else {
        myExtractions.forEach(extraction => {
            html += `
                <tr>
                    <td>${extraction.date} ${extraction.time}</td>
                    <td>${extraction.amount} Gdes</td>
                    <td>${extraction.reason}</td>
                    <td>${extraction.description || '-'}</td>
                    <td><span class="extraction-status status-${extraction.status}">${
                        extraction.status === 'approved' ? 'Approuvé' : 
                        extraction.status === 'completed' ? 'Complété' :
                        extraction.status === 'rejected' ? 'Rejeté' : 'En attente'
                    }</span></td>
                </tr>
            `;
        });
    }
    
    html += `
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
                <button class="btn btn-primary" onclick="window.printResponsibleExtractionHistory()">
                    <i class="fas fa-print"></i> Imprimer
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
};

window.cancelResponsibleExtractionRequest = function(extractionId) {
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
        window.loadResponsiblePettyCashData();
    }
};

window.viewResponsibleExtractionDetails = function(extractionId) {
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
                    extraction.status === 'rejected' ? 'Rejeté' : extraction.status
                }</span></p>
                ${extraction.approvedBy ? `<p><strong>Approuvé par:</strong> ${extraction.approvedBy}</p>` : ''}
                ${extraction.notes ? `<p><strong>Notes:</strong> ${extraction.notes}</p>` : ''}
            </div>
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">
                    Fermer
                </button>
                <button class="btn btn-primary" onclick="window.printResponsibleExtractionDetails('${extraction.id}')">
                    <i class="fas fa-print"></i> Imprimer
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
};

window.printResponsibleExtractionHistory = function() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Mes Extractions</title>
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

window.printResponsibleExtractionDetails = function(extractionId) {
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
            <h2>Justificatif d'Extraction - Responsable</h2>
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

// Point d'entrée pour afficher la gestion de petite caisse depuis le tableau de bord
window.showResponsiblePettyCashManagement = function() {
    const pettyCashTab = document.querySelector('.nav-tab[data-target="responsiblePettyCash"]');
    if (pettyCashTab) {
        pettyCashTab.click();
    } else {
        addResponsiblePettyCashTab();
        setTimeout(() => {
            document.querySelector('.nav-tab[data-target="responsiblePettyCash"]')?.click();
        }, 100);
    }
};

// ==================== RAPPORTS SIMPLIFIÉS RESPONSABLE ====================
function setupResponsibleReports() {
    if (state.currentRole !== 'responsible') return;
    modifyResponsibleReportsInterface();
}

function modifyResponsibleReportsInterface() {
    setTimeout(() => {
        const reportsSection = document.getElementById('administration');
        if (!reportsSection) return;
        
        const reportButtons = reportsSection.querySelectorAll('button');
        reportButtons.forEach(btn => {
            if (btn.textContent.includes('Exporter') || 
                btn.textContent.includes('Modifier') || 
                btn.textContent.includes('Supprimer')) {
                btn.classList.add('hidden-for-responsible');
            }
        });
        
        const tables = reportsSection.querySelectorAll('table');
        tables.forEach(table => {
            table.classList.add('simplified-table');
            
            const headers = table.querySelectorAll('th');
            headers.forEach((th, index) => {
                if (th.textContent.includes('Actions') || 
                    th.textContent.includes('Modifier')) {
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

// ==================== VUE DES TRANSACTIONS RESPONSABLE ====================
function setupResponsibleView() {
    if (state.currentRole !== 'responsible') return;
    
    document.querySelectorAll('#administration .btn-warning, #administration .btn-danger').forEach(btn => {
        btn.classList.add('hidden-for-responsible');
    });
    
    document.querySelectorAll('#administration input, #administration select, #administration textarea').forEach(input => {
        if (!input.classList.contains('no-readonly')) {
            input.disabled = true;
            input.classList.add('readonly-field');
        }
    });
}

// ==================== TABLEAU DE BORD RESPONSABLE ====================
window.initResponsibleDashboardEvents = function() {
    updateRecentTransactionsSimple();
    updateRecentPettyCashResponsible();
    
    // Nettoyer les anciens intervalles
    if (window.responsibleDashboardInterval) {
        clearInterval(window.responsibleDashboardInterval);
    }
    
    window.responsibleDashboardInterval = setInterval(() => {
        updateRecentTransactionsSimple();
        updateRecentPettyCashResponsible();
        
        const actionsContainer = document.getElementById('responsible-actions-list');
        if (actionsContainer) {
            actionsContainer.innerHTML = window.generateResponsibleActionsList();
        }
    }, 30000);
};

function updateRecentTransactionsSimple() {
    const container = document.getElementById('recent-transactions-simple');
    if (!container) return;
    
    const recent = [...state.transactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 10);
    
    let html = '';
    recent.forEach(t => {
        html += `
            <tr>
                <td>${t.time}</td>
                <td>${t.patientName.substring(0, 20)}${t.patientName.length > 20 ? '...' : ''}</td>
                <td>${t.service.substring(0, 20)}${t.service.length > 20 ? '...' : ''}</td>
                <td>${t.amount} Gdes</td>
                <td><span class="${t.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${t.status === 'paid' ? 'Payé' : 'Non payé'}</span></td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function updateRecentPettyCashResponsible() {
    const container = document.getElementById('recent-petty-cash-transactions');
    if (!container) return;
    
    const recent = [...state.pettyCashTransactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune extraction récente.</p>';
        return;
    }
    
    let html = '<div class="table-container"><table class="simplified-table">';
    html += '<thead><tr><th>Date</th><th>Montant</th><th>Raison</th><th>Statut</th></tr></thead><tbody>';
    
    recent.forEach(t => {
        html += `
            <tr>
                <td>${t.date} ${t.time}</td>
                <td>${t.amount} Gdes</td>
                <td>${t.reason.substring(0, 30)}${t.reason.length > 30 ? '...' : ''}</td>
                <td><span class="extraction-status status-${t.status}">${
                    t.status === 'approved' ? 'Approuvé' : 
                    t.status === 'pending' ? 'En attente' :
                    t.status === 'rejected' ? 'Rejeté' : 'Complété'
                }</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.generateResponsibleActionsList = function() {
    let actions = [];
    
    const pendingExtractions = state.pettyCashTransactions.filter(t => 
        t.status === 'pending' && t.requestedBy === state.currentUser.username
    );
    
    if (pendingExtractions.length > 0) {
        actions.push(`<div class="alert alert-warning">
            <i class="fas fa-clock"></i> ${pendingExtractions.length} extraction(s) en attente d'approbation
        </div>`);
    }
    
    if (state.pettyCash < 10000) {
        actions.push(`<div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> Solde de la petite caisse faible: ${state.pettyCash.toLocaleString()} Gdes
        </div>`);
    }
    
    const largeUnpaid = state.transactions.filter(t => 
        t.status === 'unpaid' && t.amount > 5000
    );
    
    if (largeUnpaid.length > 0) {
        actions.push(`<div class="alert alert-info">
            <i class="fas fa-money-bill-wave"></i> ${largeUnpaid.length} transaction(s) importante(s) non payée(s)
        </div>`);
    }
    
    if (actions.length === 0) {
        return '<p class="text-muted">Aucune action requise pour le moment.</p>';
    }
    
    return actions.join('');
};
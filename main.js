// Fichier principal pour initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Charger les données
    loadDemoData();
    updateLogoDisplay();
    checkPrivilegeExpirationAll();
    updateMessageBadge();
    
    // Initialiser les structures de données
    if (!state.creditAccounts) state.creditAccounts = {};
    if (!state.cashierBalances) state.cashierBalances = {};
    if (!state.mainCash) state.mainCash = 1000000;
    if (!state.pettyCash) state.pettyCash = 50000;
    if (!state.pettyCashTransactions) state.pettyCashTransactions = [];
    if (!state.reports) state.reports = [];
    if (!state.modulesInitialized) {
        state.modulesInitialized = {
            admin: false,
            responsible: false,
            cashier: false,
            secretary: false,
            pharmacy: false,
            settings: false,
            messaging: false
        };
    }
    
    initializeUserTransactions();
    
    console.log("Système hospitalier initialisé avec succès!");
}

function initializeUserTransactions() {
    state.userTransactions = {};
    state.transactions.forEach(t => {
        if (!state.userTransactions[t.createdBy]) {
            state.userTransactions[t.createdBy] = [];
        }
        state.userTransactions[t.createdBy].push(t);
    });
}

// Point d'entrée unique pour l'initialisation des modules après connexion
window.initializeRoleModules = function(role) {
    switch(role) {
        case 'admin':
            if (typeof window.initializeAdminFeatures === 'function') {
                window.initializeAdminFeatures();
            }
            break;
        case 'responsible':
            if (typeof window.initializeResponsibleFeatures === 'function') {
                window.initializeResponsibleFeatures();
            }
            break;
        case 'cashier':
            if (typeof window.initializeCashierFeatures === 'function') {
                window.initializeCashierFeatures();
            }
            break;
        case 'secretary':
            if (typeof window.initializeSecretaryFeatures === 'function') {
                window.initializeSecretaryFeatures();
            }
            break;
        case 'pharmacy':
            if (typeof window.initializePharmacyFeatures === 'function') {
                window.initializePharmacyFeatures();
            }
            break;
    }
};

// Fonctions globales
window.selectTransactionForEdit = function(transactionId) {
    if (state.currentRole === 'responsible') {
        alert("Vous n'avez pas la permission de modifier les transactions!");
        return;
    }
    document.getElementById('selected-transaction-id').value = transactionId;
    alert(`Transaction ${transactionId} sélectionnée pour modification`);
};

window.editUserTransactions = function(username) {
    if (state.currentRole === 'responsible') {
        alert("Vous n'avez pas la permission de modifier les transactions utilisateur!");
        return;
    }
    
    const user = state.users.find(u => u.username === username);
    if (!user) {
        alert("Utilisateur non trouvé!");
        return;
    }
    
    if (state.currentRole !== 'admin') {
        alert("Seul l'administrateur peut modifier les transactions utilisateur!");
        return;
    }
    
    const newAmount = parseFloat(prompt(`Modifier le total des transactions pour ${user.name} (${username}):\nValeur actuelle: ${state.userTransactions[username] ? state.userTransactions[username].reduce((sum, t) => sum + t.amount, 0) : 0} Gdes`));
    
    if (!isNaN(newAmount)) {
        if (state.userTransactions[username] && state.userTransactions[username].length > 0) {
            const transaction = state.userTransactions[username][0];
            const oldAmount = transaction.amount;
            transaction.amount = newAmount;
            
            alert(`Transaction ajustée de ${oldAmount} à ${newAmount} Gdes`);
            
            if (typeof updateAdminStats === 'function') updateAdminStats();
            if (typeof updateUserTransactionTotals === 'function') updateUserTransactionTotals();
        }
    }
};

window.checkAdminPermission = function(permission) {
    if (!state.currentRole || !state.roles[state.currentRole]) {
        return false;
    }
    return state.roles[state.currentRole][permission] === true;
};

window.exportUserReportToCSV = function() {
    if (state.currentRole === 'responsible') {
        alert("Vous n'avez pas la permission d'exporter des rapports détaillés!");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    let rows = [];
    
    rows.push(["Utilisateur", "Rôle", "Transactions créées", "Transactions traitées", "Montant créé", "Montant traité", "Dernière activité"]);
    
    const users = state.users;
    users.forEach(user => {
        const userTransactions = state.transactions.filter(t => 
            t.createdBy === user.username || 
            t.paymentAgent === user.username
        );
        
        const totalCreated = userTransactions.filter(t => t.createdBy === user.username)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalProcessed = userTransactions.filter(t => t.paymentAgent === user.username)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const lastActivity = userTransactions.length > 0 ? 
            new Date(Math.max(...userTransactions.map(t => new Date(t.date + ' ' + t.time).getTime()))).toLocaleDateString('fr-FR') : 'Jamais';
        
        rows.push([
            `${user.name} (${user.username})`,
            user.role,
            userTransactions.filter(t => t.createdBy === user.username).length,
            userTransactions.filter(t => t.paymentAgent === user.username).length,
            totalCreated,
            totalProcessed,
            lastActivity
        ]);
    });
    
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
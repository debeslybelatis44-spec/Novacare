// Fichier principal pour initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Initialiser les données de démo
    loadDemoData();
    
    // Initialiser l'affichage du logo
    updateLogoDisplay();
    
    // Vérifier l'expiration des privilèges au démarrage
    checkPrivilegeExpirationAll();
    
    // Mettre à jour les badges de messages
    updateMessageBadge();
    
    console.log("Système hospitalier initialisé avec succès!");
    
    // Initialiser les comptes de crédit si non existants
    if (!state.creditAccounts) state.creditAccounts = {};
    if (!state.cashierBalances) state.cashierBalances = {};
    if (!state.mainCash) state.mainCash = 1000000;
    if (!state.pettyCash) state.pettyCash = 0;
    if (!state.reports) state.reports = [];
    
    // Initialiser les transactions par utilisateur
    initializeUserTransactions();
    
    // Initialiser les composants globaux supplémentaires
    if (typeof setupCashier === 'function') {
        setupCashier();
    }
    
    if (typeof setupAdmin === 'function') {
        setupAdmin();
    }
    
    if (typeof setupSettings === 'function') {
        setupSettings();
    }
    
    if (typeof setupMessaging === 'function') {
        setupMessaging();
    }
    
    // Initialiser la pharmacie si elle est disponible
    if (typeof setupPharmacy === 'function') {
        setupPharmacy();
    }
    
    // Initialiser le secrétariat si disponible
    if (typeof setupSecretary === 'function') {
        setupSecretary();
    }
    
    console.log("Nouvelles fonctionnalités d'administration initialisées!");
}

function initializeUserTransactions() {
    // Initialiser les transactions par utilisateur
    state.userTransactions = {};
    state.transactions.forEach(t => {
        if (!state.userTransactions[t.createdBy]) {
            state.userTransactions[t.createdBy] = [];
        }
        state.userTransactions[t.createdBy].push(t);
    });
}

// Fonctions globales pour le système
window.selectTransactionForEdit = function(transactionId) {
    document.getElementById('selected-transaction-id').value = transactionId;
    alert(`Transaction ${transactionId} sélectionnée pour modification`);
};

window.editUserTransactions = function(username) {
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
        // Pour l'exemple, nous ajustons simplement une transaction
        if (state.userTransactions[username] && state.userTransactions[username].length > 0) {
            const transaction = state.userTransactions[username][0];
            const oldAmount = transaction.amount;
            transaction.amount = newAmount;
            
            // Mettre à jour les totaux
            alert(`Transaction ajustée de ${oldAmount} à ${newAmount} Gdes`);
            
            // Recharger les statistiques si nécessaire
            if (typeof updateAdminStats === 'function') updateAdminStats();
            if (typeof updateUserTransactionTotals === 'function') updateUserTransactionTotals();
        }
    }
};

// Fonction pour vérifier les permissions selon le rôle
window.checkAdminPermission = function(permission) {
    if (!state.currentRole || !state.roles[state.currentRole]) {
        return false;
    }
    
    return state.roles[state.currentRole][permission] === true;
};

// Fonction pour exporter le rapport utilisateur en CSV
window.exportUserReportToCSV = function() {
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
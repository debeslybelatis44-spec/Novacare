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
}
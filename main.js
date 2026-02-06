// Fichier principal pour initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Les modules sont initialisés par leurs propres fichiers
    // Cette fonction assure que les données de démo sont chargées
    loadDemoData();
    
    // Initialiser d'autres composants globaux si nécessaire
    console.log("Système hospitalier initialisé avec succès!");
}
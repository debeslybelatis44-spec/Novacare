// Configuration et état global de l'application
const state = {
    currentUser: null,
    currentRole: null,
    users: [],
    patients: [],
    transactions: [],
    consultationTypes: [],
    vitalTypes: [],
    labAnalysisTypes: [],
    externalServiceTypes: [],
    medicationStock: [],
    messages: [],
    appointments: [],
    exchangeRate: 130,
    hospitalLogo: null,
    hospitalName: "Hôpital Saint-Luc",
    hospitalAddress: "Port-au-Prince, Haïti",
    hospitalPhone: "(509) 1234-5678",
    
    // Nouvelles propriétés pour les crédits patients
    creditAccounts: {},
    
    // Propriétés pour la gestion des caisses
    mainCash: 1000000,
    pettyCash: 50000,
    cashierBalances: {},
    pettyCashTransactions: [],
    
    // Propriétés pour les rapports
    reports: [],
    
    // Indicateur d'initialisation des modules
    modulesInitialized: {
        admin: false,
        responsible: false,
        cashier: false,
        secretary: false,
        pharmacy: false,
        settings: false,
        messaging: false
    },
    
    // Rôles et permissions
    roles: {
        admin: {
            name: 'Administrateur',
            canViewDashboard: true,
            canManagePatients: true,
            canManageSecretary: true,
            canManageCashier: true,
            canManageNurse: true,
            canManageDoctor: true,
            canManageLab: true,
            canManagePharmacy: true,
            canManageMessaging: true,
            canManageAdministration: true,
            canManageSettings: true,
            canManageUsers: true,
            canManageTransactions: true,
            canModifyAllTransactions: true,
            canDeleteAllTransactions: true,
            canManageCash: true,
            canManagePettyCash: true,
            canManageCredits: true,
            canModifyPrivileges: true,
            canViewDetailedReports: true,
            canManagePettyCashExtractions: true,
            canApproveExtractions: true,
            canModifyPettyCashTransactions: true
        },
        responsible: {
            name: 'Responsable',
            canViewDashboard: true,
            canManagePatients: true,
            canManageSecretary: true,
            canManageCashier: true,
            canManageNurse: true,
            canManageDoctor: true,
            canManageLab: true,
            canManagePharmacy: true,
            canManageMessaging: true,
            canManageAdministration: true,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: true,
            canModifyAllTransactions: false,
            canDeleteAllTransactions: false,
            canManageCash: true,
            canManagePettyCash: true,
            canManageCredits: false,
            canModifyPrivileges: false,
            canViewDetailedReports: false,
            canManagePettyCashExtractions: true,
            canApproveExtractions: false,
            canModifyPettyCashTransactions: false
        },
        secretary: {
            name: 'Secrétariat',
            canViewDashboard: true,
            canManagePatients: true,
            canManageSecretary: true,
            canManageCashier: false,
            canManageNurse: false,
            canManageDoctor: false,
            canManageLab: false,
            canManagePharmacy: false,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: false
        },
        cashier: {
            name: 'Caisse',
            canViewDashboard: true,
            canManagePatients: false,
            canManageSecretary: false,
            canManageCashier: true,
            canManageNurse: false,
            canManageDoctor: false,
            canManageLab: false,
            canManagePharmacy: false,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: true
        },
        nurse: {
            name: 'Infirmier',
            canViewDashboard: true,
            canManagePatients: false,
            canManageSecretary: false,
            canManageCashier: false,
            canManageNurse: true,
            canManageDoctor: false,
            canManageLab: false,
            canManagePharmacy: false,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: false
        },
        doctor: {
            name: 'Médecin',
            canViewDashboard: true,
            canManagePatients: false,
            canManageSecretary: false,
            canManageCashier: false,
            canManageNurse: false,
            canManageDoctor: true,
            canManageLab: false,
            canManagePharmacy: false,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: false
        },
        lab: {
            name: 'Laboratoire',
            canViewDashboard: true,
            canManagePatients: false,
            canManageSecretary: false,
            canManageCashier: false,
            canManageNurse: false,
            canManageDoctor: false,
            canManageLab: true,
            canManagePharmacy: false,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: false
        },
        pharmacy: {
            name: 'Pharmacie',
            canViewDashboard: true,
            canManagePatients: false,
            canManageSecretary: false,
            canManageCashier: false,
            canManageNurse: false,
            canManageDoctor: false,
            canManageLab: false,
            canManagePharmacy: true,
            canManageMessaging: true,
            canManageAdministration: false,
            canManageSettings: false,
            canManageUsers: false,
            canManageTransactions: false
        }
    },
    
    // Données de démo
    demoUsers: [
        { id: 1, name: "Administrateur", role: "admin", username: "admin", password: "1234", active: true },
        { id: 2, name: "Responsable", role: "responsible", username: "responsible", password: "1234", active: true },
        { id: 3, name: "Secrétaire", role: "secretary", username: "secretary", password: "1234", active: true },
        { id: 4, name: "Caissier", role: "cashier", username: "cashier", password: "1234", active: true },
        { id: 5, name: "Infirmier", role: "nurse", username: "nurse", password: "1234", active: true },
        { id: 6, name: "Médecin", role: "doctor", username: "doctor", password: "1234", active: true },
        { id: 7, name: "Laboratoire", role: "lab", username: "lab", password: "1234", active: true },
        { id: 8, name: "Pharmacie", role: "pharmacy", username: "pharmacy", password: "1234", active: true }
    ]
};

// Fonctions utilitaires
function saveStateToLocalStorage() {
    try {
        const stateToSave = {
            users: state.users,
            patients: state.patients,
            transactions: state.transactions,
            consultationTypes: state.consultationTypes,
            vitalTypes: state.vitalTypes,
            labAnalysisTypes: state.labAnalysisTypes,
            externalServiceTypes: state.externalServiceTypes,
            medicationStock: state.medicationStock,
            messages: state.messages,
            appointments: state.appointments,
            exchangeRate: state.exchangeRate,
            hospitalLogo: state.hospitalLogo,
            hospitalName: state.hospitalName,
            hospitalAddress: state.hospitalAddress,
            hospitalPhone: state.hospitalPhone,
            creditAccounts: state.creditAccounts,
            mainCash: state.mainCash,
            pettyCash: state.pettyCash,
            cashierBalances: state.cashierBalances,
            pettyCashTransactions: state.pettyCashTransactions,
            reports: state.reports,
            modulesInitialized: state.modulesInitialized
        };
        localStorage.setItem('hospitalSystemState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
    }
}

function loadStateFromLocalStorage() {
    try {
        const savedState = localStorage.getItem('hospitalSystemState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            
            Object.keys(parsedState).forEach(key => {
                if (state.hasOwnProperty(key)) {
                    state[key] = parsedState[key];
                }
            });
            
            // S'assurer que les propriétés critiques existent
            if (!state.creditAccounts) state.creditAccounts = {};
            if (!state.mainCash) state.mainCash = 1000000;
            if (!state.pettyCash) state.pettyCash = 50000;
            if (!state.cashierBalances) state.cashierBalances = {};
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
            
            return true;
        }
    } catch (error) {
        console.error("Erreur lors du chargement:", error);
    }
    return false;
}

function loadDemoData() {
    const loaded = loadStateFromLocalStorage();
    
    if (!loaded) {
        state.users = [...state.demoUsers];
        
        state.consultationTypes = [
            { id: 1, name: "Consultation générale", price: 500, description: "Consultation médicale générale", active: true },
            { id: 2, name: "Consultation spécialisée", price: 1000, description: "Consultation avec un spécialiste", active: true },
            { id: 3, name: "Consultation urgence", price: 1500, description: "Consultation d'urgence", active: true },
            { id: 4, name: "Consultation pédiatrique", price: 400, description: "Consultation pour enfants", active: true }
        ];
        
        state.vitalTypes = [
            { id: 1, name: "Température", unit: "°C", min: 35, max: 42, active: true },
            { id: 2, name: "Pression artérielle", unit: "mmHg", min: 60, max: 200, active: true },
            { id: 3, name: "Fréquence cardiaque", unit: "bpm", min: 40, max: 180, active: true },
            { id: 4, name: "Saturation O2", unit: "%", min: 70, max: 100, active: true },
            { id: 5, name: "Glycémie", unit: "mg/dL", min: 50, max: 400, active: true }
        ];
        
        state.labAnalysisTypes = [
            { id: 1, name: "Numération sanguine", price: 800, resultType: "text", active: true },
            { id: 2, name: "Glycémie", price: 300, resultType: "text", active: true },
            { id: 3, name: "Cholestérol", price: 500, resultType: "text", active: true },
            { id: 4, name: "Radiographie", price: 1500, resultType: "image", active: true },
            { id: 5, name: "Échographie", price: 2000, resultType: "image", active: true }
        ];
        
        state.externalServiceTypes = [
            { id: 1, name: "Transport ambulance", price: 2000, active: true },
            { id: 2, name: "Matériel orthopédique", price: 5000, active: true },
            { id: 3, name: "Médicaments externes", price: 3000, active: true }
        ];
        
        state.medicationStock = [
            { id: "MED001", name: "Paracétamol", genericName: "Paracetamol", form: "comprimé", quantity: 100, unit: "comprimés", alertThreshold: 20, price: 50, reserved: 0 },
            { id: "MED002", name: "Amoxicilline", genericName: "Amoxicillin", form: "capsule", quantity: 50, unit: "capsules", alertThreshold: 10, price: 150, reserved: 0 },
            { id: "MED003", name: "Ibuprofène", genericName: "Ibuprofen", form: "comprimé", quantity: 75, unit: "comprimés", alertThreshold: 15, price: 80, reserved: 0 },
            { id: "MED004", name: "Vitamine C", genericName: "Ascorbic Acid", form: "comprimé", quantity: 200, unit: "comprimés", alertThreshold: 50, price: 30, reserved: 0 }
        ];
        
        state.pettyCashTransactions = [
            {
                id: "PETTY001",
                date: new Date().toISOString().split('T')[0],
                time: "09:30",
                amount: 5000,
                type: "extraction",
                reason: "Achat fournitures bureau",
                requestedBy: "responsible",
                approvedBy: "admin",
                status: "approved",
                notes: "Fournitures achetées chez Papeterie Centrale"
            },
            {
                id: "PETTY002",
                date: new Date().toISOString().split('T')[0],
                time: "14:15",
                amount: 3000,
                type: "extraction",
                reason: "Courses pour cuisine",
                requestedBy: "responsible",
                approvedBy: "admin",
                status: "completed",
                notes: ""
            }
        ];
        
        state.cashierBalances = {
            "cashier": {
                balance: 50000,
                transactions: []
            }
        };
        
        saveStateToLocalStorage();
    }
}

function updateLogoDisplay() {
    if (state.hospitalLogo) {
        document.getElementById('login-logo')?.setAttribute('src', state.hospitalLogo);
        document.getElementById('login-logo')?.style.display = 'block';
        document.getElementById('login-icon')?.style.display = 'none';
        
        document.getElementById('header-logo')?.setAttribute('src', state.hospitalLogo);
        document.getElementById('header-logo')?.style.display = 'block';
        document.getElementById('header-icon')?.style.display = 'none';
        
        document.getElementById('card-logo')?.setAttribute('src', state.hospitalLogo);
        document.getElementById('card-logo')?.style.display = 'block';
        
        document.getElementById('certificate-logo')?.setAttribute('src', state.hospitalLogo);
        document.getElementById('certificate-logo')?.style.display = 'block';
        
        document.getElementById('invoice-logo')?.setAttribute('src', state.hospitalLogo);
        document.getElementById('invoice-logo')?.style.display = 'block';
    }
}

// Réinitialiser les indicateurs d'initialisation lors de la déconnexion
function resetModulesInitialized() {
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

document.addEventListener('DOMContentLoaded', () => {
    loadDemoData();
    updateLogoDisplay();
});
// Configuration et état global
const state = {
    currentUser: null,
    currentRole: null,
    patients: [],
    consultations: [],
    labAnalyses: [],
    prescriptions: [],
    transactions: [],
    vitals: [],
    medicationStock: [],
    appointments: [],
    users: [
        { id: 1, name: "Administrateur", role: "admin", username: "admin", password: "1234", active: true },
        { id: 2, name: "Secrétaire", role: "secretary", username: "secretary", password: "1234", active: true },
        { id: 3, name: "Caissier", role: "cashier", username: "cashier", password: "1234", active: true },
        { id: 4, name: "Infirmier", role: "nurse", username: "nurse", password: "1234", active: true },
        { id: 5, name: "Docteur", role: "doctor", username: "doctor", password: "1234", active: true },
        { id: 6, name: "Laboratoire", role: "lab", username: "lab", password: "1234", active: true },
        { id: 7, name: "Pharmacien", role: "pharmacy", username: "pharmacy", password: "1234", active: true },
        { id: 8, name: "Responsable", role: "responsible", username: "responsible", password: "1234", active: true }
    ],
    consultationTypes: [
        { id: 1, name: "Consultation générale", price: 500, description: "Consultation médicale standard", active: true },
        { id: 2, name: "Urgence", price: 1000, description: "Consultation en urgence", active: true },
        { id: 3, name: "Pédiatrie", price: 400, description: "Consultation pour enfants", active: true }
    ],
    vitalTypes: [
        { id: 1, name: "Tension artérielle", unit: "mmHg", min: 90, max: 140, active: true },
        { id: 2, name: "Température", unit: "°C", min: 36, max: 38, active: true },
        { id: 3, name: "Pouls", unit: "bpm", min: 60, max: 100, active: true },
        { id: 4, name: "Fréquence respiratoire", unit: "rpm", min: 12, max: 20, active: true },
        { id: 5, name: "Saturation O2", unit: "%", min: 95, max: 100, active: true },
        { id: 6, name: "Glycémie", unit: "mg/dL", min: 70, max: 140, active: true }
    ],
    labAnalysisTypes: [
        { id: 1, name: "Hémogramme complet", price: 300, resultType: "text", active: true },
        { id: 2, name: "Glycémie à jeun", price: 150, resultType: "text", active: true },
        { id: 3, name: "Créatinine", price: 200, resultType: "text", active: true },
        { id: 4, name: "Radiographie pulmonaire", price: 500, resultType: "image", active: true }
    ],
    externalServiceTypes: [
        { id: 1, name: "Ambulance", price: 1500, active: true },
        { id: 2, name: "Chambre privée", price: 2000, active: true },
        { id: 3, name: "Matériel médical", price: 3000, active: true }
    ],
    externalServices: [],
    patientCounter: 1,
    transactionCounter: 1,
    messages: [],
    unreadMessages: 0,
    currentConversation: null,
    currentModifiedConsultation: null,
    currentModifiedAnalysis: null,
    hospitalLogo: null,
    exchangeRate: 130,
    
    // NOUVEAUX ÉTATS
    pettyCash: 50000,
    mainCash: 1000000,
    creditAccounts: {},
    userTransactions: {},
    reports: [],
    cashierBalances: {},
    roles: {
        admin: {
            canModifyAllTransactions: true,
            canDeleteAllTransactions: true,
            canManagePettyCash: true,
            canGenerateAllReports: true,
            canManageAllUsers: true,
            canEditAllData: true
        },
        responsible: {
            canModifyAllTransactions: false,
            canDeleteAllTransactions: false,
            canManagePettyCash: true,
            canGenerateAllReports: true,
            canManageAllUsers: false,
            canEditAllData: false
        }
    },
    
    // NOUVEAUTÉS 2025
    notifications: [], // file d'attente des notifications (optionnel)
    suppliers: [],     // fournisseurs
    paymentMethodBalances: {
        cash: 0,
        moncash: 0,
        natcash: 0,
        card: 0,
        external: 0
    },
    employeePayments: [] // historique des paiements employés
};

function updateLogoDisplay() {
    if (state.hospitalLogo) {
        const headerLogo = document.getElementById('header-logo');
        const headerIcon = document.getElementById('header-icon');
        if (headerLogo && headerIcon) {
            headerLogo.src = state.hospitalLogo;
            headerLogo.style.display = 'block';
            headerIcon.style.display = 'none';
        }
        
        const loginLogo = document.getElementById('login-logo');
        const loginIcon = document.getElementById('login-icon');
        if (loginLogo && loginIcon) {
            loginLogo.src = state.hospitalLogo;
            loginLogo.style.display = 'block';
            loginIcon.style.display = 'none';
        }
    }
}

function updateMessageBadge() {
    if (!state.currentUser) return;
    
    const unreadCount = state.messages.filter(m => 
        m.recipient === state.currentUser.username && 
        !m.read
    ).length;
    
    const badge = document.getElementById('message-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    state.unreadMessages = unreadCount;
}

function checkUnreadMessages() {
    updateMessageBadge();
}

function sendNotificationToCashier(transaction) {
    const cashiers = state.users.filter(u => u.role === 'cashier' && u.active);
    cashiers.forEach(cashier => {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: cashier.username,
            recipientRole: cashier.role,
            subject: 'Nouvelle transaction',
            content: `Nouvelle transaction créée pour le patient ${transaction.patientName}: ${transaction.service} - ${transaction.amount} Gdes`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'transaction_notification'
        };
        state.messages.push(message);
    });
    updateMessageBadge();
}

function sendPaymentNotification(transaction) {
    const roles = ['admin', 'responsible', 'secretary', 'doctor', 'nurse', 'lab', 'pharmacy'];
    roles.forEach(role => {
        const users = state.users.filter(u => u.role === role && u.active && u.username !== state.currentUser.username);
        users.forEach(user => {
            const message = {
                id: 'MSG' + Date.now(),
                sender: state.currentUser.username,
                senderRole: state.currentRole,
                recipient: user.username,
                recipientRole: user.role,
                subject: 'Paiement effectué',
                content: `Paiement effectué pour le patient ${transaction.patientName}: ${transaction.service} - ${transaction.amount} Gdes`,
                timestamp: new Date().toISOString(),
                read: false,
                type: 'payment_notification'
            };
            state.messages.push(message);
        });
    });
    updateMessageBadge();
}

function showSection(sectionId) {
    const tab = document.querySelector(`.nav-tab[data-target="${sectionId}"]`);
    if (tab) {
        tab.click();
    }
}

function viewPatientCard(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    document.getElementById('card-hospital-name').textContent = document.getElementById('hospital-name')?.value || 'Hôpital Saint-Luc';
    document.getElementById('card-hospital-address').textContent = document.getElementById('hospital-address')?.value || 'Port-au-Prince, Haïti';
    
    if (state.hospitalLogo) {
        document.getElementById('card-logo').src = state.hospitalLogo;
        document.getElementById('card-logo').style.display = 'block';
    }
    
    document.getElementById('card-patient-name').textContent = patient.fullName;
    document.getElementById('card-patient-id').textContent = patient.id;
    document.getElementById('card-patient-dob').textContent = patient.birthDate;
    document.getElementById('card-patient-phone').textContent = patient.phone;
    document.getElementById('card-issue-date').textContent = new Date().toLocaleDateString('fr-FR');
    
    const typeElement = document.getElementById('card-patient-type');
    if (patient.type === 'urgence') {
        typeElement.textContent = 'URGENCE';
        typeElement.className = 'emergency-patient-tag';
    } else if (patient.type === 'pediatrie') {
        typeElement.textContent = 'PÉDIATRIE';
        typeElement.className = 'pediatric-tag';
    } else if (patient.type === 'externe') {
        typeElement.textContent = 'EXTERNE';
        typeElement.className = 'external-patient-tag';
    } else {
        typeElement.textContent = 'STANDARD';
        typeElement.className = '';
    }
    
    if (patient.vip) {
        typeElement.textContent += ' VIP';
        typeElement.classList.add('vip-tag');
    } else if (patient.sponsored) {
        typeElement.textContent += ` SPONSORISÉ (${patient.discountPercentage}%)`;
        typeElement.classList.add('vip-tag');
    } else if (patient.hasCreditPrivilege) {
        typeElement.textContent += ` CRÉDIT (${patient.creditLimit} Gdes)`;
        typeElement.classList.add('credit-tag');
    } else if (patient.hospitalized) {
        typeElement.textContent += ' HOSPITALISÉ';
        typeElement.classList.add('hospitalized-tag');
    }
    
    const container = document.getElementById('patient-card-container');
    if (container) {
        container.classList.remove('hidden');
        
        setTimeout(() => {
            window.print();
            container.classList.add('hidden');
        }, 500);
    }
}

function checkPrivilegeExpirationAll() {
    const now = new Date();
    state.patients.forEach(patient => {
        if (patient.privilegeGrantedDate) {
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
                
                console.log(`Privilèges expirés pour ${patient.fullName} (${patient.id})`);
            }
        }
    });
}

function loadDemoData() {
    state.patients.push(
        {
            id: 'PAT0001',
            fullName: 'Jean Dupont',
            birthDate: '1980-05-15',
            address: '123 Rue Principale, Port-au-Prince',
            phone: '1234-5678',
            responsible: '',
            type: 'normal',
            allergies: 'Pénicilline',
            notes: 'Patient suivi pour hypertension',
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: null,
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '08:30',
            registeredBy: 'secretary',
            hospitalized: false,
            hospitalizationStartDate: null,
            hospitalizationServices: []
        },
        {
            id: 'URG0002',
            fullName: 'Marie Curie',
            birthDate: '1992-11-22',
            address: '456 Avenue de la Santé',
            phone: '8765-4321',
            responsible: '',
            type: 'urgence',
            allergies: 'Aucune',
            notes: 'Patient en urgence',
            vip: true,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: new Date().toISOString(),
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '09:15',
            registeredBy: 'secretary',
            hospitalized: false
        },
        {
            id: 'PED0003',
            fullName: 'Luc Petit',
            birthDate: '2018-03-10',
            address: '789 Rue des Enfants',
            phone: '2345-6789',
            responsible: 'Sophie Petit',
            type: 'pediatrie',
            allergies: 'Aspirine',
            notes: 'Enfant de 6 ans',
            vip: false,
            sponsored: true,
            discountPercentage: 20,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: new Date().toISOString(),
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '10:00',
            registeredBy: 'secretary',
            hospitalized: false
        },
        {
            id: 'EXT0004',
            fullName: 'Paul Externe',
            birthDate: '1975-08-20',
            address: '101 Rue Externe',
            phone: '3456-7890',
            responsible: '',
            type: 'externe',
            allergies: 'Aucune',
            notes: 'Service externe uniquement',
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: null,
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '11:00',
            registeredBy: 'secretary',
            hospitalized: false
        },
        {
            id: 'CRD0005',
            fullName: 'Sophie Crédit',
            birthDate: '1985-07-30',
            address: '202 Avenue du Crédit',
            phone: '4567-8901',
            responsible: '',
            type: 'normal',
            allergies: 'Aucune',
            notes: 'Patient avec privilège crédit',
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: true,
            creditLimit: 5000,
            creditUsed: 0,
            privilegeGrantedDate: new Date().toISOString(),
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '14:00',
            registeredBy: 'secretary',
            hospitalized: false
        },
        {
            id: 'HOS0006',
            fullName: 'Gérard Hospitalisé',
            birthDate: '1970-02-10',
            address: '303 Rue de l\'Hôpital',
            phone: '5678-9012',
            responsible: '',
            type: 'normal',
            allergies: 'Aucune',
            notes: 'Patient hospitalisé',
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: null,
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: '09:00',
            registeredBy: 'secretary',
            hospitalized: true,
            hospitalizationStartDate: new Date().toISOString().split('T')[0],
            hospitalizationServices: []
        }
    );
    
    state.medicationStock.push(
        {
            id: 'MED001',
            name: 'Paracétamol 500mg',
            genericName: 'Acétaminophène',
            form: 'Comprimé',
            quantity: 150,
            unit: 'comprimés',
            alertThreshold: 20,
            price: 5,
            reserved: 0,
            supplier: null,
            purchaseType: 'cash'
        },
        {
            id: 'MED002',
            name: 'Amoxicilline 500mg',
            genericName: 'Amoxicilline',
            form: 'Capsule',
            quantity: 80,
            unit: 'capsules',
            alertThreshold: 10,
            price: 15,
            reserved: 0
        },
        {
            id: 'MED003',
            name: 'Ibuprofène 400mg',
            genericName: 'Ibuprofène',
            form: 'Comprimé',
            quantity: 5,
            unit: 'comprimés',
            alertThreshold: 10,
            price: 8,
            reserved: 0
        },
        {
            id: 'MED004',
            name: 'Métronidazole 250mg',
            genericName: 'Métronidazole',
            form: 'Comprimé',
            quantity: 0,
            unit: 'comprimés',
            alertThreshold: 10,
            price: 12,
            reserved: 0
        }
    );
    
    state.transactions.push(
        {
            id: 'TR0001',
            patientId: 'PAT0001',
            patientName: 'Jean Dupont',
            service: 'Consultation: Consultation générale',
            amount: 500,
            status: 'paid',
            date: new Date().toISOString().split('T')[0],
            time: '08:45',
            createdBy: 'secretary',
            type: 'consultation',
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentTime: '09:00',
            paymentAgent: 'cashier',
            paymentCurrency: 'HTG',
            exchangeRate: 130,
            amountGiven: 500,
            amountGivenInHTG: 500
        },
        {
            id: 'TR0002',
            patientId: 'URG0002',
            patientName: 'Marie Curie',
            service: 'Consultation: Urgence',
            amount: 1000,
            status: 'paid',
            date: new Date().toISOString().split('T')[0],
            time: '09:30',
            createdBy: 'secretary',
            type: 'consultation',
            paymentMethod: 'vip',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentTime: '09:30',
            paymentAgent: 'system',
            paymentCurrency: 'HTG',
            exchangeRate: 130,
            amountGiven: 0,
            amountGivenInHTG: 0
        },
        {
            id: 'EXT0001',
            patientId: 'EXT0004',
            patientName: 'Paul Externe',
            service: 'Service externe: Ambulance',
            amount: 1500,
            status: 'unpaid',
            date: new Date().toISOString().split('T')[0],
            time: '11:15',
            createdBy: 'secretary',
            type: 'external',
            notificationSent: true
        },
        {
            id: 'CRD0001',
            patientId: 'CRD0005',
            patientName: 'Sophie Crédit',
            service: 'Consultation: Consultation générale',
            amount: 500,
            status: 'unpaid',
            date: new Date().toISOString().split('T')[0],
            time: '14:15',
            createdBy: 'secretary',
            type: 'consultation',
            notificationSent: true
        }
    );
    
    state.vitals.push(
        {
            patientId: 'PAT0001',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            takenBy: 'nurse',
            values: {
                'Tension artérielle': { value: '120/80', unit: 'mmHg', normalRange: '90 - 140' },
                'Température': { value: '37.2', unit: '°C', normalRange: '36 - 38' },
                'Pouls': { value: '72', unit: 'bpm', normalRange: '60 - 100' }
            }
        }
    );
    
    state.consultations.push(
        {
            id: 'CONS0001',
            patientId: 'PAT0001',
            patientName: 'Jean Dupont',
            doctor: 'doctor',
            date: new Date().toISOString().split('T')[0],
            time: '09:30',
            diagnosis: 'Fièvre légère et maux de tête. Pas de signes alarmants.',
            notes: 'Prescrire paracétamol et repos',
            followupDate: '',
            followupTime: '',
            status: 'completed'
        }
    );
    
    state.appointments.push(
        {
            id: 'APP0001',
            patientId: 'PAT0001',
            patientName: 'Jean Dupont',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: '10:00',
            reason: 'Contrôle post-consultation',
            doctor: 'doctor',
            createdBy: 'secretary',
            status: 'scheduled'
        }
    );
    
    state.messages.push(
        {
            id: 'MSG0001',
            sender: 'secretary',
            senderRole: 'secretary',
            recipient: 'doctor',
            recipientRole: 'doctor',
            subject: 'Nouveau patient urgent',
            content: 'Patient Marie Curie (URG0002) nécessite une consultation urgente.',
            timestamp: new Date().toISOString(),
            read: false,
            type: 'notification'
        },
        {
            id: 'MSG0002',
            sender: 'doctor',
            senderRole: 'doctor',
            recipient: 'nurse',
            recipientRole: 'nurse',
            subject: 'Signes vitaux',
            content: 'Veuillez prendre les signes vitaux du patient PAT0001 avant la consultation.',
            timestamp: new Date().toISOString(),
            read: false,
            type: 'notification'
        }
    );
    
    // Données de démonstration pour les nouvelles fonctionnalités
    state.creditAccounts = {
        'CRD0005': {
            balance: 0,
            limit: 5000,
            used: 0,
            available: 5000,
            history: [
                {
                    date: new Date().toISOString().split('T')[0],
                    time: '14:00',
                    amount: 5000,
                    type: 'credit_attribution',
                    by: 'admin',
                    note: 'Attribution initiale de crédit',
                    newBalance: 5000
                }
            ]
        }
    };
    
    state.pettyCash = 50000;
    state.mainCash = 1000000;
    state.paymentMethodBalances = {
        cash: 800000,
        moncash: 100000,
        natcash: 50000,
        card: 40000,
        external: 10000
    };
    
    state.cashierBalances = {
        'cashier': {
            balance: 500,
            transactions: [
                {
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    type: 'initial',
                    amount: 500,
                    patientId: 'PAT0001',
                    transactionId: 'TR0001'
                }
            ]
        }
    };
    
    // Fournisseurs
    state.suppliers = [
        { id: 1, name: 'PharmaLab', type: 'credit', contact: 'contact@pharmalab.com' },
        { id: 2, name: 'MediDist', type: 'cash', contact: '555-1234' }
    ];
    
    // Ajouter le fournisseur aux médicaments existants
    state.medicationStock[0].supplier = 1;
    state.medicationStock[0].purchaseType = 'credit';
    state.medicationStock[1].supplier = 2;
    state.medicationStock[1].purchaseType = 'cash';
    
    state.patientCounter = 7;
    state.transactionCounter = 5;
}

// Fonction pour sauvegarder l'état localement
function saveStateToLocalStorage() {
    try {
        localStorage.setItem('hospitalSystemState', JSON.stringify(state));
        console.log('État sauvegardé dans localStorage');
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
    }
}

// Fonction pour charger l'état depuis le localStorage
function loadStateFromLocalStorage() {
    try {
        const savedState = localStorage.getItem('hospitalSystemState');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            
            // Fusionner avec l'état actuel en conservant les références importantes
            Object.assign(state, parsed);
            
            // S'assurer que les structures de données existent
            if (!state.creditAccounts) state.creditAccounts = {};
            if (!state.cashierBalances) state.cashierBalances = {};
            if (!state.reports) state.reports = [];
            if (!state.roles) state.roles = {
                admin: { canModifyAllTransactions: true, canDeleteAllTransactions: true, canManagePettyCash: true, canGenerateAllReports: true, canManageAllUsers: true, canEditAllData: true },
                responsible: { canModifyAllTransactions: true, canDeleteAllTransactions: false, canManagePettyCash: false, canGenerateAllReports: true, canManageAllUsers: false, canEditAllData: false }
            };
            
            // S'assurer que les patients ont les nouveaux champs
            state.patients.forEach(patient => {
                if (patient.hasCreditPrivilege === undefined) {
                    patient.hasCreditPrivilege = false;
                    patient.creditLimit = 0;
                    patient.creditUsed = 0;
                }
                if (patient.hospitalized === undefined) {
                    patient.hospitalized = false;
                    patient.hospitalizationStartDate = null;
                    patient.hospitalizationServices = [];
                }
            });
            
            // S'assurer que paymentMethodBalances existe
            if (!state.paymentMethodBalances) {
                state.paymentMethodBalances = { cash:0, moncash:0, natcash:0, card:0, external:0 };
            }
            
            // S'assurer que suppliers existe
            if (!state.suppliers) state.suppliers = [];
            
            // S'assurer que employeePayments existe
            if (!state.employeePayments) state.employeePayments = [];
            
            console.log('État chargé depuis localStorage');
            return true;
        }
    } catch (e) {
        console.error('Erreur lors du chargement:', e);
    }
    return false;
}

// Sauvegarder automatiquement toutes les 30 secondes
setInterval(saveStateToLocalStorage, 30000);

// Charger l'état au démarrage si disponible
document.addEventListener('DOMContentLoaded', () => {
    if (!loadStateFromLocalStorage()) {
        // Si aucun état sauvegardé, charger les données de démo
        loadDemoData();
    }
});
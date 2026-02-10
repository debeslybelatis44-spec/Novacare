// Gestion de l'authentification
document.addEventListener('DOMContentLoaded', () => {
    setupLogin();
});

function setupLogin() {
    const loginButtons = document.querySelectorAll('.login-role-btn');
    loginButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            loginButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
}

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const selectedRole = document.querySelector('.login-role-btn.active').dataset.role;
    
    // Vérifier les identifiants
    const user = state.users.find(u => 
        u.username === username && 
        u.password === password && 
        u.role === selectedRole &&
        u.active === true
    );
    
    if (user) {
        // Connexion réussie
        state.currentUser = user;
        state.currentRole = user.role;
        
        // Enregistrer la session
        localStorage.setItem('currentSession', JSON.stringify({
            userId: user.id,
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString()
        }));
        
        // Mettre à jour l'interface
        updateUIAfterLogin();
        
        // Afficher l'application principale
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Mettre à jour l'en-tête
        document.getElementById('current-username').textContent = user.name;
        document.getElementById('current-user-role').textContent = state.roles[user.role].name;
        document.getElementById('dashboard-role').textContent = state.roles[user.role].name;
        
        // Mettre à jour l'affichage du logo
        updateLogoDisplay();
        
        // Charger le tableau de bord en fonction du rôle
        loadRoleSpecificDashboard();
        
        // Appliquer les restrictions d'interface selon le rôle
        applyRoleBasedUI();
        
        // Initialiser les messages
        updateMessageBadge();
        
        // Vérifier l'expiration des privilèges
        checkPrivilegeExpirationAll();
        
        // Initialiser les fonctionnalités spécifiques au rôle
        if (user.role === 'responsible') {
            setupResponsibleFeatures();
        }
        
        console.log(`Utilisateur ${user.name} (${user.role}) connecté avec succès`);
        
    } else {
        alert("Identifiants incorrects ou rôle non autorisé!");
    }
}

function updateUIAfterLogin() {
    // Mettre à jour le nom de l'hôpital dans l'en-tête
    document.getElementById('hospital-name-header').textContent = state.hospitalName;
    document.getElementById('hospital-address-header').textContent = state.hospitalAddress;
    document.getElementById('hospital-name-login').textContent = state.hospitalName;
}

function logout() {
    // Enregistrer l'activité de déconnexion
    const activity = {
        id: 'ACT' + Date.now(),
        action: 'logout',
        user: state.currentUser.username,
        timestamp: new Date().toISOString(),
        details: `Déconnexion de ${state.currentUser.name}`
    };
    
    if (!state.reports) state.reports = [];
    state.reports.push(activity);
    
    // Nettoyer la session
    localStorage.removeItem('currentSession');
    
    // Réinitialiser l'état
    state.currentUser = null;
    state.currentRole = null;
    
    // Revenir à l'écran de connexion
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    
    // Réinitialiser le formulaire de connexion
    document.getElementById('login-form').reset();
    document.querySelectorAll('.login-role-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.login-role-btn[data-role="admin"]').classList.add('active');
    
    console.log("Déconnexion réussie");
}

// Vérifier la session existante au chargement
function checkExistingSession() {
    const session = localStorage.getItem('currentSession');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            const user = state.users.find(u => u.id === sessionData.userId);
            
            if (user) {
                // Vérifier si la session a expiré (8 heures)
                const loginTime = new Date(sessionData.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 8) {
                    // Session valide, reconnecter automatiquement
                    state.currentUser = user;
                    state.currentRole = user.role;
                    
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('main-app').classList.remove('hidden');
                    
                    document.getElementById('current-username').textContent = user.name;
                    document.getElementById('current-user-role').textContent = state.roles[user.role].name;
                    document.getElementById('dashboard-role').textContent = state.roles[user.role].name;
                    
                    updateUIAfterLogin();
                    loadRoleSpecificDashboard();
                    applyRoleBasedUI();
                    
                    if (user.role === 'responsible') {
                        setupResponsibleFeatures();
                    }
                    
                    console.log(`Session restaurée pour ${user.name}`);
                    return true;
                }
            }
        } catch (error) {
            console.error("Erreur lors de la restauration de la session:", error);
        }
    }
    return false;
}

// Vérifier les permissions
function hasPermission(permission) {
    if (!state.currentRole || !state.roles[state.currentRole]) {
        return false;
    }
    return state.roles[state.currentRole][permission] === true;
}

// Charger le tableau de bord spécifique au rôle
function loadRoleSpecificDashboard() {
    const role = state.currentRole;
    const container = document.getElementById('role-dashboard-content');
    
    if (!container) return;
    
    let dashboardHTML = '';
    
    switch(role) {
        case 'admin':
            dashboardHTML = generateAdminDashboard();
            break;
        case 'responsible':
            dashboardHTML = generateResponsibleDashboard();
            break;
        case 'secretary':
            dashboardHTML = generateSecretaryDashboard();
            break;
        case 'cashier':
            dashboardHTML = generateCashierDashboard();
            break;
        case 'nurse':
            dashboardHTML = generateNurseDashboard();
            break;
        case 'doctor':
            dashboardHTML = generateDoctorDashboard();
            break;
        case 'lab':
            dashboardHTML = generateLabDashboard();
            break;
        case 'pharmacy':
            dashboardHTML = generatePharmacyDashboard();
            break;
        default:
            dashboardHTML = '<p>Tableau de bord non disponible pour ce rôle.</p>';
    }
    
    container.innerHTML = dashboardHTML;
    
    // Initialiser les événements du tableau de bord
    initDashboardEvents(role);
}

// Générer le tableau de bord pour le responsable
function generateResponsibleDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = state.transactions.filter(t => t.date === today);
    const todayAmount = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const pendingExtractions = state.pettyCashTransactions.filter(t => 
        t.status === 'pending' || t.status === 'requested'
    ).length;
    
    return `
        <div class="responsible-dashboard-stats">
            <div class="responsible-stat-card">
                <i class="fas fa-money-bill-wave fa-2x" style="color:#1a6bca;"></i>
                <h4>${todayAmount.toLocaleString()} Gdes</h4>
                <p>Recettes aujourd'hui</p>
            </div>
            
            <div class="responsible-stat-card">
                <i class="fas fa-cash-register fa-2x" style="color:#28a745;"></i>
                <h4>${state.pettyCash.toLocaleString()} Gdes</h4>
                <p>Petite caisse disponible</p>
            </div>
            
            <div class="responsible-stat-card">
                <i class="fas fa-clock fa-2x" style="color:#ffc107;"></i>
                <h4>${pendingExtractions}</h4>
                <p>Extractions en attente</p>
            </div>
            
            <div class="responsible-stat-card">
                <i class="fas fa-users fa-2x" style="color:#17a2b8;"></i>
                <h4>${state.patients.filter(p => p.registrationDate === today).length}</h4>
                <p>Nouveaux patients</p>
            </div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-exclamation-circle"></i> Actions Requises</h3>
            <div id="responsible-actions-list">
                ${generateResponsibleActionsList()}
            </div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-history"></i> Dernières Transactions</h3>
            <div class="table-container">
                <table class="simplified-table">
                    <thead>
                        <tr>
                            <th>Heure</th>
                            <th>Patient</th>
                            <th>Service</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody id="recent-transactions-simple"></tbody>
                </table>
            </div>
        </div>
        
        <div class="card mt-3">
            <h3><i class="fas fa-wallet"></i> Petite Caisse - Dernières Extractions</h3>
            <div id="recent-petty-cash-transactions"></div>
            <button class="btn btn-primary mt-2" onclick="showPettyCashManagement()">
                <i class="fas fa-cog"></i> Gérer la petite caisse
            </button>
        </div>
    `;
}

function generateResponsibleActionsList() {
    let actions = [];
    
    // Vérifier les extractions en attente
    const pendingExtractions = state.pettyCashTransactions.filter(t => 
        t.status === 'pending' && t.requestedBy === state.currentUser.username
    );
    
    if (pendingExtractions.length > 0) {
        actions.push(`<div class="alert alert-warning">
            <i class="fas fa-clock"></i> ${pendingExtractions.length} extraction(s) en attente d'approbation
        </div>`);
    }
    
    // Vérifier le solde faible de la petite caisse
    if (state.pettyCash < 10000) {
        actions.push(`<div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> Solde de la petite caisse faible: ${state.pettyCash.toLocaleString()} Gdes
        </div>`);
    }
    
    // Vérifier les transactions non payées importantes
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
}

function initDashboardEvents(role) {
    if (role === 'responsible') {
        // Charger les transactions récentes
        updateRecentTransactionsSimple();
        updateRecentPettyCashTransactions();
        
        // Mettre à jour périodiquement
        setInterval(() => {
            updateRecentTransactionsSimple();
            updateRecentPettyCashTransactions();
            document.getElementById('responsible-actions-list').innerHTML = generateResponsibleActionsList();
        }, 30000);
    }
}

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

function updateRecentPettyCashTransactions() {
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

// Appliquer les restrictions d'interface selon le rôle
function applyRoleBasedUI() {
    const role = state.currentRole;
    
    // Masquer les onglets non autorisés
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const target = tab.dataset.target;
        
        switch(target) {
            case 'settings':
                if (!hasPermission('canManageSettings')) {
                    tab.style.display = 'none';
                } else {
                    tab.style.display = 'flex';
                }
                break;
                
            case 'administration':
                if (!hasPermission('canManageAdministration')) {
                    tab.style.display = 'none';
                } else {
                    tab.style.display = 'flex';
                }
                break;
                
            default:
                tab.style.display = 'flex';
        }
    });
    
    // Appliquer les classes CSS pour les contrôles en lecture seule
    if (role === 'responsible') {
        document.querySelectorAll('.btn-danger, .btn-warning').forEach(btn => {
            if (btn.textContent.includes('Supprimer') || btn.textContent.includes('Modifier')) {
                btn.classList.add('hidden-for-responsible');
            }
        });
        
        // Rendre les champs de formulaire en lecture seule dans l'administration
        document.querySelectorAll('#administration input, #administration select, #administration textarea').forEach(input => {
            if (!input.classList.contains('no-readonly')) {
                input.classList.add('readonly-field');
                input.disabled = true;
            }
        });
    }
    
    // Mettre à jour le titre de l'administration selon le rôle
    if (role === 'responsible') {
        const adminTitle = document.querySelector('#administration .section-title');
        if (adminTitle) {
            adminTitle.innerHTML = '<i class="fas fa-chart-bar"></i> Direction - Vue d\'ensemble';
        }
    }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
    if (checkExistingSession()) {
        console.log("Session existante restaurée");
    }
    
    // Gestionnaire de déconnexion
    document.getElementById('logout-btn')?.addEventListener('click', logout);
});
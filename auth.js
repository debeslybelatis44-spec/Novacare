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
    
    const user = state.users.find(u => 
        u.username === username && 
        u.password === password && 
        u.role === selectedRole &&
        u.active === true
    );
    
    if (user) {
        state.currentUser = user;
        state.currentRole = user.role;
        
        // Réinitialiser les modules initialisés
        resetModulesInitialized();
        
        localStorage.setItem('currentSession', JSON.stringify({
            userId: user.id,
            username: user.username,
            role: user.role,
            loginTime: new Date().toISOString()
        }));
        
        updateUIAfterLogin();
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        document.getElementById('current-username').textContent = user.name;
        document.getElementById('current-user-role').textContent = state.roles[user.role].name;
        document.getElementById('dashboard-role').textContent = state.roles[user.role].name;
        
        updateLogoDisplay();
        loadRoleSpecificDashboard();
        applyRoleBasedUI();
        updateMessageBadge();
        checkPrivilegeExpirationAll();
        
        // Initialiser les fonctionnalités spécifiques après un délai
        setTimeout(() => {
            if (user.role === 'responsible' && typeof window.initializeResponsibleFeatures === 'function') {
                window.initializeResponsibleFeatures();
            }
        }, 100);
        
        console.log(`Utilisateur ${user.name} (${user.role}) connecté avec succès`);
    } else {
        alert("Identifiants incorrects ou rôle non autorisé!");
    }
}

function updateUIAfterLogin() {
    document.getElementById('hospital-name-header').textContent = state.hospitalName;
    document.getElementById('hospital-address-header').textContent = state.hospitalAddress;
    document.getElementById('hospital-name-login').textContent = state.hospitalName;
}

function logout() {
    const activity = {
        id: 'ACT' + Date.now(),
        action: 'logout',
        user: state.currentUser?.username,
        timestamp: new Date().toISOString(),
        details: `Déconnexion de ${state.currentUser?.name}`
    };
    
    if (!state.reports) state.reports = [];
    state.reports.push(activity);
    
    localStorage.removeItem('currentSession');
    
    state.currentUser = null;
    state.currentRole = null;
    
    // Réinitialiser les indicateurs d'initialisation
    resetModulesInitialized();
    
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    
    document.getElementById('login-form').reset();
    document.querySelectorAll('.login-role-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.login-role-btn[data-role="admin"]').classList.add('active');
    
    console.log("Déconnexion réussie");
}

function checkExistingSession() {
    const session = localStorage.getItem('currentSession');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            const user = state.users.find(u => u.id === sessionData.userId);
            
            if (user) {
                const loginTime = new Date(sessionData.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 8) {
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
                    
                    setTimeout(() => {
                        if (user.role === 'responsible' && typeof window.initializeResponsibleFeatures === 'function') {
                            window.initializeResponsibleFeatures();
                        }
                    }, 100);
                    
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

function hasPermission(permission) {
    if (!state.currentRole || !state.roles[state.currentRole]) {
        return false;
    }
    return state.roles[state.currentRole][permission] === true;
}

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
    if (role === 'responsible' && typeof window.initResponsibleDashboardEvents === 'function') {
        window.initResponsibleDashboardEvents();
    }
}

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
                ${window.generateResponsibleActionsList ? window.generateResponsibleActionsList() : '<p class="text-muted">Aucune action requise.</p>'}
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
            <button class="btn btn-primary mt-2" onclick="window.showResponsiblePettyCashManagement()">
                <i class="fas fa-cog"></i> Gérer la petite caisse
            </button>
        </div>
    `;
}

function applyRoleBasedUI() {
    const role = state.currentRole;
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const target = tab.dataset.target;
        
        switch(target) {
            case 'settings':
                tab.style.display = hasPermission('canManageSettings') ? 'flex' : 'none';
                break;
            case 'administration':
                tab.style.display = hasPermission('canManageAdministration') ? 'flex' : 'none';
                break;
            default:
                tab.style.display = 'flex';
        }
    });
    
    if (role === 'responsible') {
        document.querySelectorAll('.btn-danger, .btn-warning').forEach(btn => {
            if (btn.textContent.includes('Supprimer') || btn.textContent.includes('Modifier')) {
                btn.classList.add('hidden-for-responsible');
            }
        });
        
        document.querySelectorAll('#administration input, #administration select, #administration textarea').forEach(input => {
            if (!input.classList.contains('no-readonly')) {
                input.classList.add('readonly-field');
                input.disabled = true;
            }
        });
        
        const adminTitle = document.querySelector('#administration .section-title');
        if (adminTitle) {
            adminTitle.innerHTML = '<i class="fas fa-chart-bar"></i> Direction - Vue d\'ensemble';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (checkExistingSession()) {
        console.log("Session existante restaurée");
    }
    
    document.getElementById('logout-btn')?.addEventListener('click', logout);
});
// Gestion de l'authentification et navigation
document.addEventListener('DOMContentLoaded', () => {
    setupLogin();
    setupNavigation();
});

function setupLogin() {
    const roleBtns = document.querySelectorAll('.login-role-btn');
    roleBtns.forEach(btn => btn.addEventListener('click', function() {
        roleBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    }));

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const selectedRole = document.querySelector('.login-role-btn.active').dataset.role;
        
        const user = state.users.find(u => 
            u.username === username && 
            u.password === password && 
            u.role === selectedRole &&
            u.active === true
        );
        
        if (!user) {
            alert("Identifiants incorrects ou compte désactivé!");
            return;
        }
        
        state.currentUser = user;
        state.currentRole = selectedRole;
        
        document.getElementById('current-username').textContent = user.name;
        document.getElementById('current-user-role').textContent = user.role;
        document.getElementById('dashboard-role').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        setupRoleBasedNavigation();
        updateRoleDashboard();
        
        updateConsultationTypesSelect();
        updateVitalsInputs();
        updateLabAnalysesSelect();
        updateTodayPatientsList();
        updateExternalServicesSelect();
        updateExternalServicesOptions();
        checkUnreadMessages();
        loadDoctorsForAppointments();
        updateDoctorConsultationTypes();
        updateLogoDisplay();
        
        // Initialiser d'autres modules
        if (typeof updateMedicationStock === 'function') updateMedicationStock();
        if (typeof updateMessageRecipients === 'function') updateMessageRecipients();
        if (typeof loadAppointmentsList === 'function') loadAppointmentsList();
        if (typeof loadDoctorAppointments === 'function') loadDoctorAppointments();
        if (typeof updateMedicationsSettingsList === 'function') updateMedicationsSettingsList();
        
        // Initialiser les nouvelles fonctionnalités d'administration
        if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();
        if (typeof updateUserTransactionTotals === 'function') updateUserTransactionTotals();
        
        // 🔧 Initialiser le module responsable si le rôle est responsible
        if (state.currentRole === 'responsible' && typeof setupResponsible === 'function') {
            setupResponsible();
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm("Voulez-vous vous déconnecter?")) {
            location.reload();
        }
    });
}

function setupRoleBasedNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const role = state.currentRole;
    
    tabs.forEach(tab => {
        const target = tab.dataset.target;
        
        if (role === 'admin') {
            tab.classList.remove('hidden');
        } else if (role === 'responsible') {
            // 🔧 Responsable : seulement dashboard, administration et messagerie
            if (['dashboard', 'administration', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'secretary') {
            if (['dashboard', 'secretary', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'cashier') {
            if (['dashboard', 'cashier', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'nurse') {
            if (['dashboard', 'nurse', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'doctor') {
            if (['dashboard', 'doctor', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'lab') {
            if (['dashboard', 'laboratory', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        } else if (role === 'pharmacy') {
            if (['dashboard', 'pharmacy', 'messaging'].includes(target)) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        }
    });
    
    // Activer le premier onglet visible
    const visibleTabs = document.querySelectorAll('.nav-tab:not(.hidden)');
    if (visibleTabs.length > 0) {
        visibleTabs.forEach(t => t.classList.remove('active'));
        visibleTabs[0].classList.add('active');
        
        document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
        document.getElementById(visibleTabs[0].dataset.target).classList.add('active');
    }
}

function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            document.getElementById(this.dataset.target).classList.add('active');
            
            const target = this.dataset.target;
            if (target === 'dashboard') {
                updateRoleDashboard();
            } else if (target === 'secretary') {
                updateTodayPatientsList();
                updateConsultationTypesSelect();
                if (typeof loadAppointmentsList === 'function') loadAppointmentsList();
            } else if (target === 'administration') {
                // 🔧 Selon le rôle, on appelle les bonnes fonctions de mise à jour
                if (state.currentRole === 'responsible') {
                    if (typeof respUpdateAdminDisplay === 'function') respUpdateAdminDisplay();
                } else {
                    if (typeof updateAdminStats === 'function') updateAdminStats();
                    if (typeof updateCharts === 'function') updateCharts();
                    if (typeof updateAdminExtendedDisplay === 'function') updateAdminExtendedDisplay();
                    if (typeof updateUserTransactionTotals === 'function') updateUserTransactionTotals();
                }
            } else if (target === 'pharmacy') {
                if (typeof updateMedicationStock === 'function') updateMedicationStock();
            } else if (target === 'messaging') {
                if (typeof loadConversations === 'function') loadConversations();
                updateMessageBadge();
            } else if (target === 'doctor') {
                if (typeof loadDoctorAppointments === 'function') loadDoctorAppointments();
            } else if (target === 'settings') {
                if (typeof updateMedicationsSettingsList === 'function') updateMedicationsSettingsList();
            }
        });
    });
}

function updateRoleDashboard() {
    const container = document.getElementById('role-dashboard-content');
    const role = state.currentRole;
    
    let html = '';
    
    if (role === 'admin' || role === 'responsible') {
        // Le tableau de bord est identique pour admin et responsable
        // (Vous pouvez personnaliser celui du responsable si nécessaire)
        const totalCredit = Object.values(state.creditAccounts || {}).reduce((sum, acc) => sum + (acc.balance || 0), 0);
        
        html = `
            <div class="stats-container">
                <div class="stat-card clickable-stat" onclick="showSection('secretary')">
                    <div class="stat-icon" style="background:#1a6bca"><i class="fas fa-user-tie"></i></div>
                    <div class="stat-info"><h3>${state.patients.length}</h3><p>Patients enregistrés</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('administration')">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <h3>${state.transactions.filter(t => t.status === 'paid' && !t.isCredit).reduce((sum, t) => sum + t.amount, 0)}</h3>
                        <p>Revenus totaux (Gdes)</p>
                    </div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('pharmacy')">
                    <div class="stat-icon" style="background:#dc3545"><i class="fas fa-pills"></i></div>
                    <div class="stat-info">
                        <h3>${state.medicationStock.filter(m => m.quantity <= m.alertThreshold).length}</h3>
                        <p>Médicaments en alerte</p>
                    </div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="admin-stats-grid mt-3">
                <div class="admin-stat-card">
                    <h3><i class="fas fa-cash-register"></i> Caisses</h3>
                    <p>Caisse principale: <strong>${(state.mainCash || 0).toLocaleString()} Gdes</strong></p>
                    <p>Petite caisse: <strong>${(state.pettyCash || 0).toLocaleString()} Gdes</strong></p>
                    <p>Crédits patients: <strong>${totalCredit.toLocaleString()} Gdes</strong></p>
                </div>
                
                <div class="admin-stat-card">
                    <h3><i class="fas fa-chart-line"></i> Aujourd'hui</h3>
                    <p>Patients: <strong>${state.patients.filter(p => p.registrationDate === new Date().toISOString().split('T')[0]).length}</strong></p>
                    <p>Transactions: <strong>${state.transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).length}</strong></p>
                    <p>Revenus: <strong>${state.transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === 'paid' && !t.isCredit).reduce((sum, t) => sum + t.amount, 0)} Gdes</strong></p>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Activité récente</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Heure</th>
                                <th>Action</th>
                                <th>Utilisateur</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>10:30</td><td>Consultation enregistrée</td><td>doctor</td></tr>
                            <tr><td>10:15</td><td>Paiement effectué</td><td>cashier</td></tr>
                            <tr><td>09:45</td><td>Nouveau patient</td><td>secretary</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (role === 'secretary') {
        const today = new Date().toISOString().split('T')[0];
        const todayPatients = state.patients.filter(p => p.registrationDate === today);
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#1a6bca"><i class="fas fa-user-plus"></i></div>
                    <div class="stat-info"><h3>${todayPatients.length}</h3><p>Patients aujourd'hui</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-file-invoice-dollar"></i></div>
                    <div class="stat-info">
                        <h3>${state.transactions.filter(t => t.type === 'external' && t.status === 'unpaid').length}</h3>
                        <p>Services externes en attente</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#ffc107"><i class="fas fa-calendar-alt"></i></div>
                    <div class="stat-info">
                        <h3>${state.appointments.filter(a => a.date >= today).length}</h3>
                        <p>Rendez-vous programmés</p>
                    </div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Patients récemment enregistrés</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nom</th>
                                <th>Heure</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayPatients.slice(0, 5).map(patient => `
                                <tr>
                                    <td>${patient.id}</td>
                                    <td>${patient.fullName}</td>
                                    <td>${patient.registrationTime}</td>
                                    <td>${patient.type}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (role === 'cashier') {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = state.transactions.filter(t => 
            t.status === 'paid' && 
            t.paymentDate === today
        );
        const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info"><h3>${todayRevenue}</h3><p>Encaissements aujourd'hui (Gdes)</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#1a6bca"><i class="fas fa-users"></i></div>
                    <div class="stat-info"><h3>${new Set(todayTransactions.map(t => t.patientId)).size}</h3><p>Patients servis</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#ffc107"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info"><h3>${state.transactions.filter(t => t.status === 'unpaid').length}</h3><p>Services impayés</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Derniers paiements</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Heure</th>
                                <th>Patient</th>
                                <th>Montant</th>
                                <th>Méthode</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayTransactions.slice(0, 5).map(transaction => `
                                <tr>
                                    <td>${transaction.paymentTime}</td>
                                    <td>${transaction.patientName}</td>
                                    <td>${transaction.amount} Gdes</td>
                                    <td>${transaction.paymentMethod}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (role === 'nurse') {
        const today = new Date().toISOString().split('T')[0];
        const todayVitals = state.vitals.filter(v => v.date === today);
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-heartbeat"></i></div>
                    <div class="stat-info"><h3>${todayVitals.length}</h3><p>Signes vitaux aujourd'hui</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#1a6bca"><i class="fas fa-user-injured"></i></div>
                    <div class="stat-info"><h3>${new Set(todayVitals.map(v => v.patientId)).size}</h3><p>Patients vus</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-bell"></i></div>
                    <div class="stat-info"><h3>${state.messages.filter(m => m.recipient === state.currentUser.username && !m.read).length}</h3><p>Notifications</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Signes vitaux récents</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Heure</th>
                                <th>Tension</th>
                                <th>Température</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayVitals.slice(0, 5).map(record => {
                                const patient = state.patients.find(p => p.id === record.patientId);
                                const tension = record.values['Tension artérielle'];
                                const temperature = record.values['Température'];
                                return `
                                    <tr>
                                        <td>${patient ? patient.fullName : record.patientId}</td>
                                        <td>${record.time}</td>
                                        <td>${tension ? tension.value + ' ' + tension.unit : '-'}</td>
                                        <td>${temperature ? temperature.value + ' ' + temperature.unit : '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (role === 'doctor') {
        const today = new Date().toISOString().split('T')[0];
        const todayConsultations = state.consultations.filter(c => c.date === today && c.doctor === state.currentUser.username);
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#1a6bca"><i class="fas fa-stethoscope"></i></div>
                    <div class="stat-info"><h3>${todayConsultations.length}</h3><p>Consultations aujourd'hui</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-prescription"></i></div>
                    <div class="stat-info"><h3>${state.transactions.filter(t => t.type === 'medication' && t.createdBy === state.currentUser.username).length}</h3><p>Prescriptions</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#ffc107"><i class="fas fa-calendar-alt"></i></div>
                    <div class="stat-info"><h3>${state.appointments.filter(a => a.doctor === state.currentUser.username && a.date >= today).length}</h3><p>Rendez-vous</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Consultations récentes</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Heure</th>
                                <th>Diagnostic</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayConsultations.slice(0, 5).map(consultation => `
                                <tr>
                                    <td>${consultation.patientName}</td>
                                    <td>${consultation.time}</td>
                                    <td>${consultation.diagnosis.substring(0, 50)}${consultation.diagnosis.length > 50 ? '...' : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (role === 'lab') {
        const pendingAnalyses = state.transactions.filter(t => 
            t.type === 'lab' && 
            t.status === 'paid' && 
            (!t.labStatus || t.labStatus !== 'completed')
        );
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#dc3545"><i class="fas fa-flask"></i></div>
                    <div class="stat-info"><h3>${pendingAnalyses.length}</h3><p>Analyses en attente</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info"><h3>${state.transactions.filter(t => t.type === 'lab' && t.labStatus === 'completed').length}</h3><p>Analyses complétées</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-bell"></i></div>
                    <div class="stat-info"><h3>${state.messages.filter(m => m.recipient === state.currentUser.username && !m.read && m.type === 'lab_result').length}</h3><p>Résultats à communiquer</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Analyses urgentes</h3>
                <div id="pending-analyses-list-dashboard"></div>
            </div>
        `;
        
        const urgentContainer = document.getElementById('pending-analyses-list-dashboard');
        if (pendingAnalyses.length === 0) {
            urgentContainer.innerHTML = '<p>Aucune analyse en attente.</p>';
        } else {
            let urgentHtml = '<table class="table-container"><thead><tr><th>Patient</th><th>Analyse</th><th>Depuis</th></tr></thead><tbody>';
            
            pendingAnalyses.slice(0, 5).forEach(analysis => {
                const hoursAgo = Math.floor((Date.now() - new Date(analysis.date + ' ' + analysis.time)) / (1000 * 60 * 60));
                urgentHtml += `
                    <tr>
                        <td>${analysis.patientName}</td>
                        <td>${analysis.service}</td>
                        <td>${hoursAgo} heure(s)</td>
                    </tr>
                `;
            });
            
            urgentHtml += '</tbody></table>';
            urgentContainer.innerHTML = urgentHtml;
        }
    } else if (role === 'pharmacy') {
        const lowStock = state.medicationStock.filter(med => med.quantity <= med.alertThreshold);
        const pendingDeliveries = state.transactions.filter(t => 
            t.type === 'medication' && 
            t.status === 'paid' && 
            (!t.deliveryStatus || t.deliveryStatus !== 'delivered')
        );
        
        html = `
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#ffc107"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info"><h3>${lowStock.length}</h3><p>Médicaments en alerte</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-truck"></i></div>
                    <div class="stat-info"><h3>${pendingDeliveries.length}</h3><p>Livraisons en attente</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#28a745"><i class="fas fa-capsules"></i></div>
                    <div class="stat-info"><h3>${state.medicationStock.reduce((sum, med) => sum + med.quantity, 0)}</h3><p>Médicaments en stock</p></div>
                </div>
                <div class="stat-card clickable-stat" onclick="showSection('messaging')">
                    <div class="stat-icon" style="background:#17a2b8"><i class="fas fa-comments"></i></div>
                    <div class="stat-info">
                        <h3>${state.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <h3>Médicaments en rupture de stock</h3>
                <div id="low-stock-dashboard"></div>
            </div>
        `;
        
        const lowStockContainer = document.getElementById('low-stock-dashboard');
        const outOfStock = lowStock.filter(med => med.quantity === 0);
        
        if (outOfStock.length === 0) {
            lowStockContainer.innerHTML = '<p>Aucun médicament en rupture de stock.</p>';
        } else {
            let stockHtml = '<table class="table-container"><thead><tr><th>Médicament</th><th>Forme</th><th>Dernière commande</th></tr></thead><tbody>';
            
            outOfStock.slice(0, 5).forEach(med => {
                stockHtml += `
                    <tr class="out-of-stock">
                        <td>${med.name}</td>
                        <td>${med.form}</td>
                        <td>Il y a 7 jours</td>
                    </tr>
                `;
            });
            
            stockHtml += '</tbody></table>';
            lowStockContainer.innerHTML = stockHtml;
        }
    }
    
    container.innerHTML = html;
}
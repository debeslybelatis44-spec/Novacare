// Module Administration, Paramètres et Messagerie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-patient-search')) {
        setupAdmin();
    }
    if (document.getElementById('hospital-name')) {
        setupSettings();
    }
    if (document.getElementById('message-recipient')) {
        setupMessaging();
    }
});

// ==================== ADMINISTRATION ====================
function setupAdmin() {
    document.getElementById('search-admin-patient').addEventListener('click', searchAdminPatient);
    document.getElementById('save-privilege').addEventListener('click', savePrivilege);
    document.getElementById('privilege-type').addEventListener('change', function() {
        const discountSection = document.getElementById('discount-section');
        if (this.value === 'sponsored') {
            discountSection.classList.remove('hidden');
        } else {
            discountSection.classList.add('hidden');
        }
    });
}

function searchAdminPatient() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    
    if (!patient) {
        alert("Patient non trouvé!");
        document.getElementById('admin-patient-details').classList.add('hidden');
        return;
    }
    
    // Vérifier expiration des privilèges
    if (patient.privilegeGrantedDate) {
        const now = new Date();
        const privilegeDate = new Date(patient.privilegeGrantedDate);
        const hoursDiff = (now - privilegeDate) / (1000 * 60 * 60);
        
        if (hoursDiff >= 24) {
            patient.vip = false;
            patient.sponsored = false;
            patient.discountPercentage = 0;
            patient.privilegeGrantedDate = null;
        }
    }
    
    document.getElementById('admin-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('admin-patient-details').classList.remove('hidden');
    
    const privilegeSelect = document.getElementById('privilege-type');
    const discountSection = document.getElementById('discount-section');
    const discountInput = document.getElementById('discount-percentage');
    
    if (patient.vip) {
        privilegeSelect.value = 'vip';
        discountSection.classList.add('hidden');
    } else if (patient.sponsored) {
        privilegeSelect.value = 'sponsored';
        discountSection.classList.remove('hidden');
        discountInput.value = patient.discountPercentage;
    } else {
        privilegeSelect.value = 'none';
        discountSection.classList.add('hidden');
    }
    
    const history = state.transactions.filter(t => t.patientId === patient.id);
    let html = '<table class="table-container"><thead><tr><th>Date</th><th>Service</th><th>Montant</th><th>Statut</th><th>Type</th></tr></thead><tbody>';
    if (history.length === 0) {
        html += '<tr><td colspan="5" class="text-center">Aucune transaction</td></tr>';
    } else {
        history.forEach(t => {
            const amountUSD = t.amount / state.exchangeRate;
            html += `<tr><td>${t.date}</td><td>${t.service}</td><td>${t.amount} Gdes (${amountUSD.toFixed(2)} $)</td><td>${t.status}</td><td>${t.type}</td></tr>`;
        });
    }
    html += '</tbody></table>';
    document.getElementById('admin-patient-history').innerHTML = html;
}

function savePrivilege() {
    const patientId = document.getElementById('admin-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    const privilegeType = document.getElementById('privilege-type').value;
    const discountPercentage = parseInt(document.getElementById('discount-percentage').value) || 0;
    
    patient.vip = false;
    patient.sponsored = false;
    patient.discountPercentage = 0;
    patient.privilegeGrantedDate = null;
    
    if (privilegeType === 'vip') {
        patient.vip = true;
        patient.privilegeGrantedDate = new Date().toISOString();
        state.transactions.forEach(t => {
            if (t.patientId === patientId && t.status === 'unpaid') {
                t.status = 'paid';
                t.paymentMethod = 'vip';
                t.paymentDate = new Date().toISOString().split('T')[0];
                t.paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                t.paymentAgent = state.currentUser.username;
            }
        });
        alert("Patient marqué comme VIP (services gratuits)");
    } else if (privilegeType === 'sponsored') {
        patient.sponsored = true;
        patient.discountPercentage = discountPercentage;
        patient.privilegeGrantedDate = new Date().toISOString();
        alert(`Patient marqué comme sponsorisé avec ${discountPercentage}% de réduction`);
    } else {
        alert("Privilèges retirés du patient");
    }
    
    searchAdminPatient();
}

function updateAdminStats() {
    const exchangeRate = state.exchangeRate || 130;
    
    const consultationTransactions = state.transactions.filter(t => t.type === 'consultation');
    const consultationAmount = consultationTransactions.reduce((sum, t) => sum + t.amount, 0);
    const consultationAmountUSD = consultationAmount / exchangeRate;
    document.getElementById('admin-consultations-count').textContent = consultationTransactions.length;
    document.getElementById('admin-consultations-amount').textContent = consultationAmount + ' Gdes (' + consultationAmountUSD.toFixed(2) + ' $)';
    
    const labTransactions = state.transactions.filter(t => t.type === 'lab');
    const labAmount = labTransactions.reduce((sum, t) => sum + t.amount, 0);
    const labAmountUSD = labAmount / exchangeRate;
    document.getElementById('admin-analyses-count').textContent = labTransactions.length;
    document.getElementById('admin-analyses-amount').textContent = labAmount + ' Gdes (' + labAmountUSD.toFixed(2) + ' $)';
    
    const medTransactions = state.transactions.filter(t => t.type === 'medication');
    const medAmount = medTransactions.reduce((sum, t) => sum + t.amount, 0);
    const medAmountUSD = medAmount / exchangeRate;
    document.getElementById('admin-medications-count').textContent = medTransactions.length;
    document.getElementById('admin-medications-amount').textContent = medAmount + ' Gdes (' + medAmountUSD.toFixed(2) + ' $)';
    
    const externalTransactions = state.transactions.filter(t => t.type === 'external');
    const externalAmount = externalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const externalAmountUSD = externalAmount / exchangeRate;
    document.getElementById('admin-external-count').textContent = externalTransactions.length;
    document.getElementById('admin-external-amount').textContent = externalAmount + ' Gdes (' + externalAmountUSD.toFixed(2) + ' $)';
    
    const totalRevenue = state.transactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalRevenueUSD = totalRevenue / exchangeRate;
    document.getElementById('admin-total-revenue').textContent = totalRevenue + ' Gdes (' + totalRevenueUSD.toFixed(2) + ' $)';
    
    updateRecentTransactions();
}

function updateCharts() {
    const consultationTransactions = state.transactions.filter(t => t.type === 'consultation');
    const labTransactions = state.transactions.filter(t => t.type === 'lab');
    const medTransactions = state.transactions.filter(t => t.type === 'medication');
    const externalTransactions = state.transactions.filter(t => t.type === 'external');
    
    const totalTransactions = consultationTransactions.length + labTransactions.length + medTransactions.length + externalTransactions.length;
    
    if (totalTransactions > 0) {
        const consultationPercentage = Math.round((consultationTransactions.length / totalTransactions) * 100);
        const labPercentage = Math.round((labTransactions.length / totalTransactions) * 100);
        const medPercentage = Math.round((medTransactions.length / totalTransactions) * 100);
        const externalPercentage = Math.round((externalTransactions.length / totalTransactions) * 100);
        
        document.getElementById('consultations-percentage').textContent = consultationPercentage + '%';
        document.getElementById('analyses-percentage').textContent = labPercentage + '%';
        document.getElementById('medications-percentage').textContent = medPercentage + '%';
        document.getElementById('external-percentage').textContent = externalPercentage + '%';
        document.getElementById('total-services-count').textContent = totalTransactions;
        
        const paidTransactions = state.transactions.filter(t => t.status === 'paid').length;
        const unpaidTransactions = state.transactions.filter(t => t.status === 'unpaid').length;
        const total = paidTransactions + unpaidTransactions;
        
        if (total > 0) {
            const paidPercentage = Math.round((paidTransactions / total) * 100);
            const unpaidPercentage = Math.round((unpaidTransactions / total) * 100);
            
            document.getElementById('paid-percentage').textContent = paidPercentage + '%';
            document.getElementById('unpaid-percentage').textContent = unpaidPercentage + '%';
            document.getElementById('paid-chart-bar').style.width = paidPercentage + '%';
            document.getElementById('unpaid-chart-bar').style.width = unpaidPercentage + '%';
        }
    }
    
    updateServicesCharts();
}

function updateServicesCharts() {
    const today = new Date().toISOString().split('T')[0];
    
    const consultationsChart = document.getElementById('consultations-chart');
    const labChart = document.getElementById('analyses-chart');
    const medChart = document.getElementById('medications-chart');
    const externalChart = document.getElementById('external-chart');
    
    const consultationData = [5, 8, 6, 9, 7, 10, 8];
    const labData = [3, 5, 4, 6, 5, 7, 6];
    const medData = [12, 15, 14, 16, 15, 18, 16];
    const externalData = [1, 2, 1, 3, 2, 4, 3];
    
    consultationsChart.innerHTML = createChartHTML(consultationData, 'Consultations');
    labChart.innerHTML = createChartHTML(labData, 'Analyses');
    medChart.innerHTML = createChartHTML(medData, 'Médicaments');
    externalChart.innerHTML = createChartHTML(externalData, 'Services externes');
}

function createChartHTML(data, title) {
    const max = Math.max(...data);
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    
    let html = '<div style="display:flex; height:150px; align-items:flex-end; gap:10px; margin-top:15px;">';
    
    data.forEach((value, index) => {
        const height = (value / max) * 100;
        html += `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                <div style="width:30px; height:${height}%; background:linear-gradient(to top, #1a6bca, #0d4d9c); border-radius:4px 4px 0 0;"></div>
                <div style="margin-top:5px; font-size:0.8rem; color:#666;">${days[index]}</div>
                <div style="font-size:0.7rem; color:#999;">${value}</div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function updateRecentTransactions() {
    const recent = [...state.transactions]
        .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
        .slice(0, 10);
    
    const container = document.getElementById('recent-transactions-list');
    let html = '';
    
    recent.forEach(transaction => {
        const amountUSD = transaction.amount / state.exchangeRate;
        html += `
            <tr>
                <td>${transaction.date} ${transaction.time}</td>
                <td>${transaction.patientName}<br><small>${transaction.patientId}</small></td>
                <td>${transaction.service}</td>
                <td>${transaction.amount} Gdes (${amountUSD.toFixed(2)} $)</td>
                <td>${transaction.paymentMethod || '-'}</td>
                <td>${transaction.createdBy}</td>
                <td><span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== PARAMÈTRES ====================
function setupSettings() {
    updateSettingsDisplay();
    
    document.getElementById('add-medication-settings').addEventListener('click', addMedicationFromSettings);
    document.getElementById('hospital-logo').addEventListener('change', handleLogoUpload);
    document.getElementById('save-hospital-info-btn').addEventListener('click', saveHospitalInfo);
    
    document.getElementById('add-consultation-type').addEventListener('click', () => {
        const name = document.getElementById('new-consultation-type-name').value;
        const price = parseFloat(document.getElementById('new-consultation-type-price').value);
        const description = document.getElementById('new-consultation-type-description').value;
        
        if (!name || isNaN(price)) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newType = {
            id: Date.now(),
            name: name,
            price: price,
            description: description,
            active: true
        };
        
        state.consultationTypes.push(newType);
        updateSettingsDisplay();
        
        document.getElementById('new-consultation-type-name').value = '';
        document.getElementById('new-consultation-type-price').value = '';
        document.getElementById('new-consultation-type-description').value = '';
    });
    
    document.getElementById('add-vital-type').addEventListener('click', () => {
        const name = document.getElementById('new-vital-name').value;
        const unit = document.getElementById('new-vital-unit').value;
        const min = parseFloat(document.getElementById('new-vital-min').value);
        const max = parseFloat(document.getElementById('new-vital-max').value);
        
        if (!name || !unit || isNaN(min) || isNaN(max)) {
            alert("Veuillez remplir tous les champs correctement!");
            return;
        }
        
        const newVital = {
            id: Date.now(),
            name: name,
            unit: unit,
            min: min,
            max: max,
            active: true
        };
        
        state.vitalTypes.push(newVital);
        updateSettingsDisplay();
    });
    
    document.getElementById('add-lab-analysis-type').addEventListener('click', () => {
        const name = document.getElementById('new-lab-analysis-name').value;
        const price = parseFloat(document.getElementById('new-lab-analysis-price').value);
        const type = document.getElementById('new-lab-analysis-type').value;
        
        if (!name || isNaN(price)) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newAnalysis = {
            id: Date.now(),
            name: name,
            price: price,
            resultType: type,
            active: true
        };
        
        state.labAnalysisTypes.push(newAnalysis);
        updateSettingsDisplay();
    });
    
    document.getElementById('add-external-service-type').addEventListener('click', () => {
        const name = document.getElementById('new-external-service-type-name').value;
        const price = parseFloat(document.getElementById('new-external-service-type-price').value);
        
        if (!name || isNaN(price)) {
            alert("Veuillez entrer un nom et un prix valides!");
            return;
        }
        
        const newService = {
            id: Date.now(),
            name: name,
            price: price,
            active: true
        };
        
        state.externalServiceTypes.push(newService);
        updateSettingsDisplay();
        updateExternalServicesSelect();
        updateExternalServicesOptions();
    });
    
    document.getElementById('add-user').addEventListener('click', () => {
        const name = document.getElementById('new-user-name').value;
        const role = document.getElementById('new-user-role').value;
        const username = document.getElementById('new-user-username').value;
        const password = document.getElementById('new-user-password').value;
        
        if (!name || !role || !username || !password) {
            alert("Veuillez remplir tous les champs!");
            return;
        }
        
        const newUser = {
            id: Date.now(),
            name: name,
            role: role,
            username: username,
            password: password,
            active: true
        };
        
        state.users.push(newUser);
        updateSettingsDisplay();
        updateMessageRecipients();
        
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-role').value = '';
        document.getElementById('new-user-username').value = '';
        document.getElementById('new-user-password').value = '';
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        state.hospitalLogo = e.target.result;
        document.getElementById('logo-preview').src = e.target.result;
        document.getElementById('logo-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function saveHospitalInfo() {
    const name = document.getElementById('hospital-name').value;
    const address = document.getElementById('hospital-address').value;
    const phone = document.getElementById('hospital-phone').value;
    
    document.getElementById('hospital-name-header').textContent = name;
    document.getElementById('hospital-address-header').textContent = address;
    document.getElementById('hospital-name-login').textContent = name;
    
    alert("Informations de l'hôpital enregistrées!");
}

function addMedicationFromSettings() {
    const name = document.getElementById('new-medication-name').value.trim();
    const price = parseFloat(document.getElementById('new-medication-price').value);
    const quantity = parseInt(document.getElementById('new-medication-quantity').value);
    const alertThreshold = parseInt(document.getElementById('new-medication-alert').value);
    
    if (!name || isNaN(price) || isNaN(quantity) || isNaN(alertThreshold)) {
        alert("Veuillez remplir tous les champs correctement!");
        return;
    }
    
    const newMed = {
        id: 'MED' + Date.now(),
        name: name,
        genericName: name,
        form: 'comprimé',
        quantity: quantity,
        unit: 'comprimés',
        alertThreshold: alertThreshold,
        price: price,
        reserved: 0
    };
    
    state.medicationStock.push(newMed);
    
    document.getElementById('new-medication-name').value = '';
    document.getElementById('new-medication-price').value = '';
    document.getElementById('new-medication-quantity').value = '';
    document.getElementById('new-medication-alert').value = '';
    
    if (typeof updateMedicationStock === 'function') updateMedicationStock();
    updateMedicationsSettingsList();
    alert("Médicament ajouté avec succès!");
}

function updateMedicationsSettingsList() {
    const container = document.getElementById('medications-settings-list');
    let html = '';
    
    state.medicationStock.forEach(med => {
        html += `
            <tr>
                <td>${med.name}</td>
                <td>${med.price} Gdes</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteMedicationSettings('${med.id}')">
                        Supprimer
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function deleteMedicationSettings(medId) {
    if (confirm("Supprimer ce médicament?")) {
        state.medicationStock = state.medicationStock.filter(m => m.id !== medId);
        if (typeof updateMedicationStock === 'function') updateMedicationStock();
        updateMedicationsSettingsList();
    }
}

function updateSettingsDisplay() {
    const consultationList = document.getElementById('consultation-types-list');
    let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Description</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.consultationTypes.forEach(type => {
        html += `
            <tr>
                <td>${type.name}</td>
                <td><input type="number" class="form-control consultation-price-input" data-id="${type.id}" value="${type.price}" style="width:100px;"></td>
                <td><input type="text" class="form-control consultation-desc-input" data-id="${type.id}" value="${type.description}" style="width:200px;"></td>
                <td><input type="checkbox" ${type.active ? 'checked' : ''} onchange="toggleConsultationType(${type.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="saveConsultationType(${type.id})">Enregistrer</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConsultationType(${type.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    consultationList.innerHTML = html;
    
    const vitalsList = document.getElementById('vitals-types-list');
    html = '<table class="table-container"><thead><tr><th>Nom</th><th>Unité</th><th>Valeur min</th><th>Valeur max</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.vitalTypes.forEach(vital => {
        html += `
            <tr>
                <td>${vital.name}</td>
                <td>${vital.unit}</td>
                <td>${vital.min}</td>
                <td>${vital.max}</td>
                <td><input type="checkbox" ${vital.active ? 'checked' : ''} onchange="toggleVitalType(${vital.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editVitalType(${vital.id})">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteVitalType(${vital.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    vitalsList.innerHTML = html;
    
    const labList = document.getElementById('lab-analyses-types-list');
    html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Type résultat</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.labAnalysisTypes.forEach(analysis => {
        html += `
            <tr>
                <td>${analysis.name}</td>
                <td><input type="number" class="form-control analysis-price-input" data-id="${analysis.id}" value="${analysis.price}" style="width:100px;"></td>
                <td>${analysis.resultType === 'text' ? 'Texte' : 'Image'}</td>
                <td><input type="checkbox" ${analysis.active ? 'checked' : ''} onchange="toggleLabAnalysisType(${analysis.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="saveLabAnalysisType(${analysis.id})">Enregistrer</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLabAnalysisType(${analysis.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    labList.innerHTML = html;
    
    const externalList = document.getElementById('external-services-types-list');
    html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
    
    state.externalServiceTypes.forEach(service => {
        html += `
            <tr>
                <td>${service.name}</td>
                <td><input type="number" class="form-control external-price-input" data-id="${service.id}" value="${service.price}" style="width:100px;"></td>
                <td><input type="checkbox" ${service.active ? 'checked' : ''} onchange="toggleExternalServiceType(${service.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="saveExternalServiceType(${service.id})">Enregistrer</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExternalServiceType(${service.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    externalList.innerHTML = html;
    
    updateUsersList();
    
    if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
    if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
    if (typeof updateLabAnalysesSelect === 'function') updateLabAnalysesSelect();
    if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
    if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
    updateMedicationsSettingsList();
}

function updateUsersList() {
    const container = document.getElementById('users-list');
    let html = '';
    
    state.users.forEach(user => {
        html += `
            <tr>
                <td>${user.name}</td>
                <td>${user.role}</td>
                <td>${user.username}</td>
                <td><input type="checkbox" ${user.active ? 'checked' : ''} onchange="toggleUser(${user.id}, this.checked)"></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${user.id})">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function saveConsultationType(id) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (!type) return;
    
    const priceInput = document.querySelector(`.consultation-price-input[data-id="${id}"]`);
    const descInput = document.querySelector(`.consultation-desc-input[data-id="${id}"]`);
    
    type.price = parseFloat(priceInput.value);
    type.description = descInput.value;
    
    alert("Type de consultation enregistré!");
    if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
    if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
}

function toggleConsultationType(id, active) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (type) {
        type.active = active;
        if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
        if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
    }
}

function deleteConsultationType(id) {
    if (confirm("Supprimer ce type de consultation?")) {
        state.consultationTypes = state.consultationTypes.filter(t => t.id !== id);
        updateSettingsDisplay();
    }
}

function toggleVitalType(id, active) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (vital) {
        vital.active = active;
    }
}

function deleteVitalType(id) {
    if (confirm("Supprimer ce signe vital?")) {
        state.vitalTypes = state.vitalTypes.filter(v => v.id !== id);
        updateSettingsDisplay();
    }
}

function saveLabAnalysisType(id) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (!analysis) return;
    
    const priceInput = document.querySelector(`.analysis-price-input[data-id="${id}"]`);
    analysis.price = parseFloat(priceInput.value);
    
    alert("Analyse enregistrée!");
}

function toggleLabAnalysisType(id, active) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (analysis) {
        analysis.active = active;
    }
}

function deleteLabAnalysisType(id) {
    if (confirm("Supprimer cette analyse?")) {
        state.labAnalysisTypes = state.labAnalysisTypes.filter(a => a.id !== id);
        updateSettingsDisplay();
    }
}

function saveExternalServiceType(id) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (!service) return;
    
    const priceInput = document.querySelector(`.external-price-input[data-id="${id}"]`);
    service.price = parseFloat(priceInput.value);
    
    alert("Service externe enregistré!");
    if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
    if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
}

function toggleExternalServiceType(id, active) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (service) {
        service.active = active;
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    }
}

function deleteExternalServiceType(id) {
    if (confirm("Supprimer ce service externe?")) {
        state.externalServiceTypes = state.externalServiceTypes.filter(s => s.id != id);
        updateSettingsDisplay();
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
    }
}

function toggleUser(id, active) {
    const user = state.users.find(u => u.id === id);
    if (user) {
        user.active = active;
    }
}

function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const newPassword = prompt(`Nouveau mot de passe pour ${user.name}:`, user.password);
    if (newPassword !== null) {
        user.password = newPassword;
        alert("Mot de passe modifié!");
        updateSettingsDisplay();
    }
}

function deleteUser(id) {
    if (id <= 7) {
        alert("Impossible de supprimer les utilisateurs par défaut!");
        return;
    }
    
    if (confirm("Supprimer cet utilisateur?")) {
        state.users = state.users.filter(u => u.id !== id);
        updateSettingsDisplay();
        updateMessageRecipients();
    }
}

// ==================== MESSAGERIE ====================
function setupMessaging() {
    updateMessageRecipients();
    
    document.getElementById('new-conversation-btn').addEventListener('click', () => {
        const recipient = document.getElementById('message-recipient').value;
        if (!recipient) {
            alert("Veuillez sélectionner un destinataire!");
            return;
        }
        
        if (recipient.startsWith('all')) {
            let targetUsers = [];
            
            if (recipient === 'all') {
                targetUsers = state.users.filter(u => u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-doctors') {
                targetUsers = state.users.filter(u => u.role === 'doctor' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-nurses') {
                targetUsers = state.users.filter(u => u.role === 'nurse' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-secretaries') {
                targetUsers = state.users.filter(u => u.role === 'secretary' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-cashiers') {
                targetUsers = state.users.filter(u => u.role === 'cashier' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-labs') {
                targetUsers = state.users.filter(u => u.role === 'lab' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-pharmacies') {
                targetUsers = state.users.filter(u => u.role === 'pharmacy' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-admins') {
                targetUsers = state.users.filter(u => u.role === 'admin' && u.active && u.username !== state.currentUser.username);
            }
            
            const messageContent = prompt(`Entrez votre message à ${targetUsers.length} destinataire(s):`);
            if (!messageContent) return;
            
            targetUsers.forEach(user => {
                const message = {
                    id: 'MSG' + Date.now(),
                    sender: state.currentUser.username,
                    senderRole: state.currentRole,
                    recipient: user.username,
                    recipientRole: user.role,
                    subject: `Message à tous les ${user.role}s`,
                    content: messageContent,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'broadcast'
                };
                state.messages.push(message);
            });
            
            alert(`Message envoyé à ${targetUsers.length} destinataire(s)!`);
            loadConversations();
            updateMessageBadge();
            document.getElementById('message-recipient').selectedIndex = 0;
            return;
        }
        
        state.currentConversation = recipient;
        loadConversation(recipient);
        document.getElementById('message-recipient').selectedIndex = 0;
    });
    
    document.getElementById('send-message-btn').addEventListener('click', () => {
        sendMessage();
    });
    
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function updateMessageRecipients() {
    const select = document.getElementById('message-recipient');
    select.innerHTML = '<option value="">Nouveau message...</option><option value="all">Tous les utilisateurs</option><option value="all-doctors">Tous les médecins</option><option value="all-nurses">Tous les infirmiers</option><option value="all-secretaries">Tous les secrétaires</option><option value="all-cashiers">Tous les caissiers</option><option value="all-labs">Tout le laboratoire</option><option value="all-pharmacies">Toute la pharmacie</option><option value="all-admins">Tous les administrateurs</option>';
    
    state.users.forEach(user => {
        if (user.active && user.username !== state.currentUser.username) {
            select.innerHTML += `<option value="${user.username}">${user.name} (${user.role})</option>`;
        }
    });
}

function loadConversations() {
    const container = document.getElementById('conversations-container');
    const userMessages = state.messages.filter(m => 
        m.recipient === state.currentUser.username || 
        m.sender === state.currentUser.username
    );
    
    const conversations = {};
    userMessages.forEach(message => {
        const otherUser = message.sender === state.currentUser.username ? message.recipient : message.sender;
        if (!conversations[otherUser]) {
            conversations[otherUser] = {
                user: otherUser,
                lastMessage: message,
                unread: message.recipient === state.currentUser.username && !message.read
            };
        } else {
            if (new Date(message.timestamp) > new Date(conversations[otherUser].lastMessage.timestamp)) {
                conversations[otherUser].lastMessage = message;
            }
            if (message.recipient === state.currentUser.username && !message.read) {
                conversations[otherUser].unread = true;
            }
        }
    });
    
    let html = '';
    Object.values(conversations).forEach(conv => {
        const otherUser = state.users.find(u => u.username === conv.user);
        const displayName = otherUser ? otherUser.name : conv.user;
        
        html += `
            <div class="conversation-item ${conv.unread ? 'unread' : ''} ${state.currentConversation === conv.user ? 'active' : ''}" 
                 onclick="loadConversation('${conv.user}')">
                <div class="d-flex align-items-center">
                    <div class="conversation-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="conversation-info">
                        <div class="d-flex justify-between">
                            <strong>${displayName}</strong>
                            <span class="conversation-time">${new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div class="conversation-last-message">${conv.lastMessage.content.substring(0, 50)}${conv.lastMessage.content.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>Aucune conversation</p>';
}

function loadConversation(otherUser) {
    state.currentConversation = otherUser;
    const messages = state.messages.filter(m => 
        (m.sender === state.currentUser.username && m.recipient === otherUser) ||
        (m.sender === otherUser && m.recipient === state.currentUser.username)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const otherUserObj = state.users.find(u => u.username === otherUser);
    const displayName = otherUserObj ? otherUserObj.name : otherUser;
    
    document.getElementById('current-conversation-title').textContent = `Conversation avec ${displayName}`;
    
    const container = document.getElementById('chat-messages');
    let html = '';
    
    messages.forEach(message => {
        const isSent = message.sender === state.currentUser.username;
        const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        
        html += `
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble-content">
                    ${message.content}
                </div>
                <div class="message-bubble-time">${time}</div>
            </div>
        `;
        
        if (message.recipient === state.currentUser.username && !message.read) {
            message.read = true;
        }
    });
    
    container.innerHTML = html || '<p>Aucun message</p>';
    container.scrollTop = container.scrollHeight;
    
    document.getElementById('chat-input-container').classList.remove('hidden');
    document.getElementById('message-input').focus();
    
    loadConversations();
    updateMessageBadge();
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !state.currentConversation) {
        alert("Veuillez sélectionner un destinataire et entrer un message!");
        return;
    }
    
    const message = {
        id: 'MSG' + Date.now(),
        sender: state.currentUser.username,
        senderRole: state.currentRole,
        recipient: state.currentConversation,
        recipientRole: state.users.find(u => u.username === state.currentConversation)?.role || '',
        subject: 'Message',
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message'
    };
    
    state.messages.push(message);
    input.value = '';
    
    loadConversation(state.currentConversation);
    updateMessageBadge();
}
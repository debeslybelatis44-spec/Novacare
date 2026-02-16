// Module Paramètres
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('hospital-name')) {
        setupSettings();
    }
});

function setupSettings() {
    updateSettingsDisplay();
    
    document.getElementById('add-medication-settings').addEventListener('click', addMedicationFromSettings);
    document.getElementById('hospital-logo').addEventListener('change', handleLogoUpload);
    document.getElementById('save-hospital-info-btn').addEventListener('click', saveHospitalInfo);
    
    document.getElementById('add-consultation-type').addEventListener('click', () => {
        const name = document.getElementById('new-consultation-type-name').value.trim();
        const price = parseFloat(document.getElementById('new-consultation-type-price').value);
        const description = document.getElementById('new-consultation-type-description').value.trim();
        
        if (!name || isNaN(price) || price < 0) {
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
        alert("Type de consultation ajouté avec succès!");
    });
    
    document.getElementById('add-vital-type').addEventListener('click', () => {
        const name = document.getElementById('new-vital-name').value.trim();
        const unit = document.getElementById('new-vital-unit').value.trim();
        const min = parseFloat(document.getElementById('new-vital-min').value);
        const max = parseFloat(document.getElementById('new-vital-max').value);
        
        if (!name || !unit || isNaN(min) || isNaN(max) || min >= max) {
            alert("Veuillez remplir tous les champs correctement! La valeur min doit être inférieure à la valeur max.");
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
        
        document.getElementById('new-vital-name').value = '';
        document.getElementById('new-vital-unit').value = '';
        document.getElementById('new-vital-min').value = '';
        document.getElementById('new-vital-max').value = '';
        alert("Signe vital ajouté avec succès!");
    });
    
    document.getElementById('add-lab-analysis-type').addEventListener('click', () => {
        const name = document.getElementById('new-lab-analysis-name').value.trim();
        const price = parseFloat(document.getElementById('new-lab-analysis-price').value);
        const type = document.getElementById('new-lab-analysis-type').value;
        
        if (!name || isNaN(price) || price < 0) {
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
        
        document.getElementById('new-lab-analysis-name').value = '';
        document.getElementById('new-lab-analysis-price').value = '';
        alert("Type d'analyse ajouté avec succès!");
    });
    
    document.getElementById('add-external-service-type').addEventListener('click', () => {
        const name = document.getElementById('new-external-service-type-name').value.trim();
        const price = parseFloat(document.getElementById('new-external-service-type-price').value);
        
        if (!name || isNaN(price) || price < 0) {
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
        
        document.getElementById('new-external-service-type-name').value = '';
        document.getElementById('new-external-service-type-price').value = '';
        alert("Service externe ajouté avec succès!");
    });
    
    document.getElementById('add-user').addEventListener('click', () => {
        const name = document.getElementById('new-user-name').value.trim();
        const role = document.getElementById('new-user-role').value;
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-password').value;
        
        if (!name || !role || !username || !password) {
            alert("Veuillez remplir tous les champs!");
            return;
        }
        
        const existingUser = state.users.find(u => u.username === username);
        if (existingUser) {
            alert("Ce nom d'utilisateur existe déjà!");
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
        if (typeof updateMessageRecipients === 'function') updateMessageRecipients();
        
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-role').value = '';
        document.getElementById('new-user-username').value = '';
        document.getElementById('new-user-password').value = '';
        
        alert("Utilisateur ajouté avec succès!");
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Taille maximale: 2MB");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        state.hospitalLogo = e.target.result;
        document.getElementById('logo-preview').src = e.target.result;
        document.getElementById('logo-preview').style.display = 'block';
        updateLogoDisplay();
    };
    reader.onerror = function() {
        alert("Erreur lors de la lecture du fichier");
    };
    reader.readAsDataURL(file);
}

function saveHospitalInfo() {
    const name = document.getElementById('hospital-name').value.trim();
    const address = document.getElementById('hospital-address').value.trim();
    const phone = document.getElementById('hospital-phone').value.trim();
    
    if (!name) {
        alert("Veuillez entrer le nom de l'hôpital!");
        return;
    }
    
    document.getElementById('hospital-name-header').textContent = name;
    document.getElementById('hospital-address-header').textContent = address;
    document.getElementById('hospital-name-login').textContent = name;
    document.getElementById('certificate-hospital-name').textContent = name;
    document.getElementById('certificate-hospital-name-text').textContent = name;
    document.getElementById('invoice-hospital-name').textContent = name;
    document.getElementById('card-hospital-name').textContent = name;
    
    if (address) {
        document.getElementById('hospital-address-header').textContent = address;
        document.getElementById('certificate-hospital-address').textContent = address;
        document.getElementById('invoice-hospital-address').textContent = address;
        document.getElementById('card-hospital-address').textContent = address;
    }
    
    if (phone) {
        document.getElementById('hospital-phone').value = phone;
        document.getElementById('certificate-hospital-phone').textContent = `Tél: ${phone}`;
        document.getElementById('invoice-hospital-phone').textContent = `Tél: ${phone}`;
    }
    
    alert("Informations de l'hôpital enregistrées avec succès!");
    saveStateToLocalStorage();
}

function addMedicationFromSettings() {
    const name = document.getElementById('new-medication-name-settings').value.trim();
    const price = parseFloat(document.getElementById('new-medication-price-settings').value);
    const quantity = parseInt(document.getElementById('new-medication-quantity-settings').value);
    const alertThreshold = parseInt(document.getElementById('new-medication-alert-settings').value);
    
    if (!name || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0 || isNaN(alertThreshold) || alertThreshold < 0) {
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
    
    document.getElementById('new-medication-name-settings').value = '';
    document.getElementById('new-medication-price-settings').value = '';
    document.getElementById('new-medication-quantity-settings').value = '';
    document.getElementById('new-medication-alert-settings').value = '';
    
    updateMedicationsSettingsList();
    if (typeof updateMedicationStock === 'function') updateMedicationStock();
    alert("Médicament ajouté avec succès!");
    saveStateToLocalStorage();
}

function updateMedicationsSettingsList() {
    const container = document.getElementById('medications-settings-list');
    if (!container) return;
    
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
    if (confirm("Supprimer ce médicament? Cette action est irréversible.")) {
        state.medicationStock = state.medicationStock.filter(m => m.id !== medId);
        updateMedicationsSettingsList();
        if (typeof updateMedicationStock === 'function') updateMedicationStock();
        alert("Médicament supprimé avec succès!");
        saveStateToLocalStorage();
    }
}

function updateSettingsDisplay() {
    // Consultation Types
    const consultationList = document.getElementById('consultation-types-list');
    if (consultationList) {
        let html = '<table class="table-container"><thead><tr><th>Nom</th><th>Prix</th><th>Description</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.consultationTypes.forEach(type => {
            html += `
                <tr>
                    <td>${type.name}</td>
                    <td><input type="number" class="form-control consultation-price-input" data-id="${type.id}" value="${type.price}" style="width:100px;"></td>
                    <td><input type="text" class="form-control consultation-desc-input" data-id="${type.id}" value="${type.description || ''}" style="width:200px;"></td>
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
    }
    
    // Vital Types
    const vitalsList = document.getElementById('vitals-types-list');
    if (vitalsList) {
        html = '<table class="table-container"><thead><tr><th>Nom</th><th>Unité</th><th>Valeur min</th><th>Valeur max</th><th>Actif</th><th>Actions</th></tr></thead><tbody>';
        
        state.vitalTypes.forEach(vital => {
            html += `
                <tr>
                    <td>${vital.name}</td>
                    <td>${vital.unit}</td>
                    <td><input type="number" class="form-control vital-min-input" data-id="${vital.id}" value="${vital.min}" style="width:80px;"></td>
                    <td><input type="number" class="form-control vital-max-input" data-id="${vital.id}" value="${vital.max}" style="width:80px;"></td>
                    <td><input type="checkbox" ${vital.active ? 'checked' : ''} onchange="toggleVitalType(${vital.id}, this.checked)"></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="saveVitalType(${vital.id})">Enregistrer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVitalType(${vital.id})">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        vitalsList.innerHTML = html;
    }
    
    // Lab Analysis Types
    const labList = document.getElementById('lab-analyses-types-list');
    if (labList) {
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
    }
    
    // External Service Types
    const externalList = document.getElementById('external-services-types-list');
    if (externalList) {
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
    }
    
    updateUsersList();
    updateSuppliersList(); // fournisseurs défini dans admin-extended, mais appelé ici pour rafraîchir
    
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
    if (!container) return;
    
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
    saveStateToLocalStorage();
}

function toggleConsultationType(id, active) {
    const type = state.consultationTypes.find(t => t.id === id);
    if (type) {
        type.active = active;
        if (typeof updateConsultationTypesSelect === 'function') updateConsultationTypesSelect();
        if (typeof updateDoctorConsultationTypes === 'function') updateDoctorConsultationTypes();
        saveStateToLocalStorage();
    }
}

function deleteConsultationType(id) {
    if (confirm("Supprimer ce type de consultation? Cette action est irréversible.")) {
        state.consultationTypes = state.consultationTypes.filter(t => t.id !== id);
        updateSettingsDisplay();
        alert("Type de consultation supprimé!");
        saveStateToLocalStorage();
    }
}

function saveVitalType(id) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (!vital) return;
    
    const minInput = document.querySelector(`.vital-min-input[data-id="${id}"]`);
    const maxInput = document.querySelector(`.vital-max-input[data-id="${id}"]`);
    
    vital.min = parseFloat(minInput.value);
    vital.max = parseFloat(maxInput.value);
    
    alert("Signe vital enregistré!");
    if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
    saveStateToLocalStorage();
}

function toggleVitalType(id, active) {
    const vital = state.vitalTypes.find(v => v.id === id);
    if (vital) {
        vital.active = active;
        if (typeof updateVitalsInputs === 'function') updateVitalsInputs();
        saveStateToLocalStorage();
    }
}

function deleteVitalType(id) {
    if (confirm("Supprimer ce signe vital? Cette action est irréversible.")) {
        state.vitalTypes = state.vitalTypes.filter(v => v.id !== id);
        updateSettingsDisplay();
        alert("Signe vital supprimé!");
        saveStateToLocalStorage();
    }
}

function saveLabAnalysisType(id) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (!analysis) return;
    
    const priceInput = document.querySelector(`.analysis-price-input[data-id="${id}"]`);
    analysis.price = parseFloat(priceInput.value);
    
    alert("Analyse enregistrée!");
    saveStateToLocalStorage();
}

function toggleLabAnalysisType(id, active) {
    const analysis = state.labAnalysisTypes.find(a => a.id === id);
    if (analysis) {
        analysis.active = active;
        saveStateToLocalStorage();
    }
}

function deleteLabAnalysisType(id) {
    if (confirm("Supprimer cette analyse? Cette action est irréversible.")) {
        state.labAnalysisTypes = state.labAnalysisTypes.filter(a => a.id !== id);
        updateSettingsDisplay();
        alert("Analyse supprimée!");
        saveStateToLocalStorage();
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
    saveStateToLocalStorage();
}

function toggleExternalServiceType(id, active) {
    const service = state.externalServiceTypes.find(s => s.id == id);
    if (service) {
        service.active = active;
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
        saveStateToLocalStorage();
    }
}

function deleteExternalServiceType(id) {
    if (confirm("Supprimer ce service externe? Cette action est irréversible.")) {
        state.externalServiceTypes = state.externalServiceTypes.filter(s => s.id != id);
        updateSettingsDisplay();
        if (typeof updateExternalServicesSelect === 'function') updateExternalServicesSelect();
        if (typeof updateExternalServicesOptions === 'function') updateExternalServicesOptions();
        alert("Service externe supprimé!");
        saveStateToLocalStorage();
    }
}

function toggleUser(id, active) {
    const user = state.users.find(u => u.id === id);
    if (user) {
        user.active = active;
        saveStateToLocalStorage();
    }
}

function editUser(id) {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    
    const newPassword = prompt(`Nouveau mot de passe pour ${user.name}:`, user.password);
    if (newPassword !== null && newPassword.trim() !== '') {
        user.password = newPassword;
        alert("Mot de passe modifié avec succès!");
        updateSettingsDisplay();
        saveStateToLocalStorage();
    }
}

function deleteUser(id) {
    if (id <= 7) {
        alert("Impossible de supprimer les utilisateurs par défaut!");
        return;
    }
    
    if (confirm("Supprimer cet utilisateur? Cette action est irréversible.")) {
        state.users = state.users.filter(u => u.id !== id);
        updateSettingsDisplay();
        if (typeof updateMessageRecipients === 'function') updateMessageRecipients();
        alert("Utilisateur supprimé avec succès!");
        saveStateToLocalStorage();
    }
}
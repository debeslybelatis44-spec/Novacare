// ==================== MÉDECIN ====================
let currentDoctorPatient = null;

function setupDoctor() {
    document.getElementById('search-doctor-patient').addEventListener('click', () => {
        const search = document.getElementById('doctor-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        currentDoctorPatient = patient;
        
        const birthDate = new Date(patient.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        document.getElementById('doctor-patient-name').textContent = patient.fullName;
        document.getElementById('doctor-patient-id').textContent = patient.id;
        document.getElementById('doctor-patient-age').textContent = age;
        document.getElementById('doctor-patient-phone').textContent = patient.phone;
        document.getElementById('doctor-patient-type').textContent = patient.type.charAt(0).toUpperCase() + patient.type.slice(1);
        document.getElementById('doctor-hospitalized-status').textContent = patient.hospitalized ? 'Oui' : 'Non';
        
        const unpaidTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.status === 'unpaid'
        );
        const paidTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.status === 'paid'
        );
        
        let statusText, statusClass;
        if (unpaidTransactions.length === 0 && paidTransactions.length > 0) {
            statusText = 'Tout payé';
            statusClass = 'status-paid';
        } else if (paidTransactions.length > 0 && unpaidTransactions.length > 0) {
            statusText = 'Partiellement payé';
            statusClass = 'status-partial';
        } else {
            statusText = 'Non payé';
            statusClass = 'status-unpaid';
        }
        
        document.getElementById('doctor-payment-status').textContent = statusText;
        document.getElementById('doctor-payment-status').className = `patient-status-badge ${statusClass}`;
        
        document.getElementById('doctor-patient-details').classList.remove('hidden');
        
        // Le médecin ne voit pas les détails de paiement, seulement le type de consultation
        const consultationTransaction = state.transactions.find(t => 
            t.patientId === patient.id && 
            t.type === 'consultation'
        );
        
        const consultationContainer = document.getElementById('current-consultation-info');
        if (consultationTransaction) {
            // Le médecin ne voit pas le prix
            const consultationType = consultationTransaction.service.replace('Consultation: ', '');
            consultationContainer.innerHTML = `
                <p><strong>Type de consultation:</strong> ${consultationType}</p>
                <p><strong>Statut paiement:</strong> <span class="${consultationTransaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${consultationTransaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
            `;
            // Masquer la section de modification de consultation pour le médecin
            document.getElementById('consultation-modification-section').classList.add('hidden');
        } else {
            consultationContainer.innerHTML = '<p>Aucune consultation enregistrée</p>';
            document.getElementById('consultation-modification-section').classList.add('hidden');
        }
        
        updateCurrentVitalsDisplay(patient.id);
        updateLabAnalysesSelect();
        updateDoctorLabResults(patient.id);
        
        // Pré-remplir la case d'hospitalisation si déjà hospitalisé
        document.getElementById('hospitalize-patient').checked = patient.hospitalized || false;
    });
    
    updateDoctorConsultationTypes();
    
    // Supprimer l'événement de modification de consultation pour le médecin
    document.getElementById('update-consultation-type')?.removeEventListener('click', function() {});
    document.getElementById('update-consultation-type')?.setAttribute('disabled', 'true');
    document.getElementById('update-consultation-type')?.classList.add('hidden');
    
    // Le médecin peut toujours modifier les signes vitaux
    document.getElementById('edit-vitals-btn').addEventListener('click', () => {
        const patientId = document.getElementById('doctor-patient-id').textContent;
        const patientVitals = state.vitals.filter(v => v.patientId === patientId);
        
        if (patientVitals.length === 0) {
            alert("Aucun signe vital à modifier!");
            return;
        }
        
        const latestVitals = patientVitals[patientVitals.length - 1];
        const container = document.getElementById('vitals-modification-inputs');
        let html = '';
        
        state.vitalTypes.forEach(vital => {
            if (vital.active) {
                const currentValue = latestVitals.values[vital.name];
                html += `
                    <div class="vital-item">
                        <label class="form-label">${vital.name} (${vital.unit})</label>
                        <input type="text" class="form-control vital-modification-input" data-id="${vital.id}" 
                               value="${currentValue ? currentValue.value : ''}" placeholder="Valeur">
                        <small class="text-muted">Valeurs normales: ${vital.min} - ${vital.max} ${vital.unit}</small>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
        document.getElementById('doctor-vitals-modification').classList.remove('hidden');
    });
    
    document.getElementById('vitals-modification-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const patientId = document.getElementById('doctor-patient-id').textContent;
        const patientVitals = state.vitals.filter(v => v.patientId === patientId);
        const latestVitals = patientVitals[patientVitals.length - 1];
        
        const inputs = document.querySelectorAll('.vital-modification-input');
        
        inputs.forEach(input => {
            const vitalId = parseInt(input.dataset.id);
            const vital = state.vitalTypes.find(v => v.id === vitalId);
            if (vital && input.value.trim()) {
                latestVitals.values[vital.name] = {
                    value: input.value,
                    unit: vital.unit,
                    normalRange: `${vital.min} - ${vital.max}`,
                    modifiedBy: state.currentUser.username,
                    modificationDate: new Date().toISOString()
                };
            }
        });
        
        alert("Signes vitaux modifiés avec succès!");
        updateCurrentVitalsDisplay(patientId);
        document.getElementById('doctor-vitals-modification').classList.add('hidden');
    });
    
    document.getElementById('cancel-vitals-modification').addEventListener('click', () => {
        document.getElementById('doctor-vitals-modification').classList.add('hidden');
    });
    
    // Le médecin peut modifier les analyses
    document.getElementById('modify-analyses-btn').addEventListener('click', () => {
        const panel = document.getElementById('lab-modification-panel');
        panel.classList.toggle('hidden');
        
        if (!panel.classList.contains('hidden')) {
            const checkboxes = document.querySelectorAll('#lab-analyses-selection input:checked');
            if (checkboxes.length > 0) {
                const firstChecked = checkboxes[0];
                const analysisId = parseInt(firstChecked.value);
                const analysis = state.labAnalysisTypes.find(a => a.id === analysisId);
                
                if (analysis) {
                    document.getElementById('modified-analysis-name').value = analysis.name;
                    // Le médecin ne voit pas le prix pour la modification
                    document.getElementById('modified-analysis-price').value = analysis.price;
                    document.getElementById('modified-analysis-price').setAttribute('disabled', 'true');
                    state.currentModifiedAnalysis = { id: analysisId, name: analysis.name, price: analysis.price };
                }
            }
        }
    });
    
    document.getElementById('save-modified-analysis').addEventListener('click', () => {
        const modifiedName = document.getElementById('modified-analysis-name').value;
        const modifiedPrice = parseFloat(document.getElementById('modified-analysis-price').value);
        
        if (!modifiedName) {
            alert("Veuillez remplir le nom de l'analyse!");
            return;
        }
        
        const checkboxes = document.querySelectorAll('#lab-analyses-selection input:checked');
        checkboxes.forEach(cb => {
            const analysisId = parseInt(cb.value);
            if (analysisId === state.currentModifiedAnalysis.id) {
                const label = cb.parentElement;
                // Le médecin ne voit pas le prix dans l'affichage
                label.innerHTML = `<input type="checkbox" value="${analysisId}" data-price="${modifiedPrice}" checked>
                                   ${modifiedName} <span class="text-warning"><i class="fas fa-edit"></i> Modifié</span>`;
            }
        });
        
        state.currentModifiedAnalysis.modifiedName = modifiedName;
        state.currentModifiedAnalysis.modifiedPrice = modifiedPrice;
        
        document.getElementById('lab-modification-panel').classList.add('hidden');
        alert("Analyse modifiée! Cette modification s'appliquera uniquement au patient en cours.");
    });
    
    document.getElementById('cancel-analysis-modification').addEventListener('click', () => {
        document.getElementById('lab-modification-panel').classList.add('hidden');
        state.currentModifiedAnalysis = null;
    });
    
    document.getElementById('medication-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const suggestions = document.getElementById('medication-suggestions');
        
        if (searchTerm.length < 2) {
            suggestions.classList.add('hidden');
            return;
        }
        
        const matchingMeds = state.medicationStock.filter(med => 
            med.name.toLowerCase().includes(searchTerm) ||
            (med.genericName && med.genericName.toLowerCase().includes(searchTerm))
        ).slice(0, 5);
        
        if (matchingMeds.length > 0) {
            let html = '';
            matchingMeds.forEach(med => {
                // Le médecin ne voit pas le prix des médicaments
                html += `
                    <div class="suggestion-item" style="padding:5px 10px; cursor:pointer;" 
                         onclick="addMedicationToPrescription('${med.id}')">
                        ${med.name} (${med.form}) - Stock: ${med.quantity}
                    </div>
                `;
            });
            suggestions.innerHTML = html;
            suggestions.classList.remove('hidden');
        } else {
            suggestions.classList.add('hidden');
        }
    });
    
    document.getElementById('consultation-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentDoctorPatient) {
            alert("Veuillez d'abord sélectionner un patient!");
            return;
        }
        
        const diagnosis = document.getElementById('consultation-diagnosis').value;
        const notes = document.getElementById('consultation-notes').value;
        const followupDate = document.getElementById('followup-date').value;
        const followupTime = document.getElementById('followup-time').value;
        const hospitalize = document.getElementById('hospitalize-patient').checked;
        
        // Si on coche hospitaliser, on marque le patient comme hospitalisé
        if (hospitalize && !currentDoctorPatient.hospitalized) {
            currentDoctorPatient.hospitalized = true;
            currentDoctorPatient.hospitalizationStartDate = new Date().toISOString().split('T')[0];
            currentDoctorPatient.hospitalizationServices = currentDoctorPatient.hospitalizationServices || [];
            alert("Patient marqué comme hospitalisé. Les services seront comptabilisés et facturés en fin d'hospitalisation.");
        }
        
        const consultation = {
            id: 'CONS' + Date.now(),
            patientId: currentDoctorPatient.id,
            patientName: currentDoctorPatient.fullName,
            doctor: state.currentUser.username,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            diagnosis: diagnosis,
            notes: notes,
            followupDate: followupDate,
            followupTime: followupTime,
            modified: false
        };
        
        state.consultations.push(consultation);
        
        // Déterminer le statut de paiement en fonction de l'hospitalisation ou des privilèges
        let paymentStatus = 'unpaid';
        let paymentMethod = null;
        let paymentNote = '';
        
        if (currentDoctorPatient.hospitalized) {
            paymentStatus = 'hospitalized'; // Statut spécial pour dette d'hospitalisation
            paymentMethod = 'hospitalization';
            paymentNote = 'Service en cours d\'hospitalisation';
        } else if (currentDoctorPatient.vip) {
            paymentStatus = 'paid';
            paymentMethod = 'vip';
        } else if (currentDoctorPatient.sponsored) {
            paymentStatus = 'unpaid'; // sera ajusté après réduction
        }
        
        // Traitement des analyses
        const analysisCheckboxes = document.querySelectorAll('#lab-analyses-selection input:checked');
        analysisCheckboxes.forEach(cb => {
            const analysisId = parseInt(cb.value);
            let analysis = state.labAnalysisTypes.find(a => a.id === analysisId);
            
            if (state.currentModifiedAnalysis && state.currentModifiedAnalysis.id === analysisId) {
                analysis = { ...analysis, ...state.currentModifiedAnalysis };
            }
            
            if (analysis) {
                let amount = analysis.modifiedPrice || analysis.price;
                if (currentDoctorPatient.sponsored && !currentDoctorPatient.hospitalized) {
                    amount = amount * (1 - currentDoctorPatient.discountPercentage / 100);
                }
                
                const analysisTransaction = {
                    id: 'LAB' + Date.now(),
                    patientId: currentDoctorPatient.id,
                    patientName: currentDoctorPatient.fullName,
                    service: `Analyse: ${analysis.modifiedName || analysis.name}`,
                    amount: amount,
                    status: paymentStatus,
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    createdBy: state.currentUser.username,
                    type: 'lab',
                    analysisId: analysisId,
                    result: null,
                    labStatus: 'pending',
                    notificationSent: false,
                    originalTypeId: analysisId,
                    modifiedName: analysis.modifiedName || null,
                    modifiedPrice: analysis.modifiedPrice || null,
                    paymentMethod: paymentMethod,
                    paymentNote: paymentNote
                };
                
                if (currentDoctorPatient.hospitalized) {
                    // Stocker dans le tableau d'hospitalisation du patient
                    if (!currentDoctorPatient.hospitalizationServices) currentDoctorPatient.hospitalizationServices = [];
                    currentDoctorPatient.hospitalizationServices.push(analysisTransaction);
                }
                
                state.transactions.push(analysisTransaction);
                
                // Notifications : si pas hospitalisé et pas VIP, on notifie la caisse
                if (!currentDoctorPatient.hospitalized && !currentDoctorPatient.vip) {
                    sendNotificationToCashier(analysisTransaction);
                }
                // Notifier le laboratoire
                sendNotificationToLab(analysisTransaction);
            }
        });
        
        // Traitement des médicaments prescrits
        const medicationRows = document.querySelectorAll('#prescription-medications-list tr');
        medicationRows.forEach(row => {
            const medName = row.cells[0].textContent;
            const dosage = row.cells[1].querySelector('input').value;
            const quantity = parseInt(row.cells[2].querySelector('input').value);
            const medId = row.cells[2].querySelector('input').dataset.medId;
            
            const med = state.medicationStock.find(m => m.id === medId);
            if (!med) return;
            
            let amount = med.price * quantity;
            if (currentDoctorPatient.sponsored && !currentDoctorPatient.hospitalized) {
                amount = amount * (1 - currentDoctorPatient.discountPercentage / 100);
            }
            
            const medTransaction = {
                id: 'MED' + Date.now(),
                patientId: currentDoctorPatient.id,
                patientName: currentDoctorPatient.fullName,
                service: `Médicament: ${medName} (${quantity} ${med.unit})`,
                amount: amount,
                status: paymentStatus,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'medication',
                medicationId: medId,
                dosage: dosage,
                quantity: quantity,
                deliveryStatus: 'pending',
                notificationSent: false,
                paymentMethod: paymentMethod,
                paymentNote: paymentNote
            };
            
            if (currentDoctorPatient.hospitalized) {
                if (!currentDoctorPatient.hospitalizationServices) currentDoctorPatient.hospitalizationServices = [];
                currentDoctorPatient.hospitalizationServices.push(medTransaction);
            }
            
            state.transactions.push(medTransaction);
            
            // Notifications : si pas hospitalisé et pas VIP, notifier la caisse
            if (!currentDoctorPatient.hospitalized && !currentDoctorPatient.vip) {
                sendNotificationToCashier(medTransaction);
            }
            // Notifier la pharmacie
            sendNotificationToPharmacy(medTransaction);
            
            med.reserved = (med.reserved || 0) + quantity;
        });
        
        alert("Consultation enregistrée avec succès!");
        e.target.reset();
        
        document.getElementById('prescription-medications-list').innerHTML = '';
        document.getElementById('stock-warnings').innerHTML = '';
        state.currentModifiedAnalysis = null;
        document.getElementById('lab-modification-panel').classList.add('hidden');
        document.getElementById('hospitalize-patient').checked = false; // réinitialiser
    });
    
    // Le médecin ne peut pas modifier une consultation existante
    document.getElementById('modify-consultation-btn')?.remove();
    
    document.getElementById('search-doctor-appointment-medical').addEventListener('click', searchDoctorAppointment);
}

function updateDoctorConsultationTypes() {
    const select = document.getElementById('doctor-consultation-type');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un type</option>';
    state.consultationTypes.forEach(type => {
        if (type.active) {
            // Le médecin ne voit pas les prix
            select.innerHTML += `<option value="${type.id}" data-price="${type.price}">${type.name}</option>`;
        }
    });
}

function updateCurrentVitalsDisplay(patientId) {
    const container = document.getElementById('current-vitals-display');
    const patientVitals = state.vitals.filter(v => v.patientId === patientId);
    
    if (patientVitals.length === 0) {
        container.innerHTML = '<p>Aucun signe vital enregistré.</p>';
        return;
    }
    
    const latestVitals = patientVitals[patientVitals.length - 1];
    
    let html = '<div class="vitals-grid">';
    
    for (const [vitalName, data] of Object.entries(latestVitals.values)) {
        html += `
            <div class="vital-item">
                <strong>${vitalName}:</strong><br>
                ${data.value} ${data.unit}<br>
                <small>Normale: ${data.normalRange}</small>
            </div>
        `;
    }
    
    html += '</div>';
    html += `<p><small>Pris le ${latestVitals.date} à ${latestVitals.time} par ${latestVitals.takenBy}</small></p>`;
    
    container.innerHTML = html;
}

function updateLabAnalysesSelect() {
    const container = document.getElementById('lab-analyses-selection');
    
    const groupedAnalyses = {};
    state.labAnalysisTypes.forEach(analysis => {
        if (!analysis.active) return;
        
        const category = analysis.name.split(' ')[0];
        if (!groupedAnalyses[category]) {
            groupedAnalyses[category] = [];
        }
        groupedAnalyses[category].push(analysis);
    });
    
    let html = '';
    for (const [category, analyses] of Object.entries(groupedAnalyses)) {
        html += `<div class="analysis-group">`;
        html += `<h5>${category}</h5>`;
        analyses.forEach(analysis => {
            // Le médecin ne voit pas les prix
            html += `
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" value="${analysis.id}" data-price="${analysis.price}">
                    ${analysis.name}
                </label>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

function addMedicationToPrescription(medId) {
    const med = state.medicationStock.find(m => m.id === medId);
    if (!med) return;
    
    const tableBody = document.getElementById('prescription-medications-list');
    
    const row = document.createElement('tr');
    // Le médecin ne voit pas le prix dans le tableau
    row.innerHTML = `
        <td>${med.name}</td>
        <td><input type="text" class="form-control" placeholder="Ex: 1 comprimé matin et soir" value="1 comprimé 3x/jour"></td>
        <td><input type="number" class="form-control quantity-input" data-med-id="${med.id}" value="10" min="1" max="${med.quantity}"></td>
        <td>${med.quantity}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeMedicationFromPrescription(this)">Supprimer</button></td>
    `;
    
    tableBody.appendChild(row);
    
    document.getElementById('medication-suggestions').classList.add('hidden');
    document.getElementById('medication-search').value = '';
    
    checkStockWarnings();
}

function removeMedicationFromPrescription(button) {
    button.closest('tr').remove();
    checkStockWarnings();
}

function checkStockWarnings() {
    const warnings = document.getElementById('stock-warnings');
    const rows = document.querySelectorAll('#prescription-medications-list tr');
    
    let warningHtml = '';
    let hasWarning = false;
    
    rows.forEach(row => {
        const medId = row.querySelector('.quantity-input').dataset.medId;
        const quantity = parseInt(row.querySelector('.quantity-input').value);
        const med = state.medicationStock.find(m => m.id === medId);
        
        if (med) {
            if (quantity > med.quantity) {
                warningHtml += `<div class="alert alert-warning">${med.name}: Stock insuffisant (demandé: ${quantity}, disponible: ${med.quantity})</div>`;
                hasWarning = true;
            } else if (med.quantity <= med.alertThreshold) {
                warningHtml += `<div class="alert alert-info">${med.name}: Stock faible (${med.quantity} ${med.unit})</div>`;
            }
        }
    });
    
    warnings.innerHTML = warningHtml;
    if (document.getElementById('deliver-medications')) {
        document.getElementById('deliver-medications').disabled = hasWarning;
    }
}

function updateDoctorLabResults(patientId) {
    const container = document.getElementById('doctor-lab-results');
    const labTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'lab' &&
        t.labStatus === 'completed'
    );
    
    if (labTransactions.length === 0) {
        container.innerHTML = '<p>Aucun résultat d\'analyse disponible.</p>';
        return;
    }
    
    let html = '<div class="card">';
    labTransactions.forEach(transaction => {
        const analysisType = state.labAnalysisTypes.find(a => a.id === transaction.analysisId);
        const resultType = analysisType ? analysisType.resultType : 'text';
        
        html += `
            <div class="mb-3">
                <h5>${transaction.service}</h5>
                <p><strong>Date:</strong> ${transaction.date}</p>
                <p><strong>Résultat:</strong></p>
                ${resultType === 'text' ? 
                    `<pre style="background:#f8f9fa; padding:10px; border-radius:5px;">${transaction.result}</pre>` :
                    `<img src="${transaction.result}" alt="Résultat" style="max-width:300px; border:1px solid #ddd; border-radius:5px;">`
                }
                <hr>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function loadDoctorAppointments() {
    const container = document.getElementById('doctor-appointment-results-medical');
    const today = new Date().toISOString().split('T')[0];
    const doctorAppointments = state.appointments.filter(a => 
        a.doctor === state.currentUser.username && 
        a.date >= today
    ).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    
    if (doctorAppointments.length === 0) {
        container.innerHTML = '<p>Aucun rendez-vous programmé.</p>';
        return;
    }
    
    let html = '<h4>Vos rendez-vous</h4>';
    html += '<table class="table-container"><thead><tr><th>Patient</th><th>Date</th><th>Heure</th><th>Motif</th></tr></thead><tbody>';
    doctorAppointments.forEach(app => {
        html += `<tr><td>${app.patientName} (${app.patientId})</td><td>${app.date}</td><td>${app.time}</td><td>${app.reason}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function searchDoctorAppointment() {
    const searchId = document.getElementById('doctor-appointment-search-medical').value;
    if (!searchId) {
        loadDoctorAppointments();
        return;
    }
    
    const appointments = state.appointments.filter(a => 
        a.patientId === searchId && 
        a.doctor === state.currentUser.username
    );
    
    const container = document.getElementById('doctor-appointment-results-medical');
    
    if (appointments.length === 0) {
        container.innerHTML = '<p>Aucun rendez-vous trouvé pour ce patient.</p>';
        return;
    }
    
    let html = '<h4>Rendez-vous pour ce patient</h4>';
    html += '<table class="table-container"><thead><tr><th>Patient</th><th>Date</th><th>Heure</th><th>Motif</th></tr></thead><tbody>';
    appointments.forEach(app => {
        html += `<tr><td>${app.patientName} (${app.patientId})</td><td>${app.date}</td><td>${app.time}</td><td>${app.reason}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Fonctions de notification pour laboratoire et pharmacie
function sendNotificationToLab(transaction) {
    const labUsers = state.users.filter(u => u.role === 'lab' && u.active);
    labUsers.forEach(user => {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: user.username,
            recipientRole: user.role,
            subject: 'Nouvelle analyse prescrite',
            content: `Analyse prescrite pour ${transaction.patientName}: ${transaction.service}. ID transaction: ${transaction.id}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'lab_prescription'
        };
        state.messages.push(message);
    });
    updateMessageBadge();
    // Émettre un toast de notification
    showNotification(`Nouvelle analyse pour ${transaction.patientName}`, 'info');
}

function sendNotificationToPharmacy(transaction) {
    const pharmacyUsers = state.users.filter(u => u.role === 'pharmacy' && u.active);
    pharmacyUsers.forEach(user => {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: user.username,
            recipientRole: user.role,
            subject: 'Nouvelle prescription médicamenteuse',
            content: `Médicament prescrit pour ${transaction.patientName}: ${transaction.service}. ID transaction: ${transaction.id}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'pharmacy_prescription'
        };
        state.messages.push(message);
    });
    updateMessageBadge();
    showNotification(`Nouvelle prescription pour ${transaction.patientName}`, 'info');
}

function showNotification(message, type = 'info') {
    // Créer un toast
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Jouer un son (optionnel)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Son bloqué par le navigateur'));
    } catch (e) {}
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Initialisation du module médecin
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('doctor-patient-search')) {
        setupDoctor();
    }
});

// Rendre les fonctions accessibles globalement
window.addMedicationToPrescription = addMedicationToPrescription;
window.removeMedicationFromPrescription = removeMedicationFromPrescription;
window.checkStockWarnings = checkStockWarnings;
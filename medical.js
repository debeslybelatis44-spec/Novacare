// Module Médical (Infirmier, Médecin, Laboratoire)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('nurse-patient-search')) {
        setupNurse();
    }
    if (document.getElementById('doctor-patient-search')) {
        setupDoctor();
    }
    if (document.getElementById('lab-patient-search')) {
        setupLaboratory();
    }
});

// ==================== INFIRMIER ====================
function setupNurse() {
    document.getElementById('search-nurse-patient').addEventListener('click', () => {
        const search = document.getElementById('nurse-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        document.getElementById('nurse-patient-name').textContent = patient.fullName;
        document.getElementById('nurse-patient-id').textContent = patient.id;
        
        const unpaidCount = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.status === 'unpaid'
        ).length;
        
        const paymentStatus = unpaidCount > 0 ? 'Non payé' : 'Payé';
        const statusClass = unpaidCount > 0 ? 'status-unpaid' : 'status-paid';
        
        document.getElementById('nurse-payment-status').textContent = paymentStatus;
        document.getElementById('nurse-payment-status').className = `patient-status-badge ${statusClass}`;
        
        document.getElementById('nurse-patient-details').classList.remove('hidden');
        
        updateVitalsHistory(patient.id);
    });
    
    updateVitalsInputs();
    
    document.getElementById('vitals-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const patientId = document.getElementById('nurse-patient-id').textContent;
        const inputs = document.querySelectorAll('.vital-input');
        const vitalsRecord = {
            patientId: patientId,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            takenBy: state.currentUser.username,
            values: {}
        };
        
        inputs.forEach(input => {
            const vitalId = parseInt(input.dataset.id);
            const vital = state.vitalTypes.find(v => v.id === vitalId);
            if (vital && input.value.trim()) {
                vitalsRecord.values[vital.name] = {
                    value: input.value,
                    unit: vital.unit,
                    normalRange: `${vital.min} - ${vital.max}`
                };
            }
        });
        
        state.vitals.push(vitalsRecord);
        alert("Signes vitaux enregistrés avec succès!");
        updateVitalsHistory(patientId);
        e.target.reset();
    });
}

function updateVitalsInputs() {
    const container = document.getElementById('vitals-inputs-container');
    let html = '';
    
    state.vitalTypes.forEach(vital => {
        if (vital.active) {
            html += `
                <div class="vital-item">
                    <label class="form-label">${vital.name} (${vital.unit})</label>
                    <input type="text" class="form-control vital-input" data-id="${vital.id}" 
                           placeholder="Valeur">
                    <small class="text-muted">Valeurs normales: ${vital.min} - ${vital.max} ${vital.unit}</small>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function updateVitalsHistory(patientId) {
    const container = document.getElementById('vitals-history');
    const patientVitals = state.vitals.filter(v => v.patientId === patientId);
    
    if (patientVitals.length === 0) {
        container.innerHTML = '<p>Aucun signe vital enregistré pour ce patient.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Date/Heure</th>';
    
    state.vitalTypes.forEach(vital => {
        if (vital.active) {
            html += `<th>${vital.name}</th>`;
        }
    });
    
    html += '<th>Infirmier</th></tr></thead><tbody>';
    
    patientVitals.forEach(record => {
        html += `<tr><td>${record.date} ${record.time}</td>`;
        
        state.vitalTypes.forEach(vital => {
            if (vital.active) {
                const value = record.values[vital.name];
                html += `<td>${value ? `${value.value} ${value.unit}` : '-'}</td>`;
            }
        });
        
        html += `<td>${record.takenBy}</td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

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
        
        const consultationTransaction = state.transactions.find(t => 
            t.patientId === patient.id && 
            t.type === 'consultation'
        );
        
        const consultationContainer = document.getElementById('current-consultation-info');
        if (consultationTransaction) {
            consultationContainer.innerHTML = `
                <p><strong>Type:</strong> ${consultationTransaction.service}</p>
                <p><strong>Prix:</strong> ${consultationTransaction.amount} Gdes</p>
                <p><strong>Statut paiement:</strong> <span class="${consultationTransaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${consultationTransaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
            `;
            document.getElementById('consultation-modification-section').classList.remove('hidden');
        } else {
            consultationContainer.innerHTML = '<p>Aucune consultation enregistrée</p>';
            document.getElementById('consultation-modification-section').classList.add('hidden');
        }
        
        updateCurrentVitalsDisplay(patient.id);
        updateLabAnalysesSelect();
        updateDoctorLabResults(patient.id);
    });
    
    updateDoctorConsultationTypes();
    
    document.getElementById('update-consultation-type').addEventListener('click', function() {
        if (!currentDoctorPatient) {
            alert("Veuillez d'abord sélectionner un patient!");
            return;
        }
        
        const select = document.getElementById('doctor-consultation-type');
        const selectedOption = select.options[select.selectedIndex];
        const newTypeId = selectedOption.value;
        const newPrice = parseFloat(selectedOption.dataset.price);
        
        if (!newTypeId) {
            alert("Veuillez sélectionner un type de consultation!");
            return;
        }
        
        const consultationTransaction = state.transactions.find(t => 
            t.patientId === currentDoctorPatient.id && 
            t.type === 'consultation'
        );
        
        if (!consultationTransaction) {
            alert("Aucune consultation trouvée pour ce patient!");
            return;
        }
        
        const oldPrice = consultationTransaction.amount;
        const priceDifference = newPrice - oldPrice;
        
        if (priceDifference > 0) {
            const adjustmentTransaction = {
                id: 'ADJ' + state.transactionCounter.toString().padStart(4, '0'),
                patientId: currentDoctorPatient.id,
                patientName: currentDoctorPatient.fullName,
                service: `Ajustement consultation: ${selectedOption.text}`,
                amount: priceDifference,
                status: 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'adjustment',
                notificationSent: false
            };
            
            state.transactionCounter++;
            state.transactions.push(adjustmentTransaction);
            
            consultationTransaction.service = `Consultation: ${selectedOption.text.split(' - ')[0]}`;
            consultationTransaction.amount = newPrice;
            
            sendNotificationToCashier(adjustmentTransaction);
            alert(`Consultation modifiée! Une transaction d'ajustement de ${priceDifference} Gdes a été créée. Le patient doit retourner à la caisse.`);
        } else if (priceDifference < 0) {
            const creditTransaction = {
                id: 'CRED' + state.transactionCounter.toString().padStart(4, '0'),
                patientId: currentDoctorPatient.id,
                patientName: currentDoctorPatient.fullName,
                service: `Crédit consultation: ${selectedOption.text}`,
                amount: Math.abs(priceDifference),
                status: 'credit',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'credit',
                notificationSent: false
            };
            
            state.transactionCounter++;
            state.transactions.push(creditTransaction);
            
            consultationTransaction.service = `Consultation: ${selectedOption.text.split(' - ')[0]}`;
            consultationTransaction.amount = newPrice;
            
            alert(`Consultation modifiée! Un crédit de ${Math.abs(priceDifference)} Gdes a été créé pour le patient.`);
        } else {
            consultationTransaction.service = `Consultation: ${selectedOption.text.split(' - ')[0]}`;
            alert("Consultation modifiée (même prix).");
        }
        
        document.getElementById('search-doctor-patient').click();
    });
    
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
                    document.getElementById('modified-analysis-price').value = analysis.price;
                    state.currentModifiedAnalysis = { id: analysisId, name: analysis.name, price: analysis.price };
                }
            }
        }
    });
    
    document.getElementById('save-modified-analysis').addEventListener('click', () => {
        const modifiedName = document.getElementById('modified-analysis-name').value;
        const modifiedPrice = parseFloat(document.getElementById('modified-analysis-price').value);
        
        if (!modifiedName || isNaN(modifiedPrice)) {
            alert("Veuillez remplir tous les champs correctement!");
            return;
        }
        
        const checkboxes = document.querySelectorAll('#lab-analyses-selection input:checked');
        checkboxes.forEach(cb => {
            const analysisId = parseInt(cb.value);
            if (analysisId === state.currentModifiedAnalysis.id) {
                const label = cb.parentElement;
                label.innerHTML = `<input type="checkbox" value="${analysisId}" data-price="${modifiedPrice}" checked>
                                   ${modifiedName} (${modifiedPrice} Gdes) <span class="text-warning"><i class="fas fa-edit"></i> Modifié</span>`;
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
            med.genericName.toLowerCase().includes(searchTerm)
        ).slice(0, 5);
        
        if (matchingMeds.length > 0) {
            let html = '';
            matchingMeds.forEach(med => {
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
        const followupDate = document.getElementById('followup-date').value;
        const followupTime = document.getElementById('followup-time').value;
        
        const consultation = {
            id: 'CONS' + Date.now(),
            patientId: currentDoctorPatient.id,
            patientName: currentDoctorPatient.fullName,
            doctor: state.currentUser.username,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            diagnosis: diagnosis,
            followupDate: followupDate,
            followupTime: followupTime,
            modified: false
        };
        
        state.consultations.push(consultation);
        
        const analysisCheckboxes = document.querySelectorAll('#lab-analyses-selection input:checked');
        analysisCheckboxes.forEach(cb => {
            const analysisId = parseInt(cb.value);
            let analysis = state.labAnalysisTypes.find(a => a.id === analysisId);
            
            if (state.currentModifiedAnalysis && state.currentModifiedAnalysis.id === analysisId) {
                analysis = { ...analysis, ...state.currentModifiedAnalysis };
            }
            
            if (analysis) {
                const analysisTransaction = {
                    id: 'LAB' + Date.now(),
                    patientId: currentDoctorPatient.id,
                    patientName: currentDoctorPatient.fullName,
                    service: `Analyse: ${analysis.modifiedName || analysis.name}`,
                    amount: analysis.modifiedPrice || analysis.price,
                    status: currentDoctorPatient.vip ? 'paid' : 'unpaid',
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
                    modifiedPrice: analysis.modifiedPrice || null
                };
                
                if (currentDoctorPatient.vip) {
                    analysisTransaction.paymentMethod = 'vip';
                    analysisTransaction.paymentDate = new Date().toISOString().split('T')[0];
                    analysisTransaction.paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    analysisTransaction.paymentAgent = 'system';
                } else if (currentDoctorPatient.sponsored) {
                    analysisTransaction.amount = analysisTransaction.amount * (1 - currentDoctorPatient.discountPercentage / 100);
                }
                
                state.transactions.push(analysisTransaction);
                if (!currentDoctorPatient.vip) {
                    sendNotificationToCashier(analysisTransaction);
                }
            }
        });
        
        const medicationRows = document.querySelectorAll('#prescription-medications-list tr');
        medicationRows.forEach(row => {
            const medName = row.cells[0].textContent;
            const dosage = row.cells[1].querySelector('input').value;
            const quantity = parseInt(row.cells[2].querySelector('input').value);
            const medId = row.cells[2].querySelector('input').dataset.medId;
            
            const med = state.medicationStock.find(m => m.id === medId);
            
            const medTransaction = {
                id: 'MED' + Date.now(),
                patientId: currentDoctorPatient.id,
                patientName: currentDoctorPatient.fullName,
                service: `Médicament: ${medName} (${quantity} ${med.unit})`,
                amount: med.price * quantity,
                status: currentDoctorPatient.vip ? 'paid' : 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'medication',
                medicationId: medId,
                dosage: dosage,
                quantity: quantity,
                deliveryStatus: 'pending',
                notificationSent: false
            };
            
            if (currentDoctorPatient.vip) {
                medTransaction.paymentMethod = 'vip';
                medTransaction.paymentDate = new Date().toISOString().split('T')[0];
                medTransaction.paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                medTransaction.paymentAgent = 'system';
            } else if (currentDoctorPatient.sponsored) {
                medTransaction.amount = medTransaction.amount * (1 - currentDoctorPatient.discountPercentage / 100);
            }
            
            state.transactions.push(medTransaction);
            if (!currentDoctorPatient.vip) {
                sendNotificationToCashier(medTransaction);
            }
            
            med.reserved = (med.reserved || 0) + quantity;
        });
        
        alert("Consultation enregistrée avec succès!");
        e.target.reset();
        
        document.getElementById('prescription-medications-list').innerHTML = '';
        document.getElementById('stock-warnings').innerHTML = '';
        state.currentModifiedAnalysis = null;
        document.getElementById('lab-modification-panel').classList.add('hidden');
    });
    
    document.getElementById('modify-consultation-btn').addEventListener('click', () => {
        if (!currentDoctorPatient) {
            alert("Veuillez d'abord sélectionner un patient!");
            return;
        }
        
        const patientConsultations = state.consultations.filter(c => c.patientId === currentDoctorPatient.id);
        if (patientConsultations.length === 0) {
            alert("Aucune consultation à modifier!");
            return;
        }
        
        const latestConsultation = patientConsultations[patientConsultations.length - 1];
        
        document.getElementById('consultation-diagnosis').value = latestConsultation.diagnosis;
        if (latestConsultation.followupDate) {
            document.getElementById('followup-date').value = latestConsultation.followupDate;
        }
        if (latestConsultation.followupTime) {
            document.getElementById('followup-time').value = latestConsultation.followupTime;
        }
        
        latestConsultation.modified = true;
        latestConsultation.modifiedBy = state.currentUser.username;
        latestConsultation.modificationDate = new Date().toISOString();
        
        alert("Consultation chargée pour modification. Modifiez les champs et enregistrez à nouveau.");
    });
    
    document.getElementById('search-doctor-appointment').addEventListener('click', searchDoctorAppointment);
}

function updateDoctorConsultationTypes() {
    const select = document.getElementById('doctor-consultation-type');
    select.innerHTML = '<option value="">Sélectionner un type</option>';
    state.consultationTypes.forEach(type => {
        if (type.active) {
            select.innerHTML += `<option value="${type.id}" data-price="${type.price}">${type.name} - ${type.price} Gdes</option>`;
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
            html += `
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" value="${analysis.id}" data-price="${analysis.price}">
                    ${analysis.name} (${analysis.price} Gdes)
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
    const container = document.getElementById('doctor-appointment-results');
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

// ==================== LABORATOIRE ====================
function setupLaboratory() {
    document.getElementById('search-lab-patient').addEventListener('click', () => {
        const search = document.getElementById('lab-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        document.getElementById('lab-patient-name').textContent = patient.fullName;
        document.getElementById('lab-patient-id').textContent = patient.id;
        
        const labTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.type === 'lab'
        );
        
        const unpaidLab = labTransactions.filter(t => t.status === 'unpaid');
        const paidLab = labTransactions.filter(t => t.status === 'paid');
        
        let statusText, statusClass;
        if (unpaidLab.length === 0 && paidLab.length > 0) {
            statusText = 'Toutes payées';
            statusClass = 'status-paid';
        } else if (paidLab.length > 0 && unpaidLab.length > 0) {
            statusText = 'Partiellement payé';
            statusClass = 'status-partial';
        } else if (unpaidLab.length > 0) {
            statusText = 'Non payé';
            statusClass = 'status-unpaid';
        } else {
            statusText = 'Aucune analyse';
            statusClass = '';
        }
        
        document.getElementById('lab-payment-status').textContent = statusText;
        document.getElementById('lab-payment-status').className = `patient-status-badge ${statusClass}`;
        
        let html = '';
        labTransactions.forEach(transaction => {
            const analysisType = state.labAnalysisTypes.find(a => a.id === transaction.analysisId);
            const resultType = analysisType ? analysisType.resultType : 'text';
            
            html += `
                <div class="card mb-2">
                    <div class="d-flex justify-between">
                        <div>
                            <h5>${transaction.service}</h5>
                            <p>Date: ${transaction.date} ${transaction.time}</p>
                            <p>Statut paiement: <span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
                            <p>Statut analyse: <span class="${transaction.labStatus === 'completed' ? 'status-paid' : 'status-unpaid'}">${transaction.labStatus || 'En attente'}</span></p>
                        </div>
                        <div>
                            ${transaction.status === 'paid' && transaction.labStatus !== 'completed' ? `
                                <button class="btn btn-success" onclick="enterLabResult('${transaction.id}')">
                                    Saisir résultat
                                </button>
                            ` : ''}
                            ${transaction.result ? `
                                <button class="btn btn-info" onclick="viewLabResult('${transaction.id}')">
                                    Voir résultat
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${transaction.result ? `
                        <div class="mt-2">
                            <strong>Résultat:</strong><br>
                            ${resultType === 'image' ? 
                                `<img src="${transaction.result}" alt="Résultat" style="max-width: 200px;">` : 
                                `<pre>${transaction.result}</pre>`
                            }
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        document.getElementById('lab-analyses-list').innerHTML = html || '<p>Aucune analyse trouvée.</p>';
        document.getElementById('lab-patient-details').classList.remove('hidden');
        
        updatePendingAnalysesList();
    });
}

function enterLabResult(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const analysisType = state.labAnalysisTypes.find(a => a.id === transaction.analysisId);
    const resultType = analysisType ? analysisType.resultType : 'text';
    
    const patient = state.patients.find(p => p.id === transaction.patientId);
    
    let formHtml = `
        <div class="card">
            <h4>Saisir résultat: ${transaction.service}</h4>
            <p>Patient: ${patient.fullName} (${patient.id})</p>
    `;
    
    if (resultType === 'text') {
        formHtml += `
            <textarea id="lab-result-text" class="form-control" rows="5" placeholder="Entrez le résultat..."></textarea>
            <div class="mt-2">
                <button class="btn btn-success" onclick="saveLabResult('${transactionId}', 'text')">Enregistrer</button>
                <button class="btn btn-secondary" onclick="document.getElementById('lab-result-modal').remove()">Annuler</button>
            </div>
        `;
    } else if (resultType === 'image') {
        formHtml += `
            <input type="file" id="lab-result-image" class="form-control" accept="image/*">
            <div class="mt-2">
                <button class="btn btn-success" onclick="saveLabResult('${transactionId}', 'image')">Enregistrer</button>
                <button class="btn btn-secondary" onclick="document.getElementById('lab-result-modal').remove()">Annuler</button>
            </div>
        `;
    }
    
    formHtml += '</div>';
    
    const modal = document.createElement('div');
    modal.id = 'lab-result-modal';
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${formHtml}</div>`;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

function saveLabResult(transactionId, type) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    if (type === 'text') {
        const result = document.getElementById('lab-result-text').value;
        if (!result.trim()) {
            alert("Veuillez entrer un résultat!");
            return;
        }
        transaction.result = result;
    } else if (type === 'image') {
        const fileInput = document.getElementById('lab-result-image');
        if (!fileInput.files[0]) {
            alert("Veuillez sélectionner une image!");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            transaction.result = e.target.result;
            transaction.labStatus = 'completed';
            
            sendLabResultNotification(transaction);
            
            alert("Résultat enregistré avec succès!");
            document.getElementById('lab-result-modal').remove();
            document.getElementById('search-lab-patient').click();
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
    }
    
    transaction.labStatus = 'completed';
    
    sendLabResultNotification(transaction);
    
    alert("Résultat enregistré avec succès!");
    document.getElementById('lab-result-modal').remove();
    document.getElementById('search-lab-patient').click();
}

function sendLabResultNotification(transaction) {
    const doctors = state.users.filter(u => u.role === 'doctor' && u.active);
    doctors.forEach(doctor => {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: doctor.username,
            recipientRole: doctor.role,
            subject: 'Résultat d\'analyse disponible',
            content: `Résultat disponible pour le patient ${transaction.patientName}: ${transaction.service}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'lab_result'
        };
        state.messages.push(message);
    });
    updateMessageBadge();
}

function viewLabResult(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction || !transaction.result) return;
    
    const analysisType = state.labAnalysisTypes.find(a => a.id === transaction.analysisId);
    const resultType = analysisType ? analysisType.resultType : 'text';
    
    let html = `
        <div class="card">
            <h4>Résultat: ${transaction.service}</h4>
            <p>Patient: ${transaction.patientName}</p>
            <p>Date: ${transaction.date}</p>
            <hr>
    `;
    
    if (resultType === 'text') {
        html += `<pre>${transaction.result}</pre>`;
    } else {
        html += `<img src="${transaction.result}" alt="Résultat" style="max-width: 100%;">`;
    }
    
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${html}
        <div class="mt-3"><button class="btn btn-secondary" onclick="this.closest('.transaction-details-modal').remove()">Fermer</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

function updatePendingAnalysesList() {
    const pending = state.transactions.filter(t => 
        t.type === 'lab' && 
        t.status === 'paid' && 
        (!t.labStatus || t.labStatus !== 'completed')
    );
    
    const container = document.getElementById('pending-analyses-list');
    
    if (pending.length === 0) {
        container.innerHTML = '<p>Aucune analyse en attente de résultats.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Patient</th><th>Analyse</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead><tbody>';
    
    pending.forEach(transaction => {
        html += `
            <tr>
                <td>${transaction.patientName}</td>
                <td>${transaction.service}</td>
                <td>${transaction.date}</td>
                <td><span class="${transaction.labStatus === 'completed' ? 'status-paid' : 'status-unpaid'}">${transaction.labStatus || 'En attente'}</span></td>
                <td><button class="btn btn-sm btn-success" onclick="enterLabResult('${transaction.id}')">Saisir</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}
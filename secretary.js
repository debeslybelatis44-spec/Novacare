// Module Secrétariat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patient-registration-form')) {
        setupSecretary();
    }
});

let currentEditingPatientId = null; // Pour savoir quel patient est en cours d'édition/modification
let consultationModifiedForCurrentPatient = false; // Indique si la consultation a été modifiée via le panneau
let tempModifiedConsultationName = null; // Nom modifié temporaire pour un nouveau patient
let tempModifiedConsultationPrice = null; // Prix modifié temporaire pour un nouveau patient

function setupSecretary() {
    // Initialisation
    updateConsultationTypesSelect();
    updateTodayPatientsList();
    updateExternalServicesSelect();
    updateExternalServicesOptions();
    loadAppointmentsList();
    
    // Enregistrement patient (création ou mise à jour)
    document.getElementById('patient-registration-form').addEventListener('submit', registerPatient);
    
    // Recherche patient pour rendez-vous
    document.getElementById('search-appointment-patient').addEventListener('click', searchAppointmentPatient);
    document.getElementById('schedule-appointment').addEventListener('click', scheduleAppointment);
    
    // Services externes
    document.getElementById('search-external-patient').addEventListener('click', searchExternalPatient);
    document.getElementById('add-external-service').addEventListener('click', addExternalService);
    document.getElementById('add-external-service-registration').addEventListener('click', addExternalServiceRegistration);
    document.getElementById('generate-external-invoice').addEventListener('click', generateExternalInvoice);
    
    // Génération de documents
    document.getElementById('generate-patient-id-card').addEventListener('click', generatePatientIDCard);
    document.getElementById('generate-medical-certificate').addEventListener('click', generateMedicalCertificate);
    
    // Cacher le panneau de modification de nom/prix pour le secrétariat (par défaut)
    document.getElementById('consultation-modification-secretary')?.classList.add('hidden');

    // Afficher le bouton "Modifier ce type" lorsqu'un type de consultation est sélectionné
    document.getElementById('consultation-type-secretary').addEventListener('change', function() {
        const modifyBtn = document.getElementById('modify-consultation-type-btn');
        if (this.value) {
            modifyBtn.classList.remove('hidden');
        } else {
            modifyBtn.classList.add('hidden');
        }
    });

    // Gérer le clic sur "Modifier ce type" (sans vérification de patient existant)
    document.getElementById('modify-consultation-type-btn').addEventListener('click', function() {
        const select = document.getElementById('consultation-type-secretary');
        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption) return;
        
        const typeId = select.value;
        // Chercher d'abord dans les types standards
        let type = state.consultationTypes.find(t => t.id == typeId);
        
        if (type) {
            // Type standard
            document.getElementById('modified-consultation-name').value = type.name;
            document.getElementById('modified-consultation-price').value = type.price;
        } else {
            // Type personnalisé : récupérer les valeurs depuis les attributs data
            const customName = selectedOption.getAttribute('data-name');
            const customPrice = selectedOption.getAttribute('data-price');
            if (customName && customPrice) {
                document.getElementById('modified-consultation-name').value = customName;
                document.getElementById('modified-consultation-price').value = customPrice;
            } else {
                // Fallback : utiliser les valeurs temporaires si disponibles
                document.getElementById('modified-consultation-name').value = tempModifiedConsultationName || '';
                document.getElementById('modified-consultation-price').value = tempModifiedConsultationPrice || '';
            }
        }
        
        document.getElementById('consultation-modification-secretary').classList.remove('hidden');
    });

    // Gérer l'enregistrement de la modification
    document.getElementById('save-modified-consultation').addEventListener('click', function() {
        const newName = document.getElementById('modified-consultation-name').value.trim();
        const newPrice = parseFloat(document.getElementById('modified-consultation-price').value);
        if (!newName || isNaN(newPrice) || newPrice < 0) {
            alert("Veuillez entrer un nom valide et un prix positif.");
            return;
        }
        
        const select = document.getElementById('consultation-type-secretary');
        const selectedOption = select.options[select.selectedIndex];
        
        if (currentEditingPatientId) {
            // Patient existant : mettre à jour ou créer la transaction immédiatement
            let transaction = state.transactions.find(t => 
                t.patientId === currentEditingPatientId && 
                t.type === 'consultation'
            );
            
            if (transaction) {
                transaction.service = `Consultation: ${newName}`;
                transaction.amount = newPrice;
            } else {
                const patient = state.patients.find(p => p.id === currentEditingPatientId);
                if (!patient) {
                    alert("Patient introuvable.");
                    return;
                }
                transaction = {
                    id: 'TR' + Date.now(),
                    patientId: patient.id,
                    patientName: patient.fullName,
                    service: `Consultation: ${newName}`,
                    amount: newPrice,
                    status: 'unpaid',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    createdBy: state.currentUser.username,
                    type: 'consultation',
                    notificationSent: false
                };
                state.transactions.push(transaction);
            }
            consultationModifiedForCurrentPatient = true;
        } else {
            // Nouveau patient : stocker temporairement les modifications
            tempModifiedConsultationName = newName;
            tempModifiedConsultationPrice = newPrice;
            consultationModifiedForCurrentPatient = true;
        }
        
        // Mettre à jour le texte de l'option sélectionnée pour refléter la modification
        if (selectedOption) {
            selectedOption.text = `${newName} - ${newPrice} Gdes (modifié)`;
            // Mettre à jour les attributs data si c'est une option personnalisée
            selectedOption.setAttribute('data-name', newName);
            selectedOption.setAttribute('data-price', newPrice);
        }
        
        document.getElementById('consultation-modification-secretary').classList.add('hidden');
        
        // Rafraîchir la liste des patients du jour
        updateTodayPatientsList();
        
        alert("Consultation modifiée avec succès.");
    });

    // Gérer l'annulation
    document.getElementById('cancel-consultation-modification').addEventListener('click', function() {
        document.getElementById('consultation-modification-secretary').classList.add('hidden');
        if (!currentEditingPatientId) {
            // Annuler la modification temporaire
            tempModifiedConsultationName = null;
            tempModifiedConsultationPrice = null;
            consultationModifiedForCurrentPatient = false;
            // Remettre le texte original de l'option
            const select = document.getElementById('consultation-type-secretary');
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                const typeId = select.value;
                const type = state.consultationTypes.find(t => t.id == typeId);
                if (type) {
                    selectedOption.text = `${type.name} - ${type.price} Gdes`;
                } else if (selectedOption.hasAttribute('data-original-text')) {
                    // Restaurer le texte original pour les options personnalisées
                    selectedOption.text = selectedOption.getAttribute('data-original-text');
                }
            }
        }
    });
    
    // Écouteur pour le changement de type de patient
    document.querySelectorAll('input[name="patient-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const externalOnly = document.getElementById('external-only');
            const consultationTypeContainer = document.getElementById('consultation-type-container');
            const externalServicesSelection = document.getElementById('external-services-selection');
            
            if (this.value === 'externe' || externalOnly.checked) {
                consultationTypeContainer.classList.add('hidden');
                externalServicesSelection.classList.remove('hidden');
            } else {
                consultationTypeContainer.classList.remove('hidden');
                externalServicesSelection.classList.add('hidden');
            }
        });
    });
    
    document.getElementById('external-only').addEventListener('change', function() {
        const consultationTypeContainer = document.getElementById('consultation-type-container');
        const externalServicesSelection = document.getElementById('external-services-selection');
        
        if (this.checked) {
            consultationTypeContainer.classList.add('hidden');
            externalServicesSelection.classList.remove('hidden');
        } else {
            consultationTypeContainer.classList.remove('hidden');
            externalServicesSelection.classList.add('hidden');
        }
    });
}

function updateConsultationTypesSelect() {
    const select = document.getElementById('consultation-type-secretary');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner...</option>';
    state.consultationTypes.forEach(type => {
        if (type.active) {
            // Le secrétariat voit les prix
            select.innerHTML += `<option value="${type.id}" data-price="${type.price}">${type.name} - ${type.price} Gdes</option>`;
        }
    });
}

function updateTodayPatientsList() {
    const container = document.getElementById('today-patients-list');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todayPatients = state.patients.filter(p => p.registrationDate === today);
    
    let html = '';
    todayPatients.forEach(patient => {
        const consultationTransaction = state.transactions.find(t => 
            t.patientId === patient.id && 
            t.type === 'consultation'
        );
        const consultationType = consultationTransaction ? 
            consultationTransaction.service.replace('Consultation: ', '') : 'Aucune';
        
        html += `
            <tr>
                <td>${patient.id}</td>
                <td>${patient.fullName}</td>
                <td>${patient.phone}</td>
                <td>${patient.type}</td>
                <td>${consultationType}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPatientCard('${patient.id}')">Carte</button>
                    <button class="btn btn-sm btn-warning" onclick="editPatientRegistration('${patient.id}')">Modifier</button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html || '<tr><td colspan="6" class="text-center">Aucun patient enregistré aujourd\'hui</td></tr>';
}

function registerPatient(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('patient-fullname').value.trim();
    const birthDate = document.getElementById('patient-birthdate').value;
    const address = document.getElementById('patient-address').value.trim();
    const phone = document.getElementById('patient-phone').value.trim();
    const responsible = document.getElementById('patient-responsible').value.trim();
    const allergies = document.getElementById('patient-allergies').value.trim();
    const notes = document.getElementById('patient-notes').value.trim();
    const patientType = document.querySelector('input[name="patient-type"]:checked').value;
    const externalOnly = document.getElementById('external-only').checked;
    const consultationTypeId = document.getElementById('consultation-type-secretary').value;
    
    if (!fullName || !birthDate || !phone) {
        alert("Veuillez remplir les champs obligatoires (Nom, Date de naissance, Téléphone)!");
        return;
    }
    
    // --- MODIFICATION : Mise à jour du patient existant ou création ---
    let patient;
    if (currentEditingPatientId) {
        // Mode édition : on récupère le patient existant
        patient = state.patients.find(p => p.id === currentEditingPatientId);
        if (!patient) {
            alert("Erreur : patient introuvable lors de la mise à jour.");
            return;
        }
        // Mise à jour des champs
        patient.fullName = fullName;
        patient.birthDate = birthDate;
        patient.address = address;
        patient.phone = phone;
        patient.responsible = responsible;
        patient.type = patientType;
        patient.allergies = allergies;
        patient.notes = notes;
        // On conserve la date d'enregistrement initiale et l'ID
    } else {
        // Mode création : nouveau patient
        let prefix = 'PAT';
        if (patientType === 'urgence') prefix = 'URG';
        if (patientType === 'pediatrie') prefix = 'PED';
        if (patientType === 'externe') prefix = 'EXT';
        
        const patientId = prefix + String(state.patientCounter).padStart(4, '0');
        state.patientCounter++;
        
        patient = {
            id: patientId,
            fullName: fullName,
            birthDate: birthDate,
            address: address,
            phone: phone,
            responsible: responsible,
            type: patientType,
            allergies: allergies,
            notes: notes,
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            hasCreditPrivilege: false,
            creditLimit: 0,
            creditUsed: 0,
            privilegeGrantedDate: null,
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            registeredBy: state.currentUser.username
        };
        state.patients.push(patient);
    }
    // -----------------------------------------------------------------
    
    // Gestion de la transaction de consultation
    if (!externalOnly && consultationTypeId) {
        const consultationType = state.consultationTypes.find(t => t.id == consultationTypeId);
        if (consultationType) {
            // Chercher une transaction de consultation existante pour ce patient
            let transaction = state.transactions.find(t => 
                t.patientId === patient.id && 
                t.type === 'consultation'
            );
            
            if (transaction) {
                // Si la consultation a été modifiée via le panneau, on ne l'écrase pas
                if (!consultationModifiedForCurrentPatient) {
                    // Mise à jour
                    transaction.service = `Consultation: ${consultationType.name}`;
                    transaction.amount = consultationType.price;
                    transaction.date = new Date().toISOString().split('T')[0];
                    transaction.time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                }
            } else {
                // Création d'une nouvelle transaction
                let serviceName, amount;
                if (consultationModifiedForCurrentPatient && tempModifiedConsultationName && tempModifiedConsultationPrice) {
                    serviceName = tempModifiedConsultationName;
                    amount = tempModifiedConsultationPrice;
                } else {
                    serviceName = consultationType.name;
                    amount = consultationType.price;
                }
                transaction = {
                    id: 'TR' + Date.now(),
                    patientId: patient.id,
                    patientName: patient.fullName,
                    service: `Consultation: ${serviceName}`,
                    amount: amount,
                    status: 'unpaid',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    createdBy: state.currentUser.username,
                    type: 'consultation',
                    notificationSent: false
                };
                state.transactions.push(transaction);
            }
            sendNotificationToCashier(transaction);
        }
    } else {
        // Si pas de consultation, on peut éventuellement supprimer une transaction existante ?
        // (comportement à définir selon les besoins)
    }
    
    // Ajouter les services externes sélectionnés
    const selectedServices = document.querySelectorAll('.external-service-option input:checked');
    selectedServices.forEach(checkbox => {
        const serviceId = checkbox.value;
        const service = state.externalServiceTypes.find(s => s.id == serviceId);
        if (service) {
            // Vérifier si ce service n'a pas déjà été ajouté pour ce patient aujourd'hui ?
            // Pour simplifier, on crée une nouvelle transaction à chaque fois.
            const transaction = {
                id: 'EXT' + Date.now(),
                patientId: patient.id,
                patientName: patient.fullName,
                service: `Service externe: ${service.name}`,
                amount: service.price,
                status: 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'external',
                notificationSent: false
            };
            state.transactions.push(transaction);
        }
    });
    
    alert(currentEditingPatientId 
        ? `Patient ${patient.fullName} mis à jour avec succès!`
        : `Patient enregistré avec succès!\nID: ${patient.id}`
    );
    
    // Réinitialiser le formulaire et l'état d'édition
    e.target.reset();
    document.getElementById('external-services-selection').classList.add('hidden');
    document.getElementById('consultation-type-container').classList.remove('hidden');
    document.getElementById('external-only').checked = false;
    document.getElementById('consultation-type-secretary').value = ''; // reset select
    // Cacher le bouton de modification et le panneau
    document.getElementById('modify-consultation-type-btn').classList.add('hidden');
    document.getElementById('consultation-modification-secretary').classList.add('hidden');
    currentEditingPatientId = null; // sortir du mode édition
    // Réinitialiser les variables temporaires
    tempModifiedConsultationName = null;
    tempModifiedConsultationPrice = null;
    consultationModifiedForCurrentPatient = false; // réinitialiser l'indicateur
    
    // Mettre à jour les listes
    updateTodayPatientsList();
    if (typeof updateRoleDashboard === 'function') updateRoleDashboard();
    if (typeof updateAdminStats === 'function') updateAdminStats();
}

function searchAppointmentPatient() {
    const search = document.getElementById('appointment-patient-search').value.toLowerCase();
    const patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    document.getElementById('appointment-patient-name').textContent = `${patient.fullName} (${patient.id})`;
    document.getElementById('appointment-patient-details').classList.remove('hidden');
    
    // Définir la date par défaut à demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('appointment-date').value = tomorrow.toISOString().split('T')[0];
    
    // Définir l'heure par défaut à 09:00
    document.getElementById('appointment-time').value = '09:00';
    
    // Charger les médecins
    loadDoctorsForAppointments();
}

function loadDoctorsForAppointments() {
    const select = document.getElementById('appointment-doctor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un médecin</option>';
    const doctors = state.users.filter(u => u.role === 'doctor' && u.active);
    doctors.forEach(doctor => {
        select.innerHTML += `<option value="${doctor.username}">${doctor.name}</option>`;
    });
}

function scheduleAppointment() {
    const patientId = document.getElementById('appointment-patient-search').value.trim();
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const reason = document.getElementById('appointment-reason').value.trim();
    const doctor = document.getElementById('appointment-doctor').value;
    
    if (!patientId || !date || !time || !reason || !doctor) {
        alert("Veuillez remplir tous les champs!");
        return;
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    const appointment = {
        id: 'APP' + Date.now(),
        patientId: patientId,
        patientName: patient.fullName,
        date: date,
        time: time,
        reason: reason,
        doctor: doctor,
        createdBy: state.currentUser.username,
        status: 'scheduled'
    };
    
    state.appointments.push(appointment);
    
    alert("Rendez-vous programmé avec succès!");
    
    // Réinitialiser
    document.getElementById('appointment-patient-search').value = '';
    document.getElementById('appointment-date').value = '';
    document.getElementById('appointment-time').value = '';
    document.getElementById('appointment-reason').value = '';
    document.getElementById('appointment-doctor').selectedIndex = 0;
    document.getElementById('appointment-patient-details').classList.add('hidden');
    
    // Mettre à jour la liste
    loadAppointmentsList();
}

function loadAppointmentsList() {
    const container = document.getElementById('appointments-list');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointments = state.appointments.filter(a => a.date >= today)
        .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    
    if (upcomingAppointments.length === 0) {
        container.innerHTML = '<p>Aucun rendez-vous programmé.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Patient</th><th>Date</th><th>Heure</th><th>Motif</th><th>Médecin</th><th>Actions</th></tr></thead><tbody>';
    
    upcomingAppointments.forEach(app => {
        html += `
            <tr>
                <td>${app.patientName}<br><small>${app.patientId}</small></td>
                <td>${app.date}</td>
                <td>${app.time}</td>
                <td>${app.reason}</td>
                <td>${app.doctor}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="cancelAppointment('${app.id}')">Annuler</button>
                    <button class="btn btn-sm btn-info" onclick="rescheduleAppointment('${app.id}')">Reprogrammer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function cancelAppointment(appointmentId) {
    if (confirm("Annuler ce rendez-vous?")) {
        const appointment = state.appointments.find(a => a.id === appointmentId);
        if (appointment) {
            appointment.status = 'cancelled';
            loadAppointmentsList();
            alert("Rendez-vous annulé!");
        }
    }
}

function rescheduleAppointment(appointmentId) {
    const appointment = state.appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const newDate = prompt("Nouvelle date (YYYY-MM-DD):", appointment.date);
    const newTime = prompt("Nouvelle heure (HH:MM):", appointment.time);
    
    if (newDate && newTime) {
        appointment.date = newDate;
        appointment.time = newTime;
        loadAppointmentsList();
        alert("Rendez-vous reprogrammé!");
    }
}

function searchExternalPatient() {
    const search = document.getElementById('external-service-search').value.toLowerCase();
    const patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    document.getElementById('external-patient-name').textContent = `${patient.fullName} (${patient.id})`;
    document.getElementById('external-services-container').classList.remove('hidden');
    
    updateExternalServicesForPatient(patient.id);
}

function updateExternalServicesForPatient(patientId) {
    const container = document.getElementById('external-services-list');
    const externalTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'external'
    );
    
    if (externalTransactions.length === 0) {
        container.innerHTML = '<p>Aucun service externe pour ce patient.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Service</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
    
    externalTransactions.forEach(transaction => {
        html += `
            <tr>
                <td>${transaction.service}</td>
                <td>${transaction.amount} Gdes</td>
                <td><span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteExternalService('${transaction.id}')">Supprimer</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function deleteExternalService(transactionId) {
    if (confirm("Supprimer ce service externe?")) {
        state.transactions = state.transactions.filter(t => t.id !== transactionId);
        document.getElementById('search-external-patient').click();
    }
}

function updateExternalServicesSelect() {
    const select = document.getElementById('external-service-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choisir un service</option>';
    state.externalServiceTypes.forEach(service => {
        if (service.active) {
            select.innerHTML += `<option value="${service.id}" data-price="${service.price}">${service.name} - ${service.price} Gdes</option>`;
        }
    });
}

function updateExternalServicesOptions() {
    const container = document.getElementById('external-services-options');
    if (!container) return;
    
    let html = '';
    state.externalServiceTypes.forEach(service => {
        if (service.active) {
            html += `
                <div class="external-service-option">
                    <label>
                        <input type="checkbox" value="${service.id}" data-price="${service.price}">
                        ${service.name} - ${service.price} Gdes
                    </label>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function addExternalService() {
    const patientId = document.getElementById('external-service-search').value.trim();
    const serviceId = document.getElementById('external-service-select').value;
    const customPrice = parseFloat(document.getElementById('new-external-service-price').value);
    
    if (!patientId || !serviceId) {
        alert("Veuillez sélectionner un patient et un service!");
        return;
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    const service = state.externalServiceTypes.find(s => s.id == serviceId);
    
    if (!patient || !service) {
        alert("Patient ou service non trouvé!");
        return;
    }
    
    const price = customPrice > 0 ? customPrice : service.price;
    
    const transaction = {
        id: 'EXT' + Date.now(),
        patientId: patientId,
        patientName: patient.fullName,
        service: `Service externe: ${service.name}`,
        amount: price,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        createdBy: state.currentUser.username,
        type: 'external',
        notificationSent: false
    };
    
    state.transactions.push(transaction);
    
    document.getElementById('external-service-select').selectedIndex = 0;
    document.getElementById('new-external-service-price').value = '';
    
    updateExternalServicesForPatient(patientId);
    alert("Service externe ajouté avec succès!");
}

function addExternalServiceRegistration() {
    const container = document.getElementById('external-services-options');
    if (!container) return;
    
    let html = container.innerHTML;
    state.externalServiceTypes.forEach(service => {
        if (service.active && !html.includes(`value="${service.id}"`)) {
            html += `
                <div class="external-service-option">
                    <label>
                        <input type="checkbox" value="${service.id}" data-price="${service.price}">
                        ${service.name} - ${service.price} Gdes
                    </label>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function generateExternalInvoice() {
    const patientId = document.getElementById('external-service-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    
    if (!patient) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    const externalTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'external' &&
        t.status === 'unpaid'
    );
    
    if (externalTransactions.length === 0) {
        alert("Aucun service externe impayé pour ce patient!");
        return;
    }
    
    let total = 0;
    let servicesHtml = '';
    
    externalTransactions.forEach(transaction => {
        total += transaction.amount;
        servicesHtml += `
            <div class="receipt-item">
                <span>${transaction.service}</span>
                <span>${transaction.amount} Gdes</span>
            </div>
        `;
    });
    
    const invoiceContent = `
        <div class="print-receipt">
            <div class="text-center">
                <h3>${document.getElementById('hospital-name-header').textContent}</h3>
                <p>${document.getElementById('hospital-address-header').textContent}</p>
                <p>Facture Services Externes</p>
            </div>
            <hr>
            <div>
                <p><strong>Patient:</strong> ${patient.fullName}</p>
                <p><strong>ID Patient:</strong> ${patient.id}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                <p><strong>Heure:</strong> ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            <hr>
            <h4>Services externes</h4>
            ${servicesHtml}
            <hr>
            <div class="receipt-item">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${total}</strong> Gdes</span>
            </div>
            <hr>
            <div class="text-center">
                <p>À régler à la caisse</p>
                <p><small>Facture #${'EXT-INV' + Date.now().toString().slice(-8)}</small></p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Facture Services Externes</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-receipt { width: 80mm; margin: 0 auto; }
                .text-center { text-align: center; }
                .receipt-item { display: flex; justify-content: space-between; margin: 5px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${invoiceContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function generatePatientIDCard() {
    const patientId = document.getElementById('patient-fullname').value.trim() ? 
        document.getElementById('appointment-patient-search').value.trim() : 
        null;
    
    if (!patientId) {
        alert("Veuillez d'abord enregistrer ou rechercher un patient!");
        return;
    }
    
    viewPatientCard(patientId);
}

function generateMedicalCertificate() {
    const patientId = document.getElementById('patient-fullname').value.trim() ? 
        document.getElementById('appointment-patient-search').value.trim() : 
        null;
    
    if (!patientId) {
        alert("Veuillez d'abord enregistrer ou rechercher un patient!");
        return;
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    const consultation = state.consultations.find(c => c.patientId === patientId);
    
    document.getElementById('certificate-hospital-name').textContent = document.getElementById('hospital-name')?.value || 'Hôpital Saint-Luc';
    document.getElementById('certificate-hospital-address').textContent = document.getElementById('hospital-address')?.value || 'Port-au-Prince, Haïti';
    document.getElementById('certificate-hospital-phone').textContent = 'Tél: ' + (document.getElementById('hospital-phone')?.value || '(509) 1234-5678');
    document.getElementById('certificate-hospital-name-text').textContent = document.getElementById('hospital-name')?.value || 'Hôpital Saint-Luc';
    document.getElementById('certificate-patient-name').textContent = patient.fullName;
    document.getElementById('certificate-patient-dob').textContent = patient.birthDate;
    document.getElementById('certificate-patient-address').textContent = patient.address;
    document.getElementById('certificate-consultation-date').textContent = consultation ? consultation.date : new Date().toLocaleDateString('fr-FR');
    document.getElementById('certificate-diagnosis').innerHTML = consultation ? consultation.diagnosis : 'Examen médical standard.';
    document.getElementById('certificate-date').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('certificate-doctor').textContent = consultation ? consultation.doctor : 'Médecin';
    document.getElementById('certificate-number').textContent = 'CM-' + Date.now().toString().slice(-6);
    
    const container = document.getElementById('medical-certificate-container');
    if (container) {
        container.classList.remove('hidden');
        
        setTimeout(() => {
            window.print();
            container.classList.add('hidden');
        }, 500);
    }
}

function editPatientRegistration(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    // Stocker l'ID du patient en cours d'édition
    currentEditingPatientId = patientId;
    consultationModifiedForCurrentPatient = false; // Réinitialiser pour ce patient
    tempModifiedConsultationName = null;
    tempModifiedConsultationPrice = null;
    
    // Remplir le formulaire avec les données du patient
    document.getElementById('patient-fullname').value = patient.fullName;
    document.getElementById('patient-birthdate').value = patient.birthDate;
    document.getElementById('patient-address').value = patient.address;
    document.getElementById('patient-phone').value = patient.phone;
    document.getElementById('patient-responsible').value = patient.responsible;
    document.getElementById('patient-allergies').value = patient.allergies;
    document.getElementById('patient-notes').value = patient.notes;
    
    // Sélectionner le type de patient
    const typeRadio = document.querySelector(`input[name="patient-type"][value="${patient.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    
    // Charger la consultation existante du patient
    const consultationTransaction = state.transactions.find(t => 
        t.patientId === patientId && 
        t.type === 'consultation'
    );
    
    const select = document.getElementById('consultation-type-secretary');
    
    if (consultationTransaction) {
        const serviceName = consultationTransaction.service.replace('Consultation: ', '');
        const amount = consultationTransaction.amount;
        
        // Chercher si ce nom correspond à un type standard
        const consultationType = state.consultationTypes.find(t => t.name === serviceName);
        
        if (consultationType) {
            // Type standard
            select.value = consultationType.id;
        } else {
            // Type personnalisé : créer une option temporaire
            const customOption = document.createElement('option');
            const uniqueId = 'custom_' + Date.now();
            customOption.value = uniqueId;
            customOption.text = `${serviceName} - ${amount} Gdes (personnalisé)`;
            customOption.setAttribute('data-name', serviceName);
            customOption.setAttribute('data-price', amount);
            customOption.setAttribute('data-original-text', customOption.text); // pour restauration
            select.appendChild(customOption);
            select.value = uniqueId;
            
            // Marquer que la consultation est personnalisée pour ne pas l'écraser lors de l'enregistrement
            consultationModifiedForCurrentPatient = true;
            tempModifiedConsultationName = serviceName;
            tempModifiedConsultationPrice = amount;
        }
        
        // Déclencher l'événement change pour afficher le bouton de modification
        const changeEvent = new Event('change', { bubbles: true });
        select.dispatchEvent(changeEvent);
    }
    
    alert(`Modification du patient ${patient.fullName}. Modifiez les informations et soumettez le formulaire pour enregistrer.`);
}
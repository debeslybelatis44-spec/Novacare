// Module Secrétariat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patient-registration-form')) {
        setupSecretary();
    }
});

function setupSecretary() {
    // Mettre à jour les listes déroulantes
    updateConsultationTypesSelect();
    updateExternalServicesSelect();
    updateExternalServicesOptions();
    loadDoctorsForAppointments();
    
    // Enregistrement patient
    document.getElementById('patient-registration-form').addEventListener('submit', registerPatient);
    
    // Gestion des consultations modifiées
    document.getElementById('modify-consultation-type-btn').addEventListener('click', showConsultationModification);
    document.getElementById('save-modified-consultation').addEventListener('click', saveModifiedConsultation);
    document.getElementById('cancel-consultation-modification').addEventListener('click', hideConsultationModification);
    
    // Services externes
    document.getElementById('external-only').addEventListener('change', toggleExternalServicesSelection);
    document.getElementById('add-external-service-registration').addEventListener('click', addExternalServiceRegistration);
    
    // Rendez-vous
    document.getElementById('search-appointment-patient').addEventListener('click', searchAppointmentPatient);
    document.getElementById('schedule-appointment').addEventListener('click', scheduleAppointment);
    
    // Services externes - facturation
    document.getElementById('search-external-patient').addEventListener('click', searchExternalPatient);
    document.getElementById('add-external-service').addEventListener('click', addExternalServiceToPatient);
    document.getElementById('generate-external-invoice').addEventListener('click', generateExternalInvoice);
    
    // Impression
    document.getElementById('generate-patient-id-card').addEventListener('click', generatePatientIdCard);
    document.getElementById('generate-medical-certificate').addEventListener('click', generateMedicalCertificate);
    
    // Mettre à jour la liste des patients d'aujourd'hui
    updateTodayPatientsList();
}

function updateConsultationTypesSelect() {
    const select = document.getElementById('consultation-type-secretary');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner...</option>';
    state.consultationTypes.forEach(type => {
        if (type.active) {
            select.innerHTML += `<option value="${type.id}" data-price="${type.price}">${type.name} - ${type.price} Gdes</option>`;
        }
    });
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
                        <input type="checkbox" class="external-service-checkbox" data-id="${service.id}" data-name="${service.name}" data-price="${service.price}">
                        ${service.name} - ${service.price} Gdes
                    </label>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function loadDoctorsForAppointments() {
    const select = document.getElementById('appointment-doctor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un médecin</option>';
    const doctors = state.users.filter(u => u.role === 'doctor' && u.active);
    doctors.forEach(doctor => {
        select.innerHTML += `<option value="${doctor.username}">Dr. ${doctor.name}</option>`;
    });
}

function registerPatient(e) {
    e.preventDefault();
    
    // Récupérer les valeurs du formulaire
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
    
    // Validation
    if (!fullName || !birthDate || !phone) {
        alert("Veuillez remplir tous les champs obligatoires (*)!");
        return;
    }
    
    if (!externalOnly && !consultationTypeId) {
        alert("Veuillez sélectionner un type de consultation!");
        return;
    }
    
    // Générer un ID patient
    let prefix = 'PAT';
    switch(patientType) {
        case 'urgence': prefix = 'URG'; break;
        case 'pediatrie': prefix = 'PED'; break;
        case 'externe': prefix = 'EXT'; break;
    }
    
    const patientId = prefix + String(state.patientCounter).padStart(4, '0');
    state.patientCounter++;
    
    // Créer le patient
    const newPatient = {
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
        privilegeGrantedDate: null,
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        registeredBy: state.currentUser.username
    };
    
    state.patients.push(newPatient);
    
    // Créer la transaction de consultation si nécessaire
    if (!externalOnly) {
        const consultationType = state.consultationTypes.find(t => t.id == consultationTypeId);
        if (consultationType) {
            let consultationPrice = consultationType.price;
            let consultationName = consultationType.name;
            
            // Vérifier si le type a été modifié
            if (state.currentModifiedConsultation && state.currentModifiedConsultation.originalId == consultationTypeId) {
                consultationPrice = state.currentModifiedConsultation.modifiedPrice;
                consultationName = state.currentModifiedConsultation.modifiedName;
            }
            
            const transaction = {
                id: 'CONS' + Date.now(),
                patientId: patientId,
                patientName: fullName,
                service: `Consultation: ${consultationName}`,
                amount: consultationPrice,
                status: 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'consultation',
                consultationTypeId: consultationTypeId,
                modified: state.currentModifiedConsultation ? true : false,
                modifiedName: state.currentModifiedConsultation ? state.currentModifiedConsultation.modifiedName : null,
                modifiedPrice: state.currentModifiedConsultation ? state.currentModifiedConsultation.modifiedPrice : null
            };
            
            state.transactions.push(transaction);
            
            // Envoyer notification au caissier
            sendNotificationToCashier(transaction);
        }
    }
    
    // Ajouter les services externes sélectionnés
    if (externalOnly || document.getElementById('external-services-selection').classList.contains('hidden') === false) {
        const externalCheckboxes = document.querySelectorAll('.external-service-checkbox:checked');
        externalCheckboxes.forEach(checkbox => {
            const serviceId = checkbox.dataset.id;
            const serviceName = checkbox.dataset.name;
            const servicePrice = parseFloat(checkbox.dataset.price);
            
            const externalTransaction = {
                id: 'EXT' + Date.now(),
                patientId: patientId,
                patientName: fullName,
                service: `Service externe: ${serviceName}`,
                amount: servicePrice,
                status: 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'external',
                notificationSent: false
            };
            
            state.transactions.push(externalTransaction);
            
            // Envoyer notification au caissier
            sendNotificationToCashier(externalTransaction);
        });
    }
    
    alert(`Patient enregistré avec succès!\nID Patient: ${patientId}`);
    
    // Réinitialiser le formulaire
    e.target.reset();
    state.currentModifiedConsultation = null;
    document.getElementById('external-services-selection').classList.add('hidden');
    document.getElementById('consultation-modification-secretary').classList.add('hidden');
    document.getElementById('modify-consultation-type-btn').classList.add('hidden');
    
    // Mettre à jour la liste des patients
    updateTodayPatientsList();
}

function showConsultationModification() {
    const consultationTypeId = document.getElementById('consultation-type-secretary').value;
    if (!consultationTypeId) {
        alert("Veuillez d'abord sélectionner un type de consultation!");
        return;
    }
    
    const consultationType = state.consultationTypes.find(t => t.id == consultationTypeId);
    if (!consultationType) return;
    
    document.getElementById('modified-consultation-name').value = consultationType.name;
    document.getElementById('modified-consultation-price').value = consultationType.price;
    
    document.getElementById('consultation-modification-secretary').classList.remove('hidden');
    
    // Stocker la consultation originale pour référence
    state.currentModifiedConsultation = {
        originalId: consultationTypeId,
        originalName: consultationType.name,
        originalPrice: consultationType.price,
        modifiedName: consultationType.name,
        modifiedPrice: consultationType.price
    };
}

function saveModifiedConsultation() {
    const modifiedName = document.getElementById('modified-consultation-name').value.trim();
    const modifiedPrice = parseFloat(document.getElementById('modified-consultation-price').value);
    
    if (!modifiedName || isNaN(modifiedPrice) || modifiedPrice < 0) {
        alert("Veuillez entrer un nom et un prix valides!");
        return;
    }
    
    if (state.currentModifiedConsultation) {
        state.currentModifiedConsultation.modifiedName = modifiedName;
        state.currentModifiedConsultation.modifiedPrice = modifiedPrice;
    }
    
    alert("Modification enregistrée! Cette modification s'appliquera uniquement au patient en cours.");
    hideConsultationModification();
}

function hideConsultationModification() {
    document.getElementById('consultation-modification-secretary').classList.add('hidden');
}

function toggleExternalServicesSelection() {
    const externalOnly = document.getElementById('external-only').checked;
    const externalServicesDiv = document.getElementById('external-services-selection');
    const consultationContainer = document.getElementById('consultation-type-container');
    
    if (externalOnly) {
        externalServicesDiv.classList.remove('hidden');
        consultationContainer.classList.add('hidden');
    } else {
        externalServicesDiv.classList.add('hidden');
        consultationContainer.classList.remove('hidden');
    }
}

function addExternalServiceRegistration() {
    const serviceName = prompt("Nom du service externe:");
    const servicePrice = parseFloat(prompt("Prix du service (Gdes):"));
    
    if (!serviceName || isNaN(servicePrice) || servicePrice < 0) {
        alert("Veuillez entrer des informations valides!");
        return;
    }
    
    const newService = {
        id: 'CUST' + Date.now(),
        name: serviceName,
        price: servicePrice
    };
    
    // Ajouter aux options
    const container = document.getElementById('external-services-options');
    container.innerHTML += `
        <div class="external-service-option">
            <label>
                <input type="checkbox" class="external-service-checkbox" data-id="${newService.id}" data-name="${newService.name}" data-price="${newService.price}" checked>
                ${newService.name} - ${newService.price} Gdes
            </label>
        </div>
    `;
    
    alert("Service externe ajouté!");
}

function searchAppointmentPatient() {
    const search = document.getElementById('appointment-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === search);
    
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    document.getElementById('appointment-patient-name').textContent = `${patient.fullName} (${patient.id})`;
    document.getElementById('appointment-patient-details').classList.remove('hidden');
}

function scheduleAppointment() {
    const patientId = document.getElementById('appointment-patient-search').value.trim();
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const reason = document.getElementById('appointment-reason').value.trim();
    const doctor = document.getElementById('appointment-doctor').value;
    
    if (!patientId || !date || !time || !doctor) {
        alert("Veuillez remplir tous les champs obligatoires!");
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
    
    // Envoyer notification au médecin
    const doctorUser = state.users.find(u => u.username === doctor);
    if (doctorUser) {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: doctor,
            recipientRole: 'doctor',
            subject: 'Nouveau rendez-vous',
            content: `Nouveau rendez-vous programmé pour le ${date} à ${time} avec ${patient.fullName}. Motif: ${reason}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'appointment'
        };
        state.messages.push(message);
        updateMessageBadge();
    }
    
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
    
    upcomingAppointments.forEach(appointment => {
        html += `
            <tr>
                <td>${appointment.patientName} (${appointment.patientId})</td>
                <td>${appointment.date}</td>
                <td>${appointment.time}</td>
                <td>${appointment.reason}</td>
                <td>${appointment.doctor}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="cancelAppointment('${appointment.id}')">Annuler</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function cancelAppointment(appointmentId) {
    if (confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous?")) {
        state.appointments = state.appointments.filter(a => a.id !== appointmentId);
        loadAppointmentsList();
        alert("Rendez-vous annulé!");
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
    
    // Afficher les services externes existants
    displayExternalServicesForPatient(patient.id);
}

function displayExternalServicesForPatient(patientId) {
    const container = document.getElementById('external-services-list');
    const externalTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'external'
    );
    
    if (externalTransactions.length === 0) {
        container.innerHTML = '<p>Aucun service externe pour ce patient.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Service</th><th>Prix</th><th>Statut</th><th>Actions</th></tr></thead><tbody>';
    let total = 0;
    
    externalTransactions.forEach(transaction => {
        html += `
            <tr>
                <td>${transaction.service}</td>
                <td>${transaction.amount} Gdes</td>
                <td><span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="removeExternalService('${transaction.id}')">Supprimer</button>
                </td>
            </tr>
        `;
        total += transaction.amount;
    });
    
    html += `</tbody></table><div class="mt-2"><strong>Total: ${total} Gdes</strong></div>`;
    container.innerHTML = html;
}

function removeExternalService(transactionId) {
    if (confirm("Supprimer ce service externe?")) {
        state.transactions = state.transactions.filter(t => t.id !== transactionId);
        const patientId = document.getElementById('external-service-search').value.trim();
        displayExternalServicesForPatient(patientId);
    }
}

function addExternalServiceToPatient() {
    const patientId = document.getElementById('external-service-search').value.trim();
    const serviceSelect = document.getElementById('external-service-select');
    const priceInput = document.getElementById('new-external-service-price');
    
    if (!patientId) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    const serviceId = serviceSelect.value;
    let serviceName = '';
    let servicePrice = 0;
    
    if (serviceId) {
        const service = state.externalServiceTypes.find(s => s.id == serviceId);
        if (service) {
            serviceName = service.name;
            servicePrice = parseFloat(priceInput.value) || service.price;
        }
    } else {
        serviceName = prompt("Nom du service personnalisé:");
        servicePrice = parseFloat(prompt("Prix du service (Gdes):"));
        
        if (!serviceName || isNaN(servicePrice) || servicePrice < 0) {
            alert("Veuillez entrer des informations valides!");
            return;
        }
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    const externalTransaction = {
        id: 'EXT' + Date.now(),
        patientId: patientId,
        patientName: patient.fullName,
        service: `Service externe: ${serviceName}`,
        amount: servicePrice,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        createdBy: state.currentUser.username,
        type: 'external',
        notificationSent: false
    };
    
    state.transactions.push(externalTransaction);
    
    // Envoyer notification au caissier
    sendNotificationToCashier(externalTransaction);
    
    alert("Service externe ajouté!");
    
    // Réinitialiser
    serviceSelect.selectedIndex = 0;
    priceInput.value = '';
    
    // Mettre à jour l'affichage
    displayExternalServicesForPatient(patientId);
}

function generateExternalInvoice() {
    const patientId = document.getElementById('external-service-search').value.trim();
    if (!patientId) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    const patient = state.patients.find(p => p.id === patientId);
    const externalTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'external' &&
        t.status === 'unpaid'
    );
    
    if (externalTransactions.length === 0) {
        alert("Aucun service externe impayé pour ce patient!");
        return;
    }
    
    const total = externalTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    let servicesHtml = '';
    externalTransactions.forEach(transaction => {
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
            <h4>Services externes à payer</h4>
            ${servicesHtml}
            <hr>
            <div class="receipt-item">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${total}</strong> Gdes</span>
            </div>
            <hr>
            <div class="text-center">
                <p>À payer à la caisse</p>
                <p><small>Facture #${'EXT' + Date.now().toString().slice(-8)}</small></p>
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

function updateTodayPatientsList() {
    const container = document.getElementById('today-patients-list');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todayPatients = state.patients.filter(p => p.registrationDate === today);
    
    if (todayPatients.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center">Aucun patient enregistré aujourd\'hui</td></tr>';
        return;
    }
    
    let html = '';
    todayPatients.forEach(patient => {
        const consultationTransaction = state.transactions.find(t => 
            t.patientId === patient.id && 
            t.type === 'consultation'
        );
        
        const consultationType = consultationTransaction ? 
            consultationTransaction.service.replace('Consultation: ', '') : 
            'Service externe';
        
        html += `
            <tr>
                <td>${patient.id}</td>
                <td>${patient.fullName}</td>
                <td>${patient.phone}</td>
                <td>${patient.type.charAt(0).toUpperCase() + patient.type.slice(1)}</td>
                <td>${consultationType}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPatientCard('${patient.id}')">Carte</button>
                    <button class="btn btn-sm btn-warning" onclick="viewPatientDetails('${patient.id}')">Détails</button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function generatePatientIdCard() {
    const fullName = document.getElementById('patient-fullname').value;
    const birthDate = document.getElementById('patient-birthdate').value;
    const phone = document.getElementById('patient-phone').value;
    
    if (!fullName || !birthDate || !phone) {
        alert("Veuillez d'abord remplir les informations du patient!");
        return;
    }
    
    // Générer un ID temporaire pour l'affichage
    const tempId = 'TEMP' + Date.now().toString().slice(-6);
    
    viewPatientCard(tempId);
}

function generateMedicalCertificate() {
    const patientId = prompt("ID du patient pour le certificat médical:");
    if (!patientId) return;
    
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    const consultation = state.consultations.find(c => c.patientId === patientId);
    if (!consultation) {
        alert("Aucune consultation trouvée pour ce patient!");
        return;
    }
    
    // Remplir le certificat
    document.getElementById('certificate-number').textContent = 'CM-' + Date.now().toString().slice(-6);
    document.getElementById('certificate-patient-name').textContent = patient.fullName;
    document.getElementById('certificate-patient-dob').textContent = patient.birthDate;
    document.getElementById('certificate-patient-address').textContent = patient.address;
    document.getElementById('certificate-consultation-date').textContent = consultation.date;
    document.getElementById('certificate-diagnosis').textContent = consultation.diagnosis;
    
    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('certificate-date').textContent = today.toLocaleDateString('fr-FR', options);
    
    const doctor = state.users.find(u => u.username === consultation.doctor);
    document.getElementById('certificate-doctor').textContent = doctor ? doctor.name : 'Médecin';
    
    // Afficher le certificat
    const container = document.getElementById('medical-certificate-container');
    if (container) {
        container.classList.remove('hidden');
        
        setTimeout(() => {
            window.print();
            container.classList.add('hidden');
        }, 500);
    }
}

function viewPatientDetails(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    let details = `Nom: ${patient.fullName}\n`;
    details += `ID: ${patient.id}\n`;
    details += `Date naissance: ${patient.birthDate}\n`;
    details += `Téléphone: ${patient.phone}\n`;
    details += `Adresse: ${patient.address}\n`;
    details += `Type: ${patient.type}\n`;
    if (patient.responsible) details += `Responsable: ${patient.responsible}\n`;
    if (patient.allergies) details += `Allergies: ${patient.allergies}\n`;
    if (patient.notes) details += `Notes: ${patient.notes}\n`;
    
    alert(details);
}
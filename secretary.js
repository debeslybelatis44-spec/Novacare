// Module Secrétariat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patient-registration-form')) {
        setupSecretary();
    }
});

function setupSecretary() {
    setupPatientTypeChange();
    setupMedicalCertificate();
    
    // Charger les types de consultation pour le secrétariat
    updateConsultationTypesSelect();
    updateExternalServicesOptions();
    updateExternalServicesSelect();
    
    document.getElementById('patient-registration-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('patient-fullname').value;
        const birthDate = document.getElementById('patient-birthdate').value;
        const address = document.getElementById('patient-address').value;
        const phone = document.getElementById('patient-phone').value;
        const responsible = document.getElementById('patient-responsible').value;
        const patientType = document.querySelector('input[name="patient-type"]:checked').value;
        const consultationTypeId = parseInt(document.getElementById('consultation-type-secretary').value);
        const externalOnly = document.getElementById('external-only').checked;
        
        if (patientType !== 'externe' && !externalOnly && !consultationTypeId) {
            alert("Veuillez sélectionner un type de consultation pour les patients normaux!");
            return;
        }
        
        const prefix = patientType === 'urgence' ? 'URG' : (patientType === 'pediatrie' ? 'PED' : (patientType === 'externe' ? 'EXT' : 'PAT'));
        const patientId = prefix + state.patientCounter.toString().padStart(4, '0');
        state.patientCounter++;
        
        const newPatient = {
            id: patientId,
            fullName: fullName,
            birthDate: birthDate,
            address: address,
            phone: phone,
            responsible: responsible,
            type: patientType,
            vip: false,
            sponsored: false,
            discountPercentage: 0,
            registrationDate: new Date().toISOString().split('T')[0],
            registrationTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            registeredBy: state.currentUser.username
        };
        
        state.patients.push(newPatient);
        
        if (externalOnly || patientType === 'externe') {
            const externalCheckboxes = document.querySelectorAll('.external-service-option:checked');
            let hasServices = false;
            
            externalCheckboxes.forEach(cb => {
                const serviceId = parseInt(cb.value);
                const service = state.externalServiceTypes.find(s => s.id === serviceId);
                
                if (service) {
                    hasServices = true;
                    const externalTransaction = {
                        id: 'EXT' + state.transactionCounter.toString().padStart(4, '0'),
                        patientId: patientId,
                        patientName: fullName,
                        service: `Service externe: ${service.name}`,
                        amount: service.price,
                        status: 'unpaid',
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        createdBy: state.currentUser.username,
                        type: 'external',
                        notificationSent: false
                    };
                    
                    state.transactionCounter++;
                    state.transactions.push(externalTransaction);
                    sendNotificationToCashier(externalTransaction);
                }
            });
            
            const customServices = document.querySelectorAll('.external-service-custom');
            customServices.forEach((serviceInput, index) => {
                const serviceName = serviceInput.value;
                const priceInput = document.querySelectorAll('.external-service-price')[index];
                const servicePrice = parseFloat(priceInput.value);
                
                if (serviceName && !isNaN(servicePrice)) {
                    hasServices = true;
                    const externalTransaction = {
                        id: 'EXT' + state.transactionCounter.toString().padStart(4, '0'),
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
                    
                    state.transactionCounter++;
                    state.transactions.push(externalTransaction);
                    sendNotificationToCashier(externalTransaction);
                }
            });
            
            if (!hasServices) {
                alert("Veuillez sélectionner au moins un service externe!");
                return;
            }
        } else if (consultationTypeId) {
            let consultationType = state.consultationTypes.find(ct => ct.id === consultationTypeId);
            
            if (state.currentModifiedConsultation) {
                consultationType = { ...consultationType, ...state.currentModifiedConsultation };
            }
            
            const consultationTransaction = {
                id: 'TR' + state.transactionCounter.toString().padStart(4, '0'),
                patientId: patientId,
                patientName: fullName,
                service: `Consultation: ${consultationType.name}`,
                amount: consultationType.price,
                status: 'unpaid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                createdBy: state.currentUser.username,
                type: 'consultation',
                notificationSent: false,
                originalTypeId: consultationTypeId,
                modifiedName: state.currentModifiedConsultation ? state.currentModifiedConsultation.name : null,
                modifiedPrice: state.currentModifiedConsultation ? state.currentModifiedConsultation.price : null
            };
            
            state.transactionCounter++;
            state.transactions.push(consultationTransaction);
            
            sendNotificationToCashier(consultationTransaction);
        }
        
        alert(`Patient enregistré avec succès! ID: ${patientId}`);
        
        e.target.reset();
        document.getElementById('patient-normal').checked = true;
        document.getElementById('external-only').checked = false;
        document.getElementById('consultation-type-container').classList.remove('hidden');
        document.getElementById('external-services-selection').classList.add('hidden');
        state.currentModifiedConsultation = null;
        document.getElementById('consultation-modification-secretary').classList.add('hidden');
        document.getElementById('modify-consultation-type-btn').classList.add('hidden');
        
        updateTodayPatientsList();
        
        document.getElementById('generate-patient-id-card').dataset.patientId = patientId;
        document.getElementById('generate-medical-certificate').dataset.patientId = patientId;
    });
    
    document.getElementById('modify-consultation-type-btn').addEventListener('click', () => {
        const consultationTypeId = parseInt(document.getElementById('consultation-type-secretary').value);
        if (!consultationTypeId) {
            alert("Veuillez d'abord sélectionner un type de consultation!");
            return;
        }
        
        const consultationType = state.consultationTypes.find(ct => ct.id === consultationTypeId);
        document.getElementById('modified-consultation-name').value = consultationType.name;
        document.getElementById('modified-consultation-price').value = consultationType.price;
        document.getElementById('consultation-modification-secretary').classList.remove('hidden');
    });
    
    document.getElementById('save-modified-consultation').addEventListener('click', () => {
        const consultationTypeId = parseInt(document.getElementById('consultation-type-secretary').value);
        const modifiedName = document.getElementById('modified-consultation-name').value;
        const modifiedPrice = parseFloat(document.getElementById('modified-consultation-price').value);
        
        if (!modifiedName || isNaN(modifiedPrice)) {
            alert("Veuillez remplir tous les champs correctement!");
            return;
        }
        
        state.currentModifiedConsultation = {
            name: modifiedName,
            price: modifiedPrice
        };
        
        document.getElementById('consultation-modification-secretary').classList.add('hidden');
        alert("Modification enregistrée! Cette modification s'appliquera uniquement au patient en cours.");
    });
    
    document.getElementById('cancel-consultation-modification').addEventListener('click', () => {
        state.currentModifiedConsultation = null;
        document.getElementById('consultation-modification-secretary').classList.add('hidden');
    });
    
    document.getElementById('consultation-type-secretary').addEventListener('change', function() {
        if (this.value) {
            document.getElementById('modify-consultation-type-btn').classList.remove('hidden');
        } else {
            document.getElementById('modify-consultation-type-btn').classList.add('hidden');
        }
    });
    
    document.getElementById('add-external-service-registration').addEventListener('click', function() {
        const container = document.getElementById('external-services-options');
        const newService = document.createElement('div');
        newService.className = 'service-item';
        newService.innerHTML = `
            <div>
                <input type="text" class="form-control external-service-custom" placeholder="Nom du service" style="width:200px; display:inline-block;">
                <input type="number" class="form-control external-service-price" placeholder="Prix (Gdes)" style="width:150px; display:inline-block;">
                <button type="button" class="btn btn-danger btn-sm remove-external-service">X</button>
            </div>
        `;
        container.appendChild(newService);
        
        newService.querySelector('.remove-external-service').addEventListener('click', function() {
            this.closest('.service-item').remove();
        });
    });
    
    document.getElementById('search-external-patient').addEventListener('click', () => {
        const search = document.getElementById('external-service-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        document.getElementById('external-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
        document.getElementById('external-services-container').classList.remove('hidden');
        
        const externalServices = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.type === 'external'
        );
        
        let html = '';
        if (externalServices.length === 0) {
            html = '<p>Aucun service externe enregistré.</p>';
        } else {
            externalServices.forEach(service => {
                html += `
                    <div class="service-item">
                        <div>${service.service}</div>
                        <div>${service.amount} Gdes</div>
                        <div><span class="${service.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${service.status === 'paid' ? 'Payé' : 'Non payé'}</span></div>
                    </div>
                `;
            });
        }
        document.getElementById('external-services-list').innerHTML = html;
    });
    
    document.getElementById('add-external-service').addEventListener('click', () => {
        const patientId = document.getElementById('external-patient-name').textContent.match(/\((.*?)\)/)[1];
        const serviceSelect = document.getElementById('external-service-select');
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const serviceId = selectedOption.value;
        const price = parseFloat(selectedOption.dataset.price) || parseFloat(document.getElementById('new-external-service-price').value);
        
        if (!serviceId || isNaN(price)) {
            alert("Veuillez sélectionner un service et entrer un prix valide!");
            return;
        }
        
        const serviceType = state.externalServiceTypes.find(s => s.id == serviceId);
        const serviceName = serviceType ? serviceType.name : 'Service externe';
        
        const externalTransaction = {
            id: 'EXT' + state.transactionCounter.toString().padStart(4, '0'),
            patientId: patientId,
            patientName: state.patients.find(p => p.id === patientId).fullName,
            service: `Service externe: ${serviceName}`,
            amount: price,
            status: 'unpaid',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            createdBy: state.currentUser.username,
            type: 'external',
            notificationSent: false
        };
        
        state.transactionCounter++;
        state.transactions.push(externalTransaction);
        sendNotificationToCashier(externalTransaction);
        
        document.getElementById('search-external-patient').click();
        
        serviceSelect.selectedIndex = 0;
        document.getElementById('new-external-service-price').value = '';
    });
    
    // ==================== GESTION COMPLÈTE DES RENDEZ-VOUS ====================
    setupAppointmentsManagement();
}

function setupPatientTypeChange() {
    const patientTypeRadios = document.querySelectorAll('input[name="patient-type"]');
    patientTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const isExternal = this.value === 'externe';
            const consultationContainer = document.getElementById('consultation-type-container');
            const externalServicesSelection = document.getElementById('external-services-selection');
            const consultationSelect = document.getElementById('consultation-type-secretary');
            
            if (isExternal) {
                consultationContainer.classList.add('hidden');
                externalServicesSelection.classList.remove('hidden');
                consultationSelect.required = false;
            } else {
                consultationContainer.classList.remove('hidden');
                externalServicesSelection.classList.add('hidden');
                consultationSelect.required = true;
            }
        });
    });
    
    document.getElementById('external-only').addEventListener('change', function() {
        const consultationContainer = document.getElementById('consultation-type-container');
        const externalServicesSelection = document.getElementById('external-services-selection');
        const consultationSelect = document.getElementById('consultation-type-secretary');
        
        if (this.checked) {
            consultationContainer.classList.add('hidden');
            externalServicesSelection.classList.remove('hidden');
            consultationSelect.required = false;
        } else {
            consultationContainer.classList.remove('hidden');
            externalServicesSelection.classList.add('hidden');
            consultationSelect.required = true;
        }
    });
}

function updateExternalServicesOptions() {
    const container = document.getElementById('external-services-options');
    let html = '<div class="service-external-list">';
    state.externalServiceTypes.forEach(service => {
        if (service.active) {
            html += `
                <div class="service-item">
                    <div>
                        <input type="checkbox" class="external-service-option" value="${service.id}" data-price="${service.price}">
                        ${service.name} - ${service.price} Gdes
                    </div>
                </div>
            `;
        }
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateExternalServicesSelect() {
    const select = document.getElementById('external-service-select');
    select.innerHTML = '<option value="">Choisir un service</option>';
    state.externalServiceTypes.forEach(service => {
        if (service.active) {
            select.innerHTML += `<option value="${service.id}" data-price="${service.price}">${service.name} - ${service.price} Gdes</option>`;
        }
    });
}

function updateConsultationTypesSelect() {
    const select = document.getElementById('consultation-type-secretary');
    select.innerHTML = '<option value="">Sélectionner...</option>';
    
    state.consultationTypes.forEach(type => {
        if (type.active) {
            select.innerHTML += `<option value="${type.id}">${type.name} - ${type.price} Gdes</option>`;
        }
    });
}

function updateTodayPatientsList() {
    const today = new Date().toISOString().split('T')[0];
    const todayPatients = state.patients.filter(p => p.registrationDate === today);
    
    const container = document.getElementById('today-patients-list');
    let html = '';
    
    todayPatients.forEach(patient => {
        const consultation = state.transactions.find(t => 
            t.patientId === patient.id && 
            t.type === 'consultation'
        );
        
        let typeBadge = '';
        if (patient.type === 'urgence') {
            typeBadge = '<span class="emergency-patient-tag">Urgence</span>';
        } else if (patient.type === 'pediatrie') {
            typeBadge = '<span class="pediatric-tag">Enfant</span>';
        } else if (patient.type === 'externe') {
            typeBadge = '<span class="external-patient-tag">Externe</span>';
        } else {
            typeBadge = '<span>Normal</span>';
        }
        
        if (patient.vip) {
            typeBadge += ' <span class="vip-tag">VIP</span>';
        } else if (patient.sponsored) {
            typeBadge += ` <span class="vip-tag">SPONSORISÉ (${patient.discountPercentage}%)</span>`;
        }
        
        html += `
            <tr>
                <td>${patient.id}</td>
                <td>${patient.fullName}</td>
                <td>${patient.phone}</td>
                <td>${typeBadge}</td>
                <td>${consultation ? consultation.service : 'Service externe uniquement'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPatientCard('${patient.id}')">
                        Carte
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

function setupMedicalCertificate() {
    document.getElementById('generate-medical-certificate').addEventListener('click', function() {
        const patientId = this.dataset.patientId;
        const patient = state.patients.find(p => p.id === patientId);
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        const consultation = state.consultations.find(c => c.patientId === patientId);
        
        document.getElementById('certificate-hospital-name').textContent = document.getElementById('hospital-name').value;
        document.getElementById('certificate-hospital-name-text').textContent = document.getElementById('hospital-name').value;
        document.getElementById('certificate-hospital-address').textContent = document.getElementById('hospital-address').value;
        document.getElementById('certificate-hospital-phone').textContent = document.getElementById('hospital-phone').value;
        
        if (state.hospitalLogo) {
            document.getElementById('certificate-logo').src = state.hospitalLogo;
            document.getElementById('certificate-logo').style.display = 'block';
        }
        
        document.getElementById('certificate-patient-name').textContent = patient.fullName;
        document.getElementById('certificate-patient-dob').textContent = patient.birthDate;
        document.getElementById('certificate-patient-address').textContent = patient.address;
        
        if (consultation) {
            document.getElementById('certificate-consultation-date').textContent = consultation.date;
            document.getElementById('certificate-diagnosis').textContent = consultation.diagnosis;
            document.getElementById('certificate-doctor').textContent = consultation.doctor;
        } else {
            document.getElementById('certificate-consultation-date').textContent = new Date().toISOString().split('T')[0];
            document.getElementById('certificate-diagnosis').textContent = "Aucun diagnostic enregistré.";
            document.getElementById('certificate-doctor').textContent = "Médecin";
        }
        
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        document.getElementById('certificate-date').textContent = now.toLocaleDateString('fr-FR', options);
        
        document.getElementById('certificate-number').textContent = 'CM-' + Date.now().toString().slice(-6);
        
        const container = document.getElementById('medical-certificate-container');
        container.classList.remove('hidden');
        
        setTimeout(() => {
            window.print();
            container.classList.add('hidden');
        }, 500);
    });
}

// ==================== GESTION DES RENDEZ-VOUS ====================
function setupAppointmentsManagement() {
    // Initialiser la date minimale à aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').min = today;
    
    // Charger la liste des médecins
    loadDoctorsForAppointments();
    
    // Événement de recherche de patient pour rendez-vous
    document.getElementById('search-appointment-patient-btn').addEventListener('click', searchPatientForAppointment);
    
    // Événement de programmation de rendez-vous
    document.getElementById('schedule-appointment-btn').addEventListener('click', scheduleAppointment);
    
    // Événement d'annulation du formulaire
    document.getElementById('cancel-appointment-form').addEventListener('click', resetAppointmentForm);
    
    // Événement de filtre des rendez-vous
    document.getElementById('appointment-filter').addEventListener('change', loadAppointmentsList);
    
    // Événement d'actualisation
    document.getElementById('refresh-appointments').addEventListener('click', loadAppointmentsList);
    
    // Charger la liste des rendez-vous au démarrage
    loadAppointmentsList();
}

function loadDoctorsForAppointments() {
    const select = document.getElementById('appointment-doctor');
    select.innerHTML = '<option value="">Sélectionner un médecin</option>';
    
    state.users.forEach(user => {
        if (user.role === 'doctor' && user.active) {
            select.innerHTML += `<option value="${user.username}">${user.name}</option>`;
        }
    });
}

function searchPatientForAppointment() {
    const searchId = document.getElementById('appointment-patient-search').value.trim();
    
    if (!searchId) {
        alert("Veuillez entrer un ID patient");
        return;
    }
    
    const patient = state.patients.find(p => p.id === searchId);
    
    if (!patient) {
        alert("Patient non trouvé. Vérifiez l'ID patient.");
        return;
    }
    
    // Afficher les informations du patient
    document.getElementById('appointment-patient-name').textContent = patient.fullName;
    document.getElementById('appointment-patient-id').textContent = patient.id;
    document.getElementById('appointment-patient-phone').textContent = patient.phone;
    
    // Afficher le formulaire de rendez-vous
    document.getElementById('appointment-patient-info').classList.remove('hidden');
    
    // Pré-remplir la date avec aujourd'hui
    document.getElementById('appointment-date').value = new Date().toISOString().split('T')[0];
}

function scheduleAppointment() {
    // Récupérer les données du formulaire
    const patientId = document.getElementById('appointment-patient-id').textContent;
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const doctorUsername = document.getElementById('appointment-doctor').value;
    const reason = document.getElementById('appointment-reason').value;
    const notes = document.getElementById('appointment-notes').value;
    
    // Validation
    if (!patientId) {
        alert("Veuillez d'abord rechercher un patient");
        return;
    }
    
    if (!date || !time) {
        alert("Veuillez sélectionner une date et une heure");
        return;
    }
    
    if (!doctorUsername) {
        alert("Veuillez sélectionner un médecin");
        return;
    }
    
    if (!reason.trim()) {
        alert("Veuillez indiquer le motif du rendez-vous");
        return;
    }
    
    // Vérifier que la date est dans le futur
    const appointmentDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (appointmentDateTime <= now) {
        alert("La date et l'heure du rendez-vous doivent être dans le futur");
        return;
    }
    
    // Trouver le médecin
    const doctor = state.users.find(u => u.username === doctorUsername);
    if (!doctor) {
        alert("Médecin non trouvé");
        return;
    }
    
    // Trouver le patient
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé");
        return;
    }
    
    // Créer l'objet rendez-vous
    const appointment = {
        id: 'APP' + state.appointmentCounter.toString().padStart(4, '0'),
        patientId: patientId,
        patientName: patient.fullName,
        date: date,
        time: time,
        reason: reason,
        doctor: doctorUsername,
        doctorName: doctor.name,
        createdBy: state.currentUser.username,
        createdAt: new Date().toISOString(),
        status: 'scheduled',
        notes: notes
    };
    
    // Ajouter au state
    state.appointments.push(appointment);
    state.appointmentCounter++;
    
    // Envoyer une notification au médecin
    sendAppointmentNotification(appointment, doctor);
    
    alert("Rendez-vous programmé avec succès !");
    
    // Réinitialiser le formulaire
    resetAppointmentForm();
    
    // Recharger la liste
    loadAppointmentsList();
}

function resetAppointmentForm() {
    document.getElementById('appointment-patient-search').value = '';
    document.getElementById('appointment-patient-info').classList.add('hidden');
    document.getElementById('appointment-date').value = '';
    document.getElementById('appointment-time').value = '';
    document.getElementById('appointment-doctor').selectedIndex = 0;
    document.getElementById('appointment-reason').value = '';
    document.getElementById('appointment-notes').value = '';
}

function loadAppointmentsList() {
    const filter = document.getElementById('appointment-filter').value;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    let filteredAppointments = [...state.appointments];
    
    // Appliquer le filtre
    switch(filter) {
        case 'today':
            filteredAppointments = filteredAppointments.filter(a => a.date === today);
            break;
        case 'upcoming':
            filteredAppointments = filteredAppointments.filter(a => new Date(a.date) >= new Date(today));
            break;
        case 'past':
            filteredAppointments = filteredAppointments.filter(a => new Date(a.date) < new Date(today));
            break;
        // 'all' ne filtre pas
    }
    
    // Trier par date et heure (les plus proches en premier)
    filteredAppointments.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    const container = document.getElementById('appointments-list-container');
    
    if (filteredAppointments.length === 0) {
        container.innerHTML = '<p class="text-center">Aucun rendez-vous trouvé.</p>';
        return;
    }
    
    let html = '<div class="table-container">';
    html += '<table>';
    html += '<thead>';
    html += '<tr>';
    html += '<th>Patient</th>';
    html += '<th>Date</th>';
    html += '<th>Heure</th>';
    html += '<th>Médecin</th>';
    html += '<th>Motif</th>';
    html += '<th>Statut</th>';
    html += '<th>Actions</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';
    
    filteredAppointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.date);
        let statusClass = '';
        let statusText = '';
        
        switch(appointment.status) {
            case 'scheduled':
                statusClass = 'status-upcoming';
                statusText = 'Programmé';
                break;
            case 'completed':
                statusClass = 'status-paid';
                statusText = 'Terminé';
                break;
            case 'cancelled':
                statusClass = 'status-unpaid';
                statusText = 'Annulé';
                break;
            case 'no-show':
                statusClass = 'status-unpaid';
                statusText = 'Non présent';
                break;
            default:
                statusClass = '';
                statusText = appointment.status;
        }
        
        html += '<tr>';
        html += `<td>${appointment.patientName}<br><small>${appointment.patientId}</small></td>`;
        html += `<td>${appointment.date}</td>`;
        html += `<td>${appointment.time}</td>`;
        html += `<td>${appointment.doctorName}</td>`;
        html += `<td>${appointment.reason}</td>`;
        html += `<td><span class="patient-status-badge ${statusClass}">${statusText}</span></td>`;
        html += `<td>`;
        html += `<button class="btn btn-sm btn-info" onclick="viewAppointmentDetails('${appointment.id}')">Voir</button> `;
        html += `<button class="btn btn-sm btn-warning" onclick="editAppointment('${appointment.id}')">Modifier</button> `;
        html += `<button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appointment.id}')">Annuler</button>`;
        html += `</td>`;
        html += '</tr>';
    });
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    
    container.innerHTML = html;
}

function viewAppointmentDetails(appointmentId) {
    const appointment = state.appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    let html = `
        <div class="card">
            <h4>Détails du rendez-vous</h4>
            <p><strong>Patient:</strong> ${appointment.patientName} (${appointment.patientId})</p>
            <p><strong>Date:</strong> ${appointment.date}</p>
            <p><strong>Heure:</strong> ${appointment.time}</p>
            <p><strong>Médecin:</strong> ${appointment.doctorName}</p>
            <p><strong>Motif:</strong> ${appointment.reason}</p>
            <p><strong>Statut:</strong> <span class="patient-status-badge">${appointment.status}</span></p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
            <p><strong>Créé par:</strong> ${appointment.createdBy}</p>
            <p><strong>Créé le:</strong> ${new Date(appointment.createdAt).toLocaleString('fr-FR')}</p>
            
            <div class="mt-3">
                <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;
    
    showModal(html);
}

function editAppointment(appointmentId) {
    const appointment = state.appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    let html = `
        <div class="card">
            <h4>Modifier le rendez-vous</h4>
            <div class="form-group">
                <label class="form-label">Patient</label>
                <p>${appointment.patientName} (${appointment.patientId})</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="date" id="edit-appointment-date" class="form-control" value="${appointment.date}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Heure *</label>
                <input type="time" id="edit-appointment-time" class="form-control" value="${appointment.time}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Médecin *</label>
                <select id="edit-appointment-doctor" class="form-control">
                    ${state.users.map(user => 
                        user.role === 'doctor' && user.active ? 
                        `<option value="${user.username}" ${user.username === appointment.doctor ? 'selected' : ''}>${user.name}</option>` : 
                        ''
                    ).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Motif *</label>
                <textarea id="edit-appointment-reason" class="form-control" rows="2">${appointment.reason}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notes supplémentaires</label>
                <textarea id="edit-appointment-notes" class="form-control" rows="2">${appointment.notes || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Statut</label>
                <select id="edit-appointment-status" class="form-control">
                    <option value="scheduled" ${appointment.status === 'scheduled' ? 'selected' : ''}>Programmé</option>
                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Terminé</option>
                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Annulé</option>
                    <option value="no-show" ${appointment.status === 'no-show' ? 'selected' : ''}>Non présent</option>
                </select>
            </div>
            
            <div class="mt-3">
                <button class="btn btn-success" onclick="saveAppointmentChanges('${appointmentId}')">Enregistrer</button>
                <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            </div>
        </div>
    `;
    
    showModal(html);
}

function saveAppointmentChanges(appointmentId) {
    const appointment = state.appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    const date = document.getElementById('edit-appointment-date').value;
    const time = document.getElementById('edit-appointment-time').value;
    const doctorUsername = document.getElementById('edit-appointment-doctor').value;
    const reason = document.getElementById('edit-appointment-reason').value;
    const notes = document.getElementById('edit-appointment-notes').value;
    const status = document.getElementById('edit-appointment-status').value;
    
    // Validation
    if (!date || !time || !doctorUsername || !reason.trim()) {
        alert("Veuillez remplir tous les champs obligatoires");
        return;
    }
    
    // Mettre à jour l'appointment
    appointment.date = date;
    appointment.time = time;
    appointment.doctor = doctorUsername;
    appointment.doctorName = state.users.find(u => u.username === doctorUsername)?.name || doctorUsername;
    appointment.reason = reason;
    appointment.notes = notes;
    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    appointment.updatedBy = state.currentUser.username;
    
    // Si le médecin a changé, envoyer une notification
    if (appointment.doctor !== doctorUsername) {
        const newDoctor = state.users.find(u => u.username === doctorUsername);
        if (newDoctor) {
            sendAppointmentNotification(appointment, newDoctor);
        }
    }
    
    alert("Rendez-vous modifié avec succès !");
    closeModal();
    loadAppointmentsList();
}

function cancelAppointment(appointmentId) {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) {
        return;
    }
    
    const appointment = state.appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    appointment.status = 'cancelled';
    appointment.updatedAt = new Date().toISOString();
    appointment.updatedBy = state.currentUser.username;
    
    alert("Rendez-vous annulé !");
    loadAppointmentsList();
}

function sendAppointmentNotification(appointment, doctor) {
    const message = {
        id: 'MSG' + Date.now(),
        sender: state.currentUser.username,
        senderRole: state.currentRole,
        recipient: doctor.username,
        recipientRole: doctor.role,
        subject: 'Nouveau rendez-vous programmé',
        content: `Vous avez un nouveau rendez-vous avec ${appointment.patientName} (${appointment.patientId}) le ${appointment.date} à ${appointment.time}. Motif: ${appointment.reason}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'appointment'
    };
    
    state.messages.push(message);
    updateMessageBadge();
}

// Fonctions utilitaires pour les modales
function showModal(content) {
    let modal = document.getElementById('custom-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            ${content}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Exposer les fonctions au scope global
window.viewAppointmentDetails = viewAppointmentDetails;
window.editAppointment = editAppointment;
window.cancelAppointment = cancelAppointment;
window.saveAppointmentChanges = saveAppointmentChanges;
window.closeModal = closeModal;
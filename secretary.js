// Module Secrétariat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patient-registration-form')) {
        setupSecretary();
    }
});

function setupSecretary() {
    setupPatientTypeChange();
    setupAppointments();
    setupMedicalCertificate();
    
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

function setupAppointments() {
    document.getElementById('search-appointment-patient').addEventListener('click', searchAppointmentPatient);
    document.getElementById('schedule-appointment').addEventListener('click', scheduleAppointment);
    document.getElementById('search-doctor-appointment').addEventListener('click', searchDoctorAppointment);
}

function searchAppointmentPatient() {
    const patientId = document.getElementById('appointment-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    document.getElementById('appointment-patient-name').textContent = patient.fullName + ' (' + patient.id + ')';
    document.getElementById('appointment-patient-details').classList.remove('hidden');
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

function scheduleAppointment() {
    const patientId = document.getElementById('appointment-patient-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const reason = document.getElementById('appointment-reason').value;
    const doctor = document.getElementById('appointment-doctor').value;

    if (!date || !time) {
        alert("Veuillez remplir la date et l'heure!");
        return;
    }

    const appointment = {
        id: 'APP' + Date.now(),
        patientId: patient.id,
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
    loadAppointmentsList();
}

function loadAppointmentsList() {
    const container = document.getElementById('appointments-list');
    const today = new Date().toISOString().split('T')[0];
    const upcoming = state.appointments.filter(a => a.date >= today).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    if (upcoming.length === 0) {
        container.innerHTML = '<p>Aucun rendez-vous à venir.</p>';
        return;
    }
    let html = '<table class="table-container"><thead><tr><th>Patient</th><th>Date</th><th>Heure</th><th>Motif</th><th>Médecin</th><th>Statut</th></tr></thead><tbody>';
    upcoming.forEach(app => {
        html += `<tr><td>${app.patientName}</td><td>${app.date}</td><td>${app.time}</td><td>${app.reason}</td><td>${app.doctor}</td><td>${app.status}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function searchDoctorAppointment() {
    const patientId = document.getElementById('doctor-appointment-search').value.trim();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        alert("Patient non trouvé!");
        return;
    }
    
    const patientAppointments = state.appointments.filter(a => a.patientId === patientId);
    const container = document.getElementById('doctor-appointment-results');
    
    if (patientAppointments.length === 0) {
        container.innerHTML = '<p>Aucun rendez-vous trouvé pour ce patient.</p>';
        return;
    }
    
    let html = '<h4>Rendez-vous du patient</h4>';
    html += '<table class="table-container"><thead><tr><th>Date</th><th>Heure</th><th>Motif</th><th>Statut</th></tr></thead><tbody>';
    patientAppointments.forEach(app => {
        html += `<tr><td>${app.date}</td><td>${app.time}</td><td>${app.reason}</td><td>${app.status}</td></tr>`;
    });
    html += '</tbody></table>';
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
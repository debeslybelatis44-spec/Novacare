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
    
    // Démarrer la surveillance des notifications de paiement
    startPaymentNotificationWatcher();
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

// Fonction pour afficher une notification toast (copiée depuis doctor.js)
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Jouer un son (optionnel)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Son bloqué par le navigateur'));
    } catch (e) {}
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Surveillance des notifications de paiement
let lastCheckedMessageId = null;

function startPaymentNotificationWatcher() {
    // Vérifier toutes les 10 secondes
    setInterval(checkNewPaymentNotifications, 10000);
    // Première vérification immédiate
    checkNewPaymentNotifications();
}

function checkNewPaymentNotifications() {
    if (!state.currentUser || state.currentUser.role !== 'nurse') return;
    
    const now = Date.now();
    // Récupérer les messages non lus de type payment_notification destinés à l'infirmier
    const newMessages = state.messages.filter(m => 
        m.recipient === state.currentUser.username &&
        m.type === 'payment_notification' &&
        !m.read
    );
    
    newMessages.forEach(msg => {
        // Afficher une notification toast
        showNotification(`Nouveau paiement: ${msg.content}`, 'success');
        // Marquer comme lu (pour ne plus afficher)
        msg.read = true;
    });
    
    // Mettre à jour le badge de messages
    updateMessageBadge();
}

// Initialisation du module infirmier
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('nurse-patient-search')) {
        setupNurse();
    }
});
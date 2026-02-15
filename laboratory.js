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
    
    // Ajouter un écouteur d'événement pour la touche Enter
    document.getElementById('lab-patient-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('search-lab-patient').click();
        }
    });
    
    // Initialiser la liste des analyses en attente
    updatePendingAnalysesList();
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
            showNotification(`Résultat enregistré pour ${transaction.patientName}`, 'success');
            
            alert("Résultat enregistré avec succès!");
            document.getElementById('lab-result-modal').remove();
            document.getElementById('search-lab-patient').click();
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
    }
    
    transaction.labStatus = 'completed';
    
    sendLabResultNotification(transaction);
    showNotification(`Résultat enregistré pour ${transaction.patientName}`, 'success');
    
    alert("Résultat enregistré avec succès!");
    document.getElementById('lab-result-modal').remove();
    document.getElementById('search-lab-patient').click();
}

function sendLabResultNotification(transaction) {
    // Notifier tous les médecins
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
    
    // Notifier également le secrétariat (optionnel)
    const secretaries = state.users.filter(u => u.role === 'secretary' && u.active);
    secretaries.forEach(sec => {
        const message = {
            id: 'MSG' + Date.now(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: sec.username,
            recipientRole: sec.role,
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

// Fonction utilitaire pour afficher une notification toast (copiée depuis doctor.js pour cohérence)
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQAAABJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJ');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Son bloqué par le navigateur'));
    } catch (e) {}
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Initialisation du module laboratoire
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lab-patient-search')) {
        setupLaboratory();
    }
});

// Rendre les fonctions accessibles globalement (pour les appels onclick)
window.enterLabResult = enterLabResult;
window.saveLabResult = saveLabResult;
window.viewLabResult = viewLabResult;
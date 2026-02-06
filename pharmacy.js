// Module Pharmacie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pharmacy-patient-search')) {
        setupPharmacy();
    }
});

function setupPharmacy() {
    document.getElementById('search-pharmacy-patient').addEventListener('click', () => {
        const search = document.getElementById('pharmacy-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        document.getElementById('pharmacy-patient-name').textContent = patient.fullName;
        document.getElementById('pharmacy-patient-id').textContent = patient.id;
        
        const medTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.type === 'medication'
        );
        
        const unpaidMeds = medTransactions.filter(t => t.status === 'unpaid');
        const paidMeds = medTransactions.filter(t => t.status === 'paid');
        
        let statusText, statusClass;
        if (unpaidMeds.length === 0 && paidMeds.length > 0) {
            statusText = 'Tout payé';
            statusClass = 'status-paid';
        } else if (paidMeds.length > 0 && unpaidMeds.length > 0) {
            statusText = 'Partiellement payé';
            statusClass = 'status-partial';
        } else if (unpaidMeds.length > 0) {
            statusText = 'Non payé';
            statusClass = 'status-unpaid';
        } else {
            statusText = 'Aucun médicament';
            statusClass = '';
        }
        
        document.getElementById('pharmacy-payment-status').textContent = statusText;
        document.getElementById('pharmacy-payment-status').className = `patient-status-badge ${statusClass}`;
        
        let html = '';
        medTransactions.forEach(transaction => {
            const med = state.medicationStock.find(m => m.id === transaction.medicationId);
            const canDeliver = transaction.status === 'paid' && 
                              (!transaction.deliveryStatus || transaction.deliveryStatus !== 'delivered');
            
            html += `
                <div class="card mb-2">
                    <div class="d-flex justify-between">
                        <div>
                            <h5>${transaction.service}</h5>
                            <p>Posologie: ${transaction.dosage}</p>
                            <p>Statut paiement: <span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
                            <p>Livraison: <span class="${transaction.deliveryStatus === 'delivered' ? 'status-paid' : 'status-unpaid'}">${transaction.deliveryStatus || 'En attente'}</span></p>
                        </div>
                        <div>
                            ${canDeliver ? `
                                <button class="btn btn-success" onclick="deliverMedication('${transaction.id}')">
                                    Délivrer
                                </button>
                            ` : ''}
                            ${transaction.deliveryStatus === 'delivered' ? `
                                <span class="text-success"><i class="fas fa-check"></i> Déjà délivré</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('pharmacy-prescriptions-list').innerHTML = html || '<p>Aucun médicament prescrit.</p>';
        document.getElementById('pharmacy-patient-details').classList.remove('hidden');
        
        const hasDeliverable = medTransactions.some(t => 
            t.status === 'paid' && 
            (!t.deliveryStatus || t.deliveryStatus !== 'delivered')
        );
        document.getElementById('deliver-medications').disabled = !hasDeliverable;
    });
    
    document.getElementById('add-new-medication').addEventListener('click', () => {
        document.getElementById('new-medication-form').style.display = 'block';
    });
    
    document.getElementById('cancel-new-medication').addEventListener('click', () => {
        document.getElementById('new-medication-form').style.display = 'none';
        resetNewMedicationForm();
    });
    
    document.getElementById('save-new-medication').addEventListener('click', addNewMedication);
    
    updateMedicationStock();
}

function deliverMedication(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const med = state.medicationStock.find(m => m.id === transaction.medicationId);
    if (!med) return;
    
    if (med.quantity < transaction.quantity) {
        alert(`Stock insuffisant! Disponible: ${med.quantity}, Demandé: ${transaction.quantity}`);
        return;
    }
    
    med.quantity -= transaction.quantity;
    med.reserved = (med.reserved || 0) - transaction.quantity;
    
    transaction.deliveryStatus = 'delivered';
    transaction.deliveryDate = new Date().toISOString().split('T')[0];
    transaction.deliveryTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    transaction.deliveredBy = state.currentUser.username;
    
    alert("Médicament délivré avec succès!");
    document.getElementById('search-pharmacy-patient').click();
    updateMedicationStock();
}

function resetNewMedicationForm() {
    document.getElementById('new-med-name').value = '';
    document.getElementById('new-med-generic').value = '';
    document.getElementById('new-med-form').value = '';
    document.getElementById('new-med-unit').value = '';
    document.getElementById('new-med-quantity').value = '';
    document.getElementById('new-med-alert').value = '';
    document.getElementById('new-med-price').value = '';
}

function addNewMedication() {
    const name = document.getElementById('new-med-name').value.trim();
    const genericName = document.getElementById('new-med-generic').value.trim();
    const form = document.getElementById('new-med-form').value;
    const unit = document.getElementById('new-med-unit').value.trim();
    const quantity = parseInt(document.getElementById('new-med-quantity').value);
    const alertThreshold = parseInt(document.getElementById('new-med-alert').value);
    const price = parseFloat(document.getElementById('new-med-price').value);
    
    if (!name || !form || !unit || isNaN(quantity) || isNaN(alertThreshold) || isNaN(price)) {
        alert("Veuillez remplir tous les champs correctement!");
        return;
    }
    
    const newMed = {
        id: 'MED' + Date.now(),
        name: name,
        genericName: genericName,
        form: form,
        quantity: quantity,
        unit: unit,
        alertThreshold: alertThreshold,
        price: price,
        reserved: 0
    };
    
    state.medicationStock.push(newMed);
    
    document.getElementById('new-medication-form').style.display = 'none';
    resetNewMedicationForm();
    
    updateMedicationStock();
    alert("Médicament ajouté avec succès!");
}

function updateMedicationStock() {
    const container = document.getElementById('medication-stock-list');
    let html = '';
    
    state.medicationStock.forEach(med => {
        const statusClass = med.quantity === 0 ? 'out-of-stock' : 
                          (med.quantity <= med.alertThreshold ? 'low-stock' : '');
        
        html += `
            <tr class="${statusClass}">
                <td>${med.name}<br><small>${med.genericName}</small></td>
                <td>${med.form}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold}</td>
                <td>${med.price} Gdes</td>
                <td>
                    ${med.quantity === 0 ? 'Rupture' : 
                     med.quantity <= med.alertThreshold ? 'Stock faible' : 'Normal'}
                </td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="restockMedication('${med.id}')">
                        Réapprovisionner
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
    
    updateLowStockMedications();
}

function updateLowStockMedications() {
    const lowStock = state.medicationStock.filter(med => 
        med.quantity <= med.alertThreshold
    );
    
    const container = document.getElementById('low-stock-medications');
    
    if (lowStock.length === 0) {
        container.innerHTML = '<p>Aucun médicament en rupture ou stock faible.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Médicament</th><th>Stock actuel</th><th>Seuil d\'alerte</th><th>Statut</th></tr></thead><tbody>';
    
    lowStock.forEach(med => {
        html += `
            <tr class="${med.quantity === 0 ? 'out-of-stock' : 'low-stock'}">
                <td>${med.name}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold}</td>
                <td>${med.quantity === 0 ? 'RUPTURE' : 'Stock faible'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function restockMedication(medId) {
    if (state.currentRole !== 'admin' && state.currentRole !== 'pharmacy') {
        alert("Seul l'administrateur ou le pharmacien peut modifier le stock!");
        return;
    }
    
    const med = state.medicationStock.find(m => m.id === medId);
    if (!med) return;
    
    const quantity = prompt(`Quantité à ajouter pour ${med.name} (en ${med.unit}):`, "100");
    if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
        med.quantity += parseInt(quantity);
        updateMedicationStock();
        alert(`Stock mis à jour! Nouvelle quantité: ${med.quantity} ${med.unit}`);
    }
}
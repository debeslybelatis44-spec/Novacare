// Module Pharmacie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pharmacy-patient-search')) {
        setupPharmacy();
    }
});

function setupPharmacy() {
    // Initialiser les listes déroulantes des emplacements et départements
    initializeLocationSelect();
    initializeDepartmentSelect();
    
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

function initializeLocationSelect() {
    const select = document.getElementById('new-med-location');
    
    // Sections A: A1 à A20
    for (let i = 1; i <= 20; i++) {
        select.innerHTML += `<option value="A${i}">A${i}</option>`;
    }
    
    // Sections B: B1 à B16
    for (let i = 1; i <= 16; i++) {
        select.innerHTML += `<option value="B${i}">B${i}</option>`;
    }
    
    // Sections C: C1 à C16
    for (let i = 1; i <= 16; i++) {
        select.innerHTML += `<option value="C${i}">C${i}</option>`;
    }
}

function initializeDepartmentSelect() {
    const select = document.getElementById('new-med-department');
    const departments = [
        'Sérum',
        'Sérum mannitol',
        'Ringer',
        'Dextrose 5%',
        'Dextrose 10%',
        'DNS 0,33%',
        'DNS 0,225%',
        'NaCl 0,9%',
        'NaCl 0,45%',
        'Autre'
    ];
    
    departments.forEach(dept => {
        select.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
}

function deliverMedication(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const med = state.medicationStock.find(m => m.id === transaction.medicationId);
    if (!med) return;
    
    if (med.quantity < transaction.quantity) {
        alert(`Stock insuffisant! Disponible: ${med.quantity} ${med.unit}, Demandé: ${transaction.quantity} ${med.unit}`);
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
    document.getElementById('new-med-expiration').value = '';
    document.getElementById('new-med-location').selectedIndex = 0;
    document.getElementById('new-med-department').selectedIndex = 0;
}

function addNewMedication() {
    const name = document.getElementById('new-med-name').value.trim();
    const genericName = document.getElementById('new-med-generic').value.trim();
    const form = document.getElementById('new-med-form').value;
    const unit = document.getElementById('new-med-unit').value.trim();
    const quantity = parseInt(document.getElementById('new-med-quantity').value);
    const alertThreshold = parseInt(document.getElementById('new-med-alert').value);
    const price = parseFloat(document.getElementById('new-med-price').value);
    const expirationDate = document.getElementById('new-med-expiration').value;
    const location = document.getElementById('new-med-location').value;
    const department = document.getElementById('new-med-department').value;
    
    if (!name || !form || !unit || isNaN(quantity) || isNaN(alertThreshold) || isNaN(price) || !location || !department) {
        alert("Veuillez remplir tous les champs obligatoires!");
        return;
    }
    
    if (quantity < 0) {
        alert("La quantité ne peut pas être négative!");
        return;
    }
    
    if (alertThreshold < 0) {
        alert("Le seuil d'alerte ne peut pas être négatif!");
        return;
    }
    
    if (price < 0) {
        alert("Le prix ne peut pas être négatif!");
        return;
    }
    
    // Vérifier si la date d'expiration est dans le passé
    if (expirationDate) {
        const today = new Date();
        const expDate = new Date(expirationDate);
        if (expDate < today) {
            if (!confirm("Attention: La date d'expiration est déjà passée. Voulez-vous quand même ajouter ce médicament?")) {
                return;
            }
        }
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
        expirationDate: expirationDate || null,
        location: location,
        department: department,
        reserved: 0,
        addedDate: new Date().toISOString().split('T')[0],
        addedBy: state.currentUser.username
    };
    
    state.medicationStock.push(newMed);
    
    document.getElementById('new-medication-form').style.display = 'none';
    resetNewMedicationForm();
    
    updateMedicationStock();
    alert("Médicament ajouté avec succès!");
}

function updateMedicationStock() {
    const container = document.getElementById('medication-stock-list');
    const today = new Date();
    
    let html = '';
    
    state.medicationStock.forEach(med => {
        let statusClass = '';
        let statusText = 'Normal';
        
        // Vérifier l'expiration
        if (med.expirationDate) {
            const expDate = new Date(med.expirationDate);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                statusClass = 'expired';
                statusText = 'EXPIRÉ';
            } else if (diffDays <= 30) {
                statusClass = 'expiring-soon';
                statusText = 'Expire bientôt';
            }
        }
        
        // Vérifier le stock
        if (med.quantity === 0) {
            statusClass = 'out-of-stock';
            statusText = 'Rupture';
        } else if (med.quantity <= med.alertThreshold && statusClass === '') {
            statusClass = 'low-stock';
            statusText = 'Stock faible';
        }
        
        // Formater la date d'expiration
        let expirationDisplay = 'N/A';
        if (med.expirationDate) {
            const expDate = new Date(med.expirationDate);
            expirationDisplay = expDate.toLocaleDateString('fr-FR');
            
            // Ajouter un avertissement si expiré ou bientôt expiré
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                expirationDisplay += ' <span class="text-danger">(EXPIRÉ)</span>';
            } else if (diffDays <= 30) {
                expirationDisplay += ` <span class="text-warning">(dans ${diffDays} jours)</span>`;
            }
        }
        
        html += `
            <tr class="${statusClass}">
                <td>${med.name}<br><small>${med.genericName}</small></td>
                <td>${med.form}</td>
                <td>${med.department}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold} ${med.unit}</td>
                <td>${med.price.toFixed(2)} Gdes</td>
                <td>${expirationDisplay}</td>
                <td>${med.location}</td>
                <td>${statusText}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="restockMedication('${med.id}')">
                        Réapprovisionner
                    </button>
                    <button class="btn btn-sm btn-info" onclick="editMedication('${med.id}')">
                        Modifier
                    </button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
    
    updateLowStockMedications();
    updateExpiringMedications();
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
    
    let html = '<table class="table-container"><thead><tr><th>Médicament</th><th>Département</th><th>Stock actuel</th><th>Seuil d\'alerte</th><th>Emplacement</th><th>Statut</th></tr></thead><tbody>';
    
    lowStock.forEach(med => {
        html += `
            <tr class="${med.quantity === 0 ? 'out-of-stock' : 'low-stock'}">
                <td>${med.name}</td>
                <td>${med.department}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold} ${med.unit}</td>
                <td>${med.location}</td>
                <td>${med.quantity === 0 ? 'RUPTURE' : 'Stock faible'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateExpiringMedications() {
    const today = new Date();
    const expiringSoon = state.medicationStock.filter(med => {
        if (!med.expirationDate) return false;
        const expDate = new Date(med.expirationDate);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    });
    
    const expired = state.medicationStock.filter(med => {
        if (!med.expirationDate) return false;
        const expDate = new Date(med.expirationDate);
        return expDate < today;
    });
    
    const container = document.getElementById('expiring-medications');
    
    if (expiringSoon.length === 0 && expired.length === 0) {
        container.innerHTML = '<p>Aucun médicament bientôt expiré ou expiré.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Médicament</th><th>Département</th><th>Date expiration</th><th>Stock</th><th>Emplacement</th><th>Statut</th></tr></thead><tbody>';
    
    // Afficher d'abord les expirés
    expired.forEach(med => {
        const expDate = new Date(med.expirationDate);
        html += `
            <tr class="expired">
                <td>${med.name}</td>
                <td>${med.department}</td>
                <td>${expDate.toLocaleDateString('fr-FR')}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.location}</td>
                <td class="text-danger"><strong>EXPIRÉ</strong></td>
            </tr>
        `;
    });
    
    // Puis les bientôt expirés
    expiringSoon.forEach(med => {
        const expDate = new Date(med.expirationDate);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        html += `
            <tr class="expiring-soon">
                <td>${med.name}</td>
                <td>${med.department}</td>
                <td>${expDate.toLocaleDateString('fr-FR')}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.location}</td>
                <td class="text-warning"><strong>Expire dans ${diffDays} jours</strong></td>
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
        
        // Demander si on veut aussi mettre à jour la date d'expiration
        const updateExpiration = confirm("Voulez-vous mettre à jour la date d'expiration?");
        if (updateExpiration) {
            const newExpiration = prompt("Nouvelle date d'expiration (YYYY-MM-DD):", med.expirationDate || '');
            if (newExpiration) {
                med.expirationDate = newExpiration;
            }
        }
        
        updateMedicationStock();
        alert(`Stock mis à jour! Nouvelle quantité: ${med.quantity} ${med.unit}`);
    }
}

function editMedication(medId) {
    if (state.currentRole !== 'admin' && state.currentRole !== 'pharmacy') {
        alert("Seul l'administrateur ou le pharmacien peut modifier les médicaments!");
        return;
    }
    
    const med = state.medicationStock.find(m => m.id === medId);
    if (!med) return;
    
    // Créer un formulaire modal pour modifier le médicament
    let formHtml = `
        <div class="card">
            <h4>Modifier le médicament: ${med.name}</h4>
            <div class="form-group">
                <label>Nom commercial:</label>
                <input type="text" id="edit-med-name" class="form-control" value="${med.name}">
            </div>
            <div class="form-group">
                <label>Nom générique:</label>
                <input type="text" id="edit-med-generic" class="form-control" value="${med.genericName}">
            </div>
            <div class="form-group">
                <label>Forme:</label>
                <input type="text" id="edit-med-form" class="form-control" value="${med.form}">
            </div>
            <div class="form-group">
                <label>Unité:</label>
                <input type="text" id="edit-med-unit" class="form-control" value="${med.unit}">
            </div>
            <div class="form-group">
                <label>Département:</label>
                <select id="edit-med-department" class="form-control">
                    ${getDepartmentOptions(med.department)}
                </select>
            </div>
            <div class="form-group">
                <label>Quantité:</label>
                <input type="number" id="edit-med-quantity" class="form-control" value="${med.quantity}">
            </div>
            <div class="form-group">
                <label>Seuil d'alerte:</label>
                <input type="number" id="edit-med-alert" class="form-control" value="${med.alertThreshold}">
            </div>
            <div class="form-group">
                <label>Prix (Gdes):</label>
                <input type="number" step="0.01" id="edit-med-price" class="form-control" value="${med.price}">
            </div>
            <div class="form-group">
                <label>Date d'expiration (optionnel):</label>
                <input type="date" id="edit-med-expiration" class="form-control" value="${med.expirationDate || ''}">
            </div>
            <div class="form-group">
                <label>Emplacement:</label>
                <select id="edit-med-location" class="form-control">
                    ${getLocationOptions(med.location)}
                </select>
            </div>
            <div class="mt-3">
                <button class="btn btn-success" onclick="saveMedicationEdit('${medId}')">Enregistrer</button>
                <button class="btn btn-secondary" onclick="document.getElementById('edit-medication-modal').remove()">Annuler</button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.id = 'edit-medication-modal';
    modal.className = 'transaction-details-modal';
    modal.innerHTML = `<div class="transaction-details-content">${formHtml}</div>`;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

function getDepartmentOptions(selected) {
    const departments = [
        'Sérum',
        'Sérum mannitol',
        'Ringer',
        'Dextrose 5%',
        'Dextrose 10%',
        'DNS 0,33%',
        'DNS 0,225%',
        'NaCl 0,9%',
        'NaCl 0,45%',
        'Autre'
    ];
    
    return departments.map(dept => 
        `<option value="${dept}" ${dept === selected ? 'selected' : ''}>${dept}</option>`
    ).join('');
}

function getLocationOptions(selected) {
    let options = '';
    
    // Sections A: A1 à A20
    for (let i = 1; i <= 20; i++) {
        const value = `A${i}`;
        options += `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;
    }
    
    // Sections B: B1 à B16
    for (let i = 1; i <= 16; i++) {
        const value = `B${i}`;
        options += `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;
    }
    
    // Sections C: C1 à C16
    for (let i = 1; i <= 16; i++) {
        const value = `C${i}`;
        options += `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;
    }
    
    return options;
}

function saveMedicationEdit(medId) {
    const med = state.medicationStock.find(m => m.id === medId);
    if (!med) return;
    
    med.name = document.getElementById('edit-med-name').value.trim();
    med.genericName = document.getElementById('edit-med-generic').value.trim();
    med.form = document.getElementById('edit-med-form').value;
    med.unit = document.getElementById('edit-med-unit').value.trim();
    med.quantity = parseInt(document.getElementById('edit-med-quantity').value);
    med.alertThreshold = parseInt(document.getElementById('edit-med-alert').value);
    med.price = parseFloat(document.getElementById('edit-med-price').value);
    med.expirationDate = document.getElementById('edit-med-expiration').value || null;
    med.location = document.getElementById('edit-med-location').value;
    med.department = document.getElementById('edit-med-department').value;
    med.lastModified = new Date().toISOString().split('T')[0];
    med.modifiedBy = state.currentUser.username;
    
    alert("Médicament modifié avec succès!");
    document.getElementById('edit-medication-modal').remove();
    updateMedicationStock();
}
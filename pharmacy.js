// Module Pharmacie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pharmacy-patient-search')) {
        setupPharmacy();
    }
});

function setupPharmacy() {
    initializeLocationSelect();
    initializeDepartmentSelect();
    
    const deptSelect = document.getElementById('new-med-department');
    if (deptSelect) {
        deptSelect.addEventListener('change', function() {
            updateLocationOptions(this.value);
        });
        updateLocationOptions(deptSelect.value);
    }
    
    const searchPatientBtn = document.getElementById('search-pharmacy-patient');
    if (searchPatientBtn) {
        searchPatientBtn.addEventListener('click', searchPatient);
    } else {
        console.error("Élément 'search-pharmacy-patient' non trouvé");
    }
    
    const patientSearchInput = document.getElementById('pharmacy-patient-search');
    if (patientSearchInput) {
        patientSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPatient();
            }
        });
    }
    
    const searchMedBtn = document.getElementById('search-medication');
    if (searchMedBtn) {
        searchMedBtn.addEventListener('click', searchMedicationInStock);
    } else {
        console.error("Élément 'search-medication' non trouvé");
    }
    
    const medSearchInput = document.getElementById('medication-search-stock');
    if (medSearchInput) {
        medSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchMedicationInStock();
            }
        });
    }
    
    const addNewMedBtn = document.getElementById('add-new-medication');
    if (addNewMedBtn) {
        addNewMedBtn.addEventListener('click', () => {
            document.getElementById('new-medication-form').style.display = 'block';
        });
    }
    
    const cancelNewMedBtn = document.getElementById('cancel-new-medication');
    if (cancelNewMedBtn) {
        cancelNewMedBtn.addEventListener('click', () => {
            document.getElementById('new-medication-form').style.display = 'none';
            resetNewMedicationForm();
        });
    }
    
    const saveNewMedBtn = document.getElementById('save-new-medication');
    if (saveNewMedBtn) {
        saveNewMedBtn.addEventListener('click', addNewMedication);
    }
    
    updateMedicationStock();
    updateSupplierSelect();
    
    document.getElementById('add-direct-sale')?.addEventListener('click', addDirectSaleItem);
    document.getElementById('confirm-direct-sale')?.addEventListener('click', confirmDirectSale);
    document.getElementById('print-direct-sale-slip')?.addEventListener('click', printDirectSaleSlip);
    
    const medNameInput = document.getElementById('direct-sale-med-name');
    if (medNameInput) {
        medNameInput.setAttribute('list', 'medications-datalist');
        if (!document.getElementById('medications-datalist')) {
            const datalist = document.createElement('datalist');
            datalist.id = 'medications-datalist';
            document.body.appendChild(datalist);
        }
        populateMedicationDatalist();
    }
}

function searchPatient() {
    const searchInput = document.getElementById('pharmacy-patient-search');
    if (!searchInput) return;
    const searchValue = searchInput.value.trim();
    
    if (!searchValue) {
        alert("Veuillez entrer un ID patient ou un nom pour la recherche!");
        return;
    }
    
    let patient = state.patients.find(p => p.id.toLowerCase() === searchValue.toLowerCase());
    
    if (!patient) {
        patient = state.patients.find(p => 
            p.fullName.toLowerCase().includes(searchValue.toLowerCase())
        );
    }
    
    if (!patient) {
        alert("Patient non trouvé! Vérifiez l'ID ou le nom.");
        document.getElementById('pharmacy-patient-details').classList.add('hidden');
        return;
    }
    
    displayPatientDetails(patient);
}

function displayPatientDetails(patient) {
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
        if (transaction.items && Array.isArray(transaction.items)) {
            const allDelivered = transaction.items.every(item => item.delivered);
            const canDeliver = transaction.status === 'paid' && !allDelivered;
            
            html += `
                <div class="card mb-2">
                    <div class="d-flex justify-between">
                        <div>
                            <h5>${transaction.service}</h5>
                            <p>Articles:</p>
                            <ul>
                                ${transaction.items.map(item => `
                                    <li>${item.name} x${item.quantity} - ${item.delivered ? 'Délivré' : 'En attente'}</li>
                                `).join('')}
                            </ul>
                            <p>Statut paiement: <span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
                            <p>Livraison: <span class="${allDelivered ? 'status-paid' : 'status-unpaid'}">${allDelivered ? 'Tout délivré' : 'En attente'}</span></p>
                        </div>
                        <div>
                            ${canDeliver ? `
                                <button class="btn btn-success" onclick="deliverDirectSale('${transaction.id}')">
                                    Délivrer tout
                                </button>
                            ` : ''}
                            ${allDelivered ? `
                                <span class="text-success"><i class="fas fa-check"></i> Déjà délivré</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const med = state.medicationStock.find(m => m.id === transaction.medicationId);
            const canDeliver = transaction.status === 'paid' && 
                              (!transaction.deliveryStatus || transaction.deliveryStatus !== 'delivered');
            
            html += `
                <div class="card mb-2">
                    <div class="d-flex justify-between">
                        <div>
                            <h5>${transaction.service}</h5>
                            <p>Posologie: ${transaction.dosage || 'Non spécifié'}</p>
                            <p>Statut paiement: <span class="${transaction.status === 'paid' ? 'status-paid' : 'status-unpaid'}">${transaction.status === 'paid' ? 'Payé' : 'Non payé'}</span></p>
                            <p>Livraison: <span class="${transaction.deliveryStatus === 'delivered' ? 'status-paid' : 'status-unpaid'}">${transaction.deliveryStatus || 'En attente'}</span></p>
                            ${med ? `<p>Stock disponible: ${med.quantity} ${med.unit}</p>` : ''}
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
        }
    });
    
    document.getElementById('pharmacy-prescriptions-list').innerHTML = html || '<p>Aucun médicament prescrit.</p>';
    document.getElementById('pharmacy-patient-details').classList.remove('hidden');
    
    const hasDeliverable = medTransactions.some(t => {
        if (t.items) {
            return t.status === 'paid' && !t.items.every(item => item.delivered);
        } else {
            return t.status === 'paid' && (!t.deliveryStatus || t.deliveryStatus !== 'delivered');
        }
    });
    document.getElementById('deliver-medications').disabled = !hasDeliverable;
}

function searchMedicationInStock() {
    const searchInput = document.getElementById('medication-search-stock');
    if (!searchInput) return;
    const searchValue = searchInput.value.trim().toLowerCase();
    
    if (!searchValue) {
        updateMedicationStock();
        return;
    }
    
    const filteredMeds = state.medicationStock.filter(med => 
        med.name.toLowerCase().includes(searchValue) ||
        (med.genericName && med.genericName.toLowerCase().includes(searchValue)) ||
        (med.department && med.department.toLowerCase().includes(searchValue)) ||
        (med.form && med.form.toLowerCase().includes(searchValue))
    );
    
    displayFilteredMedications(filteredMeds);
}

function displayFilteredMedications(medications) {
    const container = document.getElementById('medication-stock-list');
    if (!container) return;
    const today = new Date();
    
    let html = '';
    
    medications.forEach(med => {
        let statusClass = '';
        let statusText = 'Normal';
        
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
        
        if (med.quantity === 0) {
            statusClass = 'out-of-stock';
            statusText = 'Rupture';
        } else if (med.quantity <= med.alertThreshold && statusClass === '') {
            statusClass = 'low-stock';
            statusText = 'Stock faible';
        }
        
        let expirationDisplay = 'N/A';
        if (med.expirationDate) {
            const expDate = new Date(med.expirationDate);
            expirationDisplay = expDate.toLocaleDateString('fr-FR');
            
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                expirationDisplay += ' <span class="text-danger">(EXPIRÉ)</span>';
            } else if (diffDays <= 30) {
                expirationDisplay += ` <span class="text-warning">(dans ${diffDays} jours)</span>`;
            }
        }
        
        let supplierName = '-';
        if (med.supplier) {
            const supplier = state.suppliers.find(s => s.id === med.supplier);
            supplierName = supplier ? supplier.name : 'Inconnu';
        }
        
        html += `
            <tr class="${statusClass}">
                <td>${med.name}<br><small>${med.genericName || ''}</small></td>
                <td>${med.form}</td>
                <td>${med.department || '-'}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold} ${med.unit}</td>
                <td>${med.price.toFixed(2)} Gdes</td>
                <td>${expirationDisplay}</td>
                <td>${supplierName}</td>
                <td>${med.location || '-'}</td>
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
    
    container.innerHTML = html || '<tr><td colspan="11" class="text-center">Aucun médicament trouvé</td></tr>';
    
    updateLowStockMedications();
    updateExpiringMedications();
}

function initializeLocationSelect() {
    const select = document.getElementById('new-med-location');
    if (select) {
        select.innerHTML = '<option value="">Sélectionner un emplacement</option>';
    }
}

function initializeDepartmentSelect() {
    const select = document.getElementById('new-med-department');
    if (!select) return;
    select.innerHTML = '<option value="">Sélectionner un département</option>';
    
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

function isSerumDepartment(department) {
    const serumTypes = [
        'Sérum',
        'Sérum mannitol',
        'Ringer',
        'Dextrose 5%',
        'Dextrose 10%',
        'DNS 0,33%',
        'DNS 0,225%',
        'NaCl 0,9%',
        'NaCl 0,45%'
    ];
    return serumTypes.includes(department);
}

function updateLocationOptions(department) {
    const locationSelect = document.getElementById('new-med-location');
    if (!locationSelect) return;
    
    const currentValue = locationSelect.value;
    locationSelect.innerHTML = '<option value="">Sélectionner un emplacement</option>';
    
    if (isSerumDepartment(department)) {
        for (let i = 1; i <= 10; i++) {
            const value = `Serum-${i}`;
            locationSelect.innerHTML += `<option value="${value}">${value}</option>`;
        }
    } else {
        for (let i = 1; i <= 20; i++) {
            locationSelect.innerHTML += `<option value="A${i}">A${i}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            locationSelect.innerHTML += `<option value="B${i}">B${i}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            locationSelect.innerHTML += `<option value="C${i}">C${i}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            locationSelect.innerHTML += `<option value="D${i}">D${i}</option>`;
        }
    }
    
    if (currentValue) {
        const optionExists = Array.from(locationSelect.options).some(opt => opt.value === currentValue);
        if (optionExists) {
            locationSelect.value = currentValue;
        }
    }
}

function updateSupplierSelect() {
    const select = document.getElementById('new-med-supplier');
    if (!select) return;
    
    select.innerHTML = '<option value="">Fournisseur</option>';
    state.suppliers.forEach(supplier => {
        select.innerHTML += `<option value="${supplier.id}">${supplier.name} (${supplier.type === 'credit' ? 'Crédit' : 'Comptant'})</option>`;
    });
}

function deliverDirectSale(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert("Transaction non trouvée!");
        return;
    }
    
    if (!transaction.items) {
        alert("Transaction invalide pour cette fonction.");
        return;
    }
    
    for (let item of transaction.items) {
        if (item.delivered) continue;
        const med = state.medicationStock.find(m => m.id === item.medId);
        if (!med) {
            alert(`Médicament ${item.name} non trouvé dans le stock!`);
            return;
        }
        if (med.quantity < item.quantity) {
            alert(`Stock insuffisant pour ${item.name}. Disponible: ${med.quantity}, demandé: ${item.quantity}`);
            return;
        }
    }
    
    transaction.items.forEach(item => {
        if (!item.delivered) {
            const med = state.medicationStock.find(m => m.id === item.medId);
            med.quantity -= item.quantity;
            med.reserved = (med.reserved || 0) - item.quantity;
            item.delivered = true;
        }
    });
    
    transaction.deliveryStatus = 'delivered';
    transaction.deliveryDate = new Date().toISOString().split('T')[0];
    transaction.deliveryTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    transaction.deliveredBy = state.currentUser.username;
    
    alert("Médicaments délivrés avec succès!");
    
    const currentPatientId = document.getElementById('pharmacy-patient-id').textContent;
    if (currentPatientId) {
        const patient = state.patients.find(p => p.id === currentPatientId);
        if (patient) {
            displayPatientDetails(patient);
        }
    }
    updateMedicationStock();
}

function deliverMedication(transactionId) {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (!transaction) {
        alert("Transaction non trouvée!");
        return;
    }
    
    if (transaction.items) {
        return deliverDirectSale(transactionId);
    }
    
    const med = state.medicationStock.find(m => m.id === transaction.medicationId);
    if (!med) {
        alert("Médicament non trouvé dans le stock!");
        return;
    }
    
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
    
    const currentPatientId = document.getElementById('pharmacy-patient-id').textContent;
    if (currentPatientId) {
        const patient = state.patients.find(p => p.id === currentPatientId);
        if (patient) {
            displayPatientDetails(patient);
        }
    }
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
    document.getElementById('new-med-supplier').selectedIndex = 0;
    document.getElementById('new-med-purchase-type').value = 'cash';
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
    const supplier = document.getElementById('new-med-supplier').value;
    const purchaseType = document.getElementById('new-med-purchase-type').value;
    
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
    
    const existingMed = state.medicationStock.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existingMed) {
        alert(`Un médicament avec le nom "${name}" existe déjà (ID: ${existingMed.id}). Veuillez utiliser un nom différent ou modifier l\'existant.`);
        return;
    }
    
    if (isSerumDepartment(department) && !location.startsWith('Serum-')) {
        alert("Pour un département de type sérum, l'emplacement doit être dans la zone Serum (Serum-1 à Serum-10).");
        return;
    }
    if (!isSerumDepartment(department) && location.startsWith('Serum-')) {
        alert("Les emplacements Serum sont réservés aux sérums. Veuillez choisir un emplacement dans les sections A, B, C ou D.");
        return;
    }
    
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
        supplier: supplier ? parseInt(supplier) : null,
        purchaseType: purchaseType,
        reserved: 0,
        addedDate: new Date().toISOString().split('T')[0],
        addedBy: state.currentUser.username
    };
    
    state.medicationStock.push(newMed);
    
    document.getElementById('new-medication-form').style.display = 'none';
    resetNewMedicationForm();
    
    updateMedicationStock();
    populateMedicationDatalist();
    alert("Médicament ajouté avec succès!");
}

function updateMedicationStock() {
    const container = document.getElementById('medication-stock-list');
    if (!container) return;
    const today = new Date();
    
    let html = '';
    
    state.medicationStock.forEach(med => {
        let statusClass = '';
        let statusText = 'Normal';
        
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
        
        if (med.quantity === 0) {
            statusClass = 'out-of-stock';
            statusText = 'Rupture';
        } else if (med.quantity <= med.alertThreshold && statusClass === '') {
            statusClass = 'low-stock';
            statusText = 'Stock faible';
        }
        
        let expirationDisplay = 'N/A';
        if (med.expirationDate) {
            const expDate = new Date(med.expirationDate);
            expirationDisplay = expDate.toLocaleDateString('fr-FR');
            
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                expirationDisplay += ' <span class="text-danger">(EXPIRÉ)</span>';
            } else if (diffDays <= 30) {
                expirationDisplay += ` <span class="text-warning">(dans ${diffDays} jours)</span>`;
            }
        }
        
        let supplierName = '-';
        if (med.supplier) {
            const supplier = state.suppliers.find(s => s.id === med.supplier);
            supplierName = supplier ? supplier.name : 'Inconnu';
        }
        
        html += `
            <tr class="${statusClass}">
                <td>${med.name}<br><small>${med.genericName || ''}</small></td>
                <td>${med.form}</td>
                <td>${med.department || '-'}</td>
                <td>${med.quantity} ${med.unit}</td>
                <td>${med.alertThreshold} ${med.unit}</td>
                <td>${med.price.toFixed(2)} Gdes</td>
                <td>${expirationDisplay}</td>
                <td>${supplierName}</td>
                <td>${med.location || '-'}</td>
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
    populateMedicationDatalist();
}

function updateLowStockMedications() {
    const lowStock = state.medicationStock.filter(med => 
        med.quantity <= med.alertThreshold
    );
    
    const container = document.getElementById('low-stock-medications');
    if (!container) return;
    
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
    if (!container) return;
    
    if (expiringSoon.length === 0 && expired.length === 0) {
        container.innerHTML = '<p>Aucun médicament bientôt expiré ou expiré.</p>';
        return;
    }
    
    let html = '<table class="table-container"><thead><tr><th>Médicament</th><th>Département</th><th>Date expiration</th><th>Stock</th><th>Emplacement</th><th>Statut</th></tr></thead><tbody>';
    
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
    
    let formHtml = `
        <div class="card">
            <h4>Modifier le médicament: ${med.name}</h4>
            <div class="form-group">
                <label>Nom commercial:</label>
                <input type="text" id="edit-med-name" class="form-control" value="${med.name}">
            </div>
            <div class="form-group">
                <label>Nom générique:</label>
                <input type="text" id="edit-med-generic" class="form-control" value="${med.genericName || ''}">
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
                <label>Fournisseur:</label>
                <select id="edit-med-supplier" class="form-control">
                    ${getSupplierOptions(med.supplier)}
                </select>
            </div>
            <div class="form-group">
                <label>Type d'achat:</label>
                <select id="edit-med-purchase-type" class="form-control">
                    <option value="cash" ${med.purchaseType === 'cash' ? 'selected' : ''}>Comptant</option>
                    <option value="credit" ${med.purchaseType === 'credit' ? 'selected' : ''}>Crédit</option>
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
                    ${getLocationOptions(med.department, med.location)}
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
    
    const deptSelect = document.getElementById('edit-med-department');
    if (deptSelect) {
        deptSelect.addEventListener('change', function() {
            const locationSelect = document.getElementById('edit-med-location');
            if (locationSelect) {
                const currentLocation = locationSelect.value;
                locationSelect.innerHTML = getLocationOptions(this.value, currentLocation);
            }
        });
    }
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

function getSupplierOptions(selectedSupplierId) {
    let options = '<option value="">Aucun</option>';
    state.suppliers.forEach(s => {
        options += `<option value="${s.id}" ${s.id === selectedSupplierId ? 'selected' : ''}>${s.name} (${s.type})</option>`;
    });
    return options;
}

function getLocationOptions(department, selectedLocation) {
    let options = '<option value="">Sélectionner un emplacement</option>';
    
    if (isSerumDepartment(department)) {
        for (let i = 1; i <= 10; i++) {
            const value = `Serum-${i}`;
            options += `<option value="${value}" ${value === selectedLocation ? 'selected' : ''}>${value}</option>`;
        }
    } else {
        for (let i = 1; i <= 20; i++) {
            const value = `A${i}`;
            options += `<option value="${value}" ${value === selectedLocation ? 'selected' : ''}>${value}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            const value = `B${i}`;
            options += `<option value="${value}" ${value === selectedLocation ? 'selected' : ''}>${value}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            const value = `C${i}`;
            options += `<option value="${value}" ${value === selectedLocation ? 'selected' : ''}>${value}</option>`;
        }
        for (let i = 1; i <= 18; i++) {
            const value = `D${i}`;
            options += `<option value="${value}" ${value === selectedLocation ? 'selected' : ''}>${value}</option>`;
        }
    }
    
    return options;
}

function saveMedicationEdit(medId) {
    const med = state.medicationStock.find(m => m.id === medId);
    if (!med) return;
    
    const newName = document.getElementById('edit-med-name').value.trim();
    
    const existingMed = state.medicationStock.find(m => 
        m.id !== medId && m.name.toLowerCase() === newName.toLowerCase()
    );
    if (existingMed) {
        alert(`Un autre médicament avec le nom "${newName}" existe déjà (ID: ${existingMed.id}). Veuillez choisir un nom différent.`);
        return;
    }
    
    const newDepartment = document.getElementById('edit-med-department').value;
    const newLocation = document.getElementById('edit-med-location').value;
    
    if (isSerumDepartment(newDepartment) && !newLocation.startsWith('Serum-')) {
        alert("Pour un département de type sérum, l'emplacement doit être dans la zone Serum (Serum-1 à Serum-10).");
        return;
    }
    if (!isSerumDepartment(newDepartment) && newLocation.startsWith('Serum-')) {
        alert("Les emplacements Serum sont réservés aux sérums. Veuillez choisir un emplacement dans les sections A, B, C ou D.");
        return;
    }
    
    med.name = newName;
    med.genericName = document.getElementById('edit-med-generic').value.trim();
    med.form = document.getElementById('edit-med-form').value;
    med.unit = document.getElementById('edit-med-unit').value.trim();
    med.quantity = parseInt(document.getElementById('edit-med-quantity').value);
    med.alertThreshold = parseInt(document.getElementById('edit-med-alert').value);
    med.price = parseFloat(document.getElementById('edit-med-price').value);
    med.expirationDate = document.getElementById('edit-med-expiration').value || null;
    med.location = newLocation;
    med.department = newDepartment;
    med.supplier = document.getElementById('edit-med-supplier').value ? parseInt(document.getElementById('edit-med-supplier').value) : null;
    med.purchaseType = document.getElementById('edit-med-purchase-type').value;
    med.lastModified = new Date().toISOString().split('T')[0];
    med.modifiedBy = state.currentUser.username;
    
    alert("Médicament modifié avec succès!");
    document.getElementById('edit-medication-modal').remove();
    updateMedicationStock();
    populateMedicationDatalist();
}

let directSaleItems = [];

function populateMedicationDatalist() {
    const datalist = document.getElementById('medications-datalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    state.medicationStock.forEach(med => {
        const option = document.createElement('option');
        option.value = med.name;
        datalist.appendChild(option);
    });
}

function addDirectSaleItem() {
    const searchInput = document.getElementById('direct-sale-med-name');
    const medName = searchInput.value.trim();
    const quantity = parseInt(document.getElementById('direct-sale-quantity').value);
    
    if (!medName || !quantity || quantity <= 0) {
        alert("Veuillez saisir un nom de médicament et une quantité valide.");
        return;
    }
    
    const med = state.medicationStock.find(m => 
        m.name.toLowerCase() === medName.toLowerCase() || 
        (m.genericName && m.genericName.toLowerCase() === medName.toLowerCase())
    );
    
    if (!med) {
        alert("Médicament non trouvé dans le stock. Vérifiez le nom.");
        return;
    }
    
    if (quantity > med.quantity) {
        alert(`Stock insuffisant. Disponible: ${med.quantity} ${med.unit}`);
        return;
    }
    
    const existing = directSaleItems.find(item => item.medId === med.id);
    if (existing) {
        existing.quantity += quantity;
        existing.total = existing.quantity * existing.price;
    } else {
        directSaleItems.push({
            medId: med.id,
            name: med.name,
            quantity: quantity,
            price: med.price,
            total: quantity * med.price
        });
    }
    
    updateDirectSaleDisplay();
    searchInput.value = '';
    document.getElementById('direct-sale-quantity').value = '';
}

function updateDirectSaleDisplay() {
    const container = document.getElementById('direct-sale-items');
    if (!container) return;
    
    let html = '<table class="table-container"><thead><tr><th>Médicament</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th><th>Action</th></tr></thead><tbody>';
    let total = 0;
    directSaleItems.forEach((item, index) => {
        total += item.total;
        html += `<tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.price} Gdes</td>
            <td>${item.total} Gdes</td>
            <td><button class="btn btn-sm btn-danger" onclick="removeDirectSaleItem(${index})">Supprimer</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html || '<p>Aucun article ajouté.</p>';
    document.getElementById('direct-sale-total').textContent = total;
}

function removeDirectSaleItem(index) {
    directSaleItems.splice(index, 1);
    updateDirectSaleDisplay();
}

function printDirectSaleSlip() {
    if (directSaleItems.length === 0) {
        alert("Aucun article à vendre.");
        return;
    }
    
    let directPatient = state.patients.find(p => p.id === 'DIRECT');
    if (!directPatient) {
        directPatient = {
            id: 'DIRECT',
            fullName: 'Vente directe (client)',
            age: '',
            gender: '',
            phone: '',
            address: '',
            hospitalized: false,
            vip: false,
            hasCreditPrivilege: false
        };
        state.patients.push(directPatient);
    }
    
    const totalAmount = directSaleItems.reduce((sum, item) => sum + item.total, 0);
    
    const transaction = {
        id: 'DS' + Date.now(),
        patientId: 'DIRECT',
        patientName: directPatient.fullName,
        service: 'Vente directe de médicaments',
        amount: totalAmount,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        createdBy: state.currentUser.username,
        type: 'medication',
        isDirectSale: true,
        items: directSaleItems.map(item => ({ ...item, delivered: false })),
        notificationSent: false
    };
    
    state.transactions.push(transaction);
    
    directSaleItems.forEach(item => {
        const med = state.medicationStock.find(m => m.id === item.medId);
        if (med) {
            med.reserved = (med.reserved || 0) + item.quantity;
        }
    });
    
    sendNotificationToCashier(transaction);
    
    printDirectSaleSlipDocument(transaction);
    
    directSaleItems = [];
    updateDirectSaleDisplay();
    updateMedicationStock();
    showNotification(`Bon de caisse imprimé pour ${totalAmount} Gdes. Envoyez le patient à la caisse.`, 'success');
}

function printDirectSaleSlipDocument(transaction) {
    const slipContent = `
        <div class="print-receipt" style="width: 80mm; margin: 0 auto; font-family: Arial, sans-serif;">
            <div class="text-center">
                <h3>${document.getElementById('hospital-name-header')?.textContent || 'Hôpital'}</h3>
                <p>${document.getElementById('hospital-address-header')?.textContent || ''}</p>
                <h4>BON DE CAISSE</h4>
                <p>Vente directe</p>
            </div>
            <hr>
            <div>
                <p><strong>Transaction N°:</strong> ${transaction.id}</p>
                <p><strong>Date:</strong> ${transaction.date} ${transaction.time}</p>
                <p><strong>Agent:</strong> ${transaction.createdBy}</p>
            </div>
            <hr>
            <h4>Articles</h4>
            ${transaction.items.map(item => `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span>${item.name} x${item.quantity}</span>
                    <span>${item.total} Gdes</span>
                </div>
            `).join('')}
            <hr>
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>TOTAL À PAYER:</span>
                <span>${transaction.amount} Gdes</span>
            </div>
            <hr>
            <div class="text-center">
                <p>Présentez ce bon à la caisse pour paiement.</p>
                <p>Après paiement, revenez avec le reçu pour récupérer vos médicaments.</p>
                <p style="font-size: 12px;">Merci de votre visite!</p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Bon de caisse</title>
            <style>
                body { padding: 20px; }
                .text-center { text-align: center; }
                hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            </style>
        </head>
        <body>${slipContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function sendNotificationToCashier(transaction) {
    const content = `Nouvelle vente directe: ${transaction.amount} Gdes. Transaction #${transaction.id}. Patient à la caisse.`;
    
    const cashiers = state.users.filter(u => u.active && u.role === 'cashier' && u.username !== state.currentUser.username);
    cashiers.forEach(user => {
        const message = {
            id: 'MSG' + Date.now() + Math.random(),
            sender: state.currentUser.username,
            senderRole: state.currentRole,
            recipient: user.username,
            recipientRole: user.role,
            subject: 'Vente directe à payer',
            content: content,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'direct_sale_notification'
        };
        state.messages.push(message);
    });
    
    showNotification(`Notification envoyée à la caisse`, 'info');
}

function confirmDirectSale() {
    if (directSaleItems.length === 0) {
        alert("Aucun article à vendre.");
        return;
    }
    
    let directPatient = state.patients.find(p => p.id === 'DIRECT');
    if (!directPatient) {
        directPatient = {
            id: 'DIRECT',
            fullName: 'Vente directe (client)',
            age: '',
            gender: '',
            phone: '',
            address: '',
            hospitalized: false,
            vip: false,
            hasCreditPrivilege: false
        };
        state.patients.push(directPatient);
    }
    
    const totalAmount = directSaleItems.reduce((sum, item) => sum + item.total, 0);
    
    const transaction = {
        id: 'TR' + Date.now(),
        patientId: 'DIRECT',
        patientName: directPatient.fullName,
        service: 'Vente directe de médicaments',
        amount: totalAmount,
        status: 'unpaid',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        createdBy: state.currentUser.username,
        type: 'medication',
        isDirectSale: true,
        items: directSaleItems.map(item => ({ ...item, delivered: false })),
        notificationSent: false
    };
    
    state.transactions.push(transaction);
    
    directSaleItems.forEach(item => {
        const med = state.medicationStock.find(m => m.id === item.medId);
        if (med) {
            med.reserved = (med.reserved || 0) + item.quantity;
        }
    });
    
    sendNotificationToCashier(transaction);
    
    alert(`Vente enregistrée. Transaction #${transaction.id} créée pour ${totalAmount} Gdes. Le client doit payer à la caisse.`);
    
    directSaleItems = [];
    updateDirectSaleDisplay();
    updateMedicationStock();
}

window.deliverMedication = deliverMedication;
window.deliverDirectSale = deliverDirectSale;
window.restockMedication = restockMedication;
window.editMedication = editMedication;
window.saveMedicationEdit = saveMedicationEdit;
window.removeDirectSaleItem = removeDirectSaleItem;
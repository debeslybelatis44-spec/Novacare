// Module Caisse
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cashier-patient-search')) {
        setupCashier();
    }
});

function setupCashier() {
    let selectedServices = [];
    let currentCashierPatient = null;
    let currentPaidServices = [];
    
    document.getElementById('search-cashier-patient').addEventListener('click', () => {
        const search = document.getElementById('cashier-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        currentCashierPatient = patient;
        document.getElementById('cashier-patient-name').textContent = patient.fullName;
        document.getElementById('cashier-patient-id').textContent = patient.id;
        document.getElementById('cashier-patient-details').classList.remove('hidden');
        
        const unpaidTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.status === 'unpaid'
        );
        
        let html = '';
        let total = 0;
        selectedServices = [];
        
        unpaidTransactions.forEach(transaction => {
            let amount = transaction.amount;
            let discountApplied = false;
            
            if (patient.sponsored && patient.discountPercentage > 0) {
                amount = amount * (1 - patient.discountPercentage / 100);
                discountApplied = true;
            }
            
            total += amount;
            selectedServices.push({
                ...transaction, 
                finalAmount: amount,
                discountApplied: discountApplied,
                discountPercentage: discountApplied ? patient.discountPercentage : 0
            });
            
            html += `
                <div class="service-item">
                    <div>
                        <input type="checkbox" class="service-checkbox" data-id="${transaction.id}" checked>
                        <strong>${transaction.service}</strong>
                        ${discountApplied ? 
                            `<br><small>Réduction ${patient.discountPercentage}% appliquée: ${transaction.amount.toFixed(2)} → ${amount.toFixed(2)} Gdes</small>` : ''}
                    </div>
                    <div>${amount.toFixed(2)} Gdes</div>
                </div>
            `;
        });
        
        if (unpaidTransactions.length === 0) {
            html = '<p>Aucun service à payer.</p>';
        }
        
        document.getElementById('services-to-pay-list').innerHTML = html;
        document.getElementById('total-to-pay').textContent = total.toFixed(2);
        
        // Réinitialiser les champs de paiement
        document.getElementById('amount-given').value = '';
        document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
        document.getElementById('change-result').style.color = '#6c757d';
        
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const transactionId = this.dataset.id;
                if (this.checked) {
                    const transaction = unpaidTransactions.find(t => t.id === transactionId);
                    if (transaction) {
                        let amount = transaction.amount;
                        let discountApplied = false;
                        
                        if (patient.sponsored && patient.discountPercentage > 0) {
                            amount = amount * (1 - patient.discountPercentage / 100);
                            discountApplied = true;
                        }
                        
                        selectedServices.push({
                            ...transaction, 
                            finalAmount: amount,
                            discountApplied: discountApplied,
                            discountPercentage: discountApplied ? patient.discountPercentage : 0
                        });
                    }
                } else {
                    selectedServices = selectedServices.filter(t => t.id !== transactionId);
                }
                
                const newTotal = selectedServices.reduce((sum, t) => sum + t.finalAmount, 0);
                document.getElementById('total-to-pay').textContent = newTotal.toFixed(2);
                document.getElementById('amount-given').value = '';
                document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
                document.getElementById('change-result').style.color = '#6c757d';
            });
        });
        
        updateExternalMedications(patient.id);
    });
    
    document.getElementById('amount-given').addEventListener('input', function() {
        const total = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
        const given = parseFloat(this.value);
        
        if (isNaN(given) || given <= 0) {
            document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
            document.getElementById('change-result').style.color = '#6c757d';
            return;
        }
        
        if (given < total) {
            const missing = total - given;
            document.getElementById('change-result').textContent = `Manquant: ${missing.toFixed(2)} Gdes`;
            document.getElementById('change-result').style.color = '#dc3545';
            return;
        }
        
        const change = given - total;
        document.getElementById('change-result').textContent = `Monnaie: ${change.toFixed(2)} Gdes`;
        document.getElementById('change-result').style.color = '#28a745';
    });
    
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    document.getElementById('mark-as-paid').addEventListener('click', () => {
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        
        const given = parseFloat(document.getElementById('amount-given').value);
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        
        if (isNaN(given) || given <= 0) {
            alert("Veuillez entrer un montant valide!");
            return;
        }
        
        if (given < total) {
            alert(`Montant insuffisant! Il manque ${(total - given).toFixed(2)} Gdes.`);
            return;
        }
        
        const paymentMethodElement = document.querySelector('.payment-method.active');
        if (!paymentMethodElement) {
            alert("Veuillez sélectionner un mode de paiement!");
            return;
        }
        
        const paymentMethod = paymentMethodElement.dataset.method;
        
        // Sauvegarder les services payés pour la facture
        currentPaidServices = [...selectedServices];
        
        selectedServices.forEach(transaction => {
            const transactionIndex = state.transactions.findIndex(t => t.id === transaction.id);
            if (transactionIndex !== -1) {
                state.transactions[transactionIndex].status = 'paid';
                state.transactions[transactionIndex].paymentMethod = paymentMethod;
                state.transactions[transactionIndex].paymentDate = new Date().toISOString().split('T')[0];
                state.transactions[transactionIndex].paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                state.transactions[transactionIndex].paymentAgent = state.currentUser.username;
                
                if (currentCashierPatient.sponsored && currentCashierPatient.discountPercentage > 0) {
                    state.transactions[transactionIndex].finalAmount = state.transactions[transactionIndex].amount * (1 - currentCashierPatient.discountPercentage / 100);
                }
                
                sendPaymentNotification(state.transactions[transactionIndex]);
            }
        });
        
        alert("Paiement enregistré avec succès!");
        
        // Générer la facture avant de recharger
        generateInvoice(currentPaidServices);
        
        // Recharger les informations du patient
        document.getElementById('search-cashier-patient').click();
    });
    
    document.getElementById('print-invoice').addEventListener('click', () => {
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        generateInvoice(selectedServices);
    });
}

function updateExternalMedications(patientId) {
    const medTransactions = state.transactions.filter(t => 
        t.patientId === patientId && 
        t.type === 'medication' &&
        t.status === 'paid'
    );
    
    const externalMeds = [];
    
    medTransactions.forEach(transaction => {
        const med = state.medicationStock.find(m => m.id === transaction.medicationId);
        if (!med || med.quantity < transaction.quantity) {
            const neededFromOutside = med ? Math.max(0, transaction.quantity - med.quantity) : transaction.quantity;
            externalMeds.push({
                name: transaction.service.replace('Médicament: ', ''),
                quantity: transaction.quantity,
                needed: neededFromOutside
            });
        }
    });
    
    const container = document.getElementById('external-medications-container');
    const list = document.getElementById('external-medications-list');
    
    if (externalMeds.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    let html = '<p>Les médicaments suivants doivent être achetés ailleurs:</p><ul>';
    externalMeds.forEach(med => {
        html += `<li><strong>${med.name}</strong> - Quantité nécessaire: ${med.needed}</li>`;
    });
    html += '</ul>';
    
    list.innerHTML = html;
    container.classList.remove('hidden');
}

function generateInvoice(servicesToInvoice = null) {
    const search = document.getElementById('cashier-patient-search').value.toLowerCase();
    const patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    // Utiliser les services passés en paramètre ou les services sélectionnés actuels
    const services = servicesToInvoice || selectedServices;
    
    if (!services || services.length === 0) {
        alert("Aucun service à facturer!");
        return;
    }
    
    // Récupérer les valeurs des champs
    const given = parseFloat(document.getElementById('amount-given').value) || 0;
    const total = services.reduce((sum, t) => sum + t.finalAmount, 0);
    const change = given - total;
    
    const paymentMethodElement = document.querySelector('.payment-method.active');
    const selectedMethod = paymentMethodElement ? paymentMethodElement.dataset.method : 'Non spécifié';
    
    // Mettre à jour les informations de l'hôpital
    if (document.getElementById('hospital-name')) {
        document.getElementById('invoice-hospital-name').textContent = document.getElementById('hospital-name').value || 'Hôpital';
    }
    if (document.getElementById('hospital-address')) {
        document.getElementById('invoice-hospital-address').textContent = document.getElementById('hospital-address').value || '';
    }
    if (document.getElementById('hospital-phone')) {
        document.getElementById('invoice-hospital-phone').textContent = document.getElementById('hospital-phone').value || '';
    }
    
    if (state.hospitalLogo) {
        document.getElementById('invoice-logo').src = state.hospitalLogo;
        document.getElementById('invoice-logo').style.display = 'block';
    } else {
        document.getElementById('invoice-logo').style.display = 'none';
    }
    
    // Mettre à jour les informations du patient
    document.getElementById('invoice-patient-name').textContent = patient.fullName;
    document.getElementById('invoice-patient-id').textContent = patient.id;
    document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('invoice-time').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Mettre à jour les montants
    document.getElementById('invoice-total-amount').textContent = total.toFixed(2) + ' Gdes';
    document.getElementById('invoice-amount-given').textContent = given.toFixed(2) + ' Gdes';
    document.getElementById('invoice-change').textContent = change.toFixed(2) + ' Gdes';
    document.getElementById('invoice-payment-method').textContent = selectedMethod;
    document.getElementById('invoice-number').textContent = 'INV' + Date.now();
    
    // Mettre à jour la liste des services
    let servicesHtml = '';
    services.forEach(transaction => {
        servicesHtml += `
            <div class="receipt-item">
                <span>${transaction.service}</span>
                <span>${transaction.finalAmount.toFixed(2)} Gdes</span>
            </div>
        `;
    });
    
    document.getElementById('invoice-services-list').innerHTML = servicesHtml;
    
    // Afficher la facture
    const container = document.getElementById('invoice-container');
    container.classList.remove('hidden');
    
    // Configurer l'impression
    setTimeout(() => {
        const printContent = container.innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        
        // Restaurer les écouteurs d'événements
        setupCashier();
        
        container.classList.add('hidden');
    }, 500);
}

// Fonction pour envoyer les notifications de paiement (si elle existe ailleurs)
function sendPaymentNotification(transaction) {
    // Implémentation de la notification
    console.log('Notification de paiement envoyée pour:', transaction);
}
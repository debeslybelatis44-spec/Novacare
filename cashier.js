// Module Caisse
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cashier-patient-search')) {
        setupCashier();
    }
});

function setupCashier() {
    let selectedServices = [];
    let currentCashierPatient = null;
    
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
            if (patient.sponsored && patient.discountPercentage > 0) {
                amount = amount * (1 - patient.discountPercentage / 100);
            }
            
            total += amount;
            selectedServices.push({...transaction, finalAmount: amount});
            
            html += `
                <div class="service-item">
                    <div>
                        <input type="checkbox" class="service-checkbox" data-id="${transaction.id}" checked>
                        <strong>${transaction.service}</strong>
                        ${patient.sponsored && patient.discountPercentage > 0 ? 
                            `<br><small>Réduction ${patient.discountPercentage}% appliquée: ${transaction.amount} → ${amount.toFixed(2)} Gdes</small>` : ''}
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
        
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const transactionId = this.dataset.id;
                if (this.checked) {
                    const transaction = unpaidTransactions.find(t => t.id === transactionId);
                    if (transaction) {
                        let amount = transaction.amount;
                        if (patient.sponsored && patient.discountPercentage > 0) {
                            amount = amount * (1 - patient.discountPercentage / 100);
                        }
                        selectedServices.push({...transaction, finalAmount: amount});
                    }
                } else {
                    selectedServices = selectedServices.filter(t => t.id !== transactionId);
                }
                
                const newTotal = selectedServices.reduce((sum, t) => sum + t.finalAmount, 0);
                document.getElementById('total-to-pay').textContent = newTotal.toFixed(2);
                document.getElementById('amount-given').value = '';
                document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
            });
        });
        
        updateExternalMedications(patient.id);
    });
    
    document.getElementById('amount-given').addEventListener('input', function() {
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        const given = parseFloat(this.value);
        
        if (isNaN(given)) {
            document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes';
            return;
        }
        
        if (given < total) {
            document.getElementById('change-result').textContent = `Manquant: ${(total - given).toFixed(2)} Gdes`;
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
        
        if (isNaN(given) || given < total) {
            alert("Veuillez entrer un montant valide et suffisant!");
            return;
        }
        
        const paymentMethod = document.querySelector('.payment-method.active').dataset.method;
        
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
        
        document.getElementById('search-cashier-patient').click();
        
        generateInvoice();
    });
    
    document.getElementById('print-invoice').addEventListener('click', () => {
        generateInvoice();
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
            externalMeds.push({
                name: transaction.service.replace('Médicament: ', ''),
                quantity: transaction.quantity,
                needed: transaction.quantity - (med ? med.quantity : 0)
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
        html += `<li><strong>${med.name}</strong> - Quantité nécessaire: ${med.needed > 0 ? med.needed : med.quantity}</li>`;
    });
    html += '</ul>';
    
    list.innerHTML = html;
    container.classList.remove('hidden');
}

function generateInvoice() {
    const search = document.getElementById('cashier-patient-search').value.toLowerCase();
    const patient = state.patients.find(p => 
        p.id.toLowerCase() === search || 
        p.fullName.toLowerCase().includes(search)
    );
    
    if (!patient) {
        alert("Veuillez d'abord rechercher un patient!");
        return;
    }
    
    const unpaidTransactions = state.transactions.filter(t => 
        t.patientId === patient.id && 
        t.status === 'unpaid'
    );
    
    const selectedMethod = document.querySelector('.payment-method.active').dataset.method;
    const given = parseFloat(document.getElementById('amount-given').value) || 0;
    const total = unpaidTransactions.reduce((sum, t) => {
        let amount = t.amount;
        if (patient.sponsored && patient.discountPercentage > 0) {
            amount = amount * (1 - patient.discountPercentage / 100);
        }
        return sum + amount;
    }, 0);
    const change = given - total;
    
    document.getElementById('invoice-hospital-name').textContent = document.getElementById('hospital-name').value;
    document.getElementById('invoice-hospital-address').textContent = document.getElementById('hospital-address').value;
    document.getElementById('invoice-hospital-phone').textContent = document.getElementById('hospital-phone').value;
    
    if (state.hospitalLogo) {
        document.getElementById('invoice-logo').src = state.hospitalLogo;
        document.getElementById('invoice-logo').style.display = 'block';
    }
    
    document.getElementById('invoice-patient-name').textContent = patient.fullName;
    document.getElementById('invoice-patient-id').textContent = patient.id;
    document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('invoice-time').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('invoice-total-amount').textContent = total.toFixed(2);
    document.getElementById('invoice-amount-given').textContent = given.toFixed(2) + ' Gdes';
    document.getElementById('invoice-change').textContent = change.toFixed(2) + ' Gdes';
    document.getElementById('invoice-payment-method').textContent = selectedMethod;
    document.getElementById('invoice-number').textContent = 'INV' + Date.now();
    
    let servicesHtml = '';
    unpaidTransactions.forEach(transaction => {
        let amount = transaction.amount;
        if (patient.sponsored && patient.discountPercentage > 0) {
            amount = amount * (1 - patient.discountPercentage / 100);
        }
        
        servicesHtml += `
            <div class="receipt-item">
                <span>${transaction.service}</span>
                <span>${amount.toFixed(2)} Gdes</span>
            </div>
        `;
    });
    
    document.getElementById('invoice-services-list').innerHTML = servicesHtml;
    
    const container = document.getElementById('invoice-container');
    container.classList.remove('hidden');
    
    setTimeout(() => {
        window.print();
        container.classList.add('hidden');
    }, 500);
}
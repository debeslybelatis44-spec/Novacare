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
    
    // Taux de change modifiable (par défaut: 1 USD = 130 HTG)
    let exchangeRate = 130;
    
    // Initialiser le taux de change
    const exchangeRateInput = document.getElementById('exchange-rate');
    if (exchangeRateInput) {
        exchangeRate = parseFloat(exchangeRateInput.value) || 130;
        exchangeRateInput.addEventListener('input', function() {
            exchangeRate = parseFloat(this.value) || 130;
            updateCurrencyDisplay();
        });
    }
    
    function updateCurrencyDisplay() {
        const totalHTG = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
        const totalUSD = totalHTG / exchangeRate;
        
        // Mettre à jour l'affichage du total en USD
        const totalUSDDisplay = document.getElementById('total-to-pay-usd');
        if (totalUSDDisplay) {
            totalUSDDisplay.textContent = totalUSD.toFixed(2);
        }
        
        // Mettre à jour l'affichage de la monnaie si un montant est déjà saisi
        const amountGiven = document.getElementById('amount-given').value;
        if (amountGiven) {
            calculateChange();
        }
    }
    
    function calculateChange() {
        const totalHTG = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
        const totalUSD = totalHTG / exchangeRate;
        const given = parseFloat(document.getElementById('amount-given').value) || 0;
        const paymentCurrency = document.querySelector('.payment-method-currency.active')?.dataset.currency || 'HTG';
        
        if (isNaN(given) || given <= 0) {
            document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes / 0 $';
            document.getElementById('change-result').style.color = '#6c757d';
            return;
        }
        
        // Vérifier si le montant donné est suffisant
        if (paymentCurrency === 'USD') {
            // Le montant donné est en USD, comparer avec totalUSD
            if (given < totalUSD) {
                const missingUSD = totalUSD - given;
                const missingHTG = missingUSD * exchangeRate;
                document.getElementById('change-result').textContent = `Manquant: ${missingUSD.toFixed(2)} $ (${missingHTG.toFixed(2)} Gdes)`;
                document.getElementById('change-result').style.color = '#dc3545';
                return;
            }
            
            const changeUSD = given - totalUSD;
            const changeHTG = changeUSD * exchangeRate;
            document.getElementById('change-result').textContent = `Monnaie: ${changeUSD.toFixed(2)} $ (${changeHTG.toFixed(2)} Gdes)`;
            document.getElementById('change-result').style.color = '#28a745';
        } else {
            // Le montant donné est en HTG, comparer avec totalHTG
            if (given < totalHTG) {
                const missingHTG = totalHTG - given;
                const missingUSD = missingHTG / exchangeRate;
                document.getElementById('change-result').textContent = `Manquant: ${missingHTG.toFixed(2)} Gdes (${missingUSD.toFixed(2)} $)`;
                document.getElementById('change-result').style.color = '#dc3545';
                return;
            }
            
            const changeHTG = given - totalHTG;
            const changeUSD = changeHTG / exchangeRate;
            document.getElementById('change-result').textContent = `Monnaie: ${changeHTG.toFixed(2)} Gdes (${changeUSD.toFixed(2)} $)`;
            document.getElementById('change-result').style.color = '#28a745';
        }
    }
    
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
        
        // Mettre à jour l'affichage en USD
        updateCurrencyDisplay();
        
        // Réinitialiser les champs de paiement
        document.getElementById('amount-given').value = '';
        document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes / 0 $';
        document.getElementById('change-result').style.color = '#6c757d';
        
        // Réinitialiser la sélection de devise de paiement
        document.querySelectorAll('.payment-method-currency').forEach(btn => {
            btn.classList.remove('active');
        });
        const defaultCurrencyBtn = document.querySelector('.payment-method-currency[data-currency="HTG"]');
        if (defaultCurrencyBtn) {
            defaultCurrencyBtn.classList.add('active');
        }
        
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
                updateCurrencyDisplay();
                document.getElementById('amount-given').value = '';
                document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes / 0 $';
                document.getElementById('change-result').style.color = '#6c757d';
            });
        });
        
        updateExternalMedications(patient.id);
    });
    
    document.getElementById('amount-given').addEventListener('input', function() {
        calculateChange();
    });
    
    // Gestion des devises de paiement (HTG ou USD)
    document.querySelectorAll('.payment-method-currency').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method-currency').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            
            // Mettre à jour le calcul si un montant est déjà saisi
            const amountGiven = document.getElementById('amount-given').value;
            if (amountGiven) {
                calculateChange();
            }
        });
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
        
        const given = parseFloat(document.getElementById('amount-given').value) || 0;
        const paymentCurrency = document.querySelector('.payment-method-currency.active')?.dataset.currency || 'HTG';
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        const totalUSD = total / exchangeRate;
        
        if (isNaN(given) || given <= 0) {
            alert("Veuillez entrer un montant valide!");
            return;
        }
        
        // Vérifier si le montant est suffisant selon la devise
        if (paymentCurrency === 'USD') {
            if (given < totalUSD) {
                const missingUSD = totalUSD - given;
                const missingHTG = missingUSD * exchangeRate;
                alert(`Montant insuffisant! Il manque ${missingUSD.toFixed(2)} $ (${missingHTG.toFixed(2)} Gdes).`);
                return;
            }
        } else {
            if (given < total) {
                const missingHTG = total - given;
                const missingUSD = missingHTG / exchangeRate;
                alert(`Montant insuffisant! Il manque ${missingHTG.toFixed(2)} Gdes (${missingUSD.toFixed(2)} $).`);
                return;
            }
        }
        
        const paymentMethodElement = document.querySelector('.payment-method.active');
        if (!paymentMethodElement) {
            alert("Veuillez sélectionner un mode de paiement!");
            return;
        }
        
        const paymentMethod = paymentMethodElement.dataset.method;
        
        // Sauvegarder les services payés pour la facture
        currentPaidServices = [...selectedServices];
        
        // Calculer la monnaie à rendre
        let changeHTG = 0;
        let changeUSD = 0;
        
        if (paymentCurrency === 'USD') {
            changeUSD = given - totalUSD;
            changeHTG = changeUSD * exchangeRate;
        } else {
            changeHTG = given - total;
            changeUSD = changeHTG / exchangeRate;
        }
        
        selectedServices.forEach(transaction => {
            const transactionIndex = state.transactions.findIndex(t => t.id === transaction.id);
            if (transactionIndex !== -1) {
                state.transactions[transactionIndex].status = 'paid';
                state.transactions[transactionIndex].paymentMethod = paymentMethod;
                state.transactions[transactionIndex].paymentDate = new Date().toISOString().split('T')[0];
                state.transactions[transactionIndex].paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                state.transactions[transactionIndex].paymentAgent = state.currentUser.username;
                
                // Enregistrer la devise et le taux de change utilisés
                state.transactions[transactionIndex].paymentCurrency = paymentCurrency;
                state.transactions[transactionIndex].exchangeRate = exchangeRate;
                state.transactions[transactionIndex].amountGiven = given;
                state.transactions[transactionIndex].amountGivenInHTG = paymentCurrency === 'USD' ? given * exchangeRate : given;
                
                if (currentCashierPatient.sponsored && currentCashierPatient.discountPercentage > 0) {
                    state.transactions[transactionIndex].finalAmount = state.transactions[transactionIndex].amount * (1 - currentCashierPatient.discountPercentage / 100);
                }
                
                sendPaymentNotification(state.transactions[transactionIndex]);
            }
        });
        
        // Afficher le message de confirmation
        let paymentMessage = "Paiement enregistré avec succès!\n";
        paymentMessage += `Montant total: ${total.toFixed(2)} Gdes (${totalUSD.toFixed(2)} $)\n`;
        paymentMessage += `Montant donné: ${given.toFixed(2)} ${paymentCurrency}\n`;
        
        if (paymentCurrency === 'USD') {
            paymentMessage += `Monnaie rendue: ${changeUSD.toFixed(2)} $ (${changeHTG.toFixed(2)} Gdes)`;
        } else {
            paymentMessage += `Monnaie rendue: ${changeHTG.toFixed(2)} Gdes (${changeUSD.toFixed(2)} $)`;
        }
        
        alert(paymentMessage);
        
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
        const totalUSD = total / exchangeRate;
        
        // Récupérer la devise de paiement
        const paymentCurrencyElement = document.querySelector('.payment-method-currency.active');
        const paymentCurrency = paymentCurrencyElement ? paymentCurrencyElement.dataset.currency : 'HTG';
        
        const paymentMethodElement = document.querySelector('.payment-method.active');
        const selectedMethod = paymentMethodElement ? paymentMethodElement.dataset.method : 'Non spécifié';
        
        // Calculer la monnaie à rendre
        let givenInHTG = given;
        let changeHTG = 0;
        let changeUSD = 0;
        
        if (paymentCurrency === 'USD') {
            givenInHTG = given * exchangeRate;
            if (given >= totalUSD) {
                changeUSD = given - totalUSD;
                changeHTG = changeUSD * exchangeRate;
            }
        } else {
            if (given >= total) {
                changeHTG = given - total;
                changeUSD = changeHTG / exchangeRate;
            }
        }
        
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
        
        // Mettre à jour les montants avec les deux devises
        document.getElementById('invoice-total-amount').textContent = `${total.toFixed(2)} Gdes (${totalUSD.toFixed(2)} $)`;
        
        // Afficher le montant donné dans la devise appropriée
        if (paymentCurrency === 'USD') {
            document.getElementById('invoice-amount-given').textContent = `${given.toFixed(2)} $ (${givenInHTG.toFixed(2)} Gdes)`;
        } else {
            document.getElementById('invoice-amount-given').textContent = `${given.toFixed(2)} Gdes (${(given/exchangeRate).toFixed(2)} $)`;
        }
        
        // Afficher la monnaie rendue dans la devise appropriée
        if (paymentCurrency === 'USD') {
            if (given >= totalUSD) {
                document.getElementById('invoice-change').textContent = `${changeUSD.toFixed(2)} $ (${changeHTG.toFixed(2)} Gdes)`;
            } else {
                const missingUSD = totalUSD - given;
                const missingHTG = missingUSD * exchangeRate;
                document.getElementById('invoice-change').textContent = `Manquant: ${missingUSD.toFixed(2)} $ (${missingHTG.toFixed(2)} Gdes)`;
            }
        } else {
            if (given >= total) {
                document.getElementById('invoice-change').textContent = `${changeHTG.toFixed(2)} Gdes (${changeUSD.toFixed(2)} $)`;
            } else {
                const missingHTG = total - given;
                const missingUSD = missingHTG / exchangeRate;
                document.getElementById('invoice-change').textContent = `Manquant: ${missingHTG.toFixed(2)} Gdes (${missingUSD.toFixed(2)} $)`;
            }
        }
        
        document.getElementById('invoice-payment-method').textContent = `${selectedMethod} (${paymentCurrency})`;
        document.getElementById('invoice-number').textContent = 'INV' + Date.now();
        
        // Ajouter le taux de change sur la facture
        const exchangeRateDisplay = document.getElementById('invoice-exchange-rate');
        if (exchangeRateDisplay) {
            exchangeRateDisplay.textContent = `Taux: 1 $ = ${exchangeRate} Gdes`;
        }
        
        // Mettre à jour la liste des services
        let servicesHtml = '';
        services.forEach(transaction => {
            const transactionUSD = transaction.finalAmount / exchangeRate;
            servicesHtml += `
                <div class="receipt-item">
                    <span>${transaction.service}</span>
                    <span>${transaction.finalAmount.toFixed(2)} Gdes (${transactionUSD.toFixed(2)} $)</span>
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

// Fonction pour envoyer les notifications de paiement (si elle existe ailleurs)
function sendPaymentNotification(transaction) {
    // Implémentation de la notification
    console.log('Notification de paiement envoyée pour:', transaction);
}
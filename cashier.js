// Module Caisse
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cashier-patient-search')) {
        setupCashier();
    }
});

function setupCashier() {
    let selectedServices = [];
    let currentCashierPatient = null;
    let exchangeRate = 120; // Taux de change par défaut: 1 USD = 120 Gdes
    let currentCurrency = 'HTG'; // Devise par défaut: Gourdes
    let externalPaymentNotification = null; // Stocker la notification de paiement externe
    
    // Initialiser le taux de change
    document.getElementById('exchange-rate-value').value = exchangeRate;
    document.getElementById('exchange-rate-display').textContent = exchangeRate;
    
    // Mettre à jour le taux de change
    document.getElementById('update-exchange-rate').addEventListener('click', () => {
        const newRate = parseFloat(document.getElementById('exchange-rate-value').value);
        if (!isNaN(newRate) && newRate > 0) {
            exchangeRate = newRate;
            document.getElementById('exchange-rate-display').textContent = exchangeRate;
            
            // Si la devise actuelle est USD, recalculer les montants
            if (currentCurrency === 'USD' && currentCashierPatient) {
                updateDisplayForCurrency();
            }
        } else {
            alert("Veuillez entrer un taux de change valide!");
        }
    });
    
    // Gestion du changement de devise
    document.querySelectorAll('.currency-selector').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.currency-selector').forEach(btn => {
                btn.classList.remove('active');
                btn.querySelector('.badge').classList.add('hidden');
            });
            this.classList.add('active');
            this.querySelector('.badge').classList.remove('hidden');
            
            currentCurrency = this.dataset.currency;
            
            // Mettre à jour l'affichage des montants
            if (currentCashierPatient) {
                updateDisplayForCurrency();
            }
        });
    });
    
    // Recherche patient
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
        
        loadPatientTransactions(patient);
        
        updateExternalMedications(patient.id);
    });
    
    // Simuler la réception d'une notification de paiement externe
    document.getElementById('simulate-external-payment').addEventListener('click', () => {
        simulateExternalPayment();
    });
    
    function loadPatientTransactions(patient) {
        const unpaidTransactions = state.transactions.filter(t => 
            t.patientId === patient.id && 
            t.status === 'unpaid'
        );
        
        let html = '';
        let totalHTG = 0;
        let totalUSD = 0;
        selectedServices = [];
        
        unpaidTransactions.forEach(transaction => {
            let amountHTG = transaction.amount;
            let discountAmount = 0;
            let originalAmount = transaction.amount;
            let serviceCurrency = transaction.currency || 'HTG'; // Devise du service
            
            if (patient.sponsored && patient.discountPercentage > 0) {
                discountAmount = transaction.amount * (patient.discountPercentage / 100);
                amountHTG = transaction.amount - discountAmount;
            }
            
            // Calculer le montant en USD
            let amountUSD = serviceCurrency === 'HTG' ? amountHTG / exchangeRate : amountHTG;
            
            totalHTG += amountHTG;
            totalUSD += amountUSD;
            
            selectedServices.push({
                ...transaction, 
                finalAmountHTG: amountHTG,
                finalAmountUSD: amountUSD,
                originalAmount: originalAmount,
                discountAmount: discountAmount,
                serviceCurrency: serviceCurrency
            });
            
            html += `
                <div class="service-item">
                    <div>
                        <input type="checkbox" class="service-checkbox" data-id="${transaction.id}" checked>
                        <strong>${transaction.service}</strong>
                        <span class="service-currency-badge ${serviceCurrency === 'USD' ? 'badge-usd' : 'badge-htg'}">
                            ${serviceCurrency === 'USD' ? 'USD' : 'HTG'}
                        </span>
                        ${patient.sponsored && patient.discountPercentage > 0 ? 
                            `<br><small>Réduction ${patient.discountPercentage}%: -${discountAmount.toFixed(2)} ${serviceCurrency === 'USD' ? 'USD' : 'Gdes'}</small>` : ''}
                    </div>
                    <div>
                        <div class="service-amount-htg ${currentCurrency === 'USD' ? 'hidden' : ''}">
                            ${amountHTG.toFixed(2)} Gdes
                        </div>
                        <div class="service-amount-usd ${currentCurrency === 'HTG' ? 'hidden' : ''}">
                            ${amountUSD.toFixed(2)} USD
                            ${serviceCurrency === 'HTG' ? `<br><small class="text-muted">(${originalAmount.toFixed(2)} Gdes ÷ ${exchangeRate} = ${amountUSD.toFixed(2)} USD)</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (unpaidTransactions.length === 0) {
            html = '<p>Aucun service à payer.</p>';
        }
        
        document.getElementById('services-to-pay-list').innerHTML = html;
        
        // Mettre à jour les totaux
        updateTotalsDisplay(totalHTG, totalUSD);
        
        // Gérer les checkbox
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const transactionId = this.dataset.id;
                if (this.checked) {
                    const transaction = unpaidTransactions.find(t => t.id === transactionId);
                    if (transaction) {
                        let amountHTG = transaction.amount;
                        let discountAmount = 0;
                        let originalAmount = transaction.amount;
                        let serviceCurrency = transaction.currency || 'HTG';
                        
                        if (patient.sponsored && patient.discountPercentage > 0) {
                            discountAmount = transaction.amount * (patient.discountPercentage / 100);
                            amountHTG = transaction.amount - discountAmount;
                        }
                        
                        let amountUSD = serviceCurrency === 'HTG' ? amountHTG / exchangeRate : amountHTG;
                        
                        selectedServices.push({
                            ...transaction, 
                            finalAmountHTG: amountHTG,
                            finalAmountUSD: amountUSD,
                            originalAmount: originalAmount,
                            discountAmount: discountAmount,
                            serviceCurrency: serviceCurrency
                        });
                    }
                } else {
                    selectedServices = selectedServices.filter(t => t.id !== transactionId);
                }
                
                // Recalculer les totaux
                const newTotalHTG = selectedServices.reduce((sum, t) => sum + t.finalAmountHTG, 0);
                const newTotalUSD = selectedServices.reduce((sum, t) => sum + t.finalAmountUSD, 0);
                
                updateTotalsDisplay(newTotalHTG, newTotalUSD);
                document.getElementById('amount-given').value = '';
                document.getElementById('change-result').textContent = 'Monnaie: 0';
            });
        });
    }
    
    function updateDisplayForCurrency() {
        // Mettre à jour l'affichage des montants des services
        document.querySelectorAll('.service-item').forEach((item, index) => {
            const serviceAmountHTG = item.querySelector('.service-amount-htg');
            const serviceAmountUSD = item.querySelector('.service-amount-usd');
            
            if (currentCurrency === 'USD') {
                serviceAmountHTG.classList.add('hidden');
                serviceAmountUSD.classList.remove('hidden');
            } else {
                serviceAmountHTG.classList.remove('hidden');
                serviceAmountUSD.classList.add('hidden');
            }
        });
        
        // Mettre à jour l'affichage du total
        updateTotalsDisplay(
            selectedServices.reduce((sum, t) => sum + t.finalAmountHTG, 0),
            selectedServices.reduce((sum, t) => sum + t.finalAmountUSD, 0)
        );
        
        // Mettre à jour le placeholder du montant donné
        document.getElementById('amount-given').placeholder = 
            currentCurrency === 'USD' ? 'Montant donné en USD' : 'Montant donné en Gdes';
        
        // Réinitialiser le calcul du change
        document.getElementById('amount-given').value = '';
        document.getElementById('change-result').textContent = 'Monnaie: 0';
    }
    
    function updateTotalsDisplay(totalHTG, totalUSD) {
        // Mettre à jour l'affichage du total selon la devise sélectionnée
        if (currentCurrency === 'USD') {
            document.getElementById('total-to-pay').textContent = totalUSD.toFixed(2);
            document.getElementById('total-currency').textContent = 'USD';
        } else {
            document.getElementById('total-to-pay').textContent = totalHTG.toFixed(2);
            document.getElementById('total-currency').textContent = 'Gdes';
        }
        
        // Afficher aussi le total dans l'autre devise
        document.getElementById('total-htg').textContent = `${totalHTG.toFixed(2)} Gdes`;
        document.getElementById('total-usd').textContent = `${totalUSD.toFixed(2)} USD`;
    }
    
    // Calcul de la monnaie
    document.getElementById('amount-given').addEventListener('input', function() {
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        const given = parseFloat(this.value);
        
        if (isNaN(given)) {
            document.getElementById('change-result').textContent = 
                currentCurrency === 'USD' ? 'Monnaie: 0 USD' : 'Monnaie: 0 Gdes';
            return;
        }
        
        if (given < total) {
            const missing = total - given;
            document.getElementById('change-result').textContent = 
                currentCurrency === 'USD' ? 
                `Manquant: ${missing.toFixed(2)} USD` : 
                `Manquant: ${missing.toFixed(2)} Gdes`;
            document.getElementById('change-result').style.color = '#dc3545';
            return;
        }
        
        const change = given - total;
        document.getElementById('change-result').textContent = 
            currentCurrency === 'USD' ? 
            `Monnaie: ${change.toFixed(2)} USD` : 
            `Monnaie: ${change.toFixed(2)} Gdes`;
        document.getElementById('change-result').style.color = '#28a745';
    });
    
    // Gestion des méthodes de paiement
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            
            // Afficher/masquer les champs spécifiques selon la méthode
            const paymentMethod = this.dataset.method;
            hideAllPaymentDetails();
            
            if (paymentMethod === 'natcash' || paymentMethod === 'moncash') {
                document.getElementById('mobile-money-details').classList.remove('hidden');
                document.getElementById('transaction-id').focus();
            } else if (paymentMethod === 'card') {
                document.getElementById('card-details').classList.remove('hidden');
                document.getElementById('card-number').focus();
            } else if (paymentMethod === 'external') {
                document.getElementById('external-payment-details').classList.remove('hidden');
                document.getElementById('external-confirm-amount').focus();
            }
        });
    });
    
    // Fonction pour masquer tous les champs de détails de paiement
    function hideAllPaymentDetails() {
        document.getElementById('mobile-money-details').classList.add('hidden');
        document.getElementById('card-details').classList.add('hidden');
        document.getElementById('external-payment-details').classList.add('hidden');
    }
    
    // Confirmer le paiement externe
    document.getElementById('confirm-external-payment').addEventListener('click', () => {
        const receivedAmount = parseFloat(document.getElementById('external-confirm-amount').value);
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        
        if (isNaN(receivedAmount) || receivedAmount < total) {
            alert("Veuillez confirmer le montant exact reçu!");
            return;
        }
        
        if (!externalPaymentNotification) {
            alert("Aucune notification de paiement externe reçue. Veuillez vérifier les notifications.");
            return;
        }
        
        // Vérifier si le montant reçu correspond à la notification
        if (Math.abs(receivedAmount - externalPaymentNotification.amount) > 0.01) {
            alert(`Le montant reçu (${receivedAmount}) ne correspond pas à la notification (${externalPaymentNotification.amount}). Veuillez vérifier.`);
            return;
        }
        
        alert("Paiement externe confirmé! Vous pouvez maintenant procéder au paiement.");
        document.getElementById('amount-given').value = receivedAmount;
        
        // Calculer automatiquement la monnaie
        const change = receivedAmount - total;
        document.getElementById('change-result').textContent = 
            currentCurrency === 'USD' ? 
            `Monnaie: ${change.toFixed(2)} USD` : 
            `Monnaie: ${change.toFixed(2)} Gdes`;
        document.getElementById('change-result').style.color = '#28a745';
    });
    
    // Marquer comme payé
    document.getElementById('mark-as-paid').addEventListener('click', () => {
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        
        const paymentMethod = document.querySelector('.payment-method.active').dataset.method;
        
        // Validation selon la méthode de paiement
        if (paymentMethod === 'natcash' || paymentMethod === 'moncash') {
            const transactionId = document.getElementById('transaction-id').value.trim();
            const sentAmount = parseFloat(document.getElementById('mobile-money-amount').value);
            
            if (!transactionId) {
                alert("Veuillez entrer l'identifiant de transaction!");
                return;
            }
            
            if (isNaN(sentAmount) || sentAmount <= 0) {
                alert("Veuillez entrer le montant envoyé!");
                return;
            }
            
            const total = parseFloat(document.getElementById('total-to-pay').textContent);
            if (Math.abs(sentAmount - total) > 0.01) {
                alert(`Le montant envoyé (${sentAmount}) ne correspond pas au total à payer (${total}). Veuillez vérifier.`);
                return;
            }
            
            document.getElementById('amount-given').value = sentAmount;
        } 
        else if (paymentMethod === 'card') {
            const cardNumber = document.getElementById('card-number').value.trim();
            const cardName = document.getElementById('card-name').value.trim();
            
            if (!cardNumber || !cardName) {
                alert("Veuillez entrer le numéro de compte et le nom sur la carte!");
                return;
            }
            
            if (cardNumber.length < 16) {
                alert("Le numéro de compte doit contenir au moins 16 chiffres!");
                return;
            }
        }
        else if (paymentMethod === 'external') {
            if (!externalPaymentNotification) {
                alert("Veuillez d'abord vérifier et confirmer la notification de paiement externe!");
                return;
            }
        }
        
        const given = parseFloat(document.getElementById('amount-given').value);
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        
        if (isNaN(given) || given < total) {
            alert("Veuillez entrer un montant valide et suffisant!");
            return;
        }
        
        // Collecter les informations supplémentaires selon la méthode
        let paymentDetails = {
            method: paymentMethod
        };
        
        if (paymentMethod === 'natcash' || paymentMethod === 'moncash') {
            paymentDetails.transactionId = document.getElementById('transaction-id').value.trim();
            paymentDetails.sentAmount = document.getElementById('mobile-money-amount').value;
        } 
        else if (paymentMethod === 'card') {
            paymentDetails.cardNumber = document.getElementById('card-number').value.trim();
            paymentDetails.cardName = document.getElementById('card-name').value.trim();
            // Masquer partiellement le numéro de carte pour la sécurité
            paymentDetails.maskedCardNumber = '**** **** **** ' + paymentDetails.cardNumber.slice(-4);
        }
        else if (paymentMethod === 'external') {
            paymentDetails.externalRef = externalPaymentNotification.reference;
            paymentDetails.externalApp = externalPaymentNotification.appName;
            paymentDetails.confirmedBy = state.currentUser.username;
        }
        
        selectedServices.forEach(transaction => {
            const transactionIndex = state.transactions.findIndex(t => t.id === transaction.id);
            if (transactionIndex !== -1) {
                state.transactions[transactionIndex].status = 'paid';
                state.transactions[transactionIndex].paymentMethod = paymentMethod;
                state.transactions[transactionIndex].paymentDate = new Date().toISOString().split('T')[0];
                state.transactions[transactionIndex].paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                state.transactions[transactionIndex].paymentAgent = state.currentUser.username;
                state.transactions[transactionIndex].paymentCurrency = currentCurrency;
                state.transactions[transactionIndex].exchangeRate = currentCurrency === 'USD' ? exchangeRate : null;
                state.transactions[transactionIndex].paymentDetails = paymentDetails;
                
                if (currentCashierPatient.sponsored && currentCashierPatient.discountPercentage > 0) {
                    state.transactions[transactionIndex].finalAmount = state.transactions[transactionIndex].amount * (1 - currentCashierPatient.discountPercentage / 100);
                }
                
                sendPaymentNotification(state.transactions[transactionIndex]);
            }
        });
        
        alert("Paiement enregistré avec succès!");
        
        generateInvoice(selectedServices, currentCashierPatient, given, paymentMethod, currentCurrency, exchangeRate, paymentDetails);
        
        // Réinitialiser les champs
        hideAllPaymentDetails();
        document.getElementById('transaction-id').value = '';
        document.getElementById('mobile-money-amount').value = '';
        document.getElementById('card-number').value = '';
        document.getElementById('card-name').value = '';
        document.getElementById('external-confirm-amount').value = '';
        externalPaymentNotification = null;
        
        // Recharger les transactions
        loadPatientTransactions(currentCashierPatient);
    });
    
    // Simuler une notification de paiement externe (pour test)
    function simulateExternalPayment() {
        if (!currentCashierPatient || selectedServices.length === 0) {
            alert("Veuillez d'abord sélectionner un patient et des services!");
            return;
        }
        
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        
        externalPaymentNotification = {
            reference: 'EXT-' + Date.now(),
            appName: 'PayPal',
            amount: total,
            currency: currentCurrency,
            timestamp: new Date().toLocaleString('fr-FR'),
            sender: 'Client Externe',
            message: 'Paiement pour services médicaux'
        };
        
        // Afficher la notification
        document.getElementById('external-notification-details').innerHTML = `
            <div class="notification-card">
                <h4>Notification de Paiement Externe</h4>
                <p><strong>Référence:</strong> ${externalPaymentNotification.reference}</p>
                <p><strong>Application:</strong> ${externalPaymentNotification.appName}</p>
                <p><strong>Montant:</strong> ${externalPaymentNotification.amount.toFixed(2)} ${externalPaymentNotification.currency}</p>
                <p><strong>Expéditeur:</strong> ${externalPaymentNotification.sender}</p>
                <p><strong>Heure:</strong> ${externalPaymentNotification.timestamp}</p>
                <p><strong>Message:</strong> ${externalPaymentNotification.message}</p>
            </div>
        `;
        
        document.getElementById('external-notification').classList.remove('hidden');
        document.getElementById('external-confirm-amount').value = total.toFixed(2);
        
        alert("Notification de paiement externe simulée! Veuillez vérifier et confirmer le montant.");
    }
    
    document.getElementById('print-invoice').addEventListener('click', () => {
        const search = document.getElementById('cashier-patient-search').value.toLowerCase();
        const patient = state.patients.find(p => 
            p.id.toLowerCase() === search || 
            p.fullName.toLowerCase().includes(search)
        );
        
        if (!patient) {
            alert("Veuillez d'abord rechercher un patient!");
            return;
        }
        
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        
        const given = parseFloat(document.getElementById('amount-given').value) || 0;
        const paymentMethod = document.querySelector('.payment-method.active').dataset.method;
        const paymentDetails = getPaymentDetails(paymentMethod);
        
        generateInvoice(selectedServices, patient, given, paymentMethod, currentCurrency, exchangeRate, paymentDetails);
    });
    
    function getPaymentDetails(paymentMethod) {
        let details = { method: paymentMethod };
        
        if (paymentMethod === 'natcash' || paymentMethod === 'moncash') {
            details.transactionId = document.getElementById('transaction-id').value.trim();
            details.sentAmount = document.getElementById('mobile-money-amount').value;
        } 
        else if (paymentMethod === 'card') {
            const cardNumber = document.getElementById('card-number').value.trim();
            details.cardNumber = cardNumber;
            details.cardName = document.getElementById('card-name').value.trim();
            details.maskedCardNumber = '**** **** **** ' + cardNumber.slice(-4);
        }
        else if (paymentMethod === 'external') {
            details.externalRef = externalPaymentNotification?.reference || '';
            details.externalApp = externalPaymentNotification?.appName || '';
        }
        
        return details;
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

function generateInvoice(services, patient, amountGiven, paymentMethod, currency, exchangeRate, paymentDetails = {}) {
    if (!patient || !services || services.length === 0) {
        alert("Impossible de générer la facture: données manquantes!");
        return;
    }
    
    // Calculer les totaux
    const subtotalHTG = services.reduce((sum, service) => {
        return sum + (service.serviceCurrency === 'HTG' ? service.originalAmount : service.originalAmount * exchangeRate);
    }, 0);
    
    const totalDiscountHTG = services.reduce((sum, service) => {
        return sum + (service.serviceCurrency === 'HTG' ? service.discountAmount : service.discountAmount * exchangeRate);
    }, 0);
    
    const totalHTG = services.reduce((sum, service) => sum + service.finalAmountHTG, 0);
    const totalUSD = services.reduce((sum, service) => sum + service.finalAmountUSD, 0);
    
    // Calculer la monnaie
    let changeHTG = 0;
    let changeUSD = 0;
    
    if (currency === 'USD') {
        changeUSD = amountGiven - totalUSD;
        changeHTG = changeUSD * exchangeRate;
    } else {
        changeHTG = amountGiven - totalHTG;
        changeUSD = changeHTG / exchangeRate;
    }
    
    // Remplir les informations de l'hôpital
    document.getElementById('invoice-hospital-name').textContent = document.getElementById('hospital-name').value;
    document.getElementById('invoice-hospital-address').textContent = document.getElementById('hospital-address').value;
    document.getElementById('invoice-hospital-phone').textContent = document.getElementById('hospital-phone').value;
    
    if (state.hospitalLogo) {
        document.getElementById('invoice-logo').src = state.hospitalLogo;
        document.getElementById('invoice-logo').style.display = 'block';
    }
    
    // Informations patient
    document.getElementById('invoice-patient-name').textContent = patient.fullName;
    document.getElementById('invoice-patient-id').textContent = patient.id;
    document.getElementById('invoice-patient-dob').textContent = patient.dateOfBirth || 'Non spécifié';
    document.getElementById('invoice-patient-gender').textContent = patient.gender || 'Non spécifié';
    
    // Informations facture
    document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('fr-FR');
    document.getElementById('invoice-time').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('invoice-number').textContent = 'INV-' + Date.now();
    
    // Taux de change
    document.getElementById('invoice-exchange-rate').textContent = `1 USD = ${exchangeRate} Gdes`;
    document.getElementById('invoice-payment-currency').textContent = currency === 'USD' ? 'USD (Dollars US)' : 'HTG (Gourdes)';
    
    // Informations de paiement détaillées
    let paymentInfoHtml = '';
    
    if (paymentMethod === 'natcash' || paymentMethod === 'moncash') {
        paymentInfoHtml = `
            <div><strong>Méthode:</strong> ${paymentMethod === 'natcash' ? 'NatCash' : 'MonCash'}</div>
            <div><strong>ID Transaction:</strong> ${paymentDetails.transactionId || 'Non spécifié'}</div>
            <div><strong>Montant envoyé:</strong> ${paymentDetails.sentAmount || '0'} ${currency}</div>
        `;
    } 
    else if (paymentMethod === 'card') {
        paymentInfoHtml = `
            <div><strong>Méthode:</strong> Carte Bancaire</div>
            <div><strong>Numéro de compte:</strong> ${paymentDetails.maskedCardNumber || 'Non spécifié'}</div>
            <div><strong>Nom sur la carte:</strong> ${paymentDetails.cardName || 'Non spécifié'}</div>
        `;
    }
    else if (paymentMethod === 'external') {
        paymentInfoHtml = `
            <div><strong>Méthode:</strong> Paiement Externe</div>
            <div><strong>Application:</strong> ${paymentDetails.externalApp || 'Non spécifié'}</div>
            <div><strong>Référence:</strong> ${paymentDetails.externalRef || 'Non spécifié'}</div>
            <div><strong>Confirmé par:</strong> ${paymentDetails.confirmedBy || 'Non spécifié'}</div>
        `;
    }
    else {
        paymentInfoHtml = `<div><strong>Méthode:</strong> ${paymentMethod}</div>`;
    }
    
    document.getElementById('invoice-payment-details').innerHTML = paymentInfoHtml;
    
    // Remplir les services détaillés
    let servicesHtml = '';
    services.forEach((service, index) => {
        const originalInHTG = service.serviceCurrency === 'HTG' ? 
            service.originalAmount : service.originalAmount * exchangeRate;
        const finalInHTG = service.serviceCurrency === 'HTG' ? 
            service.finalAmountHTG : service.finalAmountHTG * exchangeRate;
        
        servicesHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${service.service}
                    <div><small>Devise: ${service.serviceCurrency === 'USD' ? 'USD' : 'HTG'}</small></div>
                </td>
                <td>
                    ${service.serviceCurrency === 'USD' ? 
                        `${service.originalAmount.toFixed(2)} USD<br><small>(${originalInHTG.toFixed(2)} Gdes)</small>` : 
                        `${service.originalAmount.toFixed(2)} Gdes`}
                </td>
                <td>
                    ${service.discountAmount > 0 ? 
                        `${patient.discountPercentage}%<br><small>-${service.discountAmount.toFixed(2)} ${service.serviceCurrency}</small>` : 
                        'Aucune'}
                </td>
                <td>
                    ${service.serviceCurrency === 'USD' ? 
                        `${service.finalAmountUSD.toFixed(2)} USD<br><small>(${finalInHTG.toFixed(2)} Gdes)</small>` : 
                        `${service.finalAmountHTG.toFixed(2)} Gdes`}
                </td>
            </tr>
        `;
    });
    
    document.getElementById('invoice-services-list').innerHTML = servicesHtml;
    
    // Remplir les totaux
    document.getElementById('invoice-subtotal-htg').textContent = subtotalHTG.toFixed(2) + ' Gdes';
    document.getElementById('invoice-subtotal-usd').textContent = (subtotalHTG / exchangeRate).toFixed(2) + ' USD';
    
    document.getElementById('invoice-total-discount-htg').textContent = totalDiscountHTG > 0 ? `-${totalDiscountHTG.toFixed(2)} Gdes` : '0.00 Gdes';
    document.getElementById('invoice-total-discount-usd').textContent = totalDiscountHTG > 0 ? `-${(totalDiscountHTG / exchangeRate).toFixed(2)} USD` : '0.00 USD';
    
    document.getElementById('invoice-total-amount-htg').textContent = totalHTG.toFixed(2) + ' Gdes';
    document.getElementById('invoice-total-amount-usd').textContent = totalUSD.toFixed(2) + ' USD';
    
    // Montant donné
    if (currency === 'USD') {
        document.getElementById('invoice-amount-given').textContent = 
            `${amountGiven.toFixed(2)} USD (${(amountGiven * exchangeRate).toFixed(2)} Gdes)`;
    } else {
        document.getElementById('invoice-amount-given').textContent = 
            `${amountGiven.toFixed(2)} Gdes (${(amountGiven / exchangeRate).toFixed(2)} USD)`;
    }
    
    // Monnaie
    document.getElementById('invoice-change-htg').textContent = changeHTG.toFixed(2) + ' Gdes';
    document.getElementById('invoice-change-usd').textContent = changeUSD.toFixed(2) + ' USD';
    
    document.getElementById('invoice-payment-method').textContent = paymentMethod;
    
    // Information réduction si applicable
    if (patient.sponsored && patient.discountPercentage > 0) {
        document.getElementById('invoice-discount-info').textContent = `Patient sponsorisé - Réduction de ${patient.discountPercentage}% appliquée`;
        document.getElementById('invoice-discount-info').classList.remove('hidden');
    } else {
        document.getElementById('invoice-discount-info').classList.add('hidden');
    }
    
    // Nom de l'agent
    document.getElementById('invoice-agent').textContent = state.currentUser.username;
    
    // Afficher la facture
    const container = document.getElementById('invoice-container');
    container.classList.remove('hidden');
    
    // Imprimer après un court délai
    setTimeout(() => {
        window.print();
        container.classList.add('hidden');
    }, 500);
}
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
    
    // Taux de change
    let exchangeRate = state.exchangeRate || 130;
    
    // Initialiser le taux de change
    const exchangeRateInput = document.getElementById('exchange-rate');
    if (exchangeRateInput) {
        exchangeRate = parseFloat(exchangeRateInput.value) || 130;
        exchangeRateInput.addEventListener('input', function() {
            exchangeRate = parseFloat(this.value) || 130;
            state.exchangeRate = exchangeRate;
            updateCurrencyDisplay();
        });
    }
    
    function updateCurrencyDisplay() {
        const totalHTG = parseFloat(document.getElementById('total-to-pay').textContent) || 0;
        const totalUSD = totalHTG / exchangeRate;
        
        const totalUSDDisplay = document.getElementById('total-to-pay-usd');
        if (totalUSDDisplay) {
            totalUSDDisplay.textContent = totalUSD.toFixed(2);
        }
        
        const amountGiven = document.getElementById('amount-given').value;
        if (amountGiven) {
            calculateChange();
        }
        
        updateServicesDisplayWithUSD();
    }
    
    function updateServicesDisplayWithUSD() {
        const serviceItems = document.querySelectorAll('.service-item');
        serviceItems.forEach(item => {
            const amountHTG = parseFloat(item.querySelector('.service-amount').textContent);
            const amountUSD = amountHTG / exchangeRate;
            const usdDisplay = item.querySelector('.service-amount-usd');
            if (usdDisplay) {
                usdDisplay.textContent = `(${amountUSD.toFixed(2)} $)`;
            }
        });
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
        
        const paymentMethod = document.querySelector('.payment-method.active')?.dataset.method;
        
        if (paymentMethod === 'external') {
            if (paymentCurrency === 'USD') {
                if (given < totalUSD) {
                    const missingUSD = totalUSD - given;
                    const missingHTG = missingUSD * exchangeRate;
                    document.getElementById('change-result').textContent = `Manquant: ${missingUSD.toFixed(2)} $ (${missingHTG.toFixed(2)} Gdes)`;
                    document.getElementById('change-result').style.color = '#dc3545';
                } else if (given > totalUSD) {
                    const changeUSD = given - totalUSD;
                    const changeHTG = changeUSD * exchangeRate;
                    document.getElementById('change-result').textContent = `À retourner: ${changeUSD.toFixed(2)} $ (${changeHTG.toFixed(2)} Gdes)`;
                    document.getElementById('change-result').style.color = '#28a745';
                } else {
                    document.getElementById('change-result').textContent = 'Montant exact - Paiement extérieur confirmé';
                    document.getElementById('change-result').style.color = '#28a745';
                }
            } else {
                if (given < totalHTG) {
                    const missingHTG = totalHTG - given;
                    const missingUSD = missingHTG / exchangeRate;
                    document.getElementById('change-result').textContent = `Manquant: ${missingHTG.toFixed(2)} Gdes (${missingUSD.toFixed(2)} $)`;
                    document.getElementById('change-result').style.color = '#dc3545';
                } else if (given > totalHTG) {
                    const changeHTG = given - totalHTG;
                    const changeUSD = changeHTG / exchangeRate;
                    document.getElementById('change-result').textContent = `À retourner: ${changeHTG.toFixed(2)} Gdes (${changeUSD.toFixed(2)} $)`;
                    document.getElementById('change-result').style.color = '#28a745';
                } else {
                    document.getElementById('change-result').textContent = 'Montant exact - Paiement extérieur confirmé';
                    document.getElementById('change-result').style.color = '#28a745';
                }
            }
            return;
        }
        
        if (paymentCurrency === 'USD') {
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
    
    const updateRateBtn = document.getElementById('update-exchange-rate');
    if (updateRateBtn) {
        updateRateBtn.addEventListener('click', () => {
            const newRate = parseFloat(document.getElementById('exchange-rate').value);
            if (!isNaN(newRate) && newRate > 0) {
                exchangeRate = newRate;
                state.exchangeRate = exchangeRate;
                updateCurrencyDisplay();
                showNotification('Taux de change mis à jour: 1 $ = ' + exchangeRate + ' Gdes', 'success');
            } else {
                alert('Veuillez entrer un taux de change valide');
            }
        });
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
        
        // Vérifier expiration privilèges
        checkPrivilegeExpiration(patient.id);
        
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
            
            const amountUSD = amount / exchangeRate;
            html += `
                <div class="service-item">
                    <div>
                        <input type="checkbox" class="service-checkbox" data-id="${transaction.id}" checked>
                        <strong>${transaction.service}</strong>
                        ${discountApplied ? 
                            `<br><small>Réduction ${patient.discountPercentage}%: ${transaction.amount.toFixed(2)} → <span class="service-amount">${amount.toFixed(2)}</span> Gdes <span class="service-amount-usd">(${amountUSD.toFixed(2)} $)</span></small>` : 
                            `<br><small>Montant: <span class="service-amount">${amount.toFixed(2)}</span> Gdes <span class="service-amount-usd">(${amountUSD.toFixed(2)} $)</span></small>`}
                    </div>
                    <div>${amount.toFixed(2)} Gdes<br><small>(${amountUSD.toFixed(2)} $)</small></div>
                </div>
            `;
        });
        
        if (unpaidTransactions.length === 0) {
            html = '<p>Aucun service à payer.</p>';
        }
        
        document.getElementById('services-to-pay-list').innerHTML = html;
        document.getElementById('total-to-pay').textContent = total.toFixed(2);
        
        updateCurrencyDisplay();
        
        document.getElementById('amount-given').value = '';
        document.getElementById('change-result').textContent = 'Monnaie: 0 Gdes / 0 $';
        document.getElementById('change-result').style.color = '#6c757d';
        
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
    
    document.querySelectorAll('.payment-method-currency').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method-currency').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            
            const currency = this.dataset.currency;
            const amountGivenInput = document.getElementById('amount-given');
            amountGivenInput.placeholder = `Montant en ${currency}`;
            
            const amountGiven = amountGivenInput.value;
            if (amountGiven) {
                calculateChange();
            }
        });
    });
    
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            
            const amountGivenInput = document.getElementById('amount-given');
            if (this.dataset.method === 'external') {
                amountGivenInput.disabled = false;
                amountGivenInput.placeholder = 'Montant reçu à confirmer';
            } else {
                amountGivenInput.disabled = false;
                const currency = document.querySelector('.payment-method-currency.active')?.dataset.currency || 'HTG';
                amountGivenInput.placeholder = `Montant en ${currency}`;
            }
            
            calculateChange();
        });
    });
    
    document.getElementById('mark-as-paid').addEventListener('click', () => {
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        
        const paymentMethodElement = document.querySelector('.payment-method.active');
        if (!paymentMethodElement) {
            alert("Veuillez sélectionner un mode de paiement!");
            return;
        }
        
        const paymentMethod = paymentMethodElement.dataset.method;
        const given = parseFloat(document.getElementById('amount-given').value) || 0;
        const paymentCurrency = document.querySelector('.payment-method-currency.active')?.dataset.currency || 'HTG';
        const total = parseFloat(document.getElementById('total-to-pay').textContent);
        const totalUSD = total / exchangeRate;
        
        if (paymentMethod !== 'external') {
            if (isNaN(given) || given <= 0) {
                alert("Veuillez entrer un montant valide!");
                return;
            }
            
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
        } else {
            if (isNaN(given) || given <= 0) {
                alert("Veuillez entrer le montant reçu pour confirmation!");
                return;
            }
            
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
        }
        
        currentPaidServices = [...selectedServices];
        
        let changeHTG = 0;
        let changeUSD = 0;
        
        if (paymentMethod !== 'external') {
            if (paymentCurrency === 'USD') {
                changeUSD = given - totalUSD;
                changeHTG = changeUSD * exchangeRate;
            } else {
                changeHTG = given - total;
                changeUSD = changeHTG / exchangeRate;
            }
        } else {
            if (paymentCurrency === 'USD') {
                if (given > totalUSD) {
                    changeUSD = given - totalUSD;
                    changeHTG = changeUSD * exchangeRate;
                }
            } else {
                if (given > total) {
                    changeHTG = given - total;
                    changeUSD = changeHTG / exchangeRate;
                }
            }
        }
        
        selectedServices.forEach(transaction => {
            const transactionIndex = state.transactions.findIndex(t => t.id === transaction.id);
            if (transactionIndex !== -1) {
                state.transactions[transactionIndex].status = 'paid';
                state.transactions[transactionIndex].paymentMethod = paymentMethod;
                state.transactions[transactionIndex].paymentDate = new Date().toISOString().split('T')[0];
                state.transactions[transactionIndex].paymentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                state.transactions[transactionIndex].paymentAgent = state.currentUser.username;
                
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
        
        let paymentMessage = "Paiement enregistré avec succès!\n";
        paymentMessage += `Total: ${total.toFixed(2)} Gdes (${totalUSD.toFixed(2)} $)\n`;
        
        if (paymentMethod === 'external') {
            paymentMessage += `Mode: Paiement extérieur\n`;
            paymentMessage += `Montant reçu: ${given.toFixed(2)} ${paymentCurrency}\n`;
            if (changeHTG > 0 || changeUSD > 0) {
                paymentMessage += `À retourner: ${paymentCurrency === 'USD' ? changeUSD.toFixed(2) + ' $' : changeHTG.toFixed(2) + ' Gdes'}`;
            }
        } else {
            paymentMessage += `Montant donné: ${given.toFixed(2)} ${paymentCurrency}\n`;
            if (paymentCurrency === 'USD') {
                paymentMessage += `Monnaie: ${changeUSD.toFixed(2)} $ (${changeHTG.toFixed(2)} Gdes)`;
            } else {
                paymentMessage += `Monnaie: ${changeHTG.toFixed(2)} Gdes (${changeUSD.toFixed(2)} $)`;
            }
        }
        
        alert(paymentMessage);
        
        generateInvoice(currentPaidServices);
        
        document.getElementById('search-cashier-patient').click();
    });
    
    document.getElementById('print-invoice').addEventListener('click', () => {
        if (selectedServices.length === 0) {
            alert("Aucun service sélectionné!");
            return;
        }
        generateInvoice(selectedServices);
    });
    
    document.getElementById('print-receipt').addEventListener('click', () => {
        if (!currentCashierPatient) {
            alert("Veuillez d'abord rechercher un patient!");
            return;
        }
        printPatientTransactionHistory(currentCashierPatient.id);
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
        
        const services = servicesToInvoice || selectedServices;
        
        if (!services || services.length === 0) {
            alert("Aucun service à facturer!");
            return;
        }
        
        const given = parseFloat(document.getElementById('amount-given').value) || 0;
        const total = services.reduce((sum, t) => sum + t.finalAmount, 0);
        const totalUSD = total / exchangeRate;
        
        const paymentCurrencyElement = document.querySelector('.payment-method-currency.active');
        const paymentCurrency = paymentCurrencyElement ? paymentCurrencyElement.dataset.currency : 'HTG';
        
        const paymentMethodElement = document.querySelector('.payment-method.active');
        const selectedMethod = paymentMethodElement ? paymentMethodElement.dataset.method : 'Non spécifié';
        
        let givenInHTG = given;
        let changeHTG = 0;
        let changeUSD = 0;
        
        if (selectedMethod === 'external') {
            givenInHTG = paymentCurrency === 'USD' ? given * exchangeRate : given;
            if (paymentCurrency === 'USD') {
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
        } else if (paymentCurrency === 'USD') {
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
        
        document.getElementById('invoice-patient-name').textContent = patient.fullName;
        document.getElementById('invoice-patient-id').textContent = patient.id;
        document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('fr-FR');
        document.getElementById('invoice-time').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        document.getElementById('invoice-total-amount').textContent = `${total.toFixed(2)} Gdes (${totalUSD.toFixed(2)} $)`;
        
        if (selectedMethod === 'external') {
            document.getElementById('invoice-amount-given').textContent = `${given.toFixed(2)} ${paymentCurrency} (Paiement extérieur)`;
        } else if (paymentCurrency === 'USD') {
            document.getElementById('invoice-amount-given').textContent = `${given.toFixed(2)} $ (${givenInHTG.toFixed(2)} Gdes)`;
        } else {
            document.getElementById('invoice-amount-given').textContent = `${given.toFixed(2)} Gdes (${(given/exchangeRate).toFixed(2)} $)`;
        }
        
        if (selectedMethod === 'external') {
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
        } else if (paymentCurrency === 'USD') {
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
        
        document.getElementById('invoice-payment-method').textContent = selectedMethod === 'external' ? `Extérieur (${paymentCurrency})` : `${selectedMethod} (${paymentCurrency})`;
        document.getElementById('invoice-number').textContent = 'INV' + Date.now();
        
        const exchangeRateDisplay = document.getElementById('invoice-exchange-rate');
        if (exchangeRateDisplay) {
            exchangeRateDisplay.textContent = `Taux: 1 $ = ${exchangeRate} Gdes`;
        }
        
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
        
        const container = document.getElementById('invoice-container');
        container.classList.remove('hidden');
        
        setTimeout(() => {
            const printContent = container.innerHTML;
            
            // Créer une iframe pour l'impression
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            iframe.style.left = '-1000px';
            iframe.style.top = '-1000px';
            
            document.body.appendChild(iframe);
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Écrire le contenu dans l'iframe
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Facture - ${patient.fullName}</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 20px; 
                            color: #333;
                        }
                        .invoice-container { 
                            width: 210mm; 
                            margin: 0 auto; 
                            padding: 20mm;
                            background: white;
                        }
                        .invoice-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #1a6bca;
                            padding-bottom: 20px;
                        }
                        .invoice-logo {
                            max-width: 150px;
                            margin-bottom: 10px;
                        }
                        .invoice-body {
                            margin: 30px 0;
                        }
                        .invoice-footer {
                            margin-top: 40px;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                        .receipt-item {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px dashed #ddd;
                        }
                        .total-section {
                            background: #f0f7ff;
                            padding: 15px;
                            border-radius: 5px;
                            margin-top: 20px;
                            font-weight: bold;
                        }
                        @media print {
                            body { margin: 0; }
                            .invoice-container { 
                                width: 100%; 
                                padding: 10mm;
                                box-shadow: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `);
            iframeDoc.close();
            
            // Imprimer depuis l'iframe
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // Nettoyer après l'impression
            setTimeout(() => {
                document.body.removeChild(iframe);
                container.classList.add('hidden');
            }, 1000);
            
        }, 500);
    }
    
    function printPatientTransactionHistory(patientId) {
        const patient = state.patients.find(p => p.id === patientId);
        if (!patient) {
            alert("Patient non trouvé!");
            return;
        }
        
        const allTransactions = state.transactions.filter(t => t.patientId === patientId);
        if (allTransactions.length === 0) {
            alert("Aucune transaction pour ce patient!");
            return;
        }
        
        let historyHtml = `
            <div style="width: 210mm; padding: 20mm; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div class="text-center">
                    <h3>HISTORIQUE COMPLET DES TRANSACTIONS</h3>
                    <p><strong>Patient:</strong> ${patient.fullName} (${patient.id})</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                    <hr>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f0f7ff;">
                            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Service</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Montant (Gdes)</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Montant ($)</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Statut</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">Méthode</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let totalHTG = 0;
        let totalUSD = 0;
        let paidHTG = 0;
        let paidUSD = 0;
        let unpaidHTG = 0;
        let unpaidUSD = 0;
        
        allTransactions.forEach(transaction => {
            const amountHTG = transaction.amount || 0;
            const amountUSD = amountHTG / exchangeRate;
            
            totalHTG += amountHTG;
            totalUSD += amountUSD;
            
            if (transaction.status === 'paid') {
                paidHTG += amountHTG;
                paidUSD += amountUSD;
            } else {
                unpaidHTG += amountHTG;
                unpaidUSD += amountUSD;
            }
            
            historyHtml += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${transaction.date} ${transaction.time}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${transaction.service}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${amountHTG.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${amountUSD.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <span style="color: ${transaction.status === 'paid' ? 'green' : 'red'};">
                            ${transaction.status === 'paid' ? 'Payé' : 'Non payé'}
                        </span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${transaction.paymentMethod || '-'}</td>
                </tr>
            `;
        });
        
        historyHtml += `
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                    <h4>RÉSUMÉ</h4>
                    <p><strong>Total des transactions:</strong> ${totalHTG.toFixed(2)} Gdes (${totalUSD.toFixed(2)} $)</p>
                    <p><strong style="color: green;">Montants payés:</strong> ${paidHTG.toFixed(2)} Gdes (${paidUSD.toFixed(2)} $)</p>
                    <p><strong style="color: red;">Montants impayés:</strong> ${unpaidHTG.toFixed(2)} Gdes (${unpaidUSD.toFixed(2)} $)</p>
                    <p><strong>Taux de change utilisé:</strong> 1 $ = ${exchangeRate} Gdes</p>
                </div>
                
                <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                    <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
                    <p>Caissier: ${state.currentUser ? state.currentUser.name : 'Système'}</p>
                </div>
            </div>
        `;
        
        // Créer une iframe pour l'impression
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.style.left = '-1000px';
        iframe.style.top = '-1000px';
        
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Écrire le contenu dans l'iframe
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Historique des Transactions - ${patient.fullName}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0;
                        color: #333;
                    }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${historyHtml}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Imprimer depuis l'iframe
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Nettoyer après l'impression
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
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

function sendPaymentNotification(transaction) {
    console.log('Notification de paiement envoyée pour:', transaction);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function checkPrivilegeExpiration(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient || !patient.privilegeGrantedDate) return;
    
    const now = new Date();
    const privilegeDate = new Date(patient.privilegeGrantedDate);
    const hoursDiff = (now - privilegeDate) / (1000 * 60 * 60);
    
    if (hoursDiff >= 24) {
        patient.vip = false;
        patient.sponsored = false;
        patient.discountPercentage = 0;
        patient.privilegeGrantedDate = null;
        
        console.log(`Privilèges expirés pour ${patient.fullName}`);
    }
}
// ລະບົບຈັດການຮັບເງິນຝາກ
document.addEventListener('DOMContentLoaded', function() {
    // ຕົວແປຫຼັກ
    let transactions = JSON.parse(localStorage.getItem('depositTransactions')) || [];
    let statistics = JSON.parse(localStorage.getItem('depositStatistics')) || {
        totalDepositTHB: 0,
        totalDepositUSD: 0,
        totalDepositLAK: 0,
        totalWithdrawTHB: 0,
        totalWithdrawUSD: 0,
        totalWithdrawLAK: 0,
        totalBalanceTHB: 0,
        totalBalanceUSD: 0,
        totalBalanceLAK: 0,
        totalCustomers: [],
        totalTransactions: 0
    };
    
    let currentFilter = 'all';
    let currentCurrency = 'all';
    let currentSearch = '';
    let editingId = null;
    let transactionToDelete = null;
    
    // ອ້າງອິງ element
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const currencyTabs = document.querySelectorAll('.currency-tab');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search');
    
    // ເລີ່ມຕົ້ນລະບົບ
    function init() {
        updateUI();
        loadTransactions();
        
        // Event listeners
        transactionForm.addEventListener('submit', handleSubmit);
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentFilter = this.dataset.filter;
                updateActiveButtons(filterButtons, this);
                loadTransactions();
            });
        });
        
        currencyTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                currentCurrency = this.dataset.currency;
                updateActiveButtons(currencyTabs, this);
                loadTransactions();
            });
        });
        
        // ການຄົ້ນຫາ
        searchBtn.addEventListener('click', handleSearch);
        clearSearchBtn.addEventListener('click', clearSearch);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Modal events
        document.getElementById('cancel-delete').addEventListener('click', () => {
            document.getElementById('delete-modal').style.display = 'none';
        });
        
        document.getElementById('close-delete-modal').addEventListener('click', () => {
            document.getElementById('delete-modal').style.display = 'none';
        });
        
        document.getElementById('confirm-delete').addEventListener('click', deleteTransaction);
        
        // Clear all modal
        document.getElementById('clear-all').addEventListener('click', () => {
            document.getElementById('clear-modal').style.display = 'flex';
        });
        
        document.getElementById('cancel-clear').addEventListener('click', () => {
            document.getElementById('clear-modal').style.display = 'none';
        });
        
        document.getElementById('close-clear-modal').addEventListener('click', () => {
            document.getElementById('clear-modal').style.display = 'none';
        });
        
        document.getElementById('confirm-clear').addEventListener('click', clearAllData);
        
        // Export data
        document.getElementById('export-data').addEventListener('click', exportData);
        
        // Cancel edit button
        document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
        
        // Event delegation ສຳລັບປຸ່ມໃນລາຍການ
        transactionList.addEventListener('click', handleTransactionActions);
    }
    
    // ຈັດການການກົດ submit
    function handleSubmit(e) {
        e.preventDefault();
        
        const type = document.getElementById('transaction-type').value;
        const customerName = document.getElementById('customer-name').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const currency = document.getElementById('currency').value;
        const description = document.getElementById('description').value.trim();
        
        if (!customerName || isNaN(amount) || amount <= 0) {
            showNotification('ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບຖ້ວນ ແລະ ຖືກຕ້ອງ', 'error');
            return;
        }

        if (editingId) {
            editTransaction(editingId, type, customerName, amount, currency, description);
        } else {
            addTransaction(type, customerName, amount, currency, description);
        }
    }

    // ເພີ່ມທຸລະກຳໃໝ່
    function addTransaction(type, customerName, amount, currency, description) {
        const id = Date.now();
        const date = new Date().toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const transaction = {
            id,
            type,
            customerName,
            amount,
            currency,
            description,
            date,
            timestamp: Date.now()
        };

        transactions.unshift(transaction);
        updateStatistics('add', transaction);
        saveData();
        loadTransactions();
        updateUI();
        transactionForm.reset();
        showNotification('ບັນທຶກລາຍການສຳເລັດ!', 'success');
    }

    // ແກ້ໄຂທຸລະກຳ
    function editTransaction(id, type, customerName, amount, currency, description) {
        const index = transactions.findIndex(t => t.id === id);

        if (index !== -1) {
            const oldTransaction = transactions[index];
            
            // ລຶບຄ່າເກົ່າຈາກສະຖິຕິ
            updateStatistics('remove', oldTransaction);
            
            // ອັບເດດວັນທີ
            const updatedTransaction = {
                ...oldTransaction,
                type,
                customerName,
                amount,
                currency,
                description,
                date: new Date().toLocaleString('th-TH', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                timestamp: Date.now()
            };
            
            transactions[index] = updatedTransaction;
            
            // ເພີ່ມຄ່າໃໝ່ໃນສະຖິຕິ
            updateStatistics('add', updatedTransaction);
            
            saveData();
            loadTransactions();
            updateUI();
            transactionForm.reset();
            cancelEdit();
            showNotification('ແກ້ໄຂລາຍການສຳເລັດ!', 'success');
        }
    }

    // ເລີ່ມການແກ້ໄຂ
    function startEdit(id) {
        const transaction = transactions.find(t => t.id === id);

        if (transaction) {
            editingId = id;
            document.getElementById('edit-id').value = id;
            document.getElementById('transaction-type').value = transaction.type;
            document.getElementById('customer-name').value = transaction.customerName;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('currency').value = transaction.currency;
            document.getElementById('description').value = transaction.description;
            
            document.getElementById('submit-btn').innerHTML = '<i class="fas fa-edit"></i> ແກ້ໄຂລາຍການ';
            document.getElementById('cancel-edit').style.display = 'block';
            
            // ເລືອນໄປທີ່ຟອມ
            document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ຍົກເລີກການແກ້ໄຂ
    function cancelEdit() {
        editingId = null;
        transactionForm.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('submit-btn').innerHTML = '<i class="fas fa-save"></i> ບັນທຶກລາຍການ';
        document.getElementById('cancel-edit').style.display = 'none';
    }

    // ສະແດງ modal ຢືນຢັນການລຶບ
    function showDeleteConfirmation(transaction) {
        transactionToDelete = transaction;

        const typeText = transaction.type === 'deposit' ? 'ຝາກເງິນ' : 
                        transaction.type === 'withdraw' ? 'ຖອນເງິນ' : 'ໂອນເງິນ';

        const amountFormatted = transaction.amount.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        let currencySymbol = '';
        switch(transaction.currency) {
            case 'THB': currencySymbol = '฿'; break;
            case 'USD': currencySymbol = '$'; break;
            case 'LAK': currencySymbol = '₭'; break;
            default: currencySymbol = transaction.currency;
        }

        document.getElementById('delete-transaction-info').innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <p><strong>ຊື່ລູກຄ້າ:</strong> ${escapeHtml(transaction.customerName)}</p>
                <p><strong>ປະເພດ:</strong> ${typeText}</p>
                <p><strong>ຈຳນວນເງິນ:</strong> ${amountFormatted} ${currencySymbol} (${transaction.currency})</p>
                <p><strong>ວັນທີ:</strong> ${escapeHtml(transaction.date)}</p>
                ${transaction.description ? `<p><strong>ລາຍລະອຽດ:</strong> ${escapeHtml(transaction.description)}</p>` : ''}
            </div>
            <p style="color: #e74c3c; font-weight: bold;">
                ⚠️ ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້!
            </p>
        `;

        document.getElementById('delete-modal').style.display = 'flex';
    }

    // ລຶບທຸລະກຳ
    function deleteTransaction() {
        if (!transactionToDelete) {
            showNotification('ບໍ່ມີລາຍການທີ່ຈະລຶບ', 'error');
            return;
        }

        const index = transactions.findIndex(t => t.id === transactionToDelete.id);
        if (index === -1) {
            showNotification('ບໍ່ພົບລາຍການນີ້', 'error');
            return;
        }

        // ລຶບຄ່າຈາກສະຖິຕິ
        updateStatistics('remove', transactions[index]);

        // ລຶບອອກຈາກລາຍການ
        transactions.splice(index, 1);

        // ບັນທຶກຂໍ້ມູນ
        saveData();

        // ອັບເດດ UI
        loadTransactions();
        updateUI();

        // ປິດ modal
        document.getElementById('delete-modal').style.display = 'none';

        // ສະແດງຂໍ້ຄວາມສຳເລັດ
        showNotification('ລຶບລາຍການສຳເລັດ!', 'success');

        transactionToDelete = null;
    }

    // ອັບເດດປຸ່ມທີ່ active
    function updateActiveButtons(buttons, activeButton) {
        buttons.forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    // ຈັດການການຄົ້ນຫາ
    function handleSearch() {
        currentSearch = searchInput.value.trim().toLowerCase();
        loadTransactions();
    }

    // ລ້າງການຄົ້ນຫາ
    function clearSearch() {
        searchInput.value = '';
        currentSearch = '';
        loadTransactions();
    }

    // ຈັດການການຄລິກປຸ່ມໃນລາຍການ
    function handleTransactionActions(e) {
        const target = e.target;

        // ກວດສອບວ່າຄລິກປຸ່ມແກ້ໄຂ
        if (target.closest('.btn-edit')) {
            const transactionItem = target.closest('.transaction-item');
            const transactionId = parseInt(transactionItem.dataset.id);
            startEdit(transactionId);
        }

        // ກວດສອບວ່າຄລິກປຸ່ມລຶບ
        if (target.closest('.btn-delete')) {
            const transactionItem = target.closest('.transaction-item');
            const transactionId = parseInt(transactionItem.dataset.id);
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (transaction) {
                showDeleteConfirmation(transaction);
            }
        }
    }

    // ໂຫຼດລາຍການທຸລະກຳ
    function loadTransactions() {
        transactionList.innerHTML = '';

        // ກອງທຸລະກຳ
        let filteredTransactions = transactions;

        // ກອງຕາມປະເພດ
        if (currentFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === currentFilter);
        }

        // ກອງຕາມສະກຸນເງິນ
        if (currentCurrency !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.currency === currentCurrency);
        }

        // ກອງຕາມການຄົ້ນຫາ
        if (currentSearch) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.customerName.toLowerCase().includes(currentSearch) || 
                (t.description && t.description.toLowerCase().includes(currentSearch))
            );
        }

        if (filteredTransactions.length === 0) {
            transactionList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>ຍັງບໍ່ມີລາຍການທຸລະກຳ</p>
                    <p>${currentFilter !== 'all' || currentCurrency !== 'all' || currentSearch ? 'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ' : 'ເລີ່ມບັນທຶກລາຍການທຳອິດຂອງທ່ານເລີຍ!'}</p>
                </div>
            `;
            return;
        }

        // ສ້າງລາຍການທຸລະກຳ
        filteredTransactions.forEach(transaction => {
            const item = createTransactionItem(transaction);
            transactionList.appendChild(item);
        });
    }

    // ສ້າງ item ທຸລະກຳ
    function createTransactionItem(transaction) {
        const div = document.createElement('div');
        div.className = `transaction-item ${transaction.type}`;
        div.dataset.id = transaction.id;

        const typeText = transaction.type === 'deposit' ? 'ຝາກເງິນ' : 
                        transaction.type === 'withdraw' ? 'ຖອນເງິນ' : 'ໂອນເງິນ';

        const amountFormatted = transaction.amount.toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        let currencySymbol = '';
        switch(transaction.currency) {
            case 'THB': currencySymbol = '฿'; break;
            case 'USD': currencySymbol = '$'; break;
            case 'LAK': currencySymbol = '₭'; break;
            default: currencySymbol = transaction.currency;
        }

        div.innerHTML = `
            <div class="transaction-header-row">
                <span class="transaction-customer">${escapeHtml(transaction.customerName)}</span>
                <div class="currency-display">
                    <span class="transaction-amount">${amountFormatted}</span>
                    <span class="currency-symbol">${currencySymbol} (${transaction.currency})</span>
                </div>
            </div>
            <div class="transaction-details">
                <span class="transaction-type">${typeText}</span>
                <span class="transaction-date">${escapeHtml(transaction.date)}</span>
            </div>
            ${transaction.description ? `<div class="transaction-description">${escapeHtml(transaction.description)}</div>` : ''}
            <div class="transaction-actions">
                <button class="btn-edit">
                    <i class="fas fa-edit"></i> ແກ້ໄຂ
                </button>
                <button class="btn-delete">
                    <i class="fas fa-trash"></i> ລຶບ
                </button>
            </div>
        `;

        return div;
    }

    // ອັບເດດສະຖິຕິ
    function updateStatistics(action, transaction) {
        const currency = transaction.currency;
        const amount = transaction.amount;

        if (action === 'add') {
            if (transaction.type === 'deposit') {
                statistics[`totalDeposit${currency}`] += amount;
                statistics[`totalBalance${currency}`] += amount;
            } else if (transaction.type === 'withdraw') {
                statistics[`totalWithdraw${currency}`] += amount;
                statistics[`totalBalance${currency}`] -= amount;
            }
            
            // ເພີ່ມລູກຄ້າ
            if (!statistics.totalCustomers.includes(transaction.customerName)) {
                statistics.totalCustomers.push(transaction.customerName);
            }
            
            statistics.totalTransactions++;
        } else if (action === 'remove') {
            if (transaction.type === 'deposit') {
                statistics[`totalDeposit${currency}`] -= amount;
                statistics[`totalBalance${currency}`] -= amount;
            } else if (transaction.type === 'withdraw') {
                statistics[`totalWithdraw${currency}`] -= amount;
                statistics[`totalBalance${currency}`] += amount;
            }
            
            // ກວດສອບວ່າລູກຄ້າຍັງມີທຸລະກຳອື່ນຫຼືບໍ່
            const hasOtherTransactions = transactions.some(t => 
                t.customerName === transaction.customerName && t.id !== transaction.id
            );
            
            if (!hasOtherTransactions) {
                statistics.totalCustomers = statistics.totalCustomers.filter(
                    name => name !== transaction.customerName
                );
            }
            
            statistics.totalTransactions--;
        }
    }

    // ອັບເດດ UI
    function updateUI() {
        // ອັບເດດສະຖິຕິໃນ header
        document.getElementById('total-deposit-thb').textContent = 
            statistics.totalDepositTHB.toLocaleString('th-TH');
        document.getElementById('total-deposit-usd').textContent = 
            statistics.totalDepositUSD.toLocaleString('th-TH');
        document.getElementById('total-deposit-lak').textContent = 
            statistics.totalDepositLAK.toLocaleString('th-TH');
            
        document.getElementById('total-withdraw-thb').textContent = 
            statistics.totalWithdrawTHB.toLocaleString('th-TH');
        document.getElementById('total-withdraw-usd').textContent = 
            statistics.totalWithdrawUSD.toLocaleString('th-TH');
        document.getElementById('total-withdraw-lak').textContent = 
            statistics.totalWithdrawLAK.toLocaleString('th-TH');
            
        document.getElementById('total-balance-thb').textContent = 
            statistics.totalBalanceTHB.toLocaleString('th-TH');
        document.getElementById('total-balance-usd').textContent = 
            statistics.totalBalanceUSD.toLocaleString('th-TH');
        document.getElementById('total-balance-lak').textContent = 
            statistics.totalBalanceLAK.toLocaleString('th-TH');
            
        // ອັບເດດສະຫຼຸບລູກຄ້າ
        document.getElementById('total-customers').textContent = 
            statistics.totalCustomers.length + ' ຄົນ';
        document.getElementById('total-transactions').textContent = 
            statistics.totalTransactions + ' ລາຍການ';
            
        // ອັບເດດສະຫຼຸບລາຍວັນ
        updateDailySummary();
    }

    // ອັບເດດສະຫຼຸບລາຍວັນ
    function updateDailySummary() {
        const today = new Date().toDateString();
        const todayTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.timestamp).toDateString();
            return transactionDate === today;
        });

        const todayDeposit = todayTransactions
            .filter(t => t.type === 'deposit')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const todayWithdraw = todayTransactions
            .filter(t => t.type === 'withdraw')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const todayCustomers = [...new Set(todayTransactions.map(t => t.customerName))].length;

        document.getElementById('today-transactions').textContent = 
            todayTransactions.length + ' ລາຍການ';
            
        document.getElementById('today-deposit').textContent = 
            todayDeposit.toLocaleString('th-TH') + ' ບາດ';
            
        document.getElementById('today-withdraw').textContent = 
            todayWithdraw.toLocaleString('th-TH') + ' ບາດ';
            
        document.getElementById('today-customers').textContent = 
            todayCustomers + ' ຄົນ';
    }

    // ລ້າງຂໍ້ມູນທັງໝົດ
    function clearAllData() {
        transactions = [];
        statistics = {
            totalDepositTHB: 0,
            totalDepositUSD: 0,
            totalDepositLAK: 0,
            totalWithdrawTHB: 0,
            totalWithdrawUSD: 0,
            totalWithdrawLAK: 0,
            totalBalanceTHB: 0,
            totalBalanceUSD: 0,
            totalBalanceLAK: 0,
            totalCustomers: [],
            totalTransactions: 0
        };

        saveData();
        loadTransactions();
        updateUI();

        document.getElementById('clear-modal').style.display = 'none';
        showNotification('ລ້າງຂໍ້ມູນທັງໝົດສຳເລັດ!', 'success');
    }

    // ສົ່ງອອກຂໍ້ມູນ
    function exportData() {
        if (transactions.length === 0) {
            showNotification('ບໍ່ມີຂໍ້ມູນທີ່ຈະສົ່ງອອກ', 'error');
            return;
        }

        // ສ້າງ CSV content
        let csvContent = "ID,ປະເພດ,ຊື່ລູກຄ້າ,ຈຳນວນເງິນ,ສະກຸນເງິນ,ລາຍລະອຽດ,ວັນທີ\n";

        transactions.forEach(transaction => {
            const row = [
                transaction.id,
                transaction.type === 'deposit' ? 'ຝາກເງິນ' : 'ຖອນເງິນ',
                `"${transaction.customerName}"`,
                transaction.amount,
                transaction.currency,
                `"${transaction.description || ''}"`,
                `"${transaction.date}"`
            ];
            
            csvContent += row.join(',') + "\n";
        });

        // ສ້າງ blob ແລະ ດາວໂຫຼດ
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ລາຍການທຸລະກຳ_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('ສົ່ງອອກຂໍ້ມູນສຳເລັດ!', 'success');
    }

    // ບັນທຶກຂໍ້ມູນ
    function saveData() {
        localStorage.setItem('depositTransactions', JSON.stringify(transactions));
        localStorage.setItem('depositStatistics', JSON.stringify(statistics));
    }

    // ສະແດງການແຈ້ງເຕືອນ
    function showNotification(message, type = 'info') {
        // ລຶບ notification ເກົ່າຖ້າມີ
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        // ສ້າງ element ແຈ້ງເຕືອນ
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = `notification ${type}`;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ເລີ່ມຕົ້ນລະບົບ
    init();
});

// ເພີ່ມ CSS ສຳລັບ notification
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);


// JavaScript ສຳລັບເລື່ອງຮ້ານຜູ້ພັດທະນາລະບົບ
document.addEventListener('DOMContentLoaded', function() {
    // ຟັງຊັ່ນອັບເດດວັນທີປັດຈຸບັນ
    function updateCurrentDate() {
        const thaiMonths = [
            'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ',
            'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ',
            'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
        ];
        
        const now = new Date();
        const thaiYear = now.getFullYear() + 543;
        const month = thaiMonths[now.getMonth()];
        
        const dateElement = document.getElementById('story-date');
        if (dateElement) {
            dateElement.textContent = `${month} ${thaiYear}`;
        }
    }
    
    // ຟັງຊັ່ນກວດສອບ ແລະ ໂຫຼດຮູບພາບສຳຮອງຖ້າຮູບຫຼັກໂຫຼດບໍ່ສຳເລັດ
    function setupImageFallback() {
        const developerPhoto = document.querySelector('.developer-photo');
        if (developerPhoto) {
            developerPhoto.onerror = function() {
                this.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=60';
                console.log('ໃຊ້ຮູບພາບສຳຮອງສຳລັບຜູ້ພັດທະນາ');
            };
        }
    }
    
    // ຟັງຊັ່ນເພີ່ມເອັຟເຟັກສະເຄີລ animation
    function setupScrollAnimations() {
        const storyElements = document.querySelectorAll('.story-paragraph, .achievement-item, .story-quote');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        storyElements.forEach(element => {
            element.style.animationPlayState = 'paused';
            observer.observe(element);
        });
    }
    
    // ຟັງຊັ່ນເພີ່ມ hover effect ສຳລັບຮູບພາບ
    function setupImageHoverEffects() {
        const storyImage = document.querySelector('.story-image');
        if (storyImage) {
            storyImage.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-10px)';
            });
            
            storyImage.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        }
    }
    
    // ຟັງຊັ່ນສ້າງຕົວເລກນັບຂຶ້ນ (counter animation)
    function setupAchievementCounters() {
        const achievementValues = document.querySelectorAll('.achievement-value');
        
        achievementValues.forEach(valueElement => {
            const originalText = valueElement.textContent;
            const numericValue = parseFloat(originalText);
            
            if (!isNaN(numericValue)) {
                valueElement.textContent = '0';
                
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            animateCounter(valueElement, numericValue, originalText);
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.5 });
                
                observer.observe(valueElement);
            }
        });
    }
    
    function animateCounter(element, targetValue, originalText) {
    if (originalText.includes('+') || originalText.includes('/')) {
        // ສຳລັບຄ່າທີ່ບໍ່ແມ່ນເລກລ້ວນ
        let current = 0;
        const increment = targetValue / 50;
        const duration = 1500;
        const stepTime = duration / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= targetValue) {
                element.textContent = originalText;
                    clearInterval(timer);
                } else {
                    if (originalText.includes('+')) {
                        element.textContent = Math.floor(current) + '+';
                    } else if (originalText.includes('/')) {
                        element.textContent = current.toFixed(1) + '/5';
                    }
                }
            }, stepTime);
        } else {
            // ສຳລັບຄ່າເປີເຊັນ
            let current = 0;
            const target = parseFloat(originalText);
            const increment = target / 100;
            const duration = 2000;
            const stepTime = duration / 100;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    element.textContent = originalText;
                    clearInterval(timer);
                } else {
                    element.textContent = current.toFixed(1) + '%';
                }
            }, stepTime);
        }
    }
    
    // ຟັງຊັ່ນເພີ່ມ signature animation
    function setupSignatureAnimation() {
        const signature = document.querySelector('.signature-name');
        if (signature) {
            // ເພີ່ມເອັຟເຟັກການຂຽນ
            signature.style.opacity = '0';
            signature.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                signature.style.transition = 'all 0.8s ease';
                signature.style.opacity = '1';
                signature.style.transform = 'translateX(0)';
            }, 500);
        }
    }
    
    // ຟັງຊັ່ນສ້າງ floating particles background
    function createFloatingParticles() {
        const storySection = document.querySelector('.developer-story-section');
        if (!storySection) return;
        
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 5 + 2}px;
                height: ${Math.random() * 5 + 2}px;
                background: rgba(52, 152, 219, ${Math.random() * 0.2 + 0.05});
                border-radius: 50%;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                z-index: 0;
                animation: floatParticle ${Math.random() * 20 + 10}s linear infinite;
            `;
            
            storySection.appendChild(particle);
        }
        
        // ເພີ່ມ CSS ສຳລັບ animation
        if (!document.querySelector('#particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes floatParticle {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.5;
                    }
                    90% {
                        opacity: 0.5;
                    }
                    100% {
                        transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // ຟັງຊັ່ນເພີ່ມ social sharing buttons
    function setupSocialSharing() {
        const storyFooter = document.querySelector('.story-footer');
        if (!storyFooter) return;
        
        const sharingDiv = document.createElement('div');
        sharingDiv.className = 'social-sharing';
        sharingDiv.innerHTML = `
            <p style="margin: 15px 0 10px; color: #7f8c8d; font-size: 0.9rem;">ແບ່ງປັນເລື່ອງຮ້ານນີ້:</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="share-btn facebook" title="ແບ່ງປັນບັນ Facebook">
                    <i class="fab fa-facebook-f"></i>
                </button>
                <button class="share-btn twitter" title="ແບ່ງປັນບັນ Twitter">
                    <i class="fab fa-twitter"></i>
                </button>
                <button class="share-btn copy" title="ຄັດລອກລິງກ໌">
                    <i class="fas fa-link"></i>
                </button>
            </div>
        `;
        
        storyFooter.appendChild(sharingDiv);
        
        // ເພີ່ມ event listeners ສຳລັບປຸ່ມແບ່ງປັນ
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.classList.contains('facebook') ? 'facebook' :
                           this.classList.contains('twitter') ? 'twitter' : 'copy';
                
                shareStory(type);
            });
        });
    }
    
    function shareStory(platform) {
        const url = window.location.href;
        const title = 'ເລື່ອງຮ້ານຜູ້ພັດທະນາລະບົບ DEVSOM AI';
        const text = 'ອ່ານເລື່ອງຮ້ານການພັດທະນາລະບົບຈັດການຮັບເງິນຝາກໂດຍ DEVSOM AI';
        
        switch(platform) {
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(url).then(() => {
                    alert('ຄັດລອກລິງກ໌ຮຽບຮ້ອຍແລ້ວ!');
                });
                break;
        }
    }
    
    // ເອີ້ນໃຊ້ງານຟັງຊັ່ນທັງໝົດ
    updateCurrentDate();
    setupImageFallback();
    setupScrollAnimations();
    setupImageHoverEffects();
    setupAchievementCounters();
    setupSignatureAnimation();
    createFloatingParticles();
    setupSocialSharing();
    
    console.log('Developer story script loaded successfully');
});


// JavaScript ເພີ່ມເຕີມສຳລັບ Footer
document.addEventListener('DOMContentLoaded', function() {
    // ຟັງຊັ່ນອັບເດດປີປັດຈຸບັນ
    function updateCurrentYear() {
        const currentYear = new Date().getFullYear();
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = currentYear;
        }
    }
    
    // ຟັງຊັ່ນເພີ່ມ event listeners ໃຫ້ລິງກ໌ໃນ footer
    function setupFooterLinks() {
        // ລິງກ໌ອີເມວ
        const emailLinks = document.querySelectorAll('a[href^="mailto:spschannel30@gmail.com"]');
        emailLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                console.log('ສົ່ງອີເມວເຖິງ: spschannel30@gmail.com');
                // ສາມາດເພີ່ມ Analytics ຫຼື Tracking ໄດ້ທີ່ນີ້
            });
        });
        
        // ລິງກ໌ໂທລະສັບ
        const phoneLinks = document.querySelectorAll('a[href^="tel:02055982850"]');
        phoneLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                console.log('ໂທລະສັບ: 020-5598-2850');
                // ສາມາດເພີ່ມ Analytics ຫຼື Tracking ໄດ້ທີ່ນີ້
            });
        });
        
        // ລິງກ໌ໂຊຊ້ຽວມີເດຍ
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const title = this.getAttribute('title');
                console.log(`ຄລິກທີ່ລິງກ໌: ${title}`);
                
                // ຖ້າເປັນລິງກ໌ທີ່ບໍ່ໄດ້ຕັ້ງໃຫ້ href ປ້ອງກັນການນຳທາງ
                if (this.getAttribute('href') === '#') {
                    e.preventDefault();
                    alert(`ລິງກ໌ ${title} ກຳລັງຢູ່ໃນລະຫວ່າງການພັດທະນາ`);
                }
            });
        });
    }
    
    // ຟັງຊັ່ນເພີ່ມເອັຟເຟັກ hover ໃຫ້ກັບ contact items
    function setupContactHoverEffects() {
        const contactItems = document.querySelectorAll('.contact-item');
        contactItems.forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(5px)';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });
    }
    
    // ຟັງຊັ່ນສະແດງຂໍ້ມູນ developer ເມື່ອ hover
    function setupDeveloperInfo() {
        const developerSection = document.querySelector('.developer-info');
        if (developerSection) {
            developerSection.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                this.style.borderLeftColor = '#ffd166';
                this.style.transform = 'scale(1.02)';
                this.style.transition = 'all 0.3s ease';
            });
            
            developerSection.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                this.style.borderLeftColor = '#3498db';
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // ຟັງຊັ່ນສະແດງ tooltip ສຳລັບ social links
    function setupSocialLinkTooltips() {
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            const title = link.getAttribute('title');
            
            link.addEventListener('mouseenter', function(e) {
                // ສ້າງ tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'social-tooltip';
                tooltip.textContent = title;
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    z-index: 1000;
                    transform: translateY(-30px);
                `;
                
                this.appendChild(tooltip);
            });
            
            link.addEventListener('mouseleave', function() {
                const tooltip = this.querySelector('.social-tooltip');
                if (tooltip) {
                    this.removeChild(tooltip);
                }
            });
        });
    }
    
    // ຟັງຊັ່ນກວດສອບ ແລະ ເພີ່ມ CSS ສຳລັບ tooltip ຖ້າບໍ່ມີ
    function ensureTooltipStyles() {
        if (!document.querySelector('#footer-tooltip-styles')) {
            const style = document.createElement('style');
            style.id = 'footer-tooltip-styles';
            style.textContent = `
                .social-tooltip {
                    position: absolute;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    z-index: 1000;
                    transform: translateY(-30px);
                    pointer-events: none;
                }
                
                .social-link {
                    position: relative;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // ເອີ້ນໃຊ້ງານຟັງຊັ່ນທັງໝົດເມື່ອໂຫຼດຫນ້າແລ້ວ
    updateCurrentYear();
    setupFooterLinks();
    setupContactHoverEffects();
    setupDeveloperInfo();
    ensureTooltipStyles();
    setupSocialLinkTooltips();
    
    console.log('Footer script loaded successfully');
});
let balance = 0;
let totalDeposit = 0;
let totalWithdraw = 0;

function updateBalance() {
  document.getElementById('balance').innerText = balance;
  document.getElementById('totalDeposit').innerText = totalDeposit;
  document.getElementById('totalWithdraw').innerText = totalWithdraw;
}

function showMessage(msg, isError = true) {
  const messageDiv = document.getElementById('message');
  messageDiv.innerText = msg;
  messageDiv.style.color = isError ? 'red' : 'green';

  setTimeout(() => {
    messageDiv.innerText = '';
  }, 3000);
}

function addToHistory(type, amount, currentBalance) {
  const table = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
  const row = table.insertRow();

  const typeCell = row.insertCell(0);
  const amountCell = row.insertCell(1);
  const balanceCell = row.insertCell(2);
  const timeCell = row.insertCell(3);

  const time = new Date().toLocaleTimeString();

  typeCell.innerText = type;
  amountCell.innerText = `₹${amount}`;
  balanceCell.innerText = `₹${currentBalance}`;
  timeCell.innerText = time;

  // Add styling class
  row.classList.add(type === "Deposit" ? 'deposit-row' : 'withdraw-row');
}

function deposit() {
  const amount = parseFloat(document.getElementById('amount').value);
  if (isNaN(amount) || amount <= 0) {
    showMessage('Please enter a valid deposit amount.');
    return;
  }

  balance += amount;
  totalDeposit += amount;
  updateBalance();
  addToHistory("Deposit", amount, balance);
  showMessage(`Deposited ₹${amount}`, false);
  document.getElementById('amount').value = '';
}

function withdraw() {
  const amount = parseFloat(document.getElementById('amount').value);
  if (isNaN(amount) || amount <= 0) {
    showMessage('Please enter a valid withdrawal amount.');
    return;
  }

  if (amount > balance) {
    showMessage('Insufficient balance!');
    return;
  }

  balance -= amount;
  totalWithdraw += amount;
  updateBalance();
  addToHistory("Withdraw", amount, balance);
  showMessage(`Withdrew ₹${amount}`, false);
  document.getElementById('amount').value = '';
}

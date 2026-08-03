const API_BASE_URL = 'http://127.0.0.1:8000';

const OPERATORS = new Set(['+', '-', '*', '/', '**', '%']);

const state = {
    expression: '',
    history: [],
    result: '',
    resultExpression: '',
    resultDisplayed: false,
    isError: false,
    isCalculating: false
};

const mainDisplay = document.getElementById('main-display');
const expressionDisplay = document.getElementById('expression-display');
const serverStatus = document.getElementById('server-status');
const statusText = serverStatus.querySelector('.status-text');
const historyDrawer = document.getElementById('history-drawer');
const historyOverlay = document.getElementById('history-overlay');
const historyList = document.getElementById('history-list');
const toastEl = document.getElementById('toast');

function showToast(message, duration = 2500) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.setTimeout(() => toastEl.classList.remove('show'), duration);
}

function formatExpression(expression) {
    return expression
        .replace(/\*\*/g, '^')
        .replace(/\*/g, '\u00d7')
        .replace(/\//g, '\u00f7')
        .replace(/-/g, '\u2212');
}

function parseExpression(expression) {
    return expression
        .replace(/\^/g, '**')
        .replace(/\u00d7/g, '*')
        .replace(/\u00f7/g, '/')
        .replace(/\u2212/g, '-');
}

function updateDisplay() {
    mainDisplay.classList.toggle('error', state.isError);

    if (state.resultDisplayed) {
        mainDisplay.textContent = state.result;
        expressionDisplay.textContent = state.resultExpression
            ? `${formatExpression(state.resultExpression)} =`
            : '';
    } else {
        mainDisplay.textContent = formatExpression(state.expression) || '0';
        expressionDisplay.textContent = '';
    }

    document.querySelectorAll('.operator-key').forEach((button) => {
        button.classList.remove('active-operator');
    });
}

function clearResultState() {
    state.result = '';
    state.resultExpression = '';
    state.resultDisplayed = false;
    state.isError = false;
}

function resetCalculator() {
    state.expression = '';
    clearResultState();
    updateDisplay();
}

function beginNewExpressionIfNeeded(initialValue) {
    if (state.isError || state.resultDisplayed) {
        state.expression = initialValue;
        clearResultState();
        return true;
    }
    return false;
}

function inputDigit(digit) {
    if (!beginNewExpressionIfNeeded(digit)) {
        state.expression += digit;
    }
    updateDisplay();
}

function currentNumber() {
    const match = state.expression.match(/(?:^|[+*/%])(-?\d*\.?\d*)$/);
    return match ? match[1] : '';
}

function inputDecimal() {
    if (beginNewExpressionIfNeeded('0.')) {
        updateDisplay();
        return;
    }

    const number = currentNumber();
    if (!number.includes('.')) {
        state.expression += number === '' || number === '-' ? '0.' : '.';
    }
    updateDisplay();
}

function handleOperator(operator) {
    if (state.isError) return;

    const validOperators = ['+', '-', '*', '/', '**', '%'];
    if (!validOperators.includes(operator)) return;

    if (state.resultDisplayed) {
        state.expression = `${state.result}${operator}`;
        clearResultState();
    } else if (state.expression === '') {
        if (operator === '-' || operator === '+') state.expression = operator;
    } else {
        const validOpPattern = /[+*/%-]$|^-$|^[+]$/;
        if (validOpPattern.test(state.expression)) {
            state.expression = `${state.expression.slice(0, -1) || ''}${operator}`;
        } else {
            state.expression += operator;
        }
    }
    updateDisplay();
}

function handleNegate() {
    if (state.isError) return;

    if (state.resultDisplayed) {
        state.expression = state.result;
        clearResultState();
    }

    if (!state.expression || /[+*/%-]$/.test(state.expression)) return;

    const match = state.expression.match(/(?:^|[+*/%])(-?\d*\.?\d*)$/);
    if (!match) return;

    const number = match[1];
    const numberStart = state.expression.length - number.length;
    const precedingCharacter = state.expression.at(numberStart - 1);

    if (number.startsWith('-')) {
        state.expression = `${state.expression.slice(0, numberStart)}${number.slice(1)}`;
    } else if (precedingCharacter === '-') {
        state.expression = `${state.expression.slice(0, numberStart - 1)}${number}`;
    } else {
        state.expression = `${state.expression.slice(0, numberStart)}-${number}`;
    }
    updateDisplay();
}

function handleDelete() {
    if (state.isError || state.resultDisplayed) {
        resetCalculator();
        return;
    }
    state.expression = state.expression.slice(0, -1);
    updateDisplay();
}

async function checkServerHealth() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2000);

    try {
        const response = await fetch(`${API_BASE_URL}/`, { signal: controller.signal });
        if (!response.ok) throw new Error('Server returned an error');
        serverStatus.className = 'status-badge online';
        statusText.textContent = 'API Online';
    } catch {
        serverStatus.className = 'status-badge offline';
        statusText.textContent = 'API Offline';
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function executeCalculation() {
    if (!state.expression || state.isError || state.isCalculating) return;

    const expression = state.expression;
    state.isCalculating = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/calculate?expr=${encodeURIComponent(expression)}`,
            { method: 'POST' }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Calculation failed (${response.status})`);
        }

        const payload = await response.json().catch(() => null);
        let result;
        if (payload && typeof payload.result === 'number') {
            result = formatResult(payload.result);
        } else {
            const text = await response.text();
            result = text || '';
            if (!result) throw new Error('The server returned an empty result');
        }

        state.expression = '';
        state.result = result;
        state.resultExpression = expression;
        state.resultDisplayed = true;
        state.isError = false;
        addHistoryEntry({ expr: formatExpression(expression), result });
    } catch (error) {
        state.result = error.message || 'Calculation failed';
        state.resultExpression = expression;
        state.resultDisplayed = true;
        state.isError = true;
        showToast(state.result);
    } finally {
        state.isCalculating = false;
        updateDisplay();
    }
}

function formatResult(value) {
    if (Number.isInteger(value)) return String(value);
    const str = value.toString();
    if (str.length > 16) {
        return parseFloat(value.toPrecision(12)).toString();
    }
    return str;
}

function addHistoryEntry(entry) {
    state.history.unshift(entry);
    if (state.history.length > 30) state.history.pop();
    saveHistory();
    renderHistory();
}

function saveHistory() {
    try {
        localStorage.setItem('fastapi_calc_history', JSON.stringify(state.history));
    } catch {
        // Storage unavailable
    }
}

function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('fastapi_calc_history');
        state.history = savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
        state.history = [];
    }
    renderHistory();
}

function renderHistory() {
    if (!state.history.length) {
        historyList.innerHTML = '<div class="empty-history">No past calculations</div>';
        return;
    }

    historyList.innerHTML = state.history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <span class="history-expr">${item.expr} =</span>
            <span class="history-res">${item.result}</span>
        </div>
    `).join('');

    historyList.querySelectorAll('.history-item').forEach((item) => {
        item.addEventListener('click', () => loadHistoryResult(Number(item.dataset.index)));
    });
}

function loadHistoryResult(index) {
    const entry = state.history[index];
    if (!entry) return;

    const restoredExpr = parseExpression(entry.expr);
    state.expression = restoredExpr;
    state.result = entry.result;
    state.resultExpression = restoredExpr;
    state.resultDisplayed = true;
    state.isError = false;
    updateDisplay();
    closeHistory();
    showToast(`Loaded ${entry.result}`);
}

function openHistory() {
    historyDrawer.classList.add('open');
    historyOverlay.classList.add('open');
}

function closeHistory() {
    historyDrawer.classList.remove('open');
    historyOverlay.classList.remove('open');
}

function activateKey(button) {
    if (!button) return;
    button.classList.add('active-key');
    window.setTimeout(() => button.classList.remove('active-key'), 150);
}

function handleKeypadButton(button) {
    if (button.dataset.num !== undefined) {
        inputDigit(button.dataset.num);
    } else if (button.dataset.operator !== undefined) {
        handleOperator(button.dataset.operator);
    } else if (button.dataset.action === 'clear') {
        resetCalculator();
    } else if (button.dataset.action === 'delete') {
        handleDelete();
    } else if (button.dataset.action === 'decimal') {
        inputDecimal();
    } else if (button.dataset.action === 'negate') {
        handleNegate();
    } else if (button.dataset.action === 'calculate') {
        executeCalculation();
    }
}

function initEvents() {
    document.querySelector('.keypad-grid').addEventListener('click', (event) => {
        const button = event.target.closest('.key');
        if (!button) return;
        activateKey(button);
        handleKeypadButton(button);
    });

    window.addEventListener('keydown', (event) => {
        if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

        const keyMap = {
            '+': ['key-add', () => handleOperator('+')],
            '-': ['key-subtract', () => handleOperator('-')],
            '*': ['key-multiply', () => handleOperator('*')],
            '/': ['key-divide', () => handleOperator('/')],
            '%': ['key-modulo', () => handleOperator('%')],
            '^': ['key-power', () => handleOperator('**')],
            '.': ['key-decimal', inputDecimal],
            Backspace: ['key-delete', handleDelete],
            Escape: ['key-clear', resetCalculator],
            Enter: ['calculate', executeCalculation],
            '=': ['calculate', executeCalculation]
        };
        const digitAction = event.key >= '0' && event.key <= '9'
            ? [`key-${event.key}`, () => inputDigit(event.key)]
            : keyMap[event.key];
        if (!digitAction) return;

        if (['/', 'Enter', '='].includes(event.key)) event.preventDefault();
        digitAction[1]();
        activateKey(document.getElementById(digitAction[0]));
    });

    document.getElementById('history-toggle-btn').addEventListener('click', openHistory);
    document.getElementById('close-history-btn').addEventListener('click', closeHistory);
    historyOverlay.addEventListener('click', closeHistory);
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        state.history = [];
        saveHistory();
        renderHistory();
        showToast('History cleared');
    });
    document.getElementById('copy-btn').addEventListener('click', async () => {
        const value = state.resultDisplayed ? state.result : state.expression;
        if (!value || state.isError) return;
        try {
            await navigator.clipboard.writeText(value);
            showToast('Copied to clipboard!');
        } catch {
            showToast('Copy failed');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadHistory();
    updateDisplay();
    checkServerHealth();
    window.setInterval(checkServerHealth, 8000);
});

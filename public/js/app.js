const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // State
    let token = localStorage.getItem('token');
    let user = null;
    try {
        const u = localStorage.getItem('user');
        if (u && u !== 'undefined') user = JSON.parse(u);
    } catch(e) {}
    let polls = [];

    // DOM Elements
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const pollsContainer = document.getElementById('polls-container');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const createPollForm = document.getElementById('create-poll-form');
    const createPollCard = document.getElementById('create-poll-card');
    const showCreatePollBtn = document.getElementById('show-create-poll-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const addOptionBtn = document.getElementById('add-option-btn');
    const pollOptionsContainer = document.getElementById('poll-options-container');

    const loginTabBtn = document.getElementById('login-tab');
    const registerTabBtn = document.getElementById('register-tab');

    if (loginTabBtn) {
        loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    }
    if (registerTabBtn) {
        registerTabBtn.addEventListener('click', () => switchAuthTab('register'));
    }

    // Initialization
    function init() {
        if (token && user) {
            showDashboard();
        } else {
            showAuth();
        }
    }

    function switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
        
        if (tab === 'login') {
            if (loginTabBtn) loginTabBtn.classList.add('active');
            loginForm.classList.remove('hidden');
        } else {
            if (registerTabBtn) registerTabBtn.classList.add('active');
            registerForm.classList.remove('hidden');
        }
    }

    function showDashboard() {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userDisplay.textContent = `Hello, ${user.username}`;
        userDisplay.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        fetchPolls();
    }

    function showAuth() {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        userDisplay.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }

    async function handleAuth(e, type) {
        e.preventDefault();
        const isLogin = type === 'login';
        const username = document.getElementById(`${isLogin?'login':'reg'}-username`).value;
        const password = document.getElementById(`${isLogin?'login':'reg'}-password`).value;
        const errorEl = document.getElementById(`${isLogin?'login':'reg'}-error`);
        
        try {
            const res = await fetch(`${API_URL}/auth/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.msg || 'Authentication failed');
            
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            errorEl.textContent = '';
            showDashboard();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    }

    loginForm.addEventListener('submit', (e) => handleAuth(e, 'login'));
    registerForm.addEventListener('submit', (e) => handleAuth(e, 'register'));

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        token = null;
        user = null;
        showAuth();
    });

    showCreatePollBtn.addEventListener('click', () => createPollCard.classList.remove('hidden'));
    cancelCreateBtn.addEventListener('click', () => createPollCard.classList.add('hidden'));

    addOptionBtn.addEventListener('click', () => {
        const optionCount = pollOptionsContainer.children.length + 1;
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <input type="text" class="poll-option-input" required placeholder=" ">
            <label>Option ${optionCount}</label>
        `;
        pollOptionsContainer.appendChild(div);
    });

    createPollForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('poll-question').value;
        const inputs = document.querySelectorAll('.poll-option-input');
        const options = Array.from(inputs).map(inp => inp.value).filter(val => val.trim() !== '');
        const errorEl = document.getElementById('create-poll-error');

        try {
            const res = await fetch(`${API_URL}/polls`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question, options })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || 'Failed to create poll');
            
            createPollForm.reset();
            createPollCard.classList.add('hidden');
            pollOptionsContainer.innerHTML = `
                <div class="input-group">
                    <input type="text" class="poll-option-input" required placeholder=" ">
                    <label>Option 1</label>
                </div>
                <div class="input-group">
                    <input type="text" class="poll-option-input" required placeholder=" ">
                    <label>Option 2</label>
                </div>
            `;
            fetchPolls();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    async function fetchPolls() {
        try {
            const res = await fetch(`${API_URL}/polls`);
            polls = await res.json();
            renderPolls();
        } catch (err) {
            console.error('Error fetching polls:', err);
        }
    }

    window.vote = async function(pollId, optionId) {
        if (!token) return alert('Please login to vote');
        
        try {
            const res = await fetch(`${API_URL}/polls/${pollId}/vote`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ optionId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || 'Voting failed');
            
            fetchPolls();
        } catch (err) {
            alert(err.message);
        }
    }

    function renderPolls() {
        pollsContainer.innerHTML = '';
        
        polls.forEach(poll => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            const hasVoted = user && poll.votedUsers.includes(user.id);

            const card = document.createElement('div');
            card.className = 'card glass poll-card';
            
            let optionsHtml = '';
            poll.options.forEach(opt => {
                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                optionsHtml += `
                    <div class="poll-option ${hasVoted ? 'voted' : ''}" ${!hasVoted ? `onclick="window.vote('${poll._id}', '${opt._id}')"` : ''}>
                        <div class="poll-option-fill" style="width: ${hasVoted ? percentage : 0}%"></div>
                        <div class="poll-option-content">
                            <span>${opt.text}</span>
                            ${hasVoted ? `<span>${percentage}% (${opt.votes})</span>` : ''}
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="poll-question">${poll.question}</div>
                <div class="poll-options">
                    ${optionsHtml}
                </div>
                <div class="poll-meta">Total Votes: ${totalVotes}</div>
            `;
            pollsContainer.appendChild(card);
        });
    }

    init();
});

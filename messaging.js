// Module Messagerie
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('message-recipient')) {
        setupMessaging();
    }
});

function setupMessaging() {
    updateMessageRecipients();
    
    document.getElementById('new-conversation-btn').addEventListener('click', () => {
        const recipient = document.getElementById('message-recipient').value;
        if (!recipient) {
            alert("Veuillez sélectionner un destinataire!");
            return;
        }
        
        if (recipient.startsWith('all')) {
            let targetUsers = [];
            
            if (recipient === 'all') {
                targetUsers = state.users.filter(u => u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-doctors') {
                targetUsers = state.users.filter(u => u.role === 'doctor' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-nurses') {
                targetUsers = state.users.filter(u => u.role === 'nurse' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-secretaries') {
                targetUsers = state.users.filter(u => u.role === 'secretary' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-cashiers') {
                targetUsers = state.users.filter(u => u.role === 'cashier' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-labs') {
                targetUsers = state.users.filter(u => u.role === 'lab' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-pharmacies') {
                targetUsers = state.users.filter(u => u.role === 'pharmacy' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-admins') {
                targetUsers = state.users.filter(u => u.role === 'admin' && u.active && u.username !== state.currentUser.username);
            } else if (recipient === 'all-responsibles') {
                targetUsers = state.users.filter(u => u.role === 'responsible' && u.active && u.username !== state.currentUser.username);
            }
            
            const messageContent = prompt(`Entrez votre message à ${targetUsers.length} destinataire(s):`);
            if (!messageContent) return;
            
            targetUsers.forEach(user => {
                const message = {
                    id: 'MSG' + Date.now(),
                    sender: state.currentUser.username,
                    senderRole: state.currentRole,
                    recipient: user.username,
                    recipientRole: user.role,
                    subject: `Message à tous les ${user.role}s`,
                    content: messageContent,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'broadcast'
                };
                state.messages.push(message);
            });
            
            alert(`Message envoyé à ${targetUsers.length} destinataire(s)!`);
            loadConversations();
            updateMessageBadge();
            document.getElementById('message-recipient').selectedIndex = 0;
            return;
        }
        
        state.currentConversation = recipient;
        loadConversation(recipient);
        document.getElementById('message-recipient').selectedIndex = 0;
    });
    
    document.getElementById('send-message-btn').addEventListener('click', () => {
        sendMessage();
    });
    
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function updateMessageRecipients() {
    const select = document.getElementById('message-recipient');
    if (!select) return;
    
    select.innerHTML = '<option value="">Nouveau message...</option>' +
        '<option value="all">Tous les utilisateurs</option>' +
        '<option value="all-doctors">Tous les médecins</option>' +
        '<option value="all-nurses">Tous les infirmiers</option>' +
        '<option value="all-secretaries">Tous les secrétaires</option>' +
        '<option value="all-cashiers">Tous les caissiers</option>' +
        '<option value="all-labs">Tout le laboratoire</option>' +
        '<option value="all-pharmacies">Toute la pharmacie</option>' +
        '<option value="all-admins">Tous les administrateurs</option>' +
        '<option value="all-responsibles">Tous les responsables</option>';
    
    state.users.forEach(user => {
        if (user.active && user.username !== state.currentUser.username) {
            select.innerHTML += `<option value="${user.username}">${user.name} (${user.role})</option>`;
        }
    });
}

function loadConversations() {
    const container = document.getElementById('conversations-container');
    if (!container) return;
    
    const userMessages = state.messages.filter(m => 
        m.recipient === state.currentUser.username || 
        m.sender === state.currentUser.username
    );
    
    const conversations = {};
    userMessages.forEach(message => {
        const otherUser = message.sender === state.currentUser.username ? message.recipient : message.sender;
        if (!conversations[otherUser]) {
            conversations[otherUser] = {
                user: otherUser,
                lastMessage: message,
                unread: message.recipient === state.currentUser.username && !message.read
            };
        } else {
            if (new Date(message.timestamp) > new Date(conversations[otherUser].lastMessage.timestamp)) {
                conversations[otherUser].lastMessage = message;
            }
            if (message.recipient === state.currentUser.username && !message.read) {
                conversations[otherUser].unread = true;
            }
        }
    });
    
    let html = '';
    Object.values(conversations).forEach(conv => {
        const otherUser = state.users.find(u => u.username === conv.user);
        const displayName = otherUser ? otherUser.name : conv.user;
        
        html += `
            <div class="conversation-item ${conv.unread ? 'unread' : ''} ${state.currentConversation === conv.user ? 'active' : ''}" 
                 onclick="loadConversation('${conv.user}')">
                <div class="d-flex align-items-center">
                    <div class="conversation-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="conversation-info">
                        <div class="d-flex justify-between">
                            <strong>${displayName}</strong>
                            <span class="conversation-time">${new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div class="conversation-last-message">${conv.lastMessage.content.substring(0, 50)}${conv.lastMessage.content.length > 50 ? '...' : ''}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>Aucune conversation</p>';
}

function loadConversation(otherUser) {
    state.currentConversation = otherUser;
    const messages = state.messages.filter(m => 
        (m.sender === state.currentUser.username && m.recipient === otherUser) ||
        (m.sender === otherUser && m.recipient === state.currentUser.username)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const otherUserObj = state.users.find(u => u.username === otherUser);
    const displayName = otherUserObj ? otherUserObj.name : otherUser;
    
    const titleElement = document.getElementById('current-conversation-title');
    if (titleElement) {
        titleElement.textContent = `Conversation avec ${displayName}`;
    }
    
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    let html = '';
    
    messages.forEach(message => {
        const isSent = message.sender === state.currentUser.username;
        const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        
        html += `
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble-content">
                    ${message.content}
                </div>
                <div class="message-bubble-time">${time}</div>
            </div>
        `;
        
        if (message.recipient === state.currentUser.username && !message.read) {
            message.read = true;
        }
    });
    
    container.innerHTML = html || '<p>Aucun message</p>';
    container.scrollTop = container.scrollHeight;
    
    const chatInputContainer = document.getElementById('chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.classList.remove('hidden');
    }
    
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.focus();
    }
    
    loadConversations();
    updateMessageBadge();
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content || !state.currentConversation) {
        alert("Veuillez sélectionner un destinataire et entrer un message!");
        return;
    }
    
    const message = {
        id: 'MSG' + Date.now(),
        sender: state.currentUser.username,
        senderRole: state.currentRole,
        recipient: state.currentConversation,
        recipientRole: state.users.find(u => u.username === state.currentConversation)?.role || '',
        subject: 'Message',
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message'
    };
    
    state.messages.push(message);
    input.value = '';
    
    loadConversation(state.currentConversation);
    updateMessageBadge();
}
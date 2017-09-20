// // FIX ME
// // NOTE: The contents of this file will only be executed if
// // you uncomment its entry in "web/static/js/app.js".

// // To use Phoenix channels, the first step is to import Socket
// // and connect at the socket path in "lib/my_app/endpoint.ex":
// import { Presence } from 'phoenix';
// import i18n from './i18n';
// import socket from './socket';

// const channelId = window.channel_id;
// const channel = socket.channel(`game:${channelId}`, {});
// const message = $('#message-input');
// const chatMessages = document.getElementById('chat-messages');
// let presences = {};
// const onlineUsers = document.getElementById('online-users');

// const listUsers = user => ({
//     user,
// });

// const renderUsers = (presences) => {
//     if (Object.keys(presences).length > 0 && onlineUsers !== null) {
//         onlineUsers.innerHTML = Presence.list(presences, listUsers)
//             .map(presence => `
//         <li>${presence.user}</li>`)
//             .join("");
//     }
// };


// const getDataFromDiff = (diff, key) => {
//     const messageType = key === 'join' ? i18n.t('joined to') : i18n.t('left');
//     const message = document.createElement('div');
//     message.className = key === 'join' ? 'text-success' : 'text-danger';
// message.innerHTML = Object
//   .keys(diff[`${key}s`])
//   .reduce((acc, name) => `${acc}\n<i>${name} ${messageType} ${i18n.t('channel')}</i><br>`, "");

//     return message;
// };

// message.focus();

// message.on('keypress', (event) => {
//     if (event.keyCode === 13) {
//         channel.push('message:new', { message: message.val() });
//         message.val('');
//     }
// });
// channel.on('message:new', (payload) => {
//     const template = document.createElement('div');
//     template.innerHTML = `<b>${payload.user}</b>: ${payload.message}<br>`;
//     chatMessages.appendChild(template);
//     chatMessages.scrollTop = chatMessages.scrollHeight;
// });

// channel.on('presence_state', (state) => {
//     presences = Presence.syncState(presences, state);
//     renderUsers(presences);
// });

// channel.on('presence_diff', (diff) => {
//     if (Object.keys(diff).length > 0 && chatMessages !== null) {
//         const leaves = getDataFromDiff(diff, "leave");
//         const joins = getDataFromDiff(diff, "join");
//         chatMessages.appendChild(leaves);
//         chatMessages.appendChild(joins);
//         chatMessages.scrollTop = chatMessages.scrollHeight;
//         presences = Presence.syncDiff(presences, diff);
//         renderUsers(presences);
//     }
// });

// channel.join()
//     .receive('ok', (resp) => { console.log('Joined successfully', resp); })
//     .receive('error', (resp) => { console.log('Unable to join', resp); });

// export default socket;

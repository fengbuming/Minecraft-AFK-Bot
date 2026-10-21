const mineflayer = require('mineflayer');
const config = require('./config.json');

let bot;
let reconnectAttempts = 0;
let reconnectTimer;

function createBot() {
  const currentBot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: false,
    viewDistance: config.botChunk
  });
  bot = currentBot;

  let readyTimer;
  let stableTimer;
  let ended = false;

  currentBot.once('inject_allowed', () => {
    if (!currentBot.supportFeature('sendsClientTickEndPacket')) return;

    currentBot.on('physicsTick', () => {
      setImmediate(() => {
        if (!ended && currentBot._client.state === 'play') {
          currentBot._client.write('tick_end', {});
        }
      });
    });
  });

  function clearTimers() {
    clearTimeout(readyTimer);
    clearTimeout(stableTimer);
  }

  currentBot.on('spawn', () => {
    clearTimers();
    stableTimer = setTimeout(() => {
      if (!ended && bot === currentBot) reconnectAttempts = 0;
    }, 60000);
    readyTimer = setTimeout(() => {
      if (ended || bot !== currentBot || !currentBot.entity) return;
      console.log(`✅ ${config.botUsername} is Ready!`);
    }, 3000);
  });

  currentBot.on('error', (err) => {
    console.error('⚠️ Error:', err);
  });

  currentBot.on('end', () => {
    if (ended) return;
    ended = true;
    clearTimers();
    console.log('⛔️ Bot Disconnected!');
    if (!reconnectTimer) {
      const delay = Math.min(5000 * 2 ** reconnectAttempts, 60000);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        createBot();
      }, delay);
    }
  });
}

createBot();

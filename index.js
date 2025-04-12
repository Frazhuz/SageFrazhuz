require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const commands = {
  ping: require('./commands/ping'),
  say: require('./commands/say')
};

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});


client.login(DISCORD_TOKEN).catch(err => {
  console.error('Ошибка входа:', err);
  process.exit(1);
});

client.on('ready', () => {
    console.log(`Бот успешно запущен как ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
    case 'ping':
      await commands.ping.execute(interaction);
      break;
    case 'say':
      await commands.say.execute(interaction);
      break;
    default:
      console.warn(`Неизвестная команда: ${interaction.commandName}`);
    }
});

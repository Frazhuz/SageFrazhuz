require('dotenv').config();
import { Client, GatewayIntentBits } from 'discord.js';
import loadCommand from './utils/commandLoader';
import ErrorHandler from './utils/errorHandler';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

let commands = {};

Promise.all([
  loadCommand('ping', './commands/ping.js'),
  loadCommand('say', './commands/say.js'),
  loadCommand('import', './commands/import/import.js')
])
  .then(commandArray => {
    commands = Object.fromEntries(commandArray); 
    return client.login(process.env.DISCORD_TOKEN); 
  })
  .then(() => console.log('🔗 Connecting to Discord...'))
  .catch((error) => {
    console.error('❌ Failed to load commands or login:', error);
    process.exit(1);
  });
  
process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
})

client.on('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`🛠️ Loaded ${Object.keys(commands).length} commands`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) return ErrorHandler.handleInteractionError(
    interaction,
    'interaction',
    `Attempted to call unknown command: ${interaction.commandName}`,
    '⚠️ This command does not exist.'
    );

  await ErrorHandler.wrap('interaction', command.execute)(interaction);
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

require('dotenv').config();
import { Client, GatewayIntentBits } from 'discord.js';
import loadCommand from './utils/commandLoader.mjs';
import { KeyError, ErrorHandler } from './utils/errorHandler.mjs';

const ERROR_MESSAGES = {
  NO_DISCORD_TOKEN: () => 'Missing DISCORD_TOKEN in .env',
  FAILED_INITIALIZE: () => 'Failed to load commands or login',
  UNKNOWN_COMMAND: (name) => `Attempted to call unknown command: ${name}`,
  UNHANDLED_REJECTION: () => 'Unhandled Promise Rejection',
  UNCAUGHT_EXCEPTION: () => 'Uncaught Exception',
};

const ERROR_REPLIES = {
  UNKNOWN_COMMAND: '⚠️ This command does not exist.'
};

const log = ErrorHandler.log.bind(ErrorHandler, ERROR_MESSAGES);
const reply = ErrorHandler.reply.bind(ErrorHandler, ERROR_REPLIES);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

if (!process.env.DISCORD_TOKEN) {
  log({ key: 'NO_DISCORD_TOKEN' });
  process.exit(1);
}

let commands = {};
Promise.all([
  loadCommand('ping', './commands/ping.mjs'),
  loadCommand('say', './commands/say.mjs'),
  loadCommand('import', './commands/import/import.mjs')
])
  .then(commandArray => {
    commands = Object.fromEntries(commandArray); 
    return client.login(process.env.DISCORD_TOKEN); 
  })
  .then(() => console.log('🔗 Connecting to Discord...'))
  .catch((cause) => {
    log({ key: 'FAILED_INITIALIZE', cause: cause });
    process.exit(1);
  });
  
process.on(
  'unhandledRejection',
  (cause) => log({ key: 'UNHANDLED_REJECTION', cause: cause })
  );

process.on(
  'uncaughtException',
  (cause) => log({ key: 'UNCAUGHT_EXCEPTION', cause: cause })
  );


client.on('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`🛠️ Loaded ${Object.keys(commands).length} commands`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) {
    await reply({key: 'UNKNOWN_COMMAND', interaction: interaction, name: interaction.commandName});
    return;
  }

  await ErrorHandler.wrap(command.ERROR_MESSAGES, command.ERROR_REPLIES, command.execute)(interaction);
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

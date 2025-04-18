require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const loadCommand = require('./utils/commandLoader.js');
const { KeyError, genReportError } = require('./utils/errorHandler.js');

const ERROR_MESSAGES = {
  NO_DISCORD_TOKEN: () => 'Missing DISCORD_TOKEN in .env',
  FAILED_LOGIN: () => 'Failed to login.',
  FAILED_LOAD: () => 'Unexpected error loading commands. None of the commands are loaded.',
  UNKNOWN_COMMAND: (name) => `Attempted to call unknown command: ${name}`,
  UNHANDLED_REJECTION: () => 'Unhandled Promise Rejection.',
  UNCAUGHT_EXCEPTION: () => 'Uncaught Exception.',
};

const ERROR_REPLIES = {
  UNKNOWN_COMMAND: '⚠️ This command does not exist or not loaded yet.'
};

const reportError = genReportError(ERROR_MESSAGES);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

if (!process.env.DISCORD_TOKEN) reportError({ key: 'NO_DISCORD_TOKEN' });

client.login(process.env.DISCORD_TOKEN).then(
  () => reportError.client = client,
  cause => reportError({ key: 'FAILED_LOGIN', cause: cause })
);

let commands = {};
Promise.all([
  loadCommand('ping', './commands/ping.js'),
  loadCommand('say', '../commands/say.js'),
  loadCommand('import', '../commands/import/import.js')
])
  .then(
    commandArray => commands = Object.fromEntries(commandArray),
    cause => reportError({ key: 'FAILED_LOGIN', cause: cause })
  );
  
process.on(
  'unhandledRejection',
  (cause) => reportError({ key: 'UNHANDLED_REJECTION', cause: cause })
  );

process.on(
  'uncaughtException',
  (cause) => reportError({ key: 'UNCAUGHT_EXCEPTION', cause: cause })
  );

client.on('ready', () => console.log(`🤖 Bot logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  const ReportError = genReportError(ERROR_MESSAGES, client, ERROR_REPLIES, interaction);
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) {
    await ReportError({key: 'UNKNOWN_COMMAND', messageArgs: interaction.commandName});
    return;
  }

  const ReportInternalError = genReportError(
    command.ERROR_MESSAGES, 
    client,
    command.ERROR_REPLIES,
    interaction
  );
  
  try {
    command.execute(interaction);
  } catch(error) {
    ReportInternalError(error)
  };
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

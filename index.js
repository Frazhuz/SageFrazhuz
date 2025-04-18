require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const CommandLoader = require('./utils/commandLoader.js');
const { KeyError, genReportError } = require('./utils/errorHandler.js');

const ERROR_MESSAGES = {
  NO_DISCORD_TOKEN: () => 'Missing DISCORD_TOKEN in .env',
  FAILED_LOGIN: () => 'Failed to login or load commands.',
  FAILED_LOAD: () => 'Unexpected error loading commands. None of the commands are loaded.',
  UNKNOWN_COMMAND: () => `Attempted to call unknown command.`,
  UNHANDLED_REJECTION: () => 'Unhandled Promise Rejection.',
  UNCAUGHT_EXCEPTION: () => 'Uncaught Exception.',
};

const ERROR_REPLIES = {
  UNKNOWN_COMMAND: '⚠️ This command does not exist or not loaded yet.'
};

const reportError = genReportError(ERROR_MESSAGES);

if (!process.env.DISCORD_TOKEN) reportError({ key: 'NO_DISCORD_TOKEN' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let commands = {};
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    reportError.client = client;
    CommandLoader.reportError = genReportError(CommandLoader.ERROR_MESSAGES, client);
    return Promise.all([
      CommandLoader.load('ping', './commands/ping.js'),
      CommandLoader.load('say', '../commands/say.js'),
      CommandLoader.load('import', '../commands/import/import.js'),
    ]);
  })
  .catch(cause => reportError({ key: 'FAILED_LOGIN', cause: cause }))
  .then(commandArray => commands = Object.fromEntries(commandArray))
  .catch(cause => reportError({ key: 'FAILED_LOAD', cause: cause }));
  
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
  const ReportInteractionError = genReportError(ERROR_MESSAGES, client, ERROR_REPLIES, interaction);
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) {
    await ReportInteractionError({key: 'UNKNOWN_COMMAND'});
    return;
  }

  const ReportCommandError = genReportError(
    command.ERROR_MESSAGES, 
    client,
    command.ERROR_REPLIES,
    interaction
  );
  
  try {
    command.execute(interaction);
  } catch(error) {
    ReportCommandError(error)
  };
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

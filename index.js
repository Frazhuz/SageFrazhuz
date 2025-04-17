require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const loadCommand = require('./utils/commandLoader.js');
const { KeyError, ErrorHandler } = require('./utils/errorHandler.js');

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let indexErrorHandler = new ErrorHandler(ERROR_MESSAGES, client, ERROR_REPLIES)
const log = indexErrorHandler.log.bind(indexErrorHandler);
const reply = indexErrorHandler.reply.bind(indexErrorHandler);


if (!process.env.DISCORD_TOKEN) log({ key: 'NO_DISCORD_TOKEN' });

let commands = {};
Promise.all([
  loadCommand('ping', './commands/ping.js'),
  loadCommand('say', '../commands/say.js'),
  loadCommand('import', '../commands/import/import.js')
])
  .then(commandArray => {
    commands = Object.fromEntries(commandArray); 
    return client.login(process.env.DISCORD_TOKEN); 
  })
  .then(() => console.log('🔗 Connecting to Discord...'))
  .catch((cause) => {
    log({ key: 'FAILED_INITIALIZE', cause: cause });
  });
  
process.on(
  'unhandledRejection',
  (cause) => log({ key: 'UNHANDLED_REJECTION', cause: cause })
  );

process.on(
  'uncaughtException',
  (cause) => log({ key: 'UNCAUGHT_EXCEPTION', cause: cause })
  );


client.on('ready', () => console.log(`🤖 Bot logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  indexErrorHandler.interaction = interaction;
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) {
    await reply({key: 'UNKNOWN_COMMAND', messageArgs: interaction.commandName});
    return;
  }

  const commandErrorHandler = new ErrorHandler(
    command.ERROR_MESSAGES, 
    client,
    command.ERROR_REPLIES,
    interaction
    );
  try {
    command.execute(interaction);
  } catch(error) {
    commandErrorHandler.reply(error)
  };
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

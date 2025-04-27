console.log("Script starts.");
import { BotError, ErrorReporter } from './utils/errorReporter.js';
import dotenv from 'dotenv';
dotenv.config();
import { Client, GatewayIntentBits } from 'discord.js';
import CommandLoader from './utils/commandLoader.js';
console.log("Dependencies have been loaded!");


const ERROR_MESSAGES = {
  NO_DISCORD_TOKEN: () => 'Missing DISCORD_TOKEN in .env',
  FAILED_LOGIN: () => 'Failed to login or load commands.',
  FAILED_LOAD: () => 'Unexpected error loading commands. None of the commands are loaded.',
  UNKNOWN_COMMAND: () => `Attempted to call unknown command.`,
  UNHANDLED_REJECTION: () => 'Unhandled Promise Rejection.',
  UNCAUGHT_EXCEPTION: () => 'Uncaught Exception.',
};

const ERROR_REPLIES = {
  UNKNOWN_COMMAND: '⚠️ This command does not exist or not loaded yet.',
};

const COMMAND_PATHS = [
  ['ping', '../commands/ping.js'],
  ['say', '../commands/say.js'],
  ['import', '../commands/import/import.js'],
];

const reporter = new ErrorReporter(ERROR_MESSAGES);
if (!process.env.DISCORD_TOKEN) reporter.exec('NO_DISCORD_TOKEN');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

console.log("Client and reporter are created. Attempting to log in...");

let commands = {};
client.login(process.env.DISCORD_TOKEN)
  .catch(cause => reporter.exec('FAILED_LOGIN', {cause}))
  .then(
    () => {
      reporter.client = client;
      CommandLoader.reporter = new ErrorReporter(CommandLoader.ERROR_MESSAGES, client);
      return Promise.all(COMMAND_PATHS.map(item => CommandLoader.exec(...item)));
    }
  )
  .then(
    commandArray => commands = Object.fromEntries(commandArray),
    cause => reporter.exec('FAILED_LOAD', {cause})
  )
  
process.on(
  'unhandledRejection',
  (cause) => reporter.exec('UNHANDLED_REJECTION', {cause})
  );

process.on(
  'uncaughtException',
  (cause) => reporter.exec('UNCAUGHT_EXCEPTION', {cause})
  );

client.on('ready', () => console.log(`🤖 Bot logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  const interactReporter = new ErrorReporter(ERROR_MESSAGES, client, ERROR_REPLIES, interaction);
  if (!interaction.isChatInputCommand()) return;
  const command = commands[interaction.commandName];
  if (!command) return await interactReporter.exec('UNKNOWN_COMMAND', {forcedReply: true});

  const commandReporter = new ErrorReporter(
    command.ERROR_MESSAGES, 
    client, 
    command.ERROR_REPLIES,
    interaction
  );
  
  try {
    command.exec(interaction);
  } catch(error) {
    error.forcedReply = true;
    commandReporter.exec(error)
  };
});

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

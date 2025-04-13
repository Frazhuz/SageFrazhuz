require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const CommandLoader = require('./utils/commandLoader');
const ErrorHandler = require('./utils/errorHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

const commands = {
  ping: CommandLoader.loadCommand('./commands/ping.js'),
  say: CommandLoader.loadCommand('./commands/say.js'),
  import: CommandLoader.loadCommand('./commands/import/import.js')
};

process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

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
    `Attempted to call unknown command: ${interaction.commandName}`
    '⚠️ This command does not exist.'
    );

  await command.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('🔗 Connecting to Discord...'))
  .catch((error) => {
    console.error('❌ Login failed:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\n🔴 Received SIGINT. Shutting down...');
  client.destroy();
  process.exit(0);
});

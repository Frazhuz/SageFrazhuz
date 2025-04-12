require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const commands = {
  ping: require('./commands/ping'),
  say: require('./commands/say'),
  import: require('./commands/import/import'),
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
  
  const command = commands[interaction.commandName];
  
  if (!command) {
    await interaction.reply({
      content: 'This functionality will be written in the future.', 
      ephemeral: true 
    });
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Ошибка в команде ${interaction.commandName}:`, error);
    await interaction.reply({ content: '❌ Error.', ephemeral: true });
});

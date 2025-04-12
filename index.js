require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log('Что ж, новая попытка.');

const loadCommand = (path) => {
  try {
    const command = require(path);
    if (!command.execute) {
      console.log(`У команды из ${path} нет execute.`);
      return {
        execute: async (interaction) => {
          await interaction.reply({ content: '⚠️ This command is temporarily unavailable. Execute is missing.' });
        }
      };
    }
    return command;
  } catch (error) {
    console.log(`Не удалось загрузить команду из ${path}`);
    return {
      execute: async (interaction) => {
        await interaction.reply({ content: '⚠️ This command is temporarily unavailable. Loading is failed.' });
      }
    };
  }
};

const commands = {
  ping: loadCommand('./commands/ping.js'),
  say: loadCommand('./commands/say.js'),
  //import: loadCommand('./commands/import/import.js')
};

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Проверка наличия токена
if (!DISCORD_TOKEN) {
  console.error('Ошибка: DISCORD_TOKEN не найден в переменных окружения.');
  console.log('Пожалуйста, создайте файл .env и добавьте DISCORD_TOKEN=ваш_токен');
  process.exit(1);
}

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
    await interaction.reply({ content: 'This functionality will be written in the future.' });
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Ошибка в команде ${interaction.commandName}:`, error);
    await interaction.reply({ content: '❌ Error.' });
  }
});

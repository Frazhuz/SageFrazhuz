require('dotenv').config();
const { REST, Routes } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    {
        name: 'ping',
        description: 'Reply Pong!',
    },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Начинаю регистрацию слэш-команд...');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Слэш-команды успешно зарегистрированы!');
    } catch (error) {
        console.error('Ошибка при регистрации команд:', error);
    }
})();

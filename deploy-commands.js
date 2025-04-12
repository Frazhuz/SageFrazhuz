require('dotenv').config();
const { REST, Routes } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('❌ Ошибка: Не указаны DISCORD_TOKEN или CLIENT_ID в .env');
    process.exit(1);
}

const args = process.argv.slice(2);

const isGlobal = args.includes('--global");
if (!isGlobal && !GUILD_ID) {
    console.error('❌ Ошибка: Не указан GUILD_ID в .env');
    process.exit(1);
}                             


if (args.length === 0) {
    console.error('❌ Ошибка: Не указаны команды для регистрации.');
    console.info('ℹ Использование: node register.js <команда1:описание1> <команда2:описание2> ... --global (при необходимости глобальной регистрации)');
    console.info('Пример: node register.js ping:"Ответить Pong!" greet:"Поприветствовать пользователя"');
    process.exit(1);
}


const commandArgs = isGlobal ? args.filter(arg => arg !== '--global") : args;
const commands = commandArgs.map(arg => {
    const separatorIndex = arg.indexOf(':');

    if (separatorIndex === -1) {
        console.error(`❌ Ошибка: У команды "${arg}" отсутствует описание. Формат: <имя:описание>`);
        process.exit(1);
    }

    const name = arg.slice(0, separatorIndex).trim().toLowerCase();
    const description = arg.slice(separatorIndex + 1).trim();

    if (!name) {
        console.error(`❌ Ошибка: Пустое имя команды в аргументе "${arg}"`);
        process.exit(1);
    }

    if (!description) {
        console.error(`❌ Ошибка: Пустое описание у команды "${name}"`);
        process.exit(1);
    }

    return { name, description };
});

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`📝 Регистрирую команды ${isGlobal ? 'глобально' : 'на сервере'}:`);

        const route = isGlobal 
            ? Routes.applicationCommands(CLIENT_ID) 
            : Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
        await rest.put(route, { body: commands });

        console.log('Команды успешно зарегистрированы!');
    } catch (error) {
        console.error('Ошибка при регистрации команд:', error);
    }
})();

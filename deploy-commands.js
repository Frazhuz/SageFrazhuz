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

const optionTypeMap = {
    string: ApplicationCommandOptionType.String,
    integer: ApplicationCommandOptionType.Integer,
    boolean: ApplicationCommandOptionType.Boolean,
    user: ApplicationCommandOptionType.User,
    channel: ApplicationCommandOptionType.Channel,
    role: ApplicationCommandOptionType.Role,
    mentionable: ApplicationCommandOptionType.Mentionable,
    number: ApplicationCommandOptionType.Number,
};

    
const commands = commandArgs.map(arg => {
    const parts = arg.split(';').map(p => p.trim());

    if (parts.length === 0 || !parts[0]) {
        console.error(`❌ Ошибка: Неправильный формат команды: "${arg}"`);
        process.exit(1);
    }

    // Первая часть — команда:описание
    const [nameDesc, ...optionParts] = parts;
    const separatorIndex = nameDesc.indexOf(':');

    if (separatorIndex === -1) {
        console.error(`❌ Ошибка: У команды "${nameDesc}" отсутствует описание`);
        process.exit(1);
    }

    const name = nameDesc.slice(0, separatorIndex).trim().toLowerCase();
    const description = nameDesc.slice(separatorIndex + 1).trim();

    if (!name || !description) {
        console.error(`❌ Ошибка: Некорректное имя или описание команды: "${nameDesc}"`);
        process.exit(1);
    }

    // Обработка options (если есть)
    const options = optionParts.map((optRaw, i) => {
        const optParts = optRaw.split(':').map(p => p.trim());

        if (optParts.length < 2) {
            console.error(`❌ Ошибка: У опции #${i + 1} недостаточно данных. Нужно минимум: имя:описание`);
            process.exit(1);
        }

        const [optName, optDesc, optTypeRaw = 'string', optRequiredRaw = 'true', ...extra] = optParts;

        const optType = optionTypeMap[optTypeRaw.toLowerCase()];
        if (!optType) {
            console.error(`❌ Ошибка: Неизвестный тип опции "${optTypeRaw}". Поддерживаемые: ${Object.keys(optionTypeMap).join(', ')}`);
            process.exit(1);
        }

        const isRequired = optRequiredRaw.toLowerCase() === 'true';

        const option = {
            name: optName.toLowerCase(),
            description: optDesc,
            type: optType,
            required: isRequired,
        };

        extra.forEach((param) => {
            if (param.toLowerCase() === 'autocomplete') {
                option.autocomplete = true;
                return;
            }

            if (param.includes('=')) {
                // Параметры типа key=value
                const [key, value] = param.split('=').map(s => s.trim());

                if (key === 'min') {
                    if (type === ApplicationCommandOptionType.Integer || type === ApplicationCommandOptionType.Number)
                        option.minValue = parseFloat(value);
                    else
                        option.minLength = parseInt(value);
                } else if (key === 'max') {
                    if (type === ApplicationCommandOptionType.Integer || type === ApplicationCommandOptionType.Number)
                        option.maxValue = parseFloat(value);
                    else
                        option.maxLength = parseInt(value);
                } else {
                    // Обрабатываем как choice
                    if (!option.choices) option.choices = [];
                    option.choices.push({ name: value, value: key });
                }
            }
        });

        return option;
    });

    return {
        name,
        description,
        options: options.length > 0 ? options : undefined,
    };
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

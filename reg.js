require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('❌ Ошибка: Не указаны DISCORD_TOKEN или CLIENT_ID в .env');
    process.exit(1);
}

const args = process.argv.slice(2);
const isGlobal = args.includes("--global");

if (!isGlobal && !GUILD_ID) {
    console.error('❌ Ошибка: Не указан GUILD_ID в .env');
    process.exit(1);
}                             

    
const commands = [
  {
    "name": "ping",
    "description": "ping",
    "options": []
  },
  {
    "name": "say",
    "description": "Repeat your message.",
    "options": [
      {
        "name": "message",
        "description": "Repeatable.",
        "type": 3,
        "required": true
      }
    ]
  },
  {
    "name": "import",
    "description": "Generate TSV file for import NPC and Hazards from Foundry to Sage RPG Bot",
    "options": [
      {
        "name": "source",
        "description": "Link, path or name.",
        "type": 3,
        "required": true
      },
      {
        name: "source_type",
        description: "Indicate whether you specified a link, path, or name for the search",
        type: 3,  // STRING
        required: false,
        choices: [
          {
            name: "link",
            value: "link"
          },
          {
            name: "path",
            value: "path"
          },
          {
            name: "name",
            value: "name"
          }
        ]
      },
      {
        "name": "alias",
        "description": "alias",
        "type": 3,
        "required": false
      }
    ]
  }
];

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

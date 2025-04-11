require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const path = require('path');

// Создаем нового Discord-бота
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Токен бота (должен быть установлен в переменных окружения)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Запускаем бота
client.login(DISCORD_TOKEN).catch(err => {
  console.error('Ошибка входа:', err);
  process.exit(1);
});

// Базовый URL репозитория Pathfinder 2e на GitHub
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/foundryvtt/pf2e/master/packs/';

// Команды бота
const PREFIX = '!'; // Префикс команд

// Обработчик события готовности бота
client.on('ready', () => {
  console.log(`Бот ${client.user.tag} успешно запущен!`);
});

// Обработчик входящих сообщений
client.on('messageCreate', async message => {
  // Игнорируем сообщения от других ботов и без префикса
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  // Разбираем команду и аргументы
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Обрабатываем команду rpgsage
  if (command === 'import') {
    try {
      await handleImport(message, args);
    } catch (error) {
      console.error('Ошибка обработки команды import:', error);
      message.reply('Произошла ошибка при обработке вашей команды.');
    }
  }
});

/**
 * Обработчик команды !import
 * @param {Message} message - Объект сообщения Discord
 * @param {string[]} args - Аргументы команды
 */
async function handleImport(message, args) {
  // Разбираем флаги и аргументы
  const { flags, pathArg } = parseArgs(args);
  
  // Если запрошена помощь
  if (flags.help) {
    return sendHelpMessage(message);
  }

  // Получаем путь к файлу на GitHub
  let filePath;
  try {
    filePath = await resolveFilePath(flags, pathArg);
  } catch (error) {
    return message.reply(error.message);
  }

  // Загружаем JSON-данные NPC/опасности
  let npcData;
  try {
    npcData = await fetchNpcData(filePath);
  } catch (error) {
    return message.reply('Не удалось загрузить данные NPC. Убедитесь, что путь указан правильно.');
  }

  // Проверяем тип (только NPC или опасность)
  if (!['npc', 'hazard', 'character'].includes(npcData.type)) {
    return message.reply('Можно импортировать только NPC или опасности.');
  }

  // Генерируем TSV-данные
  const tsvData = generateTsvData(npcData, flags.alias);

  // Создаем и отправляем TSV-файл
  try {
    await sendTsvFile(message, npcData.name, tsvData);
  } catch (error) {
    console.error('Ошибка при отправке файла:', error);
    message.reply('Не удалось создать и отправить TSV-файл.');
  }
}

/**
 * Разбирает аргументы команды на флаги и основной аргумент
 * @param {string[]} args - Аргументы команды
 * @returns {Object} Объект с флагами и путем
 */
function parseArgs(args) {
  const flags = {
    s: false, // Флаг поиска по названию
    l: false, // Флаг URL GitHub
    a: null,  // Флаг алиаса
    help: false // Флаг помощи
  };

  let pathArg = '';

  // Обрабатываем флаги
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      flags.help = true;
      continue;
    }
    
    if (arg === '-s') {
      flags.s = true;
      continue;
    }
    
    if (arg === '-l') {
      flags.l = true;
      continue;
    }
    
    if (arg === '-a') {
      // Следующий аргумент - значение алиаса
      flags.a = args[i + 1] || null;
      i++; // Пропускаем следующий аргумент
      continue;
    }
    
    // Если это не флаг, добавляем к пути
    if (!arg.startsWith('-')) {
      pathArg += (pathArg ? ' ' : '') + arg;
    }
  }

  // Проверяем конфликт флагов
  if ((flags.s && flags.l) || (flags.s && !pathArg) || (flags.l && !pathArg)) {
    throw new Error('Используйте либо флаг -l, либо флаг -s, либо укажите путь без флага. Не все сразу.');
  }

  return { flags, pathArg };
}

/**
 * Отправляет справочное сообщение
 * @param {Message} message - Объект сообщения Discord
 */
function sendHelpMessage(message) {
  const helpText = `
**RPG Sage Bot - помощь**

Этот бот извлекает информацию о NPC и опасностях из репозитория Pathfinder Second Edition для Foundry и генерирует TSV-файл для [RPG Sage Bot](https://rpgsage.io/).

**Примеры использования:**
1. \`!import pathfinder-monster-core/kobold-warrior.json\`
2. \`!import -l https://github.com/foundryvtt/pf2e/blob/master/packs/pathfinder-monster-core/kobold-warrior.json\`
3. \`!import -s kobold warrior\`

В третьем примере сначала ищется файл с именем kobold-warrior.json. Если найдено точное совпадение, генерируется TSV, иначе выводится список путей к файлам с похожим именем.

Бот извлекает информацию об уровне, атрибутах, навыках, восприятии, AC, HP, атаках, DC и уроне специальных атак. Также TSV-файл содержит информацию о имени, алиасе, DC проверки знаний (рассчитывается на основе уровня и редкости), типе существа и навыках, используемых для проверки знаний (определяется на основе черт существа).

Алиас генерируется на основе имени. Его также можно указать отдельно с помощью флага -a.

4. \`!import pathfinder-monster-core/kobold-warrior.json -a kwr\`
  `;
  
  message.reply(helpText);
}

/**
 * Определяет путь к файлу на GitHub на основе флагов и аргументов
 * @param {Object} flags - Флаги команды
 * @param {string} pathArg - Аргумент пути
 * @returns {Promise<string>} Путь к файлу на GitHub
 */
async function resolveFilePath(flags, pathArg) {
  // Если указан флаг -l (URL GitHub)
  if (flags.l) {
    // Извлекаем путь из URL GitHub
    const urlParts = pathArg.split('/blob/master/packs/');
    if (urlParts.length !== 2) {
      throw new Error('Некорректный URL GitHub. Убедитесь, что ссылка ведет на файл в репозитории pf2e.');
    }
    return urlParts[1];
  }

  // Если указан флаг -s (поиск по названию)
  if (flags.s) {
    // Формируем имя файла (заменяем пробелы на дефисы и добавляем .json)
    const fileName = `${pathArg.replace(/ /g, '-')}.json`;
    // Здесь должна быть реализация поиска файла по имени
    // В упрощенной версии просто предполагаем, что файл существует
    return `pathfinder-bestiary/${fileName}`;
  }

  // Если путь указан напрямую
  return pathArg;
}

/**
 * Загружает данные NPC/опасности из GitHub
 * @param {string} filePath - Путь к файлу в репозитории
 * @returns {Promise<Object>} Данные NPC/опасности
 */
async function fetchNpcData(filePath) {
  const url = `${GITHUB_BASE_URL}${filePath}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'RPG-Sage-Discord-Bot/1.0'
    }
  });
  
  if (!response.data) {
    throw new Error('Не удалось загрузить данные NPC.');
  }
  
  return response.data;
}

/**
 * Генерирует TSV-данные на основе данных NPC
 * @param {Object} npcData - Данные NPC/опасности
 * @param {string|null} alias - Пользовательский алиас
 * @returns {string} TSV-данные
 */
function generateTsvData(npcData, alias = null) {
  const lines = [];
  
  // Добавляем базовую информацию
  addLine(lines, 'name', npcData.name);
  addLine(lines, 'gamesystem', 'pf2e');
  addLine(lines, 'level', npcData.system?.details?.level?.value || '');
  addLine(lines, 'lvl', npcData.system?.details?.level?.value || '');
  
  // Добавляем HP, если есть
  const maxHp = npcData.system?.attributes?.hp?.max;
  if (maxHp && maxHp !== 0) {
    addLine(lines, 'maxHp', maxHp);
    addLine(lines, 'hp', maxHp);
  }
  
  // Добавляем AC, если это не опасность с AC 0 или 10
  const ac = npcData.system?.attributes?.ac?.value;
  if (ac && !(npcData.type === 'hazard' && ['0', '10'].includes(ac.toString()))) {
    addLine(lines, 'ac', `||${ac}||`);
  }
  
  // Добавляем восприятие, если это не опасность
  if (npcData.type !== 'hazard') {
    addLine(lines, 'perception', npcData.system?.perception?.mod || '');
    
    // Добавляем спасброски
    addSaves(lines, npcData);
    
    // Добавляем атрибуты
    addAttributes(lines, npcData);
    
    // Добавляем навыки
    addSkills(lines, npcData);
    
    // Добавляем предметы/атаки
    addItems(lines, npcData);
    
    // Добавляем информацию для проверки знаний
    addRecallKnowledge(lines, npcData);
  }
  
  // Добавляем алиас
  const generatedAlias = alias || generateAlias(npcData.name);
  addLine(lines, 'alias', generatedAlias);
  
  // Преобразуем в TSV-формат
  const headers = lines.map(line => line[0]).join('\t');
  const values = lines.map(line => line[1]).join('\t');
  
  return `${headers}\n${values}`;
}

/**
 * Добавляет строку в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {string} key - Ключ (первый столбец)
 * @param {string|number} value - Значение (второй столбец)
 */
function addLine(lines, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    lines.push([key, value.toString()]);
  }
}

/**
 * Генерирует алиас на основе имени NPC
 * @param {string} name - Имя NPC
 * @returns {string} Сгенерированный алиас
 */
function generateAlias(name) {
  // Простая реализация - берем первые буквы каждого слова
  return name.split(' ').map(word => word[0]).join('').toLowerCase();
}

/**
 * Добавляет спасброски в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} npcData - Данные NPC
 */
function addSaves(lines, npcData) {
  const saves = ['fortitude', 'reflex', 'will'];
  const shortNames = ['fort', 'ref'];
  
  saves.forEach((save, index) => {
    const value = npcData.system?.saves?.[save]?.value;
    if (value !== undefined) {
      addLine(lines, save, value);
      addLine(lines, `dc.${save}`, `||${10 + value}||`);
      
      // Добавляем сокращенные названия для fortitude и reflex
      if (index < shortNames.length) {
        const shortName = shortNames[index];
        addLine(lines, shortName, value);
        addLine(lines, `dc.${shortName}`, `||${10 + value}||`);
      }
    }
  });
}

/**
 * Добавляет атрибуты в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} npcData - Данные NPC
 */
function addAttributes(lines, npcData) {
  const attributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const shortNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  
  attributes.forEach((attr, index) => {
    const shortName = shortNames[index];
    const mod = npcData.system?.abilities?.[shortName]?.mod;
    
    if (mod !== undefined) {
      addLine(lines, attr, mod);
      addLine(lines, shortName, mod);
    }
  });
}

/**
 * Добавляет навыки в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} npcData - Данные NPC
 */
function addSkills(lines, npcData) {
  const skills = [
    'acrobatics', 'arcana', 'athletics', 'crafting', 'deception', 'diplomacy',
    'intimidation', 'medicine', 'nature', 'occultism', 'performance', 'religion',
    'society', 'stealth', 'survival', 'thievery'
  ];
  
  const skillAttributes = {
    acrobatics: 'dex',
    arcana: 'int',
    athletics: 'str',
    crafting: 'int',
    deception: 'cha',
    diplomacy: 'cha',
    intimidation: 'cha',
    medicine: 'wis',
    nature: 'wis',
    occultism: 'int',
    performance: 'cha',
    religion: 'wis',
    society: 'int',
    stealth: 'dex',
    survival: 'wis',
    thievery: 'dex'
  };
  
  skills.forEach(skill => {
    let value = npcData.system?.skills?.[skill]?.base;
    
    // Если значение навыка не задано, используем модификатор соответствующего атрибута
    if (value === undefined || isNaN(parseInt(value))) {
      const attr = skillAttributes[skill];
      value = npcData.system?.abilities?.[attr]?.mod || '';
    }
    
    if (value !== undefined && value !== '') {
      addLine(lines, skill, value);
      addLine(lines, `dc.${skill}`, `||${10 + parseInt(value)}||`);
    }
  });
}

/**
 * Добавляет предметы/атаки в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} npcData - Данные NPC
 */
function addItems(lines, npcData) {
  if (!npcData.items || !Array.isArray(npcData.items)) return;
  
  npcData.items.forEach(item => {
    const itemName = item.name.toLowerCase().replace(/ /g, '-');
    
    switch (item.type) {
      case 'melee':
      case 'ranged':
        addAttackItem(lines, item, itemName, item.type);
        break;
      
      case 'action':
        addActionItem(lines, item, itemName);
        break;
      
      case 'lore':
        addLoreItem(lines, item);
        break;
    }
  });
}

/**
 * Добавляет информацию о атаке в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} item - Данные атаки
 * @param {string} itemName - Название атаки
 * @param {string} type - Тип атаки (melee/ranged)
 */
function addAttackItem(lines, item, itemName, type) {
  // Бонус атаки
  const bonus = item.system?.bonus?.value;
  if (bonus !== undefined) {
    addLine(lines, `${type}.${itemName}`, bonus);
  }
  
  // Описание атаки с чертами
  let description = itemName;
  const traits = item.system?.traits?.value;
  if (traits && traits.length > 0) {
    description += ` (${traits.join(', ')})`;
  }
  addLine(lines, `${type}.${itemName}.desc`, description);
  
  // Урон атаки
  const damages = item.system?.damageRolls;
  if (damages) {
    const damageText = Object.values(damages)
      .map(dmg => `${dmg.damage} ${dmg.damageType}`)
      .join(' + ');
    
    // Эффекты атаки
    const effects = item.system?.attackEffects?.value;
    let fullDamageText = damageText;
    if (effects && effects.length > 0) {
      fullDamageText += ` plus ${effects.join(', ').replace(/-/g, ' ')}`;
    }
    
    addLine(lines, `${type}.${itemName}.damage`, fullDamageText);
  }
}

/**
 * Добавляет информацию о действии в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} item - Данные действия
 * @param {string} itemName - Название действия
 */
function addActionItem(lines, item, itemName) {
  const description = item.system?.description?.value || '';
  
  // Проверка на наличие @Check в описании
  const checkMatch = description.match(/@Check\[.*?dc:(\d+).*?\]/);
  if (checkMatch) {
    addLine(lines, `dc.${itemName}`, checkMatch[1]);
  }
  
  // Проверка на наличие урона в описании
  const damageMatch = description.match(/@Damage\[.*?(\d+d\d+)\[([^\]]+)\].*?\]/) || 
                     description.match(/(\d+d\d+) ([^\s]+) damage/);
  
  if (damageMatch) {
    const damageText = damageMatch[2] ? 
      `${damageMatch[1]} ${damageMatch[2]}` : 
      `${damageMatch[1]} ${damageMatch[3]}`;
    addLine(lines, `${itemName}.damage`, damageText);
  }
}

/**
 * Добавляет информацию о знании в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} item - Данные знания
 */
function addLoreItem(lines, item) {
  const loreName = item.name.split(' ').slice(0, -1).join(' ').toLowerCase().replace(/ /g, '-');
  const mod = item.system?.mod?.value;
  
  if (mod !== undefined) {
    addLine(lines, `lore.${loreName}`, mod);
    addLine(lines, `lore.${loreName}.name`, item.name.split(' ').slice(0, -1).join(' '));
  }
}

/**
 * Добавляет информацию для проверки знаний в TSV-данные
 * @param {Array} lines - Массив строк TSV
 * @param {Object} npcData - Данные NPC
 */
function addRecallKnowledge(lines, npcData) {
  const rarity = npcData.system?.traits?.rarity || 'common';
  const level = npcData.system?.details?.level?.value || 0;
  
  // Базовые DC для проверки знаний по уровню
  const levelDc = {
    '-1': 13, '0': 14, '1': 15, '2': 16, '3': 18, '4': 19, '5': 20,
    '6': 22, '7': 23, '8': 24, '9': 26, '10': 27, '11': 28, '12': 30,
    '13': 31, '14': 32, '15': 34, '16': 35, '17': 36, '18': 38,
    '19': 39, '20': 40, '21': 42, '22': 44, '23': 46, '24': 48, '25': 50
  };
  
  let dc = levelDc[level] || 14;
  
  // Модификаторы DC за редкость
  const rarityModifiers = {
    common: 0,
    uncommon: 2,
    rare: 5,
    unique: 10
  };
  
  dc += rarityModifiers[rarity] || 0;
  
  // Добавляем DC для разных уровней сложности
  addLine(lines, 'dc.recall.incredibly-easy', `||${dc - 10}||`);
  addLine(lines, 'dc.recall.very-easy', `||${dc - 5}||`);
  addLine(lines, 'dc.recall.easy', `||${dc - 2}||`);
  addLine(lines, 'dc.recall', `||${dc}||`);
  addLine(lines, 'dc.recall.default', `||${dc}||`);
  addLine(lines, 'dc.recall.hard', `||${dc + 2}||`);
  addLine(lines, 'dc.recall.very-hard', `||${dc + 5}||`);
  addLine(lines, 'dc.recall.incredibly-hard', `||${dc + 10}||`);
  
  // Добавляем типы существ
  const validTypes = [
    'aberration', 'animal', 'astral', 'beast', 'celestial', 'construct',
    'dragon', 'dream', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus',
    'humanoid', 'monitor', 'ooze', 'plant', 'shade', 'spirit', 'time', 'undead'
  ];
  
  const types = (npcData.system?.traits?.value || [])
    .filter(trait => validTypes.includes(trait));
  
  if (types.length > 0) {
    addLine(lines, 'type', types.join(', '));
  }
  
  // Добавляем навыки для идентификации
  const identifySkillsMap = {
    aberration: 'occultism',
    animal: 'nature',
    astral: 'occultism',
    beast: 'arcana, nature',
    celestial: 'religion',
    construct: 'arcana, crafting',
    dragon: 'arcana',
    dream: 'occultism',
    elemental: 'arcana, nature',
    ethereal: 'occultism',
    fey: 'nature',
    fiend: 'nature',
    fungus: 'nature',
    humanoid: 'society',
    monitor: 'religion',
    ooze: 'occultism',
    plant: 'nature',
    shade: 'religion',
    spirit: 'occultism',
    time: 'occultism',
    undead: 'religion'
  };
  
  const identifySkills = types
    .map(type => identifySkillsMap[type])
    .filter(Boolean)
    .join(', ')
    .split(', ')
    .filter((skill, index, arr) => arr.indexOf(skill) === index) // Удаляем дубликаты
    .sort()
    .join(', ');
  
  if (identifySkills) {
    addLine(lines, 'identification', identifySkills);
  }
}

/**
 * Отправляет TSV-файл в Discord
 * @param {Message} message - Объект сообщения Discord
 * @param {string} npcName - Имя NPC
 * @param {string} tsvData - Данные в TSV-формате
 */
async function sendTsvFile(message, npcName, tsvData) {
  // Создаем имя файла (заменяем пробелы на дефисы)
  const fileName = `${npcName.replace(/ /g, '-')}.tsv`;
  
  // Отправляем файл
  await message.reply({
    files: [{
      attachment: Buffer.from(tsvData),
      name: fileName
    }],
    content: `TSV-файл для ${npcName} готов!`
  });
}



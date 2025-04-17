const { KeyError, ErrorHandler } = require('./errorHandler');
//const { existsSync } = require('fs');

const ERROR_MESSAGES = {
  MISSING_PATH: (identificator) => `Missing path. ${identificator}`,
  MISSING_NAME: (identificator) => `Missing name. ${identificator}`,
  FILE_NOT_FOUND: (identificator) => `File not found for command: ${identificator}`,
  MISSING_EXECUTE: (identificator) => `Command ${identificator} is missing execute function`,
  LOAD_FAILED: (identificator) => `Failed to load command: ${identificator}`,
};

const ERROR_REPLIES = {
  MISSING_PATH: '⚠️ This command is temporarily unavailable (MISSING PATH)',
  MISSING_NAME: '⚠️ This command is temporarily unavailable (MISSING NAME)',
  MISSING_EXECUTE: '⚠️ This command is temporarily unavailable (MISSING EXECUTE)',
  FILE_NOT_FOUND: '⚠️ This command is temporarily unavailable (FILE_NOT_FOUND)',
  LOAD_FAILED: '⚠️ This command is temporarily unavailable (LOAD FAILED)',
};

const log = ErrorHandler.log.bind(ErrorHandler, ERROR_MESSAGES);

function generateErrorReply(key, identificator, cause) {
  throw new KeyError({message: ERROR_MESSAGES[key], cause: cause});
  //log({ key: key, other: identificator, cause: cause });
  return [identificator, (interaction) => interaction.reply(ERROR_REPLIES[key])];
}

async function loadCommand(name, path) {
  if (!name) return generateErrorReply('MISSING_NAME', path);
  if (!path) return generateErrorReply('MISSING_PATH', name);
  
  try {
    //if (!existsSync(path)) return generateErrorReply('FILE_NOT_FOUND', name);
    const command = require(path);
    if (!command?.execute) return generateErrorReply('MISSING_EXECUTE', name);
    return [name, command];
  } catch (error) {
    return generateErrorReply('LOAD_FAILED', name, error);
  }
}

module.exports = loadCommand;

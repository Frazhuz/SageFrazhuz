import ErrorHandler from './errorHandler.js';
import { existsSync } from 'fs';

const ERROR_MESSAGES = {
  MISSING_PATH: (name) => `Missing path. ${name}`,
  MISSING_NAME: (path) => `Missing name. ${path}`,
  FILE_NOT_FOUND: (name, path) => `File not found for command ${name}`,
  MISSING_EXECUTE: (name) => `Command ${name} is missing execute function`,
  LOAD_FAILED: (name, error) => `Failed to load command ${name}:\n${error.stack || error}`,
};

const ERROR_REPLIES = {
  MISSING_PATH: '⚠️ This command is temporarily unavailable (MISSING PATH)',
  MISSING_NAME: '⚠️ This command is temporarily unavailable (MISSING NAME)',
  MISSING_EXECUTE: '⚠️ This command is temporarily unavailable (MISSING EXECUTE)',
  FILE_NOT_FOUND: '⚠️ This command is temporarily unavailable (FILE_NOT_FOUND)',
  LOAD_FAILED: '⚠️ This command is temporarily unavailable (LOAD FAILED)',
};

function generateErrorReply(errorKey, name, error) {
  ErrorHandler.log(new Error(errorKey), ERROR_MESSAGES, name, error);
  return [name, (interaction) => interaction.reply(ERROR_REPLIES[errorKey])];
}

export default async function loadCommand(name, path) {
  if (!name) return generateErrorReply('MISSING_NAME', path);
  if (!path) return generateErrorReply('MISSING_PATH', name);
  
  try {
    if (!existsSync(path)) return generateErrorReply('FILE_NOT_FOUND', name);
    const {default: command} = await import(path);
    if (!command?.execute) return generateErrorReply('MISSING_EXECUTE', name);
    return [name, command];
  } catch (error) {
    return generateErrorReply('LOAD_FAILED', name, error);
  }
}

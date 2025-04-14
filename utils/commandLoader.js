import ErrorHandler from './errorHandler.js';

const ERROR_MESSAGES = {
  MISSING_PATH: () => 'Command path is required',
  MISSING_EXECUTE: (path) => `Command at ${path} is missing execute function`,
  LOAD_FAILED: (path) => `Command load failed: ${path}`
};

const ERROR_REPLIES = {
  MISSING_PATH: '⚠️ This command is temporarily unavailable (missing path to command)',
  MISSING_EXECUTE: '⚠️ This command is temporarily unavailable (missing execute function)',
  LOAD_FAILED: '⚠️ This command is temporarily unavailable (load error)'
};

const ERROR_ENVIRONMENTS = {
  MISSING_PATH: 'load error: missing path',
  MISSING_EXECUTE: 'load error: missing execute function',
  LOAD_FAILED: 'load error',
  COMMAND: 'command'
};

function handleError(errorKey, path, customMessage) {
  console.error(ERROR_MESSAGES[errorKey](path));
  return {
    execute: async (interaction) =>
      await ErrorHandler.reply(
        interaction,
        ERROR_ENVIRONMENTS[errorKey],
        customMessage ?? ERROR_REPLIES[errorKey]
      )
  };
}

export default async function loadCommand(path) {
  if (!path) return handleError('MISSING_PATH');
  try {
    const command = await import(path);
    if (!command?.execute) return handleError('MISSING_EXECUTE', path);
    return {
      ...command,
      execute: ErrorHandler.wrap(ERROR_ENVIRONMENTS.COMMAND, command.execute)
    };
  } catch (error) {
    return handleError('LOAD_FAILED', path, error.message);
  }
}

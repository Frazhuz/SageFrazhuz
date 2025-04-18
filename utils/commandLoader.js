class CommandLoader {
  static ERROR_MESSAGES = {
    MISSING_PATH: (identificator) => `Missing path. ${identificator}`,
    MISSING_NAME: (identificator) => `Missing name. ${identificator}`,
    FILE_NOT_FOUND: (identificator) => `File not found for command: ${identificator}`,
    MISSING_EXEC: (identificator) => `Command ${identificator} is missing exec function`,
    LOAD_FAILED: (identificator) => `Failed to load command: ${identificator}`,
  };

  static ERROR_REPLIES = {
    MISSING_PATH: '⚠️ This command is temporarily unavailable (MISSING PATH)',
    MISSING_NAME: '⚠️ This command is temporarily unavailable (MISSING NAME)',
    MISSING_EXEC: '⚠️ This command is temporarily unavailable (MISSING EXEC)',
    FILE_NOT_FOUND: '⚠️ This command is temporarily unavailable (FILE NOT FOUND)',
    LOAD_FAILED: '⚠️ This command is temporarily unavailable (LOAD FAILED)',
  };

  static reporter;

  static async exec(name, path) {
    if (!name) return this.#generateErrorReply('MISSING_NAME', path);
    if (!path) return this.#generateErrorReply('MISSING_PATH', name);
    
    try {
      const command = require(path);
      if (!command?.exec) return this.#generateErrorReply('MISSING_EXEC', name);
      return [name, command];
    } catch (error) {
      return this.#generateErrorReply('LOAD_FAILED', name, error);
    }
  }

  static #generateErrorReply(key, identificator, cause) {
    this.reporter.exec({ key: key, cause: cause, messageArgs: identificator });
    return [identificator, { exec: (interaction) => interaction.reply(this.ERROR_REPLIES[key]) }];
  }
}

module.exports = CommandLoader;

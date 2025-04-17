class KeyError extends Error {
  constructor({ message = '', reply, key, cause, interaction, messageArgs } = {}) {
    let nestingNumber; 
    if (cause) {
      nestingNumber = (cause.nestingNumber ?? 0) + 1;
      message += `\nCause ${nestingNumber}: ${cause.message}`;
    } 
    super(message, { cause });
    this.interaction = interaction;
    this.name = key ?? 'KeyError';
    this.identificator = key ?? (message.split(' ').slice(0, 3).join(' ') + '...');
    this.reply = reply;
    this.key = key;
    this.messageArgs = messageArgs;
    this.nestingNumber = nestingNumber ?? 0;
    //Error.captureStackTrace(this, ErrorHandler.log);
  }
}


class ErrorHandler {
  constructor(messages = {}, client, replies = {}, interaction) {
    this.messages = messages;
    this.client = client;
    this.interaction = interaction;
    this.replies = replies;
  }

  
  static #ERROR_MESSAGES = {
    NO_INTERACTION: () => `No interaction was passed when attempting to log an error.`,
    EXPIRED_INTERACTION: (primaryError) => `Interaction is expired. Attempt to reply user about error: "${primaryError}" failed.`,
    EMPTY_ERROR: () => 'Attempt to send empty error',
    NO_FUNCTION: (handler) => `${handler} isn't function`,
    FAILED_REPLY: (primaryError) => `Attempt to reply user about error: "${primaryError}" failed.`
  }

  static #DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';

  static #_insideLog;

  static get #insideLog() {
    if(!this.#_insideLog) {
      this.#_insideLog = new ErrorHandler(this.#ERROR_MESSAGES).log;
    }
    return this.#_insideLog;
  }
  
  #validateOptions(options) {
    if (!options) {
      ErrorHandler.#insideLog({ key: 'EMPTY_ERROR' });
      return false;
    }
    return true;
  }

  #validateInteraction(error) {
    if (!this.interaction) {
      ErrorHandler.#insideLog({ key: 'NO_INTERACTION', cause: error });
      return false;
    }
    return true;
  }

  #validateFunction(handler) {
    if (typeof handler !== 'function') {
      ErrorHandler.#insideLog({ key: 'NO_FUNCTION', messageArgs: handler });
      return false;
    }
    return true;
  }

  
  #constructBasicMessage( { message = '', key, messageArgs } ) {
    const func = this.messages[key];
    return (func?.(messageArgs) ?? '') + message;
  }

  #getContext() {
    return {
      username: this.interaction.user?.username ?? 'N/A',
      userId: this.interaction.user?.id ?? 'N/A',
      guildName: this.interaction.guild?.name ?? 'DM',
      commandName: this.interaction.commandName ?? 'N/A',
    };
  }

  #constructFullMessage(options) {
    let message = this.#constructBasicMessage(options);
    if (!this.interaction) return message;
    const context = this.#getContext();
    message = 
      `${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName} =>` + 
      `\n${message}`;
    return message;
  }

  #constructError(options) {
    options.message = this.#constructFullMessage(options);
    return (options.stack ? options : new KeyError(options));
  }

  #log(error) {
    console.error(error.stack + '\n');
  }

  log(options) {
    if (!this.#validateOptions(options)) return;
    const error = this.#constructError(options);
    this.#log(error);
  }

  
  async reply(options) {
    if (!this.#validateOptions(options)) return;
    const error = this.#constructError(options);
    if (!this.#validateInteraction(error)) return;
    this.#log(error);
    error.reply ??= this.replies[error.key] ?? ErrorHandler.#DEFAULT_ERROR_REPLY;
    try {
      if (!this.interaction.isRepliable()) {
        ErrorHandler.#log({ key: 'EXPIRED_INTERACTION', messageArgs: error.identificator });
        return;
      }
      if (this.interaction.replied) {
        await this.interaction.followUp(error.reply);
      } else if (this.interaction.deferred) {
        await this.interaction.editReply(error.reply);
      } else {
        await this.interaction.reply(error.reply);
      }
    } catch (failedReply) {
      ErrorHandler.#log({ key: 'FAILED_REPLY', cause: failedReply, messageArgs: error.identificator });
    }
  }
}

module.exports = {
  KeyError,
  ErrorHandler
};

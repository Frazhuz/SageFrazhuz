class KeyError extends Error {
  constructor({ message = '', reply, key, cause, interaction, ...messageArgs } = {}) {
    let nestingNumber; 
    if (cause) {
      nestingNumber = (cause.nestingNumber ?? 1) + 1;
      message += `\nCause ${cause.nestingNumber ?? 1}: ${cause.message}`;
    } 
    super(message, { cause });
    this.options = { cause: cause };
    this.interaction = interaction;
    this.name = key ?? 'KeyError';
    this.identificator = key ?? (message.split(' ').slice(0, 3).join(' ') + '...');
    this.reply = reply;
    this.key = key;
    this.messageArgs = Object.values(messageArgs);
    this.nestingNumber = nestingNumber;
    //Error.captureStackTrace(this, ErrorHandler.log);
  }
}


class ErrorHandler {
  ERROR_MESSAGES = {
    NO_INTERACTION: () => `No interaction was passed when attempting to log an error.`,
    EXPIRED_INTERACTION: (primaryError) => `Interaction is expired. Attempt to reply user about error: "${primaryError}" failed.`,
    EMPTY_ERROR: () => 'Attempt to send empty error',
    NO_FUNCTION: (handler) => `${handler} isn't function`,
    FAILED_REPLY: (primaryError) => `Attempt to reply user about error: "${primaryError}" failed.`
  };

  DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';
  
  static #validateOptions(options) {
    if (!options) {
      this.#log({ key: 'EMPTY_ERROR' });
      return false;
    }
    return true;
  }

  static #validateInteraction(error) {
    if (!error.interaction) {
      this.#log({ key: 'NO_INTERACTION', cause: error });
      return false;
    }
    return true;
  }

  static #validateFunction(handler) {
    if (typeof handler !== 'function') {
      this.#log({ key: 'NO_FUNCTION', handler: handler });
      return false;
    }
    return true;
  }

  
  static #constructBasicMessage(messages, {message, key, messageArgs = [] } ) {
    const func = messages[key];
    return (func?.(...messageArgs) ?? '') + message;
  }
  
  static #getContext(interaction) {
    return {
      username: interaction.user?.username ?? 'N/A',
      userId: interaction.user?.id ?? 'N/A',
      guildName: interaction.guild?.name ?? 'DM',
      commandName: interaction.commandName ?? 'N/A',
    };
  }

  static #constructAdvancedMessage(messages, options) {
    const context = this.#getContext(options.interaction);
    const blank = this.#constructBasicMessage(messages, options);
    const message = 
      `${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName} =>` + 
      `\n${blank}`;
    return message;
  }

  static #constructError(messages, options) {
    options.message = options.interaction 
      ? this.#constructAdvancedMessage(messages, options) 
      : this.#constructBasicMessage(messages, options);
    return options;
  }
  
  
  static log(messages = {}, options) {
    if (!this.#validateOptions(options)) return;
    options = this.#constructError(messages, options);
    const error = options.stack ? options : new KeyError(options);
    console.error(error.stack + '\n');
  }

  static #log = this.log.bind(this, this.ERROR_MESSAGES);

  static async reply(messages = {}, replies = {}, options) {
    if (!this.#validateOptions(options)) return;
    const error = this.#constructError(messages, options);
    if (!this.#validateInteraction(error)) return;
    this.#log(error);
    error.reply ??= replies[error.key] ?? this.DEFAULT_ERROR_REPLY;
    try {
      const interaction = error.interaction;
      if (!error.interaction.isRepliable()) {
        this.#log({ key: 'EXPIRED_INTERACTION', primaryError: error.identificator });
        return;
      }
      if (interaction.replied) {
        await interaction.followUp(error.reply);
      } else if (interaction.deferred) {
        await interaction.editReply(error.reply);
      } else {
        await interaction.reply(error.reply);
      }
    } catch (failedReply) {
      this.log({ key: 'FAILED_REPLY', cause: failedReply, primaryError: error.identificator });
    }
  }

  static wrap(messages = {}, replies = {}, handler) {
    if (!this.#validateFunction(handler)) return;
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        this.reply(messages, replies, error);
      }
    };
  }
}

module.exports = {
  KeyError,
  ErrorHandler
};

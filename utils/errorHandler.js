const DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';
const ERROR_MESSAGES = {
  NO_INTERACTION: () => `No interaction was passed when attempting to log an error.`,
  EXPIRED_INTERACTION: (primaryError) => `Interaction is expired. Attempt to reply user about error: "${primaryError}" failed.`,
  EMPTY_ERROR: () => 'Attempt to send empty error',
  NO_FUNCTION: (handler) => `${handler} isn't function`,
  FAILED_REPLY: (primaryError) => `Attempt to reply user about error: "${primaryError}" failed.`
};


class KeyError extends Error {
  constructor({ name, message, reply, key, identificator, cause, interaction, ...messageArgs }) {
    super(message);
    this.interaction = interaction;
    this.name = name;
    this.reply = reply;
    this.key = key;
    this.identificator = key;
    this.cause = cause;
    this.messageArgs = ...messageArgs;
  }
}



class ErrorHandler {
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

  
  static #constructBasicMessage(messages = {}, error) {     
    const message =
      (error.message ?? messages[error.key]?.(...error.messageArgs)) +
      (error.cause ? `\nCause: ${error.cause.message}` : '');
    return message;
  }
  
  static #getContext(interaction) {
    return {
      username: interaction.user?.username ?? 'N/A',
      userId: interaction.user?.id ?? 'N/A',
      guildName: interaction.guild?.name ?? 'DM',
      commandName: interaction.commandName ?? 'N/A',
    };
  }

  static #constructAdvancedMessage(messages = {}, error) {
    const context = this.#getContext(error.interaction);
    const blank = this.#constructBasicMessage(messages, error);
    const message = 
      `${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName}:` + 
      `\n${blank}`;
    return message;
  }

  static #constructError(messages = {}, options) {
    const error = (options.stack) ? options : new KeyError(options);
    error.message = error.interaction 
      ? this.#constructAdvancedMessage(messages, error) 
      : this.#constructBasicMessage(messages, error);
    error.identificator ??= error.message.split(' ').slice(0, 4).join(' ') + '...';
    return error;
  }
  
  
  static log(messages = {}, options) {
    if (!this.#validateOptions(options)) return;
    const error = this.#constructError(messages, options);
    console.error(`${error.name}: ${error.message}\n${error.stack}`);
  }

  static #log = ErrorHandler.bind(ErrorHandler, ERROR_MESSAGES);

  static async reply(messages = {}, replies = {}, options) {
    if (!this.#validateOptions(options)) return;
    const error = this.#constructError(messages, options);
    if (!this.#validateInteraction(error)) return;
    this.#log(error);
    error.reply ??= replies[error.key] ?? DEFAULT_ERROR_REPLY;
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
      this.log({ key: 'FAILED_REPLY', cause: failedReply, primaryError: error.identificator});
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

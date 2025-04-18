class KeyError extends Error {
  constructor(key, { message = '', cause, primaryError, args } = {}) {
    if (cause) message += `\nCause: ${cause.message}`;
    if (primaryError) message += `\nPrimary error: ${primaryError.identificator}`;
    super(message, {cause});
    this.key = key;
    this.primaryError = primaryError;
    this.args = args;
    this.name = key ?? 'KeyError';
    this.identificator = key ?? (message.split(' ').slice(0, 3).join(' ') + '...');
  }
}

const ERROR_MESSAGES = {
    NO_INTERACTION: () => `No interaction was passed when attempting to log an error.`,
    EXPIRED_INTERACTION: () => `Interaction is expired. Attempt to reply user about error failed.`,
    EMPTY_ERROR: () => 'Attempt to send empty error',
    FAILED_REPLY: () => `Attempt to reply user about error failed.`,
}

const DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';

const reporter = (() => {
  let instance;
  return {
    get() {
      if (!instance) instance = new ErrorReporter(ERROR_MESSAGES);
      return instance;
    }
  };
})();

class ErrorReporter {
  constructor(messages = {}, client, replies = {}, interaction) {
    this.messages = messages;
    this.client = client;
    this.replies = replies;
    this.interaction = interaction;
  }

  async exec(key, options) {
    reporter.client = this.client;
    if (!key) return await reporter.exec('EMPTY_ERROR');
    const error = this.#constructError(key, options);
    this.#log(error);
    const reply = this.replies[error.key] ?? ErrorReporter.#DEFAULT_ERROR_REPLY;
    try {
      if (!this.interaction.isRepliable()) return await reporter.exec('EXPIRED_INTERACTION', { primaryError: error });
      if (this.interaction.replied) {
        await this.interaction.followUp(reply);
      } else if (this.interaction.deferred) {
        await this.interaction.editReply(reply);
      } else {
        await this.interaction.reply(reply);
      }
    } catch (cause) {
      reporter.exec('FAILED_REPLY', { cause, primaryError: error });
    }
  }
  
  #constructError(key, options) {
    options.message = this.#constructFullMessage(key, options);
    return new KeyError(key, options);
  }

  #constructFullMessage(key, options) {
    let message = this.#constructBasicMessage(key, options);
    if (!this.interaction) return message;
    const context = this.#getContext();
    message = 
      `${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName} =>` + 
      `\n${message}`;
    return message;
  }

  #constructBasicMessage(key, { message = '', args } ) {
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

  #log(error) {
    console.error(`${error.name}: ${error.stack}/n`);
  }
}

module.exports = {
  KeyError,
  ErrorReporter
};

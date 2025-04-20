class KeyError extends Error {
  constructor(key, { cause, primaryError, forcedReply, args } = {}) {
    let message = key ? '' : 'Non-wrapped error';
    if (cause) message += `\nCause ${cause.id ?? cause.name}: ${cause.message}`;
    if (primaryError) message += `\nPrimary error: ${primaryError.id}`;
    super(message, {cause});
    this.id = ++this.index;
    this.key = key;
    this.name = key ?? 'KeyError';
    this.context = cause.context;
    this.options = {};
    this.options.primaryError = primaryError;
    this.options.forcedReply = forcedReply;
    this.options.args = args;
  }

  static index = 0;
}

const ERROR_MESSAGES = {
    NO_INTERACTION: () => `No interaction was passed when attempting to log an error.`,
    EXPIRED_INTERACTION: () => `Interaction is expired. Attempt to reply user about error failed.`,
    EMPTY_ERROR: () => 'Attempt to send empty error',
    FAILED_REPLY: () => `Attempt to reply user about error failed.`,
    TOO_MANY_ARGUMENTS: () => `Error and options cannot be specified at the same time.`,
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

  async exec(first, second) {
    reporter.client = this.client;
    if (!first) return await reporter.exec('EMPTY_ERROR');
    const error = first instanceof Error ? this.#supplementError(first) : this.#constructError(first, second);
    if (first instanceof Error && second) return await reporter.exec('TOO_MANY_ARGUMENTS', {cause: error});
    if (!error.context) error.context = this.#getContext();
    this.#log(error);
    this.#reply(error);
  }

  #supplementError(error) {
    return error instanceof KeyError ? error : new KeyError(null, {cause: error});
  }
  
  #constructError(key, options) {
    const func = this.messages[key];
    options.message = func?.(options.args);
    return new KeyError(key, options);
  }

  #getContext() {
    const username = this.interaction.user?.username ?? 'N/A';
    const userId = this.interaction.user?.id ?? 'N/A';
    const guildName = this.interaction.guild?.name ?? 'DM';
    const commandName = this.interaction.commandName ?? 'N/A';
    const text = `${username} (${userId} on ${guildName} during ${commandName} =>`;
    return { username, userId, guildName, commandName, text }
  }

  #log(error) {
    console.error(`${error.context.text}\n${error.name}: ${error.stack}\n`);
  }

  async #reply(error) {
    const reply = this.replies[error.key] ?? DEFAULT_ERROR_REPLY;
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
}

module.exports = {
  KeyError,
  ErrorReporter
};

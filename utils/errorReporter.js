const { inspect } = require('node:util');

class KeyError extends Error {
  constructor(key, { cause, primaryError, forcedReply, args } = {}) {
    let message = key ? '' : 'Non-wrapped error';
    super(message, {cause});
    if (cause) this.stack += `\nCause ${cause.id ?? cause.name}: ${cause.stack}`;
    if (primaryError) this.stack += `\nPrimary error: ${primaryError.id}`;
    this.id = ++(KeyError.index);
    this.key = key;
    this.name = key ?? 'KeyError';
    this.context = cause?.context;
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
    UNEXPECTED_ERROR: ({first, second}) => `Unexpected secondary error while reporting an error: ${first}, ${second}`,
}

const DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';

class ErrorReporter {
  constructor(messages = {}, client, replies = {}, interaction) {
    this.messages = messages;
    this.client = client;
    this.replies = replies;
    this.interaction = interaction;
  }

  _reporter;

  get #reporter() {
    if (!this._reporter) {
      this._reporter = new ErrorReporter(ERROR_MESSAGES);
      this._reporter._reporter = {
        exec(first, second) {
          console.error(`Too high nesting of errors: ${first}, ${second}`);
        }
      }
    }
    return this._reporter;
  }

  async exec(first, second) {
    try {
      this.#reporter.client = this.client;
      if (!first) return await this.#reporter.exec('EMPTY_ERROR');
      const error = first instanceof Error ? this.#supplementError(first) : this.#constructError(first, second);
      if (first instanceof Error && second) return await this.#reporter.exec('TOO_MANY_ARGUMENTS', {cause: error});
      if (!error.context) error.context = this.#getContext();
      this.#log(error);
      if (this.interaction) this.#reply(error);
    }
    catch (error) {
      console.error(`Unexpected error in ErrorReporter =>\n` + 
        `${inspect(error)}\n` +
        `First argument: ${inspect(first)}\n` +
        `Second argument: ${inspect(second)}\n`);

    }
  }

  #supplementError = (error) => error instanceof KeyError ? error : new KeyError(null, {cause: error});
  
  #constructError(key, options) {
    const func = this.messages[key];
    options.message = func?.(options.args);
    return new KeyError(key, options);
  }

  #getContext() {
    if (this.interaction) {
      const username = this.interaction.user?.username ?? 'N/A';
      const userId = this.interaction.user?.id ?? 'N/A';
      const guildName = this.interaction.guild?.name ?? 'DM';
      const commandName = this.interaction.commandName ?? 'N/A';
      const text = `${username} (${userId} on ${guildName} during ${commandName} =>`;
      return { username, userId, guildName, commandName, text }
    } else {
      return { text: "Global =>"}
    }
  }

  #log(error) {
    console.error(`${error.id}. ${error.context.text}\n${error.name}: ${error.stack}\n`);
  }

  async #reply(error) {
    const reply = this.replies[error.key] ?? DEFAULT_ERROR_REPLY;
    try {
      if (!this.interaction.isRepliable()) return await this.#reporter.exec('EXPIRED_INTERACTION', { primaryError: error });
      if (this.interaction.replied) {
        await this.interaction.followUp(reply);
      } else if (this.interaction.deferred) {
        await this.interaction.editReply(reply);
      } else {
        await this.interaction.reply(reply);
      }
    } catch (cause) {
      this.#reporter.exec('FAILED_REPLY', { cause, primaryError: error });
    }
  }
}

module.exports = {
  KeyError,
  ErrorReporter
};

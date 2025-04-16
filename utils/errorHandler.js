const DEFAULT_ERROR_REPLY = '❌ An error occurred while executing this command';
const ERROR_MESSAGES = {
  NO_INTERACTION: (primaryError) => 
    `No interaction was passed when attempting to log an error. Primary error: ${primaryError}`,
  EXPIRED_INTERACTION: (primaryError) => 
    `Interaction is expired. Attempt to reply user about error failed. Primary error: ${primaryError}`,
  EMPTY_ERROR: () => 'Attempt to send empty error',
  NO_FUNCTION: (handler) => `${handler} isn't function`,
};

export default class ErrorHandler {
  static #validateError(error) {
    if (!error) {
      this.log(new Error('EMPTY_ERROR'), ERROR_MESSAGES);
      return false;
    }
    return true;
  }

  static #validateInteraction(interaction, error) {
    if (!interaction) {
      this.log(new Error('NO_INTERACTION'), ERROR_MESSAGES, error);
      return false;
    }
    return true;
  }

  static #validateRepliable(interaction, error) {
    if (!interaction.isRepliable()) {
      this.log(new Error('EXPIRED_INTERACTION'), ERROR_MESSAGES, error);
      return false;
    }
    return true;
  }

  static #validateFunction(handler) {
    if (typeof handler !== 'function') {
      this.log(new Error('NO_FUNCTION'), ERROR_MESSAGES, handler);
      return false;
    }
    return true;
  }
  
  static #getErrorMessage(error, errorMessages = {}, ...messageArgs) {
    return errorMessages[error.message]?.(...messageArgs) ?? error.message ?? error;
  }
  
  static #getContext(interaction) {
    return {
      username: interaction.user?.username ?? 'N/A',
      userId: interaction.user?.id ?? 'N/A',
      guildName: interaction.guild?.name ?? 'DM',
      commandName: interaction.commandName ?? 'N/A',
    };
  }
  
  static log(error, errorMessages = {}, ...messageArgs) {
    if (!this.#validateError(error)) return;
    const errorMessage = this.#getErrorMessage(error, errorMessages, ...messageArgs);
    const fullErrorMessage = errorMessage + (error.stack ? `\n${error.stack}` : '');
    console.error(fullErrorMessage);
  }
  
  static interactionLog(interaction, error, errorMessages = {}, ...messageArgs) {
    if (!this.#validateError(error)) return;
    if (!this.#validateInteraction(interaction, error)) return;
    const context = this.#getContext(interaction);
    const errorMessage = this.#getErrorMessage(error, errorMessages, ...messageArgs);
    const fullErrorMessage = 
      `ERROR: ${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName}:\n${errorMessage}` +
      (error.stack ? `\n${error.stack}` : '');
    console.error(fullErrorMessage);
  }

  static async reply(interaction, error, errorMessages = {}, errorReplies = {}, ...messageArgs) {
    if (!this.#validateError(error)) return;
    if (!this.#validateInteraction(interaction, error)) return;
    this.interactionLog(interaction, error, errorMessages, ...messageArgs);
    const errorReply = errorReplies[error.message] ?? DEFAULT_ERROR_REPLY;
    try {
      if (!this.#validateRepliable(interaction, error)) return;

      if (interaction.replied) {
        await interaction.followUp(errorReply);
      } else if (interaction.deferred) {
        await interaction.editReply(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    } catch (secondaryError) {
      this.log(secondaryError);
    }
  }

  static wrap(handler, errorMessages = {}, errorReplies = {}) {
    if (!this.#validateFunction(handler)) return;
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        if (interaction) await ErrorHandler.reply(interaction, error, errorMessages, errorReplies);
        else ErrorHandler.log(error, errorMessages);
      }
    };
  }
}

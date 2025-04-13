const DEFAULT_ERROR_MESSAGE = '❌ An error occurred while executing this command';

const ERROR_ENVIRONMENTS = {
  REPLY: ', error reply',
  WRAP: ', wrap'
};

class ErrorHandler {
  static getContext(interaction) {
    return {
      username: interaction.user?.username ?? 'N/A',
      userId: interaction.user?.id ?? 'N/A',
      guildName: interaction.guild?.name ?? 'DM',
      commandName: interaction.commandName ?? 'N/A',
    };
  }

  static log(interaction, environment, error) {
    const context = this.getContext(interaction);
    console.error(
      `ERROR in ${environment}: ${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName}:\n${error}`
    );
  }

  static async reply(interaction, environment, message = DEFAULT_ERROR_MESSAGE) {
    const fullMessage = `${message}\nEnvironment: ${environment}`;
    const newEnvironment = environment + ERROR_ENVIRONMENTS.REPLY;
    
    try {
      if (!interaction.isRepliable()) {
        this.log(interaction, newEnvironment, 'Interaction is no longer repliable');
        return;
      }

      if (interaction.replied) {
        await interaction.followUp(fullMessage);
      } else if (interaction.deferred) {
        await interaction.editReply(fullMessage);
      } else {
        await interaction.reply(fullMessage);
      }
    } catch (replyError) {
      this.log(interaction, newEnvironment, replyError);
    }
  }

  static async handleInteractionError(interaction, environment, error, message) {
    log(interaction, environment, error);
    await reply(interaction, environment, message)
  }

  static wrap(environment, handler) {
    const newEnvironment = environment + ERROR_ENVIRONMENTS.WRAP;
    
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        await this.handleInteractionError(
          interaction,
          newEnvironment,
          error,
          error.userMessage || DEFAULT_ERROR_MESSAGE
        );
      }
    };
  }
}

module.exports = ErrorHandler;

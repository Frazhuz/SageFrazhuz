class ErrorHandler {
  static getContext(interaction) {
    return {
      username: interaction.user?.username || 'Unknown',
      userId: interaction.user?.id || 'N/A',
      guildName: interaction.guild?.name || 'DM',
      commandName: interaction.commandName || interaction.customId || 'unknown'
    };
  }

  static log(environment, interaction, error) {
    const context = this.getContext(interaction);
    console.error(
      `ERROR ${environment}: ${context.username} (${context.userId}) ` +
      `in ${context.guildName} ` +
      `during ${context.commandName}:\n${error.stack || error}`
    );
  }

  
  static async reply(environment, interaction, message) {
    try {
        if (!interaction.isRepliable()) {
            console.error(`ERROR ${environment}: Interaction is no longer repliable`);
            return;
        }

        if (interaction.replied) {
            await interaction.followUp(message);
        } else if (interaction.deferred) {
            await interaction.editReply(message);
        } else {
            await interaction.reply(message);
        }
    } catch (replyError) {
        console.error('Failed to send reply:', replyError);
    }
  }

  static wrap(environment, handler) {
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        this.log(environment, error, interaction);
        await this.reply(
          interaction, 
          error.userMessage || errorMessage || '❌ An error occurred while executing this command'
        );
      }
    };
  }
}

module.exports = ErrorHandler;

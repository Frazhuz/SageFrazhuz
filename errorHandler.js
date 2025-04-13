class ErrorHandler {
  static getContext(interaction) {
    return {
      username: interaction.user?.username || 'Unknown',
      userId: interaction.user?.id || 'N/A',
      guildName: interaction.guild?.name || 'DM',
      commandName: interaction.commandName || interaction.customId || 'unknown'
    };
  }

  static log(error, interaction) {
    const context = this.getContext(interaction);
    console.error(
      `[ERROR: ${context.username} (${context.userId}) ` +
      `in ${context.guildName} ` +
      `during ${context.commandName}:\n${error.stack || error}`
    );
  }

  static generalLog(error) {
    console.error(error.stack || error);
  }

  
  static async reply(interaction, message) {
    try {
        if (!interaction.isRepliable()) {
            console.warn("Interaction is no longer repliable.");
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

  static wrap(handler) {
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        this.log(error, interaction);
        await this.reply(
          interaction, 
          error.userMessage || '❌ An error occurred while executing this command'
        );
      }
    };
  }
}

module.exports = ErrorHandler;

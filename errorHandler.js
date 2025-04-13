class ErrorHandler {
  static getContext(interaction) {
    return {
      username: interaction.user?.username ?? 'N/A',
      userId: interaction.user?.id ?? 'N/A',
      guildName: interaction.guild?.name ?? 'DM',
      commandName: interaction.commandName ?? 'N/A'
    };
  }

  
  static log(environment, interaction, error) {
    const context = this.getContext(interaction);
    console.error(
      `ERROR in ${environment}: ${context.username} (${context.userId}) ` +
      `on ${context.guildName} ` +
      `during ${context.commandName}:\n${error.stack ?? error}`
    );
  }

  
  static async reply(environment, interaction, message) {
    message += `\nEnvironment: ${environment}`;
    environment += ", error reply";
    try {
        if (!interaction.isRepliable()) {
          this.log(environment, interaction, "Interaction is no longer repliable");
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
        this.log(environment, interaction, replyError);
    }
  }

  static wrap(environment, handler) {
    environment += ", wrap";
    return async (interaction) => {
      try {
        await handler(interaction);
      } catch (error) {
        this.log(newEnvironment, error, interaction);
        await this.reply(
          environment,
          interaction, 
          error.userMessage || '❌ An error occurred while executing this command'
        );
      }
    };
  }
}

module.exports = ErrorHandler;

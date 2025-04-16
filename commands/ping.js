class ping {
    execute: async (interaction) => {
        await interaction.reply('Pong!');
    }
};

module.exports = ping;

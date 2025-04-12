module.exports = {
    execute: async (interaction) => {
        const text = interaction.options.getString('message');
        await interaction.reply(text);
    }
};

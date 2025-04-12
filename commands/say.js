module.exports = {
    execute: async (interaction) => {
        const text = interaction.options.getString('text');
        await interaction.reply(text);
    }
};

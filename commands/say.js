class say {
    execute: async (interaction) => {
        const text = interaction.options.getString('message');
        await interaction.reply(text);
    }
};

module.exports = say;

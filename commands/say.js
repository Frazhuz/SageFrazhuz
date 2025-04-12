module.exports = {
    execute: async (interaction) => {
        const text = interaction.options.getString('text');

        if (!interaction) {
            console.error('Параметр "interaction" не получен');
            return await interaction.reply({ 
                content: '❌ Не получен interaction!', 
                ephemeral: true 
            });
        }

        if (!text) {
            console.error('Параметр "text" не получен');
            return await interaction.reply({ 
                content: '❌ Не указан текст!', 
                ephemeral: true 
            });
        }
        await interaction.reply(text);
    }
};

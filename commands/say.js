export default class say {
    async exec (interaction) {
        const text = interaction.options.getString('message');
        await interaction.reply(text);
    }
};

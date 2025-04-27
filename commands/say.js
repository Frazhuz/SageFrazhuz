export default class say {
    static exec = async (interaction) => {
        const text = interaction.options.getString('message');
        await interaction.reply(text);
    }
};

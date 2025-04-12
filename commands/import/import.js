const { generateTsv } = require('./generateTSV');

module.exports = {
  execute: async (interaction) => {
    const tsvData = generateTsv();
    //const file = new AttachmentBuilder(Buffer.from(tsvData), { name: 'data.tsv' });
    const replyMessage = await interaction.reply({ 
      contetn: "тест",
      //files: [file], 
      fetchReply: true });
    const attachmentUrl = replyMessage.attachments.first()?.url;
    if (!attachmentUrl)
    {
      console.error("Добавление ссылки не удалось.");
      await interaction.followUp("For unknown reasons, adding a link to the added file failed.");
      return;
    }
    await replyMessage.edit({
    content: `sage! npc import tsv="${attachmentUrl}"`,
    //files: [file]
    });
  }
};

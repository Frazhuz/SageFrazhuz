const generateTsv = require('./generateTSV');
const { AttachmentBuilder } = require('discord.js'); // Добавьте импорт

module.exports = {
  execute: async (interaction) => {
    try {
      const tsvData = generateTsv();
      const file = new AttachmentBuilder(Buffer.from(tsvData), { name: 'data.tsv' });

      const replyMessage = await interaction.reply({ 
        content: "Генерация TSV...", 
        files: [file], 
        fetchReply: true 
      });

      const attachmentUrl = replyMessage.attachments.first()?.url;
      
      if (!attachmentUrl) {
        console.error("Не удалось получить ссылку на файл в команде import");
        return;
      }

      await replyMessage.edit({
        content: `sage! npc import tsv="${attachmentUrl}"`,
        files: [file] 
      });

    } catch (error) {
      console.error("Ошибка в команде import:", error);
      if (!interaction.replied) {
        await interaction.reply('❌ Произошла ошибка при выполнении команды.');
      } else {
        await interaction.followUp('❌ Произошла ошибка при обновлении сообщения.');
      }
    }
  }
};


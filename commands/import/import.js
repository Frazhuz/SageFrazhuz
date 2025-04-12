const generateTsv = require('./generateTSV');
const { AttachmentBuilder } = require('discord.js'); // Добавьте импорт

module.exports = {
  execute: async (interaction) => {
    try {
      // Генерируем TSV данные
      const tsvData = generateTsv();
      
      // Создаем файловое вложение
      const file = new AttachmentBuilder(Buffer.from(tsvData), { 
        name: 'data.tsv' 
      });

      // Отправляем первоначальный ответ с файлом
      const replyMessage = await interaction.reply({ 
        content: "Генерация TSV...", // Исправлено: content вместо contetn
        files: [file], // Раскомментировано
        fetchReply: true // Временно оставляем, пока не обновим библиотеку
      });

      // Получаем URL вложения
      const attachmentUrl = replyMessage.attachments.first()?.url;
      
      if (!attachmentUrl) {
        throw new Error("Не удалось получить ссылку на файл");
      }

      // Редактируем исходное сообщение
      await replyMessage.edit({
        content: `sage! npc import tsv="${attachmentUrl}"`,
        files: [] // Убираем повторную отправку файла
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

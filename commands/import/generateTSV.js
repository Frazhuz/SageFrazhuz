module.exports = function generateTsv() {
  const data = [
    ['ID', 'Name', 'Price'], // Заголовки
    [1, 'Apple', 1.99],      // Строка 1
    [2, 'Banana', 0.99],     // Строка 2
    [3, 'Orange', 2.49]      // Строка 3
  ];

  return data.map(row => row.join('\t')).join('\n');
};

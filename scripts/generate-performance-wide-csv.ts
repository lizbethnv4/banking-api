import { writeFileSync } from 'node:fs';

const TOTAL_ROWS = 10_000;
const ACCOUNT_COUNT = 50;

const accountNumbers = Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
  const number = index + 1;
  return `LOAD${number.toString().padStart(6, '0')}`;
});

const pairs: Array<[string, string]> = [];

for (let index = 0; index < accountNumbers.length; index += 2) {
  pairs.push([accountNumbers[index], accountNumbers[index + 1]]);
}

const rows = ['sourceAccountNumber,destinationAccountNumber,amount'];

for (let i = 0; i < TOTAL_ROWS; i++) {
  const [source, destination] = pairs[i % pairs.length];
  rows.push(`${source},${destination},1.00`);
}

writeFileSync(
  'batch-performance-50-accounts.csv',
  rows.join('\n'),
  'utf8',
);

console.log(
  `Generadas ${TOTAL_ROWS} transferencias usando ${ACCOUNT_COUNT} cuentas (${pairs.length} pares).`,
);
console.log(
  `Cuentas: ${accountNumbers[0]} a ${accountNumbers[accountNumbers.length - 1]}.`,
);
console.log(
  'Cada par recibe 400 transferencias de 1.00. La cuenta origen necesita al menos RD$400.0000.',
);

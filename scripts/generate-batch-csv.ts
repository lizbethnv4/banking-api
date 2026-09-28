import { writeFileSync } from 'node:fs';

const SOURCE_ACCOUNT = 'LOAD000005';
const DESTINATION_ACCOUNT = 'LOAD000001';
const TOTAL_ROWS = 10_000;

const rows = [
  'sourceAccountNumber,destinationAccountNumber,amount',
];

for (let i = 0; i < TOTAL_ROWS; i++) {
  rows.push(
    `${SOURCE_ACCOUNT},${DESTINATION_ACCOUNT},1.00`,
  );
}

writeFileSync(
  'batch-10000.csv',
  rows.join('\n'),
  'utf8',
);

console.log(
  `CSV generated successfully with ${TOTAL_ROWS} transfers.`,
);
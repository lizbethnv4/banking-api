import { writeFileSync } from 'node:fs';

const TOTAL_ROWS = 1_000;

const ACCOUNT_PAIRS = [
    ['LOAD000001', 'LOAD000002'],
    ['LOAD000003', 'LOAD000004'],
    ['LOAD000005', 'LOAD000006'],
    ['LOAD000007', 'LOAD000008'],
    ['LOAD000009', 'LOAD000010'],
];;

const rows = [
    'sourceAccountNumber,destinationAccountNumber,amount',
];

for (let i = 0; i < TOTAL_ROWS; i++) {
    const [source, destination] =
        ACCOUNT_PAIRS[i % ACCOUNT_PAIRS.length];

    rows.push(`${source},${destination},1.00`);
}

writeFileSync(
    'batch-performance-multiple-accounts.csv',
    rows.join('\n'),
    'utf8',
);

console.log(
    `Generadas ${TOTAL_ROWS} transferencias usando ${ACCOUNT_PAIRS.length} pares`,
);
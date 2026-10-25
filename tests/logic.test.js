import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promptPayPayload, parsePromptPayId, formatPromptPayId, crc16 } from '../src/lib/promptpay.js';
import { parseBaht, itemTotal, formatBaht, splitBaht } from '../src/lib/money.js';
import { computeBalances, settle } from '../src/lib/split.js';

// Expected payloads were cross-checked against the `promptpay-qr` npm library.
test('promptpay payload: phone, no amount', () => {
  assert.equal(
    promptPayPayload('0812345678'),
    '00020101021129370016A000000677010111011300668123456785802TH530376463045D82'
  );
});

test('promptpay payload: phone with amount and dashes', () => {
  assert.equal(
    promptPayPayload('081-234-5678', 42000),
    '00020101021229370016A000000677010111011300668123456785802TH53037645406420.006304BF9D'
  );
});

test('promptpay payload: national id with amount', () => {
  assert.equal(
    promptPayPayload('1234567890123', 150050),
    '00020101021229370016A000000677010111021312345678901235802TH530376454071500.506304CC61'
  );
});

test('promptpay payload: e-wallet', () => {
  assert.equal(
    promptPayPayload('123456789012345', 9999),
    '00020101021229390016A00000067701011103151234567890123455802TH5303764540599.996304BDBB'
  );
});

test('promptpay id parsing', () => {
  assert.deepEqual(parsePromptPayId('081 234 5678'), { type: 'phone', digits: '0812345678' });
  assert.deepEqual(parsePromptPayId('+66812345678'), { type: 'phone', digits: '0812345678' });
  assert.equal(parsePromptPayId('12345')?.type, undefined);
  assert.equal(parsePromptPayId('1234567890123').type, 'nid');
  assert.equal(formatPromptPayId('0812345678'), '081-234-5678');
  assert.equal(formatPromptPayId('0812345678', { mask: true }), '081-xxx-5678');
  assert.throws(() => promptPayPayload('123'));
});

test('crc16 ccitt-false check value', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('parseBaht', () => {
  assert.equal(parseBaht('1,250.5'), 125050);
  assert.equal(parseBaht('99'), 9900);
  assert.equal(parseBaht('0.07'), 7);
  assert.equal(parseBaht('1.234'), null);
  assert.equal(parseBaht('abc'), null);
  assert.equal(formatBaht(125050), '1,250.50');
  assert.deepEqual(splitBaht(125050), ['1,250', '50']);
});

test('service charge then VAT', () => {
  // 1000 + 10% = 1100, + 7% = 1177
  assert.equal(itemTotal({ amount: 100000, sc: true, vat: true }), 117700);
  assert.equal(itemTotal({ amount: 100000, vat: true }), 107000);
});

const members = {
  a: { name: 'ต้น', createdAt: 1 },
  b: { name: 'ฝน', createdAt: 2 },
  c: { name: 'บอส', createdAt: 3 },
};

test('equal split with leftover satang stays exact', () => {
  const items = { i1: { amount: 10000, paidBy: 'a', split: { a: true, b: true, c: true }, createdAt: 1 } };
  const { rows, total } = computeBalances(members, items);
  assert.equal(total, 10000);
  assert.deepEqual(rows.map((r) => r.share), [3334, 3333, 3333]);
  assert.equal(rows.reduce((s, r) => s + r.net, 0), 0);
});

test('settlement covers every balance', () => {
  const items = {
    i1: { amount: 120000, paidBy: 'a', split: { a: true, b: true, c: true }, createdAt: 1 },
    i2: { amount: 30000, paidBy: 'b', split: { b: true, c: true }, createdAt: 2 },
    i3: { amount: 5000, paidBy: 'c', split: { a: true }, createdAt: 3 },
  };
  const { rows } = computeBalances(members, items);
  const transfers = settle(rows);
  const after = Object.fromEntries(rows.map((r) => [r.id, r.net]));
  for (const t of transfers) {
    after[t.from] += t.amount;
    after[t.to] -= t.amount;
  }
  assert.ok(Object.values(after).every((v) => v === 0));
  assert.ok(transfers.length <= rows.length - 1);
});

test('recorded payments settle a transfer and survive later changes', () => {
  const items = { i1: { amount: 90000, paidBy: 'a', split: { a: true, b: true, c: true }, createdAt: 1 } };
  const first = settle(computeBalances(members, items).rows);
  assert.deepEqual(first.map((t) => t.amount), [30000, 30000]);

  // b pays a back
  const payments = { p1: { from: 'b', to: 'a', amount: 30000, at: 1 } };
  const after = settle(computeBalances(members, items, payments).rows);
  assert.deepEqual(after, [{ from: 'c', to: 'a', amount: 30000 }]);

  // a new item paid by b after b already settled: b is now owed money
  const items2 = { ...items, i2: { amount: 6000, paidBy: 'b', split: { a: true, b: true, c: true }, createdAt: 2 } };
  const { rows } = computeBalances(members, items2, payments);
  assert.equal(rows.find((r) => r.id === 'b').net, 4000);
  assert.equal(rows.reduce((s, r) => s + r.net, 0), 0);
});

test('items with removed members are skipped, not crashed', () => {
  const items = { i1: { amount: 5000, paidBy: 'zzz', split: { a: true }, createdAt: 1 } };
  const { total, skipped } = computeBalances(members, items);
  assert.equal(total, 0);
  assert.deepEqual(skipped, ['i1']);
});

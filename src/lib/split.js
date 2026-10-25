import { itemTotal } from './money.js';

/** Members sorted by creation order; returns [{ id, ...member }] */
export function orderedMembers(members = {}) {
  return Object.entries(members)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.id.localeCompare(b.id));
}

export function orderedItems(items = {}) {
  return Object.entries(items)
    .map(([id, it]) => ({ id, ...it }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.id.localeCompare(b.id));
}

/** Participant ids of an item that still exist, in member order. */
export function participantsOf(item, memberList) {
  const split = item.split || {};
  return memberList.filter((m) => split[m.id]).map((m) => m.id);
}

/**
 * Compute what each person paid, what their share is, and the net balance.
 * Item totals are divided equally among participants; leftover satang go to the
 * first participants (in member order) so the shares always add up exactly.
 * Recorded payments (transfers already made) move money between people, so the
 * remaining settlement stays correct even when items change afterwards.
 */
export function computeBalances(members = {}, items = {}, payments = {}) {
  const memberList = orderedMembers(members);
  const rows = Object.fromEntries(
    memberList.map((m) => [m.id, { id: m.id, paid: 0, share: 0, sent: 0, received: 0, net: 0 }])
  );
  let total = 0;
  const skipped = [];

  for (const item of orderedItems(items)) {
    const amount = itemTotal(item);
    const people = participantsOf(item, memberList);
    if (!amount || !people.length || !rows[item.paidBy]) {
      if (amount) skipped.push(item.id);
      continue;
    }
    total += amount;
    rows[item.paidBy].paid += amount;
    const base = Math.floor(amount / people.length);
    let rest = amount - base * people.length;
    for (const id of people) {
      rows[id].share += base + (rest > 0 ? 1 : 0);
      if (rest > 0) rest--;
    }
  }

  for (const p of Object.values(payments || {})) {
    if (!rows[p.from] || !rows[p.to] || !(p.amount > 0)) continue;
    rows[p.from].sent += p.amount;
    rows[p.to].received += p.amount;
  }

  for (const r of Object.values(rows)) r.net = r.paid - r.share + r.sent - r.received;
  return { rows: memberList.map((m) => rows[m.id]), total, skipped };
}

/** Payments as a sorted list [{ id, from, to, amount, at }] */
export function orderedPayments(payments = {}) {
  return Object.entries(payments || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.at || 0) - (b.at || 0));
}

/**
 * Minimal-ish set of transfers that settles every balance:
 * repeatedly match the largest debtor with the largest creditor.
 * Returns [{ from, to, amount }] in satang.
 */
export function settle(rows) {
  const debtors = rows.filter((r) => r.net < 0).map((r) => ({ id: r.id, amt: -r.net }));
  const creditors = rows.filter((r) => r.net > 0).map((r) => ({ id: r.id, amt: r.net }));
  const out = [];
  const byAmt = (a, b) => b.amt - a.amt;
  debtors.sort(byAmt);
  creditors.sort(byAmt);

  while (debtors.length && creditors.length) {
    const d = debtors[0];
    const c = creditors[0];
    const amount = Math.min(d.amt, c.amt);
    out.push({ from: d.id, to: c.id, amount });
    d.amt -= amount;
    c.amt -= amount;
    if (!d.amt) debtors.shift();
    if (!c.amt) creditors.shift();
    debtors.sort(byAmt);
    creditors.sort(byAmt);
  }
  return out;
}

export const transferKey = (t) => `${t.from}_${t.to}`;

/**
 * A payment is "pending" until the receiver confirms it. Pending payments still
 * count toward balances (so the transfer leaves the to-do list right away); if the
 * receiver says the money never arrived, the payment is removed and it comes back.
 * Records without the flag predate confirmation and count as confirmed.
 */
export const isPending = (p) => p?.pending === true;


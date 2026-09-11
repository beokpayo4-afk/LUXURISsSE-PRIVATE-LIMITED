/** Ticket bookings attract 5% GST on the fare. */

export const TICKET_GST_RATE = 0.05

export function isTicketCartItem(item) {
  return item?.type === 'ticket' || item?.type === 'group_ticket'
}

export function ticketLineSubtotal(item) {
  if (item?.unitPrice == null) return null
  return Number(item.unitPrice) * (item.quantity || 1)
}

/** Round money to 2 decimal places (paise). */
export function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

export function ticketGstAmount(subtotal) {
  if (subtotal == null) return null
  return roundMoney(Number(subtotal) * TICKET_GST_RATE)
}

export function ticketTotalWithGst(subtotal) {
  if (subtotal == null) return null
  return roundMoney(Number(subtotal) + ticketGstAmount(subtotal))
}

/** Cart totals: GST only on ticket / group_ticket lines. */
export function cartMoneyBreakdown(items = []) {
  let subtotal = 0
  let ticketSubtotal = 0
  let hasPriced = false

  for (const row of items) {
    if (row.unitPrice == null) continue
    hasPriced = true
    const line = Number(row.unitPrice) * (row.quantity || 1)
    subtotal += line
    if (isTicketCartItem(row)) ticketSubtotal += line
  }

  if (!hasPriced) {
    return { subtotal: 0, gst: 0, total: 0, ticketSubtotal: 0, hasGst: false }
  }

  const gst = ticketGstAmount(ticketSubtotal) || 0
  return {
    subtotal: roundMoney(subtotal),
    ticketSubtotal: roundMoney(ticketSubtotal),
    gst: roundMoney(gst),
    total: roundMoney(subtotal + gst),
    hasGst: ticketSubtotal > 0,
  }
}

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export const dateFormatter = new Intl.DateTimeFormat('es-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

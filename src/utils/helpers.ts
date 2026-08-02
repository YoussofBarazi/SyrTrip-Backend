export function removeNull(data: Object) {
  return Object.fromEntries(
    Object.entries(data).filter(([__dirname, value]) => value !== undefined)
  )
}
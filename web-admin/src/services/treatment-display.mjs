// The server counter is advanced only by confirmation, never by draft count.
export function consumedSessions(completedSessions) {
  const count = Number(completedSessions || 0);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}
export function belongsToPackage(booking, customerId, packageId) {
  if (booking.customerId !== customerId) return false;
  const linked = String(booking.specialNotes || "").match(
    /\[user_package_id=([0-9a-f-]{36})\]/i,
  )?.[1];
  return Boolean(linked) && linked.toLowerCase() === packageId.toLowerCase();
}

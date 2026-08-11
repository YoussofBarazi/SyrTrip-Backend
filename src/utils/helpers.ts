export function removeNull(data: Object) {
  return Object.fromEntries(
    Object.entries(data).filter(([__dirname, value]) => value !== undefined)
  )
}

export function toArabicItemType(itemType: string): string {
  switch (itemType) {
    case 'HOTEL': return 'فندق';
    case 'CAR': return 'سيارة';
    case 'RESTAURANT': return 'مطعم';
  }
  return itemType;
}

export function toArabicBookingStatus(status: string): string {
  switch (status) {
    case 'PENDING': return 'قيد الانتظار';
    case 'CONFIRMED': return 'تم التأكيد';
    case 'CANCELLED': return 'تم الإلغاء';
    case 'COMPLETED': return 'مكتمل';
  } 
  return status;
}
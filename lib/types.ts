export type ItemStatus = 'active' | 'returned' | 'kept' | 'expired';

export type Item = {
  id: string;
  store: string;
  itemName: string;
  price?: number;
  purchaseDate: string;
  returnWindowDays: number;
  warrantyMonths?: number;
  /** file name inside documentDirectory (or a full uri for old items) */
  receiptUri?: string;
  status: ItemStatus;
  notes?: string;
  createdAt: string;
};

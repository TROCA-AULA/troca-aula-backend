export class SwapRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  classId: number;
  requesterId: number;
  targetId: number;
  createdAt: Date;
  updatedAt: Date;
}

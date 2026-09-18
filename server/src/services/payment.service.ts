import { PaymentStatus, PaymentMethod } from "@prisma/client";

export class PaymentService {
  /**
   * Mock payment provider simulation
   */
  static async processPayment(
    method: PaymentMethod,
    amount: number,
    details?: any
  ): Promise<{ status: PaymentStatus; txnId?: string; failReason?: string }> {
    
    // COD is always just pending collection
    if (method === PaymentMethod.COD) {
      return { status: PaymentStatus.COD_PENDING };
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock logic: 
    // If it's a card and last4 is '0000', simulate failure
    if (method === PaymentMethod.CARD && details?.cardLast4 === '0000') {
      return { 
        status: PaymentStatus.FAILED, 
        failReason: "Card declined by the issuing bank" 
      };
    }

    // Otherwise, simulate success
    return {
      status: PaymentStatus.PAID,
      txnId: `txn_mock_${Math.random().toString(36).substring(2, 10)}`
    };
  }
}

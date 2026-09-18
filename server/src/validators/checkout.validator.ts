import { z } from "zod";

export const checkoutSchema = z.object({
  body: z.object({
    orderId: z.string().optional(),
    addressId: z.string().min(1),
    address: z.any().optional(),
    lines: z.array(z.object({
      productId: z.string(),
      variantId: z.string(),
      qty: z.number().int().min(1),
    })).optional(),
    items: z.array(z.any()).optional(),
    couponCode: z.string().optional(),
    paymentMethod: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.enum(["UPI", "CARD", "EMI", "NETBANKING", "WALLET", "COD"])),
    upiVpa: z.string().optional(),
    cardLast4: z.string().optional(),
    deliverySpeed: z.record(z.string(), z.enum(["standard", "express"])).optional(),
    gstInvoice: z.object({
      gstin: z.string(),
      businessName: z.string(),
    }).optional()
  }),
});

import { Request, Response, NextFunction } from "express";
import { prisma } from "../server";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PaymentMethod, PaymentStatus, ProductStatus, SellerStatus, ShipmentStatus } from "@prisma/client";
import { PaymentService } from "../services/payment.service";
import { SocketService } from "../services/socket.service";
import crypto from "crypto";

// @ts-nocheck
export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId, couponCode, paymentMethod, upiVpa, cardLast4, deliverySpeed, gstInvoice, lines, address: inputAddress } = req.body;
    const userId = req.user!.userId;

    const customer = await prisma.customer.findUnique({
      where: { userId },
      include: { addresses: true }
    });

    if (!customer) throw new ApiError(404, "Customer not found");

    let address = customer.addresses.find(a => a.id === addressId);
    if (!address) {
      if (inputAddress) {
        address = await prisma.address.create({
          data: {
            customerId: customer.id,
            name: inputAddress.name || customer.name || "Customer",
            phone: inputAddress.phone || customer.phone || "9876543210",
            line1: inputAddress.line1 || "123 Main St",
            line2: inputAddress.line2 || "",
            city: inputAddress.city || "Bengaluru",
            state: inputAddress.state || "Karnataka",
            stateCode: inputAddress.stateCode || "KA",
            pin: inputAddress.pin || "560001",
            type: inputAddress.type || "home",
          }
        });
      } else if (customer.addresses.length > 0) {
        address = customer.addresses[0];
      } else {
        address = await prisma.address.create({
          data: {
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone,
            line1: "123 Main St",
            city: "Bengaluru",
            state: "Karnataka",
            stateCode: "KA",
            pin: "560001",
            type: "home"
          }
        });
      }
    }

    let cartItems = await prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: { include: { seller: true, category: true } },
        variant: true,
        seller: true
      }
    });

    if (cartItems.length === 0 && lines && Array.isArray(lines) && lines.length > 0) {
      const resolvedItems: any[] = [];
      for (const line of lines) {
        const product = await prisma.product.findFirst({
          where: { OR: [{ id: line.productId }, { slug: line.productId }] },
          include: { seller: true, category: true, variants: true }
        });
        if (!product) continue;
        let variant = product.variants.find(v => v.id === line.variantId || v.sku === line.variantId);
        if (!variant && product.variants.length > 0) {
          variant = product.variants[0];
        }
        if (!variant) continue;
        resolvedItems.push({
          productId: product.id,
          variantId: variant.id,
          sellerId: product.sellerId,
          qty: Number(line.qty) || 1,
          product,
          variant,
          seller: product.seller
        });
      }
      cartItems = resolvedItems;
    }

    if (cartItems.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    // 1. Authoritative Calculations & Validations
    let totalMrp = 0;
    let totalPrice = 0;
    let totalShipping = 0;
    let totalDiscount = 0;

    const groupsBySeller = new Map<string, typeof cartItems>();
    for (const item of cartItems) {
      if (item.product.status !== ProductStatus.LIVE) {
        throw new ApiError(400, `Product ${item.product.title} is no longer available.`);
      }
      if (item.seller.status !== SellerStatus.ACTIVE) {
        throw new ApiError(400, `Seller for ${item.product.title} is inactive.`);
      }
      if (!item.variant.active) {
        throw new ApiError(400, `Variant for ${item.product.title} is inactive.`);
      }
      if (item.variant.stock < item.qty) {
        throw new ApiError(400, `Insufficient stock for ${item.product.title}`);
      }

      totalMrp += item.variant.mrp * item.qty;
      totalPrice += item.variant.price * item.qty;

      const group = groupsBySeller.get(item.sellerId) || [];
      group.push(item);
      groupsBySeller.set(item.sellerId, group);
    }

    totalDiscount = totalMrp - totalPrice;

    const platformSettings = await prisma.platformSettings.findFirst();
    const deliveryFee = platformSettings?.deliveryFee || 50;
    const expressFee = platformSettings?.expressFee || 100;
    const codLimit = platformSettings?.codLimit || 5000;
    const codFee = platformSettings?.codFee || 50;

    // Shipping calculations
    groupsBySeller.forEach((items, sellerId) => {
      const isExpress = deliverySpeed?.[sellerId] === 'express';
      totalShipping += isExpress ? expressFee : deliveryFee;
    });

    if (paymentMethod === PaymentMethod.COD && (totalPrice + totalShipping) > codLimit) {
       throw new ApiError(400, `COD is not available for orders above ${codLimit}`);
    }

    let finalTotal = totalPrice + totalShipping;
    if (paymentMethod === PaymentMethod.COD) {
      finalTotal += codFee;
    }

    // Coupon (simplified for this demo)
    let appliedCouponDiscount = 0;
    if (couponCode) {
      // Find coupon (mocking 10% flat off for valid coupons for this demo logic)
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && !coupon.paused && finalTotal >= coupon.minOrder) {
         appliedCouponDiscount = coupon.kind === 'PERCENT' ? (totalPrice * coupon.value / 100) : coupon.value;
         if (coupon.maxDiscount) {
           appliedCouponDiscount = Math.min(appliedCouponDiscount, coupon.maxDiscount);
         }
         finalTotal -= appliedCouponDiscount;
      } else {
         throw new ApiError(400, "Invalid or expired coupon");
      }
    }

    const normPaymentMethod = ((paymentMethod || 'UPI') as string).toUpperCase() as PaymentMethod;

    // Process Payment
    const paymentResult = await PaymentService.processPayment(normPaymentMethod, finalTotal, { cardLast4, upiVpa });
    
    if (paymentResult.status === PaymentStatus.FAILED) {
      throw new ApiError(402, `Payment Failed: ${paymentResult.failReason}`);
    }

    // 2. Database Transaction for Order Creation & Stock Update
    const orderId = req.body.orderId || `ORD-${crypto.randomInt(100000, 999999)}`;

    await prisma.$transaction(async (tx) => {
      // Decrement stock concurrently safely
      for (const item of cartItems) {
        const variant = await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.qty } }
        });
        if (variant.stock < 0) {
           throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      // Create Parent Order
      const order = await tx.order.create({
        data: {
          id: orderId,
          customerId: customer.id,
          shipTo: address,
          billing: gstInvoice || null,
          paymentMethod: normPaymentMethod,
          paymentStatus: paymentResult.status,
          paymentAmount: finalTotal,
          paymentTxnRef: paymentResult.txnId,
          paymentPaidAt: paymentResult.status === PaymentStatus.PAID ? new Date() : null,
          couponCode,
          totals: {
            mrp: totalMrp,
            discount: totalDiscount,
            shipping: totalShipping,
            codFee: paymentMethod === PaymentMethod.COD ? codFee : 0,
            coupon: appliedCouponDiscount,
            total: finalTotal
          }
        }
      });

      // Create Sub-orders (Shipments) and OrderItems
      let shipmentIndex = 1;
      for (const [sellerId, items] of Array.from(groupsBySeller.entries())) {
        const shipmentId = `${orderId}-${shipmentIndex++}`;
        const isExpress = deliverySpeed?.[sellerId] === 'express';
        
        // Mock SLA logic
        const dispatchDays = items.reduce((max, item) => Math.max(max, item.product.dispatchDays), 1);
        const slaDueAt = new Date();
        slaDueAt.setDate(slaDueAt.getDate() + dispatchDays);
        const promisedBy = new Date();
        promisedBy.setDate(promisedBy.getDate() + dispatchDays + (isExpress ? 2 : 5));

        const shipmentMrp = items.reduce((sum, item) => sum + (item.variant.mrp * item.qty), 0);
        const shipmentPrice = items.reduce((sum, item) => sum + (item.variant.price * item.qty), 0);
        const shippingFee = isExpress ? expressFee : deliveryFee;

        await tx.shipment.create({
          data: {
            id: shipmentId,
            orderId: order.id,
            sellerId,
            slaDueAt,
            promisedBy,
            status: paymentResult.status === PaymentStatus.PAID || paymentResult.status === PaymentStatus.COD_PENDING ? ShipmentStatus.CONFIRMED : ShipmentStatus.PLACED,
            events: [{ status: 'PLACED', at: new Date() }],
            totals: {
              mrp: shipmentMrp,
              price: shipmentPrice,
              shipping: shippingFee,
              coupon: 0, // Simplified: parent order has coupon
              total: shipmentPrice + shippingFee
            },
            items: {
              create: items.map(item => ({
                orderId: order.id,
                sellerId: item.sellerId,
                productId: item.productId,
                variantId: item.variantId,
                title: item.product.title,
                variantLabel: Object.values(item.variant.options as Record<string, string>).filter(Boolean).join(' - ') || 'Standard',
                image: item.product.cover || (Array.isArray(item.product.media) ? item.product.media[0] : item.product.media) || {},
                qty: item.qty,
                mrp: item.variant.mrp,
                price: item.variant.price,
                gstRate: item.product.gstRate,
                hsn: item.product.hsn
              }))
            }
          }
        });
      }

      // Clear Cart
      await tx.cartItem.deleteMany({
        where: { customerId: customer.id }
      });
    });
    
    // Emit events after transaction
    for (const sellerId of groupsBySeller.keys()) {
      SocketService.emitToSeller(sellerId, 'order_received', { orderId });
      SocketService.emitToSeller(sellerId, 'inventory_updated', {});
    }
    SocketService.emitToAdmin('order_received', { orderId });

    res.json(ApiResponse.success({ orderId, status: paymentResult.status }, "Order placed successfully"));
  } catch (error: any) {
    // If the error message mentions Insufficient stock (from transaction), format it
    if (error.message && error.message.includes("Insufficient stock")) {
       return next(new ApiError(400, "One or more items went out of stock during checkout. Please try again."));
    }
    next(error);
  }
};

export const getCustomerOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        shipments: {
          include: {
            items: true,
            seller: true,
            returnReqs: true
          }
        }
      },
      orderBy: { placedAt: 'desc' }
    });

    const formattedOrders = orders.map(order => {
      const shipmentsView = order.shipments.map(shipment => {
        const window = 7; // Mock 7 days
        const deliveredDays = shipment.deliveredAt ? Math.floor((new Date().getTime() - new Date(shipment.deliveredAt).getTime()) / 86400000) : Infinity;
        return {
          shipment,
          seller: shipment.seller,
          items: shipment.items,
          return: shipment.returnReqs[0],
          canCancel: shipment.status === 'PLACED' || shipment.status === 'CONFIRMED',
          canReturn: shipment.status === 'DELIVERED' && !shipment.returnId && window > 0 && deliveredDays <= window,
          returnWindowDays: Number.isFinite(deliveredDays) ? Math.max(0, window - deliveredDays) : window,
        };
      });

      return {
        order,
        shipments: shipmentsView,
        items: shipmentsView.flatMap(s => s.items),
        summary: { label: `${shipmentsView.length} shipment(s)`, tone: 'neutral' },
        sellers: shipmentsView.map(s => s.seller).filter(Boolean),
        units: shipmentsView.reduce((sum, s) => sum + s.items.reduce((count, item) => count + item.qty, 0), 0)
      };
    });

    res.json(ApiResponse.success(formattedOrders));
  } catch (error) {
    next(error);
  }
};

export const getCustomerOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const order = await prisma.order.findUnique({
      where: { id: req.params.id, customerId: customer.id },
      include: {
        shipments: {
          include: {
            items: true,
            seller: true,
            returnReqs: true
          }
        }
      }
    });

    if (!order) throw new ApiError(404, "Order not found");

    const shipmentsView = order.shipments.map(shipment => {
      const window = 7; // Mock 7 days
      const deliveredDays = shipment.deliveredAt ? Math.floor((new Date().getTime() - new Date(shipment.deliveredAt).getTime()) / 86400000) : Infinity;
      return {
        shipment,
        seller: shipment.seller,
        items: shipment.items,
        return: shipment.returnReqs[0],
        canCancel: shipment.status === 'PLACED' || shipment.status === 'CONFIRMED',
        canReturn: shipment.status === 'DELIVERED' && !shipment.returnId && window > 0 && deliveredDays <= window,
        returnWindowDays: Number.isFinite(deliveredDays) ? Math.max(0, window - deliveredDays) : window,
      };
    });

    const formattedOrder = {
      order,
      shipments: shipmentsView,
      items: shipmentsView.flatMap(s => s.items),
      summary: { label: `${shipmentsView.length} shipment(s)`, tone: 'neutral' },
      sellers: shipmentsView.map(s => s.seller).filter(Boolean),
      units: shipmentsView.reduce((sum, s) => sum + s.items.reduce((count, item) => count + item.qty, 0), 0)
    };

    res.json(ApiResponse.success(formattedOrder));
  } catch (error) {
    next(error);
  }
};

import { getStripeSync } from './stripeClient';
import { db } from './db';
import { invoices } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handlePaymentSuccess(paymentIntentId: string, invoiceId: number): Promise<void> {
    const [invoice] = await db.select().from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      console.error(`Invoice ${invoiceId} not found for payment ${paymentIntentId}`);
      return;
    }

    await db.update(invoices)
      .set({
        status: 'paid',
        paidAmount: invoice.total,
        paidDate: new Date(),
        paymentMethod: 'card',
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    console.log(`Invoice ${invoice.invoiceNumber} marked as paid via Stripe`);
  }
}

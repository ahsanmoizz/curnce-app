import { PrismaService } from "../../prisma.service";
import * as paypal from "@paypal/checkout-server-sdk";
import { paypalClient } from "./paypal.client";

export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /* ---------------- PLAN ---------------- */
  async createPlan(
    name: string,
    price: number,
    interval: "month" | "year",
    currency: "USD" | "INR" = "USD"
  ) {
    return this.prisma.plan.create({
      data: { name, price, interval, currency },
    });
  }

  async listPlans() {
    return this.prisma.plan.findMany({ orderBy: { createdAt: "desc" } });
  }

  /* ---------------- PAYPAL CHECKOUT ---------------- */
  async createPayPalOrder(tenantId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plan not found");

    const client = paypalClient();

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: plan.currency,
            value: plan.price.toFixed(2),
          },
          description: `${plan.name} (${plan.interval})`,
          custom_id: JSON.stringify({ tenantId, planId }),
        },
      ],
   application_context: {
  return_url: `${process.env.FRONTEND_URL}/tenant/billing?success=true`,
  cancel_url: `${process.env.FRONTEND_URL}/tenant/billing?canceled=true`,
},
    });

    const resp = await client.execute(request);
    const order = resp.result as any;

    const approval = order.links.find((l: any) => l.rel === "approve");
    return { orderId: order.id, approvalUrl: approval?.href };
  }

  async capturePayPalOrder(orderId: string) {
    const client = paypalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const resp = await client.execute(request);
    const capture = resp.result as any;

    const pu = capture.purchase_units?.[0];
    if (!pu) throw new Error("Invalid PayPal response");

    const custom = pu.custom_id;
    if (!custom) throw new Error("Missing custom_id");

    const { tenantId, planId } = JSON.parse(custom);

    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // ✅ Upsert subscription
    const existing = await this.prisma.subscription.findFirst({ where: { tenantId } });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: "active", renewalDate, planId },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          tenantId,
          planId,
          status: "active",
          renewalDate,
        },
      });
    }

    // ✅ Update tenant limits / trialEndsAt
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { trialEndsAt: renewalDate, status: "active" as any },
    });

    return { ok: true, tenantId, planId, renewalDate };
  }

  /* ---------------- BILLING ---------------- */
  async myBilling(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!tenant) throw new Error("Tenant not found");

    return {
      trialEndsAt: tenant.trialEndsAt,
      subscription: tenant.subscriptions[0] || null,
    };
  }

  /* ---------------- SUPERADMIN: TENANTS ---------------- */
  async listTenantsWithBilling() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        users: { where: { role: "OWNER" }, take: 1 },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      owner: t.users[0]
        ? { id: t.users[0].id, email: t.users[0].email, name: t.users[0].name }
        : null,
      plan: t.subscriptions[0]?.plan || null,
      subscription: t.subscriptions[0] || null,
      trialEndsAt: t.trialEndsAt,
      status: t.status,
    }));
  }

  async tenantDetails(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      },
    });
  }
}

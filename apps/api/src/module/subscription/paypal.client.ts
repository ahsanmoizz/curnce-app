import * as paypal from "@paypal/checkout-server-sdk";

export function paypalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const env =
    (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(env);
}

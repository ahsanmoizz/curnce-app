declare module "@paypal/checkout-server-sdk" {
  namespace paypal {
    namespace core {
      class SandboxEnvironment {
        constructor(clientId: string, clientSecret: string);
      }
      class LiveEnvironment {
        constructor(clientId: string, clientSecret: string);
      }
      class PayPalHttpClient {
        constructor(environment: any);
        execute(request: any): Promise<any>;
      }
    }

    namespace orders {
      class OrdersCreateRequest {
        constructor();
        prefer(preference: string): void;
        requestBody(body: any): void;
      }
      class OrdersCaptureRequest {
        constructor(orderId: string);
        requestBody(body: any): void;
      }
    }
  }
  export = paypal;
}

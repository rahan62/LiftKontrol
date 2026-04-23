import "server-only";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import type { MarketingPricingContent } from "@/lib/data/marketing-pricing";
import { formatIyzicoMoney, parseTryDisplayPriceToNumber } from "@/lib/payments/parse-try-price";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports -- iyzipay CommonJS
const Iyzipay = require("iyzipay") as IyzipayModule;

type IyzipayModule = IyzipayCtor & {
  LOCALE: { TR: string; EN: string };
  CURRENCY: { TRY: string };
  PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string };
  BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };
};

type IyzipayCtor = new (config: { apiKey: string; secretKey: string; uri: string }) => IyzipayInstance;

type IyzipayInstance = {
  checkoutFormInitialize: {
    create: (
      request: Record<string, unknown>,
      cb: (err: Error | null, result: CheckoutFormInitializeResult) => void,
    ) => void;
  };
  checkoutForm: {
    retrieve: (
      request: { locale: string; conversationId: string; token: string },
      cb: (err: Error | null, result: CheckoutFormRetrieveResult) => void,
    ) => void;
  };
};

export type CheckoutFormInitializeResult = {
  status: string;
  locale?: string;
  systemTime?: number;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  tokenExpireTime?: number;
  paymentPageUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  errorGroup?: string;
};

export type CheckoutFormRetrieveResult = {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  conversationId?: string;
  price?: string;
  paidPrice?: string;
  currency?: string;
  fraudStatus?: number;
  errorCode?: string;
  errorMessage?: string;
};

export function isIyzicoConfigured(): boolean {
  const uri = process.env.IYZIPAY_URI?.trim();
  const key = process.env.IYZIPAY_API_KEY?.trim();
  const secret = process.env.IYZIPAY_SECRET_KEY?.trim();
  return Boolean(uri && key && secret);
}

function getClient(): IyzipayInstance {
  const uri = process.env.IYZIPAY_URI?.trim();
  const apiKey = process.env.IYZIPAY_API_KEY?.trim();
  const secretKey = process.env.IYZIPAY_SECRET_KEY?.trim();
  if (!uri || !apiKey || !secretKey) {
    throw new Error("iyzico yapılandırması eksik (IYZIPAY_URI, IYZIPAY_API_KEY, IYZIPAY_SECRET_KEY).");
  }
  return new Iyzipay({ uri, apiKey, secretKey });
}

export type BuyerCheckoutInput = {
  name: string;
  surname: string;
  email: string;
  gsmNumber: string;
  identityNumber: string;
  registrationAddress: string;
  city: string;
  zipCode: string;
  country?: string;
};

function getVatMultiplier(): number {
  const raw = process.env.IYZICO_VAT_RATE?.trim();
  const rate = raw ? parseFloat(raw) : 0.2;
  return Number.isFinite(rate) && rate >= 0 ? 1 + rate : 1.2;
}

/** Fiyatlandırma sayfası / ödeme önizlemesi ile aynı tutar. */
export function computeLiftKontrolChargeTry(pricing: MarketingPricingContent): {
  paid: number;
  includesVat: boolean;
} {
  const base = parseTryDisplayPriceToNumber(pricing.priceMain);
  const includesVat =
    process.env.IYZICO_PRICE_INCLUDES_VAT === "1" || process.env.IYZICO_PRICE_INCLUDES_VAT === "true";
  const paid = includesVat ? base : base * getVatMultiplier();
  return { paid, includesVat };
}

function appBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return u.replace(/\/+$/, "");
}

export async function iyzicoCheckoutFormInitialize(params: {
  pricing: MarketingPricingContent;
  buyer: BuyerCheckoutInput;
  clientIp: string;
}): Promise<CheckoutFormInitializeResult> {
  const client = getClient();
  const { paid } = computeLiftKontrolChargeTry(params.pricing);
  if (paid <= 0) {
    return {
      status: "failure",
      errorMessage: "Geçersiz ürün fiyatı. Yönetim panelinden fiyatı kontrol edin.",
    };
  }

  const priceStr = formatIyzicoMoney(paid);
  const conversationId = randomUUID();
  const basketId = `lk-${conversationId.slice(0, 8)}`;
  const buyerId = `guest-${conversationId.slice(0, 12)}`;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const buyer = {
    id: buyerId,
    name: params.buyer.name.slice(0, 64),
    surname: params.buyer.surname.slice(0, 64),
    gsmNumber: normalizeGsm(params.buyer.gsmNumber),
    email: params.buyer.email.slice(0, 128),
    identityNumber: params.buyer.identityNumber.replace(/\D/g, "").slice(0, 11),
    registrationAddress: params.buyer.registrationAddress.slice(0, 256),
    ip: params.clientIp || "127.0.0.1",
    city: params.buyer.city.slice(0, 64),
    country: (params.buyer.country || "Turkey").slice(0, 64),
    zipCode: params.buyer.zipCode.replace(/\D/g, "").slice(0, 10) || "34000",
    registrationDate: now,
    lastLoginDate: now,
  };

  const addr = {
    contactName: `${buyer.name} ${buyer.surname}`.slice(0, 128),
    city: buyer.city,
    country: buyer.country,
    address: buyer.registrationAddress,
    zipCode: buyer.zipCode,
  };

  const basketItems = [
    {
      id: "liftkontrol-yearly",
      name: params.pricing.packageTitle.slice(0, 128),
      category1: "Yazılım",
      category2: "Abonelik",
      itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
      price: priceStr,
    },
  ];

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    price: priceStr,
    paidPrice: priceStr,
    currency: Iyzipay.CURRENCY.TRY,
    basketId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: `${appBaseUrl()}/api/iyzico/callback`,
    enabledInstallments: [1],
    buyer,
    shippingAddress: addr,
    billingAddress: addr,
    basketItems,
  };

  return new Promise((resolve, reject) => {
    client.checkoutFormInitialize.create(request, (err: Error | null, result: CheckoutFormInitializeResult) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export async function iyzicoCheckoutFormRetrieve(token: string): Promise<CheckoutFormRetrieveResult> {
  const client = getClient();
  const conversationId = randomUUID();
  return new Promise((resolve, reject) => {
    client.checkoutForm.retrieve(
      { locale: Iyzipay.LOCALE.TR, conversationId, token },
      (err: Error | null, result: CheckoutFormRetrieveResult) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      },
    );
  });
}

function normalizeGsm(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("90")) d = `90${d}`;
  return `+${d}`;
}

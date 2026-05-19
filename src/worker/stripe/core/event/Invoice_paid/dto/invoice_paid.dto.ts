import { z } from "zod";

// ── Shared primitives ──────────────────────────────────────────────────────────

const NullableString = z.string().nullable();
const NullableNumber = z.number().nullable();

// ── Nested schemas ─────────────────────────────────────────────────────────────

const AutomaticTaxSchema = z.object({
  disabled_reason: NullableString,
  enabled: z.boolean(),
  liability: z.null(),
  provider: NullableString,
  status: NullableString,
});

const IssuerSchema = z.object({
  type: z.literal("self"),
});

const PeriodSchema = z.object({
  end: z.number().int(),
  start: z.number().int(),
});

const CreditedItemsSchema = z.null();

const ProrationDetailsSchema = z.object({
  credited_items: CreditedItemsSchema,
});

const SubscriptionItemDetailsSchema = z.object({
  invoice_item: z.null(),
  proration: z.boolean(),
  proration_details: ProrationDetailsSchema,
  subscription: z.string(),
  subscription_item: z.string(),
});

const LineItemParentSchema = z.object({
  invoice_item_details: z.null(),
  subscription_item_details: SubscriptionItemDetailsSchema,
  type: z.literal("subscription_item_details"),
});

const PriceDetailsSchema = z.object({
  price: z.string(),
  product: z.string(),
});

const PricingSchema = z.object({
  price_details: PriceDetailsSchema,
  type: z.literal("price_details"),
  unit_amount_decimal: z.string(),
});

const LineItemSchema = z.object({
  id: z.string(),
  object: z.literal("line_item"),
  amount: z.number().int(),
  currency: z.string(),
  description: z.string(),
  discount_amounts: z.array(z.unknown()),
  discountable: z.boolean(),
  discounts: z.array(z.unknown()),
  invoice: z.string(),
  livemode: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  parent: LineItemParentSchema,
  period: PeriodSchema,
  pretax_credit_amounts: z.array(z.unknown()),
  pricing: PricingSchema,
  quantity: z.number().int(),
  quantity_decimal: z.string(),
  subtotal: z.number().int(),
  taxes: z.array(z.unknown()),
});

const LinesSchema = z.object({
  object: z.literal("list"),
  data: z.array(LineItemSchema),
  has_more: z.boolean(),
  total_count: z.number().int(),
  url: z.string(),
});

const CardPaymentMethodOptionsSchema = z.object({
  request_three_d_secure: z.string(),
});

const PaymentMethodOptionsSchema = z.object({
  acss_debit: z.null(),
  bancontact: z.null(),
  card: CardPaymentMethodOptionsSchema,
  customer_balance: z.null(),
  konbini: z.null(),
  payto: z.null(),
  pix: z.null(),
  sepa_debit: z.null(),
  upi: z.null(),
  us_bank_account: z.null(),
});

const PaymentSettingsSchema = z.object({
  default_mandate: z.null(),
  payment_method_options: PaymentMethodOptionsSchema,
  payment_method_types: z.null(),
});

const StatusTransitionsSchema = z.object({
  finalized_at: NullableNumber,
  marked_uncollectible_at: NullableNumber,
  paid_at: NullableNumber,
  voided_at: NullableNumber,
});

const SubscriptionDetailsSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
  subscription: z.string(),
});

const InvoiceParentSchema = z.object({
  quote_details: z.null(),
  subscription_details: SubscriptionDetailsSchema,
  type: z.literal("subscription_details"),
});

// ── Invoice ────────────────────────────────────────────────────────────────────

const InvoiceSchema = z.object({
  id: z.string(),
  object: z.literal("invoice"),
  account_country: NullableString,
  account_name: NullableString,
  account_tax_ids: z.null(),
  amount_due: z.number().int(),
  amount_overpaid: z.number().int(),
  amount_paid: z.number().int(),
  amount_remaining: z.number().int(),
  amount_shipping: z.number().int(),
  application: z.null(),
  attempt_count: z.number().int(),
  attempted: z.boolean(),
  auto_advance: z.boolean(),
  automatic_tax: AutomaticTaxSchema,
  automatically_finalizes_at: NullableNumber,
  billing_reason: z.string(),
  collection_method: z.string(),
  created: z.number().int(),
  currency: z.string(),
  custom_fields: z.null(),
  customer: z.string(),
  customer_account: z.null(),
  customer_address: z.null(),
  customer_email: z.string().email().nullable(),
  customer_name: NullableString,
  customer_phone: NullableString,
  customer_shipping: z.null(),
  customer_tax_exempt: z.string(),
  customer_tax_ids: z.array(z.unknown()),
  default_payment_method: z.null(),
  default_source: z.null(),
  default_tax_rates: z.array(z.unknown()),
  description: NullableString,
  discounts: z.array(z.unknown()),
  due_date: NullableNumber,
  effective_at: NullableNumber,
  ending_balance: z.number().int(),
  footer: NullableString,
  from_invoice: z.null(),
  hosted_invoice_url: z.string().url().nullable(),
  invoice_pdf: z.string().url().nullable(),
  issuer: IssuerSchema,
  last_finalization_error: z.null(),
  latest_revision: z.null(),
  lines: LinesSchema,
  livemode: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  next_payment_attempt: NullableNumber,
  number: NullableString,
  on_behalf_of: z.null(),
  parent: InvoiceParentSchema,
  payment_settings: PaymentSettingsSchema,
  period_end: z.number().int(),
  period_start: z.number().int(),
  post_payment_credit_notes_amount: z.number().int(),
  pre_payment_credit_notes_amount: z.number().int(),
  receipt_number: NullableString,
  rendering: z.null(),
  shipping_cost: z.null(),
  shipping_details: z.null(),
  starting_balance: z.number().int(),
  statement_descriptor: NullableString,
  status: z.enum(["draft", "open", "paid", "uncollectible", "void"]),
  status_transitions: StatusTransitionsSchema,
  subtotal: z.number().int(),
  subtotal_excluding_tax: NullableNumber,
  test_clock: z.null(),
  total: z.number().int(),
  total_discount_amounts: z.array(z.unknown()),
  total_excluding_tax: NullableNumber,
  total_pretax_credit_amounts: z.array(z.unknown()),
  total_taxes: z.array(z.unknown()),
  webhooks_delivered_at: NullableNumber,
});

// ── Top-level event ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  id: NullableString,
  idempotency_key: NullableString,
});

const InvoicePaidEventSchema = z.object({
  id: z.string(),
  object: z.literal("event"),
  api_version: z.string(),
  created: z.number().int(),
  data: z.object({
    object: InvoiceSchema,
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number().int(),
  request: RequestSchema,
  type: z.literal("invoice.paid"),
});

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoicePaidEvent = z.infer<typeof InvoicePaidEventSchema>;

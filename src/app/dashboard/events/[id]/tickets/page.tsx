import { Ticket as TicketIcon, ShoppingCart, DollarSign, Tag } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { StatCard, Progress, EmptyState } from "@/components/ui/misc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { formatMoney, pct } from "@/lib/utils";
import { TICKET_TYPES, labelOf } from "@/lib/constants";
import { createTicket, updateTicket, deleteTicket, createCoupon, updateCoupon, deleteCoupon } from "../manage-actions";

const TYPE_TONE: Record<string, "neutral" | "primary" | "success" | "info"> = {
  FREE: "success",
  PAID: "primary",
  VIP: "info",
  GROUP: "neutral",
};

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id); // authorize: 404s if the current org doesn't own this event

  const [tickets, coupons] = await Promise.all([
    db.ticket.findMany({ where: { eventId: id }, orderBy: { priceCents: "asc" } }),
    db.coupon.findMany({ where: { eventId: id } }),
  ]);

  const totalSold = tickets.reduce((sum, t) => sum + t.sold, 0);
  const grossPotential = tickets.reduce(
    (sum, t) => sum + t.priceCents * (t.quantity ?? t.sold),
    0
  );

  const ticketFields = (t?: (typeof tickets)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Name">
        <Input name="name" placeholder="General Admission" defaultValue={t?.name ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="type" defaultValue={t?.type ?? "PAID"}>
            {Object.entries(TICKET_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Price (USD)" hint="Ignored for free tickets.">
          <Input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="499"
            defaultValue={t && t.priceCents > 0 ? (t.priceCents / 100).toString() : ""}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity" hint="Blank = unlimited.">
          <Input
            name="quantity"
            type="number"
            min="0"
            placeholder="400"
            defaultValue={t?.quantity != null ? String(t.quantity) : ""}
          />
        </Field>
        <label className="flex items-center gap-2 pt-8 text-sm">
          <input
            type="checkbox"
            name="earlyBird"
            defaultChecked={t?.earlyBird ?? false}
            className="size-4 accent-[hsl(243_75%_59%)]"
          />{" "}
          Early-bird pricing
        </label>
      </div>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={t?.description ?? ""} placeholder="What's included with this ticket." />
      </Field>
      {t && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={t.isActive} className="size-4 accent-[hsl(243_75%_59%)]" />{" "}
          Active (available for registration)
        </label>
      )}
    </>
  );

  const newTicketDialog = (
    <FormDialog
      buttonLabel="New ticket type"
      title="New ticket type"
      description="Add a ticket attendees can register with."
      action={createTicket}
      submitLabel="Create ticket"
    >
      {ticketFields()}
    </FormDialog>
  );

  const couponFields = (c?: (typeof coupons)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Code" hint="Attendees enter this at checkout.">
        <Input name="code" placeholder="EARLY25" className="uppercase" defaultValue={c?.code ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Discount type">
          <Select name="kind" defaultValue={c ? (c.percentOff != null ? "PERCENT" : "AMOUNT") : "PERCENT"}>
            <option value="PERCENT">Percentage off</option>
            <option value="AMOUNT">Fixed amount off (USD)</option>
          </Select>
        </Field>
        <Field label="Value" hint="e.g. 25 for 25% or $25.">
          <Input
            name="value"
            type="number"
            min="0"
            step="0.01"
            placeholder="25"
            defaultValue={c ? (c.percentOff != null ? String(c.percentOff) : c.amountOffCents != null ? String(c.amountOffCents / 100) : "") : ""}
            required
          />
        </Field>
      </div>
      <Field label="Max redemptions" hint="Blank = unlimited.">
        <Input name="maxRedemptions" type="number" min="0" placeholder="100" defaultValue={c?.maxRedemptions != null ? String(c.maxRedemptions) : ""} />
      </Field>
      {c && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={c.isActive} className="size-4 accent-[hsl(243_75%_59%)]" /> Active
        </label>
      )}
    </>
  );

  const newCouponDialog = (
    <FormDialog
      buttonLabel="New coupon"
      title="New coupon"
      description="Create a discount code for checkout."
      action={createCoupon}
      submitLabel="Create coupon"
      buttonSize="sm"
    >
      {couponFields()}
    </FormDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tickets &amp; pricing</h2>
          <p className="text-sm text-muted-foreground">
            Manage ticket types, pricing, and discount codes.
          </p>
        </div>
        {newTicketDialog}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ticket types" value={tickets.length} icon={<TicketIcon />} />
        <StatCard
          label="Total sold"
          value={totalSold}
          icon={<ShoppingCart />}
          tone="success"
        />
        <StatCard
          label="Gross potential"
          value={formatMoney(grossPotential)}
          icon={<DollarSign />}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket types</CardTitle>
          <CardDescription>{tickets.length} configured for this event.</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <EmptyState
              icon={<TicketIcon />}
              title="No ticket types yet"
              description="Create your first ticket type to start selling registrations."
              action={
                <FormDialog
                  buttonLabel="New ticket type"
                  title="New ticket type"
                  description="Add a ticket attendees can register with."
                  action={createTicket}
                  submitLabel="Create ticket"
                >
                  {ticketFields()}
                </FormDialog>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Price</TH>
                  <TH className="w-48">Sold</TH>
                  <TH>Early bird</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {tickets.map((t) => {
                  const fill = t.quantity ? pct(t.sold, t.quantity) : 0;
                  return (
                    <TR key={t.id}>
                      <TD className="font-medium">{t.name}</TD>
                      <TD>
                        <Badge tone={TYPE_TONE[t.type] ?? "neutral"}>
                          {labelOf(TICKET_TYPES, t.type)}
                        </Badge>
                      </TD>
                      <TD>{formatMoney(t.priceCents, t.currency)}</TD>
                      <TD>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {t.sold}
                            {t.quantity != null ? ` / ${t.quantity}` : ""}
                          </span>
                        </div>
                        {t.quantity != null && <Progress value={fill} className="mt-1" />}
                      </TD>
                      <TD>
                        {t.earlyBird ? (
                          <Badge tone="info">
                            {t.earlyBirdPriceCents != null
                              ? formatMoney(t.earlyBirdPriceCents, t.currency)
                              : "Yes"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={t.isActive ? "success" : "neutral"}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <FormDialog
                            mode="edit"
                            buttonLabel={`Edit ${t.name}`}
                            title="Edit ticket"
                            description="Update this ticket type."
                            action={updateTicket}
                            submitLabel="Save changes"
                          >
                            {ticketFields(t)}
                          </FormDialog>
                          <DeleteButton
                            action={deleteTicket}
                            id={t.id}
                            eventId={id}
                            confirmText={`Delete "${t.name}"? This can't be undone.`}
                          />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-4 text-primary" /> Coupons
            </CardTitle>
            <CardDescription>Discount codes attendees can apply at checkout.</CardDescription>
          </div>
          {coupons.length > 0 && newCouponDialog}
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <EmptyState
              icon={<Tag />}
              title="No coupons yet"
              description="Create promo codes to run early-bird or partner discounts."
              action={newCouponDialog}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Discount</TH>
                  <TH>Redemptions</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {coupons.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-mono text-sm font-medium uppercase">{c.code}</TD>
                    <TD>
                      {c.percentOff != null
                        ? `${c.percentOff}% off`
                        : c.amountOffCents != null
                          ? `${formatMoney(c.amountOffCents)} off`
                          : "—"}
                    </TD>
                    <TD className="tabular-nums">
                      {c.redemptions}
                      {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                    </TD>
                    <TD>
                      <Badge tone={c.isActive ? "success" : "neutral"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <FormDialog
                          mode="edit"
                          buttonLabel={`Edit ${c.code}`}
                          title="Edit coupon"
                          description="Update this discount code."
                          action={updateCoupon}
                          submitLabel="Save changes"
                        >
                          {couponFields(c)}
                        </FormDialog>
                        <DeleteButton
                          action={deleteCoupon}
                          id={c.id}
                          eventId={id}
                          confirmText={`Delete coupon "${c.code}"?`}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

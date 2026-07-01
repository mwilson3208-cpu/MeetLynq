import { Ticket as TicketIcon, ShoppingCart, DollarSign, Plus, Tag } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney, pct } from "@/lib/utils";
import { TICKET_TYPES, labelOf } from "@/lib/constants";

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
  const event = await getEventOr404(id);

  const [tickets, coupons] = await Promise.all([
    db.ticket.findMany({ where: { eventId: id }, orderBy: { priceCents: "asc" } }),
    db.coupon.findMany({ where: { eventId: id } }),
  ]);

  const totalSold = tickets.reduce((sum, t) => sum + t.sold, 0);
  const grossPotential = tickets.reduce(
    (sum, t) => sum + t.priceCents * (t.quantity ?? t.sold),
    0
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
        <Button variant="primary">
          <Plus /> New ticket type
        </Button>
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
                <Button variant="primary">
                  <Plus /> New ticket type
                </Button>
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
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4 text-primary" /> Coupons
          </CardTitle>
          <CardDescription>Discount codes attendees can apply at checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <EmptyState
              icon={<Tag />}
              title="No coupons yet"
              description="Create promo codes to run early-bird or partner discounts."
              action={
                <Button variant="outline">
                  <Plus /> New coupon
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Discount</TH>
                  <TH>Redemptions</TH>
                  <TH>Status</TH>
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

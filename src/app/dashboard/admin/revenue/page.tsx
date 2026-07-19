import Link from "next/link";
import { ArrowLeft, DollarSign, RotateCcw, ReceiptText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 100;

const PAYMENT_TONES: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  SUCCEEDED: "success",
  PENDING: "warning",
  REFUNDED: "destructive",
  FAILED: "destructive",
};

export default async function AdminRevenuePage() {
  await requireAdmin();

  const [succeeded, refunded, count, payments] = await Promise.all([
    db.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    db.payment.aggregate({ _sum: { refundedCents: true } }),
    db.payment.count(),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { order: { include: { event: { include: { organization: true } } } } },
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Platform admin
      </Link>
      <PageHeader
        title="Revenue"
        description={`Every payment on the platform${count > PAGE_SIZE ? ` — showing the newest ${PAGE_SIZE}` : ""}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatMoney(succeeded._sum.amountCents ?? 0)} icon={<DollarSign />} tone="success" />
        <StatCard label="Refunded" value={formatMoney(refunded._sum.refundedCents ?? 0)} icon={<RotateCcw />} tone="warning" />
        <StatCard label="Payments" value={count} icon={<ReceiptText />} tone="info" />
      </div>

      <Card className="mt-6 min-w-0">
        <CardContent className="px-0">
          {payments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                    <TH>Buyer</TH>
                    <TH>Event</TH>
                    <TH>Workspace</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {payments.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium">{formatMoney(p.amountCents, p.currency)}</TD>
                      <TD><Badge tone={PAYMENT_TONES[p.status] ?? "neutral"}>{p.status}</Badge></TD>
                      <TD className="text-muted-foreground">{p.order.email}</TD>
                      <TD className="text-muted-foreground">{p.order.event.name}</TD>
                      <TD className="text-muted-foreground">{p.order.event.organization.name}</TD>
                      <TD className="text-muted-foreground">{formatDateTime(p.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

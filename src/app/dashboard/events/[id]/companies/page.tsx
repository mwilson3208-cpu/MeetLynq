import { Plus, Building2, Store, Search, ExternalLink } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, StatCard, EmptyState, Separator } from "@/components/ui/misc";

export default async function CompaniesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const companies = await db.company.findMany({ where: { eventId: id } });
  const withBooth = companies.filter((c) => Boolean(c.boothNumber)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Companies</h2>
          <p className="text-sm text-muted-foreground">Exhibiting and participating organizations.</p>
        </div>
        <Button>
          <Plus className="size-4" /> Add company
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Companies" value={companies.length} icon={<Building2 />} />
        <StatCard label="With a booth" value={withBooth} icon={<Store />} tone="info" />
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies" className="pl-9" />
      </div>

      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No companies yet"
          description="Add the organizations exhibiting or participating in your event."
          action={
            <Button>
              <Plus className="size-4" /> Add company
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} src={c.logoUrl} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {c.industry && <Badge tone="neutral">{c.industry}</Badge>}
                      {c.boothNumber && <Badge tone="primary">Booth {c.boothNumber}</Badge>}
                    </div>
                  </div>
                </div>

                {(c.lookingFor || c.offering) && (
                  <div className="space-y-1 text-sm">
                    {c.lookingFor && (
                      <p className="line-clamp-1">
                        <span className="text-muted-foreground">Looking for: </span>
                        {c.lookingFor}
                      </p>
                    )}
                    {c.offering && (
                      <p className="line-clamp-1">
                        <span className="text-muted-foreground">Offering: </span>
                        {c.offering}
                      </p>
                    )}
                  </div>
                )}

                {c.website && (
                  <>
                    <Separator />
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" /> Visit website
                    </a>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

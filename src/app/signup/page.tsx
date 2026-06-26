import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/auth-form";
import { signup } from "@/app/login/actions";

export const metadata: Metadata = { title: "Start free" };

const perks = [
  "Build a branded event page with no code",
  "Sell tickets and accept payments",
  "AI matchmaking and 1:1 meeting scheduling",
  "Sponsor lead capture and ROI reports",
];

export default function SignupPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Launch better events in minutes. No credit card required.
          </p>
          <div className="mt-8">
            <SignupForm action={signup} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden bg-brand-gradient lg:block">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <h2 className="text-xl font-semibold tracking-tight">Everything you need to run outcome-driven events</h2>
          <ul className="mt-6 space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

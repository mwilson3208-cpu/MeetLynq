import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/auth-form";
import { login, demoLogin } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your MeetLynq workspace.
          </p>
          <div className="mt-8">
            <LoginForm action={login} demoAction={demoLogin} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Start free
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden bg-brand-gradient lg:block">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <blockquote className="max-w-md text-2xl font-medium leading-snug tracking-tight">
            “Most events stop at attendance. MeetLynq helps us turn attendance into booked meetings,
            qualified leads, and measurable outcomes.”
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Event organizers using MeetLynq</p>
        </div>
      </div>
    </div>
  );
}

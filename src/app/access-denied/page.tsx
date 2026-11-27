import { ShieldX } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export const metadata = { title: "Access denied · Queue Up" };

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel panel-tick w-full max-w-md p-8 text-center">
        <LogoMark className="mx-auto h-10 w-10" />
        <ShieldX className="mx-auto mt-6 h-8 w-8 text-val" />
        <h1 className="heading mt-4 text-3xl">Private squad</h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          This Discord account isn&apos;t on the squad list. Queue Up is invite-only for a group of six friends. If you
          think you should be here, ask a squadmate to add your Discord ID.
        </p>
        <Link href="/login" className="btn-ghost mt-6">
          Back to login
        </Link>
      </div>
    </main>
  );
}

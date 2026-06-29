import { Link } from "react-router-dom";
import { MailIcon } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function ForgotPassword() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] px-4 py-8">
    <Card className="w-full max-w-md p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <MailIcon size={20} />
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-brand-muted">Password help</p>
      <h1 className="mt-2 text-2xl font-black text-brand-primary">Contact admin</h1>
      <p className="mt-3 text-sm leading-6 text-brand-muted">
        Email password reset is not configured yet. Please contact admin to reset your password.
      </p>
      <Link to="/login" className="mt-6 block"><Button className="w-full">Back to Login</Button></Link>
    </Card>
  </main>;
}

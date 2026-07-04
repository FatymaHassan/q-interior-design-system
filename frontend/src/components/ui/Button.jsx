export default function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-brand-primary text-white shadow-sm hover:bg-brand-primaryLight disabled:cursor-not-allowed disabled:opacity-50",
    gold: "bg-brand-gold text-white shadow-sm hover:bg-brand-primaryLight disabled:cursor-not-allowed disabled:opacity-50",
    outline: "border border-brand-border bg-white text-brand-primary hover:border-teal-200 hover:bg-brand-goldSoft disabled:cursor-not-allowed disabled:opacity-50",
    ghost: "text-brand-primary hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50",
  };
  return <button className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

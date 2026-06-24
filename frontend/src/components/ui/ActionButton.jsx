import Button from "./Button";

export default function ActionButton({ children, className = "", ...props }) {
  return <Button variant="outline" className={`min-h-9 px-3 py-1.5 text-xs ${className}`} {...props}>{children}</Button>;
}

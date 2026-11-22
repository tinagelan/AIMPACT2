import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand text-brand-ink hover:opacity-90",
    secondary: "border border-line bg-surface text-ink hover:bg-bg",
    ghost: "text-muted hover:text-ink",
    danger: "text-warn hover:bg-warn-soft",
  }[variant];
  return (
    <button
      {...props}
      className={cx("inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50", styles, className)}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("card rounded-lg border border-line bg-surface p-5 shadow-sm", className)}>{children}</div>;
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1 text-sm", className)}>
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function NumberInput({
  value,
  onValue,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: number | undefined; onValue: (v: number | undefined) => void }) {
  return (
    <input
      {...props}
      type="number"
      inputMode="decimal"
      dir="ltr"
      value={value ?? ""}
      onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
      className={cx(inputCls, "text-start", props.className)}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, props.className)} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "money" | "time" | "avoid" | "warn" | "brand" }) {
  const styles = {
    neutral: "bg-bg text-muted border-line",
    money: "bg-brand-soft text-money border-transparent",
    time: "bg-time-soft text-time border-transparent",
    avoid: "bg-avoid-soft text-avoid border-transparent",
    warn: "bg-warn-soft text-warn border-transparent",
    brand: "bg-brand text-brand-ink border-transparent",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", styles)}>{children}</span>;
}

export function Num({ children }: { children: ReactNode }) {
  return <span className="num">{children}</span>;
}

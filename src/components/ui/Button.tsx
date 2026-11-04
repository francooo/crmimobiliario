import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-[14px] text-[14px] transition-colors cursor-pointer disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white font-medium hover:bg-primary-hover disabled:bg-disabled",
  secondary: "border border-border-strong bg-surface text-ink-2 hover:bg-row-hover disabled:text-disabled",
  ghost: "bg-transparent text-muted hover:text-ink",
};

export function buttonClass(variant: Variant = "secondary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "secondary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

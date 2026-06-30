import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

const variantClasses = {
  primary: "bg-walnut text-linen hover:bg-clay",
  secondary: "border border-walnut text-walnut hover:bg-walnut/10",
} as const;

type Variant = keyof typeof variantClasses;

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-6 py-2.5 font-utility text-sm uppercase tracking-wider transition-colors";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: LinkProps & { variant?: Variant }) {
  return (
    <Link
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

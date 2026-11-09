import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

const variantClasses = {
  primary: "bg-walnut text-linen hover:bg-clay",
  secondary: "border border-walnut text-walnut hover:bg-walnut/10",
} as const;

type Variant = keyof typeof variantClasses;

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-6 py-2.5 font-utility text-sm uppercase tracking-wider transition-all duration-200 ease-out";

// A small lift and soft shadow on hover, pressed back down while clicked.
// Buttons use enabled: so a disabled submit button doesn't float.
const buttonLift =
  "enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:hover:shadow-walnut/20 enabled:active:translate-y-0 enabled:active:shadow-none";
const linkLift =
  "hover:-translate-y-0.5 hover:shadow-md hover:shadow-walnut/20 active:translate-y-0 active:shadow-none";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${baseClasses} ${buttonLift} ${variantClasses[variant]} ${className}`}
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
      className={`${baseClasses} ${linkLift} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

import { cn } from "@/utils/cn";

type BadgeVariant = "sky" | "slate" | "emerald" | "red";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  sky:     "bg-sky-900/50 text-sky-400 border-sky-800",
  slate:   "bg-slate-800 text-slate-400 border-slate-700",
  emerald: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  red:     "bg-red-900/50 text-red-400 border-red-800",
};

export default function Badge({ children, variant = "slate", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

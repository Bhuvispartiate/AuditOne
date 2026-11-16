import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#272769] text-[#E0A95C]",
        secondary:
          "border-transparent bg-[#E3E2F5] text-[#1E1E4F]",
        destructive:
          "border-transparent bg-rose-50 text-rose-700 border-rose-200",
        outline: "text-[#55557A] border-[#E6E4F0] bg-white",
        success: "border-transparent bg-[#E3E2F5] text-[#272769]",
        warning: "border-transparent bg-[#F6E4C5] text-[#6B4A12]",
        ontrack: "border-transparent bg-[#E3E2F5] text-[#272769]",
        atrisk: "border-transparent bg-[#F6E4C5] text-[#6B4A12]",
        info: "border-transparent bg-sky-50 text-sky-700",
        purple: "border-transparent bg-[#E3E2F5] text-[#272769]",
        lime: "border-transparent bg-[#F6E4C5] text-[#6B4A12]",
        gold: "border-transparent bg-[#E0A95C] text-[#1E1E4F]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };


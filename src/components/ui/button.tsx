import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#201815] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#201815] text-[#FAF8F5] shadow-xs hover:bg-[#342722] active:bg-[#1A1310]",
        destructive:
          "bg-rose-700 text-white shadow-xs hover:bg-rose-800",
        outline:
          "border border-[#E2DACD] bg-[#FAF8F5] text-[#201815] shadow-xs hover:bg-[#EFE8DC]",
        secondary:
          "bg-[#E8E0D2] text-[#201815] hover:bg-[#DDD5C7]",
        ghost: "hover:bg-[#EFE8DC] hover:text-[#201815]",
        link: "text-[#201815] underline-offset-4 hover:underline",
        navy: "bg-[#201815] text-[#FAF8F5] shadow-xs hover:bg-[#342722]",
        success: "bg-emerald-700 text-white shadow-xs hover:bg-emerald-800",
        lime: "bg-[#9A97A8] text-white shadow-xs hover:bg-[#888595]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-12 rounded-full px-8 text-sm",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };


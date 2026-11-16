import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#272769] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#272769] text-white shadow-xs hover:bg-[#1E1E4F] active:bg-[#17173e]",
        destructive:
          "bg-rose-700 text-white shadow-xs hover:bg-rose-800",
        outline:
          "border border-[#E6E4F0] bg-white text-[#1E1E4F] shadow-xs hover:bg-[#F6F5FB]",
        secondary:
          "bg-[#E3E2F5] text-[#1E1E4F] hover:bg-[#D5D3F0]",
        ghost: "hover:bg-[#F6F5FB] hover:text-[#1E1E4F]",
        link: "text-[#272769] underline-offset-4 hover:underline",
        navy: "bg-[#272769] text-white shadow-xs hover:bg-[#1E1E4F]",
        gold: "bg-[#E0A95C] text-[#1E1E4F] shadow-xs hover:bg-[#d89f4f]",
        success: "bg-emerald-700 text-white shadow-xs hover:bg-emerald-800",
        lime: "bg-[#E0A95C] text-[#1E1E4F] shadow-xs hover:bg-[#d89f4f]",
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


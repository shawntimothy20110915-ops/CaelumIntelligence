"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: { default: "h-9 px-4 py-2", sm: "h-8 px-3", lg: "h-10 px-8", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = "Button"

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-all justify-center cursor-pointer gap-2 whitespace-nowrap rounded-full text-sm font-medium disabled:pointer-events-none disabled:opacity-50 outline-none",
  {
    variants: {
      variant: { default: "bg-transparent hover:scale-105 duration-300 text-white" },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-4",
        lg: "h-10 px-6",
        xl: "h-12 px-8",
        xxl: "h-14 px-10",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "xxl" },
  }
)

function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

export function LiquidButton({
  className, variant, size, asChild = false, children, ...props
}: React.ComponentProps<"button"> & VariantProps<typeof liquidbuttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return (
    <>
      <Comp className={cn("relative", liquidbuttonVariants({ variant, size, className }))} {...props}>
        <div className="absolute top-0 left-0 z-0 h-full w-full rounded-full
          shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.3),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.3),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.08),inset_0_0_2px_2px_rgba(255,255,255,0.04),0_0_12px_rgba(255,255,255,0.1)]
          transition-all" />
        <div className="absolute top-0 left-0 isolate -z-10 h-full w-full overflow-hidden rounded-full"
          style={{ backdropFilter: 'url("#liquid-glass")' }} />
        <div className="pointer-events-none z-10">{children}</div>
        <GlassFilter />
      </Comp>
    </>
  )
}

type ColorVariant = "default" | "gold" | "success" | "error"
interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: ColorVariant }

const colorVariants: Record<ColorVariant, { outer: string; inner: string; button: string; textColor: string }> = {
  default: { outer: "bg-gradient-to-b from-[#000] to-[#A0A0A0]", inner: "bg-gradient-to-b from-[#FAFAFA] via-[#3E3E3E] to-[#E5E5E5]", button: "bg-gradient-to-b from-[#B9B9B9] to-[#969696]", textColor: "text-white" },
  gold: { outer: "bg-gradient-to-b from-[#917100] to-[#EAD98F]", inner: "bg-gradient-to-b from-[#FFFDDD] via-[#856807] to-[#FFF1B3]", button: "bg-gradient-to-b from-[#FFEBA1] to-[#9B873F]", textColor: "text-[#FFFDE5]" },
  success: { outer: "bg-gradient-to-b from-[#005A43] to-[#7CCB9B]", inner: "bg-gradient-to-b from-[#E5F8F0] via-[#00352F] to-[#D1F0E6]", button: "bg-gradient-to-b from-[#9ADBC8] to-[#3E8F7C]", textColor: "text-white" },
  error: { outer: "bg-gradient-to-b from-[#5A0000] to-[#FFAEB0]", inner: "bg-gradient-to-b from-[#FFDEDE] via-[#680002] to-[#FFE9E9]", button: "bg-gradient-to-b from-[#F08D8F] to-[#A45253]", textColor: "text-white" },
}

export const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(({ children, className, variant = "default", ...props }, ref) => {
  const [isPressed, setIsPressed] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const colors = colorVariants[variant]
  const transitionStyle = "all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)"
  return (
    <div className={cn("relative inline-flex rounded-md p-[1.25px]", colors.outer)}
      style={{ transform: isPressed ? "translateY(2.5px) scale(0.99)" : "translateY(0) scale(1)", boxShadow: isPressed ? "0 1px 2px rgba(0,0,0,0.15)" : "0 3px 8px rgba(0,0,0,0.08)", transition: transitionStyle }}>
      <div className={cn("absolute inset-[1px] rounded-lg", colors.inner)} style={{ transition: transitionStyle }} />
      <button ref={ref} className={cn("relative z-10 m-[1px] rounded-md inline-flex h-11 cursor-pointer items-center justify-center overflow-hidden px-6 py-2 text-sm font-semibold", colors.button, colors.textColor, className)}
        style={{ transform: isPressed ? "scale(0.97)" : "scale(1)", transition: transitionStyle }}
        onMouseDown={() => setIsPressed(true)} onMouseUp={() => setIsPressed(false)}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => { setIsPressed(false); setIsHovered(false) }}
        {...props}>
        {children}
        {isHovered && !isPressed && <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white/5" />}
      </button>
    </div>
  )
})
MetalButton.displayName = "MetalButton"

export { Button, buttonVariants, liquidbuttonVariants }

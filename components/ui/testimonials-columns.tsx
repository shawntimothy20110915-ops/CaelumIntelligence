"use client"
import React from "react"
import { motion } from "motion/react"

export interface Testimonial {
  text: string
  image?: string
  name: string
  role: string
}

export const TestimonialsColumn = ({ className, testimonials, duration = 10 }: { className?: string; testimonials: Testimonial[]; duration?: number }) => (
  <div className={className} style={{ overflow: "hidden" }}>
    <motion.div
      animate={{ translateY: "-50%" }}
      transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      className="flex flex-col gap-6 pb-6"
    >
      {[...Array(2)].map((_, idx) => (
        <React.Fragment key={idx}>
          {testimonials.map(({ text, name, role }, i) => (
            <div key={i} className="p-6 rounded-2xl max-w-xs w-full"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,163,90,0.12)", backdropFilter: "blur(10px)" }}>
              <p style={{ color: "rgba(244,236,221,0.7)", fontSize: 13, lineHeight: 1.7 }}>{text}</p>
              <div className="flex items-center gap-3 mt-5">
                <div aria-hidden className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "rgba(212,163,90,0.15)", border: "1px solid rgba(212,163,90,0.3)", color: "#d4a35a", fontSize: 13, fontWeight: 700 }}>{name.charAt(0)}</div>
                <div>
                  <div style={{ color: "rgba(244,236,221,0.9)", fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ color: "rgba(244,236,221,0.4)", fontSize: 11 }}>{role}</div>
                </div>
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </motion.div>
  </div>
)

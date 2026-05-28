"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";

const API = "https://agentpassv22.vercel.app/api";

function GridLines() {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.035, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="auth-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#d4a35a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-grid)" />
    </svg>
  );
}

function FloatingOrb({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      aria-hidden
      animate={{ y: [0, -18, 0], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,163,90,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
        filter: "blur(40px)",
      }}
    />
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailRef = useRef<HTMLInputElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 });

  useEffect(() => {
    emailRef.current?.focus();
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (step === "otp") setTimeout(() => digitRefs.current[0]?.focus(), 350);
  }, [step]);

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setDevCode(data.dev_code ?? null);
        setStep("otp");
      } else {
        setError("Failed to send code. Try again.");
      }
    } catch {
      setError("Network error. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = useCallback(async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (res.status === 401) {
        setShakeKey(k => k + 1);
        setError("Invalid code. Try again.");
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
        return;
      }
      const data = await res.json();
      if (data.ok && data.token) {
        setSuccess(true);
        localStorage.setItem(
          "ap-session",
          JSON.stringify({ token: data.token, email: data.email, name: data.email.split("@")[0] })
        );
        setTimeout(() => router.push("/dashboard"), 700);
      } else {
        setShakeKey(k => k + 1);
        setError("Something went wrong.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [email, router]);

  const handleDigitChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    if (char && i < 5) digitRefs.current[i + 1]?.focus();
    if (char && i === 5) {
      const code = [...next.slice(0, 5), char].join("");
      if (code.length === 6) verifyCode(code);
    }
  };

  const handleDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) digitRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    digitRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyCode(pasted);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        .auth-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 13px 16px; color: var(--ink); font-size: 15px; font-family: Inter, sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,163,90,0.12); }
        .auth-btn-primary { width: 100%; background: var(--gold); color: #0a0a0d; border: none; border-radius: 8px; padding: 13px 0; font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: opacity 0.15s, transform 0.1s; font-family: Inter, sans-serif; }
        .auth-btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .auth-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .auth-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-btn-ghost { width: 100%; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 11px 0; font-size: 13px; color: rgba(244,236,221,0.4); cursor: pointer; transition: border-color 0.15s, color 0.15s; font-family: Inter, sans-serif; }
        .auth-btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: rgba(244,236,221,0.7); }
        .otp-digit { width: 52px; height: 60px; text-align: center; font-size: 24px; font-family: 'JetBrains Mono', monospace; font-weight: 500; color: var(--ink); background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; outline: none; caret-color: var(--gold); transition: border-color 0.15s, box-shadow 0.15s; }
        .otp-digit:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,163,90,0.12); }
        .otp-digit.error { border-color: var(--signal) !important; }
      `}</style>

      <GridLines />
      <FloatingOrb x="10%" y="20%" size={400} delay={0} />
      <FloatingOrb x="65%" y="60%" size={300} delay={2} />

      {/* Spotlight following mouse */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,163,90,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />

      {/* Scan line */}
      <motion.div
        aria-hidden
        animate={{ top: ["-2%", "102%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,163,90,0.3), transparent)",
          pointerEvents: "none",
        }}
      />

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontFamily: "Instrument Serif, serif", fontSize: 36, color: "var(--gold)", letterSpacing: "-0.02em" }}
            >
              Identity confirmed.
            </motion.div>
          </motion.div>
        ) : step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", maxWidth: 440, margin: "0 20px" }}
          >
            {/* Card */}
            <div style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              padding: "52px 44px 44px",
              boxShadow: "0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ textAlign: "center", marginBottom: 44 }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <svg viewBox="0 0 32 32" width="26" height="26">
                    <polygon points="16,1 29,7 31,16 29,25 16,31 3,25 1,16 3,7" fill="none" stroke="rgba(212,163,90,0.5)" strokeWidth="1" />
                    <polygon points="16,6 25,10 27,16 25,22 16,26 7,22 5,16 7,10" fill="rgba(212,163,90,0.15)" stroke="var(--gold)" strokeWidth="0.8" />
                    <text x="16" y="20.5" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="10" fill="var(--gold)">A</text>
                  </svg>
                  <span style={{ fontFamily: "Instrument Serif, serif", fontSize: 26, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                    Agent<span style={{ color: "var(--gold)" }}>Pass</span>
                  </span>
                </div>
                <p style={{ color: "rgba(244,236,221,0.4)", fontSize: 13, letterSpacing: "0.02em" }}>
                  Your trust layer for autonomous agents
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <label style={{ display: "block", color: "rgba(244,236,221,0.5)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                  Email address
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendCode()}
                  placeholder="you@example.com"
                  className="auth-input"
                />
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ color: "var(--signal)", fontSize: 12, marginTop: 10, fontFamily: "JetBrains Mono, monospace" }}>
                    ✗ {error}
                  </motion.p>
                )}
                <button
                  onClick={sendCode}
                  disabled={loading || !email.trim()}
                  className="auth-btn-primary"
                  style={{ marginTop: 20 }}
                >
                  {loading ? "Sending…" : "Continue →"}
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ textAlign: "center", marginTop: 28, color: "rgba(244,236,221,0.2)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}
              >
                CRYPTOGRAPHIC · ZERO-KNOWLEDGE · TAMPER-PROOF
              </motion.p>
            </div>

            {/* Bottom note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ textAlign: "center", marginTop: 20, color: "rgba(244,236,221,0.25)", fontSize: 12 }}
            >
              No password. Access via one-time code.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", maxWidth: 440, margin: "0 20px" }}
          >
            <div style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              padding: "52px 44px 44px",
              boxShadow: "0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(212,163,90,0.1)",
                    border: "1px solid rgba(212,163,90,0.3)",
                    marginBottom: 20,
                  }}
                >
                  <svg viewBox="0 0 20 20" width="22" height="22" fill="none">
                    <path d="M3 8V6a7 7 0 0 1 14 0v2" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="1" y="8" width="18" height="12" rx="3" stroke="var(--gold)" strokeWidth="1.5" />
                    <circle cx="10" cy="14" r="2" fill="var(--gold)" />
                  </svg>
                </motion.div>
                <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 26, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 10 }}>
                  Enter your code
                </div>
                <p style={{ color: "rgba(244,236,221,0.45)", fontSize: 13 }}>
                  Sent to <span style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{email}</span>
                </p>
                {devCode && (
                  <p style={{ marginTop: 8, color: "rgba(244,236,221,0.3)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                    dev: <span style={{ color: "var(--gold)", letterSpacing: "0.12em" }}>{devCode}</span>
                  </p>
                )}
              </div>

              <motion.div
                key={shakeKey}
                animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { digitRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onPaste={handlePaste}
                    className={`otp-digit${error ? " error" : ""}`}
                  />
                ))}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ color: "var(--signal)", fontSize: 12, textAlign: "center", marginBottom: 16, fontFamily: "JetBrains Mono, monospace" }}
                  >
                    ✗ {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {loading && (
                <p style={{ color: "rgba(244,236,221,0.35)", fontSize: 12, textAlign: "center", marginBottom: 16, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>
                  VERIFYING…
                </p>
              )}

              <button
                onClick={() => { setStep("email"); setDigits(["", "", "", "", "", ""]); setError(""); setDevCode(null); }}
                className="auth-btn-ghost"
                style={{ marginTop: 8 }}
              >
                ← Use a different email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

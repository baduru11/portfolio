"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface HackSequenceProps {
  target: string;
}

type Phase = "init" | "trace" | "progress" | "granted" | "payload";

interface TraceLine {
  text: string;
  ok: boolean;
  glitch?: boolean;
}

const HEX = "0123456789ABCDEF";
function randomHex(n: number): string {
  let s = "";
  for (let i = 0; i < n; i += 1) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

function buildTrace(target: string): TraceLine[] {
  const ip = `${10 + Math.floor(Math.random() * 240)}.${Math.floor(
    Math.random() * 256,
  )}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  return [
    { text: `resolving ${target} → ${ip}`, ok: true },
    { text: "TCP handshake established", ok: true },
    { text: "negotiating TLS 1.3 over port 443", ok: true },
    { text: "fingerprinting remote OS … debian/12", ok: true },
    { text: `bypassing firewall layer 1/3 [${randomHex(8)}]`, ok: true },
    { text: "bypassing firewall layer 2/3", ok: true, glitch: true },
    { text: "WAF detected — spoofing X-Forwarded-For", ok: true },
    { text: "bypassing firewall layer 3/3", ok: true },
    { text: "injecting payload via 0day CVE-2026-0xDU", ok: true, glitch: true },
    { text: "spawning reverse shell on port 31337", ok: true },
  ];
}

function buildPayload(): string[] {
  return [
    `root:x:0:0::/root:/bin/bash`,
    `seungwan:x:1000:1000::/home/seungwan:/bin/zsh`,
    "",
    `[secrets]`,
    `AWS_KEY      = AKIA${randomHex(16)}`,
    `OPENAI_KEY   = sk-${randomHex(24).toLowerCase()}`,
    `STRIPE_KEY   = sk_live_${randomHex(20).toLowerCase()}`,
    "",
    `[loot]`,
    `→ exfiltrated 4,217 records`,
    `→ uploaded to /tmp/.${randomHex(6).toLowerCase()}.tar.gz`,
  ];
}

export function HackSequence({ target }: HackSequenceProps) {
  const [phase, setPhase] = useState<Phase>("init");
  const [traceCount, setTraceCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [grantedFlash, setGrantedFlash] = useState(false);
  const [payloadCount, setPayloadCount] = useState(0);

  const trace = useMemo(() => buildTrace(target), [target]);
  const payload = useMemo(() => buildPayload(), []);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const T = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    // init → trace
    T(() => setPhase("trace"), 600);

    // trace lines stream in
    let acc = 700;
    for (let i = 0; i < trace.length; i += 1) {
      const idx = i;
      const delay = 200 + Math.random() * 280;
      acc += delay;
      T(() => setTraceCount(idx + 1), acc);
    }

    // progress phase
    acc += 500;
    T(() => setPhase("progress"), acc);

    // progress fills with stutter to 100
    const steps = 24;
    for (let i = 1; i <= steps; i += 1) {
      const stutter = Math.random() < 0.18 ? 380 : 130;
      acc += stutter;
      const pct = Math.round((i / steps) * 100);
      T(() => setProgress(pct), acc);
    }

    // granted reveal
    acc += 300;
    T(() => {
      setPhase("granted");
      setGrantedFlash(true);
    }, acc);
    acc += 80;
    T(() => setGrantedFlash(false), acc);

    // payload dump
    acc += 700;
    T(() => setPhase("payload"), acc);
    for (let i = 0; i < payload.length; i += 1) {
      acc += 90;
      const idx = i;
      T(() => setPayloadCount(idx + 1), acc);
    }

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [trace.length, payload.length]);

  const visibleTrace = trace.slice(0, traceCount);
  const visiblePayload = payload.slice(0, payloadCount);
  const segments = 32;
  const filled = Math.round((progress / 100) * segments);
  const bar = "█".repeat(filled) + "░".repeat(segments - filled);

  return (
    <div className="hack-panel">
      <div className="hack-head">
        <span className="hack-tag">[ NETLINK ]</span>
        <span className="hack-target">target = {target}</span>
        <span className="hack-spacer" />
        <span className="hack-status">
          {phase === "granted" || phase === "payload"
            ? "OWNED"
            : phase === "init"
              ? "INIT"
              : "RUNNING"}
        </span>
      </div>

      <div className="hack-body">
        {phase === "init" && (
          <div className="hack-line glitch-x">
            initiating trace → <span className="hl">{target}</span>
          </div>
        )}

        {visibleTrace.map((l, i) => (
          <div
            key={i}
            className={`hack-line ${l.glitch ? "glitch-x" : ""}`}
          >
            <span className="ok">[ ok ]</span> {l.text}
          </div>
        ))}

        {(phase === "progress" || phase === "granted" || phase === "payload") && (
          <div className="hack-progress">
            <span className="ok">[ ok ]</span> exfiltrating ──{" "}
            <span className="bar">{bar}</span>{" "}
            <span className="pct">{progress}%</span>
          </div>
        )}

        {phase === "granted" && (
          <div className="hack-granted rgb-split">★ ACCESS GRANTED ★</div>
        )}

        {phase === "payload" && (
          <>
            <div className="hack-granted rgb-split-once">★ ACCESS GRANTED ★</div>
            <div className="hack-payload">
              {visiblePayload.map((line, i) => (
                <div key={i} className="hack-line">
                  {line || "\u00A0"}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {grantedFlash && <div className="hack-flash" />}

      {phase === "payload" && payloadCount === payload.length && (
        <div className="hack-foot">
          ── disclaimer: this is a joke. nothing was actually hacked.
        </div>
      )}
    </div>
  );
}

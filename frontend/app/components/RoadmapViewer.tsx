'use client'

import { useRef, useState, useEffect, useCallback } from "react";
import type { RoadmapData, Milestone } from "../hooks/useRoadmap";

const COLORS = ['#7F77DD','#1D9E75','#D85A30','#D4537E','#BA7517','#378ADD','#639922','#E24B4A'];

// ── 3D world constants ─────────────────────────────────────────
const FOCAL       = 380;   // camera focal length
const CAMERA_H    = 62;    // camera height above road
const MILE_DIST   = 420;   // world-unit gap between milestones
const WIND_AMP    = 145;   // road winding amplitude
const WIND_PERIOD = 1600;  // world units per sine cycle
const ROAD_HALF   = 52;    // road half-width
const SCENE_H     = 580;   // container px height
const HORIZON_F   = 0.36;  // horizon fraction from top
const CARD_DIST   = 540;   // relZ < this → full card
const DOT_DIST    = 1900;  // relZ < this → dot
const CARD_WW     = 110;   // card world width
const CARD_WH     = 80;    // card world height
const CARD_SIDE   = 122;   // lateral offset from road center

// Road winding (smooth sine)
function wx(z: number) {
  return WIND_AMP * Math.sin((z / WIND_PERIOD) * Math.PI * 2);
}

// Perspective projection
interface P { x: number; y: number; s: number; }
function proj(worldX: number, worldY: number, worldZ: number, camZ: number, W: number): P | null {
  const rz = worldZ - camZ;
  if (rz <= 1) return null;
  const s = FOCAL / rz;
  return {
    x: W / 2 + worldX * s,
    y: SCENE_H * HORIZON_F + (CAMERA_H - worldY) * s,
    s,
  };
}

// ── Scene renderer ─────────────────────────────────────────────
function renderScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  camZ: number,
  milestones: Milestone[],
  cardSet: Set<number>,
) {
  const hY = SCENE_H * HORIZON_F;
  ctx.clearRect(0, 0, W, SCENE_H);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, hY);
  sky.addColorStop(0, '#02020a');
  sky.addColorStop(1, '#0b0b16');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hY);

  // Stars (deterministic)
  for (let i = 0; i < 70; i++) {
    const sx = (i * 139.6) % W;
    const sy = (i * 89.1) % hY;
    const r  = i % 4 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 6) * 0.08})`;
    ctx.fill();
  }

  // Ground
  const gnd = ctx.createLinearGradient(0, hY, 0, SCENE_H);
  gnd.addColorStop(0, '#080810');
  gnd.addColorStop(1, '#101018');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, hY, W, SCENE_H - hY);

  // ── Road polygon ──────────────────────────────────────────────
  const STEPS = 120;
  const lPts: P[] = [];
  const rPts: P[] = [];

  for (let k = STEPS; k >= 0; k--) {
    const z  = camZ + 5 + (k / STEPS) * 2400;
    const cx = wx(z);
    const pL = proj(cx - ROAD_HALF, 0, z, camZ, W);
    const pR = proj(cx + ROAD_HALF, 0, z, camZ, W);
    if (pL && pR) { lPts.push(pL); rPts.push(pR); }
  }

  if (lPts.length > 1) {
    // Shadow
    ctx.beginPath();
    ctx.moveTo(lPts[0].x, lPts[0].y + 3);
    lPts.forEach(p => ctx.lineTo(p.x, p.y));
    [...rPts].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fill();

    // Road surface
    const rGrad = ctx.createLinearGradient(0, hY + 10, 0, SCENE_H);
    rGrad.addColorStop(0, '#18181e');
    rGrad.addColorStop(1, '#242430');
    ctx.beginPath();
    lPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    [...rPts].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = rGrad;
    ctx.fill();

    // Edge lines
    ctx.strokeStyle = '#2a2a38';
    ctx.lineWidth = 1;
    [lPts, rPts].forEach(pts => {
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Shoulder glow (subtle)
    const shoulderGlow = ctx.createLinearGradient(0, SCENE_H - 80, 0, SCENE_H);
    shoulderGlow.addColorStop(0, 'transparent');
    shoulderGlow.addColorStop(1, 'rgba(90,80,160,0.04)');
    ctx.beginPath();
    lPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    [...rPts].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = shoulderGlow;
    ctx.fill();
  }

  // Center dashes
  for (let k = 0; k < STEPS; k++) {
    if (k % 2 === 0) continue;
    const z1 = camZ + 5 + (k / STEPS) * 2400;
    const z2 = camZ + 5 + ((k + 0.35) / STEPS) * 2400;
    const p1 = proj(wx(z1), 0, z1, camZ, W);
    const p2 = proj(wx(z2), 0, z2, camZ, W);
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = Math.max(0.5, p1.s * 2);
    ctx.stroke();
  }

  // ── Milestone dots (non-card milestones) ──────────────────────
  const N = milestones.length;
  for (let i = N - 1; i >= 0; i--) {
    const wz = i * MILE_DIST;
    const rz = wz - camZ;
    if (rz < -30 || rz > DOT_DIST) continue;
    if (cardSet.has(i)) continue;

    const p = proj(wx(wz), 0, wz, camZ, W);
    if (!p) continue;

    const color = COLORS[i % 8];
    const r     = Math.min(7, Math.max(1.5, p.s * 10));

    // Glow ring
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
    grd.addColorStop(0, color + '55');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = milestones[i].completed ? color : '#252530';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    if (rz < 950 && r > 2) {
      const fs = Math.min(11, Math.max(7, p.s * 17));
      ctx.fillStyle = color + 'cc';
      ctx.font = `${fs}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const lbl = milestones[i].label.length > 24
        ? milestones[i].label.slice(0, 24) + '…'
        : milestones[i].label;
      ctx.fillText(lbl, p.x, p.y - r - 4);
    }
  }

  // ── Atmosphere ────────────────────────────────────────────────
  // Horizon glow
  const hGlow = ctx.createLinearGradient(0, hY - 12, 0, hY + 12);
  hGlow.addColorStop(0, 'transparent');
  hGlow.addColorStop(0.5, 'rgba(100,90,180,0.06)');
  hGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = hGlow;
  ctx.fillRect(0, hY - 12, W, 24);

  // Top fade
  const topFade = ctx.createLinearGradient(0, 0, 0, 30);
  topFade.addColorStop(0, '#02020a');
  topFade.addColorStop(1, 'transparent');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, W, 30);
}

// ── Component ──────────────────────────────────────────────────
interface RoadmapViewerProps {
  data: RoadmapData;
  onMilestoneComplete?: (id: number, completed: boolean) => void;
  onRequestPlan?: (label: string) => void;
}

export default function RoadmapViewer({ data, onMilestoneComplete, onRequestPlan }: RoadmapViewerProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [camZ, setCamZ]             = useState(-280);
  const [cW, setCW]                 = useState(900);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [local, setLocal]           = useState(data);

  const dragging = useRef(false);
  const lastY    = useRef(0);

  const N       = local.milestones.length;
  const maxCamZ = (N - 1) * MILE_DIST + 500;

  // Card set: milestones within CARD_DIST of camera
  const cardSet = new Set<number>();
  for (let i = 0; i < N; i++) {
    const rz = i * MILE_DIST - camZ;
    if (rz > 0 && rz < CARD_DIST) cardSet.add(i);
  }

  const completedCount = local.milestones.filter(m => m.completed).length;
  const progress       = N > 0 ? Math.round((completedCount / N) * 100) : 0;
  const selected       = local.milestones.find(m => m.id === selectedId) ?? null;

  useEffect(() => { setLocal(data); setCamZ(-280); }, [data]);

  // Container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setCW(el.clientWidth);
    const obs = new ResizeObserver(() => setCW(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Render every frame (camZ, cW, local change)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cW === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = cW;
    canvas.height = SCENE_H;
    renderScene(ctx, cW, camZ, local.milestones, cardSet);
  });

  // ── Input handlers ────────────────────────────────────────────
  const move = useCallback((delta: number) => {
    setCamZ(c => Math.min(maxCamZ, Math.max(-280, c + delta)));
  }, [maxCamZ]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    move(e.deltaY * 1.0);
  }, [move]);

  const onMD = useCallback((e: React.MouseEvent) => { dragging.current = true; lastY.current = e.clientY; }, []);
  const onMM = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    move(-(e.clientY - lastY.current) * 2);
    lastY.current = e.clientY;
  }, [move]);
  const onMU = useCallback(() => { dragging.current = false; }, []);

  const onTS = useCallback((e: React.TouchEvent) => { dragging.current = true; lastY.current = e.touches[0].clientY; }, []);
  const onTM = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    move(-(e.touches[0].clientY - lastY.current) * 2);
    lastY.current = e.touches[0].clientY;
  }, [move]);

  function handleToggle(id: number) {
    const next = local.milestones.map(m => m.id === id ? {...m, completed: !m.completed} : m);
    setLocal({...local, milestones: next});
    onMilestoneComplete?.(id, next.find(m => m.id === id)!.completed);
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-neutral-800">

      {/* ── Road scene ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: SCENE_H, background: '#02020a' }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onMU}
        onWheel={onWheel}
      >
        {/* Road canvas */}
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

        {/* HTML milestone cards */}
        {local.milestones.map((m, i) => {
          if (!cardSet.has(i)) return null;
          const wz     = i * MILE_DIST;
          const side   = i % 2 === 0 ? 1 : -1;
          const cardCX = wx(wz) + side * CARD_SIDE;
          const p      = proj(cardCX, CARD_WH / 2, wz, camZ, cW);
          if (!p) return null;

          const color  = COLORS[i % 8];
          const pxW    = Math.min(200, Math.max(80, p.s * CARD_WW));
          const pxH    = Math.min(130, Math.max(55, p.s * CARD_WH));
          const opacity = Math.min(1, 0.3 + p.s * 0.9);
          const fs     = Math.max(9, Math.min(13, p.s * 15));

          return (
            <div
              key={m.id}
              onClick={() => setSelectedId(prev => prev === m.id ? null : m.id)}
              style={{
                position: 'absolute',
                left: p.x - pxW / 2,
                top:  p.y - pxH / 2,
                width: pxW,
                height: pxH,
                opacity,
                fontSize: fs,
                borderColor: selectedId === m.id ? color : '#252530',
                boxShadow: selectedId === m.id ? `0 0 20px ${color}30` : undefined,
                transition: 'opacity 0.15s',
              }}
              className="absolute bg-neutral-900/90 border rounded-xl overflow-hidden cursor-pointer backdrop-blur-sm"
            >
              <div className="h-0.5" style={{ background: color }} />
              <div className="p-2">
                <p className="text-white font-semibold leading-snug line-clamp-2" style={{ fontSize: fs }}>
                  {m.label}
                </p>
                <p style={{ fontSize: fs - 1.5, color: '#555', marginTop: 2 }}>
                  {m.period}
                </p>
                {pxH > 85 && m.items.slice(0, 2).map((item, j) => (
                  <p key={j} style={{ fontSize: fs - 2, color: '#3a3a3a', marginTop: 1 }} className="truncate">
                    · {item}
                  </p>
                ))}
              </div>
              {m.completed && (
                <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: color, fontSize: 7, color: '#fff' }}>✓</div>
              )}
            </div>
          );
        })}

        {/* Scroll hint */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none">
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="#333" strokeWidth="1.5"/>
            <rect x="6.5" y="5" width="3" height="6" rx="1.5" fill="#444"/>
          </svg>
          <p className="text-neutral-700 text-xs tracking-wide">scroll forward</p>
        </div>

        {/* Radial vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 100%, transparent 40%, rgba(0,0,5,0.6) 100%)' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(transparent, rgba(2,2,10,0.9))' }} />
      </div>

      {/* ── Progress bar ──────────────────────────────────────── */}
      <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-3 flex items-center gap-4">
        <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4ade80, #22d3ee)' }} />
        </div>
        <span className="text-xs text-neutral-600 flex-shrink-0 tabular-nums">
          {completedCount}/{N}
        </span>
      </div>

      {/* ── Detail panel ──────────────────────────────────────── */}
      {selected && (() => {
        const color = COLORS[selected.id % 8];
        return (
          <div className="bg-neutral-900 border-t border-neutral-800 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-2"
                  style={{ background: color + '18', color }}>
                  {selected.period}
                </span>
                <p className="text-white font-semibold">{selected.label}</p>
              </div>
              <button onClick={() => setSelectedId(null)}
                className="text-neutral-600 hover:text-white text-xs mt-0.5 transition-colors">✕</button>
            </div>

            <ul className="flex flex-col gap-2 mb-5">
              {selected.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-neutral-400">
                  <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex gap-2.5 flex-wrap">
              <button
                onClick={() => handleToggle(selected.id)}
                className="text-xs px-4 py-2 rounded-lg border font-medium transition-all"
                style={{
                  borderColor: selected.completed ? '#4ade80' : '#2a2a2a',
                  color: selected.completed ? '#4ade80' : '#737373',
                  background: selected.completed ? '#4ade8010' : 'transparent',
                }}
              >
                {selected.completed ? '✓ Completed' : 'Mark as complete'}
              </button>
              {onRequestPlan && (
                <button
                  onClick={() => onRequestPlan(selected.label)}
                  className="text-xs px-4 py-2 rounded-lg border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all"
                >
                  Detailed plan →
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useRef } from "react";

/**
 * Click or drag on the thumbnail to set the focal point: the part of the
 * content that stays in view however the frame is cropped.
 */
export function FocalPicker({ src, x, y, onChange }: { src: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const setFrom = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    onChange(clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100));
  };
  return (
    <div
      ref={ref}
      className="ed-focal"
      role="slider"
      tabIndex={0}
      aria-label="Focal point"
      aria-valuetext={`${x}% across, ${y}% down`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && setFrom(e)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 2;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        onChange(Math.min(100, Math.max(0, x + d[0]!)), Math.min(100, Math.max(0, y + d[1]!)));
      }}
    >
      <img src={src} alt="" draggable={false} />
      <span className="ed-focal-dot" style={{ left: `${x}%`, top: `${y}%` }} />
      <span className="ed-focal-tip">Focal point · drag to set</span>
    </div>
  );
}

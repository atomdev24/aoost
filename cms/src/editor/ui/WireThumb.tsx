import type { StructureId } from "../../model/structures";
import "./wire-thumb.css";

/** A line drawing of a starting layout for New page (Alex's pick: "A · line wireframes"). */
export function WireThumb({ kind }: { kind: StructureId | "custom" }) {
  return (
    <span className={`wt wt-${kind}`} aria-hidden="true">
      <i className="wt-nav" />
      {BODY[kind]}
    </span>
  );
}

const L = ({ w, dark, accent, center }: { w: number; dark?: boolean; accent?: boolean; center?: boolean }) => (
  <i className={`wt-ln${dark ? " is-dark" : ""}${accent ? " is-accent" : ""}${center ? " is-center" : ""}`} style={{ width: `${w}%` }} />
);
const Btn = () => <i className="wt-btn" />;
const Row = ({ n = 3, tall, hl }: { n?: number; tall?: boolean; hl?: number }) => (
  <i className={`wt-row${tall ? " is-tall" : ""}`}>
    {Array.from({ length: n }, (_, i) => (
      <i key={i} className={hl === i ? "is-hl" : undefined} />
    ))}
  </i>
);
const Split = ({ picLeft, children }: { picLeft?: boolean; children: React.ReactNode }) => (
  <i className="wt-split">
    {picLeft ? <i className="wt-pic" /> : null}
    <i className="wt-col">{children}</i>
    {picLeft ? null : <i className="wt-pic" />}
  </i>
);

const BODY: Record<StructureId | "custom", React.ReactNode> = {
  blank: <L w={55} dark />,
  landing: (
    <>
      <Split>
        <L w={40} accent />
        <L w={85} dark />
        <L w={70} />
        <Btn />
      </Split>
      <Row />
    </>
  ),
  product: (
    <>
      <Split>
        <L w={85} dark />
        <L w={60} />
        <Btn />
      </Split>
      <Row />
    </>
  ),
  pricing: (
    <>
      <L w={40} dark center />
      <Row tall hl={1} />
    </>
  ),
  about: (
    <>
      <L w={45} dark center />
      <i className="wt-stats">
        <i />
        <i />
        <i />
        <i />
      </i>
      <i className="wt-photos">
        <i />
        <i />
        <i />
      </i>
    </>
  ),
  contact: (
    <Split>
      <L w={75} dark />
      <L w={55} />
      <L w={60} />
      <Btn />
    </Split>
  ),
  article: (
    <>
      <i className="wt-pic is-cover" />
      <L w={60} dark />
      <L w={92} />
      <L w={86} />
      <L w={70} />
    </>
  ),
  event: (
    <>
      <Split>
        <L w={35} accent />
        <L w={75} dark />
        <Btn />
      </Split>
      <Row />
    </>
  ),
  custom: (
    <>
      <L w={60} dark />
      <i className="wt-pic is-cover" />
      <L w={80} />
    </>
  ),
};

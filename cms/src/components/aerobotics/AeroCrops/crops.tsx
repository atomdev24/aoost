import { art } from "../shared";

/** The crop icons of aerobotics.com, in the site's order. */
export const CROPS = [
  ["orange", "Oranges"],
  ["lemon", "Lemons"],
  ["apple", "Apples"],
  ["grapes", "Grapes"],
  ["cherry", "Cherries"],
  ["blueberry", "Blueberries"],
  ["kiwi", "Kiwifruit"],
  ["avocado", "Avocados"],
  ["peach", "Stone fruit"],
  ["pomegranate", "Pomegranates"],
] as const;
export type CropKey = (typeof CROPS)[number][0];
export const CROP_KEYS = CROPS.map((c) => c[0]) as unknown as [CropKey, ...CropKey[]];
export const cropName = (k: string) => CROPS.find((c) => c[0] === k)?.[1] ?? k;
export const cropIcon = (k: string) => art(`crop_${k}`);
export const cropOptions = CROPS.map(([value, label]) => ({ value, label }));
export const ALL_CROPS = CROPS.map(([crop]) => ({ crop }));

/** The pale box with a line and the row of fruit icons. */
export function CropStrip({ label, crops }: { label: string; crops: { crop: string }[] }) {
  if (!crops.length) return null;
  return (
    <div className="abk">
      {label ? <p className="abk-label">{label}</p> : null}
      <ul className="abk-row">
        {crops.map(({ crop }, i) => (
          <li key={i} title={cropName(crop)}>
            <img src={cropIcon(crop)} alt={cropName(crop)} loading="lazy" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export const cropCss = `
.abk{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:10px;background:var(--ab-chip,#D9E9FA)}
.abk-label{font-size:16px;line-height:1.4}
.abk-row{display:flex;flex-wrap:wrap;gap:10px 12px;margin:0;padding:0;list-style:none}
.abk-row img{display:block;width:auto;height:40px;max-width:44px;object-fit:contain}
`;

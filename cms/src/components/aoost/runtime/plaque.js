/* The viewer's plaque: optional title, medium, year and note (and link) on a project piece.
   Pure helpers, so the "nothing unless there's text" rule is unit-tested (plaque.test.ts). */
const str=v=>typeof v==='string'?v.trim():'';
const safeLink=l=>/^(https?:\/\/|\/)/.test(l)?l:'';

/** True when the piece has any plaque text: only then does the viewer show its "i". */
export function hasPlaque(p){
  if(!p||typeof p!=='object')return false;
  return ['title','medium','year','note'].some(k=>str(p[k]))||!!safeLink(str(p.link));
}

/** What the plaque card shows: title, then "medium, year", then the note and an "open" link. Null without plaque text. */
export function plaqueParts(p){
  if(!hasPlaque(p))return null;
  return {title:str(p.title),meta:[str(p.medium),str(p.year)].filter(Boolean).join(', '),note:str(p.note),link:safeLink(str(p.link))};
}

import { fields as Button } from "./Button/Button.puck";
import { fields as DiaryList } from "./DiaryList/DiaryList.puck";
import { fields as Footer } from "./Footer/Footer.puck";
import { fields as GalleryGrid } from "./GalleryGrid/GalleryGrid.puck";
import { fields as Global } from "./Global/Global.puck";
import { fields as Image } from "./Image/Image.puck";
import { fields as PlaylistCard } from "./PlaylistCard/PlaylistCard.puck";
import { fields as Text } from "./Text/Text.puck";

/** Editor-only: each component's content fields. Kept apart from registry.ts so the Worker never bundles editor UI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const contentFields: Record<string, Record<string, any>> = { Text, Image, Button, GalleryGrid, DiaryList, PlaylistCard, Footer, Global };

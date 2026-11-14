import { registerContentSchema } from "../schema/validate";
import { Button } from "./Button/Button";
import { DiaryList } from "./DiaryList/DiaryList";
import { Footer } from "./Footer/Footer";
import { GalleryGrid } from "./GalleryGrid/GalleryGrid";
import { Global } from "./Global/Global";
import { Image } from "./Image/Image";
import { PlaylistCard } from "./PlaylistCard/PlaylistCard";
import { Text } from "./Text/Text";
import type { ComponentDef } from "./types";

/** Every component the renderer and the editor know about. Add new ones here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const components: ComponentDef<any>[] = [Text, Image, Button, GalleryGrid, DiaryList, PlaylistCard, Footer, Global];

export const componentMap = new Map(components.map((c) => [c.type, c]));
for (const c of components) registerContentSchema(c.type, c.schema);

export const getComponent = (type: string) => componentMap.get(type);

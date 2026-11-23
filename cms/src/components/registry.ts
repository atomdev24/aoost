import { registerContentSchema } from "../schema/validate";
import { Audio } from "./Audio/Audio";
import { Button } from "./Button/Button";
import { Cards } from "./Cards/Cards";
import { Code } from "./Code/Code";
import { DiaryList } from "./DiaryList/DiaryList";
import { Divider } from "./Divider/Divider";
import { Embed } from "./Embed/Embed";
import { FileDownload } from "./FileDownload/FileDownload";
import { Footer } from "./Footer/Footer";
import { FruitReading } from "./FruitReading/FruitReading";
import { GalleryGrid } from "./GalleryGrid/GalleryGrid";
import { Global } from "./Global/Global";
import { Image } from "./Image/Image";
import { Lottie } from "./Lottie/Lottie";
import { Model3D } from "./Model3D/Model3D";
import { PlaylistCard } from "./PlaylistCard/PlaylistCard";
import { Shape } from "./Shape/Shape";
import { Spacer } from "./Spacer/Spacer";
import { SpotifyEmbed } from "./SpotifyEmbed/SpotifyEmbed";
import { Text } from "./Text/Text";
import { TrueFruitSeason } from "./TrueFruitSeason/TrueFruitSeason";
import { Video } from "./Video/Video";
import { AoostHero } from "./aoost/AoostHero/AoostHero";
import { AoostProjects } from "./aoost/AoostProjects/AoostProjects";
import { AoostViewer } from "./aoost/AoostViewer/AoostViewer";
import { AoostJournals } from "./aoost/AoostJournals/AoostJournals";
import { AoostTools } from "./aoost/AoostTools/AoostTools";
import { AoostPlaylistBand } from "./aoost/AoostPlaylistBand/AoostPlaylistBand";
import { AoostDrawingWall } from "./aoost/AoostDrawingWall/AoostDrawingWall";
import { AoostRodeo } from "./aoost/AoostRodeo/AoostRodeo";
import { AoostFooter } from "./aoost/AoostFooter/AoostFooter";
import { AoostAbout } from "./aoost/AoostAbout/AoostAbout";
import type { ComponentDef } from "./types";

/** Every component the renderer and the editor know about. Add new ones here (and in fields.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const components: ComponentDef<any>[] = [Text, Image, Video, Audio, Button, Shape, Spacer, Divider, GalleryGrid, Embed, SpotifyEmbed, Code, Lottie, Model3D, FileDownload, FruitReading, Cards, DiaryList, PlaylistCard, Footer, TrueFruitSeason, Global, AoostHero, AoostProjects, AoostViewer, AoostJournals, AoostTools, AoostPlaylistBand, AoostDrawingWall, AoostRodeo, AoostFooter, AoostAbout];

export const componentMap = new Map(components.map((c) => [c.type, c]));
for (const c of components) registerContentSchema(c.type, c.schema);

export const getComponent = (type: string) => componentMap.get(type);

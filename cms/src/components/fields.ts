import { fields as Audio } from "./Audio/Audio.puck";
import { fields as Button } from "./Button/Button.puck";
import { fields as Cards } from "./Cards/Cards.puck";
import { fields as Code } from "./Code/Code.puck";
import { fields as DiaryList } from "./DiaryList/DiaryList.puck";
import { fields as Divider } from "./Divider/Divider.puck";
import { fields as Embed } from "./Embed/Embed.puck";
import { fields as FileDownload } from "./FileDownload/FileDownload.puck";
import { fields as Footer } from "./Footer/Footer.puck";
import { fields as GalleryGrid } from "./GalleryGrid/GalleryGrid.puck";
import { fields as Global } from "./Global/Global.puck";
import { fields as Image } from "./Image/Image.puck";
import { fields as Lottie } from "./Lottie/Lottie.puck";
import { fields as Model3D } from "./Model3D/Model3D.puck";
import { fields as PlaylistCard } from "./PlaylistCard/PlaylistCard.puck";
import { fields as Spacer } from "./Spacer/Spacer.puck";
import { fields as SpotifyEmbed } from "./SpotifyEmbed/SpotifyEmbed.puck";
import { fields as Text } from "./Text/Text.puck";
import { fields as Video } from "./Video/Video.puck";
import { fields as AoostHero } from "./aoost/AoostHero/AoostHero.puck";
import { fields as AoostProjects } from "./aoost/AoostProjects/AoostProjects.puck";
import { fields as AoostViewer } from "./aoost/AoostViewer/AoostViewer.puck";
import { fields as AoostJournals } from "./aoost/AoostJournals/AoostJournals.puck";
import { fields as AoostTools } from "./aoost/AoostTools/AoostTools.puck";
import { fields as AoostAbout } from "./aoost/AoostAbout/AoostAbout.puck";
import { fields as AoostPlaylistBand } from "./aoost/AoostPlaylistBand/AoostPlaylistBand.puck";
import { fields as AoostDrawingWall } from "./aoost/AoostDrawingWall/AoostDrawingWall.puck";
import { fields as AoostRodeo } from "./aoost/AoostRodeo/AoostRodeo.puck";
import { fields as AoostFooter } from "./aoost/AoostFooter/AoostFooter.puck";

/** Editor-only: each component's content fields. Kept apart from registry.ts so the Worker never bundles editor UI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const contentFields: Record<string, Record<string, any>> = { Text, Image, Video, Audio, Button, Spacer, Divider, GalleryGrid, Embed, SpotifyEmbed, Code, Lottie, Model3D, FileDownload, Cards, DiaryList, PlaylistCard, Footer, Global, AoostHero, AoostProjects, AoostViewer, AoostJournals, AoostTools, AoostPlaylistBand, AoostDrawingWall, AoostRodeo, AoostFooter, AoostAbout };

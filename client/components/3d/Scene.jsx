import { CameraRig } from "./CameraRig.jsx";
import { Lights } from "./Lights.jsx";
import { Desk } from "./Desk.jsx";
import { PaperScreen } from "./PaperScreen.jsx";
import { LayerStack } from "./LayerStack.jsx";
import { BackendModules } from "./BackendModules.jsx";
import { DatabaseStack } from "./DatabaseStack.jsx";
import { AINetwork } from "./AINetwork.jsx";
import { DataFlow } from "./DataFlow.jsx";
import { DigitalCore } from "./DigitalCore.jsx";
import { MilymEcosystem } from "./MilymEcosystem.jsx";
import { FinalProduct } from "./FinalProduct.jsx";
import { ParticleField } from "../../fx/ParticleField.jsx";
import { SparkTrails } from "../../fx/SparkTrails.jsx";
import { ScanBeam } from "../../fx/ScanBeam.jsx";
import { Shockwave } from "../../fx/Shockwave.jsx";
import { Earth } from "../../fx/Earth.jsx";
import { Meteorite } from "../../fx/Meteorite.jsx";
import { StarField } from "../../fx/StarField.jsx";
import { TargetRange } from "./TargetRange.jsx";
import { Effects } from "../../fx/Effects.jsx";

/**
 * Une seule scène, un seul décor, et deux registres qui se répondent :
 * les objets (feuille, écran, couches, serveurs, noyau, écosystème) jouent le
 * concret, pendant qu'une nappe de particules unique se métamorphose d'une
 * forme à l'autre et porte le souffle du récit. Les balayages de numérisation,
 * l'onde de choc du noyau et le bloom donnent les accents.
 */
export function Scene({ quality }) {
  return (
    <>
      <color attach="background" args={["#050507"]} />
      <fog attach="fog" args={["#050507", 10, 26]} />

      <CameraRig />
      <Lights quality={quality} />

      {/* Prologue : la France de nuit vue de l'espace, puis la plongée. */}
      <StarField />
      <Earth />
      <Meteorite />
      <TargetRange />

      <Desk quality={quality} />
      <PaperScreen quality={quality} />
      <LayerStack quality={quality} />
      <BackendModules quality={quality} />
      <DatabaseStack quality={quality} />
      <AINetwork quality={quality} />
      <DataFlow quality={quality} />
      <DigitalCore quality={quality} />
      <MilymEcosystem />
      <FinalProduct />

      <ParticleField quality={quality} />
      <SparkTrails quality={quality} />
      {/* Deux passes de numérisation : la feuille, puis l'interface finale. */}
      <ScanBeam range={[0.175, 0.255]} />
      <ScanBeam range={[0.235, 0.315]} />
      <ScanBeam range={[0.4, 0.455]} />
      <ScanBeam range={[0.5, 0.56]} />
      <Shockwave />

      <Effects enabled={quality.postprocessing} />
    </>
  );
}

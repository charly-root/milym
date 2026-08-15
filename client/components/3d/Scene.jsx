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

/**
 * Une seule scène, un seul décor. Les objets se succèdent au même endroit :
 * la feuille devient l'écran, l'écran s'ouvre en couches, les couches se
 * referment en noyau, le noyau devient l'écosystème puis le produit fini.
 */
export function Scene({ quality, logoUrl }) {
  return (
    <>
      <color attach="background" args={["#050507"]} />
      <fog attach="fog" args={["#050507", 10, 26]} />

      <CameraRig />
      <Lights quality={quality} />

      <Desk quality={quality} />
      <PaperScreen quality={quality} />
      <LayerStack quality={quality} />
      <BackendModules quality={quality} />
      <DatabaseStack quality={quality} />
      <AINetwork quality={quality} />
      <DataFlow quality={quality} />
      <DigitalCore logoUrl={logoUrl} quality={quality} />
      <MilymEcosystem />
      <FinalProduct />
    </>
  );
}

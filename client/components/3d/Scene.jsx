import { CameraRig } from "./CameraRig.jsx";
import { Lights } from "./Lights.jsx";
import { IdeaPaper } from "./IdeaPaper.jsx";
import { PrototypeScreen } from "./PrototypeScreen.jsx";
import { WebFactory } from "./WebFactory.jsx";
import { BackendNetwork } from "./BackendNetwork.jsx";
import { DatabaseRings } from "./Database.jsx";
import { AINetwork } from "./AINetwork.jsx";
import { DigitalCore } from "./DigitalCore.jsx";
import { MilymEcosystem } from "./MilymEcosystem.jsx";
import { FinalProduct } from "./FinalProduct.jsx";
import { DataFlow } from "./DataFlow.jsx";

export function Scene({ quality, logoUrl }) {
  return (
    <>
      <color attach="background" args={["#050507"]} />
      <fog attach="fog" args={["#050507", 7, 16]} />
      <CameraRig />
      <Lights quality={quality} />
      <IdeaPaper quality={quality} />
      <PrototypeScreen />
      <WebFactory quality={quality} />
      <BackendNetwork quality={quality} />
      <DatabaseRings quality={quality} />
      <AINetwork quality={quality} />
      <DigitalCore logoUrl={logoUrl} quality={quality} />
      <MilymEcosystem quality={quality} />
      <FinalProduct />
      <DataFlow quality={quality} />
    </>
  );
}

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

/**
 * L'étalonnage final : le bloom fait rayonner tout ce qui dépasse le blanc
 * (particules additives, noyau, balayages), la vignette ferme les bords et
 * concentre l'œil au centre. Coupé sur mobile : le rendu direct y reste roi.
 */
export function Effects({ enabled }) {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.6} luminanceSmoothing={0.3} radius={0.8} />
      <Vignette eskil={false} offset={0.2} darkness={0.72} />
    </EffectComposer>
  );
}

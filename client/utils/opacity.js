/**
 * Opacité d'un groupe entier. L'opacité d'origine de chaque matériau sert de
 * référence : une plaque à 40 % reste à 40 % quand la scène est pleinement
 * visible, et disparaît proprement avec elle.
 */
export function setGroupOpacity(object, opacity) {
  const visible = opacity > 0.004;
  object.visible = visible;
  if (!visible) return;

  object.traverse((child) => {
    const material = child.material;
    if (!material) return;
    if (Array.isArray(material)) material.forEach((m) => applyOpacity(m, opacity));
    else applyOpacity(material, opacity);
  });
}

function applyOpacity(material, opacity) {
  if (material.userData.baseOpacity === undefined) {
    material.userData.baseOpacity = material.opacity ?? 1;
  }
  material.opacity = material.userData.baseOpacity * opacity;
}

import * as THREE from "three";

const worldQuaternion = new THREE.Quaternion();

/**
 * Oriente une étiquette vers la caméra. Sans cela, un nom posé sur une couche
 * vue de trois quarts devient une ligne illisible.
 */
export function faceCamera(object, camera) {
  if (!object) return;
  if (object.parent) {
    object.parent.getWorldQuaternion(worldQuaternion);
    object.quaternion.copy(worldQuaternion).invert().multiply(camera.quaternion);
  } else {
    object.quaternion.copy(camera.quaternion);
  }
}

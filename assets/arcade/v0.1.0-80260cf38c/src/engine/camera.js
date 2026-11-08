// Pure horizontal follow camera. Returns new integer camX.
// Player may move inside a centred dead zone without moving the camera.
export function followCamera({ camX, playerX, viewW = 320, worldW, deadZone = 48 }) {
  const left = camX + (viewW - deadZone) / 2;
  const right = left + deadZone;
  let x = camX;
  if (playerX < left) x -= left - playerX;
  else if (playerX > right) x += playerX - right;
  const max = Math.max(0, worldW - viewW);
  return Math.round(Math.min(Math.max(x, 0), max));
}

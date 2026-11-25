import SPLASH_TIMING from '../constants/splash';
import { splashFrame, splashPulse } from '../renderer/utils/splashAnimation';

it('сводит скобки при входе и разводит их при выходе', () => {
  expect(splashFrame(0, null, false)).toMatchObject({
    opacity: 0,
    offset: 18.5,
    scale: 0.9,
  });
  const settled = splashFrame(540, null, false);
  expect(settled.opacity).toBe(1);
  expect(settled.offset).toBeLessThan(2);
  expect(
    splashFrame(540 + SPLASH_TIMING.exit, SPLASH_TIMING.exit, false),
  ).toMatchObject({ exit: 1, offset: 6.8, blend: 0 });
});

it('показывает блик в своей фазе и отключает эффекты при сокращении движения', () => {
  expect(splashFrame(1120, null, false).sheenOpacity).toBe(1);
  expect(splashFrame(540, null, false).sheenOpacity).toBe(0);
  expect(splashFrame(1120, null, true)).toMatchObject({
    opacity: 1,
    offset: 0,
    scale: 1,
    sheenOpacity: 0,
  });
  expect(splashPulse(100, 0.36, 1, false)).toMatchObject({ alpha: 1 });
  expect(splashPulse(100, 0.36, 1, false).head).toBeGreaterThan(44);
  expect(splashPulse(100, 0.8, 1, false).alpha).toBe(0);
  expect(splashPulse(0, 0.36, 1, false).alpha).toBe(0);
});

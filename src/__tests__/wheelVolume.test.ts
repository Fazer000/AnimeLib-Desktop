import {
  accumulateWheel,
  nextWheelVolume,
} from '../renderer/utils/wheelVolume';

describe('accumulateWheel', () => {
  it('деление колеса вниз даёт шаг вниз', () => {
    expect(accumulateWheel(0, 100, 100)).toEqual({ steps: 1, pending: 0 });
  });

  it('деление колеса вверх даёт шаг вверх', () => {
    expect(accumulateWheel(0, -100, 100)).toEqual({ steps: -1, pending: 0 });
  });

  it('мелкие сдвиги тачпада копятся до порога', () => {
    const first = accumulateWheel(0, 30, 100);
    expect(first).toEqual({ steps: 0, pending: 30 });

    const second = accumulateWheel(90, 30, 100);
    expect(second).toEqual({ steps: 1, pending: 0 });
  });

  it('резкая прокрутка даёт не больше одного шага', () => {
    expect(accumulateWheel(0, 300, 100)).toEqual({ steps: 1, pending: 0 });
    expect(accumulateWheel(0, -450, 100)).toEqual({ steps: -1, pending: 0 });
  });

  it('смена направления гасит накопленное', () => {
    expect(accumulateWheel(60, -60, 100)).toEqual({ steps: 0, pending: 0 });
  });
});

describe('nextWheelVolume', () => {
  it('шаг вверх прибавляет громкость', () => {
    expect(nextWheelVolume(0.5, -1, 0.05)).toBe(0.55);
  });

  it('шаг вниз убавляет громкость', () => {
    expect(nextWheelVolume(0.5, 1, 0.05)).toBe(0.45);
  });

  it('громкость не выходит за пределы', () => {
    expect(nextWheelVolume(0.98, -1, 0.05)).toBe(1);
    expect(nextWheelVolume(0.02, 1, 0.05)).toBe(0);
  });

  it('округляет накопленную погрешность дробей', () => {
    expect(nextWheelVolume(0.1, -1, 0.05)).toBe(0.15);
  });
});

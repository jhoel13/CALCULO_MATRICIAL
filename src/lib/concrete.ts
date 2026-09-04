export type ConcreteFrameInput = {
  fcKgfCm2: number;
  widthCm: number;
  depthCm: number;
  lengthM: number;
  uniformLoadKgfM: number;
};

export function concreteFrameProperties(input: ConcreteFrameInput) {
  const fcKgfCm2 = Math.max(input.fcKgfCm2, 0.0001);
  const widthCm = Math.max(input.widthCm, 0.0001);
  const depthCm = Math.max(input.depthCm, 0.0001);
  const lengthCm = Math.max(input.lengthM * 100, 0.0001);
  const ecKgfCm2 = 15000 * Math.sqrt(fcKgfCm2);
  const areaCm2 = widthCm * depthCm;
  const inertiaCm4 = widthCm * depthCm ** 3 / 12;
  const eaL = ecKgfCm2 * areaCm2 / lengthCm;
  const twelve = 12 * ecKgfCm2 * inertiaCm4 / lengthCm ** 3;
  const six = 6 * ecKgfCm2 * inertiaCm4 / lengthCm ** 2;
  const four = 4 * ecKgfCm2 * inertiaCm4 / lengthCm;
  const two = 2 * ecKgfCm2 * inertiaCm4 / lengthCm;
  const localStiffness = [
    [eaL, 0, 0, -eaL, 0, 0],
    [0, twelve, six, 0, -twelve, six],
    [0, six, four, 0, -six, two],
    [-eaL, 0, 0, eaL, 0, 0],
    [0, -twelve, -six, 0, twelve, -six],
    [0, six, two, 0, -six, four],
  ];
  const uniformLoadKgfCm = input.uniformLoadKgfM / 100;
  const simpleBeamDeflectionCm = 5 * uniformLoadKgfCm * lengthCm ** 4 / (384 * ecKgfCm2 * inertiaCm4);
  return {
    ecKgfCm2,
    ePa: ecKgfCm2 * 98066.5,
    areaCm2,
    inertiaCm4,
    lengthCm,
    localStiffness,
    simpleBeamDeflectionCm,
  };
}

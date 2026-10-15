import { Circle, Ellipse, Path } from 'react-native-svg';
import { Cheeks, type FaceCfg } from '../face';
import { Highlight, OUT } from '../shapes';
import type { PartProps, SpeciesArt } from './types';

const face: FaceCfg = { eyeY: 90, eyeDx: 30, mouthY: 109, cheekY: 106, cheekDx: 44 };

function Tail({ p }: PartProps) {
  return (
    <Circle cx={150} cy={168} r={14} fill={p.furDark} stroke={p.outline} strokeWidth={OUT} />
  );
}

function Body({ p }: PartProps) {
  return (
    <>
      <Ellipse cx={100} cy={148} rx={54} ry={38} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      <Ellipse cx={100} cy={158} rx={32} ry={24} fill={p.belly} />
      <Highlight cx={72} cy={134} rx={10} ry={5} rot={-30} />
      {[74, 126].map((x) => (
        <Ellipse
          key={x}
          cx={x}
          cy={185}
          rx={16}
          ry={9.5}
          fill={p.fur}
          stroke={p.outline}
          strokeWidth={OUT}
        />
      ))}
    </>
  );
}

function Head({ p }: PartProps) {
  return (
    <>
      {[56, 144].map((x) => (
        <Circle
          key={`e${x}`}
          cx={x}
          cy={52}
          r={20}
          fill={p.fur}
          stroke={p.outline}
          strokeWidth={OUT}
        />
      ))}
      {[56, 144].map((x) => (
        <Circle key={`i${x}`} cx={x} cy={54} r={10} fill={p.innerEar} />
      ))}
      <Ellipse cx={100} cy={94} rx={60} ry={52} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      <Path
        d="M100 43 Q95 29 108 31"
        fill="none"
        stroke={p.outline}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Highlight cx={74} cy={62} rx={13} ry={6} rot={-25} opacity={0.35} />
      <Ellipse cx={100} cy={112} rx={26} ry={19} fill={p.belly} />
      <Ellipse cx={100} cy={100} rx={6.5} ry={4.8} fill={p.nose} />
      <Cheeks p={p} cfg={face} />
    </>
  );
}

export const critter: SpeciesArt = {
  face,
  tail: { pivot: [142, 166], amp: 22, ms: 1100 },
  shakesWhenRestless: true,
  Tail,
  Body,
  Head,
};

import { Ellipse, Path } from 'react-native-svg';
import { Cheeks, type FaceCfg } from '../face';
import { FatStroke, Highlight, OUT } from '../shapes';
import type { PartProps, SpeciesArt } from './types';

const face: FaceCfg = { eyeY: 84, eyeDx: 30, mouthY: 111, cheekY: 106, cheekDx: 44 };

function Tail({ p }: PartProps) {
  return <FatStroke d="M138 166 C160 163 172 148 168 124" color={p.fur} width={14} p={p} />;
}

function Body({ p }: PartProps) {
  return (
    <>
      <Ellipse cx={100} cy={146} rx={50} ry={38} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      <Ellipse cx={100} cy={156} rx={30} ry={25} fill={p.belly} />
      <Highlight cx={74} cy={132} rx={10} ry={5} rot={-30} />
      {[78, 122].map((x) => (
        <Ellipse
          key={x}
          cx={x}
          cy={184}
          rx={15}
          ry={10}
          fill={p.fur}
          stroke={p.outline}
          strokeWidth={OUT}
        />
      ))}
      {[78, 122].map((x) => (
        <Path
          key={x}
          d={`M${x - 4} 183 v5 M${x + 4} 183 v5`}
          stroke={p.outline}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

function Head({ p }: PartProps) {
  return (
    <>
      {/* floppy ears, behind the head */}
      <Path
        d="M50 58 C28 50 14 78 20 108 C24 126 46 126 56 108 C62 96 62 70 50 58 Z"
        fill={p.furDark}
        stroke={p.outline}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <Path
        d="M150 58 C172 50 186 78 180 108 C176 126 154 126 144 108 C138 96 138 70 150 58 Z"
        fill={p.furDark}
        stroke={p.outline}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <Ellipse cx={100} cy={92} rx={62} ry={54} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      {/* eye patch */}
      <Ellipse cx={130} cy={84} rx={20} ry={22} fill={p.furDark} opacity={0.85} />
      <Highlight cx={74} cy={58} rx={13} ry={6} rot={-25} opacity={0.35} />
      {/* muzzle + nose */}
      <Ellipse cx={100} cy={113} rx={32} ry={24} fill={p.belly} />
      <Ellipse cx={100} cy={101} rx={10} ry={7} fill={p.nose} />
      <Ellipse cx={96.5} cy={98.8} rx={3.2} ry={1.8} fill="#FFFFFF" opacity={0.6} />
      <Cheeks p={p} cfg={face} />
    </>
  );
}

export const dog: SpeciesArt = {
  face,
  tail: { pivot: [138, 166], amp: 18, ms: 800 },
  shakesWhenRestless: true,
  Tail,
  Body,
  Head,
};

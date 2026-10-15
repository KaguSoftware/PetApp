import { Ellipse, Path } from 'react-native-svg';
import { Cheeks, type FaceCfg } from '../face';
import { FatStroke, Highlight, OUT } from '../shapes';
import type { PartProps, SpeciesArt } from './types';

const face: FaceCfg = { eyeY: 88, eyeDx: 31, mouthY: 108, cheekY: 104, cheekDx: 46 };

function Tail({ p }: PartProps) {
  return (
    <FatStroke
      d="M136 168 C176 176 194 142 178 118 C172 110 160 114 163 124"
      color={p.fur}
      width={14}
      p={p}
    />
  );
}

function Body({ p }: PartProps) {
  return (
    <>
      <Ellipse cx={100} cy={146} rx={44} ry={38} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      <Ellipse cx={100} cy={156} rx={26} ry={24} fill={p.belly} />
      <Highlight cx={78} cy={132} rx={9} ry={5} rot={-30} />
      {[80, 120].map((x) => (
        <Ellipse
          key={x}
          cx={x}
          cy={184}
          rx={13}
          ry={9.5}
          fill={p.fur}
          stroke={p.outline}
          strokeWidth={OUT}
        />
      ))}
      <Path
        d="M72 148 l8 -2 M70 158 l8 -1 M128 148 l-8 -2 M130 158 l-8 -1"
        stroke={p.furDark}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  );
}

function Head({ p }: PartProps) {
  const whisker = {
    stroke: p.outline,
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    opacity: 0.75,
  };
  return (
    <>
      {/* pointy ears, behind the head */}
      <Path
        d="M40 84 L44 34 Q45 24 54 29 L98 50 Z"
        fill={p.fur}
        stroke={p.outline}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <Path
        d="M160 84 L156 34 Q155 24 146 29 L102 50 Z"
        fill={p.fur}
        stroke={p.outline}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <Path
        d="M54 70 L56 42 Q57 38 61 40 L84 54 Z"
        fill={p.innerEar}
        strokeWidth={4}
        stroke={p.innerEar}
        strokeLinejoin="round"
      />
      <Path
        d="M146 70 L144 42 Q143 38 139 40 L116 54 Z"
        fill={p.innerEar}
        strokeWidth={4}
        stroke={p.innerEar}
        strokeLinejoin="round"
      />
      <Ellipse cx={100} cy={92} rx={64} ry={50} fill={p.fur} stroke={p.outline} strokeWidth={OUT} />
      <Path
        d="M100 46 v12 M88 48 l2 10 M112 48 l-2 10"
        stroke={p.furDark}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Highlight cx={72} cy={66} rx={12} ry={6} rot={-25} opacity={0.35} />
      {/* muzzle puffs + nose */}
      <Ellipse cx={88} cy={108} rx={15} ry={11} fill={p.belly} />
      <Ellipse cx={112} cy={108} rx={15} ry={11} fill={p.belly} />
      <Path
        d="M94 98 Q100 96 106 98 Q103 105 100 105 Q97 105 94 98 Z"
        fill="#F08FA0"
        stroke="#F08FA0"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Cheeks p={p} cfg={face} />
      {/* whiskers */}
      <Path d="M52 100 L22 94 M52 106 L20 108 M52 112 L24 122" fill="none" {...whisker} />
      <Path d="M148 100 L178 94 M148 106 L180 108 M148 112 L176 122" fill="none" {...whisker} />
    </>
  );
}

export const cat: SpeciesArt = {
  face,
  tail: { pivot: [136, 168], amp: 9, ms: 1500 },
  shakesWhenRestless: false,
  Tail,
  Body,
  Head,
};

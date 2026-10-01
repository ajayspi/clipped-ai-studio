import { POSE_DEFINITIONS, POSE_GRID_BBOXES } from './gemini-character-generator.ts';

export interface PoseFrame {
  svgPath: string;
  bbox: { x: number; y: number; w: number; h: number };
}

// Extract numbers and non-numbers from an SVG path
function tokenizePath(path: string) {
  const tokens = [];
  const regex = /([a-zA-Z]+)|(-?\d*\.?\d+)/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'cmd', val: match[1] });
    } else if (match[2]) {
      tokens.push({ type: 'num', val: parseFloat(match[2]) });
    }
  }
  return tokens;
}

export function interpolatePose(poseA: string, poseB: string, t: number): PoseFrame {
  const defA = POSE_DEFINITIONS.find(p => p.id === poseA);
  const defB = POSE_DEFINITIONS.find(p => p.id === poseB);

  if (!defA || !defB) {
    throw new Error(`Unknown pose key: ${!defA ? poseA : poseB}`);
  }

  const STICKMAN_PATHS: Record<string, string> = {
    pose_1: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L30,60 M50,50 L70,60 M50,70 L35,95 M50,70 L65,95',
    pose_2: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L25,60 M50,50 L85,35 M85,35 L80,32 M50,70 L35,95 M50,70 L65,95',
    pose_3: 'M50,25 A10,10 0 1,0 50,45 A10,10 0 1,0 50,25 M50,45 L50,75 M50,55 L25,35 M50,55 L75,35 M50,75 L35,95 M50,75 L65,95 M75,20 A5,5 0 1,0 75,30 M75,12 L75,16 M68,15 L71,18 M82,15 L79,18',
    pose_4: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L20,45 M50,50 L80,45 M50,70 L35,95 M50,70 L65,95',
    pose_5: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L35,55 L35,65 M50,50 L65,55 L65,65 M30,65 L70,65 L70,75 L30,75 Z M50,70 L35,95 M50,70 L65,95',
    pose_6: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L30,60 M50,50 L55,42 L45,35 M50,70 L35,95 M50,70 L65,95 M75,25 Q80,20 85,25 Q85,32 80,35 L80,38 M80,42 L80,43',
    pose_7: 'M40,20 A10,10 0 1,0 40,40 A10,10 0 1,0 40,20 M40,40 L40,65 L65,65 M40,50 L60,55 M65,65 L65,90 M30,65 L70,65',
    pose_8: 'M45,20 A10,10 0 1,0 45,40 A10,10 0 1,0 45,20 M45,40 L45,70 M45,50 L65,55 L75,52 M45,70 L35,95 M45,70 L55,95 M60,60 L80,60 L80,75 L60,75 Z',
    pose_9: 'M50,20 A10,10 0 1,0 50,40 A10,10 0 1,0 50,20 M50,40 L50,70 M50,50 L25,35 M50,50 L75,35 M50,70 L35,95 M50,70 L65,95 M50,10 L50,15 M40,12 L43,16 M60,12 L57,16'
  };

  const pathA = STICKMAN_PATHS[poseA] || STICKMAN_PATHS.pose_1;
  const pathB = STICKMAN_PATHS[poseB] || STICKMAN_PATHS.pose_1;

  if (poseA === poseB) {
    return {
      svgPath: pathA,
      bbox: { x: POSE_GRID_BBOXES[poseA][0], y: POSE_GRID_BBOXES[poseA][1], w: POSE_GRID_BBOXES[poseA][2] - POSE_GRID_BBOXES[poseA][0], h: POSE_GRID_BBOXES[poseA][3] - POSE_GRID_BBOXES[poseA][1] }
    };
  }

  const tokA = tokenizePath(pathA);
  const tokB = tokenizePath(pathB);

  let topologiesMatch = tokA.length === tokB.length;
  if (topologiesMatch) {
    for (let i = 0; i < tokA.length; i++) {
      if (tokA[i].type !== tokB[i].type || (tokA[i].type === 'cmd' && tokA[i].val !== tokB[i].val)) {
        topologiesMatch = false;
        break;
      }
    }
  }

  const boxA = POSE_GRID_BBOXES[poseA];
  const boxB = POSE_GRID_BBOXES[poseB];

  if (!topologiesMatch) {
    const useB = t >= 0.5;
    const path = useB ? pathB : pathA;
    const box = useB ? boxB : boxA;
    return {
      svgPath: path,
      bbox: { x: box[0], y: box[1], w: box[2] - box[0], h: box[3] - box[1] }
    };
  }

  let resPath = '';
  for (let i = 0; i < tokA.length; i++) {
    const a = tokA[i];
    const b = tokB[i];

    if (a.type === 'cmd') {
      resPath += a.val + ' ';
    } else {
      const numA = a.val as number;
      const numB = b.val as number;
      const interpolated = Number((numA + (numB - numA) * t).toFixed(2));
      resPath += (isFinite(interpolated) ? interpolated : 0) + ' ';
    }
  }

  const bbox = {
    x: boxA[0] + (boxB[0] - boxA[0]) * t,
    y: boxA[1] + (boxB[1] - boxA[1]) * t,
    w: (boxA[2] - boxA[0]) + ((boxB[2] - boxB[0]) - (boxA[2] - boxA[0])) * t,
    h: (boxA[3] - boxA[1]) + ((boxB[3] - boxB[1]) - (boxA[3] - boxA[1])) * t
  };

  return {
    svgPath: resPath.trim(),
    bbox
  };
}

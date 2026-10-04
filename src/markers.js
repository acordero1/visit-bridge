import qrcode from '../vendor/qr-encode.js';
import jsQR from '../vendor/qr-decode.js';
import { isValidCard } from './cards.js';
import { MARKER_PREFIX, markerPayload } from './marker-data.js';

export function markerMatrix(payload) {
  if (!/^VB1:[a-f0-9]{32}$/.test(payload)) throw new Error('Use a valid Visit Bridge replay reference.');
  const code = qrcode(0,'M'); code.addData(payload,'Byte'); code.make();
  return Array.from({length:code.getModuleCount()},(_,row)=>Array.from({length:code.getModuleCount()},(_,col)=>code.isDark(row,col)));
}
export function markerSVG(payload) {
  const matrix=markerMatrix(payload),size=matrix.length+8;
  const path=matrix.flatMap((row,y)=>row.flatMap((dark,x)=>dark?[`M${x+4},${y+4}h1v1h-1z`]:[])).join('');
  return `<svg class="replay-qr" role="img" aria-label="Visit Bridge replay marker" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
export function resolveMarker(payload, cards) {
  if (typeof payload!=='string' || !new RegExp('^'+MARKER_PREFIX+'[a-f0-9]{32}$').test(payload)) throw new Error('This is not a Visit Bridge care-card marker.');
  const found=cards.filter(card=>isValidCard(card)&&markerPayload(card)===payload);
  if(found.length!==1)throw new Error('This marker is unknown, outdated or unavailable on this device. Open a saved card manually; no other card was selected.');
  return structuredClone(found[0]);
}
export function decodeDetection(data,width,height) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1280||height>1280||data.length!==width*height*4)throw new Error('Unsupported scan image.');
  const found=jsQR(data,width,height,{inversionAttempts:'dontInvert'});
  return found?{data:found.data,location:found.location}:null;
}
export const decodeMarker=(data,width,height)=>decodeDetection(data,width,height)?.data||null;

import { approvedContentStamp } from './understanding.js';

export const MARKER_PREFIX = 'VB1:';
export function validReplayMarker(marker, card) {
  return marker === null || Boolean(marker && Object.keys(marker).sort().join(',') === 'approvedStamp,token,version'
    && marker.version === 1 && typeof marker.token === 'string' && /^[a-f0-9]{32}$/.test(marker.token)
    && marker.approvedStamp === approvedContentStamp(card));
}
export function bindReplayMarker(card, previous = null, environment = globalThis) {
  const marker = previous?.replayMarker;
  const reusable = previous?.id === card.id && marker && validReplayMarker(marker, card);
  const token = reusable ? marker.token : Array.from(environment.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
  return {...card, schemaVersion:7, replayMarker:{version:1, token, approvedStamp:approvedContentStamp(card)}};
}
export function markerPayload(card) {
  return card?.replayMarker && validReplayMarker(card.replayMarker,card) ? MARKER_PREFIX + card.replayMarker.token : null;
}

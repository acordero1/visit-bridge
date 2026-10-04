import { isValidCard } from './cards.js';
import { patientLines } from './understanding.js';

export function replaySteps(card) {
  if(!isValidCard(card))throw new Error('Only an approved card can be replayed.');
  // Free-form wording stays intact. Structured wording follows its approved line order.
  return card.schemaVersion>=4 && card.handoff ? patientLines(card).filter(line=>line.text.trim()) : [{text:card.instruction,symbol:card.template?'action':'note'}];
}
export function approvedStep(card,index) {
  if(!Number.isInteger(index))throw new Error('Choose an approved step.');
  const step=replaySteps(card)[index];if(!step)throw new Error('Choose an approved step.');return step;
}

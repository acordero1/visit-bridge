import { isValidCard } from './cards.js';
import { patientLines } from './understanding.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function portableStamp(card) { return JSON.stringify([card?.id,card?.instruction,card?.language,card?.approvedRevision,card?.patientApprovedRevision,card?.confirmedAt,card?.patientApprovedAt,card?.translation?.pack.version]); }
export function patientCopy(card) {
  if(!isValidCard(card))throw new Error('Approve this exact card before printing or downloading.');
  const es=card.language==='es',labels=card.translation?.pack.labels;
  return {text:card.instruction,language:card.language,preparedAt:card.patientApprovedAt||card.confirmedAt,
    heading:es?labels.nextStep:'YOUR NEXT STEP',approved:es?labels.approved:'Worker confirmed',fromWorker:es?labels.fromWorker:'From your health worker',
    notice:es?labels.demoNotice:'Fictional demonstration. Use sample information only.',
    lines:patientLines(card).map(line=>({text:line.text,symbol:line.symbol})),
    preparedLabel:es?'Preparada el':'Prepared on',copyLabel:es?'Esta copia no se actualiza automáticamente.':'This copy does not update automatically.'};
}
const symbols={action:'→',place:'⌖',date:'▦',time:'◷',item:'□',task:'✓',note:'•'};
export function patientCopyMarkup(copy) {
  const date=new Date(copy.preparedAt).toLocaleDateString(copy.language==='es'?'es':'en',{dateStyle:'long'});
  return `<article class="portable-card" lang="${copy.language}"><header><strong>VISIT BRIDGE</strong><span>${escape(copy.approved)}</span></header><p class="portable-notice">${escape(copy.notice)}</p><h1>${escape(copy.heading)}</h1><div class="portable-lines">${copy.lines.map(line=>`<p><span class="portable-symbol" aria-hidden="true">${symbols[line.symbol]||'•'}</span><span>${escape(line.text)||'&nbsp;'}</span></p>`).join('')}</div><footer><p>${escape(copy.fromWorker)} · ${copy.language==='es'?'Español':'English'}</p><p>${escape(copy.preparedLabel)} ${escape(date)}</p><small>${escape(copy.copyLabel)}</small></footer></article>`;
}
export const PORTABLE_CSS = `*{box-sizing:border-box}body{margin:0;background:#fff;color:#172d25;font-family:Arial,sans-serif}.portable-card{max-width:720px;margin:24px auto;padding:32px;border:2px solid #263c32;border-radius:12px}.portable-card header{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:14px}.portable-card h1{font-size:19px;letter-spacing:.08em;margin:32px 0 16px}.portable-notice{padding:12px;border:1px solid #666;font-size:14px;line-height:1.5}.portable-lines p{display:flex;gap:16px;margin:16px 0;font-size:25px;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}.portable-symbol{width:24px;flex-shrink:0}.portable-card footer{border-top:1px solid #777;margin-top:28px;padding-top:12px;font-size:15px;line-height:1.5}.portable-card footer p{margin:6px 0}.portable-card small{font-size:13px}@media(max-width:480px){.portable-card{margin:12px;padding:20px}.portable-lines p{font-size:22px}}@media print{@page{margin:16mm}.portable-card{max-width:none;border:1px solid #333;margin:0;padding:18px;border-radius:0}.portable-lines p{color:#000;font-size:20pt;break-inside:avoid}.portable-card footer{break-inside:avoid}body{color:#000}}`;
export function patientCopyHTML(card) {
  const copy=patientCopy(card);
  return `<!doctype html><html lang="${copy.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Visit Bridge · ${escape(copy.heading)}</title><style>${PORTABLE_CSS}</style></head><body>${patientCopyMarkup(copy)}</body></html>`;
}
export function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  // External copies already handed to the browser cannot be recalled by locking the app.
  setTimeout(()=>URL.revokeObjectURL(url),1000);return url;
}

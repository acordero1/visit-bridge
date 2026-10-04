export const LANGUAGE_OPTIONS = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Español' }];
export const TEMPLATE_ID = 'return-visit-v1';
export const EN_WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const LOCATIONS = { clinic: 'the clinic', 'community-clinic': 'the community clinic' };
export function validTemplate(template) {
  if (template?.id !== TEMPLATE_ID || !Object.hasOwn(LOCATIONS, template.location)
    || typeof template.date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(template.date)) return false;
  const day = new Date(`${template.date}T12:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === template.date;
}
export function templateInstruction(template, pack = null) {
  if (!validTemplate(template)) throw new Error('Choose a real date and a supported clinic for the return visit.');
  const weekday = new Date(`${template.date}T12:00:00Z`).getUTCDay();
  if (!pack) return `Return to ${LOCATIONS[template.location]} on ${EN_WEEKDAYS[weekday]}, ${template.date}.`;
  if (!validPack(pack)) throw new Error('The Spanish pack is incomplete or unsupported.');
  return pack.sentence.replace('{location}', pack.locations[template.location]).replace('{weekday}', pack.weekdays[weekday]).replace('{date}', template.date);
}
export function validPack(pack) {
  const required = ['nextStep','fromWorker','approved','demoNotice','hearStep','play','again','pause','resume','stop','ready','starting','speaking','paused','pausing','resuming','ended','checking','unavailable','error','checkVoice','voice','playbackNote'];
  return pack?.id === 'visit-bridge-es-return-visit' && pack.version === '1.0.0' && pack.language === 'es' && pack.sourceLanguage === 'en'
    && pack.templateId === TEMPLATE_ID && pack.reviewStatus === 'demonstration-unvalidated'
    && pack.professionalReview === null && pack.communityReview === null
    && pack.sentence === 'Vuelva a {location} el {weekday}, {date}.'
    && JSON.stringify(pack.weekdays) === JSON.stringify(['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])
    && pack.locations?.clinic === 'la clínica' && pack.locations?.['community-clinic'] === 'la clínica comunitaria'
    && ['{location}','{weekday}','{date}'].every(token => pack.sentence.split(token).length === 2)
    && !pack.sentence.replace(/\{(?:location|weekday|date)\}/g, '').includes('{')
    && Array.isArray(pack.weekdays) && pack.weekdays.length === 7 && pack.weekdays.every(word => typeof word === 'string' && word.length > 0 && word.length < 40)
    && Object.keys(LOCATIONS).every(key => typeof pack.locations?.[key] === 'string' && pack.locations[key].length > 0 && pack.locations[key].length < 80)
    && required.every(key => typeof pack.labels?.[key] === 'string' && pack.labels[key].length > 0 && pack.labels[key].length < 250);
}
export function validTranslation(translation, template, source, finalText) {
  if (!validPack(translation?.pack) || !validTemplate(template) || translation.sourceRevision === undefined) return false;
  try { return source === templateInstruction(template) && finalText === templateInstruction(template, translation.pack); } catch { return false; }
}

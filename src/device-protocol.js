// Human observations are deliberately separate from browser API availability.
export const DEVICE_CHECKS = [
  ['cache', 'Prepare online', 'Open Visit Bridge online. Wait for Offline access ready. Cache this checklist too. A new origin or Safari/Home Screen context has separate storage.'],
  ['approval', 'Approve a fictional handoff', 'Create an English action/date/place/items card, review every field and the final words, record understanding, grant saving permission and save. Edits must require fresh approval.'],
  ['paper', 'Prepare the marker', 'Download the approved patient copy from this phone. Print it or show the downloaded copy on another screen. Compare exact words/date/place and scan from the same Safari vault. Record paper versus screen.'],
  ['airplane', 'Disconnect the phone', 'Turn on Airplane Mode and separately turn off Wi-Fi. Verify cellular and Wi-Fi are disabled. Browser online status alone cannot establish this.'],
  ['reload', 'Reopen offline', 'Reload Visit Bridge offline, unlock and reopen the saved card. Also create, approve and save a second fictional typed card offline. Check its contents after another reload.'],
  ['scan', 'Find the right card', 'Start Scan care card explicitly, allow camera, scan the prepared marker and compare the found words. Camera must stop before explicit Open approved replay.'],
  ['unknown', 'Refuse unknown references', 'Enter VB1:00000000000000000000000000000000. It must refuse lookup. Changing/reapproving the saved card must invalidate its old marker. Do not modify real records.'],
  ['marker', 'Track the expected marker', 'Start marker camera in replay. Move/tilt the marker gently under usable light. Hide it and show a different marker: the overlay should hide. Exact complete words must remain readable below. Record recovery and scan time.'],
  ['steps', 'Replay approved steps', 'Previous/Next and Full card must show the approved words in order. No added facts. Check narrow viewport, larger text, readable contrast and VoiceOver navigation.'],
  ['audio', 'Listen offline', 'Explicitly read the selected step aloud and stop it. Check intelligibility, matching language and complete words offline. A reported local voice does not prove speaker output or offline operation.'],
  ['cleanup', 'Stop media and lock', 'Exit, lock, background Safari and reopen. Camera/audio must stop; the vault must lock according to session behavior. Decline camera once and verify typed lookup/plain card remain available.'],
  ['spanish', 'Check the Spanish demonstration', 'Install the Spanish pack online beforehand. Offline, use only its supported return-date-and-clinic template. Check date/place and the unvalidated notice in card, paper and replay. Record fluent review separately.'],
  ['model', 'Measure optional local AI', 'If installed, run the same short supported English wording task cold and warm, record duration and corrections. Verify approval remains required and rejected/uncertain output keeps typed review. Report unavailable if the phone cannot run it.'],
  ['spatial', 'Check surface AR availability', 'Use spatial AR only if the device supports it. Verify placement/resize/rotation/reposition and exit. Record unsupported explicitly; marker camera remains a separate capability.'],
  ['transfer', 'Verify optional model transfer', 'If testing packs, export/import this release’s public model pack, compare the roughly 207 MB transfer size and verify inference offline. Record device/storage failures. No care records are exported in the pack.'],
  ['language-review', 'Record genuine language review', 'Record reviewer qualification and the reviewed version only if a fluent/qualified person actually reviews it. Keep Spanish marked unvalidated until evidence supports a change.'],
  ['comparison', 'Compare with the plain card', 'Use the same fictional task with plain card and AR. Record task/time/corrections and actual feedback. Do not infer better comprehension or health outcomes from visual engagement.']
].map(([id,title,instruction])=>({id,title,instruction}));
export const RESULT_STATUSES = ['pending','passed','failed','unsupported'];
export function makeDeviceReport({device,os,browser,context,markerMedium,checks,capabilities,recordedAt}) {
  const observed = DEVICE_CHECKS.map(check => {
    const input=checks[check.id]??{},status=RESULT_STATUSES.includes(input.status)?input.status:'pending';
    const note=String(input.note??'').trim().slice(0,1200);
    if(status!=='pending'&&!note)throw new Error(`Record an observation for: ${check.title}`);
    return {id:check.id,title:check.title,status,observation:note};
  });
  if(observed.some(x=>x.status!=='pending')&&(!device.trim()||!os.trim()||!browser.trim()))throw new Error('Record phone model, OS and browser before exporting observations.');
  return {schemaVersion:1,recordedAt,origin:capabilities.origin,device:{model:device.trim(),os:os.trim(),browser:browser.trim(),context,markerMedium},capabilitySnapshot:capabilities,observations:observed,limitations:'Manual tester observations. API availability is not a hardware pass. No clinical or comprehension benefit established. No patient information belongs in this report.'};
}

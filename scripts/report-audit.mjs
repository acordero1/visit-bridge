import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const audit=JSON.parse(await read('docs/feature-audit.json'));
const statuses=new Set(['implemented','partial','missing','needs-validation','future']);
const errors=[],ids=new Set(),sections=new Set(),parts=new Set();
for(const item of audit.items){
 if(ids.has(item.id))errors.push(`Duplicate ID: ${item.id}`);ids.add(item.id);
 if(!statuses.has(item.status))errors.push(`Invalid status: ${item.id}`);
 for(const field of ['title','remaining','acceptance','phase'])if(typeof item[field]!=='string'||!item[field].trim())errors.push(`Missing ${field}: ${item.id}`);
 for(const section of item.sourceSections||[]){if(!Number.isInteger(section)||section<1||section>21)errors.push(`Invalid schematic section: ${item.id}`);sections.add(section);}
 for(const part of item.timelineParts||[]){if(!Number.isInteger(part)||part<0||part>12)errors.push(`Invalid timeline part: ${item.id}`);parts.add(part);}
 for(const evidence of item.evidence||[]){
  if(!/^(src|scripts|docs|vendor|packs)\/[\w./-]+$|^(README\.md|sw\.js|manifest\.webmanifest)$/.test(evidence.file)||evidence.file.includes('..')){errors.push(`Invalid evidence path: ${item.id}`);continue;}
  try{if(!(await read(evidence.file)).includes(evidence.anchor))errors.push(`Evidence anchor missing: ${item.id} -> ${evidence.file}`);}catch{errors.push(`Evidence file missing: ${item.id} -> ${evidence.file}`);}
 }
 if(item.status==='implemented'&&!item.evidence?.length)errors.push(`Implemented item lacks code evidence: ${item.id}`);
}
for(let n=1;n<=21;n++)if(!sections.has(n))errors.push(`Schematic section ${n} has no mapping`);
for(let n=0;n<=12;n++)if(!parts.has(n))errors.push(`Timeline part ${n} has no mapping`);
const active=new Set(),done=new Set();
function visit(id){if(active.has(id)){errors.push(`Dependency cycle at ${id}`);return;}if(done.has(id))return;active.add(id);const item=audit.items.find(i=>i.id===id);for(const dep of item.dependencies||[]){if(!ids.has(dep))errors.push(`Unknown dependency: ${id} -> ${dep}`);else visit(dep);}active.delete(id);done.add(id);}
for(const item of audit.items)visit(item.id);
for(const path of Object.values(audit.sources).filter(x=>x.endsWith('.md')))try{await read(path);}catch{errors.push(`Missing archived source: ${path}`);}
if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exitCode=1;}else{
 const counts=audit.items.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
 console.log(`Mapped ${audit.items.length} requirements across all 21 schematic sections and 13 original timeline parts.`);
 console.log(Object.entries(counts).map(([key,value])=>`${key}: ${value}`).join(' | '));
 console.log('Source anchors and dependency graph checked. This does not execute the app or prove feature safety/device operation.');
 if(process.argv.includes('--write')){
  const lines=['# Visit Bridge feature audit','',`Assessment baseline: Git commit \`${audit.assessedCommit}\`, ${audit.date}.`,'',audit.policy,'',audit.verificationScope,'','## Coverage summary','',...Object.entries(counts).map(([key,value])=>`- **${key}:** ${value}`),'','These are requirement counts with unequal scope, not a completion percentage. A source-section mapping is traceability, not proof of perfect semantic completeness.','', 'The archived full schematic and timeline remain the authoritative feature reference; any newly discovered omission must be added here, not silently removed.','', '## Ordered remaining work','',...(await read('docs/remaining-build-plan.md')).split('\n'),'','## Requirement-by-requirement evidence',''];
  for(const item of audit.items){lines.push(`### ${item.title} (${item.id})`,'',`**Status:** ${item.status} · **Phase:** ${item.phase} · **Original schematic:** ${item.sourceSections.join(', ')} · **Original timeline:** ${item.timelineParts.join(', ')}`,'',`**Evidence:** ${item.evidence.length?item.evidence.map(e=>`\`${e.file}\` — \`${e.anchor}\``).join('; '):'No implementation evidence recorded.'}`,'',`**Remaining:** ${item.remaining}`,'',`**Accept when:** ${item.acceptance}`,'',`**Dependencies:** ${item.dependencies.join(', ')||'None.'}`,'');}
  const report=lines.join('\n');await mkdir(new URL('outputs/',root),{recursive:true});
  for(const path of ['docs/feature-audit.md','outputs/feature-audit.md'])await writeFile(new URL(path,root),report);
  for(const name of ['original-schematic.md','original-timeline.md'])await writeFile(new URL('outputs/'+name,root),await read('docs/'+name));
  console.log(`Report saved: ${fileURLToPath(new URL('outputs/feature-audit.md',root))}`);
 }
}

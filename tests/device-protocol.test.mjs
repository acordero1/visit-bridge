import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CHECKS, makeDeviceReport } from '../src/device-protocol.js';
const input=()=>({device:'iPhone test',os:'iOS test',browser:'Safari test',context:'Safari tab',markerMedium:'Second screen',checks:{},capabilities:{origin:'https://example.test',cameraAPIPresent:true},recordedAt:'2026-10-04T00:00:00Z'});
test('API availability never turns human checks into passes',()=>{
 const report=makeDeviceReport(input());assert.equal(report.observations.length,DEVICE_CHECKS.length);assert.ok(report.observations.every(check=>check.status==='pending'));
});
test('Recorded outcomes require observations and device identification',()=>{
 const value=input();value.checks.scan={status:'passed',note:''};assert.throws(()=>makeDeviceReport(value),/observation/);
 value.checks.scan.note='Printed fictional marker matched offline.';value.device='';assert.throws(()=>makeDeviceReport(value),/phone model/);
 value.device='iPhone test';value.checks.spatial={status:'unsupported',note:'Browser reported unsupported.'};const report=makeDeviceReport(value);assert.equal(report.observations.find(c=>c.id==='spatial').status,'unsupported');
 value.checks.scan.status='invented';assert.equal(makeDeviceReport(value).observations.find(c=>c.id==='scan').status,'pending');
});

import { approvedStep, replaySteps } from './replay.js';
import { spanishHandoffSupported } from './handoff.js';
import { isValidCard } from './cards.js';

export function cardLines(context, text, width) {
  const lines = []; let line = '';
  for (const word of text.split(/(\n|[^\S\n]+)/)) {
    if (word === '\n') { if (line) lines.push(line); line = ''; continue; }
    if (!word.trim()) continue;
    if (context.measureText(word).width > width) {
      if (line) { lines.push(line); line = ''; }
      let part = '';
      for (const character of word) {
        if (part && context.measureText(part + character).width > width) { lines.push(part); part = ''; }
        part += character;
      }
      line = part;
    } else if (line && context.measureText(`${line} ${word}`).width > width) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
export function placementMatrix(point, yaw, width = .55) {
  const c = Math.cos(yaw), s = Math.sin(yaw), height = width * 1.5;
  return new Float32Array([c*width,0,-s*width,0, 0,height,0,0, s,0,c,0, point[0],point[1]+height/2+.04,point[2],1]);
}
function drawReplaySymbol(ctx,symbol,x,y) {
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#174e3d';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(symbol==='date'){ctx.rect(0,12,90,76);ctx.moveTo(0,34);ctx.lineTo(90,34);ctx.moveTo(22,0);ctx.lineTo(22,22);ctx.moveTo(68,0);ctx.lineTo(68,22);}
  else if(symbol==='place'){ctx.moveTo(45,88);ctx.bezierCurveTo(5,50,5,12,45,8);ctx.bezierCurveTo(85,12,85,50,45,88);ctx.moveTo(59,34);ctx.arc(45,34,14,0,Math.PI*2);}
  else if(symbol==='item'){ctx.rect(0,24,90,64);ctx.moveTo(24,24);ctx.lineTo(24,5);ctx.lineTo(66,5);ctx.lineTo(66,24);}
  else if(symbol==='time'){ctx.arc(45,45,40,0,Math.PI*2);ctx.moveTo(45,20);ctx.lineTo(45,45);ctx.lineTo(65,59);}
  else if(symbol==='task'){ctx.moveTo(10,45);ctx.lineTo(34,70);ctx.lineTo(82,15);}
  else if(symbol==='action'){ctx.moveTo(0,45);ctx.lineTo(88,45);ctx.moveTo(55,15);ctx.lineTo(88,45);ctx.lineTo(55,75);}
  else{ctx.rect(12,4,66,84);ctx.moveTo(26,26);ctx.lineTo(64,26);ctx.moveTo(26,46);ctx.lineTo(64,46);ctx.moveTo(26,66);ctx.lineTo(56,66);}
  ctx.stroke();ctx.restore();
}
export function createARRenderer(session, card, environment = globalThis) {
  if (!isValidCard(card)) throw new Error('Only an approved card can be shown in AR.');
  const canvas = environment.document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, xrCompatible: true });
  if (!gl) throw new Error('This device cannot create the AR graphics view.');
  let program, buffer, texture, disposed = false;
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('AR graphics could not be prepared.'); }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 aPosition; attribute vec2 aUV; uniform mat4 uProjection; uniform mat4 uView; uniform mat4 uModel; varying vec2 vUV; void main(){vUV=aUV;gl_Position=uProjection*uView*uModel*vec4(aPosition,0.0,1.0);}');
    const fragment = compile(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D uTexture; uniform float uOpacity; varying vec2 vUV; void main(){vec4 c=texture2D(uTexture,vUV);gl_FragColor=vec4(c.rgb,c.a*uOpacity);}');
    program = gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('AR graphics could not be prepared.');
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,0, .5,-.5,1,0, -.5,.5,0,1, -.5,.5,0,1, .5,-.5,1,0, .5,.5,1,1]),gl.STATIC_DRAW);
    const image = environment.document.createElement('canvas'); image.width=1024; image.height=1536;
    const ctx=image.getContext('2d'); if (!ctx) throw new Error('The AR care card could not be drawn.');
    const es=card.language==='es', labels=card.translation?.pack.labels;
    function paint(stepIndex=null) {
    const text=stepIndex===null?card.instruction:approvedStep(card,stepIndex).text;
    ctx.fillStyle='#fffdf5'; ctx.fillRect(0,0,1024,1536);
    ctx.fillStyle='#174e3d'; ctx.fillRect(0,0,1024,150); ctx.fillStyle='white'; ctx.font='bold 40px sans-serif'; ctx.fillText(stepIndex===null?'VISIT BRIDGE':`${es?'PASO':'STEP'} ${stepIndex+1} / ${replaySteps(card).length}`,64,88);
    let y=215;
    if (es) { ctx.fillStyle='#7a4b00'; ctx.font='bold 29px sans-serif'; for (const line of cardLines(ctx,labels.demoNotice,896)) {ctx.fillText(line,64,y);y+=40;} y+=35; }
    ctx.fillStyle='#174e3d';ctx.font='bold 36px sans-serif';ctx.fillText(es?labels.nextStep:'YOUR NEXT STEP',64,y);y+=72;
    if(stepIndex!==null){drawReplaySymbol(ctx,approvedStep(card,stepIndex).symbol,64,y);y+=130;}
    // Pictograms describe the supported return action only; no inferred medical imagery.
    if(stepIndex===null && card.template && spanishHandoffSupported(card.handoff,card.template)) { ctx.strokeStyle='#174e3d';ctx.lineWidth=7;ctx.strokeRect(64,y,94,88);ctx.beginPath();ctx.moveTo(64,y+25);ctx.lineTo(158,y+25);ctx.moveTo(85,y-9);ctx.lineTo(85,y+12);ctx.moveTo(136,y-9);ctx.lineTo(136,y+12);ctx.stroke();ctx.strokeRect(195,y+10,80,78);ctx.beginPath();ctx.moveTo(235,y+29);ctx.lineTo(235,y+68);ctx.moveTo(215,y+48);ctx.lineTo(255,y+48);ctx.stroke();y+=135; }
    let size=68, lines, fits=false;
    for (;size>=18;size-=2) {ctx.font=`bold ${size}px sans-serif`;lines=cardLines(ctx,text,896); if(lines.length*size*1.35<=1300-y) {fits=true;break;}}
    if(!fits) throw new Error('This instruction is too long for readable AR. Use the regular card.');
    ctx.fillStyle='#173b30'; for(const line of lines){ctx.fillText(line,64,y);y+=size*1.35;}
    ctx.fillStyle='#45675a';ctx.font='30px sans-serif';ctx.fillText(es?labels.fromWorker:'From your health worker',64,1440);ctx.fillText(es?'Español':'English',64,1490);
    }
    paint();
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const layer=new environment.XRWebGLLayer(session,gl);session.updateRenderState({baseLayer:layer});
    const uniforms=Object.fromEntries(['uProjection','uView','uModel','uOpacity','uTexture'].map(name=>[name,gl.getUniformLocation(program,name)]));
    return {
      setStep(index=null){if(disposed)return;paint(index);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);},
      draw(pose, matrix, placed) {
        if(disposed)return;
        gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        if(!pose||!matrix)return;
        gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        for(const [name,offset] of [['aPosition',0],['aUV',8]]){const index=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,2,gl.FLOAT,false,16,offset);}
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.uTexture,0);gl.uniform1f(uniforms.uOpacity,placed?1:.5);gl.uniformMatrix4fv(uniforms.uModel,false,matrix);
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        for(const view of pose.views){const v=layer.getViewport(view);gl.viewport(v.x,v.y,v.width,v.height);gl.uniformMatrix4fv(uniforms.uProjection,false,view.projectionMatrix);gl.uniformMatrix4fv(uniforms.uView,false,view.transform.inverse.matrix);gl.drawArrays(gl.TRIANGLES,0,6);}
      },
      dispose(){if(disposed)return;disposed=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
    };
  } catch(error) { if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();throw error; }
}

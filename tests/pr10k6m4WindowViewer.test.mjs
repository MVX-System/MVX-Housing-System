import test from 'node:test';
import assert from 'node:assert/strict';
import {MIN_ZOOM,MAX_ZOOM,boundedZoom,panBounds,clampPan,zoomAt,movedPan} from '../src/utils/meterDocumentViewerMath.mjs';

test('fit is the minimum zoom',()=>assert.equal(MIN_ZOOM,1));
test('maximum zoom permits reading details',()=>assert.equal(MAX_ZOOM,12));
test('zoom never below fit',()=>assert.equal(boundedZoom(0.05),1));
test('zoom never above maximum',()=>assert.equal(boundedZoom(100),12));
test('non-finite zoom fails to fit',()=>assert.equal(boundedZoom(NaN),1));
test('fit image has no panning',()=>assert.deepEqual(panBounds(1000,600,2000,1200,1),{x:0,y:0}));
test('zoomed image can pan',()=>assert.deepEqual(panBounds(1000,600,2000,1200,2),{x:500,y:300}));
test('portrait image has correct axis limits',()=>assert.deepEqual(panBounds(1000,600,800,1600,2),{x:0,y:300}));
test('pan stays inside image bounds',()=>assert.deepEqual(clampPan({x:999,y:-999},{x:200,y:180}),{x:200,y:-180}));
test('zoom toward centre retains centre pan',()=>assert.deepEqual(zoomAt({zoom:1,x:0,y:0},2,{x:500,y:300},{width:1000,height:600},{width:2000,height:1200}),{zoom:2,x:0,y:0}));
test('anchor-centered zoom shifts toward pointer',()=>assert.deepEqual(zoomAt({zoom:1,x:0,y:0},2,{x:750,y:450},{width:1000,height:600},{width:2000,height:1200}),{zoom:2,x:-250,y:-150}));
test('drag is clamped',()=>assert.deepEqual(movedPan({zoom:2,x:0,y:0},600,-600,{width:1000,height:600},{width:2000,height:1200}),{zoom:2,x:500,y:-300}));
test('missing dimensions safely prohibit pan',()=>assert.deepEqual(panBounds(0,600,2000,1200,2),{x:0,y:0}));
test('nonfinite pan resets to zero',()=>assert.deepEqual(clampPan({x:NaN,y:Infinity},{x:10,y:10}),{x:0,y:0}));

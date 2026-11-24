import { Resvg, initWasm } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { readSharedPlan, resultURL } from '../../src/share-plan.js';
import { resultImageSVG } from '../../server/result-image.js';

let initialized;
let assetPromise;
const base64 = bytes => {
  let value='';
  for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(value);
};
async function assets(env,origin) {
  if (!assetPromise) assetPromise = (async()=>{
    const paths=['/assets/city-of-deland-seal.png','/assets/share-deland-landmark-puzzle.jpg',...['400','600','800'].map(w=>`/assets/fonts/inter-${w}.ttf`)];
    const buffers=await Promise.all(paths.map(async path=>{
      const r=await env.ASSETS.fetch(new Request(new URL(path,origin)));
      if(!r.ok)throw new Error(`Missing rendering asset: ${path}`);
      return new Uint8Array(await r.arrayBuffer());
    }));
    return {seal:{href:`data:image/png;base64,${base64(buffers[0])}`},illustration:{href:`data:image/jpeg;base64,${base64(buffers[1])}`,width:960,height:576},fonts:buffers.slice(2)};
  })().catch(error=>{assetPromise=null;throw error;});
  return assetPromise;
}
export async function onRequest({ request, env, waitUntil }) {
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const url=new URL(request.url);
  const plan=readSharedPlan(url);
  if(!plan)return new Response('Invalid budget image',{status:400,headers:{'Cache-Control':'no-store'}});
  const cacheKey=new Request(resultURL(url.origin,plan.values,plan,true));
  const cached=await caches.default.match(cacheKey);
  if(cached)return request.method==='HEAD'?new Response(null,{headers:cached.headers}):cached;
  try {
    initialized ??= initWasm(wasm).catch(error=>{initialized=null;throw error;});
    const [,data]=await Promise.all([initialized,assets(env,url.origin)]);
    const renderer=new Resvg(resultImageSVG(plan,data),{font:{fontBuffers:data.fonts,defaultFontFamily:'Inter'}});
    let rendered;
    let png;
    try { rendered=renderer.render(); png=rendered.asPng().slice(); }
    finally { rendered?.free();renderer.free(); }
    const response=new Response(png,{headers:{'Content-Type':'image/png','Content-Length':String(png.length),'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
    waitUntil(caches.default.put(cacheKey,response.clone()));
    return request.method==='HEAD'?new Response(null,{headers:response.headers}):response;
  } catch(error) {
    console.error('Budget image rendering failed',error);
    return new Response('Image temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30'}});
  }
}

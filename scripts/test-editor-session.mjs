import assert from 'node:assert/strict';
const origin=process.argv[2] || 'http://localhost:3225';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local test targets only');
const jar=new Map();
async function request(method,body,site=origin){
 const response=await fetch(origin+'/api/editor/session',{method,headers:{Origin:site,'Content-Type':'application/json',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},...(body===undefined?{}:{body:JSON.stringify(body)})});
 for(const cookie of response.headers.getSetCookie()){const [name,value]=cookie.split(';')[0].split('=');if(value)jar.set(name,value);else jar.delete(name);}
 return response;
}
assert.equal((await request('PUT')).status,401);
let response=await request('POST',{email:'owner@example.test',password:'local-test-only'});assert.equal(response.status,200);
assert.deepEqual(await response.json(),{owner:true});
const refresh=response.headers.getSetCookie().find(s=>s.startsWith('demiz-owner-refresh='));
assert(refresh);assert.match(refresh,/HttpOnly/i);assert.match(refresh,/SameSite=strict/i);assert.match(refresh,/Path=\/api\/editor\/session/i);assert.doesNotMatch(refresh,/Max-Age|Expires/i);
jar.delete('demiz-owner');
assert.equal((await request('GET')).status,401);
assert.equal((await request('PUT',undefined,'https://invalid.example')).status,403);
assert.equal((await request('PUT')).status,200);
assert.equal((await request('GET')).status,200);
jar.set('demiz-owner-refresh','invalid');jar.delete('demiz-owner');assert.equal((await request('PUT')).status,401);
await request('POST',{email:'owner@example.test',password:'local-test-only'});
assert.equal((await request('DELETE')).status,200);assert.equal(jar.size,0);
assert.equal((await request('PUT')).status,401);
console.log('PASS: refresh cookie protection, anonymous/invalid/CSRF rejection, renewal, no token in JSON, and logout clears both cookies.');

import {loadEnv} from 'vite';
import {readFile} from 'node:fs/promises';

const env=loadEnv('production',process.cwd(),'VITE_');
const publicHttps=value=>{
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!['localhost','127.0.0.1','::1'].includes(url.hostname);}
  catch{return false;}
};
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const checks={
  apiHttpsConfigured:publicHttps(env.VITE_API_BASE_URL),
  privacyPolicyConfigured:publicHttps(env.VITE_PRIVACY_POLICY_URL),
  termsConfigured:publicHttps(env.VITE_TERMS_URL),
  platformVersionsPinned:['zmp-sdk','zmp-ui'].every(name=>/^\d+\.\d+\.\d+$/.test(pkg.dependencies[name]))&&/^\d+\.\d+\.\d+$/.test(pkg.devDependencies['zmp-vite-plugin']),
};
console.log(JSON.stringify(checks,null,2));
if(Object.values(checks).some(value=>!value))process.exitCode=1;

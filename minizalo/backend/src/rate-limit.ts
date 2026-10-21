import type {RequestHandler} from 'express';

type Bucket = {count:number;expires:number};

// Process-local safety net. Multi-replica deployments also need a shared edge limit.
export function createRateLimiter(limit:number,windowMs=60000,key?:(req:Parameters<RequestHandler>[0],res:Parameters<RequestHandler>[1])=>string,now=Date.now):RequestHandler {
  const buckets=new Map<string,Bucket>();
  return (req,res,next)=>{
    const identity=key?key(req,res):req.ip||req.socket.remoteAddress||'unknown';
    const time=now();
    let bucket=buckets.get(identity);
    if(!bucket||bucket.expires<=time){
      if(buckets.size>=10000)for(const [id,value] of buckets)if(value.expires<=time)buckets.delete(id);
      if(buckets.size>=10000&&!buckets.has(identity)){
        res.set('Retry-After','60').status(429).json({success:false,statusCode:429,message:'Too many requests'});return;
      }
      bucket={count:0,expires:time+windowMs};buckets.set(identity,bucket);
    }
    if(++bucket.count>limit){
      res.set('Retry-After',String(Math.max(1,Math.ceil((bucket.expires-time)/1000))));
      res.status(429).json({success:false,statusCode:429,message:'Too many requests'});return;
    }
    next();
  };
}

import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const literalSearch=(value:string)=>'%'+value.replace(/[\\%_]/g,'\\$&')+'%';
const folded=(field:Prisma.Sql)=>Prisma.sql`replace(lower(regexp_replace(normalize(${field},NFD),'[̀-ͯ]','','g')),'đ','d')`;
export async function homeProduct(store:Store,id:string){
  const [schema]=await store.query(Prisma.sql`SELECT to_regclass('public.home_products') IS NOT NULL AS ready`);
  if(!schema?.ready)throw new ApiError(404,'Product is unavailable');
  const [product]=await store.query(Prisma.sql`SELECT p.id,p.name,p.category,p.price_min,p.price_max,p.unit,p.details,p.sort_order,to_jsonb(p)->>'image_url' AS image_url
    FROM home_products p WHERE p.id=${id}::uuid AND (to_jsonb(p)->>'is_active' IS NULL OR to_jsonb(p)->>'is_active'='true')`);
  if(!product)throw new ApiError(404,'Product is unavailable');return product;
}
export async function homeProducts(store:Store,input:Row){
  for(const name of ['search','category'])if(input[name]!=null&&(typeof input[name]!=='string'||input[name].length>150||input[name].includes('\0')))throw new ApiError(400,'Invalid product filter');
  const limit=input.limit===undefined?24:Number(input.limit);
  if(!Number.isInteger(limit)||limit<1||limit>60)throw new ApiError(400,'Invalid page size');
  let cursor:{order:number;name:string;id:string}|null=null;
  if(input.cursor!==undefined){try{if(typeof input.cursor!=='string'||input.cursor.length>2200)throw new Error();cursor=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));if(!cursor||!Number.isInteger(cursor.order)||cursor.order< -2147483648||cursor.order>2147483647||typeof cursor.name!=='string'||Array.from(cursor.name).length>255||cursor.name.includes('\0')||typeof cursor.id!=='string'||!uuid.test(cursor.id))throw new Error();}catch{throw new ApiError(400,'Invalid collection cursor');}}
  const [schema]=await store.query(Prisma.sql`SELECT to_regclass('public.home_products') IS NOT NULL AS ready`);
  if(!schema?.ready)return {products:[],categories:[],nextCursor:null};
  const query=String(input.search||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
  const rows=await store.query(Prisma.sql`SELECT p.id,p.name,p.category,p.price_min,p.price_max,p.unit,p.details,p.sort_order,to_jsonb(p)->>'image_url' AS image_url
    FROM home_products p WHERE (to_jsonb(p)->>'is_active' IS NULL OR to_jsonb(p)->>'is_active'='true')
    AND (${String(input.category||'')}='' OR p.category=${String(input.category||'')})
    AND ${folded(Prisma.sql`concat_ws(' ',p.name,p.category,array_to_string(p.details,' '))`)} LIKE ${literalSearch(query)}
    ${cursor?Prisma.sql`AND (p.sort_order,p.name,p.id)>(${cursor.order},${cursor.name},${cursor.id}::uuid)`:Prisma.empty}
    ORDER BY p.sort_order,p.name,p.id LIMIT ${limit+1}`);
  const categories=await store.query(Prisma.sql`SELECT DISTINCT category FROM home_products p WHERE to_jsonb(p)->>'is_active' IS NULL OR to_jsonb(p)->>'is_active'='true' ORDER BY category`);
  const selected=rows.slice(0,limit),last=selected[selected.length-1];
  return {products:selected,categories:categories.map(row=>row.category),nextCursor:rows.length>limit?Buffer.from(JSON.stringify({order:last.sort_order,name:last.name,id:last.id})).toString('base64url'):null};
}

export async function servicePricing(store:Store){
  const pricingServices=await store.query(Prisma.sql`SELECT s.id,s.name,s.duration_minutes,s.price,s.discount_price,s.short_description,s.image_url,c.name AS category_name,
    CASE WHEN s.discount_price IS NOT NULL AND s.discount_price<=s.price THEN s.discount_price ELSE s.price END AS effective_price
    FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active ORDER BY s.duration_minutes,s.name,s.id`);
  const packages=await store.query(Prisma.sql`SELECT p.id,p.name,p.service_id,p.total_sessions,p.price,p.discount_price,p.validity_months,p.description,p.image_url,
    CASE WHEN p.discount_price IS NOT NULL AND p.discount_price<=p.price THEN p.discount_price ELSE p.price END AS effective_price
    FROM treatment_packages p JOIN services s ON s.id=p.service_id JOIN service_categories c ON c.id=s.category_id
    WHERE p.is_active AND s.is_active AND c.is_active ORDER BY s.duration_minutes,p.total_sessions,p.name,p.id`);
  return {pricingServices,packages};
}

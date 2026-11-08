import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('home products use Admin rows, accent-insensitive filters, stable ordering and fresh direct reads',async()=>{
  const f=await workflowFixture(),{db,id}=f;
  try{
    await db.exec('ALTER TABLE home_products RENAME TO isolated_unused_home_products');
    assert.deepEqual((await f.request('/portal/products',{anonymous:true})).data,{products:[],categories:[],nextCursor:null});
    await db.exec(`ALTER TABLE isolated_unused_home_products RENAME TO home_products; ALTER TABLE home_products ADD COLUMN IF NOT EXISTS image_url text; ALTER TABLE home_products ADD COLUMN is_active boolean DEFAULT true; ALTER TABLE home_products ADD COLUMN private_note text;`);
    for(const [n,name,category,order,active] of [[710,'Băng ép cổ tay','Băng ép',2,true],[711,'Dụng cụ tập luyện','Dụng cụ tập luyện',1,true],[712,'Băng ép chân','Băng ép',2,true],[713,'Hidden product','Băng ép',0,false]])await db.query(`INSERT INTO home_products(id,name,category,price_min,price_max,unit,details,sort_order,image_url,is_active,private_note) VALUES($1,$2,$3,150000,200000,'chiếc',ARRAY['Chi tiết thật'],$4,'https://files.test/product.png',$5,'Not public')`,[id(n),name,category,order,active]);
    const first=await f.request('/portal/products?limit=1',{anonymous:true});assert.equal(first.status,200);assert.deepEqual(first.data.products.map(p=>p.id),[id(711)]);
    assert.ok(first.data.nextCursor);assert.equal(first.data.products[0].privateNote,undefined);
    const next=await f.request('/portal/products?limit=1&cursor='+encodeURIComponent(first.data.nextCursor),{anonymous:true});assert.equal(next.data.products[0].id,id(712));
    const found=await f.request('/portal/products?search=bang%20ep%20co%20tay',{anonymous:true});assert.deepEqual(found.data.products.map(p=>p.id),[id(710)]);
    assert.equal((await f.request('/portal/products?search=%25',{anonymous:true})).data.products.length,0);
    assert.equal((await f.request('/portal/products?category='+encodeURIComponent('Băng ép'),{anonymous:true})).data.products.length,2);
    assert.equal((await f.request('/portal/products?cursor=invalid',{anonymous:true})).status,400);
    assert.equal((await f.request('/portal/products?limit=61',{anonymous:true})).status,400);
    const invalid=Buffer.from(JSON.stringify({order:1e30,name:'x',id:id(710)})).toString('base64url');
    assert.equal((await f.request('/portal/products?cursor='+invalid,{anonymous:true})).status,400);
    await db.query('UPDATE home_products SET price_min=160000,image_url=$2 WHERE id=$1',[id(710),'https://files.test/updated.png']);
    const updated=await f.request('/portal/products/'+id(710),{anonymous:true});assert.equal(Number(updated.data.product.priceMin),160000);assert.equal(updated.data.product.imageUrl,'https://files.test/updated.png');
    await db.query('UPDATE home_products SET is_active=false WHERE id=$1',[id(710)]);
    assert.equal((await f.request('/portal/products/'+id(710),{anonymous:true})).status,404);
  }finally{await f.close();}
});

test('pricing reads active services and packages, including real zero discounts, without inventing package options',async()=>{
  const f=await workflowFixture(),{db,id}=f;
  try{
    const first=await f.request('/portal/pricing',{anonymous:true});assert.equal(first.status,200);
    assert.deepEqual(first.data.packages.map(p=>p.id),[id(9)]);assert.equal(Number(first.data.packages[0].effectivePrice),400000);assert.equal(first.data.packages[0].totalSessions,5);
    await db.query('UPDATE treatment_packages SET price=300000,discount_price=0 WHERE id=$1',[id(9)]);
    assert.equal(Number((await f.request('/portal/pricing',{anonymous:true})).data.packages[0].effectivePrice),0);
    await db.query('UPDATE treatment_packages SET is_active=false WHERE id=$1',[id(9)]);
    assert.deepEqual((await f.request('/portal/pricing',{anonymous:true})).data.packages,[]);
    await db.query('UPDATE services SET is_active=false');
    const empty=await f.request('/portal/pricing',{anonymous:true});assert.deepEqual(empty.data.pricingServices,[]);assert.deepEqual(empty.data.packages,[]);
  }finally{await f.close();}
});

const assert = require('node:assert/strict');
const { JwtService } = require('@nestjs/jwt');
async function verifyHttpPermissions(pg, app, target, config) {
  const original = config.get('ADMIN_LOCAL_NO_AUTH');
  config.set('ADMIN_LOCAL_NO_AUTH', 'false');
  try {
    const cashier = (await pg.query("INSERT INTO users(phone,full_name,role,referral_code) VALUES('0900000088','Scoped cashier','CASHIER','SCOPEDHTTP') RETURNING id")).rows[0];
    const branches = (await pg.query("SELECT id FROM branches ORDER BY created_at LIMIT 1")).rows;
    const other = (await pg.query("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Other branch','HTTP-OTHER','0900000087','Test','Test',10,106,'https://example.invalid/branch.png') RETURNING id")).rows[0];
    const role = (await pg.query("INSERT INTO roles(code,name) VALUES('SCOPEDHTTP','Scoped cashier') RETURNING id")).rows[0];
    await pg.query('INSERT INTO user_roles(user_id,role_id,branch_id) VALUES($1,$2,$3)', [cashier.id,role.id,branches[0].id]);
    for (const code of ['branches.read','branches.update','cashier.shifts']) {
      const permission = (await pg.query("INSERT INTO permissions(code,module,name) VALUES($1,'admin',$1) ON CONFLICT(code) DO UPDATE SET name=excluded.name RETURNING id",[code])).rows[0];
      await pg.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2)',[role.id,permission.id]);
    }
    const jwt = new JwtService();
    const token = jwt.sign({sub:cashier.id},{secret:config.get('JWT_SECRET'),audience:'mld-admin',expiresIn:'5m'});
    const call = async (path, body, bearer = token) => {
      const response = await fetch(target + '/api/v1/admin/' + path, {method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      return {status:response.status,json:await response.json()};
    };
    assert.equal((await call('branches',undefined,'')).status,401);
    assert.equal((await call('branches',undefined,jwt.sign({sub:cashier.id},{secret:config.get('JWT_SECRET'),audience:'wrong'}))).status,401);
    const visible=await call('branches');
    assert.equal(visible.status,200);
    assert.deepEqual(visible.json.data.rows.map(row=>row.id),[branches[0].id]);
    assert.equal((await call('services')).status,403);
    assert.equal((await call('branches/update',{key:{id:other.id},values:{name:'Forbidden'}})).status,403);
    assert.equal((await call('cashier/shifts/open',{branchId:other.id,openingCash:0})).status,403);
    assert.equal((await call('cashier/collect',{kind:'TUITION'})).status,403);
    assert.equal((await call('schema/status')).status,403);
    assert.equal((await call('roles')).status,403);
    await pg.query('UPDATE users SET is_active=false WHERE id=$1',[cashier.id]);
    assert.equal((await call('branches')).status,403);
    return {jwtAndActiveAccount:'passed',branchScopedReadAndWrite:'passed',cashierPermissions:'passed'};
  } finally { config.set('ADMIN_LOCAL_NO_AUTH', original); }
}
module.exports = { verifyHttpPermissions };

const { Test } = require('@nestjs/testing');
const { AppModule } = require('./dist/app.module');
const { AdminService } = require('./dist/modules/admin/admin.service');

async function testCloseShift() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const service = moduleRef.get(AdminService);
  const actor = {
    id: 'f0dc713a-56fc-4347-9fb3-240528726ba3',
    role: 'SUPER_ADMIN',
    full_name: 'Ban Quản Trị MLD Việt Nam',
    email: 'admin@mldvietnam.vn'
  };

  const shiftId = '5f80a061-6474-4032-99b0-4fda70bdde55';
  console.log('Testing closeCashierShift with actor:', actor);

  try {
    const res = await service.closeCashierShift(actor, shiftId, {
      closingCash: 1900000,
      notes: ''
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('CAUGHT ERROR:');
    console.error(err);
    console.error('Error status:', err.status);
    console.error('Error response:', err.response);
  }

  await moduleRef.close();
}

testCloseShift().catch(console.error);

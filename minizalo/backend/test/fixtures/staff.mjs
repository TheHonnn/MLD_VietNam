import {workflowFixture} from './workflow.mjs';

export async function staffFixture(){
  const f=await workflowFixture(),{db,id}=f;
  await db.query("INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES($1,'Other staff branch','STAFF-OTHER','0900000104','Other address','District',10,106,'')",[id(104)]);
  await db.query("INSERT INTO users(id,phone,full_name,role,referral_code) VALUES($1,'0900000090','Fixture receptionist','RECEPTIONIST','STAFF90'),($2,'0900000091','Other branch receptionist','RECEPTIONIST','STAFF91'),($3,'0900000092','Fixture administrator','ADMIN','STAFF92')",[id(90),id(91),id(92)]);
  await db.query("INSERT INTO staff_profiles(user_id,branch_id,employee_code,position) VALUES($1,$2,'STAFF90','Reception'),($3,$4,'STAFF91','Reception')",[id(90),id(3),id(91),id(104)]);
  await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,'2099-01-14','14:00','16:00'),($1,$2,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+3,'14:00','16:00')",[id(7),id(3)]);
  const day=(await db.query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+3,'YYYY-MM-DD') AS day")).rows[0].day;
  return {...f,day};
}

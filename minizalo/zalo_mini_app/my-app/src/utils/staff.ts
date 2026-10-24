export const isStaffRole=(role:unknown)=>typeof role==='string'&&['RECEPTIONIST','CASHIER','TECHNICIAN','INSTRUCTOR','BRANCH_MANAGER','ADMIN','SUPER_ADMIN'].includes(role.toUpperCase());

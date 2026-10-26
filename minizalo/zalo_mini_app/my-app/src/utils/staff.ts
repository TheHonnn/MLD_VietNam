export const isStaffRole=(role:unknown)=>typeof role==='string'&&['RECEPTIONIST','CASHIER','TECHNICIAN','INSTRUCTOR','BRANCH_MANAGER','ADMIN','SUPER_ADMIN'].includes(role.toUpperCase());
export const isCustomerRole=(role:unknown)=>typeof role==='string'&&['CUSTOMER','PATIENT','STUDENT'].includes(role.toUpperCase());
export const isMiniAppRole=(role:unknown)=>isCustomerRole(role)||isStaffRole(role);
export const canUseStaffTools=(account:{role?:unknown;staffAccess?:unknown})=>isStaffRole(account.role)&&account.staffAccess===true;
export const staffRoleLabel=(role:string)=>({RECEPTIONIST:'Lễ tân',CASHIER:'Thu ngân',TECHNICIAN:'Kỹ thuật viên',INSTRUCTOR:'Giảng viên',BRANCH_MANAGER:'Quản lý chi nhánh',ADMIN:'Quản trị viên',SUPER_ADMIN:'Quản trị hệ thống'}[role.toUpperCase()]||'');

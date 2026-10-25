import type {Booking} from '../../../../backend/src/data/database';
import {searchText} from './catalog';
import {contactPhone} from './phone';

export function matchesBookingSearch(booking:Booking,query:string){
  const value=searchText(query.trim());
  if(!value)return true;
  const text=[booking.code,booking.userName,booking.customerName,booking.userPhone,booking.customerPhone,booking.serviceTitle,
    booking.branchName,booking.doctorName,...(booking.items?.map(item=>item.serviceTitle)||[])].filter(Boolean).join(' ');
  if(searchText(text).includes(value))return true;
  if(!/^[+\d\s().-]+$/.test(query))return false;
  const digits=(contactPhone(query)||query).replace(/\D/g,'');
  return Boolean(digits&&[booking.userPhone,booking.customerPhone].some(phone=>phone&&(contactPhone(phone)||phone).replace(/\D/g,'').includes(digits)));
}

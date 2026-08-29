import {uid,today} from './posData';

export const STAFF_STATUSES=['ACTIVE','INACTIVE','SUSPENDED'];
export const createEmployee=({name,role='cashier',email='',phone='',locationIds=['MAIN'],hourlyRate=0,commissionRate=0}={})=>({id:uid('EMP'),name:name||'New Employee',role,email,phone,locationIds,status:'ACTIVE',hourlyRate:Number(hourlyRate)||0,commissionRate:Number(commissionRate)||0,createdAt:new Date().toISOString()});
export const clockIn=(attendance,{employeeId,locationId='MAIN',registerId=null,user}={})=>[...(attendance||[]),{id:uid('ATT'),employeeId,locationId,registerId,date:today(),clockIn:new Date().toISOString(),clockOut:null,status:'OPEN',by:user?.username||'system'}];
export const clockOut=(attendance,employeeId)=>{const rows=[...(attendance||[])],i=[...rows].reverse().findIndex(a=>a.employeeId===employeeId&&a.status==='OPEN');if(i<0)return rows;const index=rows.length-1-i;return rows.map((a,n)=>n===index?{...a,clockOut:new Date().toISOString(),status:'CLOSED'}:a)};
export const shiftHours=shift=>shift?.clockIn&&shift?.clockOut?Math.max(0,(new Date(shift.clockOut)-new Date(shift.clockIn))/3600000):0;
export const laborSummary=(employees,attendance,from,to)=> (employees||[]).map(e=>{const shifts=(attendance||[]).filter(a=>a.employeeId===e.id&&(!from||a.date>=from)&&(!to||a.date<=to));const hours=shifts.reduce((s,a)=>s+shiftHours(a),0);return{employeeId:e.id,name:e.name,role:e.role,hours,pay:hours*Number(e.hourlyRate||0),openShifts:shifts.filter(a=>a.status==='OPEN').length}});
export const assignRegister=(registers,registerId,employeeId)=> (registers||[]).map(r=>r.id===registerId?{...r,assignedEmployeeId:employeeId,assignedAt:new Date().toISOString()}:r);
export const tipDistribution=(tips,employees)=>{const total=(tips||[]).reduce((s,t)=>s+Number(t.amount||0),0);const eligible=(employees||[]).filter(e=>e.status==='ACTIVE');if(!eligible.length)return[];const each=total/eligible.length;return eligible.map(e=>({employeeId:e.id,name:e.name,amount:each}))};
export const commissionFor=(employee,salesAmount)=>Number(salesAmount||0)*Number(employee?.commissionRate||0)/100;

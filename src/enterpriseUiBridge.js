import {enterpriseDashboard,dashboardKpis,dashboardAlertList} from './enterpriseDashboard';
import {hasPermission} from './securityEnterprise';
import {customerDisplayData} from './printingEnterprise';
import {createKitchenTicket} from './guestKitchenEnterprise';

export const POS_MODULES=[
  {id:'dashboard',label:'Dashboard',permission:'reports.view'},
  {id:'pos',label:'Point of Sale',permission:'pos.sell'},
  {id:'orders',label:'Orders',permission:'pos.sell'},
  {id:'kitchen',label:'Kitchen',permission:'pos.sell'},
  {id:'inventory',label:'Inventory',permission:'inventory.receive'},
  {id:'purchasing',label:'Purchasing',permission:'purchases.approve'},
  {id:'customers',label:'Customers',permission:'pos.sell'},
  {id:'reports',label:'Reports',permission:'reports.view'},
  {id:'accounting',label:'Accounting',permission:'reports.view'},
  {id:'settings',label:'Settings',permission:'settings.manage'}
];
export const visibleModules=(user)=>POS_MODULES.filter(m=>hasPermission(user,m.permission));
export const posDashboardView=(state,filters={})=>{const dashboard=enterpriseDashboard(state,filters);return{kpis:dashboardKpis(dashboard),alerts:dashboardAlertList(dashboard),sales:dashboard.sales,inventory:dashboard.inventory,sync:dashboard.sync}};
export const checkoutView=(cart=[],totals={},customer=null)=>({cart,totals,customer,canPay:cart.length>0&&Number(totals.total||0)>=0});
export const customerScreenView=sale=>customerDisplayData(sale);
export const kitchenView=(sale,items=sale?.items||[])=>createKitchenTicket(sale,items);
export const moduleAccess=(user,moduleId)=>{const module=POS_MODULES.find(m=>m.id===moduleId);return!!module&&hasPermission(user,module.permission)};

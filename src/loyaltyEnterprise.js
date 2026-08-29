import {uid,today} from './posData';

export const LOYALTY_TIERS=['BRONZE','SILVER','GOLD','PLATINUM'];
export const createLoyaltyProgram=({name='Rewards',pointsPerCurrency=1,redemptionValue=0.01}={})=>({id:uid('LOY'),name,pointsPerCurrency:Number(pointsPerCurrency)||1,redemptionValue:Number(redemptionValue)||0.01,active:true});
export const createLoyaltyAccount=(customerId)=>({id:uid('LAC'),customerId,points:0,lifetimePoints:0,tier:'BRONZE',createdAt:new Date().toISOString()});
export const tierFor=(lifetimePoints)=>{const p=Number(lifetimePoints)||0;return p>=10000?'PLATINUM':p>=5000?'GOLD':p>=2000?'SILVER':'BRONZE'};
export const earnPoints=(account,amount,program)=>{const earned=Math.max(0,Math.floor(Number(amount||0)*Number(program?.pointsPerCurrency||1)));return{...account,points:Number(account.points||0)+earned,lifetimePoints:Number(account.lifetimePoints||0)+earned,tier:tierFor(Number(account.lifetimePoints||0)+earned)}};
export const redeemPoints=(account,points,program)=>{const used=Math.min(Number(account.points||0),Math.max(0,Math.floor(Number(points)||0)));return{account:{...account,points:Number(account.points||0)-used},discount:used*Number(program?.redemptionValue||0.01),pointsUsed:used}};
export const loyaltyLedgerEntry=({accountId,type,points,amount=0,reference='',user}={})=>({id:uid('LED'),accountId,type,points:Number(points)||0,amount:Number(amount)||0,reference,date:today(),by:user?.username||'system'});
export const createReward=({name,pointsCost=0,value=0,description='',active=true}={})=>({id:uid('RWD'),name:name||'Reward',pointsCost:Number(pointsCost)||0,value:Number(value)||0,description,active});
export const redeemReward=(account,reward)=>{if(!reward?.active||Number(account?.points||0)<Number(reward.pointsCost||0))return{ok:false,account};return{ok:true,account:{...account,points:Number(account.points)-Number(reward.pointsCost)},reward}};
export const createGiftCard=({number,balance=0,expiresAt=null}={})=>({id:uid('GFT'),number:number||`GC-${Date.now().toString(36).toUpperCase()}`,initialBalance:Number(balance)||0,balance:Number(balance)||0,expiresAt,status:'ACTIVE',createdAt:new Date().toISOString()});
export const redeemGiftCard=(card,amount)=>{const used=Math.min(Number(card?.balance||0),Math.max(0,Number(amount)||0));return{card:{...card,balance:Number(card.balance)-used,status:Number(card.balance)-used<=0?'DEPLETED':'ACTIVE'},used,remaining:Number(card.balance)-used}};
export const giftCardTopUp=(card,amount)=>({...card,balance:Number(card.balance||0)+Math.max(0,Number(amount)||0),status:'ACTIVE',updatedAt:new Date().toISOString()});
export const createStoreCredit=(customerId,amount,reason='')=>({id:uid('CRD'),customerId,balance:Number(amount)||0,reason,status:'ACTIVE',createdAt:new Date().toISOString()});
export const useStoreCredit=(credit,amount)=>{const used=Math.min(Number(credit?.balance||0),Math.max(0,Number(amount)||0));return{credit:{...credit,balance:Number(credit.balance)-used,status:Number(credit.balance)-used<=0?'DEPLETED':'ACTIVE'},used}};
export const referralReward=({referrerId,referredCustomerId,points=500}={})=>({id:uid('REF'),referrerId,referredCustomerId,points:Number(points)||0,status:'PENDING',createdAt:new Date().toISOString()});
export const loyaltySummary=(accounts=[])=>accounts.reduce((a,x)=>{a[x.tier]=(a[x.tier]||0)+1;a.points+=Number(x.points||0);return a},{BRONZE:0,SILVER:0,GOLD:0,PLATINUM:0,points:0});

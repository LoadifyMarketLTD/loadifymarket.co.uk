/** Server-owned listing creation boundary. */
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isMaintenanceMode, getFeatureFlags } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';
import { buildSellerNonVatProductEvidence, hasExplicitSellerNonVatDeclaration, normaliseMarketplaceCountry } from './_shared/marketplaceTax';

const CREATE_ALLOWED_FIELDS = ['description','type','listingType','condition','categoryId','subcategoryId','stockQuantity','stockStatus','images','specifications','weight','dimensions','palletInfo','logisticsInfo','isHandmade','isUnique','artistName'] as const;
function pickAllowedFields(source: Record<string, unknown>) { const out: Record<string, unknown> = {}; for (const f of CREATE_ALLOWED_FIELDS) if (Object.prototype.hasOwnProperty.call(source,f)) out[f]=source[f]; return out; }
function parseStockQuantity(raw: unknown): number | null { if (typeof raw==='number') return Number.isInteger(raw)&&raw>=0?raw:null; if (typeof raw==='string'&&/^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(),10); if (raw==null) return 0; return null; }
function calculateStockStatus(ctx:string,q:number):'in_stock'|'low_stock'|'out_of_stock' { if(ctx==='service') return 'in_stock'; if(q>10)return'in_stock'; if(q>0)return'low_stock'; return'out_of_stock'; }

export const handler: Handler = async (event) => {
  if(event.httpMethod!=='POST') return {statusCode:405,body:JSON.stringify({error:'Method not allowed'})};
  const url=process.env.VITE_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return {statusCode:503,body:JSON.stringify({error:'Server misconfiguration'})};
  const supabase=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const auth=await authenticateActiveAccount(event,supabase,['seller','admin']);
  if(!auth.ok) return {statusCode:auth.status,body:JSON.stringify({error:auth.status===401?'Authentication required':'Only active sellers can create listings'})};
  const callerId=auth.actor.id, isAdmin=auth.actor.role==='admin';
  const rl=await checkRateLimit({supabase,tableName:'create_product_rate_limits',identifier:callerId,windowMinutes:60,maxAttempts:20,policy:'fail-soft'});
  if(rl.exceeded) return {statusCode:429,body:JSON.stringify({error:'Too many listings created. Please try again later.'})};
  if(await isMaintenanceMode(supabase)&&!isAdmin) return {statusCode:503,body:JSON.stringify({error:'Platform is temporarily under maintenance. Listings cannot be created right now.'})};

  let body:Record<string,unknown>; try{body=JSON.parse(event.body||'{}');}catch{return{statusCode:400,body:JSON.stringify({error:'Invalid JSON body'})};}
  const {title,price,isActive,shippingMethodIds,dispatchTime,listingContext,...rest}=body as {title:string;price:number;isActive:boolean;shippingMethodIds?:string[];dispatchTime?:string;listingContext?:string;[key:string]:unknown};
  if(!title||typeof price!=='number'||!Number.isFinite(price)||price<=0) return{statusCode:400,body:JSON.stringify({error:'"title" and a positive "price" are required'})};
  const ctx=listingContext==='service'?'service':listingContext==='product'||listingContext==='goods'||listingContext==null?'product':null;
  if(!ctx) return{statusCode:400,body:JSON.stringify({error:'Invalid listingContext. Allowed values: product, service.'})};
  if(Boolean(isActive)&&ctx==='product'&&(!Array.isArray(shippingMethodIds)||!shippingMethodIds.length)) return{statusCode:400,body:JSON.stringify({error:'Select at least one shipping method before publishing this product.'})};

  let sellerCanPublish=isAdmin, listingLimit:number|null=null;
  if(!isAdmin){
    const {data:p,error}=await supabase.from('seller_profiles').select('sellerStatus, stripeConnectStatus, isPaused, listingLimit').eq('userId',callerId).maybeSingle<{sellerStatus:string|null;stripeConnectStatus:string|null;isPaused:boolean|null;listingLimit:number|null}>();
    if(error||!p) return{statusCode:409,body:JSON.stringify({error:'Complete your seller setup before creating listings.'})};
    listingLimit=p.listingLimit??null; sellerCanPublish=p.sellerStatus==='active'&&p.stripeConnectStatus==='active'&&p.isPaused!==true;
    if(Boolean(isActive)&&!sellerCanPublish) return{statusCode:409,body:JSON.stringify({error:'Complete seller setup and activate Stripe payments before publishing. You can still save the listing as a draft.'})};
  }

  const {data:taxProfile,error:taxError}=await supabase.from('seller_profiles')
    .select('country, isVatRegistered, vatNumber, businessAddress, taxDeclarationVersion, taxDeclarationSource, taxDeclarationCapturedAt')
    .eq('userId',callerId).maybeSingle<{country:string|null;isVatRegistered:boolean|null;vatNumber:string|null;businessAddress:Record<string,unknown>|null;taxDeclarationVersion:number|null;taxDeclarationSource:string|null;taxDeclarationCapturedAt:string|null}>();
  if(taxError||!taxProfile) return{statusCode:500,body:JSON.stringify({error:'Unable to verify seller tax profile. Please try again.'})};
  const canUseNonVat=ctx==='product'&&normaliseMarketplaceCountry(taxProfile.country)==='GB'&&hasExplicitSellerNonVatDeclaration(taxProfile);
  const taxEvidence=canUseNonVat?buildSellerNonVatProductEvidence(price):null;
  if(Boolean(isActive)&&ctx==='product'&&!taxEvidence) return{statusCode:409,body:JSON.stringify({error:'This listing cannot be published until the seller tax declaration is current and its VAT treatment is supported.',code:'TAX_EVIDENCE_REQUIRED'})};

  const flags=await getFeatureFlags(supabase); const isApproved=isAdmin?true:sellerCanPublish&&Boolean(flags.autoApproveProducts);
  if(!isAdmin){ const countRes=await supabase.from('products').select('id',{count:'exact',head:true}).eq('sellerId',callerId); if(listingLimit!==null&&(countRes.count??0)>=listingLimit) return{statusCode:429,body:JSON.stringify({error:`Listing limit reached. You can have a maximum of ${listingLimit} listing(s).`})}; }
  const allowed=pickAllowedFields(rest); const parsed=parseStockQuantity(allowed.stockQuantity); if(parsed===null) return{statusCode:400,body:JSON.stringify({error:'stockQuantity must be a whole number greater than or equal to 0'})};
  const stock=ctx==='service'?0:parsed;
  const productData:Record<string,unknown>={...allowed,title,price,priceExVat:taxEvidence?.priceExVat??null,vatRate:taxEvidence?.vatRate??null,taxTreatmentStatus:taxEvidence?.taxTreatmentStatus??null,taxTreatmentSource:taxEvidence?.taxTreatmentSource??null,taxEvidenceVersion:taxEvidence?.taxEvidenceVersion??null,taxEvidenceCapturedAt:taxEvidence?.taxEvidenceCapturedAt??null,isActive:Boolean(isActive)&&sellerCanPublish,isApproved,sellerId:callerId,listingContext:ctx,stockQuantity:stock,stockStatus:calculateStockStatus(ctx,stock)};
  const {data:inserted,error:insertError}=await supabase.from('products').insert([productData]).select('id').single();
  if(insertError) return{statusCode:500,body:JSON.stringify({error:'Failed to create listing. Please try again.'})};
  if(Array.isArray(shippingMethodIds)&&shippingMethodIds.length){ const rows=shippingMethodIds.map(method_id=>({product_id:inserted.id,method_id,dispatch_time:dispatchTime||null})); const {error}=await supabase.from('product_shipping').insert(rows); if(error){await supabase.from('products').update({isActive:false}).eq('id',inserted.id);return{statusCode:500,body:JSON.stringify({error:'Listing was saved as a draft because shipping setup could not be saved. Please try again.'})};}}
  return{statusCode:200,body:JSON.stringify({id:inserted.id,isApproved,isActive:Boolean(productData.isActive)})};
};

export const requiredFeatures = ['customer-catalog-v1','admin-document-policy-v1','journal-sharing-v1','staff-academy-approval-v1','staff-catalog-v1','unified-zalo-login-v1','personal-booking-resources-v1','personal-group-booking-v1','booking-pagination-v1','consultation-inbox-v1','portal-content-v1','class-attendance-v1','mobile-parity-v2','approval-gated-learning-v1'];

export function checkBackendContract(envelope) {
  if(envelope?.success !== true || envelope?.data?.status !== 'ok') return ['health-response'];
  const data=envelope.data;
  const missing=requiredFeatures.filter(feature=>!Array.isArray(data.features)||!data.features.includes(feature));
  if(data.authFlow!=='zalo-phone-registration')missing.push('zalo-phone-registration');
  if(data.contentContract!=='shared-admin-v1')missing.push('shared-admin-v1');
  return missing;
}

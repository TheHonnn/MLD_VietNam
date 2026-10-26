export const requiredFeatures = ['unified-zalo-login-v1','personal-booking-resources-v1','portal-content-v1','class-attendance-v1'];

export function checkBackendContract(envelope) {
  if(envelope?.success !== true || envelope?.data?.status !== 'ok') return ['health-response'];
  const data=envelope.data;
  const missing=requiredFeatures.filter(feature=>!Array.isArray(data.features)||!data.features.includes(feature));
  if(data.authFlow!=='zalo-phone-registration')missing.push('zalo-phone-registration');
  if(data.contentContract!=='shared-admin-v1')missing.push('shared-admin-v1');
  return missing;
}

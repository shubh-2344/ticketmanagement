export function formatTicketId(id, type) {
  if (!id && id !== 0) return '#000000';
  const strId = String(id).trim();
  
  // If already formatted (e.g. INC-000001, REQ-000001, RET-000001, TKT-000001)
  if (/^(INC|REQ|RET|TKT)-\d+$/i.test(strId)) {
    return strId.toUpperCase();
  }
  
  // Prefix selection based on ticket type
  const prefix = (type === 'issue') ? 'INC' : (type === 'device-return' ? 'RET' : (type === 'device-request' ? 'REQ' : 'TKT'));
  
  // If it's a simple numeric ID
  if (/^\d+$/.test(strId)) {
    return `${prefix}-${strId.padStart(6, '0')}`;
  }
  
  // Hash function for UUIDs to generate deterministic 6-digit number
  let num = 0;
  for (let i = 0; i < strId.length; i++) {
    num = (num * 31 + strId.charCodeAt(i)) % 999999;
  }
  const cleanNum = (Math.abs(num) % 999999) + 1;
  return `${prefix}-${String(cleanNum).padStart(6, '0')}`;
}

export default formatTicketId;

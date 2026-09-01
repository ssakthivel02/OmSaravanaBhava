export function acceptanceValidate8(record) {
  const errors=[];
  if (!record || typeof record !== 'object') errors.push('invalid-record');
  if (record && !record.record_id) errors.push('missing-record-id');
  if (record && !record.status) errors.push('missing-status');
  return { ok:errors.length===0, errors, batch:142, record };
}

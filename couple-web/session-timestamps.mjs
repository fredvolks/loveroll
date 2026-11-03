// Supabase/PostgREST timestamptz values retain up to six fractional digits.
// Date.parse alone silently normalizes impossible dates (e.g. February 31)
// and loses ordering within one millisecond.
export function parseSessionTimestamp(value){
 if(typeof value!=='string')return null;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!m)return null;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const hour=Number(m[4]),minute=Number(m[5]),second=Number(m[6]);
 if(month<1||month>12||day<1||day>31||hour>23||minute>59||second>59)return null;
 const date=new Date(0);
 date.setUTCHours(0,0,0,0);
 date.setUTCFullYear(year,month-1,day);
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 const zone=m[8];
 if(zone!=='Z'){
  const hours=Number(zone.slice(1,3)),minutes=Number(zone.slice(4,6));
  if(hours>14||minutes>59||(hours===14&&minutes!==0))return null;
 }
 const epochMs=Date.parse(value);
 if(!Number.isFinite(epochMs))return null;
 return {epochMs,micros:Number((m[7]??'').padEnd(6,'0').slice(3))};
}

export function compareSessionTimestamps(first,second){
 // Null means at least one input is invalid, never equality.
 const a=parseSessionTimestamp(first),b=parseSessionTimestamp(second);
 if(!a||!b)return null;
 return Math.sign(a.epochMs-b.epochMs)||Math.sign(a.micros-b.micros);
}

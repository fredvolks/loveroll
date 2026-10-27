// LoveRoll • Venice API bridge, stage 1 (configuration + non-billable key check).
// All Venice calls stay on the server. This function does NOT generate cards,
// spend inference credits, modify a library, or expose secret keys.
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const VENICE_API_BASE_URL = 'https://api.venice.ai/api/v1';
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const serviceKey = (): string => {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
    return typeof key === 'string' ? key : '';
  } catch { return ''; }
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const privilegedKey = serviceKey();
  if (!url || !privilegedKey) return json({ error: 'Configuration Supabase incomplète.' }, 503);

  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) return json({ error: 'Connexion requise.' }, 401);

  // Never trust arbitrary request body fields for authorization.
  let payload: Record<string, unknown>;
  try { payload = await request.json(); }
  catch { return json({ error: 'Requête JSON invalide.' }, 400); }
  const action = payload?.action;
  const coupleId = payload?.couple_id;
  if (!['status', 'verify_key'].includes(String(action)) ||
      typeof coupleId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coupleId)) {
    return json({ error: 'Action ou couple invalide.' }, 400);
  }

  const supabase = createClient(url, privilegedKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !identity?.user?.id) return json({ error: 'Session invalide.' }, 401);

  // Owner/admin of THIS couple only. Client-provided role claims are ignored.
  const { data: couple, error: coupleError } = await supabase
    .from('couples').select('id,owner_user_id').eq('id', coupleId)
    .eq('owner_user_id', identity.user.id).maybeSingle();
  if (coupleError) return json({ error: 'Vérification des droits indisponible.' }, 503);
  if (!couple) return json({ error: 'Accès réservé à l’administrateur du couple.' }, 403);

  const veniceKey = (Deno.env.get('VENICE_API_KEY') || '').trim();
  if (action === 'status') {
    return json({
      provider: 'venice', configured: Boolean(veniceKey),
      api_base_url: VENICE_API_BASE_URL, generating: false,
      message: veniceKey
        ? 'Clé enregistrée. Connexion non encore vérifiée.'
        : 'Ajoutez VENICE_API_KEY aux secrets Edge Functions du projet LoveRoll.',
    });
  }

  // This endpoint is read-only and does not use inference tokens.
  if (!veniceKey) return json({
    provider: 'venice', configured: false, connected: false,
    message: 'Secret VENICE_API_KEY manquant.',
  }, 503);

  try {
    const res = await fetch(VENICE_API_BASE_URL + '/api_keys/rate_limits', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + veniceKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) {
      return json({ provider: 'venice', configured: true, connected: false,
        message: 'Clé refusée par Venice. Vérifiez la clé Inférence.' }, 200);
    }
    if (!res.ok) return json({ provider: 'venice', configured: true, connected: false,
      message: 'Venice indisponible.', http_status: res.status }, 502);
    const body = await res.json();
    const connected = body?.data?.accessPermitted === true;
    return json({ provider: 'venice', configured: true, connected,
      message: connected ? 'Clé Venice confirmée.' : 'Venice ne permet pas les appels avec cette clé.',
      api_base_url: VENICE_API_BASE_URL,
    });
  } catch {
    return json({ provider: 'venice', configured: true, connected: false,
      message: 'Vérification Venice impossible, réessayez plus tard.' }, 502);
  }
});

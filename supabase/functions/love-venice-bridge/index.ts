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
  const studioAction = typeof action === 'string' && action.startsWith('studio_');
  const allowedActions = ['status','verify_key','get_latest_preview','preview_three',
    'studio_status','studio_verify_key','studio_get_latest_preview','studio_preview_three'];
  if (!allowedActions.includes(String(action)) ||
      (!studioAction && (typeof coupleId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coupleId)))) {
    return json({ error: 'Action ou couple invalide.' }, 400);
  }

  const supabase = createClient(url, privilegedKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !identity?.user?.id) return json({ error: 'Session invalide.' }, 401);

  // Studio: authenticated, verified platform owner only. Other actions remain
  // restricted to the owner of the specified couple.
  if (studioAction) {
    if (!identity.user.email_confirmed_at) return json({error:'Courriel non vérifié.'},403);
    const {data:platformAdmin,error:adminError}=await supabase.from('love_platform_admins')
      .select('user_id').eq('user_id',identity.user.id).maybeSingle();
    if(adminError)return json({error:'Vérification Super Admin indisponible.'},503);
    if(!platformAdmin)return json({error:'Accès réservé au Super Admin.'},403);
  } else {
    const { data: couple, error: coupleError } = await supabase
      .from('couples').select('id,owner_user_id').eq('id', coupleId)
      .eq('owner_user_id', identity.user.id).maybeSingle();
    if (coupleError) return json({ error: 'Vérification des droits indisponible.' }, 503);
    if (!couple) return json({ error: 'Accès réservé à l’administrateur du couple.' }, 403);
  }

  const veniceKey = (Deno.env.get('VENICE_API_KEY') || '').trim();
  if (action === 'status' || action === 'studio_status') {
    return json({
      provider: 'venice', configured: Boolean(veniceKey),
      api_base_url: VENICE_API_BASE_URL, generating: false,
      message: veniceKey
        ? 'Clé enregistrée. Connexion non encore vérifiée.'
        : 'Ajoutez VENICE_API_KEY aux secrets Edge Functions du projet LoveRoll.',
    });
  }


  if (action === 'get_latest_preview' || action === 'studio_get_latest_preview') {
    const trialTable=studioAction?'love_venice_studio_trials':'love_venice_preview_trials';
    const query=supabase.from(trialTable).select('cards,status,created_at,model');
    const { data, error } = await (studioAction
      ?query.eq('requested_by',identity.user.id):query.eq('couple_id',coupleId))
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return json({ error: 'Brouillon indisponible.' }, 503);
    return json({ provider: 'venice', saved: Boolean(data),
      preview: data ? { cards: data.cards, status: data.status,
        created_at: data.created_at, model: data.model } : null });
  }

  if (action === 'preview_three' || action === 'studio_preview_three') {
    if (!veniceKey) return json({ error: 'Secret VENICE_API_KEY absent de Supabase.' }, 503);
    // Transactional per-couple/day limiter. Neither quota nor prices for full 100-card
    // regeneration are involved; this endpoint cannot mutate active libraries.
    const trialTable=studioAction?'love_venice_studio_trials':'love_venice_preview_trials';
    const payload={requested_by:identity.user.id, utc_day:new Date().toISOString().slice(0,10),
      ...(studioAction?{}:{couple_id:coupleId})};
    const { data: receipt, error: reserveError } = await supabase
      .from(trialTable).insert(payload).select('id').single();
    if (reserveError) return json({
      error: reserveError.code === '23505'
        ? 'Essai de trois cartes déjà utilisé pour ce couple aujourd’hui (UTC).'
        : 'Protection du budget indisponible.'
    }, reserveError.code === '23505' ? 429 : 503);

    const model = Deno.env.get('VENICE_CARD_MODEL') || 'venice-uncensored-role-play';
    const definitions = [
      { style:'soft', drawer_role:'her', subject:'stimulation manuelle ou masturbation mutuelle' },
      { style:'medium', drawer_role:'him', subject:'sexe oral ou position sexuelle choisie par les partenaires' },
      { style:'intense', drawer_role:'both', subject:'bondage consensuel ou sexualité anale avec précautions' }
    ];
    const makeCard = async (item: typeof definitions[number]) => {
      try {
        const prompt = [
          'Rédige UNE carte LoveRoll pour un jeu de couple entre deux adultes consentants, en français canadien.',
          'Intensité : ' + item.style + '. Domaine : ' + item.subject + '.',
          'Nomme une pratique identifiable; consigne concrète, non graphique et sans termes vagues.',
          'Les versions concise et détaillée décrivent strictement la même activité.',
          'Pigeur imposé : ' + item.drawer_role + '. La consigne respecte ce droit de pige.',
          'Durée obligatoire entre 2 et 6 minutes. Consentement actif des deux; arrêt libre.',
          'N’écris ni scène pornographique détaillée, ni obligation de poursuivre un geste.',
          'Retourne UNIQUEMENT un objet JSON avec :',
          'title, text_short, text_detailed, timer_minutes, drawer_role, recipient_role, required_consent.',
          'drawer_role doit être ' + item.drawer_role + '; recipient_role doit être both.',
          'text_short = 1-2 phrases concrètes; text_detailed = 3-5 phrases claires.',
        ].join('\n');
        const response = await fetch(VENICE_API_BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + veniceKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              {role:'system',content:'Rédacteur de cartes de couple francophones. Texte sexuel non graphique, direct, basé sur consentement, objet JSON seulement.'},
              {role:'user',content:prompt}
            ],
            max_completion_tokens: 750, temperature: 0.85, stream: false, store: false,
            response_format: {type:'json_object'},
            venice_parameters: {enable_web_search:'off',enable_web_scraping:false}
          }),
          signal: AbortSignal.timeout(25000)
        });
        if (!response.ok) return {style:item.style, error:'Venice HTTP '+response.status};
        const completion = await response.json();
        const raw = completion?.choices?.[0]?.message?.content;
        if (typeof raw !== 'string' || raw.length > 7000) {
          return {style:item.style,error:'Texte Venice absent ou trop long.'};
        }
        let obj: Record<string,unknown>;
        try {
          // Accept JSON with or without an optional fenced wrapper.
          const found = raw.match(/\{[\s\S]*\}/);
          if (!found) throw Error('missing object');
          obj = JSON.parse(found[0]);
        } catch { return {style:item.style,error:'Format de carte invalide.'}; }
        if (typeof obj?.title !== 'string' || obj.title.trim().length < 3 || obj.title.length > 120 ||
          typeof obj?.text_short !== 'string' || obj.text_short.trim().length < 20 || obj.text_short.length > 500 ||
          typeof obj?.text_detailed !== 'string' || obj.text_detailed.trim().length < 40 || obj.text_detailed.length > 900 ||
          !Number.isInteger(obj?.timer_minutes) || Number(obj.timer_minutes) < 2 || Number(obj.timer_minutes) > 6 ||
          obj.drawer_role !== item.drawer_role || obj.recipient_role !== 'both') {
          return {style:item.style,error:'Durée, rôles ou consignes non conformes aux règles LoveRoll.'};
        }
        return {
          style:item.style,
          title:obj.title.trim(), text_short:obj.text_short.trim(),
          text_detailed:obj.text_detailed.trim(), timer_minutes:obj.timer_minutes,
          drawer_role:item.drawer_role, recipient_role:'both',
          required_consent:typeof obj.required_consent === 'string'
            ? obj.required_consent.slice(0,240) : 'Accord explicite des deux.',
          origin:'venice-api', model,
          usage: {
            prompt_tokens: Number(completion?.usage?.prompt_tokens) || 0,
            completion_tokens: Number(completion?.usage?.completion_tokens) || 0
          }
        };
      } catch { return {style:item.style,error:'Connexion Venice interrompue.'}; }
    };
    const cards = await Promise.all(definitions.map(makeCard));
    const completed = cards.filter(card => !('error' in card)).length;
    const { error: saveError } = await supabase.from(trialTable)
      .update({
        cards, model, status:completed===3?'completed':'partial',
        finished_at:new Date().toISOString()
      }).eq('id', receipt.id);
    if (saveError) return json({
      error:'Réponses obtenues mais sauvegarde privée impossible; aucun catalogue modifié.'
    },503);
    return json({
      origin:'venice-api', example_only:true,
      regeneration_quota_used:false, completed, cards,
      message:'Brouillon sauvegardé. Aucune carte active remplacée.'
    },completed>0?200:502);
  }

  // Status/verify_key are read-only and do not use inference tokens.
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

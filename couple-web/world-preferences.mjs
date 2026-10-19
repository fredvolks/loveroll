// LoveRoll worldwide preferences — personal language/currency, shared travel radius.
// Pure helpers: no location tracking, hidden API keys, or implicit permission requests.
export const LANGUAGES=Object.freeze([
 ['fr-CA','Français'],['en','English'],['es','Español'],['pt','Português'],
 ['de','Deutsch'],['it','Italiano'],['nl','Nederlands'],['ar','العربية'],
 ['ja','日本語'],['zh-CN','简体中文']
]);
export const CURRENCIES=Object.freeze([
 'CAD','USD','EUR','GBP','CHF','JPY','CNY','AUD','NZD','MXN','BRL','MAD','AED','INR'
]);
export const RADIUS_CHOICES=Object.freeze([10,25,50,75,100,125,150,200,250,300,500]);
const UI=Object.freeze({
 'fr-CA':{
  title:'Langue, devise et région',subtitle:'Vos préférences personnelles et la région de votre duo',
  language:'Langue de mon application',currency:'Ma devise',individual:'Mes préférences',
  duo:'Nos sorties à deux',departure:'Ville ou lieu de départ',distance:'Distance maximale par la route',
  gps:'Utiliser ma position GPS',savePersonal:'Enregistrer mes préférences',
  saveDuo:'Enregistrer la région du duo',auto:'Adaptation locale des 100 surprises',
  info:'Une seule ville et une seule limite de distance pour le couple. Chaque membre garde sa langue et sa devise.',
  privacy:'Le GPS ne fonctionne que sur demande. Seule une position approximative est enregistrée pour le duo.',
  provider:'Les lieux réels et les trajets routiers nécessitent un service de recherche et de calcul d’itinéraire. Aucun établissement ne sera inventé.',
  notConfigured:'Ville non définie',you:'Mon affichage',shared:'Partagé avec mon partenaire',
  saved:'Préférences enregistrées',geolocationUnavailable:'Localisation indisponible. Entrez votre ville manuellement.',
  geolocationRefused:'La permission GPS a été refusée. Entrez une ville manuellement.',
  gpsDetected:'Position approximative enregistrable',enable:'Activer',disable:'Désactiver',
  back:'Retour',home:'Accueil',evening:'Soirée',surprise:'Surprise',advent:'Avent',settings:'Réglages',
  menu:'Langue, devise et région',menuDesc:'10 langues · devises internationales · distance',
  noLive:'La recherche automatique d’établissements n’est pas encore activée.',
  unavailable:'La recherche routière est en préparation : la limite ne s’applique pas encore aux tirages officiels.',
  currencyNote:'La devise choisie change l’affichage; les montants historiques en dollars canadiens ne doivent être convertis qu’avec un taux réel.'
 },
 en:{title:'Language, currency & region',subtitle:'Your preferences and your couple’s home area',language:'My app language',currency:'My currency',individual:'My preferences',duo:'Our outings',departure:'Starting city or area',distance:'Maximum driving distance',gps:'Use my GPS location',savePersonal:'Save my preferences',saveDuo:'Save our region',auto:'Localize our 100 surprises',info:'One starting area and driving limit for the couple. Each member has their own language and currency.',privacy:'GPS is only used on request. Only an approximate position is saved for the couple.',provider:'Real places and road distances require a place-search and routing provider. No places will be invented.',notConfigured:'No city selected',you:'My display',shared:'Shared with my partner',saved:'Preferences saved',geolocationUnavailable:'Location unavailable. Enter a city manually.',geolocationRefused:'GPS permission denied. Enter a city manually.',gpsDetected:'Approximate location ready to save',enable:'Enable',disable:'Disable',back:'Back',home:'Home',evening:'Evening',surprise:'Surprise',advent:'Advent',settings:'Settings',menu:'Language, currency & region',menuDesc:'10 languages · international currencies · distance',noLive:'Automated venue search is not enabled yet.',unavailable:'Road search is being prepared: the distance limit does not yet affect official rolls.',currencyNote:'Your currency changes the display; historic Canadian-dollar budgets must use real exchange rates.'},
 es:{title:'Idioma, moneda y región',subtitle:'Tus preferencias y la zona de la pareja',language:'Idioma de la aplicación',currency:'Mi moneda',individual:'Mis preferencias',duo:'Nuestras salidas',departure:'Ciudad de salida',distance:'Distancia máxima por carretera',gps:'Usar mi ubicación GPS',savePersonal:'Guardar preferencias',saveDuo:'Guardar región de la pareja',auto:'Adaptar las 100 sorpresas',info:'La pareja comparte una ciudad y un límite. Cada persona elige su idioma y moneda.',privacy:'El GPS solo se usa si lo solicitas. Se guarda una ubicación aproximada.',provider:'Los lugares reales y las rutas requieren servicios externos. No inventaremos establecimientos.',notConfigured:'Sin ciudad',you:'Mi pantalla',shared:'Compartido con mi pareja',saved:'Preferencias guardadas',geolocationUnavailable:'Ubicación no disponible. Escribe tu ciudad.',geolocationRefused:'Permiso GPS denegado.',gpsDetected:'Ubicación aproximada lista',enable:'Activar',disable:'Desactivar',back:'Volver',home:'Inicio',evening:'Velada',surprise:'Sorpresa',advent:'Adviento',settings:'Ajustes',menu:'Idioma, moneda y región',menuDesc:'10 idiomas · monedas · distancia',noLive:'La búsqueda automática aún no está disponible.',unavailable:'El límite no afecta aún a los sorteos oficiales.',currencyNote:'Los precios históricos en CAD requieren tipos de cambio reales.'},
 pt:{title:'Idioma, moeda e região',subtitle:'Preferências e área do casal',language:'Idioma da aplicação',currency:'Minha moeda',individual:'Minhas preferências',duo:'Nossos passeios',departure:'Cidade de partida',distance:'Distância máxima por estrada',gps:'Usar localização GPS',savePersonal:'Guardar preferências',saveDuo:'Guardar região',auto:'Adaptar as 100 surpresas',info:'Uma área e um limite para o casal; idioma e moeda individuais.',privacy:'O GPS só é usado mediante pedido. Apenas a localização aproximada é guardada.',provider:'Locais reais e trajetos precisam de serviços externos. Não inventaremos locais.',notConfigured:'Cidade não definida',you:'Minha aplicação',shared:'Partilhado com o parceiro',saved:'Preferências guardadas',geolocationUnavailable:'Localização indisponível.',geolocationRefused:'Permissão GPS recusada.',gpsDetected:'Localização aproximada pronta',enable:'Ativar',disable:'Desativar',back:'Voltar',home:'Início',evening:'Noite',surprise:'Surpresa',advent:'Advento',settings:'Definições',menu:'Idioma, moeda e região',menuDesc:'10 idiomas · moedas · distância',noLive:'Pesquisa de locais ainda não disponível.',unavailable:'O limite ainda não se aplica aos sorteios oficiais.',currencyNote:'Valores antigos em CAD exigem taxas de câmbio reais.'},
 de:{title:'Sprache, Währung & Region',subtitle:'Persönliche Vorlieben und gemeinsame Ausflugsregion',language:'App-Sprache',currency:'Meine Währung',individual:'Meine Einstellungen',duo:'Unsere Ausflüge',departure:'Startort',distance:'Maximale Fahrstrecke',gps:'GPS-Standort verwenden',savePersonal:'Einstellungen speichern',saveDuo:'Region speichern',auto:'100 Überraschungen regional anpassen',info:'Ein Startort und Fahrstreckenlimit für beide; Sprache und Währung individuell.',privacy:'GPS nur auf Anfrage; gespeichert wird nur ein ungefährer Standort.',provider:'Echte Orte und Fahrstrecken erfordern Such- und Routingdienste. Keine erfundenen Orte.',notConfigured:'Kein Ort festgelegt',you:'Meine Anzeige',shared:'Gemeinsam eingestellt',saved:'Einstellungen gespeichert',geolocationUnavailable:'Standort nicht verfügbar.',geolocationRefused:'GPS-Berechtigung abgelehnt.',gpsDetected:'Ungefährer Standort bereit',enable:'Aktivieren',disable:'Deaktivieren',back:'Zurück',home:'Start',evening:'Abend',surprise:'Überraschung',advent:'Advent',settings:'Einstellungen',menu:'Sprache, Währung & Region',menuDesc:'10 Sprachen · Währungen · Entfernung',noLive:'Automatische Ortssuche noch nicht aktiv.',unavailable:'Fahrtlimit gilt noch nicht für offizielle Würfe.',currencyNote:'Historische CAD-Preise erfordern echte Wechselkurse.'},
 it:{title:'Lingua, valuta e zona',subtitle:'Preferenze personali e zona di coppia',language:'Lingua dell’app',currency:'La mia valuta',individual:'Le mie preferenze',duo:'Le nostre uscite',departure:'Città di partenza',distance:'Distanza massima su strada',gps:'Usa la posizione GPS',savePersonal:'Salva preferenze',saveDuo:'Salva zona',auto:'Adatta le 100 sorprese',info:'Una città e un limite condivisi; lingua e valuta personali.',privacy:'Il GPS funziona solo su richiesta. Si salva una posizione approssimativa.',provider:'Luoghi e percorsi richiedono servizi esterni. Nessun luogo inventato.',notConfigured:'Nessuna città',you:'La mia app',shared:'Condiviso con il partner',saved:'Preferenze salvate',geolocationUnavailable:'Posizione non disponibile.',geolocationRefused:'Accesso GPS negato.',gpsDetected:'Posizione approssimativa pronta',enable:'Attiva',disable:'Disattiva',back:'Indietro',home:'Home',evening:'Serata',surprise:'Sorpresa',advent:'Avvento',settings:'Impostazioni',menu:'Lingua, valuta e zona',menuDesc:'10 lingue · valute · distanza',noLive:'Ricerca automatica non ancora attiva.',unavailable:'Il limite non modifica ancora i lanci ufficiali.',currencyNote:'I prezzi storici CAD richiedono tassi di cambio reali.'},
 nl:{title:'Taal, valuta en regio',subtitle:'Jouw voorkeuren en jullie omgeving',language:'App-taal',currency:'Mijn valuta',individual:'Mijn voorkeuren',duo:'Onze uitstapjes',departure:'Vertrekplaats',distance:'Maximale rijafstand',gps:'Mijn GPS-locatie gebruiken',savePersonal:'Voorkeuren opslaan',saveDuo:'Regio opslaan',auto:'100 verrassingen lokaal aanpassen',info:'Eén vertrekplaats en limiet voor beiden; taal en valuta per persoon.',privacy:'GPS alleen op verzoek; alleen een benaderde positie wordt opgeslagen.',provider:'Echte locaties en routes vereisen externe diensten. Geen verzonnen adressen.',notConfigured:'Geen plaats ingesteld',you:'Mijn weergave',shared:'Gedeeld met partner',saved:'Voorkeuren opgeslagen',geolocationUnavailable:'Locatie niet beschikbaar.',geolocationRefused:'GPS-toegang geweigerd.',gpsDetected:'Benaderde locatie klaar',enable:'Inschakelen',disable:'Uitschakelen',back:'Terug',home:'Start',evening:'Avond',surprise:'Verrassing',advent:'Advent',settings:'Instellingen',menu:'Taal, valuta en regio',menuDesc:'10 talen · valuta · afstand',noLive:'Automatisch zoeken is nog niet actief.',unavailable:'De limiet geldt nog niet voor officiële worpen.',currencyNote:'Historische CAD-bedragen vereisen echte wisselkoersen.'},
 ar:{title:'اللغة والعملة والمنطقة',subtitle:'تفضيلاتك ومنطقة الأنشطة المشتركة',language:'لغة التطبيق',currency:'عملتي',individual:'تفضيلاتي',duo:'نزهاتنا',departure:'مدينة الانطلاق',distance:'أقصى مسافة على الطريق',gps:'استخدام موقعي GPS',savePersonal:'حفظ تفضيلاتي',saveDuo:'حفظ منطقة الزوجين',auto:'تكييف المفاجآت المئة',info:'مدينة ومسافة مشتركتان، ولغة وعملة خاصة بكل شخص.',privacy:'يستخدم GPS عند الطلب فقط وتُحفظ منطقة تقريبية.',provider:'الأماكن الحقيقية والمسارات تحتاج خدمات بحث. لن نختلق أماكن.',notConfigured:'لم تُحدد مدينة',you:'العرض الخاص بي',shared:'مشترك مع الشريك',saved:'تم حفظ التفضيلات',geolocationUnavailable:'الموقع غير متاح.',geolocationRefused:'تم رفض إذن GPS.',gpsDetected:'الموقع التقريبي جاهز',enable:'تفعيل',disable:'تعطيل',back:'رجوع',home:'الرئيسية',evening:'أمسية',surprise:'مفاجأة',advent:'ديسمبر',settings:'الإعدادات',menu:'اللغة والعملة والمنطقة',menuDesc:'10 لغات · عملات · مسافة',noLive:'البحث التلقائي غير متاح بعد.',unavailable:'حد المسافة لا يؤثر بعد على السحب الرسمي.',currencyNote:'تحتاج الأسعار القديمة بالدولار الكندي إلى سعر صرف حقيقي.'},
 ja:{title:'言語・通貨・地域',subtitle:'個人設定とふたりの出発地域',language:'アプリの言語',currency:'表示通貨',individual:'個人設定',duo:'ふたりのお出かけ',departure:'出発する都市',distance:'車での最大距離',gps:'GPSで現在地を取得',savePersonal:'個人設定を保存',saveDuo:'地域を保存',auto:'100のサプライズを地域に合わせる',info:'出発地と距離は共通、言語と通貨は個別です。',privacy:'GPSは要求時のみ使用し、おおよその場所だけ保存します。',provider:'実在する施設と走行距離には検索サービスが必要です。架空の場所は表示しません。',notConfigured:'都市未設定',you:'自分の表示',shared:'パートナーと共有',saved:'保存しました',geolocationUnavailable:'位置情報を取得できません。',geolocationRefused:'GPSが許可されませんでした。',gpsDetected:'おおよその位置を取得しました',enable:'有効',disable:'無効',back:'戻る',home:'ホーム',evening:'今夜',surprise:'サプライズ',advent:'アドベント',settings:'設定',menu:'言語・通貨・地域',menuDesc:'10言語・通貨・距離',noLive:'施設検索はまだ有効ではありません。',unavailable:'距離制限はまだ公式抽選には適用されません。',currencyNote:'過去のCAD料金の換算には実際の為替レートが必要です。'},
 'zh-CN':{title:'语言、货币与地区',subtitle:'个人偏好与情侣出发地区',language:'应用语言',currency:'我的货币',individual:'个人偏好',duo:'我们的活动',departure:'出发城市',distance:'最大驾车距离',gps:'使用GPS定位',savePersonal:'保存偏好',saveDuo:'保存地区',auto:'按地区调整100个惊喜',info:'出发地和距离为情侣共享；语言与货币各自设置。',privacy:'GPS仅在您主动要求时使用，只保存大致位置。',provider:'真实地点和驾车距离需要外部服务；绝不虚构地点。',notConfigured:'未设置城市',you:'我的显示',shared:'与伴侣共享',saved:'已保存',geolocationUnavailable:'无法获取位置。',geolocationRefused:'未授予GPS权限。',gpsDetected:'已获取大致位置',enable:'启用',disable:'关闭',back:'返回',home:'首页',evening:'约会',surprise:'惊喜',advent:'圣诞日历',settings:'设置',menu:'语言、货币与地区',menuDesc:'10种语言 · 货币 · 距离',noLive:'自动搜索场所尚未启用。',unavailable:'距离上限暂不影响正式抽签。',currencyNote:'历史加元预算需要使用真实汇率。'}
});
export function localeOrDefault(locale){return LANGUAGES.some(([key])=>key===locale)?locale:'fr-CA';}
export function currencyOrDefault(currency){return CURRENCIES.includes(currency)?currency:'CAD';}
export function radiusOrDefault(radius){const n=Number(radius);return Number.isInteger(n)&&n>=10&&n<=500?n:125;}
export function t(locale,key){return (UI[localeOrDefault(locale)]||UI['fr-CA'])[key]||UI['fr-CA'][key]||key;}
export function htmlDirection(locale){return locale==='ar'?'rtl':'ltr';}
export function money(amount,currency='CAD',locale='fr-CA'){
 const n=Number(amount);
 return Number.isFinite(n)?new Intl.NumberFormat(localeOrDefault(locale),{style:'currency',currency:currencyOrDefault(currency),maximumFractionDigits:0}).format(n):'—';
}
export function normalizeSharedTravel(input={}){
 const lat=Number(input.travel_origin_lat),lon=Number(input.travel_origin_lon);
 const hasCoords=input.travel_origin_lat!==null&&input.travel_origin_lat!==undefined&&input.travel_origin_lon!==null&&input.travel_origin_lon!==undefined&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
 return {travel_origin_label:String(input.travel_origin_label||'').trim().slice(0,120),
  travel_origin_lat:hasCoords?Math.round(lat*100)/100:null,
  travel_origin_lon:hasCoords?Math.round(lon*100)/100:null,
  travel_radius_km:radiusOrDefault(input.travel_radius_km),
  activity_localization_enabled:input.activity_localization_enabled===true};
}
export function isLocalSearchReady(settings,providerReady){
 const cfg=normalizeSharedTravel(settings);
 return !!(providerReady&&cfg.activity_localization_enabled&&cfg.travel_origin_lat!==null&&cfg.travel_origin_lon!==null);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
export function worldwideSettingsHtml({locale='fr-CA',currency='CAD',couple={}}={}){
 const l=localeOrDefault(locale),c=currencyOrDefault(currency),v=normalizeSharedTravel(couple),tr=key=>esc(t(l,key));
 const options=LANGUAGES.map(([value,name])=>'<option value="'+value+'"'+(value===l?' selected':'')+'>'+esc(name)+'</option>').join('');
 const currencies=CURRENCIES.map(value=>'<option value="'+value+'"'+(value===c?' selected':'')+'>'+value+'</option>').join('');
 return '<div class="world-prefs" lang="'+esc(l)+'" dir="'+htmlDirection(l)+'">'+
 '<section class="world-prefs-card"><h2>'+tr('individual')+'</h2>'+
 '<label for="world-locale">'+tr('language')+'<select id="world-locale">'+options+'</select></label>'+
 '<label for="world-currency">'+tr('currency')+'<select id="world-currency">'+currencies+'</select></label>'+
 '<button type="button" class="settings-primary" data-action="save-world-personal">'+tr('savePersonal')+'</button>'+
 '<p class="tiny-note">'+tr('currencyNote')+'</p></section>'+
 '<section class="world-prefs-card"><h2>'+tr('duo')+'</h2>'+
 '<p class="tiny-note">'+tr('info')+'</p>'+
 '<label for="world-origin">'+tr('departure')+'<input id="world-origin" maxlength="120" autocomplete="address-level2" value="'+esc(v.travel_origin_label)+'" placeholder="'+tr('notConfigured')+'"></label>'+
 '<button type="button" class="settings-secondary" data-action="world-gps">'+tr('gps')+'</button>'+
 '<div id="world-gps-status" role="status" aria-live="polite"></div>'+
 '<label for="world-radius">'+tr('distance')+
 '<select id="world-radius">'+RADIUS_CHOICES.map(n=>'<option value="'+n+'"'+(n===v.travel_radius_km?' selected':'')+'>'+n+' km</option>').join('')+'</select></label>'+
 '<label class="push-option"><span>'+tr('auto')+'</span><input type="checkbox" id="world-local-enabled" '+(v.activity_localization_enabled?'checked':'')+'></label>'+
 '<button type="button" class="settings-primary" data-action="save-world-duo">'+tr('saveDuo')+'</button>'+
 '<p class="tiny-note">'+tr('privacy')+'</p><p class="tiny-note">'+tr('provider')+'</p>'+
 '<p class="tiny-note">'+tr('unavailable')+'</p></section></div>';
}

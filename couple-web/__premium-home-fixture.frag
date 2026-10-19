// TEST-ONLY fixture injected in a temporary copy of actual app.js by CI.
// No customer data and no Supabase writes; calls the PRODUCTION renderHome().
export function __mountActualPremiumHomeFixture(face=2){
 localStorage.setItem('loveroll-install-prompt-home-test-owner','dismissed');
 Object.assign(state,{
  user:{id:'home-test-owner',email:'test@example.invalid'},
  profile:{id:'home-test-owner',display_name:'Fred',birthday_md:'04-14'},
  wellbeing:{user_id:'home-test-owner'},
  coupleId:'fixture-couple-not-a-real-id',
  couple:{id:'fixture-couple-not-a-real-id',owner_user_id:'home-test-owner'},
  members:[
   {user_id:'home-test-owner',name:'Fred',joined_at:'2026-10-01T00:00:00Z'},
   {user_id:'home-test-partner',name:'Émilie',joined_at:'2026-10-02T00:00:00Z'}
  ],
  weekly:face?{face,kind:'weekly',actor:'home-test-owner',created_at:'2026-10-14T16:00:00Z'}:null,
  session:{id:'fixture-session'},
  challenges:[
   {recipient:'home-test-owner',status:'pending',category:'SENSUEL'},
   {recipient:'home-test-owner',status:'done',category:'SEXUEL'},
   {recipient:'home-test-partner',status:'pending',category:'SENSUEL'}
  ],
  tab:'home',events:[],monthly:{},showAuth:false,demoMode:false,
  guidance:'playful',personal:[],forceInstallGuide:false,diceStatus:null
 });
 renderHome();
}

// A weekly-only reset in older LoveRoll versions could leave a Soirée
// open even though its weekly roll was removed. The previous D6/D35 faces
// must never be shown under a new weekly die. Database repair runs when a
// new session is requested; this check avoids stale counters meanwhile.
export function playableSessionForWeekly(session,weekly){
 if(!session||!weekly)return null;
 const sessionStart=Date.parse(session.started_at||'');
 const weeklyStart=Date.parse(weekly.created_at||'');
 if(Number.isFinite(sessionStart)&&Number.isFinite(weeklyStart)&&sessionStart<weeklyStart)
  return null;
 return session;
}

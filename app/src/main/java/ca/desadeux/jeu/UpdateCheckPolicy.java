package ca.desadeux.jeu;

// Pure Java policy: checks are nonblocking and do not require Android APIs.
// A manual check is always eligible. Native updates released later in the
// same day must not be hidden behind a date-only successful-check lock.
final class UpdateCheckPolicy {
 static final long QUIET_INTERVAL_MILLIS=30L*60L*1000L;
 private UpdateCheckPolicy(){}
 static boolean postponeQuietCheck(boolean quiet,long now,long lastSuccess){
  return quiet && lastSuccess>0L && now>=lastSuccess &&
   now-lastSuccess<QUIET_INTERVAL_MILLIS;
 }
}

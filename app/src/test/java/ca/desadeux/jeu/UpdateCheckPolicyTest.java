package ca.desadeux.jeu;

import org.junit.Test;
import static org.junit.Assert.*;

public final class UpdateCheckPolicyTest {
 private static final long T=2_000_000_000_000L;
 @Test public void manualCheckNeverBlockedAfterSuccess(){
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(false,T,T));
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(false,T+5000,T));
 }
 @Test public void quietCheckIsThrottledForAtMostThirtyMinutes(){
  long interval=UpdateCheckPolicy.QUIET_INTERVAL_MILLIS;
  assertTrue(UpdateCheckPolicy.postponeQuietCheck(true,T+interval-1,T));
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(true,T+interval,T));
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(true,T+2*interval,T));
 }
 @Test public void missingSuccessOrBackwardClockNeverLocksUpdateCheck(){
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(true,T,0));
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(true,T,T+300000));
 }
 @Test public void futureReleaseSameDayCanBeFoundAfterCooldown(){
  long firstCheck=T;
  long laterReleaseCheck=T+31L*60L*1000L;
  assertFalse(UpdateCheckPolicy.postponeQuietCheck(true,laterReleaseCheck,firstCheck));
 }
}

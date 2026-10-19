package ca.desadeux.jeu;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;

/** One free local weekly reminder per opt-in Android APK; no SMS or FCM required. */
public final class LoveRollWeeklyReminderReceiver extends BroadcastReceiver {
 static final String ACTION_REMIND="ca.desadeux.jeu.ACTION_WEEKLY_REMINDER";
 static final String PREFS="loveroll_weekly_notifications";
 static final String CHANNEL="loveroll_weekly";
 private static PendingIntent pending(Context context){
  Intent intent=new Intent(context,LoveRollWeeklyReminderReceiver.class).setAction(ACTION_REMIND);
  return PendingIntent.getBroadcast(context,120, intent,
   PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 }
 static boolean isEnabled(Context context){
  return context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean("enabled",false);
 }
 static void setEnabled(Context context,boolean enabled){
  context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
   .edit().putBoolean("enabled",enabled).apply();
  if(enabled)schedule(context);else{
   AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
   if(am!=null)am.cancel(pending(context));
  }
 }
 static void schedule(Context context){
  if(!isEnabled(context))return;
  ZoneId zone=ZoneId.of("America/Toronto");
  ZonedDateTime now=ZonedDateTime.now(zone);
  ZonedDateTime next=now.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY))
   .withHour(9).withMinute(0).withSecond(0).withNano(0);
  if(!next.isAfter(now))next=next.plusWeeks(1);
  AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
  if(am!=null)am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,
   next.toInstant().toEpochMilli(),pending(context));
 }
 @Override public void onReceive(Context context,Intent intent){
  if(!isEnabled(context))return;
  if(Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())){
   schedule(context);return;
  }
  if(!ACTION_REMIND.equals(intent.getAction()))return;
  // Re-arm using the proper local timezone, including after DST transitions.
  schedule(context);
  if(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(
    "android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  NotificationManager nm=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
  if(nm==null)return;
  if(Build.VERSION.SDK_INT>=26){
   NotificationChannel channel=new NotificationChannel(CHANNEL,"Rappel LoveRoll",
    NotificationManager.IMPORTANCE_DEFAULT);
   channel.setDescription("Rappel du dé hebdomadaire LoveRoll");
   nm.createNotificationChannel(channel);
  }
  Intent open=new Intent(context,ConnectedLoveRollActivity.class);
  PendingIntent click=PendingIntent.getActivity(context,52,open,
   PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  nm.notify(157,new NotificationCompat.Builder(context,CHANNEL)
   .setSmallIcon(R.drawable.ic_desadeux)
   .setContentTitle("LoveRoll 🎲 Votre dé est prêt")
   .setContentText("Votre rituel hebdomadaire vous attend.")
   .setAutoCancel(true).setContentIntent(click)
   .setPriority(NotificationCompat.PRIORITY_DEFAULT).build());
 }
}

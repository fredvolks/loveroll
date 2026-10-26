package ca.desadeux.jeu;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Remote FCM deliveries contain only generic reminders, never intimate content. */
public final class LoveRollFcmService extends FirebaseMessagingService {
 private static final String CHANNEL="loveroll_push_general";
 @Override public void onNewToken(String token){
  if(token!=null&&!token.isEmpty())
   getSharedPreferences("loveroll_native_push",MODE_PRIVATE).edit().putString("device_token",token).apply();
 }
 @Override public void onMessageReceived(RemoteMessage remote){
  Map<String,String> data=remote.getData();
  String kind=data.get("kind");
  if(kind==null||!kind.matches("weekly|invitation|monthly|special"))return;
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(
    "android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  String title,body;
  switch(kind){
   case "weekly":title="🎲 Votre dé LoveRoll est prêt !";body="Une nouvelle semaine de surprises vous attend ♡";break;
   case "invitation":title="♥ Votre partenaire vous a rejoint !";body="Votre univers à deux est maintenant prêt.";break;
   case "monthly":title="✦ Une nouvelle surprise vous attend !";body="Découvrez votre prochain rendez-vous à deux.";break;
   default:title="🎁 Un moment spécial approche !";body="Une nouvelle surprise LoveRoll vous attend.";
  }
  NotificationManager manager=getSystemService(NotificationManager.class);
  if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(CHANNEL,"LoveRoll — rappels",NotificationManager.IMPORTANCE_DEFAULT));
  String screen="home";
  if(kind.equals("weekly"))screen="session";
  if(kind.equals("monthly")||kind.equals("special"))screen="special";
  Intent open=new Intent(this,ConnectedLoveRollActivity.class)
    .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP)
    .putExtra("push_section",screen);
  PendingIntent pending=PendingIntent.getActivity(this,kind.hashCode(),open,
    PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  int id=(kind+":"+System.currentTimeMillis()/60000L).hashCode();
  NotificationCompat.Builder note=new NotificationCompat.Builder(this,CHANNEL)
   .setSmallIcon(R.drawable.ic_desadeux).setContentTitle(title).setContentText(body)
   .setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT).setContentIntent(pending);
  manager.notify(id,note.build());
 }
}

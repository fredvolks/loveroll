package ca.desadeux.jeu;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** Google receives the SHA-256 hex digest; Supabase receives the original nonce. */
public final class GoogleNonce {
 private GoogleNonce(){}

 public static String sha256Hex(String rawNonce){
  if(rawNonce==null||rawNonce.isEmpty())throw new IllegalArgumentException("Nonce manquant");
  try{
   byte[] bytes=MessageDigest.getInstance("SHA-256")
      .digest(rawNonce.getBytes(StandardCharsets.UTF_8));
   final char[] hex="0123456789abcdef".toCharArray();
   char[] out=new char[bytes.length*2];
   for(int i=0;i<bytes.length;i++){
    int b=bytes[i]&0xff;
    out[2*i]=hex[b>>>4];
    out[2*i+1]=hex[b&15];
   }
   return new String(out);
  }catch(NoSuchAlgorithmException e){
   throw new IllegalStateException("SHA-256 indisponible",e);
  }
 }
}

package ca.desadeux.jeu;

import org.junit.Test;
import static org.junit.Assert.*;

public final class GoogleNonceTest {
 @Test public void sha256HashUsesLowercaseHex(){
  assertEquals("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
   GoogleNonce.sha256Hex("test"));
 }
 @Test public void hashesTheRawNonceWithoutSendingItInPlaintextToGoogle(){
  String nonce="encoded-R4wN0nce_with_underscore-42";
  String googleNonce=GoogleNonce.sha256Hex(nonce);
  assertNotEquals(nonce,googleNonce);
  assertTrue(googleNonce.matches("[a-f0-9]{64}"));
  assertEquals(googleNonce,GoogleNonce.sha256Hex(nonce));
 }
 @Test(expected=IllegalArgumentException.class)
 public void rejectsMissingNonce(){
  GoogleNonce.sha256Hex("");
 }
}

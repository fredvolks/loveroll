package ca.desadeux.jeu;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class JournalStatsTest {
 private static JournalStats.Entry relation(String id,String date){
  return new JournalStats.Entry(id,"relation",date,"","",0);
 }
 private static JournalStats.Entry survey(String id,String date,String who,int rating){
  return new JournalStats.Entry(id,"survey",date,who,"sample",rating);
 }
 @Test public void weeklyMonthlyYearlyAreDifferentTimeWindows(){
  List<JournalStats.Entry> entries=new ArrayList<>();
  LocalDate today=LocalDate.of(2026,10,13); // Tuesday
  entries.add(relation("a","2026-10-13"));
  entries.add(relation("b","2026-10-12"));
  entries.add(relation("c","2026-10-08"));
  entries.add(relation("d","2026-09-29"));
  entries.add(relation("e","2026-01-01"));
  entries.add(relation("f","2025-12-31"));
  entries.add(survey("s","2026-10-13","Fred",5));
  assertEquals(2,JournalStats.week(entries,today));
  assertEquals(3,JournalStats.month(entries,today));
  assertEquals(5,JournalStats.year(entries,today));
  assertEquals(1,JournalStats.dayCount(entries,today));
  assertEquals(0,JournalStats.dayCount(entries,LocalDate.of(2026,10,14)));
 }
 @Test public void surveysFromBothPartnersProduceOneUnbiasedAverage(){
  List<JournalStats.Entry> entries=new ArrayList<>();
  entries.add(survey("fred-session","2026-10-13","Fred",5));
  entries.add(survey("emilie-session","2026-10-13","Émilie",3));
  entries.add(survey("invalid","2026-10-13","Fred",0));
  entries.add(relation("event","2026-10-13"));
  assertEquals(2,JournalStats.ratedCount(entries));
  assertEquals(4f,JournalStats.meanRating(entries),.001f);
  assertEquals(1,JournalStats.year(entries,LocalDate.of(2026,10,13)));
 }
 @Test public void invalidDatesAreIgnoredRatherThanInflatingCounts(){
  List<JournalStats.Entry> entries=new ArrayList<>();
  entries.add(relation("old","2020-01-01"));
  entries.add(relation("invalid","not-a-date"));
  entries.add(relation("future","2026-10-31"));
  entries.add(relation("today","2026-10-13"));
  assertEquals(1,JournalStats.month(entries,LocalDate.of(2026,10,13)));
  assertEquals(2,JournalStats.month(entries,LocalDate.of(2026,10,31)));
 }
 @Test public void emptyHistoryDisplaysZerosWithoutInventingRelations(){
  List<JournalStats.Entry> entries=new ArrayList<>();
  LocalDate date=LocalDate.of(2026,10,13);
  assertEquals(0,JournalStats.week(entries,date));
  assertEquals(0,JournalStats.month(entries,date));
  assertEquals(0,JournalStats.year(entries,date));
  assertEquals(0,JournalStats.ratedCount(entries));
  assertEquals(0f,JournalStats.meanRating(entries),.001f);
 }
}

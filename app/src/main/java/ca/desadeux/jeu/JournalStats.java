package ca.desadeux.jeu;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.time.YearMonth;
import java.util.List;

/** Pure calculations. Counts only explicitly logged encounters, not completed game sessions. */
public final class JournalStats {
 private JournalStats(){}
 public static final class Entry {
  public final String id,type,date,who,session;
  public final int rating;
  public Entry(String id,String type,String date,String who,String session,int rating){
   this.id=id;this.type=type;this.date=date;this.who=who;this.session=session;this.rating=rating;
  }
 }
 public static int relations(List<Entry> entries,LocalDate from,LocalDate through){
  int total=0;
  for(Entry e:entries){
   if(!"relation".equals(e.type))continue;
   try{
    LocalDate d=LocalDate.parse(e.date);
    if(!d.isBefore(from)&&!d.isAfter(through))total++;
   }catch(Exception ignored){}
  }
  return total;
 }
 public static int week(List<Entry> entries,LocalDate today){
  return relations(entries,today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),today);
 }
 public static int month(List<Entry> entries,LocalDate today){
  return relations(entries,YearMonth.from(today).atDay(1),today);
 }
 public static int year(List<Entry> entries,LocalDate today){
  return relations(entries,LocalDate.of(today.getYear(),1,1),today);
 }
 public static float meanRating(List<Entry> entries){
  float sum=0;int count=0;
  for(Entry e:entries){
   if(!"survey".equals(e.type)||e.rating<1||e.rating>5)continue;
   sum+=e.rating;count++;
  }
  return count==0?0:sum/count;
 }
 public static int ratedCount(List<Entry> entries){
  int n=0;for(Entry e:entries)if("survey".equals(e.type)&&e.rating>=1&&e.rating<=5)n++;return n;
 }
 public static int dayCount(List<Entry> entries,LocalDate day){
  return relations(entries,day,day);
 }
}

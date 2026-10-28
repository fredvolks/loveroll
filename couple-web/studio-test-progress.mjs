// Read-only QA milestones; derived exclusively from server-provided game state.
// Never fabricate rolls/cards or mark a scenario as passed from navigation alone.
export function studioTestProgress(status,connectedSeats){
 const validPair=status?.ready===true;
 const game=validPair&&!status.game?.error?status.game:null;
 const hasFace=value=>Number.isInteger(value)&&value>=1&&value<=100;
 const logged=seat=>connectedSeats?.has?.(seat)===true;
 const steps=[
  {key:'pair',title:'Duo technique A+B créé',done:status?.ready===true},
  {key:'auth',title:'Les deux vrais joueurs connectés',done:validPair&&logged('A')&&logged('B')},
  {key:'weekly',title:'D6 hebdomadaire enregistré',done:hasFace(game?.weekly_face)&&game.weekly_face<=6},
  {key:'surprise',title:'D100 Surprise enregistré',done:hasFace(game?.monthly_face)},
  {key:'evening',title:'Soirée officielle démarrée',done:game?.session==='open'||game?.session==='finished'},
  {key:'eveningA',title:'D6 Soirée du joueur A enregistré',done:hasFace(game?.personal_faces?.A)&&game.personal_faces.A<=6},
  {key:'eveningB',title:'D6 Soirée du joueur B enregistré',done:hasFace(game?.personal_faces?.B)&&game.personal_faces.B<=6},
  {key:'cards',title:'Au moins un vrai défi Soirée enregistré',done:Number.isInteger(game?.challenges_total)&&game.challenges_total>0},
  {key:'eclat',title:'Accès Éclat technique vérifié',done:game?.eclat_enabled===true}
 ];
 const completed=steps.filter(step=>step.done).length;
 return {steps,completed,total:steps.length};
}

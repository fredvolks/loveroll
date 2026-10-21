// Shared presentation of the saved D6 result. Never draws or changes a result.
export function monthlyInvitation(monthly={},members=[]){
 const face=Number(monthly?.monthly_host?.face);
 if(!monthly?.monthly_activity||!Number.isInteger(face)||face<1||face>6)return null;
 const index=face%2===0?0:1;
 return {index,host:members[index]||null,guest:members[1-index]||null};
}

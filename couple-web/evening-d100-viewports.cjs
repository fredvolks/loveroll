'use strict';
// All seven mobile shapes remain mandatory. CI splits them into independent
// parallel jobs; local runs without a lane still verify the complete set.
const ALL=Object.freeze([[320,568],[360,640],[360,740],[393,852],[412,824],[412,915],[430,932]].map(v=>Object.freeze(v)));
const LANES=Object.freeze({a:Object.freeze(ALL.slice(0,4)),b:Object.freeze(ALL.slice(4))});
function eveningD100Viewports(lane='all'){
 if(lane==='all')return ALL;
 if(lane==='a'||lane==='b')return LANES[lane];
 throw Error('Unknown mandatory D100 viewport lane: '+String(lane));
}
module.exports={ALL,LANES,eveningD100Viewports};

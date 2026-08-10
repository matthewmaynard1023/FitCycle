const $ = id => document.getElementById(id);
const storeKey = "fitcycle-v1";
let state = JSON.parse(localStorage.getItem(storeKey) || "{}");
let plan = state.plan || [];

const exerciseDB = {
  push: ["Barbell Bench Press","Incline Dumbbell Press","Overhead Press","Cable/Lateral Raise","Triceps Pressdown"],
  pull: ["Romanian Deadlift","Lat Pulldown / Pull-up","Chest-Supported Row","Cable Row","Dumbbell Curl"],
  legs: ["Back Squat","Romanian Deadlift","Leg Press","Leg Curl","Calf Raise"],
  upper: ["Barbell Bench Press","Chest-Supported Row","Overhead Press","Lat Pulldown / Pull-up","Dumbbell Curl","Triceps Pressdown"],
  lower: ["Back Squat","Romanian Deadlift","Bulgarian Split Squat","Leg Curl","Calf Raise"],
  full: ["Back Squat","Barbell Bench Press","Chest-Supported Row","Romanian Deadlift","Overhead Press","Lat Pulldown / Pull-up"]
};

function save(){ localStorage.setItem(storeKey, JSON.stringify({...state, plan})); }

function splitFor(days){
  if(days===3) return ["full","full","full"];
  if(days===4) return ["upper","lower","upper","lower"];
  if(days===5) return ["push","pull","legs","upper","lower"];
  return ["push","pull","legs","push","pull","legs"];
}

function params(goal, week, name){
  const compound = /Squat|Deadlift|Bench|Press|Row|Pulldown|Pull-up/.test(name);
  let sets = compound ? 3 : 2, reps = compound ? "6–10" : "10–15", rir = 3;
  if(goal==="strength"){ sets=compound?4:3; reps=compound?"4–6":"8–12"; }
  if(goal==="hypertrophy"){ sets=compound?3:3; reps=compound?"6–10":"10–15"; }
  if(goal==="fatloss"||goal==="general"){ sets=compound?3:2; reps=compound?"6–10":"10–15"; }
  if(week===2) rir=2;
  if(week===3){ rir=1; if(compound) sets+=1; }
  if(week===4){ rir=4; sets=Math.max(2,Math.ceil(sets*.6)); }
  return {sets,reps,rir};
}

function generate(){
  const goal=$("goal").value, days=+$("days").value, cardio=+$("cardioDays").value;
  const split=splitFor(days);
  plan=[1,2,3,4].map(week=>({
    week,
    days: split.map((type,i)=>({
      name:`Day ${i+1} — ${type[0].toUpperCase()+type.slice(1)}`,
      exercises: exerciseDB[type].map(name=>({name,...params(goal,week,name)})),
      cardio: i < cardio ? (week===4 ? "20–25 min easy Zone 2" : "25–35 min Zone 2") : null
    }))
  }));
  state.settings={goal,days,cardio,experience:$("experience").value};
  save(); render();
}

function readiness(){
  const sleep=+$("sleep").value, sore=+$("soreness").value, stress=+$("stress").value, energy=+$("energy").value;
  const score=(sleep + (6-sore) + (6-stress) + energy)/20;
  let text="Normal training load.", factor=1;
  if(score<.55){ text="Low readiness: consider ~10% less load and/or 1 fewer set."; factor=.90; }
  else if(score<.7){ text="Moderate readiness: consider ~5% less load."; factor=.95; }
  $("readinessText").textContent=`Readiness ${Math.round(score*100)}% — ${text}`;
  state.readiness={sleep,sore,stress,energy,score}; save();
  return factor;
}

function lastFor(name){
  const logs=state.logs||[];
  return [...logs].reverse().find(x=>x.name===name && x.weight>0);
}

function suggested(name){
  const last=lastFor(name); if(!last) return "Start conservatively; finish near the programmed RIR.";
  const factor=readiness();
  let mult=1;
  if(last.rir>=3) mult=1.05;
  else if(last.rir===2) mult=1.025;
  else if(last.rir<=0) mult=.95;
  const raw=last.weight*mult*factor;
  const rounded=Math.max(0,Math.round(raw/5)*5);
  return `Suggested next load: ~${rounded} lb (last: ${last.weight} × ${last.reps}, RIR ${last.rir}).`;
}

function render(){
  readiness();
  const week=+$("weekSelect").value;
  const w=plan.find(x=>x.week===week);
  $("plan").innerHTML = w ? w.days.map(d=>`
    <div class="day"><strong>${d.name}</strong>
    ${d.exercises.map(e=>`<div class="exercise"><strong>${e.name}</strong><span class="pill">${e.sets} sets</span><span class="pill">${e.reps} reps</span><span class="pill">RIR ${e.rir}</span></div>`).join("")}
    ${d.cardio?`<div class="exercise"><strong>Cardio</strong><span class="pill">${d.cardio}</span></div>`:""}
    </div>`).join("") : `<p class="muted">Generate a training block to begin.</p>`;

  const names = w ? [...new Set(w.days.flatMap(d=>d.exercises.map(e=>e.name)))] : [];
  $("log").innerHTML=names.map((name,i)=>`
    <div class="logrow">
      <div class="ename"><strong>${name}</strong><div class="suggestion">${suggested(name)}</div></div>
      <label>Weight<input inputmode="decimal" id="wt${i}" type="number" min="0"></label>
      <label>Reps<input inputmode="numeric" id="rp${i}" type="number" min="1"></label>
      <label>RIR<input inputmode="numeric" id="rr${i}" type="number" min="0" max="6" value="2"></label>
      <button onclick="logSet(${i}, '${name.replaceAll("'","\\'")}')">Save set</button>
    </div>`).join("");
}

window.logSet=(i,name)=>{
  const weight=+$("wt"+i).value,reps=+$("rp"+i).value,rir=+$("rr"+i).value;
  if(!weight||!reps) return alert("Enter weight and reps.");
  state.logs=state.logs||[];
  state.logs.push({date:new Date().toISOString(),name,weight,reps,rir,readiness:state.readiness?.score||1});
  save(); render();
};

["sleep","soreness","stress","energy"].forEach(id=>$(id).addEventListener("change",render));
$("weekSelect").addEventListener("change",render);
$("generateBtn").addEventListener("click",generate);
$("resetBtn").addEventListener("click",()=>{ if(confirm("Delete FitCycle data on this device?")){localStorage.removeItem(storeKey);location.reload();}});
if(state.settings){
  $("goal").value=state.settings.goal;$("days").value=state.settings.days;$("cardioDays").value=state.settings.cardio;$("experience").value=state.settings.experience;
}
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
render();

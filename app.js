const $ = id => document.getElementById(id);
const storeKey = "fitcycle-v2";
let legacy = JSON.parse(localStorage.getItem("fitcycle-v1") || "{}");
let state = JSON.parse(localStorage.getItem(storeKey) || "null") || legacy || {};
let plan = state.plan || [];
state.oneRMs = state.oneRMs || {};

const exerciseDB = {
  push: ["Barbell Bench Press","Incline Dumbbell Press","Overhead Press","Cable/Lateral Raise","Triceps Pressdown"],
  pull: ["Romanian Deadlift","Lat Pulldown / Pull-up","Chest-Supported Row","Cable Row","Dumbbell Curl"],
  legs: ["Back Squat","Romanian Deadlift","Leg Press","Leg Curl","Calf Raise"],
  upper: ["Barbell Bench Press","Chest-Supported Row","Overhead Press","Lat Pulldown / Pull-up","Dumbbell Curl","Triceps Pressdown"],
  lower: ["Back Squat","Romanian Deadlift","Bulgarian Split Squat","Leg Curl","Calf Raise"],
  full: ["Back Squat","Barbell Bench Press","Chest-Supported Row","Romanian Deadlift","Overhead Press","Lat Pulldown / Pull-up"]
};

const rmExercises = [...new Set(Object.values(exerciseDB).flat())];
const percentEligible = /Squat|Deadlift|Bench Press|Overhead Press|Leg Press|Row|Pulldown|Pull-up/;

function save(){ localStorage.setItem(storeKey, JSON.stringify({...state, plan})); }
function roundLoad(x){ return Math.max(0, Math.round(x/5)*5); }

// Epley estimated 1RM: weight × (1 + reps/30). A true single returns the entered weight.
function estimate1RM(weight,reps){
  if(!weight || !reps) return 0;
  if(reps === 1) return weight;
  return weight * (1 + reps/30);
}

function intensityFor(goal, week, name){
  if(!percentEligible.test(name)) return null;
  const table = {
    strength:    {1:.75, 2:.80, 3:.85, 4:.65},
    hypertrophy: {1:.65, 2:.70, 3:.75, 4:.60},
    fatloss:     {1:.65, 2:.675,3:.70, 4:.60},
    general:     {1:.65, 2:.70, 3:.725,4:.60}
  };
  return table[goal]?.[week] || .70;
}

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
  return {sets,reps,rir,intensity:intensityFor(goal,week,name)};
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
  if(score<.55){ text="Low readiness: working weights reduced ~10%."; factor=.90; }
  else if(score<.7){ text="Moderate readiness: working weights reduced ~5%."; factor=.95; }
  $("readinessText").textContent=`Readiness ${Math.round(score*100)}% — ${text}`;
  state.readiness={sleep,sore,stress,energy,score}; save();
  return factor;
}

function lastFor(name){
  const logs=state.logs||[];
  return [...logs].reverse().find(x=>x.name===name && x.weight>0);
}

function workingWeight(name, intensity){
  const rm=state.oneRMs?.[name]?.value;
  if(!rm || !intensity) return null;
  return roundLoad(rm * intensity * readiness());
}

function suggested(name){
  const last=lastFor(name); 
  const rm=state.oneRMs?.[name]?.value;
  if(!last) return rm ? `Saved estimated 1RM: ${roundLoad(rm)} lb.` : "Start conservatively; finish near the programmed RIR.";
  const factor=readiness();
  let mult=1;
  if(last.rir>=3) mult=1.05;
  else if(last.rir===2) mult=1.025;
  else if(last.rir<=0) mult=.95;
  const raw=last.weight*mult*factor;
  const rounded=roundLoad(raw);
  return `Suggested next load: ~${rounded} lb (last: ${last.weight} × ${last.reps}, RIR ${last.rir}).`;
}

function render1RM(){
  const ex=$("rmExercise");
  if(!ex.options.length) ex.innerHTML=rmExercises.map(n=>`<option>${n}</option>`).join("");
  const entries=Object.entries(state.oneRMs||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  $("rmSaved").innerHTML = entries.length ? `<h3>Saved estimated 1RMs</h3>` + entries.map(([name,x])=>`
    <div class="rm-row"><span>${name}</span><strong>${roundLoad(x.value)} lb</strong><button class="small ghost" onclick="deleteRM('${name.replaceAll("'","\\'")}')">Remove</button></div>`).join("") : `<p class="muted">No saved 1RM estimates yet.</p>`;
}

function render(){
  render1RM();
  readiness();
  const week=+$("weekSelect").value;
  const w=plan.find(x=>x.week===week);
  $("plan").innerHTML = w ? w.days.map(d=>`
    <div class="day"><strong>${d.name}</strong>
    ${d.exercises.map(e=>{
      const target=workingWeight(e.name,e.intensity);
      const pct=e.intensity ? `<span class="pill">${Math.round(e.intensity*1000)/10}% 1RM</span>` : "";
      const load=target ? `<span class="pill target">~${target} lb target</span>` : (e.intensity ? `<span class="pill missing">Add 1RM for load</span>` : "");
      return `<div class="exercise"><strong>${e.name}</strong><span class="pill">${e.sets} sets</span><span class="pill">${e.reps} reps</span><span class="pill">RIR ${e.rir}</span>${pct}${load}</div>`;
    }).join("")}
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
  // Keep an updated e1RM from sufficiently hard sets (RIR <= 2), adding RIR as estimated extra reps.
  if(rir<=2 && reps<=12){
    const effectiveReps=Math.min(15,reps+rir);
    const e1rm=estimate1RM(weight,effectiveReps);
    if(!state.oneRMs[name] || e1rm>state.oneRMs[name].value*.98){
      state.oneRMs[name]={value:e1rm,weight,reps,effectiveReps,date:new Date().toISOString(),source:"workout log"};
    }
  }
  save(); render();
};

window.deleteRM=(name)=>{ delete state.oneRMs[name]; save(); render(); };

$("saveRmBtn").addEventListener("click",()=>{
  const name=$("rmExercise").value, weight=+$("rmWeight").value, reps=+$("rmReps").value;
  if(!weight || !reps || reps<1 || reps>15) return alert("Enter a valid weight and 1–15 reps.");
  const e1rm=estimate1RM(weight,reps);
  state.oneRMs[name]={value:e1rm,weight,reps,date:new Date().toISOString(),source:"1RM calculator"};
  $("rmResult").value=`${roundLoad(e1rm)} lb`;
  save(); render();
});

function previewRM(){
  const weight=+$("rmWeight").value, reps=+$("rmReps").value;
  $("rmResult").value=(weight&&reps&&reps<=15) ? `${roundLoad(estimate1RM(weight,reps))} lb` : "";
}
$("rmWeight").addEventListener("input",previewRM);
$("rmReps").addEventListener("input",previewRM);
["sleep","soreness","stress","energy"].forEach(id=>$(id).addEventListener("change",render));
$("weekSelect").addEventListener("change",render);
$("generateBtn").addEventListener("click",generate);
$("resetBtn").addEventListener("click",()=>{ if(confirm("Delete FitCycle data on this device?")){localStorage.removeItem(storeKey);localStorage.removeItem("fitcycle-v1");location.reload();}});
if(state.settings){
  $("goal").value=state.settings.goal;$("days").value=state.settings.days;$("cardioDays").value=state.settings.cardio;$("experience").value=state.settings.experience;
}
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
render();

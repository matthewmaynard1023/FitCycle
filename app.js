const $ = id => document.getElementById(id);
const storeKey = "fitcycle-v5";
const legacy = JSON.parse(localStorage.getItem("fitcycle-v4") || localStorage.getItem("fitcycle-v3") || localStorage.getItem("fitcycle-v2") || localStorage.getItem("fitcycle-v1") || "{}");
let state = JSON.parse(localStorage.getItem(storeKey) || "null") || legacy || {};
let plan = state.plan || [];
state.oneRMs = state.oneRMs || {};
state.logs = state.logs || [];

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
function esc(s){ return String(s).replaceAll("'","\\'"); }

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

function repsFromIntensity(intensity, goal, week){
  if(!intensity) return null;
  const pct=Math.round(intensity*100);
  // Practical percentage-to-rep prescriptions. These are training targets, not max-effort rep tests.
  if(week===4) return pct<=60 ? "10" : "8";
  if(pct>=90) return "3";
  if(pct>=85) return goal==="strength" ? "4" : "5";
  if(pct>=80) return goal==="strength" ? "5" : "6";
  if(pct>=75) return goal==="strength" ? "6" : "8";
  if(pct>=70) return "8";
  if(pct>=65) return "10";
  return "12";
}

function prescriptionFor(goal, week, name){
  const intensity=intensityFor(goal,week,name);
  return {
    intensity,
    reps: repsFromIntensity(intensity,goal,week)
  };
}

function effectivePrescription(e, week){
  const goal=state.settings?.goal || $("goal")?.value || "hypertrophy";
  const rx=prescriptionFor(goal,week,e.name);
  return {
    intensity: e.intensity ?? rx.intensity,
    reps: (e.intensity != null && e.reps) ? e.reps : (rx.reps || e.reps)
  };
}

function upgradeSavedPlan(){
  if(!Array.isArray(plan) || !plan.length) return;
  const goal=state.settings?.goal || "hypertrophy";
  let changed=false;
  plan=plan.map(w=>({
    ...w,
    days:(w.days||[]).map(d=>({
      ...d,
      exercises:(d.exercises||[]).map(e=>{
        const rx=prescriptionFor(goal,w.week,e.name);
        if(e.intensity == null && rx.intensity != null){
          changed=true;
          return {...e,intensity:rx.intensity,reps:rx.reps || e.reps};
        }
        return e;
      })
    }))
  }));
  if(changed) save();
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
  if(goal==="strength") sets=compound?4:3;
  if(goal==="hypertrophy") sets=3;
  if(goal==="fatloss"||goal==="general") sets=compound?3:2;
  if(week===2) rir=2;
  if(week===3){ rir=1; if(compound) sets+=1; }
  if(week===4){ rir=4; sets=Math.max(2,Math.ceil(sets*.6)); }

  const rx=prescriptionFor(goal,week,name);
  if(rx.reps) reps=rx.reps;
  return {sets,reps,rir,intensity:rx.intensity};
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
  state.readiness={sleep,sore,stress,energy,score};
  return factor;
}

function lastFor(name){ return [...state.logs].reverse().find(x=>x.name===name && x.weight>0); }
function logsFor(name, week, dayIndex){ return state.logs.filter(x=>x.name===name && x.week===week && x.dayIndex===dayIndex); }

function workingWeight(name, intensity){
  const rm=state.oneRMs?.[name]?.value;
  if(!rm || !intensity) return null;
  return roundLoad(rm * intensity * readiness());
}

function suggestedLoad(name, intensity){
  const pctTarget=workingWeight(name,intensity);
  const last=lastFor(name);
  if(pctTarget) return pctTarget;
  if(!last) return "";
  let mult=1;
  if(last.rir>=3) mult=1.05;
  else if(last.rir===2) mult=1.025;
  else if(last.rir<=0) mult=.95;
  return roundLoad(last.weight*mult*readiness());
}

function render1RM(){
  const ex=$("rmExercise");
  if(!ex.options.length) ex.innerHTML=rmExercises.map(n=>`<option>${n}</option>`).join("");
  const entries=Object.entries(state.oneRMs||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  $("rmSaved").innerHTML = entries.length ? `<h3>Saved estimated 1RMs</h3>` + entries.map(([name,x])=>`
    <div class="rm-row"><span>${name}</span><strong>${roundLoad(x.value)} lb</strong><button class="small ghost" onclick="deleteRM('${esc(name)}')">Remove</button></div>`).join("") : `<p class="muted">No saved 1RM estimates yet.</p>`;
}

function setRowHtml(e, week, dayIndex, exIndex, setIndex){
  const existing=logsFor(e.name,week,dayIndex)[setIndex];
  const rx=effectivePrescription(e,week);
  const target=suggestedLoad(e.name,rx.intensity);
  const uid=`w${week}d${dayIndex}e${exIndex}s${setIndex}`;
  return `<div class="set-row ${existing?'completed':''}" id="row-${uid}">
    <div class="set-num">${existing?'✓':setIndex+1}</div>
    <label>Weight<input id="wt-${uid}" inputmode="decimal" type="number" min="0" step="2.5" value="${existing?.weight ?? target ?? ''}" placeholder="lb"></label>
    <label>Reps<input id="rp-${uid}" inputmode="numeric" type="number" min="1" value="${existing?.reps ?? rx.reps ?? ''}" placeholder="reps"></label>
    <label>RIR<input id="rr-${uid}" inputmode="numeric" type="number" min="0" max="6" value="${existing?.rir ?? e.rir}"></label>
    <button class="set-save" onclick="saveInlineSet('${uid}',${week},${dayIndex},${setIndex},'${esc(e.name)}')">${existing?'Update':'Log'}</button>
  </div>`;
}

function render(){
  render1RM();
  readiness();
  const week=+$("weekSelect").value;
  const w=plan.find(x=>x.week===week);
  $("plan").innerHTML = w ? w.days.map((d,di)=>`
    <div class="day">
      <div class="day-title"><strong>${d.name}</strong></div>
      ${d.exercises.map((e,ei)=>{
        const rx=effectivePrescription(e,week);
        const target=workingWeight(e.name,rx.intensity);
        const rm=state.oneRMs?.[e.name]?.value;
        const pct=rx.intensity ? `<span class="pill">${Math.round(rx.intensity*1000)/10}% 1RM</span>` : "";
        const load=target ? `<span class="pill target">Rx ${target} lb × ${rx.reps}</span>` : (rx.intensity ? `<button class="inline-link" onclick="jumpToRM('${esc(e.name)}')">+ Add 1RM to calculate load</button>` : "");
        const last=lastFor(e.name);
        const history=last ? `<span class="last-set">Last: ${last.weight} × ${last.reps} @ RIR ${last.rir}</span>` : '';
        return `<div class="exercise-card">
          <div class="exercise-head">
            <div><strong>${e.name}</strong><div class="meta"><span>${e.sets} sets</span><span>${rx.reps || e.reps} reps</span><span>RIR ${e.rir}</span>${pct}${load}</div>${history}</div>
          </div>
          <div class="sets-header"><span>Set</span><span>Weight</span><span>Reps</span><span>RIR</span><span></span></div>
          <div class="set-list">${Array.from({length:e.sets},(_,si)=>setRowHtml(e,week,di,ei,si)).join('')}</div>
          ${rm ? `<div class="e1rm-note">Saved e1RM: ${roundLoad(rm)} lb</div>` : ''}
        </div>`;
      }).join("")}
      ${d.cardio?`<div class="exercise-card cardio"><strong>Cardio</strong><span class="pill">${d.cardio}</span></div>`:""}
    </div>`).join("") : `<p class="muted">Generate a training block to begin.</p>`;
  save();
}

window.saveInlineSet=(uid,week,dayIndex,setIndex,name)=>{
  const weight=+$("wt-"+uid).value, reps=+$("rp-"+uid).value, rir=+$("rr-"+uid).value;
  if(!weight||!reps) return alert("Enter weight and reps.");
  const record={date:new Date().toISOString(),name,weight,reps,rir,week,dayIndex,setIndex,readiness:state.readiness?.score||1};
  const existingIndex=state.logs.findIndex(x=>x.name===name && x.week===week && x.dayIndex===dayIndex && x.setIndex===setIndex);
  if(existingIndex>=0) state.logs[existingIndex]=record; else state.logs.push(record);

  if(rir<=2 && reps<=12){
    const effectiveReps=Math.min(15,reps+rir);
    const e1rm=estimate1RM(weight,effectiveReps);
    if(!state.oneRMs[name] || e1rm>state.oneRMs[name].value*.98){
      state.oneRMs[name]={value:e1rm,weight,reps,effectiveReps,date:new Date().toISOString(),source:"workout log"};
    }
  }
  save(); render();
};

window.jumpToRM=(name)=>{
  $("rmExercise").value=name;
  document.getElementById("oneRmCard").scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>$("rmWeight").focus(),450);
};
window.deleteRM=(name)=>{ delete state.oneRMs[name]; save(); render(); };

$("saveRmBtn").addEventListener("click",()=>{
  const name=$("rmExercise").value, weight=+$("rmWeight").value, reps=+$("rmReps").value;
  if(!weight || !reps || reps<1 || reps>15) return alert("Enter a valid weight and 1–15 reps.");
  const e1rm=estimate1RM(weight,reps);
  state.oneRMs[name]={value:e1rm,weight,reps,date:new Date().toISOString(),source:"1RM calculator"};
  $("rmResult").value=`${roundLoad(e1rm)} lb`;
  upgradeSavedPlan();
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
$("resetBtn").addEventListener("click",()=>{ if(confirm("Delete FitCycle data on this device?")){localStorage.removeItem(storeKey);localStorage.removeItem("fitcycle-v4");localStorage.removeItem("fitcycle-v3");localStorage.removeItem("fitcycle-v2");localStorage.removeItem("fitcycle-v1");location.reload();}});
if(state.settings){
  $("goal").value=state.settings.goal;$("days").value=state.settings.days;$("cardioDays").value=state.settings.cardio;$("experience").value=state.settings.experience;
}
upgradeSavedPlan();
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js?v=5");
render();

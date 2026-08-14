import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import "./styles.css";

const STAGES = [
  { id: "artery", title: "Blood enters the kidney", short: "Renal artery", text: "The renal artery delivers blood to each kidney and branches into smaller vessels.", color: "#ef4444" },
  { id: "filter", title: "Glomerular filtration", short: "Filtration", text: "Pressure-driven filtration begins in the glomerulus and Bowman’s capsule.", color: "#8b5cf6" },
  { id: "reabsorb", title: "Tubular reabsorption", short: "Reabsorption", text: "Water, glucose and selected ions are recovered from tubular fluid into the blood.", color: "#06b6d4" },
  { id: "secrete", title: "Tubular secretion", short: "Secretion", text: "Additional wastes and ions move from blood into the tubular fluid for removal.", color: "#f59e0b" },
  { id: "urine", title: "Urine is concentrated", short: "Urine formation", text: "The nephron and collecting duct adjust water and solute content to form urine.", color: "#10b981" },
  { id: "ureter", title: "Urine leaves the kidney", short: "Urine passage", text: "Urine flows through the renal pelvis and ureter toward the bladder.", color: "#ec4899" },
];

const STRUCTURES = [
  ["Kidneys", "Paired retroperitoneal organs that filter blood and regulate homeostasis.", "🫘"],
  ["Renal artery", "Carries blood from the abdominal aorta toward the kidney.", "🩸"],
  ["Renal vein", "Returns blood from the kidney to the inferior vena cava.", "🔵"],
  ["Cortex", "Outer kidney region containing renal corpuscles and much of the tubule system.", "🟣"],
  ["Medulla", "Inner region organized into renal pyramids and associated collecting structures.", "🟠"],
  ["Renal pelvis", "Funnel-like collecting region that leads toward the ureter.", "💧"],
  ["Ureter", "Muscular tube that propels urine from kidney to bladder.", "〰️"],
  ["Bladder", "Expandable muscular reservoir for urine before urination.", "🫧"],
  ["Urethra", "Final passage through which urine leaves the body.", "➡️"],
  ["Nephron", "Functional microscopic unit responsible for filtration and tubular processing.", "🔬"],
  ["Glomerulus", "Capillary tuft where filtration begins.", "🧬"],
  ["Collecting duct", "Carries processed tubular fluid toward the renal papilla and calyces.", "💧"],
];

const DISEASES = {
  healthy: { label: "Healthy", color: "#22d3ee", text: "Normal educational model: unobstructed flow and full filtration capacity." },
  stone: { label: "Kidney stone", color: "#f59e0b", text: "A stone can obstruct urinary flow. In this simulation the stone is placed near the ureter entrance." },
  infection: { label: "Kidney infection", color: "#fb7185", text: "Inflamed tissue is represented with a glowing field. Real infections require clinical evaluation." },
  ckd: { label: "Chronic kidney disease", color: "#a78bfa", text: "A simplified reduced-filtration model. CKD is complex and cannot be diagnosed from this simulation." },
};

function useSound() {
  const ctxRef = useRef(null);
  const beep = (frequency = 440, duration = 0.08, type = "sine") => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {}
  };
  return { beep };
}

function BloodCell({ path = "artery", index = 0 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.45 + index * 0.19) % 1;
    const x = THREE.MathUtils.lerp(-4.2, 4.2, t);
    ref.current.position.set(x, 0.65 + Math.sin(t * 16 + index) * 0.08, 0.7 + Math.cos(t * 12 + index) * 0.08);
    ref.current.rotation.z += 0.03;
  });
  return <mesh ref={ref} scale={0.07}><torusGeometry args={[1, 0.35, 10, 18]} /><meshStandardMaterial color="#fb7185" emissive="#be123c" emissiveIntensity={0.8} /></mesh>;
}

function BloodFlow({ active = true }) {
  if (!active) return null;
  return <group>{Array.from({ length: 20 }, (_, i) => <BloodCell key={i} index={i} />)}</group>;
}

function Vessel({ side, vein = false }) {
  return (
    <group>
      <mesh position={[side * 1.1, 0.05, 0]} rotation={[0, 0, side * 0.12]}>
        <cylinderGeometry args={[vein ? 0.08 : 0.065, vein ? 0.12 : 0.09, 2.5, 18]} />
        <meshStandardMaterial color={vein ? "#2563eb" : "#ef4444"} emissive={vein ? "#172554" : "#7f1d1d"} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[side * 0.35, 0.05, 0]} rotation={[0, 0, -side * 0.45]}>
        <cylinderGeometry args={[vein ? 0.065 : 0.05, vein ? 0.08 : 0.065, 1.7, 16]} />
        <meshStandardMaterial color={vein ? "#2563eb" : "#ef4444"} emissive={vein ? "#172554" : "#7f1d1d"} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Aorta() {
  return (
    <group>
      <mesh position={[0, 0.15, -0.3]}>
        <cylinderGeometry args={[0.16, 0.19, 5.4, 24]} />
        <meshStandardMaterial color="#dc2626" emissive="#7f1d1d" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.15, 0.05]}>
        <cylinderGeometry args={[0.13, 0.16, 5.4, 24]} />
        <meshStandardMaterial color="#1d4ed8" emissive="#172554" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Kidney({ side, disease, selected, onClick }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    const s = selected ? 1.1 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 6);
    ref.current.rotation.y += delta * 0.05;
  });
  const color = disease === "healthy" ? "#b91c4b" : disease === "stone" ? "#9a3412" : disease === "infection" ? "#e11d48" : "#6d28d9";
  return (
    <group ref={ref} position={[side * 1.45, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh rotation={[0, 0, side * 0.15]}>
        <sphereGeometry args={[1.08, 48, 32]} />
        <meshStandardMaterial color={color} roughness={0.34} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[side * -0.7, 0, 0]} scale={[0.55, 0.72, 0.7]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={color} roughness={0.42} />
      </mesh>
      <mesh position={[side * -0.62, -0.1, 0.08]} scale={[0.22, 0.52, 0.2]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#92400e" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[side * -0.6, -1.35, 0]} rotation={[0.06 * side, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.095, 1.65, 16]} />
        <meshStandardMaterial color="#f2b27f" roughness={0.45} />
      </mesh>
      {disease === "stone" && <mesh position={[side * -0.6, -0.78, 0.03]}><icosahedronGeometry args={[0.16, 1]} /><meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.8} /></mesh>}
      {disease === "infection" && <Sparkles count={30} scale={[2.1, 2.4, 1.6]} size={2.2} speed={2} color="#fb7185" />}
      {disease === "ckd" && <mesh scale={[1.04, 1.04, 1.04]}><sphereGeometry args={[1.08, 32, 24]} /><meshBasicMaterial color="#c4b5fd" transparent opacity={0.13} wireframe /></mesh>}
      {selected && <Html distanceFactor={7} position={[0, 1.45, 0]}><div className="float-label"><b>{side < 0 ? "Left" : "Right"} kidney</b><span>Interactive anatomy</span></div></Html>}
    </group>
  );
}

function Bladder() {
  return <group position={[0, -3.1, 0]}><mesh scale={[0.72, 0.55, 0.48]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color="#fb7185" transparent opacity={0.82} roughness={0.25} /></mesh><mesh position={[-0.25, 0.55, 0]} rotation={[0,0,0.18]}><cylinderGeometry args={[0.055,0.08,1.6,14]} /><meshStandardMaterial color="#f2b27f" /></mesh><mesh position={[0.25, 0.55, 0]} rotation={[0,0,-0.18]}><cylinderGeometry args={[0.055,0.08,1.6,14]} /><meshStandardMaterial color="#f2b27f" /></mesh></group>;
}

function Urethra() {
  return <mesh position={[0,-4.15,0]}><cylinderGeometry args={[0.07,0.07,1.7,16]} /><meshStandardMaterial color="#f2b27f" /></mesh>;
}

function Nephron({ active, ckd }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.7) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 0, 1.15]} visible={active}>
      <mesh position={[-0.15, 0.7, 0]}><torusGeometry args={[0.42,0.1,16,32]} /><meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.65} /></mesh>
      <mesh position={[0.25, -0.2, 0]} rotation={[0.1,0,0]}><torusGeometry args={[0.65,0.075,16,48]} /><meshStandardMaterial color="#f59e0b" emissive="#78350f" emissiveIntensity={0.4} /></mesh>
      <mesh position={[-0.2, -1.15, 0]}><torusGeometry args={[0.75,0.075,16,48]} /><meshStandardMaterial color="#06b6d4" emissive="#164e63" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0.1,-2.0,0]}><cylinderGeometry args={[0.09,0.09,1.4,16]} /><meshStandardMaterial color="#10b981" emissive="#064e3b" emissiveIntensity={0.5} /></mesh>
      {Array.from({length:10},(_,i)=><mesh key={i} position={[-0.1 + Math.sin(i)*0.3,0.3-i*0.22,0.25]}><sphereGeometry args={[0.06,10,10]} /><meshStandardMaterial color={ckd ? "#c4b5fd" : "#67e8f9"} emissive={ckd ? "#7c3aed" : "#0e7490"} emissiveIntensity={0.9}/></mesh>)}
      <Html distanceFactor={6} position={[0, 1.45, 0]}><div className="micro-label"><b>NEPHRON</b><span>Filtration → tubular processing</span></div></Html>
    </group>
  );
}

function UrinePath() {
  return <group>
    <mesh position={[-1.45,-1.95,0]} rotation={[0.04,0,0]}><cylinderGeometry args={[0.075,0.09,2.2,16]} /><meshStandardMaterial color="#fbbf24" emissive="#92400e" emissiveIntensity={0.25}/></mesh>
    <mesh position={[1.45,-1.95,0]} rotation={[-0.04,0,0]}><cylinderGeometry args={[0.075,0.09,2.2,16]} /><meshStandardMaterial color="#fbbf24" emissive="#92400e" emissiveIntensity={0.25}/></mesh>
  </group>;
}

function CameraRig({ stage, focus }) {
  const { camera } = useThree();
  const target = useMemo(() => {
    if (focus === "kidney") return new THREE.Vector3(0,0,7);
    if (focus === "nephron") return new THREE.Vector3(0,0.1,4.5);
    if (focus === "bladder") return new THREE.Vector3(0,-2.3,6.5);
    const presets = [
      [0,0,7.5],[0,0.3,6.0],[0,0.1,5.2],[0,0,5.4],[0,-0.3,6.2],[0,-0.8,7.2]
    ];
    const [x,y,z] = presets[stage] || presets[0];
    return new THREE.Vector3(x,y,z);
  }, [stage, focus]);
  useFrame((_, delta) => {
    camera.position.lerp(target, 1 - Math.pow(0.001, delta));
    camera.lookAt(0, stage >= 4 ? -0.7 : 0, 0);
  });
  return null;
}

function Scene({ stage, disease, selected, setSelected, focus, cinematic }) {
  return <>
    <color attach="background" args={["#020617"]}/>
    <fog attach="fog" args={["#020617",7,18]}/>
    <ambientLight intensity={1.1}/>
    <directionalLight position={[5,7,5]} intensity={3}/>
    <pointLight position={[-4,2,3]} intensity={22} distance={9} color="#22d3ee"/>
    <pointLight position={[4,-3,2]} intensity={18} distance={8} color="#fb7185"/>
    <Aorta/><Vessel side={-1}/><Vessel side={1}/><Vessel side={-1} vein/><Vessel side={1} vein/>
    <Kidney side={-1} disease={disease} selected={selected === "left"} onClick={()=>setSelected(selected === "left" ? null : "left")}/>
    <Kidney side={1} disease={disease} selected={selected === "right"} onClick={()=>setSelected(selected === "right" ? null : "right")}/>
    <UrinePath/><Bladder/><Urethra/>
    <BloodFlow active={stage <= 1}/>
    <Nephron active={focus === "nephron" || stage >= 1} ckd={disease === "ckd"}/>
    <CameraRig stage={stage} focus={focus}/>
    <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={12} rotateSpeed={0.65} zoomSpeed={0.7}/>
    {cinematic && <Sparkles count={55} scale={[9,9,5]} size={2.2} speed={0.35} color="#67e8f9"/>}
    <Environment preset="night"/>
  </>;
}

function Quiz({ onClose, onScore }) {
  const questions = [
    ["What carries blood toward the kidney?", ["Renal artery","Ureter","Urethra","Bladder"], 0],
    ["Where does filtration begin?", ["Renal pelvis","Glomerulus","Bladder","Ureter"], 1],
    ["What is a major role of reabsorption?", ["Recover useful substances","Create red cells directly","Store urine","Move urine into the bladder"], 0],
    ["What carries urine from kidney to bladder?", ["Renal vein","Aorta","Ureter","Glomerulus"], 2],
    ["Which structure stores urine?", ["Bladder","Cortex","Medulla","Renal artery"], 0],
  ];
  const [q,setQ]=useState(0); const [picked,setPicked]=useState(null); const [score,setScore]=useState(0);
  const done = q === questions.length - 1 && picked !== null;
  const [prompt, options, answer] = questions[q];
  const choose = (i) => { if(picked!==null)return; setPicked(i); if(i===answer){setScore(s=>s+1);onScore(20);} };
  return <div className="modal"><div className="quiz-card"><button className="close" onClick={onClose}>×</button><div className="eyebrow">KIDNEYLAB CHALLENGE</div><small>QUESTION {q+1} / {questions.length}</small><h2>{done ? "Challenge complete" : prompt}</h2>{!done ? <><div className="answers">{options.map((o,i)=><button key={o} className={picked!==null ? i===answer ? "correct" : i===picked ? "wrong" : "" : ""} onClick={()=>choose(i)}>{String.fromCharCode(65+i)}. {o}</button>)}</div>{picked!==null&&<button className="next" onClick={()=>{if(q<questions.length-1){setQ(q+1);setPicked(null)}else onClose()}}>{q===questions.length-1?"Finish":"Next →"}</button>}</> : <div className="result"><div>🏆</div><strong>{score} / {questions.length}</strong><p>Your score has been added to your KidneyLab level.</p><button className="next" onClick={onClose}>Return to lab</button></div>}</div></div>;
}

function App() {
  const [stage,setStage]=useState(0); const [disease,setDisease]=useState("healthy"); const [selected,setSelected]=useState(null); const [playing,setPlaying]=useState(false); const [tab,setTab]=useState("journey"); const [focus,setFocus]=useState("body"); const [cinematic,setCinematic]=useState(true); const [score,setScore]=useState(0); const [level,setLevel]=useState(1); const [quiz,setQuiz]=useState(false); const [sound,setSound]=useState(true); const {beep}=useSound();
  useEffect(()=>{if(score>=100)setLevel(5);else if(score>=60)setLevel(4);else if(score>=40)setLevel(3);else if(score>=20)setLevel(2);},[score]);
  useEffect(()=>{if(!playing)return; const t=setInterval(()=>setStage(s=>{if(s>=STAGES.length-1){setPlaying(false);return s} return s+1}),3000); return ()=>clearInterval(t)},[playing]);
  const selectStage=(i)=>{setStage(i);setPlaying(false);if(sound)beep(300+i*80,0.07,"triangle")};
  const award=(p)=>setScore(s=>s+p);
  const current=STAGES[stage];
  return <div className="app">
    <header className="header"><div className="logo"><span>+</span>KIDNEY<span className="cyan">LAB</span></div><nav>{[["journey","Journey"],["collective","All Structures"],["disease","Disease Lab"],["game","Game"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</nav><div className="top-actions"><button className="sound" onClick={()=>setSound(v=>!v)}>{sound?"🔊":"🔇"}</button><button className="play-top" onClick={()=>{setPlaying(v=>!v);if(sound)beep(520)}}>{playing?"Ⅱ Pause":"▶ Start"}</button></div></header>
    <section className="hero3d"><div className="hud"><div className="eyebrow">3D HUMAN BIOLOGY • MEDICAL LEARNING GAME</div><h1>Explore the<span> Kidney.</span></h1><p>Rotate the body, inspect vessels, enter the nephron, trace urine and test your knowledge. Built as an educational simulation — not a diagnostic tool.</p><div className="levelbar"><div><span>LAB LEVEL</span><b>{level}</b></div><div className="xp"><span>XP</span><b>{score}</b></div><div className="xp-track"><i style={{width:`${Math.min(score,100)}%`}}/></div></div><div className="stage-card"><div className="stage-number">{String(stage+1).padStart(2,"0")}</div><div><small>CURRENT PROCESS</small><h2>{current.title}</h2><p>{current.text}</p></div></div><div className="controls-row"><button onClick={()=>selectStage(Math.max(0,stage-1))}>←</button><button className="primary" onClick={()=>{setPlaying(v=>!v);if(sound)beep(600)}}>{playing?"Pause journey":"Animate journey"}</button><button onClick={()=>selectStage(Math.min(5,stage+1))}>→</button></div></div>
      <div className="canvas-shell"><Canvas camera={{position:[0,0,7.5],fov:45}} dpr={[1,2]}><Suspense fallback={null}><Scene stage={stage} disease={disease} selected={selected} setSelected={setSelected} focus={focus} cinematic={cinematic}/></Suspense></Canvas><div className="canvas-hint"><span>🖱 / ☝ Rotate</span><span>Pinch / Scroll = Zoom</span><span>Tap kidney = Inspect</span></div><div className="camera-controls"><button onClick={()=>setFocus("body")}>BODY</button><button onClick={()=>setFocus("kidney")}>KIDNEYS</button><button onClick={()=>setFocus("nephron")}>NEPHRON</button><button onClick={()=>setFocus("bladder")}>BLADDER</button><button className={cinematic?"on":""} onClick={()=>setCinematic(v=>!v)}>CINEMATIC</button></div></div></section>
    <section className="dashboard"><div className="dashboard-inner">
      <div className="progress">{STAGES.map((s,i)=><button key={s.id} className={i===stage?"selected":i<stage?"done":""} onClick={()=>selectStage(i)}><span>{i+1}</span><b>{s.short}</b></button>)}</div>
      {tab==="journey"&&<><div className="section-title"><div className="eyebrow">COMPLETE JOURNEY</div><h2>Blood → nephron → urine → bladder</h2></div><div className="info-grid"><article><span className="icon">🩸</span><h3>Blood circulation</h3><p>Abdominal aorta → renal artery → smaller renal vessels → glomerular capillaries → renal vein → inferior vena cava.</p></article><article><span className="icon">🔬</span><h3>Nephron processing</h3><p>Filtration starts at the renal corpuscle. Tubules then reabsorb needed substances and secrete additional wastes.</p></article><article><span className="icon">💧</span><h3>Urine passage</h3><p>Collecting ducts → papilla → minor/major calyces → renal pelvis → ureter → bladder → urethra.</p></article></div></>}
      {tab==="collective"&&<div className="collective"><div className="section-title"><div className="eyebrow">ANATOMY ATLAS</div><h2>Everything together</h2><p>Use this section to review the complete kidney system collectively instead of studying structures in isolation.</p></div><div className="structure-grid">{STRUCTURES.map(([name,text,icon])=><button key={name} className="structure-card" onClick={()=>{setTab("journey"); if(name.toLowerCase().includes("nephron")||name.toLowerCase().includes("glomerulus"))setFocus("nephron"); else if(name.toLowerCase().includes("bladder")||name.toLowerCase().includes("urethra"))setFocus("bladder"); else if(name.toLowerCase().includes("kidney"))setFocus("kidney"); else setFocus("body");}}><span>{icon}</span><strong>{name}</strong><small>{text}</small></button>)}</div></div>}
      {tab==="disease"&&<div className="disease-panel"><div className="section-title"><div className="eyebrow">DISEASE LAB</div><h2>Change the model</h2><p>Select a condition to visualize a simplified change. Real disease is more complex than this educational model.</p></div><div className="disease-buttons">{Object.entries(DISEASES).map(([key,item])=><button key={key} className={disease===key?"selected":""} style={{"--accent":item.color}} onClick={()=>{setDisease(key);award(10);if(sound)beep(260)}}>{item.label}</button>)}</div><div className="disease-result" style={{"--accent":DISEASES[disease].color}}><i/><div><b>{DISEASES[disease].label}</b><p>{DISEASES[disease].text}</p></div></div></div>}
      {tab==="game"&&<div className="game-panel"><div><div className="eyebrow">KIDNEYLAB GAME CENTER</div><h2>Earn XP by mastering the anatomy</h2><p>Complete the challenge, explore all structures and move through six physiology stages.</p><button className="game-button" onClick={()=>setQuiz(true)}>🧠 Start 5-question challenge</button></div><div className="mission-list"><div>🎯 <b>Mission 1</b><span>Complete the six-stage journey</span></div><div>🔬 <b>Mission 2</b><span>Inspect the nephron</span></div><div>🫀 <b>Mission 3</b><span>Review all structures collectively</span></div><div>🏆 <b>Mission 4</b><span>Score 100 XP to reach Level 5</span></div></div></div>}
    </div></section>
    <footer><b>KIDNEYLAB</b> • Interactive 3D kidney education • For learning, not diagnosis</footer>
    {quiz&&<Quiz onClose={()=>setQuiz(false)} onScore={award}/>} 
  </div>;
}

export default App;

export const PHASES = [
  {
    "id": 0,
    "title": "0. Literature and problem lock (W1-6)",
    "weeks": "W1-6"
  },
  {
    "id": 1,
    "title": "1. Model, learning ladders, observability (W5-22)",
    "weeks": "W5-22"
  },
  {
    "id": 2,
    "title": "2. Prototype design and PCB (W14-26)",
    "weeks": "W14-26"
  },
  {
    "id": 3,
    "title": "3. Build and characterize (W24-34)",
    "weeks": "W24-34"
  },
  {
    "id": 4,
    "title": "4. HIL twin and fidelity (W18-34)",
    "weeks": "W18-34"
  },
  {
    "id": 5,
    "title": "5. Online estimator and excitation (W28-38)",
    "weeks": "W28-38"
  },
  {
    "id": 6,
    "title": "6. Experiment campaign (W34-48)",
    "weeks": "W34-48"
  },
  {
    "id": 7,
    "title": "7. Analysis and figures (W46-52)",
    "weeks": "W46-52"
  },
  {
    "id": 8,
    "title": "8. Writing and submission (W48-60)",
    "weeks": "W48-60"
  }
];
export const TASKS = [
  {
    "id": "0-0",
    "phaseId": 0,
    "title": "Learn: MATLAB Onramp, then basic state-space from Control Tutorials"
  },
  {
    "id": "0-1",
    "phaseId": 0,
    "title": "Read the PUC overview chapter and the original PUC paper"
  },
  {
    "id": "0-2",
    "phaseId": 0,
    "title": "Hand-draw the 8 PUC5 switching states and have your supervisor check them"
  },
  {
    "id": "0-3",
    "phaseId": 0,
    "title": "Set a search protocol: IEEE Xplore, Scopus, Scholar"
  },
  {
    "id": "0-4",
    "phaseId": 0,
    "title": "Build a gap table: PUC control, digital twins, capacitor monitoring"
  },
  {
    "id": "0-5",
    "phaseId": 0,
    "title": "Check the novelty claim against the table"
  },
  {
    "id": "0-6",
    "phaseId": 0,
    "title": "Lock problem statement, RQ1 to RQ3 and C1 to C4"
  },
  {
    "id": "0-7",
    "phaseId": 0,
    "title": "Choose baselines (RLS, EKF) and shortlist 2 to 3 journals"
  },
  {
    "id": "1-0",
    "phaseId": 1,
    "title": "Fix the load and filter structure and the starting parameter table"
  },
  {
    "id": "1-1",
    "phaseId": 1,
    "title": "Ladder 1, rung 1: RC and RL step response in state space, match ode45"
  },
  {
    "id": "1-2",
    "phaseId": 1,
    "title": "Ladder 1, rung 2: buck converter, switched vs averaged model"
  },
  {
    "id": "1-3",
    "phaseId": 1,
    "title": "Ladder 1, rung 3: H-bridge with LC filter, switching-state matrices with ZOH"
  },
  {
    "id": "1-4",
    "phaseId": 1,
    "title": "Ladder 1, rung 4: flying-capacitor 3-level converter, floating capacitor and balancing"
  },
  {
    "id": "1-5",
    "phaseId": 1,
    "title": "Run puc5_standalone_discretize.m and pass all its checks"
  },
  {
    "id": "1-6",
    "phaseId": 1,
    "title": "Confirm the (m, n) mapping against the PUC5 schematic"
  },
  {
    "id": "1-7",
    "phaseId": 1,
    "title": "Closed-loop reference simulation: fixed controller plus V_aux balancing"
  },
  {
    "id": "1-8",
    "phaseId": 1,
    "title": "Build a truth plant with dead time, R_ds(on), ESR and sensor noise"
  },
  {
    "id": "1-9",
    "phaseId": 1,
    "title": "Ladder 2, rung 1: estimate R and C of an RC circuit by least squares"
  },
  {
    "id": "1-10",
    "phaseId": 1,
    "title": "Ladder 2, rung 2: RLS with forgetting factor on noisy RLC data"
  },
  {
    "id": "1-11",
    "phaseId": 1,
    "title": "Ladder 2, rung 3: estimate L and R of an H-bridge RL load from switching data"
  },
  {
    "id": "1-12",
    "phaseId": 1,
    "title": "Ladder 2, rung 4: estimate a flying-capacitor value and find where excitation vanishes"
  },
  {
    "id": "1-13",
    "phaseId": 1,
    "title": "Derive which of L, R, C_f, C_aux, ESR is observable per switching state (RQ1)"
  },
  {
    "id": "1-14",
    "phaseId": 1,
    "title": "Simulate excitation under baseline and excitation-aware balancing (RQ2)"
  },
  {
    "id": "1-15",
    "phaseId": 1,
    "title": "Implement EKF and MDA-EFO and compare with RLS on simulated data"
  },
  {
    "id": "1-16",
    "phaseId": 1,
    "title": "GATE A: are C_aux and ESR identifiable? If not, revise the claim before ordering hardware"
  },
  {
    "id": "2-0",
    "phaseId": 2,
    "title": "Learn: ripple, rating and ESR equations from a power electronics text"
  },
  {
    "id": "2-1",
    "phaseId": 2,
    "title": "Size L, C_f, C_aux and dead time by simulation"
  },
  {
    "id": "2-2",
    "phaseId": 2,
    "title": "Select MOSFETs, gate drivers and controller board"
  },
  {
    "id": "2-3",
    "phaseId": 2,
    "title": "Design sensing for V_dc, V_aux, i_L, v_o with test points"
  },
  {
    "id": "2-4",
    "phaseId": 2,
    "title": "Add switchable C_aux bank and series ESR option"
  },
  {
    "id": "2-5",
    "phaseId": 2,
    "title": "Add precharge, fuse and hardware overcurrent trip"
  },
  {
    "id": "2-6",
    "phaseId": 2,
    "title": "Safety review with your supervisor"
  },
  {
    "id": "2-7",
    "phaseId": 2,
    "title": "Order PCB and parts only after Gate A"
  },
  {
    "id": "3-0",
    "phaseId": 3,
    "title": "Assemble and test gate drive without power"
  },
  {
    "id": "3-1",
    "phaseId": 3,
    "title": "Bring up in steps: 5 V, precharge, resistive load, 48 V"
  },
  {
    "id": "3-2",
    "phaseId": 3,
    "title": "Check V_aux balance at each voltage"
  },
  {
    "id": "3-3",
    "phaseId": 3,
    "title": "Measure L, C_f, C_aux, ESR, R with the LCR meter"
  },
  {
    "id": "3-4",
    "phaseId": 3,
    "title": "Calibrate sensors and record their accuracy"
  },
  {
    "id": "3-5",
    "phaseId": 3,
    "title": "Capture reference waveforms with the DPO3054"
  },
  {
    "id": "4-0",
    "phaseId": 4,
    "title": "Learn Typhoon basics: tutorials, Schematic Editor, SCADA, Python API"
  },
  {
    "id": "4-1",
    "phaseId": 4,
    "title": "Twin ladder 1: half-bridge with RL load, compare with MATLAB"
  },
  {
    "id": "4-2",
    "phaseId": 4,
    "title": "Twin ladder 2: H-bridge with LC filter, compare with MATLAB"
  },
  {
    "id": "4-3",
    "phaseId": 4,
    "title": "Twin ladder 3: flying-capacitor 3-level converter"
  },
  {
    "id": "4-4",
    "phaseId": 4,
    "title": "Build the PUC5 twin with dead time, R_ds(on), diode drop and ESR"
  },
  {
    "id": "4-5",
    "phaseId": 4,
    "title": "Map gating, sensor and scope signals to HIL I/O and check levels"
  },
  {
    "id": "4-6",
    "phaseId": 4,
    "title": "Check the model fits the 402 at your Ts"
  },
  {
    "id": "4-7",
    "phaseId": 4,
    "title": "Run E1 open-loop fidelity against hardware"
  },
  {
    "id": "4-8",
    "phaseId": 4,
    "title": "GATE B: NRMSE target met? If not, find the missing nonideality"
  },
  {
    "id": "5-0",
    "phaseId": 5,
    "title": "Port the offline estimators to the host PC and replay recorded data"
  },
  {
    "id": "5-1",
    "phaseId": 5,
    "title": "Close the online loop through the Typhoon API"
  },
  {
    "id": "5-2",
    "phaseId": 5,
    "title": "Run excitation-aware redundancy selection on the controller"
  },
  {
    "id": "5-3",
    "phaseId": 5,
    "title": "Run RLS and EKF baselines on hardware data"
  },
  {
    "id": "6-0",
    "phaseId": 6,
    "title": "E1, E2 Open-loop fidelity and steady state at 3 power levels"
  },
  {
    "id": "6-1",
    "phaseId": 6,
    "title": "E3, E4 Load step and DC-link step"
  },
  {
    "id": "6-2",
    "phaseId": 6,
    "title": "E5 Inductance change"
  },
  {
    "id": "6-3",
    "phaseId": 6,
    "title": "E6 C_aux step with the switchable bank"
  },
  {
    "id": "6-4",
    "phaseId": 6,
    "title": "E7 ESR increase"
  },
  {
    "id": "6-5",
    "phaseId": 6,
    "title": "E8 V_aux startup imbalance"
  },
  {
    "id": "6-6",
    "phaseId": 6,
    "title": "E9 Sensor noise sensitivity"
  },
  {
    "id": "6-7",
    "phaseId": 6,
    "title": "E10 Baseline comparison"
  },
  {
    "id": "6-8",
    "phaseId": 6,
    "title": "E11 Execution time and CPU margin"
  },
  {
    "id": "6-9",
    "phaseId": 6,
    "title": "Repeat each test at least 5 times and save raw data and logs"
  },
  {
    "id": "7-0",
    "phaseId": 7,
    "title": "NRMSE per signal and estimation error against LCR values"
  },
  {
    "id": "7-1",
    "phaseId": 7,
    "title": "Convergence time, THD and V_aux ripple"
  },
  {
    "id": "7-2",
    "phaseId": 7,
    "title": "Statistics: mean, spread, confidence intervals"
  },
  {
    "id": "7-3",
    "phaseId": 7,
    "title": "State instrument uncertainty next to every error"
  },
  {
    "id": "7-4",
    "phaseId": 7,
    "title": "Make final figures and tables"
  },
  {
    "id": "8-0",
    "phaseId": 8,
    "title": "Method: equations, observability result, parameter table"
  },
  {
    "id": "8-1",
    "phaseId": 8,
    "title": "Experiments and results"
  },
  {
    "id": "8-2",
    "phaseId": 8,
    "title": "Limitations: 48 V, single phase, about 80 W"
  },
  {
    "id": "8-3",
    "phaseId": 8,
    "title": "Archive code, data, BOM and schematic"
  },
  {
    "id": "8-4",
    "phaseId": 8,
    "title": "Co-author review"
  },
  {
    "id": "8-5",
    "phaseId": 8,
    "title": "Check template, length and ethics"
  },
  {
    "id": "8-6",
    "phaseId": 8,
    "title": "Submit, log reviewer comments, plan a revision buffer"
  }
];

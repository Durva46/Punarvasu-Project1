# LabFlow Quick Start Guide

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software**

Welcome to LabFlow. This one-page guide outlines the standard monthly laboratory workflow.

---

```
Step 1: Upload Excel  ──►  Step 2: Media Preparation  ──►  Step 3: Autoclave Log  ──►  Step 4: Final Review & Download
(/imports)                 (/media)                        (/autoclave)                   (/reports)
```

---

### Step 1: Upload Monthly Excel File (`/imports`)
1. Click **Excel Upload** in the navigation bar.
2. Select your monthly test registration Excel file (`.xlsx`).
3. Confirm column mappings (AR Number $\rightarrow$ `sampleIdentifier`, Test Request Date $\rightarrow$ `registrationDate`, Sample Name $\rightarrow$ `sampleName`).
4. Click **Upload & Process**.
5. Check the **Sample Analysis** and **Daily Count** tabs to review total registered samples ($S$), water samples ($W$), and non-water samples ($N$).

---

### Step 2: Media Preparation Records (`/media`)
1. Click **Media Preparation** in the navigation bar.
2. Select the date from the date dropdown.
3. **First day of the month**: Enter the initial opening balance for each media container when prompted. Subsequent dates carry forward balances automatically.
4. Review calculated tube/plate counts ($T$) and quantity used ($gm$):
   - $S=4, W=0 \rightarrow$ SCDB: 8, Mac Conkey Broth: 14, Peptone Water: 6, SCDA: 10, SDA: 10 (no R2A).
   - $S=7, W=2 \rightarrow$ R2A: 4, SCDA: 12, SDA: 12, Mac Conkey Broth: 20.
5. If a container balance drops below 10 gm, a **LOW STOCK** warning appears. If quantity used exceeds balance, click **Record Refill** to resolve the block.

---

### Step 3: Autoclave Log Book (`/autoclave`)
1. Click **Autoclave Log Book** in the navigation bar.
2. Select the reporting month.
3. Click **Generate / Refresh Log Entries**:
   - Creates exactly **one sterilization cycle per date** covering all samples registered on that day.
   - Defaults: Start `11:00 AM`, Sterilization `11:10 AM`, Temp `121 °C`, Pressure `15 LBS`, Duration `15 min`.
   - End time is calculated automatically (`11:25 AM`).
4. In the **Weekly Cleaning Schedule** section, click **Generate / Refresh Cleaning Schedule**:
   - Creates scheduled dates for the month: `1`, `7`, `14`, `21`, `28`.
   - Click **Mark Complete** when chamber cleaning is performed.
5. To verify a cycle (Verifier role): Click **Verify**, enter the observed physical thermometer and pressure gauge readings, and confirm.

---

### Step 4: Final Review & Downloads (`/reports`)
1. Click **Final Review & Downloads** in the navigation bar.
2. Review the 6-point checklist to confirm workflow progress.
3. Download official laboratory records:
   - **Media Preparation Record** (Excel / PDF / Print)
   - **Autoclave Log Book** (Excel / PDF / Print)
   - **Combined Monthly Package** (Excel / PDF / Print)
4. *Note*: Downloads are **never blocked**, even if verifications are pending. Planned values are labelled clearly on all exports.

---

> **Important Regulatory Notice**: Prefilled autoclave values are laboratory planned defaults entered in advance and are not certified operating records. The software never claims sterilization success; unverified cycles are always labelled "Planned" or "Pending verification".
> 
> *Stages 3–7 (LAF Log Book, B.O.D. Incubators, and Colony Counter) are scheduled for future development phases.*

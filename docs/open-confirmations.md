# Open Laboratory Confirmations

**PETLAD MAHAL AROGYA MANDAL PHARMACY — Laboratory Management Software (LabFlow)**

The following items are functional assumptions currently implemented according to user directives. They should be reviewed with the pharmacy quality assurance head during user acceptance testing.

---

### 1. Cleaning Dates Without an Autoclave Cycle
- **Current Behavior**: If a weekly cleaning date falls on a Sunday or holiday when no autoclave sterilization cycle was run, it prints as a dedicated standalone row in the Autoclave Log Book with cycle load and sterilization columns left blank (`—`).
- **Confirmation Needed**: Confirm whether the laboratory prefers this dedicated row format, or prefers logging unattached cleanings solely in a separate autoclave cleaning register.

### 2. Verification Column on Printed Autoclave Log Sheet
- **Current Behavior**: An extra shaded column titled "Verification" is rendered on the right side of the printed Autoclave Log Book (Planned, Pending verification, or Verified). Verified entries show actual observed readings on a second line.
- **Confirmation Needed**: Confirm whether the laboratory's regulatory SOP requires this exact visual layout, or if the original 9-column form should be strictly maintained with verification recorded only via handwritten initials in the "Done by / Checked by" footer.

### 3. Media Master: Standard Grams per Tube/Plate
- **Current Behavior**: Only `Soybean Casein Digest Broth` (SCDB) is pre-configured with `2.70 gm/tube`. All other media formulas currently default to `null` and trigger `CALCULATION_BLOCKED` until configured by the Admin.
- **Confirmation Needed**: Provide the official laboratory recipe grams per tube for the remaining media:
  - `Mac Conkey's Broth`
  - `Peptone Water`
  - `Mac Conkey's Agar`
  - `Eosine Methylene Blue Agar`
  - `Mannitol Salt Agar`
  - `Vogel Johnson Agar`
  - `Baird Parker Agar`
  - `Cetrimide Agar`
  - `Pseudomonas Agar`
  - `Selenite F Broth (Part A+B)`
  - `Tetrathionate Broth`
  - `Xylose Lysine Deoxycholate Agar`
  - `Bismuth Sulphite Agar`
  - `Brilliant Green Agar`
  - `Deoxycholate Citrate Agar`
  - `Triple Sugar Iron Agar`
  - `Urea Broth`
  - `R2A Agar`
  - `Soybean Casein Digest Agar`
  - `Sabouraud Dextrose Agar`

### 4. Positive and Negative Control Display
- **Current Behavior**: Positive and negative controls are displayed in the header card for information (`PC = 1, NC = 1`). Formulas contain their own explicit $+1$ terms and are evaluated as stored without double-counting controls.
- **Confirmation Needed**: Verify that this matches the pharmacy's standard calculation sheet.

/**
 * backend/prisma/seed.ts
 *
 * Idempotent seed: run at any time without duplicating data.
 * Uses upsert / createMany with skipDuplicates where possible.
 *
 * Run: npx tsx prisma/seed.ts
 *   or: npm run db:seed   (from backend/)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Starting seed…");

  // ── 1. Media Formulas ──────────────────────────────────────────────────────
  // expressionText stored exactly as the lab wrote it (three +1 terms preserved)
  const formulaData = [
    {
      formulaKey: "SCDB_BROTH",
      label: "SCDB — S × 2",
      expressionText: "(S) * 2",
      variables: ["S"],
      notes: "Soybean Casein Digest Broth",
    },
    {
      formulaKey: "MACCONKEY_BROTH",
      label: "Mac Conkey's Broth — (S + 1 + 1 + 1) × 2",
      // Exactly as written — three +1 terms must not be simplified
      expressionText: "(S + 1 + 1 + 1) * 2",
      variables: ["S"],
      notes: "Mac Conkey's Broth",
    },
    {
      formulaKey: "STANDARD_PLUS_TWO",
      label: "Standard + 2 controls — S + 1 + 1",
      expressionText: "S + 1 + 1",
      variables: ["S"],
      notes: "Used by media items 3–18",
    },
    {
      formulaKey: "R2A",
      label: "R2A — W × 2 (water samples only)",
      expressionText: "W * 2",
      variables: ["W"],
      notes: "Conditional — only generated when W > 0",
    },
    {
      formulaKey: "AGAR_NON_WATER",
      label: "Agar (non-water) — (N × 2) + 1 + 1",
      expressionText: "(N * 2) + 1 + 1",
      variables: ["N"],
      notes: "Used by SCDA and SDA",
    },
  ];

  for (const f of formulaData) {
    await prisma.mediaFormula.upsert({
      where: { formulaKey: f.formulaKey },
      create: f,
      update: {
        label: f.label,
        expressionText: f.expressionText,
        variables: f.variables,
        notes: f.notes,
      },
    });
  }
  console.log("  ✔  MediaFormula (5 rows)");

  // ── 2. Media Master (21 rows, display_order 1–21) ─────────────────────────
  // ONLY SCDB has quantityPerTube = 2.70. All others remain NULL.
  // Do NOT invent values.
  const mediaMasterData = [
    // Items 1–18: STANDARD_PLUS_TWO formula (except SCDB and MACCONKEY)
    {
      name: "Soybean Casein Digest Broth",
      displayOrder: 1,
      quantityPerTube: "2.70",   // ONLY this one has a value
      formulaKey: "SCDB_BROTH",
      isConditional: false,
    },
    {
      name: "Mac Conkey's Broth",
      displayOrder: 2,
      quantityPerTube: null,
      formulaKey: "MACCONKEY_BROTH",
      isConditional: false,
    },
    {
      name: "Peptone Water",
      displayOrder: 3,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Mac Conkey's Agar",
      displayOrder: 4,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Eosine Methelene Blue Agar",
      displayOrder: 5,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Mannitol Salt Agar",
      displayOrder: 6,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Vogel Johnson Agar",
      displayOrder: 7,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Baird Parker Agar",
      displayOrder: 8,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Cetrimide Agar",
      displayOrder: 9,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Pseudomonas Agar",
      displayOrder: 10,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Selenite F Broth (Part A+B)",
      displayOrder: 11,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Tetrathionate Broth",
      displayOrder: 12,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Xylose Lysine Deoxycholate Agar",
      displayOrder: 13,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Bishmuth Sulphite Agar",
      displayOrder: 14,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Brilliant Green Agar",
      displayOrder: 15,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Deoxycholate Citrate Agar",
      displayOrder: 16,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Triple Sugar Iron Agar",
      displayOrder: 17,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    {
      name: "Urea Broth",
      displayOrder: 18,
      quantityPerTube: null,
      formulaKey: "STANDARD_PLUS_TWO",
      isConditional: false,
    },
    // Item 19: R2A — conditional (only generated when W > 0)
    {
      name: "R2A",
      displayOrder: 19,
      quantityPerTube: null,
      formulaKey: "R2A",
      isConditional: true,
    },
    // Items 20–21: agar non-water formulas
    {
      name: "Soybean Casein Digest Agar",
      displayOrder: 20,
      quantityPerTube: null,
      formulaKey: "AGAR_NON_WATER",
      isConditional: false,
    },
    {
      name: "Sabouraud Dextrose Agar",
      displayOrder: 21,
      quantityPerTube: null,
      formulaKey: "AGAR_NON_WATER",
      isConditional: false,
    },
  ];

  for (const m of mediaMasterData) {
    await prisma.mediaMaster.upsert({
      where: { name: m.name },
      create: {
        name: m.name,
        displayOrder: m.displayOrder,
        quantityPerTube: m.quantityPerTube,
        formulaKey: m.formulaKey,
        isConditional: m.isConditional,
      },
      update: {
        displayOrder: m.displayOrder,
        formulaKey: m.formulaKey,
        isConditional: m.isConditional,
        // NOTE: quantityPerTube is NOT updated on re-run to preserve user edits.
        // To update it: use the API or manually run a targeted migration.
      },
    });
  }
  console.log("  ✔  MediaMaster (21 rows)");

  // ── 3. Control Config (single row) ────────────────────────────────────────
  const existingControl = await prisma.controlConfig.findFirst();
  if (!existingControl) {
    await prisma.controlConfig.create({
      data: { positiveControl: 1, negativeControl: 1 },
    });
    console.log("  ✔  ControlConfig created");
  } else {
    console.log("  ·  ControlConfig already exists, skipped");
  }

  // ── 4. App Settings ───────────────────────────────────────────────────────
  const appSettings = [
    // Column mapping (from AGENTS.md §10)
    { key: "col_map.sampleIdentifier", value: "AR Number" },
    { key: "col_map.sampleName",       value: "Sample Name" },
    { key: "col_map.registrationDate", value: "Test Request Date" },
    { key: "col_map.batchNumber",      value: "Batch Number" },
    // Stock threshold
    { key: "low_stock_threshold_gm",   value: "10" },
  ];

  for (const s of appSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {}, // Never overwrite user-changed settings on reseed
    });
  }
  console.log("  ✔  AppSettings (5 rows)");

  // ── 5. Autoclave Equipment ────────────────────────────────────────────────
  const existingEquipment = await prisma.autoclaveEquipment.findFirst();
  if (!existingEquipment) {
    await prisma.autoclaveEquipment.create({
      data: {
        formatNo:    "QC/M/023/F/01",
        refSopNo:    "PM/QC/M/023",
        equipmentNo: "PM/QC/M/01",
        label:       "Autoclave",
        active:      true,
      },
    });
    console.log("  ✔  AutoclaveEquipment created");
  } else {
    console.log("  ·  AutoclaveEquipment already exists, skipped");
  }

  // ── 6. Load Types ─────────────────────────────────────────────────────────
  const loadTypes = [
    { name: "Media",       displayOrder: 1 },
    { name: "Glassware",   displayOrder: 2 },
    { name: "Plasticware", displayOrder: 3 },
    { name: "Apron",       displayOrder: 4 },
    { name: "Other",       displayOrder: 5 },
  ];

  for (const lt of loadTypes) {
    await prisma.loadType.upsert({
      where: { name: lt.name },
      create: lt,
      update: { displayOrder: lt.displayOrder },
    });
  }
  console.log("  ✔  LoadType (5 rows)");

  // ── 7. Autoclave Settings — version 1 ────────────────────────────────────
  // Each key gets its own row. version=1. Acceptance limits are null (not set).
  // Future admin changes insert version=2,3,… rows; old versions are preserved.
  const autoclaveSettings: Array<{
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    notes?: string;
  }> = [
    { key: "autoclave_start_time",          value: "11:00",                notes: "HH:mm 24h" },
    { key: "sterilization_start_time",      value: "11:10",                notes: "HH:mm 24h" },
    { key: "temperature_c",                 value: 121 },
    { key: "pressure_value",                value: 15 },
    { key: "pressure_unit",                 value: "LBS" },
    { key: "sterilization_duration_minutes",value: 15 },
    { key: "cycle_grouping_mode",           value: "ONE_CYCLE_PER_DATE" },
    { key: "cleaning_first_day",            value: 1,                      notes: "September pattern: anchor day 1" },
    { key: "cleaning_second_day",           value: 7,                      notes: "First interval = 6 days (day 7)" },
    { key: "cleaning_interval_days",        value: 7,                      notes: "Repeating interval" },
    { key: "allow_select_other_staff",      value: true },
    // Acceptance limits — null means not configured (no warning will be raised)
    { key: "temperature_min_c",             value: null },
    { key: "temperature_max_c",             value: null },
    { key: "pressure_min",                  value: null },
    { key: "pressure_max",                  value: null },
  ];

  for (const s of autoclaveSettings) {
    // Only create if key+version 1 does not exist (preserve future versions)
    const exists = await prisma.autoclaveSetting.findFirst({
      where: { key: s.key, version: 1 },
    });
    if (!exists) {
      await prisma.autoclaveSetting.create({
        data: { key: s.key, value: s.value, version: 1 },
      });
    }
  }
  console.log("  ✔  AutoclaveSetting (v1, 15 keys)");

  console.log("\n✅  Seed complete.\n");
  console.log(
    "─────────────────────────────────────────────────────────────────────────────"
  );
  console.log("NEXT STEP — promote your first user to admin:");
  console.log(
    "  After signing up in Supabase Auth, run this SQL in the Supabase SQL editor:\n"
  );
  console.log(
    `  UPDATE profiles SET role = 'admin', active = true\n  WHERE id = '<your-auth-user-uuid>';\n`
  );
  console.log(
    "  (Replace <your-auth-user-uuid> with the UUID from Supabase → Authentication → Users)"
  );
  console.log(
    "─────────────────────────────────────────────────────────────────────────────"
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

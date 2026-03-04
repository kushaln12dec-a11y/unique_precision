# Calculation Fixes Summary

## Issues Found and Fixed

### ✅ 1. Thickness Minimum 20 Rule (FIXED)
**Problem:** Code was using raw thickness value directly without applying minimum 20 rule.

**Fix:** 
- Added `getEffectiveThickness()` function that enforces: `if thickness < 20 → use 20`
- Applied effective thickness in all calculations

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts`

---

### ✅ 2. Thickness-Based Divisor Logic (FIXED)
**Problem:** 
- Missing case for thickness 151-200 (should use divisor 1000)
- Logic was: `thickness > 100 ? 1200 : 1500` (incorrect)

**Fix:**
- Implemented correct logic:
  - Thickness 1-100 → divisor 1500
  - Thickness 101-150 → divisor 1200
  - Thickness 151-200 → divisor 1000
- Added `getThicknessDivisor()` function

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts`

---

### ✅ 3. Missing Holes Field (FIXED)
**Problem:** SEDM calculation requires "Holes per piece" field, but it was missing from the form.

**Fix:**
- Added `sedmHoles: string` field to `CutForm` type
- Added `sedmHoles` field to backend `Job` model
- Added holes input field to SEDM modal
- Updated form handlers to capture holes value

**Locations:**
- `frontend/src/pages/Programmer/programmerUtils.ts`
- `backend/server/src/models/Job.ts`
- `frontend/src/pages/Programmer/components/SEDMModal.tsx`
- `frontend/src/pages/Programmer/ProgrammerJobForm.tsx`
- `frontend/src/pages/Programmer/Programmer.tsx`

---

### ✅ 4. SEDM Rate Table (CREATED)
**Problem:** No SEDM rate table based on thickness and electrode size.

**Fix:**
- Created `SEDM_RATE_TABLE` with structure:
  ```
  {
    "1-100": { "0.3": 240, "0.8": 720, "3.0": 320, ... },
    "101-150": { "0.5": 2880, ... },
    "151-200": { ... }
  }
  ```
- Added helper functions:
  - `getThicknessRange()` - maps thickness to range key
  - `getElectrodeSize()` - extracts electrode from form
  - `findClosestElectrode()` - finds matching electrode key

**Note:** Rate table values are based on examples provided. May need adjustment based on actual business requirements.

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts`

---

### ✅ 5. SEDM Calculation (FIXED)
**Problem:** 
- Old calculation used length-based pricing (min20, perMm)
- Didn't match requirement: `SEDM Amount = Total holes × Rate`

**Fix:**
- New calculation:
  ```typescript
  totalHoles = qty × holesPerPiece
  rate = SEDM_RATE_TABLE[thicknessRange][electrodeSize]
  sedmAmount = totalHoles × rate
  ```

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts` - `calculateSedmAmount()`

---

### ✅ 6. WEDM Calculation (FIXED)
**Problem:** Calculation structure was correct but needed clarity.

**Fix:**
- WEDM hours calculation uses thickness-based divisors:
  ```typescript
  cutHoursPerPiece = (cut × effectiveThickness) / thicknessDivisor × passMultiplier
  totalHrs = cutHoursPerPiece + settingHours + extraHours
  ```
- WEDM amount calculation:
  ```typescript
  wedmAmount = totalHrs × customerRate × qty
  ```

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts` - `calculateTotals()`

---

### ✅ 7. Final Total Calculation (FIXED)
**Problem:** Structure was correct but now explicitly follows: `TOTAL = WEDM + SEDM`

**Fix:**
```typescript
totalAmount = wedmAmount + sedmAmount
```

**Location:** `frontend/src/pages/Programmer/programmerUtils.ts` - `calculateTotals()`

---

## Calculation Flow Summary

### Step 1: Apply Thickness Rule
```
effectiveThickness = thickness < 20 ? 20 : thickness
```

### Step 2: Calculate WEDM Hours
```
thicknessDivisor = getThicknessDivisor(effectiveThickness)
cutHoursPerPiece = (cut × effectiveThickness) / thicknessDivisor × passMultiplier
totalHrs = cutHoursPerPiece + settingHours + extraHours
```

### Step 3: Calculate WEDM Amount
```
wedmAmount = totalHrs × customerRate × qty
```

### Step 4: Calculate SEDM Amount
```
thicknessRange = getThicknessRange(effectiveThickness)
electrodeSize = getElectrodeSize(form)
rate = SEDM_RATE_TABLE[thicknessRange][electrodeSize]
totalHoles = qty × holesPerPiece
sedmAmount = totalHoles × rate
```

### Step 5: Calculate Final Total
```
totalAmount = wedmAmount + sedmAmount
```

---

## Files Modified

1. `frontend/src/pages/Programmer/programmerUtils.ts` - Core calculation logic
2. `backend/server/src/models/Job.ts` - Added `sedmHoles` field
3. `frontend/src/pages/Programmer/components/SEDMModal.tsx` - Added holes input
4. `frontend/src/pages/Programmer/ProgrammerJobForm.tsx` - Added holes handler
5. `frontend/src/pages/Programmer/Programmer.tsx` - Added holes field when loading jobs

---

## Testing Recommendations

1. **Thickness Rule:**
   - Test with thickness = 15 → should use 20
   - Test with thickness = 25 → should use 25

2. **Thickness Divisors:**
   - Test thickness 50 → divisor 1500
   - Test thickness 120 → divisor 1200
   - Test thickness 180 → divisor 1000

3. **SEDM Calculation:**
   - Test with qty=2, holes=2 → totalHoles=4
   - Verify rate lookup from SEDM_RATE_TABLE
   - Verify final SEDM amount = totalHoles × rate

4. **Final Total:**
   - Verify WEDM + SEDM = Total Amount

---

## Notes

- SEDM rate table values may need adjustment based on actual business rates
- WEDM calculation uses customer rate - verify if this matches business requirements
- The `findClosestElectrode()` function uses closest match - may need exact matching logic if required

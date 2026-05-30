import { Expense, UserProfile } from '../types';

export interface GlobalConsumptionResult {
  totalKm: number;
  totalLitersAdded: number;
  currentSaldo: number;
  litersBurned: number;
  globalAverage: number | null;
  status: 'valid' | 'insufficient_data' | 'no_fuel_data';
  validSegments: number;
}

export interface AutonomyResult {
  kmAutonomy: number;
  percentRemaining: number;
}

const FUEL_TYPES = ['gasolina', 'alcool', 'gnv'] as const;
type FuelType = typeof FUEL_TYPES[number];

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasolina: 'Gasolina',
  alcool: 'Álcool',
  gnv: 'GNV',
};

export function getFuelTypeLabel(ft: FuelType | string): string {
  return FUEL_TYPE_LABELS[ft as FuelType] || ft;
}

export function getFuelTypes(): readonly FuelType[] {
  return FUEL_TYPES;
}

export function calculateHistoricalAverage(expenses: Expense[], fuelType?: FuelType): number | null {
  const calibrated = expenses.filter(
    e => e.type === 'combustivel'
    && e.isCalibrated === true
    && e.segmentConsumption
    && e.segmentConsumption > 0
    && e.effectiveTripKm
    && e.effectiveTripKm > 0
    && (fuelType ? (e.fuelType || 'gasolina') === fuelType : true)
  );

  if (calibrated.length === 0) return null;

  const weightedSum = calibrated.reduce(
    (sum, e) => sum + (e.segmentConsumption || 0) * (e.effectiveTripKm || 0),
    0
  );
  const totalKm = calibrated.reduce(
    (sum, e) => sum + (e.effectiveTripKm || 0),
    0
  );

  return totalKm > 0 ? weightedSum / totalKm : null;
}

export function calculateGlobalConsumption(
  expenses: Expense[],
  fuelType?: FuelType
): GlobalConsumptionResult {
  const fuelExpenses = expenses
    .filter(e =>
      e.type === 'combustivel'
      && (fuelType ? (e.fuelType || 'gasolina') === fuelType : true)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (fuelExpenses.length === 0) {
    return {
      totalKm: 0,
      totalLitersAdded: 0,
      currentSaldo: 0,
      litersBurned: 0,
      globalAverage: null,
      status: 'no_fuel_data',
      validSegments: 0,
    };
  }

  const totalKm = fuelExpenses.reduce((sum, e) => sum + (e.tripTotal || 0), 0);
  const totalLitersAdded = fuelExpenses.reduce((sum, e) => sum + (e.liters || 0), 0);
  const currentSaldo = fuelExpenses[fuelExpenses.length - 1]?.saldoAfterFueling || 0;
  const litersBurned = totalLitersAdded - currentSaldo;

  const calibratedExpenses = fuelExpenses.filter(
    e => e.isCalibrated === true && e.effectiveTripKm && e.effectiveTripKm > 0 && e.segmentConsumption && e.segmentConsumption > 0
  );
  const validSegments = calibratedExpenses.length;

  if (validSegments === 0) {
    return {
      totalKm,
      totalLitersAdded,
      currentSaldo,
      litersBurned,
      globalAverage: null,
      status: 'insufficient_data',
      validSegments: 0,
    };
  }

  const weightedSum = calibratedExpenses.reduce(
    (sum, e) => sum + (e.segmentConsumption || 0) * (e.effectiveTripKm || 0),
    0
  );
  const totalCalibratedKm = calibratedExpenses.reduce(
    (sum, e) => sum + (e.effectiveTripKm || 0),
    0
  );
  const globalAverage = totalCalibratedKm > 0 ? weightedSum / totalCalibratedKm : null;

  return {
    totalKm,
    totalLitersAdded,
    currentSaldo,
    litersBurned,
    globalAverage,
    status: 'valid',
    validSegments,
  };
}

export function calculateAutonomy(
  saldo: number,
  averageConsumption: number
): AutonomyResult {
  const kmAutonomy = saldo * averageConsumption;
  return {
    kmAutonomy,
    percentRemaining: 0,
  };
}

export function recalculateFuelExpensesChain(
  expenses: Expense[],
  profile: UserProfile
): Expense[] {
  const result = [...expenses];
  const T = profile.totalTankSize || 50;

  const sorted = result
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type === 'combustivel')
    .sort((a, b) => {
      const dateDiff = new Date(a.e.date).getTime() - new Date(b.e.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.e.id.localeCompare(b.e.id);
    });

  for (const { i } of sorted) {
    result[i] = {
      ...result[i],
      segmentConsumption: undefined,
      isCalibrated: undefined,
      saldoAfterFueling: undefined,
      effectiveTripKm: undefined,
    };
  }

  for (let idx = 0; idx < sorted.length; idx++) {
    const { i: curIdx } = sorted[idx];
    const current = result[curIdx];
    const curLiters = current.liters || 0;
    const curTripTotal = current.tripTotal || 0;
    const curFullTank = current.fullTank === true;

    result[curIdx] = {
      ...result[curIdx],
      saldoAfterFueling: curFullTank ? T : (curLiters > 0 ? Math.min(curLiters, T) : undefined),
    };

    if (idx === 0) continue;

    const { i: prevIdx } = sorted[idx - 1];
    const prev = result[prevIdx];
    const prevLiters = prev.liters || 0;
    const prevFullTank = prev.fullTank === true;

    if (curTripTotal > 0 && prevLiters > 0 && curFullTank) {
      const consumption = curTripTotal / prevLiters;
      result[prevIdx] = {
        ...result[prevIdx],
        segmentConsumption: consumption,
        isCalibrated: true,
        effectiveTripKm: curTripTotal,
      };
    } else if (curTripTotal > 0 && prevLiters > 0) {
      const ft = (prev.fuelType || 'gasolina') as FuelType;
      const histAvg = calculateHistoricalAverage(result, ft);
      const estimatedConsumption = (histAvg && histAvg > 0) ? histAvg : (profile.kmPerLiter || null);
      result[prevIdx] = {
        ...result[prevIdx],
        segmentConsumption: estimatedConsumption ?? undefined,
        isCalibrated: false,
        effectiveTripKm: curTripTotal,
      };
    }
  }

  return result;
}

export function getLastFuelExpense(
  expenses: Expense[],
  fuelType?: FuelType
): Expense | undefined {
  return expenses
    .filter(e =>
      e.type === 'combustivel'
      && (fuelType ? (e.fuelType || 'gasolina') === fuelType : true)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function getActiveFuelTypes(expenses: Expense[]): FuelType[] {
  const types = new Set<FuelType>();
  expenses.forEach(e => {
    if (e.type === 'combustivel' && e.fuelType) {
      types.add(e.fuelType as FuelType);
    }
  });
  return FUEL_TYPES.filter(ft => types.has(ft));
}

export function hasValidFuelData(profile: UserProfile): boolean {
  return !!(profile.totalTankSize && profile.kmPerLiter);
}

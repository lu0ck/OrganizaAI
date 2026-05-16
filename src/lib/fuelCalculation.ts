import { Expense, UserProfile } from '../types';

export interface FuelCalculationResult {
  usefulDistance: number;
  segmentConsumption: number | null;
  saldoAfterFueling: number;
  isCalibrated: boolean;
  tripTotal: number;
  tripOnReserve: number;
}

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

export function calculateFuelBalance(
  tripTotal: number,
  tripOnReserve: number,
  litersAdded: number,
  profile: UserProfile,
  previousExpense?: Expense,
  fullTank?: boolean,
  historicalAverage?: number
): FuelCalculationResult {
  const T = profile.totalTankSize || 50;
  const R = profile.reserveSize || 5;
  const usefulDistance = tripTotal - tripOnReserve;

  if (!previousExpense) {
    const saldoAfterFueling = fullTank ? T : Math.min(litersAdded, T);
    return {
      usefulDistance,
      segmentConsumption: null,
      saldoAfterFueling,
      isCalibrated: false,
      tripTotal,
      tripOnReserve,
    };
  }

  const prevFullTank = previousExpense.fullTank === true;

  let segmentConsumption: number | null;
  let isCalibrated: boolean;
  let saldoBeforeFueling: number;

  if (tripOnReserve > 0 && prevFullTank) {
    isCalibrated = true;
    const litrosUsadosAntesReserva = T - R;
    segmentConsumption = usefulDistance > 0 ? usefulDistance / litrosUsadosAntesReserva : null;
    const fuelBurnedOnReserve = segmentConsumption ? tripOnReserve / segmentConsumption : 0;
    saldoBeforeFueling = Math.max(R - fuelBurnedOnReserve, 0);
  } else if (tripOnReserve > 0 && !prevFullTank) {
    isCalibrated = false;
    segmentConsumption = historicalAverage && historicalAverage > 0 ? historicalAverage : null;
    const Santerior = previousExpense.saldoAfterFueling;
    const estimatedFuelBurned = Santerior !== undefined ? Santerior - R : T - R;
    saldoBeforeFueling = Math.max(R - (segmentConsumption ? tripOnReserve / segmentConsumption : 0), 0);
    if (saldoBeforeFueling < 0) saldoBeforeFueling = 0;
  } else {
    isCalibrated = false;
    segmentConsumption = historicalAverage && historicalAverage > 0 ? historicalAverage : null;
    const Santerior = previousExpense.saldoAfterFueling;
    if (Santerior !== undefined && segmentConsumption) {
      const fuelBurned = tripTotal / segmentConsumption;
      saldoBeforeFueling = Math.max(Santerior - fuelBurned, 0);
    } else {
      saldoBeforeFueling = Santerior !== undefined ? Santerior : T;
    }
  }

  const saldoAfterFueling = fullTank ? T : Math.min(saldoBeforeFueling + litersAdded, T);

  return {
    usefulDistance,
    segmentConsumption,
    saldoAfterFueling,
    isCalibrated,
    tripTotal,
    tripOnReserve,
  };
}

export function calculateHistoricalAverage(expenses: Expense[], fuelType?: FuelType): number | null {
  const calibrated = expenses.filter(
    e => e.type === 'combustivel'
      && e.isCalibrated === true
      && e.segmentConsumption
      && e.segmentConsumption > 0
      && e.tripTotal
      && e.tripTotal > 0
      && (fuelType ? e.fuelType === fuelType : true)
  );

  if (calibrated.length === 0) return null;

  const weightedSum = calibrated.reduce(
    (sum, e) => sum + (e.segmentConsumption || 0) * (e.tripTotal || 0),
    0
  );
  const totalKm = calibrated.reduce(
    (sum, e) => sum + (e.tripTotal || 0),
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
      && e.tripTotal !== undefined
      && e.liters !== undefined
      && (fuelType ? e.fuelType === fuelType : true)
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
    e => e.isCalibrated === true && e.tripTotal && e.tripTotal > 0 && e.segmentConsumption && e.segmentConsumption > 0
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
    (sum, e) => sum + (e.segmentConsumption || 0) * (e.tripTotal || 0),
    0
  );
  const totalCalibratedKm = calibratedExpenses.reduce(
    (sum, e) => sum + (e.tripTotal || 0),
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

  for (const ft of FUEL_TYPES) {
    const indices = result
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.type === 'combustivel' && e.fuelType === ft)
      .sort((a, b) => new Date(a.e.date).getTime() - new Date(b.e.date).getTime());

    let previousExpense: Expense | undefined;

    for (const { i } of indices) {
      const expense = result[i];
      const tripTotal = expense.tripTotal || 0;
      const tripOnReserve = expense.tripOnReserve || 0;
      const liters = expense.liters || 0;

      if (tripTotal > 0 && liters > 0) {
        const histAvg = calculateHistoricalAverage(result, ft);
        const calcResult = calculateFuelBalance(
          tripTotal,
          tripOnReserve,
          liters,
          profile,
          previousExpense,
          expense.fullTank,
          histAvg ?? undefined
        );

        const prevIdx = previousExpense ? result.indexOf(previousExpense) : -1;
        if (prevIdx >= 0 && calcResult.segmentConsumption !== null) {
          result[prevIdx] = {
            ...result[prevIdx],
            segmentConsumption: calcResult.segmentConsumption,
            isCalibrated: calcResult.isCalibrated,
            calculatedTripTotal: calcResult.tripTotal,
            calculatedTripOnReserve: calcResult.tripOnReserve,
          };
        }

        result[i] = {
          ...expense,
          saldoAfterFueling: calcResult.saldoAfterFueling,
        };

        previousExpense = result[i];
      } else {
        previousExpense = expense;
      }
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
      && e.saldoAfterFueling !== undefined
      && (fuelType ? e.fuelType === fuelType : true)
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
  return !!(profile.totalTankSize && profile.reserveSize && profile.kmPerLiter);
}

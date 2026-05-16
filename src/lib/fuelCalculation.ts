import { Expense, UserProfile } from '../types';

export interface FuelCalculationResult {
  usefulDistance: number;
  segmentConsumption: number;
  saldoBeforeFueling: number;
  saldoAfterFueling: number;
  isCalibrated: boolean;
  fuelBurned: number;
  calibrationType?: 'exact' | 'estimate';
}

export interface GlobalConsumptionResult {
  totalKm: number;
  totalLitersAdded: number;
  currentSaldo: number;
  litersBurned: number;
  globalAverage: number;
  status: 'valid' | 'insufficient_data' | 'no_fuel_data';
  validSegments: number;
}

export interface AutonomyResult {
  kmAutonomy: number;
  percentRemaining: number;
}

export function calculateFuelBalance(
  tripTotal: number,
  tripOnReserve: number,
  litersAdded: number,
  profile: UserProfile,
  previousExpense?: Expense,
  fullTank?: boolean
): FuelCalculationResult {
  const T = profile.totalTankSize || 50;
  const R = profile.reserveSize || 5;
  const Cref = previousExpense?.segmentConsumption || profile.kmPerLiter || 10;

  const usefulDistance = tripTotal - tripOnReserve;

  if (!previousExpense) {
    const saldoAfterFueling = fullTank ? T : Math.min(litersAdded, T);
    return {
      usefulDistance,
      segmentConsumption: Cref,
      saldoBeforeFueling: 0,
      saldoAfterFueling,
      isCalibrated: false,
      fuelBurned: 0,
      calibrationType: undefined
    };
  }

  let segmentConsumption: number;
  let saldoBeforeFueling: number;
  let isCalibrated: boolean;
  let fuelBurned: number;
  let calibrationType: 'exact' | 'estimate' | undefined;

  const Santerior = previousExpense.saldoAfterFueling;
  const prevFullTank = previousExpense.fullTank === true;

  if (tripOnReserve > 0) {
    isCalibrated = true;

    if (prevFullTank) {
      fuelBurned = T - R;
      calibrationType = 'exact';
    } else {
      fuelBurned = (Santerior !== undefined ? Santerior : T) - R;
      if (fuelBurned < 0) fuelBurned = 0;
      calibrationType = 'estimate';
    }

    segmentConsumption = fuelBurned > 0 ? usefulDistance / fuelBurned : Cref;

    const fuelBurnedOnReserve = segmentConsumption > 0 ? tripOnReserve / segmentConsumption : 0;
    saldoBeforeFueling = Math.max(R - fuelBurnedOnReserve, 0);
  } else {
    isCalibrated = false;
    calibrationType = undefined;
    segmentConsumption = Cref;
    fuelBurned = segmentConsumption > 0 ? tripTotal / segmentConsumption : 0;
    saldoBeforeFueling = (Santerior !== undefined ? Santerior : T) - fuelBurned;
    if (saldoBeforeFueling < 0) {
      saldoBeforeFueling = 0;
      fuelBurned = Santerior !== undefined ? Santerior : T;
    }
  }

  const saldoAfterFueling = fullTank ? T : Math.min(saldoBeforeFueling + litersAdded, T);

  return {
    usefulDistance,
    segmentConsumption,
    saldoBeforeFueling,
    saldoAfterFueling,
    isCalibrated,
    fuelBurned,
    calibrationType
  };
}

export function calculateGlobalConsumption(expenses: Expense[]): GlobalConsumptionResult {
  const fuelExpenses = expenses
    .filter(e => e.type === 'combustivel' && e.tripTotal !== undefined && e.liters !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (fuelExpenses.length === 0) {
    return {
      totalKm: 0,
      totalLitersAdded: 0,
      currentSaldo: 0,
      litersBurned: 0,
      globalAverage: 0,
      status: 'no_fuel_data',
      validSegments: 0
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
      globalAverage: 0,
      status: 'insufficient_data',
      validSegments: 0
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
  const globalAverage = totalCalibratedKm > 0 ? weightedSum / totalCalibratedKm : 0;

  return {
    totalKm,
    totalLitersAdded,
    currentSaldo,
    litersBurned,
    globalAverage,
    status: 'valid',
    validSegments
  };
}

export function calculateAutonomy(
  saldo: number,
  averageConsumption: number
): AutonomyResult {
  const kmAutonomy = saldo * averageConsumption;
  return {
    kmAutonomy,
    percentRemaining: 0
  };
}

export function recalculateFuelExpensesChain(
  expenses: Expense[],
  profile: UserProfile
): Expense[] {
  const fuelExpenses = expenses
    .filter(e => e.type === 'combustivel')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let previousExpense: Expense | undefined;

  return expenses.map(expense => {
    if (expense.type !== 'combustivel') {
      return expense;
    }

    const tripTotal = expense.tripTotal || 0;
    const tripOnReserve = expense.tripOnReserve || 0;
    const liters = expense.liters || 0;

    if (tripTotal > 0 && liters > 0) {
      const result = calculateFuelBalance(
        tripTotal,
        tripOnReserve,
        liters,
        profile,
        previousExpense,
        expense.fullTank
      );

        const updatedExpense: Expense = {
          ...expense,
          saldoAfterFueling: result.saldoAfterFueling,
          segmentConsumption: result.segmentConsumption,
          isCalibrated: result.isCalibrated,
        };

      previousExpense = updatedExpense;
      return updatedExpense;
    }

    previousExpense = expense;
    return expense;
  });
}

export function getLastFuelExpense(expenses: Expense[]): Expense | undefined {
  return expenses
    .filter(e => e.type === 'combustivel' && e.saldoAfterFueling !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function hasValidFuelData(profile: UserProfile): boolean {
  return !!(profile.totalTankSize && profile.reserveSize && profile.kmPerLiter);
}

import { Expense, UserProfile } from '../types';

export interface FuelCalculationResult {
  usefulDistance: number; // Dutil = Dtotal - Dreserva
  segmentConsumption: number; // Ctrecho (km/l)
  saldoBeforeFueling: number; // Santes
  saldoAfterFueling: number; // Sfinal
  isCalibrated: boolean; // Se usou calibração física (luz da reserva)
  fuelBurned: number; // Litros queimados neste trecho
}

export interface GlobalConsumptionResult {
  totalKm: number; // Soma de todos os tripTotal
  totalLitersAdded: number; // Soma de todos os litros
  currentSaldo: number; // Sfinal do último abastecimento
  litersBurned: number; // totalLitersAdded - currentSaldo
  globalAverage: number; // totalKm / litersBurned
  status: 'valid' | 'insufficient_data' | 'no_fuel_data';
  validSegments: number; // Quantos trechos válidos
}

export interface AutonomyResult {
  kmAutonomy: number; // KM que ainda pode rodar
  percentRemaining: number; // % do tanque restante
}

/**
 * Calcula o saldo e consumo de combustível usando o Método da Reserva
 * 
 * Lógica:
 * 1. Se entrou na reserva: CALIBRAÇÃO FÍSICA - sabemos exatamente quanto tinha
 * 2. Se não entrou: ESTIMATIVA - usamos a média anterior
 */
export function calculateFuelBalance(
  tripTotal: number,
  tripOnReserve: number,
  litersAdded: number,
  profile: UserProfile,
  previousExpense?: Expense
): FuelCalculationResult {
  const T = profile.totalTankSize || 50;
  const R = profile.reserveSize || 5;
  const Cref = previousExpense?.segmentConsumption || profile.kmPerLiter || 10;

  const usefulDistance = tripTotal - tripOnReserve;

  if (!previousExpense) {
    const fuelBurned = Cref > 0 ? tripTotal / Cref : 0;
    return {
      usefulDistance,
      segmentConsumption: Cref,
      saldoBeforeFueling: 0,
      saldoAfterFueling: Math.min(litersAdded, T),
      isCalibrated: false,
      fuelBurned
    };
  }

  let segmentConsumption: number;
  let saldoBeforeFueling: number;
  let isCalibrated: boolean;
  let fuelBurned: number;

  const Santerior = previousExpense.saldoAfterFueling;

  if (tripOnReserve > 0) {
    isCalibrated = true;
    fuelBurned = Santerior - R;
    segmentConsumption = fuelBurned > 0 ? usefulDistance / fuelBurned : Cref;
    const fuelBurnedOnReserve = segmentConsumption > 0 ? tripOnReserve / segmentConsumption : 0;
    saldoBeforeFueling = R - fuelBurnedOnReserve;
  } else {
    isCalibrated = false;
    segmentConsumption = Cref;
    fuelBurned = segmentConsumption > 0 ? tripTotal / segmentConsumption : 0;
    saldoBeforeFueling = Santerior - fuelBurned;
    if (saldoBeforeFueling < 0) {
      saldoBeforeFueling = 0;
      fuelBurned = Santerior;
    }
  }

  const saldoAfterFueling = Math.min(saldoBeforeFueling + litersAdded, T);

  return {
    usefulDistance,
    segmentConsumption,
    saldoBeforeFueling,
    saldoAfterFueling,
    isCalibrated,
    fuelBurned
  };
}

/**
 * Calcula a média global de consumo
 * Fórmula: Média ponderada dos segmentos calibrados
 * Σ(Ctrecho × Dtotal) / Σ(Dtotal) para abastecimentos com isCalibrated === true
 */
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

  // Média ponderada apenas dos segmentos calibrados
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

  // Weighted average: Σ(segmentConsumption × tripTotal) / Σ(tripTotal)
  const weightedSum = calibratedExpenses.reduce(
    (sum, e) => sum + (e.segmentConsumption || 0) * (e.tripTotal || 0), 0
  );
  const totalCalibratedKm = calibratedExpenses.reduce(
    (sum, e) => sum + (e.tripTotal || 0), 0
  );
  const globalAverage = totalCalibratedKm > 0 ? weightedSum / totalCalibratedKm : 0;

  // Plausibility check: 80%-120% contra a média simples
  const simpleAverage = totalLitersAdded > 0 ? totalKm / totalLitersAdded : 0;
  const isPlausible = globalAverage > 0 && simpleAverage > 0
    && globalAverage >= simpleAverage * 0.8
    && globalAverage <= simpleAverage * 1.2;

  if (!isPlausible) {
    return {
      totalKm,
      totalLitersAdded,
      currentSaldo,
      litersBurned,
      globalAverage: 0,
      status: 'insufficient_data',
      validSegments
    };
  }

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

/**
 * Calcula autonomia restante
 */
export function calculateAutonomy(
  saldo: number,
  averageConsumption: number
): AutonomyResult {
  const kmAutonomy = saldo * averageConsumption;
  return {
    kmAutonomy,
    percentRemaining: 0 // Será calculado com base no tanque total
  };
}

/**
 * Recalcula todos os abastecimentos em cascata
 * Deve ser executado ao iniciar o app ou ao editar/excluir um abastecimento
 */
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
        previousExpense
      );

      const updatedExpense: Expense = {
        ...expense,
        saldoBeforeFueling: result.saldoBeforeFueling,
        saldoAfterFueling: result.saldoAfterFueling,
        segmentConsumption: result.segmentConsumption,
        isCalibrated: result.isCalibrated
      };

      previousExpense = updatedExpense;
      return updatedExpense;
    }

    previousExpense = expense;
    return expense;
  });
}

/**
 * Obtém o último abastecimento
 */
export function getLastFuelExpense(expenses: Expense[]): Expense | undefined {
  return expenses
    .filter(e => e.type === 'combustivel' && e.saldoAfterFueling !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

/**
 * Valida se os dados de combustível são suficientes para cálculo
 */
export function hasValidFuelData(profile: UserProfile): boolean {
  return !!(profile.totalTankSize && profile.reserveSize && profile.kmPerLiter);
}

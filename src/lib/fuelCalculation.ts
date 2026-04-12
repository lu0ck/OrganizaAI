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
  const T = profile.totalTankSize || 50; // Capacidade total
  const R = profile.reserveSize || 5; // Reserva
  const Cref = previousExpense?.segmentConsumption || profile.kmPerLiter || 10; // Média de referência

  // PASSO 1: Calcular distância útil
  const usefulDistance = tripTotal - tripOnReserve;

  // PASSO 2: Determinar consumo do trecho
  let segmentConsumption: number;
  let saldoBeforeFueling: number;
  let isCalibrated: boolean;
  let fuelBurned: number;

  if (tripOnReserve > 0) {
    // CENÁRIO A: Calibração física (entrou na reserva)
    isCalibrated = true;
    
    // Saldo anterior = capacidade total (se primeiro) ou saldo do abastecimento anterior
    const Santerior = previousExpense?.saldoAfterFueling ?? T;
    
    // Quanto foi queimado antes de entrar na reserva
    fuelBurned = Santerior - R;
    
    // Consumo real = distância útil / combustível queimado
    segmentConsumption = usefulDistance / fuelBurned;
    
    // Saldo antes de abastecer = reserva - consumo na reserva
    const fuelBurnedOnReserve = tripOnReserve / segmentConsumption;
    saldoBeforeFueling = R - fuelBurnedOnReserve;
    
  } else {
    // CENÁRIO B: Estimativa (não entrou na reserva)
    isCalibrated = false;
    
    // Usa média de referência
    segmentConsumption = Cref;
    
    // Saldo anterior
    const Santerior = previousExpense?.saldoAfterFueling ?? T;
    
    // Estimativa de combustível queimado
    fuelBurned = tripTotal / segmentConsumption;
    
    // Saldo antes de abastecer
    saldoBeforeFueling = Santerior - fuelBurned;
    
    // Ajuste se ficou negativo (algo está errado)
    if (saldoBeforeFueling < 0) {
      saldoBeforeFueling = 0;
      fuelBurned = Santerior;
    }
  }

  // PASSO 3: Calcular saldo final
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
 * Fórmula: ΣDtotal / (ΣLnovos - Sfinal_atual)
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

  // Precisa de pelo menos 1 trecho calibrado para ser válido
  const calibratedSegments = fuelExpenses.filter(e => e.isCalibrated).length;

  if (litersBurned <= 0 || calibratedSegments === 0) {
    return {
      totalKm,
      totalLitersAdded,
      currentSaldo,
      litersBurned,
      globalAverage: 0,
      status: 'insufficient_data',
      validSegments: calibratedSegments
    };
  }

  const globalAverage = totalKm / litersBurned;

  return {
    totalKm,
    totalLitersAdded,
    currentSaldo,
    litersBurned,
    globalAverage,
    status: 'valid',
    validSegments: calibratedSegments
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

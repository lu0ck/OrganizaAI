import { Expense } from '../types';

export interface FuelConsumptionRecord {
  id: string;
  date: string;
  startOdometerKm: number;
  endOdometerKm: number;
  liters: number;
  kmDriven: number;
  kmPerLiter: number;
  fuelType: 'gasolina' | 'alcool' | 'gnv';
  costPerLiter: number;
}

export interface FuelConsumptionResult {
  records: FuelConsumptionRecord[];
  averageKmPerLiter: number;
  bestKmPerLiter: number;
  worstKmPerLiter: number;
  hasEnoughData: boolean;
  totalRecords: number;
  lastOdometerKm: number | null;
}

export function calculateFuelConsumption(
  expenses: Expense[],
  profileKmPerLiter: number
): FuelConsumptionResult {
  const fullTankExpenses = expenses
    .filter(e => 
      e.type === 'combustivel' && 
      e.isFullTank === true && 
      e.odometerKm !== undefined && 
      e.odometerKm !== null &&
      e.liters !== undefined &&
      e.liters !== null &&
      e.liters > 0
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const records: FuelConsumptionRecord[] = [];

  for (let i = 1; i < fullTankExpenses.length; i++) {
    const current = fullTankExpenses[i];
    const previous = fullTankExpenses[i - 1];

    const kmDriven = current.odometerKm! - previous.odometerKm!;
    const liters = current.liters!;

    if (kmDriven <= 0) continue;

    const kmPerLiter = kmDriven / liters;

    records.push({
      id: current.id,
      date: current.date,
      startOdometerKm: previous.odometerKm!,
      endOdometerKm: current.odometerKm!,
      liters,
      kmDriven,
      kmPerLiter,
      fuelType: current.fuelType || 'gasolina',
      costPerLiter: current.pricePerLiter || 0
    });
  }

  const hasEnoughData = records.length >= 1;
  const lastOdometerKm = fullTankExpenses.length > 0 
    ? fullTankExpenses[fullTankExpenses.length - 1].odometerKm! 
    : null;

  if (!hasEnoughData || records.length === 0) {
    return {
      records: [],
      averageKmPerLiter: profileKmPerLiter || 0,
      bestKmPerLiter: 0,
      worstKmPerLiter: 0,
      hasEnoughData: false,
      totalRecords: 0,
      lastOdometerKm
    };
  }

  const kmPerLiterValues = records.map(r => r.kmPerLiter);

  return {
    records,
    averageKmPerLiter: kmPerLiterValues.reduce((a, b) => a + b) / kmPerLiterValues.length,
    bestKmPerLiter: Math.max(...kmPerLiterValues),
    worstKmPerLiter: Math.min(...kmPerLiterValues),
    hasEnoughData: true,
    totalRecords: records.length,
    lastOdometerKm
  };
}

export function getLastFullTankOdometer(expenses: Expense[]): number | null {
  const fullTankExpenses = expenses
    .filter(e => 
      e.type === 'combustivel' && 
      e.isFullTank === true && 
      e.odometerKm !== undefined &&
      e.odometerKm !== null
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return fullTankExpenses.length > 0 ? fullTankExpenses[0].odometerKm! : null;
}

export function validateOdometerInput(
  currentOdometer: number,
  expenses: Expense[]
): { isValid: boolean; warning?: string } {
  const lastOdometer = getLastFullTankOdometer(expenses);
  
  if (lastOdometer !== null && currentOdometer <= lastOdometer) {
    return {
      isValid: false,
      warning: `O hodômetro deve ser maior que o último registro (${lastOdometer.toLocaleString()} km)`
    };
  }

  return { isValid: true };
}

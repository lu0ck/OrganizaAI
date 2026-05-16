export type AppModality = 'passageiro' | 'entrega';
export type ColorTheme = 'red' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'black';

export interface RideEntry {
  id: string;
  date: string; // ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  kmDriven: number;
  numRides: number;
  totalValue: number;
  region: string;
  appRides: {
    appName: string;
    modality: AppModality;
    count: number;
    value: number;
  }[];
}

export interface Expense {
  id: string;
  date: string;
  type: 'combustivel' | 'manutencao' | 'imposto' | 'multa' | 'parcela' | 'alimentacao' | 'seguro' | 'outros';
  value: number;
  description: string;
  // Fuel specific
  location?: string;
  liters?: number;
  pricePerLiter?: number;
  fuelType?: 'gasolina' | 'alcool' | 'gnv';
  // Método da Reserva - campos de entrada
  tripTotal?: number;
  tripOnReserve?: number;
  enteredReserve?: boolean;
  fullTank?: boolean;
  // Campos calculados automaticamente
  saldoAfterFueling?: number;
  segmentConsumption?: number;
  isCalibrated?: boolean;
}

export interface Goal {
  id: string;
  type: 'diaria' | 'semanal' | 'mensal';
  targetValue: number;
  startDate: string;
  createdAt?: string;
  connectedToSchedule?: boolean;
  monthlyCycle?: boolean;
  useHourlyRate?: boolean; // Se true, calcula target de agenda × hourlyRate
}

export interface MaintenanceHistory {
  id: string;
  date: string;
  km: number;
  cost: number;
  description?: string;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  intervalKm: number;
  intervalDays?: number;
  lastChangeKm: number;
  lastChangeDate: string;
  estimatedCost: number;
  position?: 'dianteiro' | 'traseiro' | 'esquerdo_dianteiro' | 'direito_dianteiro' | 'esquerdo_traseiro' | 'direito_traseiro';
  history?: MaintenanceHistory[];
}

export interface WorkPeriod {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface WorkDay {
  day: string;
  active: boolean;
  periods: WorkPeriod[];
}

export interface UserProfile {
  name: string;
  vehicleType: 'carro' | 'moto';
  vehicleModel: string;
  vehicleOdometerKm?: number; // KM total atual do odômetro do veículo (atualizado automaticamente)
  kmPerLiter?: number; // Estimativa inicial de consumo (preenchido pelo usuário)
  currentKmPerLiter?: number; // Consumo real calculado pelo sistema
  totalTankSize?: number; // Capacidade total incluindo a reserva
  reserveSize?: number; // Capacidade da reserva (parte do totalTankSize)
  // Annual costs
  ipvaValue?: number;
  licensingValue?: number;
  // Monthly costs
  insuranceValue?: number;
  vehicleInstallmentValue?: number; // Valor da parcela mensal do veículo
  vehicleInstallmentsRemaining?: number; // Parcelas restantes para quitar
  // Work schedule
  workSchedule?: WorkDay[];
  hourlyRate?: number;
}

export interface ManualCompensation {
  id: string;
  monthKey: string; // "2026-05"
  fromDay: string;  // ISO date — dia com débito
  toDay: string;    // ISO date — dia que cobre
  amount: number;
  createdAt: string;
}

export interface VacationEntry {
  date: string;
  type: 'ferias' | 'folga';
}

export interface MonthlyPlan {
  id: string;
  month: string;
  days: WorkDay[];
  vacations: VacationEntry[];
  notes?: string;
  customHourlyRate?: number;
  customFuelCost?: number;
  customMaintCost?: number;
  actualEarnings?: number;
  actualFuelCost?: number;
  actualMaintCost?: number;
  actualOtherCost?: number;
}

export interface AppState {
  profile: UserProfile | null;
  rides: RideEntry[];
  expenses: Expense[];
  goals: Goal[];
  maintenance: MaintenanceItem[];
  manualCompensations: ManualCompensation[];
  plans: MonthlyPlan[];
  customApps: string[];
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
}
